// Phoxta — the one decision layer in front of every automatic reply.
//
// respondCore is the brain: it composes. This module is everything that has to
// be true BEFORE a composed reply is allowed to leave the building, and — since
// the loops verifier found gmail-sync calling the gates while email-inbound did
// not — it is also the only thing that PERFORMS the send. `deliverAutoReply` is
// the single funnel: it re-runs every gate, claims the budget, hands the message
// to the right transport, stamps the delivery status onto the agent's row and
// writes the audit line. A transport cannot answer a customer automatically and
// forget a gate, because a transport no longer owns the send.
//
// EVERY channel comes through it now, not just mail. gmail-sync and
// email-inbound for mail; twilio-inbound for SMS and WhatsApp, which used to
// answer straight out of agent-inbound's JSON with no ceiling and no cap at all;
// agent-inbound's Chatwoot branch; agent-catchup; the operator's
// reply_conversation tool; and an Engage flow answering inside a live thread.
// ONE of those owns its own last step — a Chatwoot reply is a post back to
// Chatwoot — so it hands `transport` to deliverAutoReply and it is called AFTER
// every gate has passed. (twilio-inbound used to be the other: it answered with
// TwiML inside Twilio's own webhook response, which meant Twilio held the
// request open for the whole model turn and abandoned it at ~15 seconds. It now
// answers the webhook immediately and sends here, over the REST API, from the
// number the customer texted.)
//
// Four independent classes of harm it exists to prevent:
//
//   1. LOOPS. An out-of-office, a bounce, a newsletter and another vendor's
//      ticketing autoresponder are all machine-generated, and answering one
//      starts a cycle with no decay term; so is a customer's phone running an
//      autoresponder, or another tenant's agent number saved as a contact.
//      Header detection (RFC 3834 and the de-facto Microsoft/Google markers) is
//      the first line for mail; the rate ceilings are what hold when header
//      heuristics fail and what hold on texting, where there are no headers at
//      all — a per-thread daily ceiling, a texting burst window, a minimum
//      spacing and a per-org daily send cap.
//   2. TALKING OVER A HUMAN. "Take over" (ai_paused) is a promise. So is a
//      closed thread.
//   3. ANSWERING OURSELVES. The business's own mailbox, its own staff, and the
//      agent's own outbound must never read as a new customer message.
//   4. SPENDING WITHOUT A CEILING. The customer-facing agent has never had an
//      outbound cap — only a model-token cap, which counts thinking, not sends.
//
// Every decision it returns is a short, human-readable reason string. Those are
// written onto the message row and into agent_audit_log, because "why did the
// agent not answer this email?" must be answerable without database access —
// and the Inbox renders them beside the message (see Messages.tsx).
import type { SupabaseClient } from "./supabaseAdmin.ts";
import { sendConversationEmail, type ThreadContext } from "./conversationEmail.ts";
import { twilioSend, twilioStatusCallback } from "./dispatch.ts";
import { normalizeE164 } from "./telephony.ts";
import { replySubject } from "./mailText.ts";
import { checkWhatsappImage, withMediaLink, type MediaVerdict, type OutboundMedia } from "./media.ts";

// Re-exported so the transports keep one import for "everything about answering
// automatically", while agentCore can take the pure text helpers on their own.
export {
  addressOf,
  displayNameOf,
  messageIdOf,
  referenceIds,
  replySubject,
  stripQuotedReply,
  trimForAgent,
} from "./mailText.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const env = (k: string) => Deno.env.get(k) ?? "";
const num = (k: string, d: number) => {
  const v = Number(env(k));
  return Number.isFinite(v) && v > 0 ? v : d;
};

// ---------------------------------------------------------------------------
// The per-org switch.
//
// Reuses agent_tool_policy — the off/approve/auto concept the console already
// renders and the operator agent already honours — rather than inventing a
// second switch that could disagree with it.
//
//   off      never answer automatically; file it for a human.
//   approve  do not answer; flag the thread for a human instead (no model spend).
//   auto     answer. THE DEFAULT, because a business that connects its mailbox
//            to an AI agent is asking for its mail to be answered, and a fix
//            that ships switched off does not fix the complaint. Everything
//            else in this file is what makes that default safe.
//
// It governs EVERY ingress path: the connected mailbox (gmail-sync), the inbound
// webhook (email-inbound), the catch-up worker, and — through agent-inbound —
// web chat, SMS, WhatsApp, Chatwoot and voice. A switch that reads "Off" while
// four channels keep replying is worse than no switch at all.
// ---------------------------------------------------------------------------
export const AUTO_REPLY_TOOL = "auto_reply";
export type AutoReplyMode = "off" | "approve" | "auto";

export async function autoReplyMode(admin: SupabaseClient, orgId: string): Promise<AutoReplyMode> {
  const { data } = await admin
    .from("agent_tool_policy")
    .select("mode")
    .eq("organization_id", orgId)
    .eq("tool", AUTO_REPLY_TOOL)
    .maybeSingle();
  const mode = (data as { mode?: string } | null)?.mode;
  return mode === "off" || mode === "approve" || mode === "auto" ? mode : "auto";
}

/** The reason a mode other than "auto" gives, in the owner's own words. */
export function modeReason(mode: AutoReplyMode): string {
  return mode === "off"
    ? "automatic replies are switched off for this business"
    : "automatic replies are set to ask you first";
}

// ---------------------------------------------------------------------------
// Is this machine-generated mail?
// ---------------------------------------------------------------------------
export type MailHeaders = Record<string, string>;

/** Local-parts that are never a person waiting for an answer.
 *
 *  Deliberately narrow. `alerts@`, `notifications@`, `notify.*` and `list@` were
 *  here and are ordinary shared mailboxes at real B2B customers — a facilities
 *  team writing in from alerts@ is a customer, not a robot, and suppressing them
 *  is the exact failure this whole change exists to fix. Only the forms that
 *  announce an unattended sender survive. */
const ROBOT_LOCAL =
  /^(mailer-daemon|postmaster|no-?reply|do-?not-?reply|donotreply|bounce|bounces|automated|auto-?reply|autoreply|nobody|root|daemon|newsletter|mailing)([+.-]|$)/i;

/** Subjects that announce an autoresponder even when the headers do not.
 *
 *  No optional `re:` prefix: a genuine autoresponder announces itself with
 *  Auto-Submitted or Precedence, which the header checks catch first, whereas
 *  "Re: Out of office — can we still collect Friday?" is a customer writing
 *  ABOUT one. The prefix only widened the false-positive surface. */
const ROBOT_SUBJECT =
  /^\s*(automatic(al)?\s*reply|auto(matic)?[ -]?response|out of (the )?office|abwesenheit|undeliverable|delivery status notification|returned mail|mail delivery (failed|subsystem)|failure notice|message blocked|read receipt)/i;

/** Gmail's own classification. Free, and better than anything we could infer.
 *
 *  CATEGORY_UPDATES and CATEGORY_PROMOTIONS are both deliberately absent. In
 *  Gmail the Promotions tab IS the inbox, and a first-contact enquiry from a
 *  domain with a marketing reputation — or simply a mail with a logo in its
 *  footer — lands there routinely. Treating that as proof of a robot silently
 *  suppressed real customers. */
/* CATEGORY_FORUMS came out for the same reason CATEGORY_PROMOTIONS did, and it
 * mattered more. Gmail files GOOGLE GROUP mail under Forums — and Phoxta's own
 * console creates hello@ / support@ / sales@ as Google Groups and tells the
 * business to publish them. So this label was not catching a discussion list; it
 * was catching the customer mail arriving at the addresses the product hands
 * out, and burying it definitively. What is left here is unambiguous: Spam,
 * Trash, a draft, and our own sent copy. */
const ROBOT_LABELS = new Set(["SPAM", "TRASH", "DRAFT", "SENT"]);

export type AutomationProbe = {
  headers?: MailHeaders;
  /** Gmail labelIds, when the message came from the Gmail API. */
  labelIds?: string[];
  /** payload.mimeType, when known — multipart/report is a DSN. */
  mimeType?: string;
  subject?: string;
  fromEmail: string;
  /** The connected mailbox and every staff address on this org. */
  selfAddresses?: string[];
};

/**
 * Why this message must not be auto-replied to.
 *
 * `definitive` separates the signals that settle the question forever — RFC 3834
 * markers, List-* headers, an empty Return-Path, a delivery-status report, our
 * own address — from the HEURISTICS, which are a judgement about a local-part or
 * a subject line and are wrong often enough that they must never bury a real
 * customer permanently. agent-catchup reads that distinction: a definitive hit is
 * never reconsidered, a heuristic one stays live so the message can be answered
 * if anything else about it changes, and either way the reason is rendered on the
 * message in the Inbox so a human can see what happened and reply themselves.
 */
export type AutomationVerdict = { reason: string; definitive: boolean };

export function automatedMailReason(p: AutomationProbe): AutomationVerdict | null {
  const h: MailHeaders = {};
  for (const [k, v] of Object.entries(p.headers ?? {})) h[k.toLowerCase()] = String(v ?? "");
  const from = String(p.fromEmail ?? "").trim().toLowerCase();

  const sure = (reason: string): AutomationVerdict => ({ reason, definitive: true });
  const guess = (reason: string): AutomationVerdict => ({ reason, definitive: false });

  if (!from || !from.includes("@")) return sure("no usable sender address");

  // NAME THE ADDRESS. "sent from this business's own address" next to a message
  // visibly from a customer reads as a malfunction, and leaves the owner nothing
  // to check. Saying WHICH address it matched turns it into a one-glance
  // diagnosis — it is either the connected mailbox (a genuine echo of our own
  // outbound) or the billing address on the org record, and if it is the latter
  // that record is almost certainly set to the address customers write to.
  const self = (p.selfAddresses ?? []).map((a) => String(a ?? "").trim().toLowerCase()).filter(Boolean);
  if (self.includes(from)) return sure(`it was sent from ${from}, which is one of this business's own addresses`);

  for (const label of p.labelIds ?? []) {
    if (ROBOT_LABELS.has(String(label))) return sure(`Gmail classified it as ${String(label).toLowerCase().replace(/_/g, " ")}`);
  }

  const autoSubmitted = (h["auto-submitted"] ?? "").trim().toLowerCase();
  if (autoSubmitted && autoSubmitted !== "no") return sure(`Auto-Submitted: ${autoSubmitted}`);

  // X-Auto-Response-Suppress is NOT here on purpose. It is a REQUEST — "do not
  // autoreply to this" — that Exchange, Microsoft 365 and a great many
  // helpdesks stamp on ordinary human mail, and this module adds it to our own
  // outbound (google.ts) for exactly that reason. Reading it as proof that the
  // SENDER is a machine classified real customers as robots.
  for (const k of ["x-autoreply", "x-autorespond", "x-autogenerated", "x-auto-response", "x-mailer-daemon"]) {
    if (h[k]) return sure(`${k} present`);
  }

  // THE BUSINESS'S OWN GROUP IS NOT A MAILING LIST.
  //
  // Phoxta itself creates hello@ / info@ / support@ / sales@ / billing@ /
  // contact@ as GOOGLE GROUPS (google-workspace/index.ts) and tells the owner to
  // publish them. A group is not a mailbox — the only copy the platform can ever
  // see is the one the group delivers to a member — and Google stamps that copy
  // with List-Id, List-Post and Precedence: list, exactly like a newsletter.
  //
  // So the two rules below, written for newsletters, were permanently refusing
  // the customer mail arriving at the very addresses this product tells
  // businesses to hand out — and refusing it DEFINITIVELY, so it was never
  // retried and never answered. That is a support address that silently
  // swallows customers.
  //
  // The distinction is whose list it is. A newsletter's List-Id names the
  // SENDER's domain; a business's own distribution group names the business's
  // own. Matched on domain rather than exact address because a group's List-Id
  // is `hello.phoxta.com`, not an address at all.
  const selfDomains = new Set(self.map((a) => a.split("@")[1]).filter(Boolean));
  const listAddr = `${h["list-id"] ?? ""} ${h["list-post"] ?? ""}`.toLowerCase();
  const ownGroup = [...selfDomains].some((d) => d && (listAddr.includes("@" + d) || listAddr.includes("." + d) || listAddr.includes("<" + d)));

  const precedence = (h["precedence"] ?? "").trim().toLowerCase();
  if (["bulk", "junk", "auto_reply"].includes(precedence)) return sure(`Precedence: ${precedence}`);
  // `Precedence: list` alone is what a group stamps on ordinary mail it relays.
  if (precedence === "list" && !ownGroup) return sure("Precedence: list");

  for (const k of ["list-id", "list-unsubscribe", "list-post", "list-help", "list-subscribe"]) {
    if (h[k] && !ownGroup) return sure("a mailing list (List-* headers)");
  }

  // An ABSENT Return-Path only means the provider did not hand us one; an
  // explicitly empty one (`<>`) is the RFC 5321 marker for a bounce, which must
  // never be replied to.
  if ((h["return-path"] ?? "").trim() === "<>") return sure("a bounce (empty Return-Path)");
  if (h["x-failed-recipients"]) return sure("a delivery failure notice");

  const ct = `${p.mimeType ?? ""} ${h["content-type"] ?? ""}`.toLowerCase();
  if (ct.includes("multipart/report") || ct.includes("delivery-status")) return sure("a delivery status notification");

  const local = from.split("@")[0] ?? "";
  if (ROBOT_LOCAL.test(local)) return guess(`an unattended sender (${local}@…)`);

  const subject = String(p.subject ?? "");
  if (subject && ROBOT_SUBJECT.test(subject)) return guess("an automatic reply / bounce (by subject)");

  return null;
}

// ---------------------------------------------------------------------------
// Per-thread and per-org ceilings.
// ---------------------------------------------------------------------------

/** Mirrors agent-inbound's MAX_MSGS_PER_HOUR: an org-wide abuse/cost throttle
 *  counted over inbound customer messages. The in-process paths bypass that
 *  endpoint, so they enforce the same number here rather than escaping it. */
const MAX_MSGS_PER_HOUR = 200;

/**
 * The stamp a transport puts on a customer message it pulled out of HISTORY
 * rather than received as it arrived — `meta.ingest`.
 *
 * This exists because of one specific harm. The throttle below counts every
 * inbound customer message in the trailing hour, ORG-WIDE, and autoReplyAllowed
 * consults it for EVERY channel. gmail-sync now reads a business's whole mailbox
 * rather than only what is still in its Gmail inbox, so its first ticks after a
 * connection import archived and already-filed mail — up to sixty a tick. None
 * of it can be auto-answered (it was filed away by a person, or it is older than
 * the reply window), so it costs nothing in model spend and there is no abuse to
 * throttle. But counted as arriving traffic it would put a busy mailbox past two
 * hundred within twenty minutes, and for the next hour every genuine web-chat,
 * SMS and WhatsApp customer would be refused with "this business is over its
 * hourly message limit". Widening what email READS must never narrow what the
 * other channels ANSWER.
 *
 * Only mail that could never have been answered on arrival grounds carries it.
 * Live mail still counts, so the ceiling that protects a business from a real
 * flood is untouched.
 */
export const INGEST_BACKFILL = "backfill";

export async function orgHourlyThrottled(admin: SupabaseClient, orgId: string): Promise<boolean> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const inTheHour = () =>
    admin
      .from("conversation_messages")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("role", "customer")
      .gte("created_at", since);
  const [all, historical] = await Promise.all([
    inTheHour(),
    inTheHour().eq("meta->>ingest", INGEST_BACKFILL),
  ]);
  // Fail TOWARDS the throttle: if the exemption count cannot be read, nothing is
  // subtracted and the gate behaves exactly as it did before the exemption
  // existed. A throttle that fails open is not a throttle.
  const exempt = historical.error ? 0 : (historical.count ?? 0);
  const live = Math.max(0, (all.count ?? 0) - exempt);
  return live >= MAX_MSGS_PER_HOUR;
}

export type Gate = { ok: true } | { ok: false; reason: string; retryable: boolean };

const OK: Gate = { ok: true };
const no = (reason: string, retryable: boolean): Gate => ({ ok: false, reason, retryable });

/** Channels where the reply is a text message rather than mail. They get their
 *  own numbers — see the block below.
 *
 *  "web" is here for ONE caller: agent-inbound's Chatwoot branch, which pushes a
 *  message out to a live-chat visitor and is therefore a real transport.
 *
 *  Phoxta's own chat widget does NOT reach these gates, because it does not call
 *  autoReplyAllowed at all — it is synchronous (the visitor is on the page and
 *  polls their own thread), so agent-inbound gates it on the owner's switch and
 *  the org-wide hourly throttle and nothing else. Anyone wiring the widget into
 *  this funnel should know that "web" would then pick up the 8-in-10-minutes
 *  burst window, which is wrong for a channel where a person is typing. There is
 *  no exemption flag: an earlier one was documented here, honoured in the code
 *  and passed by nobody, which is worse than no flag at all. */
const CHAT_CHANNELS = new Set(["sms", "whatsapp", "web"]);
const isChat = (channel: string) => CHAT_CHANNELS.has(channel);

// ---------------------------------------------------------------------------
// WHOSE NUMBER DOES A TEXT COME FROM?
//
// There is exactly one Twilio sender in the environment (TWILIO_FROM /
// TWILIO_WHATSAPP_FROM) and no per-organisation number anywhere in the schema —
// telephony.ts says so out loud: "Every tenant dials through ONE shared Twilio
// account". EVERY texting send now goes through the REST API, including the live
// reply to an inbound text (which used to ride back as TwiML inside Twilio's own
// webhook response, and was abandoned unsent whenever the model turn ran past
// Twilio's ~15-second deadline). The REST API sends from whatever `From` it is
// given, and giving it the platform number is a cross-tenant identity failure
// with teeth: the customer of business A is answered from the PHOXTA number, and
// when they reply it hits the Phoxta platform line, whose webhook is
// twilio-inbound?key=<Phoxta's own agent key> — so Phoxta's agent opens a Phoxta
// conversation and answers another company's customer, as Phoxta, in thread.
//
// The tenant's own number IS knowable: it is the `To` on the inbound Twilio
// webhook, signed by Twilio. twilio-inbound hands it straight to this funnel for
// the live reply AND records it as meta.twilio_to on the customer's message, so
// a deferred or retried text is sent from the number it arrived on. When no such
// number can be resolved the reply is REFUSED and left for a person: a message
// not sent beats a message sent from the wrong company.
// ---------------------------------------------------------------------------
export const TENANT_SENDER_MISSING =
  "this text can only be answered from the business's own number, and that number is not recorded on this conversation — a person needs to reply";

/**
 * A Twilio sender we may legitimately speak as, in the form twilioSend wants —
 * or "" when the value is not one.
 *
 * The input is always the `To` of an inbound webhook Twilio SIGNED, so the
 * question is only what shape it is, never whether it is ours. E.164 is the
 * normal case. A SHORT CODE is the exception that matters: it is 3–8 digits
 * with no country code, normalizeE164 rejects it, and requiring E.164 would
 * silently refuse every reply for a business texting from one. WhatsApp has no
 * short codes, so there it is E.164 or nothing.
 */
export function tenantSenderFrom(rawTo: unknown, channel: string): string {
  const bare = String(rawTo ?? "").trim().replace(/^whatsapp:/i, "");
  const e164 = normalizeE164(bare);
  if (channel === "whatsapp") return e164 ? `whatsapp:${e164}` : "";
  if (e164) return e164;
  const digits = bare.replace(/[\s()\-.]/g, "");
  return /^\d{3,8}$/.test(digits) ? digits : "";
}

/** The business's own texting number for this thread, in the form twilioSend
 *  wants, or "" when the thread carries none. */
export async function tenantSmsFrom(
  admin: SupabaseClient,
  orgId: string,
  conversationId: string,
  channel: string,
): Promise<string> {
  if (!conversationId) return "";
  const { data, error } = await admin
    .from("conversation_messages")
    .select("meta")
    .eq("organization_id", orgId)
    .eq("conversation_id", conversationId)
    .eq("channel_type", channel)
    .eq("role", "customer")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    // Fail CLOSED: not knowing the sender must never mean "use the platform's".
    console.error("[phoxta] tenant sender lookup failed:", error.message);
    return "";
  }
  for (const r of ((data as Json[] | null) ?? [])) {
    const sender = tenantSenderFrom((r?.meta ?? {}).twilio_to, channel);
    if (sender) return sender;
  }
  return "";
}

// ---------------------------------------------------------------------------
// WHATSAPP'S 24-HOUR RULE.
//
// WhatsApp lets a business send FREE TEXT only within 24 hours of the
// customer's last inbound message. Outside that window Meta refuses the message
// and Twilio reports error 63016 with status `undelivered` — the reply is
// composed, billed, stamped 'sent' by everything that does not look at the error
// code, and thrown away. The account log shows exactly that: two agent replies
// undelivered, both 63016, neither visible to anyone as a failure.
//
// The agent did not know the rule, so it could not act on it. Now the funnel
// does, and it does it in ONE place — deliverAutoReply — so every path that can
// answer a WhatsApp customer obeys it: the live webhook, the catch-up worker,
// the operator's reply tool and an Engage flow waking from a delay.
//
// Inside the window: answer normally.
// Outside it: send one of the business's OWN approved templates, if it has one
// that can be sent truthfully. If it has none, send NOTHING — a free-form
// message there is a certain rejection — record why on the message, put a note
// on the thread and tell a person. Silence with an explanation beats an
// undelivered message nobody knows about.
// ---------------------------------------------------------------------------
export const WA_WINDOW_MS = 24 * 3600_000;

export type WhatsappWindow = {
  open: boolean;
  /** When the customer last wrote on this thread, or 0 when they never have. */
  lastInboundAt: number;
  /** What they last wrote — used to choose between the business's templates. */
  lastInboundText: string;
};

/**
 * Is the 24-hour window open on this thread?
 *
 * Measured from the newest INBOUND message on this conversation and channel,
 * which is the thing WhatsApp actually measures. (conversation-send's human
 * composer measures the same thing; agent-catchup used to measure the age of
 * the candidate row instead, which is a different and usually older number.)
 *
 * A thread with no inbound message at all — an outbound-only conversation the
 * business started — is CLOSED, because there has been no customer message to
 * open a service window.
 */
export async function whatsappWindow(
  admin: SupabaseClient,
  orgId: string,
  conversationId: string,
): Promise<WhatsappWindow> {
  const shut: WhatsappWindow = { open: false, lastInboundAt: 0, lastInboundText: "" };
  if (!conversationId) return shut;
  const { data, error } = await admin
    .from("conversation_messages")
    .select("created_at, body")
    .eq("organization_id", orgId)
    .eq("conversation_id", conversationId)
    .eq("channel_type", "whatsapp")
    .eq("role", "customer")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    // Fail towards SENDING: Twilio itself is the authority on the window, and a
    // 63016 comes back as an honest failure on the row. Refusing a deliverable
    // reply because one read hiccupped would be the worse of the two mistakes.
    console.error("[phoxta] WhatsApp window lookup failed:", error.message);
    return { open: true, lastInboundAt: 0, lastInboundText: "" };
  }
  const at = Date.parse(String((data as Json)?.created_at ?? ""));
  if (!Number.isFinite(at)) return shut;
  return { open: Date.now() - at < WA_WINDOW_MS, lastInboundAt: at, lastInboundText: String((data as Json)?.body ?? "") };
}

/** "3 hours ago" / "6 days ago" — for copy an owner reads, not a timestamp. */
export function agoInWords(ms: number): string {
  const hours = Math.floor(ms / 3600_000);
  if (hours < 1) return "less than an hour ago";
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

/** One of the business's approved WhatsApp templates, ready to send. */
export type WhatsappTemplateSend = {
  id: string;
  title: string;
  contentSid: string;
  /** Twilio ContentVariables — positional, exactly as the template was approved. */
  variables: Record<string, string>;
  /** The text those variables produce, for the thread and the audit line. */
  rendered: string;
  /** Why this one was chosen, in words — written into the audit line so "the
   *  agent sent my customer THAT?" has an answer without database access. */
  because: string;
};

// ---------------------------------------------------------------------------
// WHAT KIND OF TEMPLATE IS THIS, AND MAY IT ANSWER A QUESTION?
//
// Meta classifies every approved template as UTILITY, MARKETING or
// AUTHENTICATION, and the three are not interchangeable:
//
//   UTILITY         follows up on a transaction or a request the customer made.
//                   This is the only kind that can ever BE an answer.
//   MARKETING       promotions, offers, re-engagement — "Just following up on
//                   your recent enquiry". Sending one in reply to a service
//                   question is a category error, and in the UK and EU it is a
//                   consent question rather than a style question: a marketing
//                   message needs opt-in, and "they asked us where their order
//                   is" is not opt-in to marketing.
//   AUTHENTICATION  a one-time-code shell. There is no code to put in it here.
//
// A prover executed a fixture where this account's MARKETING template was
// auto-sent as the answer to a service question, because the old rule admitted a
// template on ONE coincidental body word. Category is now the first gate and it
// is absolute: no score can promote a marketing template into an answer.
//
// The column is read defensively because it arrives with 0120 and edge functions
// deploy independently of migrations — before it lands, every template reads as
// unclassified and is judged on the shape of its own words plus the much
// stricter relevance test below.
// ---------------------------------------------------------------------------
export type TemplateCategory = "utility" | "marketing" | "authentication" | "unclassified";

export function templateCategory(row: Json): TemplateCategory {
  const raw = String(row?.whatsapp_template_category ?? "").trim().toLowerCase();
  if (raw === "utility" || raw === "marketing" || raw === "authentication") return raw;
  return "unclassified";
}

/**
 * Words that make a message promotional whatever anybody labelled it.
 *
 * The floor under the category column, and it holds in both directions: for the
 * templates saved before 0120 exists, and for the owner who saves a promotion
 * and leaves the category on its default. It reads the TEMPLATE's own words —
 * not a guess about the customer — so it is a statement about the message, which
 * is the only thing here that can be checked.
 */
const PROMOTIONAL =
  /\b(sale|sales|discount|discounted|offer|offers|promo|promotion|promotional|deal|deals|voucher|coupon|% ?off|percent off|limited time|last chance|don'?t miss|new arrival|newsletter|subscribe|unsubscribe|book now|shop now|order now|special price|black friday|clearance|free (?:gift|trial)|refer a friend|following up on your recent|checking in to see if)\b/i;

/** Templates that may never be sent automatically, and why — in the owner's
 *  own words, because this reason is what a person reads on the thread. */
// Exported so it can be executed directly against fixtures. It decides whether a
// template may be put in front of a customer, which is exactly the kind of rule
// that should be provable rather than argued about — and it has already been
// wrong twice in opposite directions.
export function templateRefusal(row: Json, category: TemplateCategory, body: string): string | null {
  if (category === "marketing") {
    return "it is a marketing template, and a marketing message is not an answer to a customer's question";
  }
  if (category === "authentication") {
    return "it is an authentication template, and there is no verification code to put in it";
  }
  // The word test runs on 'utility' as well as 'unclassified'. A template that
  // opens "Don't miss out — 20% off this weekend" is a promotion whoever ticked
  // the box, and the box is one click in a drawer most owners will never open.
  // A genuine utility template ("Your order has shipped") contains none of these
  // words, so nothing legitimate is lost by holding both to it.
  if ((category === "unclassified" || category === "utility") && PROMOTIONAL.test(body)) {
    return category === "utility"
      ? "it is marked as a utility template but reads as a promotion, so it is not sent as an answer"
      : "it reads as a promotional message rather than an answer, and it has not been classified as a utility template";
  }
  return null;
}

/** The customer's name on this thread, or "". Only ever used to fill a template
 *  greeting — and a template that needs a name we do not have is simply not
 *  usable, rather than sent with a guess in it. */
async function customerNameFor(admin: SupabaseClient, orgId: string, conversationId: string): Promise<string> {
  if (!conversationId) return "";
  const { data } = await admin
    .from("conversations")
    .select("customer_name")
    .eq("id", conversationId)
    .eq("organization_id", orgId)
    .maybeSingle();
  return String((data as Json)?.customer_name ?? "").trim();
}

/** The meaningful words of a piece of text, for overlap scoring. Deliberately
 *  small and local: this file must not pull in the agent's model stack. */
const TEMPLATE_STOPWORDS = new Set([
  "the", "and", "for", "you", "your", "our", "with", "that", "this", "have", "has", "was", "were", "are",
  "can", "could", "would", "will", "want", "need", "please", "hello", "there", "thanks", "thank", "from",
  "about", "them", "they", "what", "when", "where", "how", "any", "all", "not", "but", "get", "got", "let",
]);

function meaningfulWords(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of String(text ?? "").toLowerCase().match(/[a-z][a-z0-9'-]{2,}/g) ?? []) {
    if (!TEMPLATE_STOPWORDS.has(w)) out.add(w.replace(/(ies|es|s)$/, ""));
  }
  return out;
}

/**
 * A template's placeholders, filled — or null when we would have to GUESS.
 *
 * An approved template is fixed text with numbered slots (`{{1}}`, `{{2}}`) and
 * nothing records what each slot means. Putting the wrong value in one sends a
 * message from the business that says something untrue — "your order Jane has
 * shipped" — which is worse than sending nothing at all.
 *
 * So exactly two shapes are fillable without guessing:
 *   • no placeholders — the template says the same thing every time;
 *   • a single `{{1}}` immediately after a greeting ("Hi {{1}},"), which can
 *     only be the customer's name, and only when we know their name.
 * Everything else is left to a person, who fills the slots themselves in the
 * Inbox composer — that screen already exists and already does exactly this.
 */
const GREETING_SLOT = /^\s*(hi|hello|hey|dear|good\s+(morning|afternoon|evening))\b[\s,]*\{\{1\}\}/i;

export function fillWhatsappTemplate(
  body: string,
  customerName: string,
): { variables: Record<string, string>; rendered: string } | null {
  const text = String(body ?? "");
  const slots = [...new Set([...text.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1]))];
  if (slots.length === 0) return text.trim() ? { variables: {}, rendered: text } : null;
  const first = String(customerName ?? "").trim().split(/\s+/)[0] ?? "";
  if (slots.length === 1 && slots[0] === "1" && first && GREETING_SLOT.test(text)) {
    return { variables: { "1": first }, rendered: text.replace(/\{\{1\}\}/g, first) };
  }
  return null;
}

/**
 * The business's approved WhatsApp templates, as rows.
 *
 * `select("*")` rather than a named list for the reason resolveConversation uses
 * it: whatsapp_template_category arrives with migration 0120 and edge functions
 * deploy independently of migrations, so naming the column would turn every
 * WhatsApp template read into an error on a project where the migration has not
 * been applied yet — and an error here means a customer is not answered.
 */
async function whatsappTemplateRows(admin: SupabaseClient, orgId: string): Promise<Json[] | null> {
  const { data, error } = await admin
    .from("canned_responses")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_whatsapp_template", true)
    .in("channel", ["any", "whatsapp"])
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("[phoxta] WhatsApp templates unreadable:", error.message);
    return null;
  }
  return (data as Json[] | null) ?? [];
}

/**
 * Does this business have a template the AGENT could send? Read before a model
 * turn is spent on a thread whose window has closed.
 *
 * "Could send" is the whole point: this used to answer yes for any approved
 * template at all, including a marketing one the funnel will now always refuse,
 * so agent-catchup paid for a full tool-using model turn and then found there
 * was nothing to send after all. It now counts only what could legitimately
 * answer a customer.
 */
export async function hasWhatsappTemplates(admin: SupabaseClient, orgId: string): Promise<boolean> {
  const rows = await whatsappTemplateRows(admin, orgId);
  if (!rows) return false;
  // The approval code is filtered HERE rather than in the query: a PostgREST
  // "not equal to the empty string" filter is ambiguous enough that it is not
  // worth resting a customer's reply on. A template with no code is a draft —
  // the console already shows it in red — and cannot be sent.
  return rows.some((r) => {
    if (!String(r?.whatsapp_template_sid ?? "").trim()) return false;
    const body = String(r?.body ?? "");
    return !templateRefusal(r, templateCategory(r), body);
  });
}

/**
 * How much of a template's own words have to be on topic before it counts as an
 * answer rather than a change of subject.
 *
 * A third was too strict to be reachable, and being unreachable is not the safe
 * side of this trade — it means every out-of-window WhatsApp conversation
 * escalates to a human, which is the feature not existing. A real approved
 * template, "Delivery update", against a real question — "I ordered a jacket
 * last week and it has not arrived, where is my order?" — was refused, because
 * a template is mostly scaffolding: a greeting, a placeholder, a sign-off, a
 * courtesy line. Only a handful of its words can ever be the topic.
 *
 * A sixth still stops a refunds template answering a question about opening
 * hours, which is what this floor is actually for. The protection against
 * sending the WRONG KIND of message lives in templateRefusal — category plus the
 * promotional word test — and that is the gate that matters; this one only
 * decides between templates that are already allowed to answer.
 */
const TEMPLATE_MIN_COVERAGE = 0.17;

/** How many of the template's body words must appear in the CUSTOMER'S OWN
 *  message before a title-less match is allowed. Two, because one is a
 *  coincidence — which is precisely how a marketing template was sent as the
 *  answer to a service question. */
const TEMPLATE_MIN_BODY_HITS = 2;

const overlap = (a: Set<string>, b: Set<string>): number => {
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n;
};

/**
 * The business's own approved template that genuinely ANSWERS what was asked —
 * or null, which means "send nothing and tell a person".
 *
 * The bar this replaces was `score < 1`, i.e. one coincidental body word, scored
 * against the agent's composed reply and the customer's last message mashed
 * together. That is far too loose in the one direction that hurts: the agent's
 * reply is generated prose full of ordinary service vocabulary, so almost any
 * template shares a word with it, and a prover duly got this account's MARKETING
 * template sent as the answer to a service question.
 *
 * Three things have to hold now, and they are requirements rather than points:
 *
 *   1. CATEGORY. Marketing and authentication templates are never an answer, and
 *      no amount of word overlap promotes them. See templateRefusal above.
 *   2. IT IS ABOUT WHAT THEY ASKED. Either the template's TITLE matches both the
 *      customer's own words and the reply the agent meant to send — a title is
 *      the topic, and agreeing with both ends is the strongest signal available
 *      — or its BODY shares at least two meaningful words with what the CUSTOMER
 *      actually wrote. Overlap with the agent's reply alone is not enough,
 *      because that is where the coincidences live.
 *   3. IT IS MOSTLY ABOUT THAT. At least a third of the template's own
 *      meaningful words are on topic, so a long template that happens to mention
 *      "delivery" once cannot answer a delivery question.
 *
 * A thread where the customer has never written has no words to match, so
 * nothing qualifies and the reply goes to a person. That is correct: a template
 * sent to somebody who has said nothing is an unsolicited message.
 */
export async function pickWhatsappTemplate(
  admin: SupabaseClient,
  orgId: string,
  o: { reply: string; customerMessage: string; customerName: string },
): Promise<WhatsappTemplateSend | null> {
  const rows = await whatsappTemplateRows(admin, orgId);
  if (!rows) return null;

  const askedByCustomer = meaningfulWords(o.customerMessage);
  const intended = meaningfulWords(o.reply);
  // Nothing to be relevant TO. Silence and a person, rather than a guess.
  if (askedByCustomer.size === 0) {
    console.warn(`[phoxta] no WhatsApp template chosen for ${orgId}: the customer has never written on this thread`);
    return null;
  }

  let best: { score: number; hit: WhatsappTemplateSend } | null = null;
  for (const r of rows) {
    const contentSid = String(r.whatsapp_template_sid ?? "").trim();
    if (!contentSid) continue;
    const body = String(r.body ?? "");
    const category = templateCategory(r);
    const refused = templateRefusal(r, category, body);
    const title = String(r.title ?? "").trim() || "Approved WhatsApp template";
    if (refused) {
      console.warn(`[phoxta] WhatsApp template "${title}" not eligible for an automatic reply: ${refused}`);
      continue;
    }
    const filled = fillWhatsappTemplate(body, o.customerName);
    if (!filled) continue;

    const titleWords = meaningfulWords(title);
    const bodyWords = meaningfulWords(body);
    if (bodyWords.size === 0) continue;

    const titleAsked = overlap(titleWords, askedByCustomer);
    const titleMeant = overlap(titleWords, intended);
    const bodyAsked = overlap(bodyWords, askedByCustomer);
    const bodyMeant = overlap(bodyWords, intended);

    const onTopic = new Set<string>();
    for (const w of bodyWords) if (askedByCustomer.has(w) || intended.has(w)) onTopic.add(w);
    const coverage = onTopic.size / bodyWords.size;

    const titleMatch = titleAsked >= 1 && titleMeant >= 1;
    const bodyMatch = bodyAsked >= TEMPLATE_MIN_BODY_HITS && bodyMeant >= 1;
    if (!titleMatch && !bodyMatch) continue;
    if (coverage < TEMPLATE_MIN_COVERAGE) continue;

    // Ranked only among templates that already qualify, so the score decides
    // WHICH answer, never WHETHER to answer.
    const score = titleAsked * 3 + titleMeant * 2 + bodyAsked * 2 + bodyMeant;
    const because = titleMatch
      ? `its title matches what the customer asked about${category === "utility" ? " and it is a utility template" : ""}`
      : `${bodyAsked} of the customer's own words appear in it, and ${Math.round(coverage * 100)}% of the template is about this`;
    // Rows arrive newest first, so a tie keeps the most recently written one.
    if (!best || score > best.score) {
      best = {
        score,
        hit: { id: String(r.id), title, contentSid, variables: filled.variables, rendered: filled.rendered, because },
      };
    }
  }
  return best?.hit ?? null;
}

// ---------------------------------------------------------------------------
// THE THREE TEXTING NUMBERS, AND WHY THEY ARE NOT THE MAIL NUMBERS.
//
// SMS and WhatsApp used to have no ceiling at all: twilio-inbound answered
// straight out of agent-inbound's JSON and never met this file. The obvious fix
// — apply the mail numbers — would have been its own bug, because a texting
// conversation IS many short turns and cutting a live one off after six replies
// is exactly the failure this whole change exists to stop. So the ceilings are
// shaped around the one thing that separates a loop from a conversation: a loop
// answers instantly, forever, at a machine's cadence.
//
//   PER THREAD, 24 HOURS — 30 (mail: 6).
//     Thirty AGENT replies on one thread in a day is far beyond any real support
//     exchange (the longest real threads in this Inbox run to a dozen turns) and
//     still small enough that a runaway costs thirty billed segments rather than
//     thousands. It is the outer bound, not the thing that stops a loop.
//
//   BURST — 8 replies in any rolling 10 minutes (mail: not applied).
//     This is what actually stops a loop. A person tapping out a fast series of
//     texts gets up to eight answers inside ten minutes, which no human exchange
//     needs; a counterparty autoresponder produces its eight within a couple of
//     minutes and is then held to roughly one reply per 75 seconds. Unbounded
//     becomes bounded and cheap, within minutes rather than within a day, and a
//     carrier never sees a rapid-fire pattern from our number.
//
//   MINIMUM SPACING — 10 seconds (mail: 45).
//     45 seconds exists to absorb a provider re-delivery of an EMAIL. Texting
//     has to feel live: a person who sends "hi" and then "are you open today?"
//     twenty seconds later must get both answered. Ten seconds still absorbs a
//     Twilio retry and two workers racing the same message.
//
// Every one of these refusals is RETRYABLE, so agent-catchup answers the person
// on a later tick instead of dropping them — a real conversation slows down, it
// does not go silent.
// ---------------------------------------------------------------------------
const maxPerThread = (channel: string) =>
  isChat(channel) ? num("AUTO_REPLY_MAX_PER_THREAD_CHAT", 30) : num("AUTO_REPLY_MAX_PER_THREAD", 6);

const chatBurstMinutes = () => num("AUTO_REPLY_CHAT_BURST_MINUTES", 10);
const chatBurstCap = () => num("AUTO_REPLY_CHAT_BURST", 8);

const minGapMs = (channel: string) =>
  (isChat(channel) ? num("AUTO_REPLY_MIN_GAP_SECONDS_CHAT", 10) : num("AUTO_REPLY_MIN_GAP_SECONDS", 45)) * 1000;

/** A reply row that never reached the customer must not consume the ceiling that
 *  exists to protect them. 'failed' is a refusal or a wire error; 'simulated' is
 *  a development environment with no provider configured. Neither was received.
 *  A NULL status counts — that is a human's message from the console, and an
 *  in-flight agent row, both of which the spacing check must see. */
const reachedTheCustomer = (status: unknown): boolean => {
  const s = String(status ?? "");
  return s !== "failed" && s !== "simulated";
};

/**
 * May the agent answer on THIS thread right now?
 *
 * Deliberately does not ask "was the last message ours?" — a customer replying
 * to our reply is the normal case, and refusing that would mean answering each
 * person exactly once. Ping-pong is bounded by rate instead: a ceiling per
 * thread per day, and a minimum spacing that absorbs a duplicate delivery.
 *
 * `exceptMessageId` is the agent row for the turn being sent RIGHT NOW.
 * respondCore writes that row before the transport puts anything on the wire, so
 * re-running this gate at send time would otherwise count the reply against
 * itself and trip the minimum-spacing check on every single message.
 */
export async function threadReplyGate(
  admin: SupabaseClient,
  orgId: string,
  conversationId: string,
  opts: { channel?: string; exceptMessageId?: string | null } = {},
): Promise<Gate> {
  // select("*") for the same reason resolveConversation does it: ai_paused
  // arrives via a lazily applied bootstrap and a named select of a missing
  // column errors into null, which would read as "no conversation".
  const { data: conv, error: convErr } = await admin
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (convErr) {
    // A transient PostgREST failure is NOT "there is no such conversation". The
    // error used to be discarded, so one hiccup on a row that was read seconds
    // earlier returned `retryable: false` — which makes the message settled
    // forever, drops it out of agent-catchup's scan, and buries a real enquiry
    // under "Not answered automatically — conversation not found." Fail closed
    // AND retryable, the same shape as the history read below.
    console.error("[phoxta] conversation unreadable:", convErr.message);
    return no("the conversation could not be read", true);
  }
  if (!conv) return no("conversation not found", false);
  const c = conv as Json;
  if (c.ai_paused === true) return no("a human has taken over this thread", false);
  if (c.status === "closed") return no("the conversation is closed", false);

  const channel = opts.channel ?? "email";
  const cap = maxPerThread(channel);
  const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();

  // ONE read, and the rows themselves rather than a count.
  //
  // The count query this replaces had no delivery_status filter, so replies that
  // FAILED on the wire — a Gmail 403 on a stale scope, a provider outage, or a
  // reply this very funnel composed and then refused — counted toward the
  // ceiling. Six failures locked a real customer's thread for 24 hours while the
  // Inbox told the owner six replies had been sent, and agent-catchup (which
  // correctly ignores failed rows) re-queued the message into a gate it could
  // never pass. Reading the rows also gives the spacing check and the texting
  // burst window for free, where they were a second and a third round trip.
  const { data: agentRows, error: histErr } = await admin
    .from("conversation_messages")
    .select("id, created_at, delivery_status")
    .eq("organization_id", orgId)
    .eq("conversation_id", conversationId)
    .eq("role", "agent")
    .gte("created_at", dayAgo)
    .order("created_at", { ascending: false })
    .limit(200);
  if (histErr) {
    // Fail CLOSED. Not knowing how many replies went out must never mean "send
    // another one" — retryable, so the message keeps its place in the queue.
    console.error("[phoxta] thread reply history unreadable:", histErr.message);
    return no("the thread's reply history could not be read", true);
  }
  const sent = ((agentRows as Json[] | null) ?? []).filter(
    (r) => String(r.id) !== String(opts.exceptMessageId ?? "") && reachedTheCustomer(r.delivery_status),
  );

  if (sent.length >= cap) {
    return no(`already sent ${sent.length} automatic replies on this thread in 24 hours`, true);
  }

  // The texting burst window — the gate that actually stops an SMS/WhatsApp
  // ping-pong, minutes into it rather than a day into it. See the block above.
  if (isChat(channel)) {
    const minutes = chatBurstMinutes();
    const burstCap = chatBurstCap();
    const from = Date.now() - minutes * 60_000;
    const recent = sent.filter((r) => Date.parse(String(r.created_at)) >= from).length;
    if (recent >= burstCap) {
      return no(`already sent ${recent} automatic replies on this thread in ${minutes} minutes`, true);
    }
  }

  // Minimum spacing: a provider re-delivery or two cron ticks racing must not
  // produce two messages to the same person seconds apart. Rows came back newest
  // first, and the filter preserves that order.
  const lastAt = sent.length ? Date.parse(String(sent[0].created_at)) : 0;
  if (lastAt && Date.now() - lastAt < minGapMs(channel)) {
    return no("an automatic reply went out moments ago", true);
  }

  return OK;
}

// ---------------------------------------------------------------------------
// THE PER-ORG DAILY CEILING ON AUTOMATIC SENDS.
//
// Two ceilings bind, and BOTH have to be readable without spending anything —
// which is the whole point of splitting this in two. The budget used to be one
// function that CLAIMED, so it could only live inside deliverAutoReply, i.e.
// after respondCore had already run a full tool-using model turn and written an
// agent row. An org past its ceiling therefore burned a model turn per candidate
// per five-minute tick until midnight, and every one of those dead rows counted
// toward the per-thread ceiling as well.
//
//   autoReplyBudgetOk    reads. Runs inside autoReplyAllowed, so every
//                        transport's cheap pre-flight now sees the daily cap.
//   autoReplyBudgetClaim writes. Runs once, inside the funnel, immediately
//                        before the send — it is the authoritative ceiling
//                        because the increment and the check are one statement.
//
// The numbers, plainly, because the deploy notes had them wrong: the effective
// ceiling on automatic EMAIL is min(AUTO_REPLY_DAILY_CAP, agent_config.autopilot
// .max_emails_per_day) — 100 and 50 by default, so FIFTY. Every automatic reply
// also spends one of the autopilot's max_actions_per_day (100 by default),
// whatever channel it went out on.
// ---------------------------------------------------------------------------

/** Which of app_claim_action's counters this channel spends. SMS and WhatsApp
 *  used to be charged to `email`, which both misreported the send and drained a
 *  ceiling an owner had set for their mail. */
export const autoReplyBudgetKind = (channel: string): string => (channel === "email" ? "email" : "action");

const utcDay = () => new Date().toISOString().slice(0, 10);

/** The org's own autopilot ceilings, defaulted exactly as 0112 defaults them. */
async function budgetLimits(admin: SupabaseClient, orgId: string): Promise<{ actions: number; emails: number }> {
  const { data } = await admin.from("agent_config").select("autopilot").eq("organization_id", orgId).maybeSingle();
  const cfg = (((data as Json)?.autopilot ?? {}) || {}) as Json;
  const n = (v: unknown, d: number) => {
    const x = Number(v);
    return Number.isFinite(x) && x > 0 ? x : d;
  };
  return { actions: n(cfg.max_actions_per_day, 100), emails: n(cfg.max_emails_per_day, 50) };
}

/**
 * Is there room in today's budget? Reads only — spends nothing, claims nothing.
 *
 * The audit-log count is the ceiling that must always hold: this module writes
 * one row per send attempt, so it survives a redeploy and holds no matter which
 * transport triggered the send. The agent_budget read mirrors what
 * app_claim_action would decide a moment later (it returns false once the
 * POST-increment value exceeds the max, i.e. once the pre-value has reached it).
 */
export async function autoReplyBudgetOk(admin: SupabaseClient, orgId: string, channel = "email"): Promise<Gate> {
  const cap = num("AUTO_REPLY_DAILY_CAP", 100);
  const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count } = await admin
    .from("agent_audit_log")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("tool", AUTO_REPLY_TOOL)
    .eq("status", "ok")
    .gte("created_at", dayAgo);
  if ((count ?? 0) >= cap) return no(`today's automatic-reply limit (${cap}) is reached`, true);

  try {
    const [{ data: used }, limits] = await Promise.all([
      admin.from("agent_budget").select("actions, emails").eq("organization_id", orgId).eq("day", utcDay()).maybeSingle(),
      budgetLimits(admin, orgId),
    ]);
    const actions = Number((used as Json)?.actions ?? 0);
    const emails = Number((used as Json)?.emails ?? 0);
    if (actions >= limits.actions) return no(`today's agent budget (${limits.actions} actions) is spent`, true);
    if (autoReplyBudgetKind(channel) === "email" && emails >= limits.emails) {
      return no(`today's automatic-email limit (${limits.emails}) is reached`, true);
    }
  } catch (e) {
    // The audit-log ceiling above is the one that must always hold; this read is
    // an optimisation over the claim, which runs regardless.
    console.warn("[phoxta] agent_budget read unavailable:", String((e as Error)?.message || e));
  }
  return OK;
}

/** Spend one action against today's ceiling. The authoritative gate: the
 *  increment and the check are a single statement, so two ticks running at once
 *  cannot both pass a ceiling with one action left. */
export async function autoReplyBudgetClaim(admin: SupabaseClient, orgId: string, channel = "email"): Promise<Gate> {
  try {
    const { data, error } = await admin.rpc("app_claim_action", { p_org: orgId, p_kind: autoReplyBudgetKind(channel) });
    if (!error && data === false) return no("today's agent budget is spent", true);
  } catch (e) {
    console.warn("[phoxta] app_claim_action unavailable:", String((e as Error)?.message || e));
  }
  return OK;
}

// ---------------------------------------------------------------------------
// One message, one answerer.
// ---------------------------------------------------------------------------

/** How long a claim holds before another worker may take the message. Long
 *  enough for a slow model turn and a send; short enough that a function killed
 *  mid-flight does not strand a customer for the rest of the day. */
const CLAIM_TTL_MS = 10 * 60 * 1000;

/**
 * Take exclusive ownership of a customer message before composing an answer.
 *
 * Ingest and reply are not one step: gmail-sync writes the customer's row, then
 * spends 5–30 seconds in the model, and only then does an agent row exist. For
 * the whole of that window agent-catchup's "has anyone replied after this?" test
 * is false, so both workers would compose and both would send — one email, two
 * different replies. The claim closes that window with an optimistic update:
 * Postgres serialises the two writers on the row, the loser sees the winner's
 * claim in its own WHERE clause and gets nothing back.
 *
 * Released implicitly: markNotAnswered replaces the whole auto_reply object (so
 * a refusal frees the message immediately) and a successful send leaves an agent
 * row, which is what stops it being a candidate at all.
 */
export async function claimForReply(
  admin: SupabaseClient,
  orgId: string,
  messageRowId: string,
  meta: Json,
): Promise<boolean> {
  const now = new Date().toISOString();
  const stale = new Date(Date.now() - CLAIM_TTL_MS).toISOString();
  const patch = {
    meta: {
      ...((meta ?? {}) as Json),
      auto_reply: {
        answered: false,
        reason: "the agent is composing a reply",
        retryable: true,
        claimed_at: now,
        at: now,
      },
    },
  };
  // TWO conditional updates rather than one `or=()`.
  //
  // The single filter this replaces embedded an ISO timestamp inside a PostgREST
  // logic tree — `or=(…claimed_at.lt.2026-08-27T09:12:33.456Z)` — where ':' and
  // '.' are reserved and the value has to be double-quoted. Nobody could say
  // whether PostgREST accepted it, and the handler for the case where it does
  // not wrote the claim ANYWAY and returned true, i.e. both workers believed
  // they owned the message. A horizontal filter has no such quoting rule: the
  // value after the operator is taken raw, which is why `.lt(…, stale)` on its
  // own is safe where the same value inside `or=()` is not.
  //
  // Two statements are still exclusive: Postgres serialises each UPDATE on the
  // row, and the two predicates are disjoint (claimed_at IS NULL, versus
  // claimed_at < stale), so exactly one worker can get a row back from either.
  const claim = (build: (q: Json) => Json) =>
    build(admin.from("conversation_messages").update(patch).eq("id", messageRowId).eq("organization_id", orgId)).select("id");

  const fresh = await claim((q: Json) => q.is("meta->auto_reply->>claimed_at", null));
  if (!fresh.error) {
    if (((fresh.data as Json[] | null) ?? []).length > 0) return true;
    const stalled = await claim((q: Json) => q.lt("meta->auto_reply->>claimed_at", stale));
    if (!stalled.error) return ((stalled.data as Json[] | null) ?? []).length > 0;
    console.error("[phoxta] auto-reply stale-claim filter failed:", stalled.error.message);
  } else {
    console.error("[phoxta] auto-reply claim filter failed:", fresh.error.message);
  }

  // Last resort, and deliberately NOT "write it anyway and say yes". Read what
  // the row actually holds, refuse if somebody else is inside their claim
  // window, and only then take it. The race window is the read-then-write gap —
  // narrower than the whole model turn the claim exists to cover, and the 45s
  // (10s on texting) spacing gate absorbs what is left.
  const { data: row, error: readErr } = await admin
    .from("conversation_messages")
    .select("meta")
    .eq("id", messageRowId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (readErr) {
    console.error("[phoxta] auto-reply claim read failed:", readErr.message);
    return false; // fail closed: a delayed reply beats two replies
  }
  const heldAt = Date.parse(String(((row as Json)?.meta?.auto_reply?.claimed_at) ?? ""));
  if (Number.isFinite(heldAt) && Date.now() - heldAt < CLAIM_TTL_MS) return false;
  const { error: plain } = await admin
    .from("conversation_messages")
    .update(patch)
    .eq("id", messageRowId)
    .eq("organization_id", orgId);
  if (plain) {
    console.error("[phoxta] auto-reply claim failed:", plain.message);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// The audit trail: why did this go out?
// ---------------------------------------------------------------------------
export type AutoReplyTrigger =
  | "gmail-sync"
  | "email-inbound"
  | "agent-catchup"
  | "agent-operator"
  | "twilio-inbound"
  /** Not a send: Twilio reporting, minutes later, that a send never arrived. */
  | "twilio-status"
  | "chatwoot"
  | "engage";

export type AutoReplyAudit = {
  status: "ok" | "error" | "denied";
  channel: string;
  trigger: AutoReplyTrigger;
  conversationId: string;
  to: string;
  subject?: string;
  summary: string;
  template?: { id: string; title: string } | null;
  provider?: string;
  providerSid?: string;
  threadId?: string;
  inReplyTo?: string;
  reason?: string;
  messageId?: string | null;
};

/** One row per automatic send attempt. agent_audit_log is the existing trail the
 *  console already renders (Agent → Operator → Recent activity); actor 'agent'
 *  distinguishes the customer-facing agent from the operator. */
export async function auditAutoReply(admin: SupabaseClient, orgId: string, e: AutoReplyAudit): Promise<void> {
  const { error } = await admin.from("agent_audit_log").insert({
    organization_id: orgId,
    actor: "agent",
    tool: AUTO_REPLY_TOOL,
    status: e.status,
    summary: e.summary.slice(0, 500),
    args: {
      channel: e.channel,
      trigger: e.trigger,
      conversation_id: e.conversationId,
      to: e.to,
      subject: e.subject ?? "",
      template: e.template ?? null,
      provider: e.provider ?? "",
      provider_sid: e.providerSid ?? "",
      thread_id: e.threadId ?? "",
      in_reply_to: e.inReplyTo ?? "",
      message_id: e.messageId ?? null,
      reason: e.reason ?? "",
    },
  });
  if (error) console.error("[phoxta] auto-reply audit failed:", error.message);
}

/** What a transport reports back about a send. Structural on purpose so the
 *  callers stay free of transport types. */
export type SendOutcome = {
  ok: boolean;
  provider: string;
  id: string;
  status: "sent" | "failed" | "simulated";
  error?: string;
  threadId?: string;
  /**
   * This send will never succeed on a retry, so the message must not stay in the
   * queue re-composing a model turn every five minutes for the rest of the day.
   *
   * Only for refusals that are ABOUT the destination rather than about us: the
   * customer replied STOP, or WhatsApp's 24-hour window has closed and no
   * template fitted. The message is handed to a person instead — which is the
   * outcome that actually helps the customer.
   */
  permanent?: boolean;
};

/**
 * Write onto the agent's own message row what actually happened on the wire.
 *
 * respondCore records the reply but knows nothing about delivery, so until now
 * every AI email showed a blank delivery tick in the Inbox and a human could not
 * tell a sent reply from one that never left the building. `provider_sid` is the
 * provider's id for the message we SENT — for Gmail that is also the dedupe key
 * that stops the next sync ingesting our own reply as new mail.
 *
 * RETURNS false for exactly one reason: the row already carried a carrier
 * verdict of failed/undelivered and this call was about to overwrite it with a
 * success. Nothing else — a write that errors still returns true, because the
 * caller uses this to decide whether the CUSTOMER's message may be settled, and
 * a transient PostgREST failure is not evidence about delivery.
 */
export async function stampDelivery(
  admin: SupabaseClient,
  orgId: string,
  messageRowId: string,
  sent: SendOutcome,
  extra: Json = {},
): Promise<boolean> {
  const { data } = await admin
    .from("conversation_messages")
    .select("meta")
    .eq("id", messageRowId)
    .eq("organization_id", orgId)
    .maybeSingle();
  const meta = ((data as Json)?.meta ?? {}) as Json;

  // A VERDICT THAT HAS ALREADY ARRIVED BEATS THIS ONE.
  //
  // This write happens a moment after the send returns, and Twilio's own
  // delivery callback is a separate HTTP request that can — narrowly — land
  // inside that gap. If it already reported the message as failed or
  // undelivered, that is the truth: it is what the CARRIER said, where `sent`
  // here only ever meant "Twilio accepted it". Overwriting it would put the
  // reply back in the Inbox looking delivered and re-settle the customer's
  // message, which is precisely the defect twilio-status exists to fix.
  //
  // The extra keys are still merged, because they describe what was sent (the
  // subject, the template that went instead, the picture) and remain true.
  const already = String(((meta.delivery ?? {}) as Json).status ?? "");
  const alreadyFailed = already === "failed" || already === "undelivered";
  if (alreadyFailed && sent.ok) {
    const { error: mergeErr } = await admin
      .from("conversation_messages")
      .update({ provider_sid: sent.id ?? "", meta: { ...meta, ...extra } })
      .eq("id", messageRowId)
      .eq("organization_id", orgId);
    if (mergeErr) console.error("[phoxta] could not record delivery:", mergeErr.message);
    console.warn(`[phoxta] keeping the carrier's '${already}' verdict on ${messageRowId} rather than the send's own 'sent'`);
    return false; // …and ONLY here: see the return contract above.
  }

  const { error } = await admin
    .from("conversation_messages")
    .update({
      delivery_status: sent.status,
      provider_sid: sent.id ?? "",
      meta: {
        ...meta,
        ...extra,
        delivery: { provider: sent.provider, status: sent.status, ...(sent.error ? { error: sent.error } : {}) },
      },
    })
    .eq("id", messageRowId)
    .eq("organization_id", orgId);
  // TRUE even when the write failed. This value answers exactly one question —
  // "did a carrier verdict already on the row override what you were told to
  // record?" — and a transient PostgREST failure is not that. Returning false
  // here would make deliverAutoReply believe the message had been reported
  // undelivered and leave the customer's row untouched over a write it should
  // simply have logged.
  if (error) console.error("[phoxta] could not record delivery:", error.message);
  return true;
}

/**
 * Record on the customer's own message row WHY nothing was sent, so the answer
 * to "why did the agent ignore this?" is visible beside the message itself.
 *
 * `retryable` is what agent-catchup reads later. A newsletter is settled
 * forever; "the hourly limit was reached" is a moment in time and the message
 * genuinely still deserves an answer.
 */
export async function markNotAnswered(
  admin: SupabaseClient,
  orgId: string,
  messageRowId: string,
  meta: Json,
  reason: string,
  retryable = true,
  /** Extra keys to keep on the auto_reply object — e.g. the moment a human was
   *  told about this message, which is what stops a five-minute cron re-alerting
   *  them about it 360 times a day. */
  extra: Json = {},
): Promise<void> {
  const clean = { ...((meta ?? {}) as Json) };
  delete clean.auto_reply;
  const { error } = await admin
    .from("conversation_messages")
    .update({
      meta: {
        ...clean,
        auto_reply: { answered: false, reason, retryable, at: new Date().toISOString(), ...((extra ?? {}) as Json) },
      },
    })
    .eq("id", messageRowId)
    .eq("organization_id", orgId);
  if (error) console.error("[phoxta] could not record the skip reason:", error.message);
}

/** How long the same "a customer is waiting" alert is suppressed for. Six hours:
 *  long enough that a five-minute cron cannot bury an owner, short enough that a
 *  message still waiting at the end of a working day says so again. */
const NOTIFY_DEDUPE_MS = num("AGENT_NOTIFY_DEDUPE_MINUTES", 360) * 60_000;

/** Tell a human that a message is waiting, when policy says "ask me" rather than
 *  "answer it". Best-effort: a failed notification must not lose the message.
 *
 *  DEDUPED, because the thing that calls it most is a worker on a five-minute
 *  cron: "Ask me" mode re-considered the same unanswered messages on every tick
 *  and this was a bare insert, so five waiting messages became up to 360 identical
 *  alerts in six hours and the one person who needed to see "a customer is
 *  waiting" stopped reading them. That is the message being lost by another route.
 *  The link is the natural key — it names the conversation. */
export async function notifyNeedsHuman(
  admin: SupabaseClient,
  orgId: string,
  conversationId: string,
  preview: string,
): Promise<void> {
  try {
    // Scoped to the org even though the id was read inside it a moment ago: this
    // is the one helper whose output is a link into a tenant's Inbox, and a
    // conversation id from the wrong org would notify people with no membership
    // there, quoting another business's customer.
    const { data: conv } = await admin
      .from("conversations")
      .select("assigned_to")
      .eq("id", conversationId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (!conv) return;
    const assignee = (conv as Json)?.assigned_to as string | null;
    let recipients: string[] = assignee ? [assignee] : [];
    if (recipients.length === 0) {
      const { data: admins } = await admin
        .from("organization_memberships")
        .select("user_id")
        .eq("organization_id", orgId)
        .in("role", ["owner", "admin"]);
      recipients = ((admins as Json[] | null) ?? []).map((m) => String(m.user_id));
    }
    if (recipients.length === 0) return;
    const link = `/dashboard/businesses/${orgId}/ops/engage/inbox?c=${conversationId}`;
    const since = new Date(Date.now() - NOTIFY_DEDUPE_MS).toISOString();
    const { data: recent } = await admin
      .from("notifications")
      .select("user_id")
      .eq("link", link)
      .in("user_id", recipients)
      .gte("created_at", since);
    const alreadyTold = new Set(((recent as Json[] | null) ?? []).map((r) => String(r.user_id)));
    const targets = recipients.filter((u) => !alreadyTold.has(u));
    if (targets.length === 0) return;
    await admin.from("notifications").insert(
      targets.map((user_id) => ({
        user_id,
        title: "A customer message is waiting for you",
        body: preview.slice(0, 140),
        kind: "info",
        link,
      })),
    );
  } catch (e) {
    console.warn("[phoxta] needs-human notification skipped:", String((e as Error)?.message || e));
  }
}

/** How long the "today's agent budget is spent" alert is suppressed for. Twelve
 *  hours: one alert per business per working day, never one per message. */
const BUDGET_ALERT_DEDUPE_MS = num("AGENT_BUDGET_ALERT_HOURS", 12) * 3600_000;

/**
 * Tell the owner that the business has gone quiet.
 *
 * Reaching the daily ceiling silences EVERY channel for the rest of the day, and
 * the only signal used to be a per-message line buried in the Inbox — so a
 * business whose mail scope had expired burned its hundred actions on a single
 * failing thread by lunchtime and nobody knew until customers complained.
 * Deduped per organisation rather than per conversation: the fact is about the
 * business, and one alert a day is the useful number.
 */
export async function notifyBudgetSpent(admin: SupabaseClient, orgId: string, reason: string): Promise<void> {
  try {
    const { data: admins } = await admin
      .from("organization_memberships")
      .select("user_id")
      .eq("organization_id", orgId)
      .in("role", ["owner", "admin"]);
    const recipients = ((admins as Json[] | null) ?? []).map((m) => String(m.user_id));
    if (recipients.length === 0) return;
    const link = `/dashboard/businesses/${orgId}/ops/agent/operator`;
    const since = new Date(Date.now() - BUDGET_ALERT_DEDUPE_MS).toISOString();
    const { data: recent } = await admin
      .from("notifications")
      .select("user_id")
      .eq("link", link)
      .in("user_id", recipients)
      .gte("created_at", since);
    const told = new Set(((recent as Json[] | null) ?? []).map((r) => String(r.user_id)));
    const targets = recipients.filter((u) => !told.has(u));
    if (targets.length === 0) return;
    await admin.from("notifications").insert(
      targets.map((user_id) => ({
        user_id,
        title: "The agent has stopped answering for today",
        body: `No more automatic replies will go out until tomorrow: ${reason}. Answer waiting customers yourself, or raise the limit in the agent's settings.`.slice(0, 400),
        // 'ai' — notifications.kind is CHECK-constrained to
        // ('info','invite','billing','network','ai') by 0005, and this is the
        // agent reporting on itself. No migration is needed to say so.
        kind: "ai",
        link,
      })),
    );
  } catch (e) {
    console.warn("[phoxta] budget alert skipped:", String((e as Error)?.message || e));
  }
}

/* orgMemberEmails lived here.
 *
 * It resolved every member's login address through the auth Admin API so that
 * staff mail could be classified as "our own". Removed with its only caller:
 * a member's login address is a PERSON, not one of the business's sending
 * identities, and treating it as one settled real customer mail forever. It
 * also cost up to a hundred Admin API calls on email-inbound's synchronous
 * webhook path, with the provider holding the request open. See selfAddresses
 * below for the reasoning. */

/**
 * The addresses the BUSINESS ITSELF sends from — the identities the agent's own
 * outbound can arrive back under. Mail from one of these is our own message
 * coming home (a forwarding rule that copies our outbound to the inbound-parse
 * address is exactly this shape), and answering it is a loop.
 *
 * A MEMBER'S LOGIN ADDRESS IS NOT ONE OF THESE, and used to be. That was wrong
 * in two directions and it buried real mail:
 *
 *   - It is a PERSON, not the business. The agent has never sent from it, so it
 *     cannot be the agent hearing itself. The loop this guards against is the
 *     mailbox, and the mailbox is already here.
 *   - Every customer who happens to hold an account on this platform, and every
 *     owner testing by mailing their own business, matched it — and the verdict
 *     is DEFINITIVE, so the message was settled forever: never answered, never
 *     retried, and in the Inbox under the baffling line "sent from this
 *     business's own address" about a mail from a customer.
 *
 * Staff mailing their own support address is now answered like anything else,
 * which is right: it is a real message, and a colleague taking a thread over is
 * a human-takeover question (ai_paused, and a human reply row) rather than
 * something for the robot classifier to decide.
 */
export async function selfAddresses(admin: SupabaseClient, orgId: string, mailbox: string): Promise<string[]> {
  const out = new Set<string>();
  if (mailbox && mailbox.includes("@")) out.add(mailbox.trim().toLowerCase());
  try {
    const { data } = await admin.from("organizations").select("billing_email").eq("id", orgId).maybeSingle();
    const billing = String((data as Json)?.billing_email ?? "").trim().toLowerCase();
    if (billing.includes("@")) out.add(billing);
  } catch { /* the mailbox still stands, and it is the one that matters */ }
  return [...out];
}

// ---------------------------------------------------------------------------
// THE FUNNEL.
//
// autoReplyAllowed is the cheap pre-flight a transport runs BEFORE spending a
// model turn. deliverAutoReply is the only way an automatic reply is actually
// sent, and it runs the same gates again — so a transport that forgets the
// pre-flight loses money, not a customer, and a transport that skips the gates
// entirely cannot send at all.
// ---------------------------------------------------------------------------

export type AutoReplyDecision =
  | { ok: true; mode: AutoReplyMode }
  | { ok: false; reason: string; retryable: boolean; needsHuman: boolean };

export async function autoReplyAllowed(
  admin: SupabaseClient,
  orgId: string,
  o: {
    /** Absent for a channel with no thread yet (a first web-chat turn). */
    conversationId?: string | null;
    channel: string;
    /** Pre-resolved once per org by a batch worker; looked up otherwise. */
    mode?: AutoReplyMode;
    /** The agent row for the turn being sent right now — never counted. */
    exceptMessageId?: string | null;
    /**
     * How the reply would physically leave, when the caller knows.
     *
     * `ownTransport` means the caller pushes the reply out itself, inside the
     * channel's own connection — a post back to the Chatwoot conversation — so
     * the identity is already the right one and no platform sender is involved.
     * `smsFrom` is the tenant's own number when it has already been resolved
     * (twilio-inbound holds it: it is the signature-proven `To` of the message
     * being answered). Absent both, a texting reply would have to go out through
     * the shared platform number, and that is refused: see
     * TENANT_SENDER_MISSING.
     */
    outbound?: { ownTransport?: boolean; smsFrom?: string };
  },
): Promise<AutoReplyDecision> {
  const mode = o.mode ?? (await autoReplyMode(admin, orgId));
  if (mode !== "auto") {
    return { ok: false, reason: modeReason(mode), retryable: true, needsHuman: mode === "approve" };
  }
  if (o.conversationId) {
    const gate = await threadReplyGate(admin, orgId, o.conversationId, {
      channel: o.channel,
      exceptMessageId: o.exceptMessageId ?? null,
    });
    if (!gate.ok) return { ok: false, reason: gate.reason, retryable: gate.retryable, needsHuman: false };
  }
  // WHOSE NUMBER WOULD THIS COME FROM? Refused, not degraded — a text sent from
  // the wrong company is worse than a text not sent. Not retryable, because the
  // number is not going to appear on a thread that never carried one, and a
  // retryable refusal here would re-compose a full model turn every five minutes
  // for the whole catch-up window. A person is told instead.
  if ((o.channel === "sms" || o.channel === "whatsapp") && o.outbound?.ownTransport !== true) {
    const from = String(o.outbound?.smsFrom ?? "").trim() ||
      (o.conversationId ? await tenantSmsFrom(admin, orgId, o.conversationId, o.channel) : "");
    if (!from) return { ok: false, reason: TENANT_SENDER_MISSING, retryable: false, needsHuman: true };
  }
  if (await orgHourlyThrottled(admin, orgId)) {
    return { ok: false, reason: "this business is over its hourly message limit", retryable: true, needsHuman: false };
  }
  // The daily cap, READ ONLY, as part of the cheap pre-flight. It used to be
  // reachable only from inside deliverAutoReply — i.e. only after a full
  // tool-using model turn had run and an agent row had been written — so an org
  // past its ceiling paid for roughly 600 wasted turns between mid-afternoon and
  // midnight, and every one of those dead rows also counted toward the
  // per-thread ceiling. The authoritative claim still happens at send time.
  const budget = await autoReplyBudgetOk(admin, orgId, o.channel);
  if (!budget.ok) return { ok: false, reason: budget.reason, retryable: budget.retryable, needsHuman: false };
  return { ok: true, mode };
}

export type AutoReplySend = {
  /** email | sms | whatsapp. Anything else has no outbound leg here. */
  channel: string;
  trigger: AutoReplyTrigger;
  conversationId: string;
  /** Address or phone number. */
  to: string;
  text: string;
  /** The outbound subject. Defaults to `Re: <inboundSubject>`. */
  subject?: string;
  /** What the customer wrote, for the audit line. */
  inboundSubject?: string;
  /** The agent's reply row — stamped with what happened on the wire. */
  agentMessageId?: string | null;
  /** The customer's row — where a refusal is recorded for the Inbox to show. */
  customerMessageId?: string | null;
  customerMeta?: Json;
  template?: { id: string; title: string } | null;
  mode?: AutoReplyMode;
  /** Known threading keys, when the caller is holding the inbound message. */
  thread?: Partial<ThreadContext>;
  /** Extra meta to merge onto the agent row alongside the delivery status. */
  stampExtra?: Json;
  /** The business's OWN texting number for this thread, when the caller already
   *  holds it. Resolved from the thread when absent; a texting send with neither
   *  is refused rather than sent from the shared platform number. */
  smsFrom?: string;
  /**
   * A picture the agent deliberately chose to show this customer.
   *
   * respondCore has always returned `media` and, until now, only the web chat
   * widget read it — so an agent that decided a photograph of the part, the menu
   * or the price list was the answer had no way to send one over WhatsApp. It
   * comes through the funnel rather than round it because attaching a picture is
   * a send like any other: it is metered, it is capped, and a bad attachment
   * fails the WHOLE message rather than just the attachment.
   *
   * At most ONE travels. WhatsApp carries one image per message, and an agent
   * that attaches a gallery to a text reply is decorating, not answering.
   */
  media?: OutboundMedia[];
  /**
   * The transport, when the CALLER owns it.
   *
   * One channel still pushes its own reply out rather than through a provider
   * API this file knows: Chatwoot, where it is a post back to the Chatwoot
   * conversation. It used to answer straight out of agent-inbound's JSON and
   * never met this file at all — no per-thread ceiling, no burst window, no
   * daily cap, no audit line.
   *
   * It is called ONLY after every gate has passed and the budget has been
   * claimed. Supplying it does not skip anything; it replaces the last step.
   * It also opts OUT of the WhatsApp 24-hour handling below, because a Chatwoot
   * inbox has its own WhatsApp connection and polices its own window.
   */
  transport?: () => Promise<SendOutcome>;
};

export type AutoReplyOutcome =
  | { sent: true; outcome: SendOutcome }
  | { sent: false; reason: string; retryable: boolean; needsHuman: boolean; outcome?: SendOutcome };

/** How many wire failures in a row before a message stops being retried and is
 *  handed to a person. Each retry costs a full model turn AND one of the org's
 *  hundred daily actions, so an unbounded retry on one broken thread silences
 *  every other channel by mid-afternoon. */
const MAX_SEND_FAILURES = num("AUTO_REPLY_MAX_SEND_FAILURES", 3);

/** How many times this exact message has already failed on the wire. Read from
 *  the row rather than from the caller's `customerMeta`, because most callers
 *  build that object fresh per request and would reset the count every time. */
async function priorSendFailures(admin: SupabaseClient, orgId: string, messageRowId: string): Promise<number> {
  const { data } = await admin
    .from("conversation_messages")
    .select("meta")
    .eq("id", messageRowId)
    .eq("organization_id", orgId)
    .maybeSingle();
  const n = Number(((data as Json)?.meta?.auto_reply?.send_failures) ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * What a Twilio error code MEANS, in the owner's own words, and whether trying
 * again could ever help.
 *
 * One table for both halves of the send, because they are the same question
 * asked twice. The REST call answers a handful of these immediately (a number
 * Twilio will not dial, a template rejected outright); the rest — carrier spam
 * filtering, an unreachable handset, a landline, WhatsApp's window — arrive
 * minutes later on the StatusCallback, which is what twilio-status feeds back
 * through here.
 *
 * Deliberately short of exhaustive. An unlisted code is treated as a transient
 * wire failure and stays retryable, which is the safer default for a customer
 * who is waiting; inventing meanings for codes we have not verified would put
 * fiction on a business's own message thread.
 */
export type TwilioFailure = { words: string; permanent: boolean };

export function twilioFailure(code: number | undefined, channel: string): TwilioFailure | null {
  const permanent = (words: string): TwilioFailure => ({ words, permanent: true });
  const transient = (words: string): TwilioFailure => ({ words, permanent: false });
  switch (code) {
    // ── The window, and consent ──────────────────────────────────────────────
    case 63016:
      return permanent(
        channel === "whatsapp"
          ? "WhatsApp refused it: more than 24 hours had passed since the customer's last message, so only an approved template can be sent"
          : "the message was refused as outside the messaging window",
      );
    case 21610:
      return permanent("this customer has replied STOP, so we are not allowed to text them again");
    case 21408:
    case 21606:
      return permanent("this Twilio number cannot send to that country or that destination");

    // ── Reported LATE, on the message resource. Every one of these used to be
    //    invisible: the row said 'sent' and the customer had nothing. ─────────
    case 30003:
      return permanent("the handset could not be reached, so it may be switched off, out of coverage or no longer in service");
    case 30004:
      return permanent("the carrier has blocked messages to this number");
    case 30005:
      return permanent("that number is not a working mobile number");
    case 30006:
      return permanent("that is a landline, or a carrier that cannot receive text messages");
    case 30007:
      return permanent(
        "the mobile carrier filtered it as spam, so it never reached the customer. Rewording the reply, or registering this number for business messaging, is what fixes that",
      );
    case 30002:
      return permanent("the Twilio account is suspended, so nothing can be sent until that is resolved");
    case 63003:
      return permanent("that number is not reachable on WhatsApp");
    case 63024:
      return permanent("WhatsApp rejected the message as invalid");
    case 30001:
      return transient("Twilio's queue for this number overflowed");
    case 30008:
      return transient("the carrier reported an unknown delivery error");

    // ── The picture, specifically ────────────────────────────────────────────
    case 11751:
      return permanent("the picture was larger than the carrier would accept, so the message could not be delivered");
    case 12300:
      return permanent("the picture was not a file type the carrier would accept");
    default:
      return null;
  }
}

/** What actually happened to the picture the agent chose. Recorded on the
 *  agent's own row so the Inbox can show the owner exactly what their customer
 *  received — the picture itself, or the link that went instead of it. */
export type MediaOutcome =
  | { kind: "attached"; url: string; alt: string; contentType: string; bytes: number }
  | { kind: "linked"; url: string; alt: string; why: string }
  | { kind: "none" };

async function transportSend(
  admin: SupabaseClient,
  orgId: string,
  o: AutoReplySend,
  /** Set when WhatsApp's window has closed and one of the business's own
   *  approved templates is going out in place of the composed reply. */
  waTemplate: WhatsappTemplateSend | null = null,
  /** Already decided by deliverAutoReply, because the decision needs the
   *  channel, the window and a network check — none of which belong inside a
   *  function whose job is to put bytes on a wire. */
  media: MediaOutcome = { kind: "none" },
): Promise<SendOutcome> {
  if (o.transport) {
    try {
      return await o.transport();
    } catch (e) {
      return { ok: false, provider: "caller", id: "", status: "failed", error: String((e as Error)?.message || e) };
    }
  }
  // The picture as a link in the words, for every route where it cannot be
  // attached: all of SMS, the WhatsApp cases the check refused, and email.
  const text = media.kind === "linked" ? withMediaLink(o.text, { url: media.url, alt: media.alt }) : o.text;

  if (o.channel === "sms" || o.channel === "whatsapp") {
    // The last line of defence on the identity gate. deliverAutoReply resolves
    // the tenant's own number and refuses before spending anything; if a future
    // caller reaches here without one, it still must not borrow the platform's.
    const from = String(o.smsFrom ?? "").trim();
    if (!from) return { ok: false, provider: "twilio", id: "", status: "failed", error: TENANT_SENDER_MISSING };
    // Twilio's real verdict arrives minutes later, on this URL. Without it a
    // carrier-filtered reply reads as delivered for ever — see twilio-status.
    const statusCallback = twilioStatusCallback({
      orgId,
      messageId: o.agentMessageId ?? null,
      customerMessageId: o.customerMessageId ?? null,
      channel: o.channel,
    });
    const r = waTemplate
      ? await twilioSend(o.channel, o.to, waTemplate.rendered, {
        from,
        contentSid: waTemplate.contentSid,
        contentVariables: waTemplate.variables,
        statusCallback,
      })
      : await twilioSend(o.channel, o.to, text, {
        from,
        statusCallback,
        ...(media.kind === "attached" ? { mediaUrls: [media.url] } : {}),
      });
    const failure = r.ok ? null : twilioFailure(r.errorCode, o.channel);
    return {
      ok: r.ok,
      provider: waTemplate ? "twilio_template" : "twilio",
      id: r.sid ?? "",
      status: r.status === "dialing" ? "sent" : r.status,
      error: failure?.words ?? r.errorMessage,
      ...(failure?.permanent ? { permanent: true } : {}),
    };
  }
  const r = await sendConversationEmail(admin, orgId, {
    conversationId: o.conversationId,
    to: o.to,
    // Undefined on purpose when the caller has no subject of its own:
    // sendConversationEmail then uses the THREAD's subject, so a customer whose
    // thread is "Order #4471 — wrong size delivered" does not get "Re: your
    // message" back.
    subject: o.subject,
    text,
    autoReplied: true,
    thread: o.thread,
  });
  return { ok: r.ok, provider: r.provider, id: r.id, status: r.status, error: r.error, threadId: r.threadId };
}

/**
 * Can the picture the agent chose actually travel on this channel — and if not,
 * what is the honest thing to do with it?
 *
 * Decided BEFORE the budget is claimed and before anything is sent, because on
 * WhatsApp a URL Twilio cannot fetch fails the WHOLE message: the customer gets
 * no picture AND no words. Three outcomes, and every one of them still delivers
 * the reply:
 *
 *   attached  WhatsApp, inside the window, and the file passed every check.
 *   linked    everything else. On SMS always, because MMS is a US/Canada-only
 *             product on Twilio and promising an attachment on a channel that
 *             reaches the rest of the world would be a promise we cannot keep;
 *             on email, which composes its own body elsewhere; and on any
 *             WhatsApp send where the file itself was refused.
 *   none      no picture was chosen.
 */
async function decideMedia(o: AutoReplySend, windowOpen: boolean): Promise<MediaOutcome> {
  // A caller that owns its own transport (the Chatwoot post) sends whatever it
  // sends; deciding anything about a picture here would put a claim on the row
  // that this file cannot make good on.
  if (o.transport) return { kind: "none" };
  const first = (o.media ?? []).find((m) => String(m?.url ?? "").trim());
  if (!first) return { kind: "none" };
  const url = String(first.url).trim();
  const alt = String(first.alt ?? "").trim();

  if (o.channel === "sms") {
    return { kind: "linked", url, alt, why: "MMS only works for US and Canadian numbers on this account, so the picture went as a link" };
  }
  if (o.channel !== "whatsapp") {
    return { kind: "linked", url, alt, why: "this channel does not carry attachments from the agent, so the picture went as a link" };
  }
  if (!windowOpen) {
    // Never reached: deliverAutoReply refuses a media reply outright once the
    // window has shut, because the account's approved templates are text-only.
    // Kept as the honest fallback rather than a silent attach.
    return { kind: "linked", url, alt, why: "WhatsApp's 24-hour window had closed, so the picture could not be attached" };
  }
  const verdict: MediaVerdict = await checkWhatsappImage({ url, alt });
  if (verdict.ok) {
    return { kind: "attached", url: verdict.url, alt: verdict.alt, contentType: verdict.contentType, bytes: verdict.bytes };
  }
  console.warn(`[phoxta] picture not attached to a WhatsApp reply: ${verdict.reason} (${url})`);
  return { kind: "linked", url, alt, why: verdict.reason };
}

/**
 * THE ONE WAY an automatic reply leaves the building.
 *
 * Runs every gate, claims the budget, sends on the channel the message arrived
 * on, stamps the agent's row with the delivery status (so a reply that failed
 * reads as failed in the Inbox instead of looking sent), records the reason on
 * the customer's row when nothing went out, and writes the audit line either
 * way. Callers decide WHAT to say; they do not decide whether they may say it.
 */
export async function deliverAutoReply(
  admin: SupabaseClient,
  orgId: string,
  o: AutoReplySend,
): Promise<AutoReplyOutcome> {
  // Left undefined when the caller knows no subject: the transport falls back to
  // the thread's own, which is what the customer expects to see come back.
  const subject = o.subject ?? (o.inboundSubject ? replySubject(o.inboundSubject) : undefined);

  const refuse = async (
    reason: string,
    retryable: boolean,
    needsHuman: boolean,
    audit: boolean,
  ): Promise<AutoReplyOutcome> => {
    if (o.customerMessageId) {
      await markNotAnswered(admin, orgId, o.customerMessageId, o.customerMeta ?? {}, reason, retryable);
    }
    // A composed reply that is then refused must not sit in the Inbox looking
    // like something the customer received.
    if (o.agentMessageId) {
      await stampDelivery(
        admin,
        orgId,
        o.agentMessageId,
        { ok: false, provider: "none", id: "", status: "failed", error: reason },
        o.stampExtra ?? {},
      );
    }
    if (audit) {
      await auditAutoReply(admin, orgId, {
        status: "denied",
        channel: o.channel,
        trigger: o.trigger,
        conversationId: o.conversationId,
        to: o.to,
        subject,
        reason,
        messageId: o.agentMessageId ?? null,
        summary: `Did not answer ${o.to}: ${reason}.`,
      });
    }
    if (needsHuman) await notifyNeedsHuman(admin, orgId, o.conversationId, `${o.to}: ${o.inboundSubject ?? o.text}`);
    return { sent: false, reason, retryable, needsHuman };
  };

  // WHOSE NUMBER. Resolved once, before the gate, so the pre-flight refuses on
  // exactly what the send would use — the caller's own value first (for a live
  // inbound text that is the signature-proven `To` of the message being
  // answered), the thread's recorded number otherwise. A caller that owns its
  // own transport (the Chatwoot post) needs none: its reply leaves on the
  // identity the message arrived on by construction.
  let smsFrom = "";
  if (!o.transport && (o.channel === "sms" || o.channel === "whatsapp")) {
    smsFrom = String(o.smsFrom ?? "").trim() ||
      (await tenantSmsFrom(admin, orgId, o.conversationId, o.channel));
  }

  const gate = await autoReplyAllowed(admin, orgId, {
    conversationId: o.conversationId,
    channel: o.channel,
    mode: o.mode,
    exceptMessageId: o.agentMessageId ?? null,
    outbound: { ownTransport: !!o.transport, smsFrom },
  });
  // A refusal that needs a person is AUDITED: "the agent could not answer this
  // text because the business has no number on the thread" is an operational
  // fact, not a routine ceiling, and it must be answerable without database
  // access.
  if (!gate.ok) return refuse(gate.reason, gate.retryable, gate.needsHuman, gate.needsHuman);

  // --- WHATSAPP'S 24-HOUR RULE. Decided BEFORE the budget is claimed, so a
  //     refusal here costs the business nothing. Skipped when the caller owns
  //     its own transport: a Chatwoot reply goes out through Chatwoot's own
  //     WhatsApp connection, which polices its own window. ---
  let waTemplate: WhatsappTemplateSend | null = null;
  let waClosedFor = "";
  let waWindowOpen = true;
  const chosenPicture = (o.media ?? []).find((m) => String(m?.url ?? "").trim());
  if (o.channel === "whatsapp" && !o.transport) {
    const win = await whatsappWindow(admin, orgId, o.conversationId);
    waWindowOpen = win.open;
    if (!win.open) {
      waClosedFor = win.lastInboundAt ? agoInWords(Date.now() - win.lastInboundAt) : "";
      const lastWrote = waClosedFor ? `they last wrote ${waClosedFor}` : "they have never written on this thread";
      // A PICTURE CANNOT GO TO A COLD CONTACT, AND SAYING SO IS THE ONLY HONEST
      // OPTION. Outside the window WhatsApp accepts nothing but an approved
      // template, and a template can only carry media if it was APPROVED with a
      // media header — every template on this account is text-only. The agent
      // attached a picture because the picture is the answer, so substituting a
      // text template would send the customer a message that is not the answer
      // and quietly drop the part that was. A person is told instead.
      if (chosenPicture) {
        return refuse(
          `the agent's answer was a picture, and WhatsApp only allows an approved template more than 24 hours after a customer's last ` +
            `message — ${lastWrote}. This business's approved templates carry text only, so the picture could not be sent and nothing ` +
            `was: a person needs to pick this up`,
          false,
          true,
          true,
        );
      }
      waTemplate = await pickWhatsappTemplate(admin, orgId, {
        reply: o.text,
        customerMessage: win.lastInboundText,
        customerName: await customerNameFor(admin, orgId, o.conversationId),
      });
      if (!waTemplate) {
        // NOT retryable: the window only ever gets further away, and a retryable
        // refusal here would re-compose a full model turn every five minutes
        // until midnight. A person is told instead — they can send an approved
        // template from the Inbox, where they fill its blanks themselves.
        return refuse(
          `WhatsApp only allows a free-text reply within 24 hours of the customer's last message and ${lastWrote}, ` +
            `and none of this business's approved WhatsApp templates fits this reply — nothing was sent, and a person needs to pick it up`,
          false,
          true,
          true,
        );
      }
    }
  }

  // The authoritative daily ceiling — an increment and a check in one statement,
  // so two ticks cannot both pass it with one action left. autoReplyAllowed has
  // already read the same budget, which is what makes this the rare case rather
  // than the routine one.
  const budget = await autoReplyBudgetClaim(admin, orgId, o.channel);
  if (!budget.ok) {
    // The business has gone quiet on EVERY channel for the rest of the day and
    // the only signal used to be one line per message inside the Inbox. Tell the
    // owner, once (notifyBudgetSpent dedupes per organisation).
    await notifyBudgetSpent(admin, orgId, budget.reason);
    return refuse(budget.reason, budget.retryable, false, true);
  }

  // THE PICTURE, CHECKED BEFORE ANYTHING IS SENT. On WhatsApp a URL Twilio
  // cannot fetch fails the whole message, so a file that is the wrong type, too
  // large or unreachable becomes a link in the words rather than an attachment
  // that would cost the customer the reply as well.
  const media = await decideMedia(o, waWindowOpen);
  const outcome = await transportSend(admin, orgId, { ...o, subject, smsFrom }, waTemplate, media);

  // What actually went on the wire, when it was not what the agent composed.
  // Recorded on the agent's own row so the Inbox never shows a reply as
  // delivered when a template went out in its place.
  const waStamp = waTemplate && outcome.ok
    ? {
      whatsapp: {
        window: "closed",
        customer_last_wrote: waClosedFor || "unknown",
        template: { id: waTemplate.id, title: waTemplate.title, content_sid: waTemplate.contentSid, chosen_because: waTemplate.because },
        sent_text: waTemplate.rendered,
      },
    }
    : {};

  // WHAT THE CUSTOMER ACTUALLY SAW. `media` is what the Inbox renders inside the
  // agent's own bubble, so an owner can look at the thread and see the picture
  // their customer received; `media_link` says the picture went as a link and
  // why, which is the answer to "it said it was attaching a photo — where is it?"
  const mediaStamp = media.kind === "attached"
    ? { media: [{ type: "image", url: media.url, alt: media.alt }], media_delivery: { attached: true, bytes: media.bytes, content_type: media.contentType } }
    : media.kind === "linked"
      ? { media: [{ type: "image", url: media.url, alt: media.alt }], media_delivery: { attached: false, reason: media.why } }
      : {};

  // False when Twilio's own delivery callback beat this write and reported the
  // message as never having arrived. The send believes it succeeded; the carrier
  // says otherwise, and the carrier is right — so the customer's row below is
  // left exactly as twilio-status left it rather than being stamped answered.
  let recordedAsSent = true;
  if (o.agentMessageId) {
    recordedAsSent = await stampDelivery(admin, orgId, o.agentMessageId, outcome, {
      ...(o.stampExtra ?? {}),
      ...(o.channel === "email" && subject ? { subject } : {}),
      ...(outcome.threadId ? { gmail_thread_id: outcome.threadId } : {}),
      ...waStamp,
      ...(outcome.ok ? mediaStamp : {}),
    });
  }

  // A note on the thread when the picture could not be attached. The customer
  // got the reply and the link, so nobody needs alerting — but the owner opening
  // the conversation should be able to see, in words, why a photograph they can
  // see in their own library arrived as a URL.
  if (media.kind === "linked" && outcome.ok && o.channel !== "email") {
    const { error: linkNoteErr } = await admin.from("conversation_messages").insert({
      organization_id: orgId,
      conversation_id: o.conversationId,
      role: "note",
      channel_type: o.channel,
      body:
        `The agent chose to show this customer "${media.alt || "a picture"}", but it could not be attached: ${media.why}. ` +
        `The reply went out with a link to it instead, so they can still see it.`,
      provider_sid: "",
      meta: { source: "auto-reply", media_link: media.url },
    });
    if (linkNoteErr) console.error("[phoxta] could not note the picture fallback:", linkNoteErr.message);
  }

  // A note on the thread, in plain words, when a template was sent instead of
  // the answer. It is not a notification: the customer DID hear from the
  // business, and the one person who needs the detail is whoever opens the
  // conversation — which is exactly where a note lives.
  if (waTemplate && outcome.ok) {
    const { error: noteErr } = await admin.from("conversation_messages").insert({
      organization_id: orgId,
      conversation_id: o.conversationId,
      role: "note",
      channel_type: o.channel,
      body:
        `WhatsApp only allows a free-text reply within 24 hours of a customer's last message, and this customer last wrote ` +
        `${waClosedFor || "more than a day ago"}. The agent's reply above could not be sent as written, so your approved template ` +
        `"${waTemplate.title}" went out instead: "${waTemplate.rendered}". As soon as they reply, the 24 hours restart and the ` +
        `agent can answer them in full.`,
      provider_sid: "",
      meta: { source: "auto-reply", whatsapp_template: waTemplate.title },
    });
    if (noteErr) console.error("[phoxta] could not note the WhatsApp template substitution:", noteErr.message);
  }

  // THE CARRIER HAS ALREADY RULED ON THIS ONE.
  //
  // `recordedAsSent` is false only when Twilio's own delivery callback beat this
  // code and reported that the message never arrived. twilio-status has already
  // put the carrier's reason back on the customer's row and re-queued it, so
  // every branch below would be writing over a better answer: `answered: true`
  // would settle it forever for a reply nobody received, and the failure
  // branches would count a send failure the send itself did not have.
  const carrierAlreadyRuled = outcome.ok && !recordedAsSent;

  if (o.customerMessageId && !carrierAlreadyRuled) {
    if (outcome.ok) {
      const clean = { ...((o.customerMeta ?? {}) as Json) };
      delete clean.auto_reply;
      await admin
        .from("conversation_messages")
        .update({
          meta: {
            ...clean,
            auto_reply: {
              answered: true,
              at: new Date().toISOString(),
              // Answered, but not in the agent's own words — so the row says which
              // approved template the customer actually received.
              ...(waTemplate ? { via_whatsapp_template: waTemplate.title } : {}),
            },
          },
        })
        .eq("id", o.customerMessageId)
        .eq("organization_id", orgId);
    } else if (outcome.permanent) {
      // A refusal a retry cannot fix (the customer replied STOP; WhatsApp's
      // window shut between the check above and the send). Settled for the
      // machine, handed to a person — not left to burn a model turn every five
      // minutes until midnight.
      await markNotAnswered(
        admin,
        orgId,
        o.customerMessageId,
        o.customerMeta ?? {},
        `the reply could not be sent: ${outcome.error ?? "unknown error"} — it needs a person`,
        false,
      );
      await notifyNeedsHuman(admin, orgId, o.conversationId, `${o.to}: ${o.inboundSubject ?? o.text}`);
    } else {
      // The send is what failed, not the decision — so this stays retryable and
      // agent-catchup picks the message up again rather than losing it.
      //
      // BUT NOT FOREVER. A thread that fails every time (an expired Gmail send
      // scope, a number the carrier rejects) re-entered the queue on every
      // five-minute tick: twelve model turns and twelve CLAIMED daily actions an
      // hour, per stuck thread, until the org's whole 100-action budget was gone
      // and every working channel went quiet too. After a few consecutive
      // failures the message is handed to a person instead — the send is not
      // going to start working on the next tick, and a human replying is the
      // outcome that actually helps the customer.
      const failures = (await priorSendFailures(admin, orgId, o.customerMessageId)) + 1;
      const giveUp = failures >= MAX_SEND_FAILURES;
      const why = `the reply could not be sent: ${outcome.error ?? "unknown error"}`;
      await markNotAnswered(
        admin,
        orgId,
        o.customerMessageId,
        o.customerMeta ?? {},
        giveUp ? `${why} (tried ${failures} times — it needs a person to reply)` : why,
        !giveUp,
        { send_failures: failures },
      );
      if (giveUp) {
        await notifyNeedsHuman(admin, orgId, o.conversationId, `${o.to}: ${o.inboundSubject ?? o.text}`);
      }
    }
  }

  await auditAutoReply(admin, orgId, {
    status: outcome.ok ? "ok" : "error",
    channel: o.channel,
    trigger: o.trigger,
    conversationId: o.conversationId,
    to: o.to,
    subject,
    template: o.template ?? null,
    provider: outcome.provider,
    providerSid: outcome.id,
    threadId: outcome.threadId ?? String(o.thread?.threadId ?? ""),
    inReplyTo: String(o.thread?.messageId ?? ""),
    messageId: o.agentMessageId ?? null,
    reason: outcome.error,
    summary: outcome.ok
      ? waTemplate
        ? `Sent ${o.to} the approved WhatsApp template "${waTemplate.title}" — they last wrote ${waClosedFor || "more than a day ago"}, so a free-text reply could not be delivered (chosen because ${waTemplate.because}).`
        : `Answered ${o.to}${o.inboundSubject ? ` about "${o.inboundSubject}"` : ""}${o.template ? ` — adapted from the saved reply "${o.template.title}"` : " (no saved reply matched)"}${
          media.kind === "attached"
            ? `, with the picture "${media.alt}" attached`
            : media.kind === "linked"
              ? `, with a link to "${media.alt || "a picture"}" because it could not be attached (${media.why})`
              : ""
        }.`
      : `Composed a reply to ${o.to} but could not send it: ${outcome.error ?? "unknown error"}.`,
  });

  // Twilio accepted this message and the carrier then said it never arrived, in
  // that order, inside this function's own lifetime. Reporting it to the caller
  // as sent would put a delivery in a worker's tally that never happened.
  if (carrierAlreadyRuled) {
    return {
      sent: false,
      reason: "the carrier reported that this reply never reached the customer",
      // twilio-status has already decided whether a retry could help and told a
      // person if one could not. Saying so again here would double both.
      retryable: false,
      needsHuman: false,
      outcome,
    };
  }
  if (outcome.ok) return { sent: true, outcome };
  return {
    sent: false,
    reason: `the reply could not be sent: ${outcome.error ?? "unknown error"}`,
    // A permanent refusal is not a queue position — see the customer-row branch
    // above. Callers that keep their own retry state must see the difference.
    retryable: outcome.permanent !== true,
    needsHuman: outcome.permanent === true,
    outcome,
  };
}

// ---------------------------------------------------------------------------
// WHAT TWILIO TELLS US AFTERWARDS.
//
// The REST API answers 201 `queued`. That is the ONLY thing the send above can
// know, and it is not delivery: the carrier filtering a message as spam (30007),
// a handset that cannot be reached (30003), a landline (30006) and WhatsApp's
// window having shut (63016) are all reported minutes later, on the message
// resource, and only to a StatusCallback.
//
// Without this, every one of those looked like a success. The agent's row said
// `sent`, the customer's row said `answered: true`, and agent-catchup treats
// answered:true as SETTLED FOREVER — so the one worker that exists to repair an
// unanswered message ruled it out permanently. The console showed a delivered
// reply the customer never received, and nothing retried.
//
// This is the correction, and it is deliberately the same shape as the failure
// branch of deliverAutoReply above: stamp the reply row with what really
// happened, put the reason back on the customer's row, count the failure, and
// decide honestly whether a retry could ever help or a person has to.
// ---------------------------------------------------------------------------

export type TwilioDeliveryReport = {
  /** Twilio's SID for the message WE sent. */
  sid: string;
  /** queued | sending | sent | delivered | undelivered | failed | read */
  status: string;
  errorCode?: number;
  channel: string;
  /** The row holding our message, named on the callback URL at send time. */
  messageId?: string;
  /** The customer's row, so a failure can be put back in the queue. */
  customerMessageId?: string;
};

/** How far through delivery a Twilio status is. A callback for `sent` can
 *  legitimately arrive AFTER the one for `delivered` — the two are separate HTTP
 *  requests over the public internet — so progress is compared rather than
 *  assumed, and a terminal failure is never overwritten by a stale success. */
const DELIVERY_RANK: Record<string, number> = {
  queued: 1,
  accepted: 1,
  scheduled: 1,
  sending: 2,
  sent: 3,
  delivered: 4,
  read: 5,
  undelivered: 9,
  failed: 9,
};

const isFailure = (status: string) => status === "failed" || status === "undelivered";

/** The column only accepts the six values 0040 declared, and `read` is not one
 *  of them. Mapping it to `delivered` keeps the tick right while the raw status
 *  is preserved in meta, so no migration has to land before this works. */
const deliveryColumn = (status: string): string => {
  if (isFailure(status)) return "failed";
  if (status === "read") return "delivered";
  if (status === "delivered") return "delivered";
  if (status === "sent") return "sent";
  return "queued";
};

/**
 * Apply one Twilio delivery report to the messages it concerns.
 *
 * Every query is org-scoped: the organisation is named on the callback URL, and
 * the URL is covered by the signature Twilio computes, so it cannot be moved to
 * another tenant by anyone without the account's auth token.
 */
export async function applyTwilioDeliveryUpdate(
  admin: SupabaseClient,
  orgId: string,
  r: TwilioDeliveryReport,
): Promise<{ applied: boolean; note: string }> {
  const status = String(r.status ?? "").trim().toLowerCase();
  if (!status) return { applied: false, note: "the callback carried no message status" };

  // The row we sent. Named on the URL for the agent's own replies (which is what
  // makes an early callback safe — the row is written before the send); found by
  // Twilio's SID for anything else, which is exactly what provider_sid holds and
  // what 0114's unique index makes a single row.
  const row = r.messageId
    ? (await admin
      .from("conversation_messages")
      .select("id, conversation_id, channel_type, body, role, delivery_status, meta")
      .eq("id", r.messageId)
      .eq("organization_id", orgId)
      .maybeSingle()).data
    : r.sid
      ? (await admin
        .from("conversation_messages")
        .select("id, conversation_id, channel_type, body, role, delivery_status, meta")
        .eq("organization_id", orgId)
        .eq("provider_sid", r.sid)
        .maybeSingle()).data
      : null;
  if (!row) {
    // Not an error. A callback can beat the row that records the send (a human's
    // reply in the Inbox is written after the send returns), and Twilio will send
    // the later ones anyway — including the one that matters, the failure.
    return { applied: false, note: `no message row yet for ${r.sid || r.messageId || "this callback"}` };
  }
  const m = row as Json;
  const meta = (m.meta ?? {}) as Json;
  const seen = String(meta?.delivery?.status ?? "");
  const rank = DELIVERY_RANK[status] ?? 0;
  const seenRank = DELIVERY_RANK[seen] ?? 0;
  // A message that has already been reported as not arriving is FINISHED here.
  // Nothing later resurrects it, and — just as important — a redelivered failure
  // callback must not count a second send failure against the customer's message
  // and hand it to a person over one carrier report.
  if (isFailure(seen)) {
    return { applied: false, note: `already recorded as ${seen}` };
  }
  // Never walk a message backwards: `sent` and `delivered` are separate HTTP
  // requests over the public internet and can arrive in either order.
  if (seen && !isFailure(status) && rank <= seenRank) {
    return { applied: false, note: `${status} is not newer than the recorded ${seen}` };
  }

  const channel = String(r.channel || m.channel_type || "sms");
  const failure = isFailure(status) ? (twilioFailure(r.errorCode, channel) ?? {
    words: `the carrier reported it as ${status}${r.errorCode ? ` (Twilio error ${r.errorCode})` : ""}`,
    permanent: false,
  }) : null;

  const { error: stampErr } = await admin
    .from("conversation_messages")
    .update({
      delivery_status: deliveryColumn(status),
      meta: {
        ...meta,
        delivery: {
          ...((meta.delivery ?? {}) as Json),
          provider: "twilio",
          status,
          at: new Date().toISOString(),
          ...(r.sid ? { sid: r.sid } : {}),
          ...(r.errorCode ? { code: r.errorCode } : {}),
          ...(failure ? { error: failure.words } : {}),
        },
      },
    })
    .eq("id", String(m.id))
    .eq("organization_id", orgId);
  if (stampErr) {
    console.error("[phoxta] could not record the Twilio delivery report:", stampErr.message);
    return { applied: false, note: stampErr.message };
  }
  if (!failure) return { applied: true, note: `recorded ${status}` };

  // --- IT DID NOT ARRIVE. Undo the optimism. ---
  const conversationId = String(m.conversation_id ?? "");
  let handedOver = false;
  if (r.customerMessageId) {
    // Read the row's CURRENT meta rather than rebuilding it: it carries
    // meta.twilio_to, the business's own number, and a retry that loses it can
    // never be sent as the right business again.
    const { data: cust } = await admin
      .from("conversation_messages")
      .select("meta, body")
      .eq("id", r.customerMessageId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (cust) {
      const custMeta = ((cust as Json).meta ?? {}) as Json;
      const failures = Number(custMeta?.auto_reply?.send_failures ?? 0) + 1;
      const giveUp = failure.permanent || failures >= MAX_SEND_FAILURES;
      handedOver = giveUp;
      await markNotAnswered(
        admin,
        orgId,
        String(r.customerMessageId),
        custMeta,
        giveUp
          ? `the reply was sent but never reached them: ${failure.words}. It needs a person to reply`
          : `the reply was sent but never reached them: ${failure.words}`,
        !giveUp,
        { send_failures: failures },
      );
      if (giveUp && conversationId) {
        await notifyNeedsHuman(admin, orgId, conversationId, String((cust as Json).body ?? "").slice(0, 140));
      }
    }
  } else if (conversationId && failure.permanent) {
    // A human's own reply, or a flow's, with no customer row to re-queue. The
    // person who wrote it still has to learn it never landed.
    await notifyNeedsHuman(admin, orgId, conversationId, `A reply to this customer was not delivered: ${failure.words}`);
    handedOver = true;
  }

  await auditAutoReply(admin, orgId, {
    status: "error",
    channel,
    trigger: "twilio-status",
    conversationId,
    to: "",
    provider: "twilio",
    providerSid: r.sid,
    messageId: String(m.id),
    reason: failure.words,
    summary: `Twilio reported the message as ${status}: ${failure.words}.${
      handedOver ? " Handed to a person." : " It stays in the queue and will be tried again."
    }`,
  });

  return { applied: true, note: `${status}: ${failure.words}` };
}
