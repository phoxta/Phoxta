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
// Two of those own their own last step — a TwiML reply rides back in Twilio's
// own webhook response, a Chatwoot reply is a post to Chatwoot — so they hand
// `transport` to deliverAutoReply and it calls them AFTER every gate has passed.
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
import { twilioSend } from "./dispatch.ts";
import { normalizeE164 } from "./telephony.ts";
import { replySubject } from "./mailText.ts";

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
const ROBOT_LABELS = new Set(["SPAM", "TRASH", "DRAFT", "SENT", "CATEGORY_FORUMS"]);

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

  const self = (p.selfAddresses ?? []).map((a) => String(a ?? "").trim().toLowerCase()).filter(Boolean);
  if (self.includes(from)) return sure("sent from this business's own address");

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

  const precedence = (h["precedence"] ?? "").trim().toLowerCase();
  if (["bulk", "list", "junk", "auto_reply"].includes(precedence)) return sure(`Precedence: ${precedence}`);

  for (const k of ["list-id", "list-unsubscribe", "list-post", "list-help", "list-subscribe"]) {
    if (h[k]) return sure("a mailing list (List-* headers)");
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

export async function orgHourlyThrottled(admin: SupabaseClient, orgId: string): Promise<boolean> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin
    .from("conversation_messages")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("role", "customer")
    .gte("created_at", since);
  return (count ?? 0) >= MAX_MSGS_PER_HOUR;
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
// account". twilio-inbound's LIVE reply is correct because it rides back as
// TwiML inside Twilio's own webhook response, which Twilio sends from the number
// the customer texted. Every OTHER texting send would go through the REST API
// from the platform number, and that is a cross-tenant identity failure with
// teeth: the customer of business A is answered from the PHOXTA number, and when
// they reply it hits the Phoxta platform line, whose webhook is
// twilio-inbound?key=<Phoxta's own agent key> — so Phoxta's agent opens a Phoxta
// conversation and answers another company's customer, as Phoxta, in thread.
//
// The tenant's own number IS knowable: it is the `To` on the inbound Twilio
// webhook, which twilio-inbound now records as meta.twilio_to on the customer's
// message. So a deferred or retried text is sent from the number it arrived on,
// and when no such number is on the thread the reply is REFUSED and left for a
// person. A message not sent beats a message sent from the wrong company.
// ---------------------------------------------------------------------------
export const TENANT_SENDER_MISSING =
  "this text can only be answered from the business's own number, and that number is not recorded on this conversation — a person needs to reply";

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
    const raw = String((r?.meta ?? {}).twilio_to ?? "").trim();
    if (!raw) continue;
    const e164 = normalizeE164(raw.replace(/^whatsapp:/i, ""));
    if (e164) return channel === "whatsapp" ? `whatsapp:${e164}` : e164;
  }
  return "";
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
};

/**
 * Write onto the agent's own message row what actually happened on the wire.
 *
 * respondCore records the reply but knows nothing about delivery, so until now
 * every AI email showed a blank delivery tick in the Inbox and a human could not
 * tell a sent reply from one that never left the building. `provider_sid` is the
 * provider's id for the message we SENT — for Gmail that is also the dedupe key
 * that stops the next sync ingesting our own reply as new mail.
 */
export async function stampDelivery(
  admin: SupabaseClient,
  orgId: string,
  messageRowId: string,
  sent: SendOutcome,
  extra: Json = {},
): Promise<void> {
  const { data } = await admin
    .from("conversation_messages")
    .select("meta")
    .eq("id", messageRowId)
    .eq("organization_id", orgId)
    .maybeSingle();
  const meta = ((data as Json)?.meta ?? {}) as Json;
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
  if (error) console.error("[phoxta] could not record delivery:", error.message);
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

/**
 * Every member of this business, with the address they actually log in with.
 *
 * Member emails are NOT in user_profiles — that table holds full_name, phone,
 * company and so on, and never had an email column (0001_tenancy.sql). The
 * address lives on auth.users, which PostgREST does not expose and which
 * organization_memberships has no embeddable relationship to. The query this
 * replaces, `.select("user_profiles(email)")`, therefore returned an ERROR that
 * was never thrown — only returned — so `data` was null, the loop body never
 * ran, and the caller silently got an empty list. Every consumer of it was inert.
 *
 * The service-role client can read auth.users through the Admin API, which is
 * how billing-alerts, stripe-checkout and automation-run already resolve an
 * owner's address. Bounded to 100 members, which no real business exceeds.
 *
 * LATENCY MATTERS HERE. selfAddresses runs on email-inbound's SYNCHRONOUS
 * webhook path — the provider is holding the request open waiting for a 200 —
 * and this used to be one sequential round trip per member, so a business with
 * thirty people added roughly thirty of them to every single inbound mail before
 * the classifier had even run. The calls are now issued in parallel batches, and
 * the answer is cached in the isolate for a few minutes: memberships change
 * rarely, and the worst case of a stale entry is that a staff member's mail is
 * classified as staff mail (or not) a few minutes late.
 */
const MEMBER_CACHE_MS = num("ORG_MEMBER_EMAIL_CACHE_SECONDS", 300) * 1000;
const MEMBER_LOOKUP_CONCURRENCY = 10;
const memberCache = new Map<string, { at: number; emails: string[] }>();

export async function orgMemberEmails(admin: SupabaseClient, orgId: string): Promise<string[]> {
  const cached = memberCache.get(orgId);
  if (cached && Date.now() - cached.at < MEMBER_CACHE_MS) return cached.emails;

  const out = new Set<string>();
  const { data, error } = await admin
    .from("organization_memberships")
    .select("user_id")
    .eq("organization_id", orgId)
    .limit(100);
  if (error) {
    // NOT cached: a transient failure must not blind the "is this our own staff?"
    // check for the next five minutes.
    console.warn("[phoxta] org members unreadable:", error.message);
    return [];
  }
  const ids = ((data as Json[] | null) ?? []).map((m) => String(m.user_id));
  for (let i = 0; i < ids.length; i += MEMBER_LOOKUP_CONCURRENCY) {
    const batch = ids.slice(i, i + MEMBER_LOOKUP_CONCURRENCY);
    const found = await Promise.all(batch.map(async (id) => {
      try {
        const { data: u } = await admin.auth.admin.getUserById(id);
        return String(u?.user?.email ?? "").trim().toLowerCase();
      } catch {
        return ""; // one unreadable member must not blind the whole check
      }
    }));
    for (const email of found) if (email.includes("@")) out.add(email);
  }
  const emails = [...out];
  memberCache.set(orgId, { at: Date.now(), emails });
  // The isolate is long-lived and serves every organisation on the platform.
  if (memberCache.size > 200) {
    for (const [k, v] of memberCache) if (Date.now() - v.at > MEMBER_CACHE_MS) memberCache.delete(k);
  }
  return emails;
}

/** Every address that belongs to the business itself — the connected mailbox,
 *  every member's login address and the billing address on the org record. Mail
 *  from any of them is staff mail, and the agent answering its own colleagues is
 *  both useless and a loop risk (a forwarding rule that copies our own outbound
 *  back to the inbound-parse address is exactly this shape). */
export async function selfAddresses(admin: SupabaseClient, orgId: string, mailbox: string): Promise<string[]> {
  const out = new Set<string>();
  if (mailbox && mailbox.includes("@")) out.add(mailbox.trim().toLowerCase());
  for (const e of await orgMemberEmails(admin, orgId)) out.add(e);
  try {
    const { data } = await admin.from("organizations").select("billing_email").eq("id", orgId).maybeSingle();
    const billing = String((data as Json)?.billing_email ?? "").trim().toLowerCase();
    if (billing.includes("@")) out.add(billing);
  } catch { /* the rest of the list still stands */ }
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
     * `ownTransport` means the caller replies inside the channel's own inbound
     * request — TwiML in Twilio's webhook response, a post back to the Chatwoot
     * conversation — so the identity is already the right one and no platform
     * sender is involved. `smsFrom` is the tenant's own number when it has
     * already been resolved. Absent both, a texting reply would have to go out
     * through the shared platform number, and that is refused: see
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
   * The transport, when the CALLER owns it.
   *
   * Two channels reply inside the HTTP request the customer's message arrived
   * on rather than through an outbound API: Twilio, where the reply is TwiML in
   * the webhook's own response (which is also what keeps a tenant's reply coming
   * from the number the customer texted, instead of the platform's TWILIO_FROM),
   * and Chatwoot, where it is a post back to the Chatwoot conversation. Before
   * this, those two answered straight out of agent-inbound's JSON and never met
   * this file at all — no per-thread ceiling, no burst window, no daily cap, no
   * audit line.
   *
   * It is called ONLY after every gate has passed and the budget has been
   * claimed. Supplying it does not skip anything; it replaces the last step.
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

async function transportSend(admin: SupabaseClient, orgId: string, o: AutoReplySend): Promise<SendOutcome> {
  if (o.transport) {
    try {
      return await o.transport();
    } catch (e) {
      return { ok: false, provider: "caller", id: "", status: "failed", error: String((e as Error)?.message || e) };
    }
  }
  if (o.channel === "sms" || o.channel === "whatsapp") {
    // The last line of defence on the identity gate. deliverAutoReply resolves
    // the tenant's own number and refuses before spending anything; if a future
    // caller reaches here without one, it still must not borrow the platform's.
    const from = String(o.smsFrom ?? "").trim();
    if (!from) return { ok: false, provider: "twilio", id: "", status: "failed", error: TENANT_SENDER_MISSING };
    const r = await twilioSend(o.channel, o.to, o.text, { from });
    return {
      ok: r.ok,
      provider: "twilio",
      id: r.sid ?? "",
      status: r.status === "dialing" ? "sent" : r.status,
      error: r.errorMessage,
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
    text: o.text,
    autoReplied: true,
    thread: o.thread,
  });
  return { ok: r.ok, provider: r.provider, id: r.id, status: r.status, error: r.error, threadId: r.threadId };
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
  // exactly what the send would use. A caller that owns its own transport (the
  // TwiML reply, the Chatwoot post) needs none: its reply leaves on the identity
  // the message arrived on by construction.
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

  const outcome = await transportSend(admin, orgId, { ...o, subject, smsFrom });

  if (o.agentMessageId) {
    await stampDelivery(admin, orgId, o.agentMessageId, outcome, {
      ...(o.stampExtra ?? {}),
      ...(o.channel === "email" && subject ? { subject } : {}),
      ...(outcome.threadId ? { gmail_thread_id: outcome.threadId } : {}),
    });
  }
  if (o.customerMessageId) {
    if (outcome.ok) {
      const clean = { ...((o.customerMeta ?? {}) as Json) };
      delete clean.auto_reply;
      await admin
        .from("conversation_messages")
        .update({ meta: { ...clean, auto_reply: { answered: true, at: new Date().toISOString() } } })
        .eq("id", o.customerMessageId)
        .eq("organization_id", orgId);
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
      ? `Answered ${o.to}${o.inboundSubject ? ` about "${o.inboundSubject}"` : ""}${o.template ? ` — adapted from the saved reply "${o.template.title}"` : " (no saved reply matched)"}.`
      : `Composed a reply to ${o.to} but could not send it: ${outcome.error ?? "unknown error"}.`,
  });

  if (outcome.ok) return { sent: true, outcome };
  return {
    sent: false,
    reason: `the reply could not be sent: ${outcome.error ?? "unknown error"}`,
    retryable: true,
    needsHuman: false,
    outcome,
  };
}
