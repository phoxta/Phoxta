// Phoxta — the one way an email leaves a conversation.
//
// A reply has to go out on the identity it came in on. Mail that arrived in a
// business's connected Gmail mailbox must be answered FROM that mailbox and
// inside that Gmail thread; mail that arrived through the platform's own
// inbound webhook has no mailbox to answer from and goes out through Resend.
//
// Getting this wrong is not cosmetic. dispatch()/sendEmail() send from
// RESEND_FROM with Reply-To: hello@phoxta.com — so answering a tenant's
// customer that way tells them a different company wrote to them, opens a new
// thread instead of continuing theirs, and routes their next reply into
// Phoxta's own mailbox rather than the business's. That is a cross-tenant
// disclosure introduced by the SEND path, which is why every caller that
// answers inside a conversation comes through here instead of choosing a
// transport for itself.
//
// Gmail failure is NOT retried through Resend. A failed send is recorded as
// failed and left for a human; quietly answering from the wrong address would
// be worse than not answering at all.
import type { SupabaseClient } from "./supabaseAdmin.ts";
import { getAccessToken, getConnection, canSendMail, gmailSendMessage } from "./google.ts";
import { sendEmail, dispatch } from "./dispatch.ts";
import { renderSimple } from "./email.ts";
import { addressOf, messageIdOf, referenceIds, replySubject } from "./mailText.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

/** What is needed to land a reply inside an existing mail thread. */
export type ThreadContext = {
  /** Gmail's own thread id — present only for mail pulled from a connected mailbox. */
  threadId: string;
  /** The RFC 822 Message-ID of the message being answered. */
  messageId: string;
  /** That message's References chain. */
  references: string;
  /** The subject of the thread, for the Re: line. */
  subject: string;
  /**
   * This conversation reached the business through its own mailbox.
   *
   * Tracked separately from `threadId` because messages ingested before the
   * threading keys were stored have none — and without this flag those would
   * fall through to the platform's sender, answering the customer as a
   * different company. Knowing WHERE the mail came from is what decides the
   * identity; the thread id only decides whether the reply threads.
   */
  fromMailbox: boolean;
};

const EMPTY: ThreadContext = { threadId: "", messageId: "", references: "", subject: "", fromMailbox: false };

/** Sources that mean "this arrived in the business's own connected mailbox". */
const MAILBOX_SOURCES = new Set(["gmail-sync", "gmail"]);

/**
 * Recover the threading keys from what the Inbox already stored.
 *
 * gmail-sync writes gmail_thread_id / message_id / references onto every
 * message it ingests, so any later reply — the agent's, the catch-up worker's,
 * or a human's from the console — can thread correctly without re-fetching the
 * mail. Messages ingested before that existed simply have none, and the reply
 * degrades to an unthreaded one rather than failing.
 */
export async function emailThreadContext(
  admin: SupabaseClient,
  orgId: string,
  conversationId: string,
): Promise<ThreadContext> {
  const { data } = await admin
    .from("conversation_messages")
    .select("role, meta, created_at")
    .eq("organization_id", orgId)
    .eq("conversation_id", conversationId)
    .eq("channel_type", "email")
    .order("created_at", { ascending: false })
    .limit(20);
  const rows = ((data as Json[] | null) ?? []);
  const out: ThreadContext = { ...EMPTY };
  // Thread, subject and origin: the newest message of any role that carries them.
  for (const r of rows) {
    const m = (r?.meta ?? {}) as Json;
    if (!out.threadId && typeof m.gmail_thread_id === "string" && m.gmail_thread_id) out.threadId = m.gmail_thread_id;
    if (!out.subject && typeof m.subject === "string" && m.subject.trim()) out.subject = m.subject;
    if (MAILBOX_SOURCES.has(String(m.source ?? ""))) out.fromMailbox = true;
  }
  if (out.threadId) out.fromMailbox = true;
  // In-Reply-To: the newest message FROM THE CUSTOMER — that is the one being
  // answered. Replying to our own last message would thread, but reads oddly in
  // the customer's client.
  for (const r of rows) {
    if (r?.role !== "customer") continue;
    const m = (r?.meta ?? {}) as Json;
    const id = messageIdOf(typeof m.message_id === "string" ? m.message_id : "");
    if (id) {
      out.messageId = id;
      out.references = typeof m.references === "string" ? m.references : "";
      break;
    }
  }
  return out;
}

/**
 * The address a customer's reply must come back to — THIS business's, never the
 * platform's.
 *
 * dispatch.ts defaults every outbound Reply-To to RESEND_REPLY_TO, which is
 * hello@phoxta.com: a real alias on Phoxta's own Workspace mailbox. On a
 * notification to a Phoxta customer that is right. On a tenant's reply to THEIR
 * customer it is a cross-tenant failure with two halves — the business loses the
 * conversation (the customer's next message lands in Phoxta's mailbox, not
 * theirs) and Phoxta receives another company's customer data. Worse, Phoxta
 * dogfoods gmail-sync, so if that mailbox is connected the funnel then answers
 * another tenant's customer AS PHOXTA, in thread, six times a day.
 *
 * So a conversation reply resolves an address that routes back to the business,
 * in the order of how certainly it does:
 *   1. the connected mailbox — the business's own, and monitored by definition;
 *   2. the address this customer actually wrote TO on this thread, which is the
 *      business's own inbound address (support@theirs.com forwarding into the
 *      inbound-parse webhook), so a reply to it re-enters the same pipeline;
 *   3. the billing address on the organisation record;
 *   4. the owner's login address, which always exists.
 * If none of the four resolves, the mail is NOT sent. Answering a customer from
 * an address that routes to a different company is worse than not answering.
 */
const cleanAddress = (v: unknown): string => {
  const a = addressOf(String(v ?? "")).toLowerCase();
  return a.includes("@") ? a : "";
};

/**
 * An address that belongs to THIS business, for any mail the platform sends on
 * its behalf — not just a conversation reply.
 *
 * Exported because the operator's outreach tool has the same problem: the
 * autopilot can send a customer an email autonomously, and dispatch() would put
 * Phoxta's own hello@ on it. Returns "" when nothing can be resolved, which the
 * callers treat as "do not send", not as "use the platform's".
 */
export async function orgReplyTo(admin: SupabaseClient, orgId: string): Promise<string> {
  const conn = await getConnection(admin, orgId);
  const mailbox = cleanAddress(conn?.email);
  if (mailbox) return mailbox;

  const { data: org } = await admin
    .from("organizations")
    .select("billing_email, owner_user_id")
    .eq("id", orgId)
    .maybeSingle();
  const billing = cleanAddress((org as Json)?.billing_email);
  if (billing) return billing;

  const ownerId = String((org as Json)?.owner_user_id ?? "");
  if (ownerId) {
    try {
      const { data: u } = await admin.auth.admin.getUserById(ownerId);
      const owner = cleanAddress(u?.user?.email);
      if (owner) return owner;
    } catch { /* the caller decides what an empty answer means */ }
  }
  return "";
}

const domainOf = (address: string): string => address.split("@")[1] ?? "";

async function tenantReplyTo(
  admin: SupabaseClient,
  orgId: string,
  conversationId: string,
  mailbox: string,
): Promise<string> {
  const fromMailbox = cleanAddress(mailbox);
  if (fromMailbox) return fromMailbox;

  // THE ADDRESS THE CUSTOMER WROTE TO IS CALLER-CONTROLLED DATA.
  //
  // email-inbound stores headers["to"] verbatim on the customer's row, and a
  // sender who addresses their mail To: someone-else@evil.com and BCCs the
  // business's inbound-parse address plants that value. Used unchecked it became
  // the BUSINESS's own Reply-To — and, because a thread is keyed on the
  // customer's address, a single poisoned row set the return address for every
  // later reply to that person.
  //
  // The header is still by far the best answer when it is genuine (support@
  // theirs.com forwarding into the webhook is exactly the address a reply should
  // go back to), so it is not discarded — it is CORROBORATED. The business's own
  // address is resolved first, and the header is accepted only when it is on the
  // same domain. Anything else falls back to the corroborating address itself.
  const own = await orgReplyTo(admin, orgId);
  const ownDomain = domainOf(own);
  if (!ownDomain) return own; // nothing to check against — never trust the header alone

  const { data: rows } = await admin
    .from("conversation_messages")
    .select("meta")
    .eq("organization_id", orgId)
    .eq("conversation_id", conversationId)
    .eq("role", "customer")
    .eq("channel_type", "email")
    .order("created_at", { ascending: false })
    .limit(10);
  for (const r of (((rows as Json[] | null) ?? []))) {
    // A To: line can carry several recipients; the first is the one addressed.
    const to = cleanAddress(String((r?.meta ?? {}).to ?? "").split(",")[0]);
    if (to && domainOf(to) === ownDomain) return to;
  }

  return own;
}

export type ConversationEmailResult = {
  ok: boolean;
  provider: "gmail" | "resend" | "postmark" | "none";
  /** The provider's own id for the sent message — the dedupe key. */
  id: string;
  /** Ready for conversation_messages.delivery_status. */
  status: "sent" | "failed" | "simulated";
  threadId: string;
  error?: string;
};

export async function sendConversationEmail(
  admin: SupabaseClient,
  orgId: string,
  o: {
    conversationId: string;
    to: string;
    /** Omit to use the thread's own subject — which is what a customer reading
     *  "Order #4471 — wrong size delivered" expects to see come back, rather
     *  than "Re: your message". */
    subject?: string;
    text: string;
    /** Mark the message machine-generated (RFC 3834) — automatic replies only,
     *  never a human's message from the console. */
    autoReplied?: boolean;
    /** Skip the lookup when the caller already holds the inbound message's keys. */
    thread?: Partial<ThreadContext>;
  },
): Promise<ConversationEmailResult> {
  const to = String(o.to ?? "").trim();
  if (!to) return { ok: false, provider: "none", id: "", status: "failed", threadId: "", error: "No email address to reply to." };

  // A caller holding the inbound message (gmail-sync answering the mail it just
  // pulled) passes its keys AND asserts where the mail came from, so no lookup is
  // needed. A caller that only holds the message's headers — email-inbound, which
  // knows the Message-ID but nothing about the thread's history — must NOT be
  // taken to mean "this thread has no mailbox behind it": conversations are
  // threaded by the customer's address, so a person who has written both to the
  // connected mailbox and to the platform's inbound address is ONE conversation,
  // and answering the second message through Resend would flip the business's
  // identity mid-thread. Origin is discovered; the caller's keys win over it.
  const known: Partial<ThreadContext> = o.thread ?? {};
  let ctx: ThreadContext;
  if (known.fromMailbox === true) {
    ctx = { ...EMPTY, ...known };
  } else {
    const found = await emailThreadContext(admin, orgId, o.conversationId);
    ctx = {
      threadId: known.threadId || found.threadId,
      messageId: messageIdOf(known.messageId ?? "") || found.messageId,
      references: known.messageId ? (known.references ?? "") : found.references,
      subject: known.subject || found.subject,
      fromMailbox: found.fromMailbox,
    };
  }
  const subject = o.subject?.trim() || replySubject(ctx.subject);

  // --- The mail came from a connected mailbox: answer AS that mailbox. ---
  // Threaded when we know the thread, unthreaded when we do not — but always
  // from the right address. Answering mailbox-originated mail through the
  // platform's sender is the one outcome that must never happen: the customer
  // would hear from a company they have never written to, and their reply would
  // land in Phoxta's mailbox instead of the business's.
  if (ctx.threadId || ctx.fromMailbox) {
    const conn = await getConnection(admin, orgId);
    if (!conn) {
      return { ok: false, provider: "gmail", id: "", status: "failed", threadId: ctx.threadId, error: "This thread came from a Google mailbox that is no longer connected — reconnect Google in Settings." };
    }
    if (!canSendMail(conn)) {
      return { ok: false, provider: "gmail", id: "", status: "failed", threadId: ctx.threadId, error: "The Google connection was made without permission to send mail — reconnect Google in Settings." };
    }
    const token = await getAccessToken(admin, orgId);
    if (!token) {
      return { ok: false, provider: "gmail", id: "", status: "failed", threadId: ctx.threadId, error: "The Google connection has expired — reconnect Google in Settings." };
    }
    try {
      const sent = await gmailSendMessage(token, {
        to,
        subject,
        text: o.text,
        threadId: ctx.threadId || undefined,
        inReplyTo: ctx.messageId || undefined,
        references: ctx.references || undefined,
        autoReplied: o.autoReplied === true,
      });
      return { ok: true, provider: "gmail", id: sent.id, status: "sent", threadId: sent.threadId || ctx.threadId };
    } catch (e) {
      return { ok: false, provider: "gmail", id: "", status: "failed", threadId: ctx.threadId, error: String((e as Error)?.message || e) };
    }
  }

  // --- No mailbox behind this thread: the platform's sending domain carries it,
  //     but the IDENTITY it carries has to be the business's. ---
  // Resolved before anything is rendered, because a failure here is a refusal to
  // send rather than a degraded send.
  const conn = await getConnection(admin, orgId);
  const replyTo = await tenantReplyTo(admin, orgId, o.conversationId, conn?.email ?? "");
  if (!replyTo) {
    return {
      ok: false,
      provider: "none",
      id: "",
      status: "failed",
      threadId: "",
      error:
        "No address for this business could be found to receive the customer's reply — add a billing email in Settings, or connect Google.",
    };
  }
  const rendered = renderSimple(subject, o.text);
  const headers: Record<string, string> = {};
  // Only a real RFC 5322 msg-id may go in these: providers hand us their own
  // GUIDs when the header is missing, and an invalid In-Reply-To threads nothing
  // while risking a strict MTA rejecting the message.
  const inReplyTo = messageIdOf(ctx.messageId);
  if (inReplyTo) {
    const chain = [...referenceIds(ctx.references), inReplyTo];
    headers["In-Reply-To"] = inReplyTo;
    headers["References"] = [...new Set(chain)].slice(-12).join(" ");
  }
  if (o.autoReplied) {
    headers["Auto-Submitted"] = "auto-replied";
    headers["X-Auto-Response-Suppress"] = "All";
  }
  const r = await sendEmail({ to: [to], subject, html: rendered.html, text: rendered.text, headers, replyTo });
  if (r.ok) return { ok: true, provider: "resend", id: r.id ?? "", status: "sent", threadId: "" };
  if (r.status === "simulated") {
    // Resend is not configured. dispatch() still knows about Postmark, so try it
    // rather than reporting a failure the operator cannot act on — carrying the
    // same tenant Reply-To, because the fallback transport had the identical
    // hello@phoxta.com default baked into it.
    const d = await dispatch("email", to, subject, o.text, { replyTo });
    if (d.status === "sent") return { ok: true, provider: "postmark", id: "", status: "sent", threadId: "" };
    return { ok: false, provider: "none", id: "", status: "simulated", threadId: "", error: "No email provider is configured." };
  }
  return { ok: false, provider: "resend", id: "", status: "failed", threadId: "", error: r.error ?? "The email could not be sent." };
}
