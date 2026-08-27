// Phoxta — email-inbound: receives an inbound email (via a provider's inbound-
// parse webhook — Resend / Postmark / SendGrid / Cloudflare Email Routing),
// threads it into the business's Inbox and replies with the AI agent. Point the
// provider's inbound webhook at:
//   <FUNCTIONS_URL>/email-inbound?key=<agent_public_key>&token=<INBOUND_WEBHOOK_SECRET>
// Reply delivery uses the configured email provider (RESEND_* / POSTMARK_*);
// without one it degrades to "simulated". verify_jwt is declared false in
// supabase/config.toml — never pass --no-verify-jwt, which sets it permanently.
//
// SECURITY: this endpoint is deployed without JWT verification, and the agent
// public key it takes is genuinely public (it ships in client JS for the chat
// widget). Authenticating the *sender* is therefore mandatory — otherwise anyone
// could POST an arbitrary `from` address and have Phoxta send mail from its own
// verified sending domain to any recipient (an open relay), while burning model
// spend. Accepted proofs, in order:
//   1. RESEND_WEBHOOK_SECRET  → Svix signature headers (Resend).
//   2. INBOUND_WEBHOOK_SECRET → ?token=… or x-webhook-secret (any provider).
// At least one must be configured; with neither, every request is rejected.
//
// SAFETY: EVERY gate in _shared/autoReply.ts runs here, and the send itself goes
// through deliverAutoReply — the one funnel. This path used to run the header
// classifier and nothing else: no per-org switch, no per-thread ceiling, no
// daily cap. A counterparty autoresponder that sets no RFC 3834 marker and
// ignores ours therefore ping-ponged, bounded only by agent-inbound's 200
// inbound-messages-an-hour throttle — roughly 200 exchanges an hour to one
// address from the platform's verified sending domain, while every other
// customer of that business got the "we're handling a lot of enquiries" line.
// The identical scenario on the connected-mailbox path stopped after six.
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { getConnection } from "../_shared/google.ts";
import { verifySvixSignature, verifySharedSecret } from "../_shared/webhooks.ts";
import { internalProofHeaders } from "../_shared/internalProof.ts";
import {
  addressOf,
  autoReplyAllowed,
  automatedMailReason,
  deliverAutoReply,
  notifyNeedsHuman,
  replySubject,
  selfAddresses,
  trimForAgent,
} from "../_shared/autoReply.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// deno-lint-ignore no-explicit-any
type Json = any;

/** Normalise the many provider payload shapes into { from, subject, text }. */
/** Readable text from a markup body, for the plain-text message field. */
function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function parseInbound(payload: Json, form: FormData | null): { from: string; subject: string; text: string } {
  const g = (k: string) => (form ? (form.get(k)?.toString() ?? "") : "");
  if (payload) {
    // Postmark: { From, Subject, TextBody, StrippedTextReply, FromFull:{Email} }
    // Resend:   { from:{address}|string, subject, text } (or nested under data)
    const p = payload.data ?? payload;
    const fromRaw =
      p.FromFull?.Email || p.From || (typeof p.from === "object" ? p.from?.address || p.from?.email : p.from) || p.sender || "";
    const subject = p.Subject || p.subject || "";
    const text = p.StrippedTextReply || p.TextBody || p.text || p["body-plain"] || p.body || "";
    return { from: addressOf(String(fromRaw || "")), subject: String(subject || ""), text: String(text || "").trim() };
  }
  // SendGrid Inbound Parse (multipart form): from, subject, text
  // Falling back to g("html") RAW put markup into a plain-text field: the console
  // then rendered it escaped, so the reader saw <table> and <div> instead of the
  // message, and the agent replied to tag soup. Flatten it to text instead.
  const plain = g("text").trim();
  return { from: addressOf(g("from")), subject: g("subject"), text: plain || htmlToText(g("html")) };
}

/**
 * Every header the provider was willing to give us, lowercased.
 *
 * These were parsed and discarded before, which is why nothing in this codebase
 * could tell an out-of-office from a customer. Providers disagree about the
 * shape — an array of {Name,Value} (Postmark), an array of {name,value} or a
 * plain object (Resend), a raw blob in a form field (SendGrid) — so all four are
 * read. A message with no headers at all still gets the subject and sender
 * checks, which catch the loudest offenders.
 */
function parseHeaders(payload: Json, form: FormData | null): Record<string, string> {
  const out: Record<string, string> = {};
  const add = (name: unknown, value: unknown) => {
    const k = String(name ?? "").toLowerCase().trim();
    if (k && !(k in out)) out[k] = String(value ?? "");
  };
  const p = payload?.data ?? payload;
  if (p && typeof p === "object") {
    if (Array.isArray(p.Headers)) for (const h of p.Headers) add(h?.Name, h?.Value);
    if (Array.isArray(p.headers)) for (const h of p.headers) add(h?.name ?? h?.Name, h?.value ?? h?.Value);
    else if (p.headers && typeof p.headers === "object") for (const [k, v] of Object.entries(p.headers)) add(k, v);
    if (p.MessageID) add("message-id", p.MessageID);
    if (p.message_id) add("message-id", p.message_id);
    if (p.ReplyTo) add("reply-to", p.ReplyTo);
  }
  if (form) {
    // SendGrid hands the whole header block over as one field.
    for (const line of (form.get("headers")?.toString() ?? "").split(/\r?\n/)) {
      if (/^\s/.test(line)) continue; // a folded continuation of the line above
      const i = line.indexOf(":");
      if (i > 0) add(line.slice(0, i), line.slice(i + 1).trim());
    }
  }
  return out;
}

/**
 * An idempotency key for a message whose provider gave us no Message-ID.
 *
 * The RFC 822 Message-ID is the natural key and parseHeaders also falls back to
 * Postmark's MessageID and Resend's message_id — but a provider that hands over
 * none left it EMPTY, and an empty provider_sid skips agent-inbound's duplicate
 * check entirely (and is deliberately excluded from 0114's unique index). A
 * redelivery more than the minimum-spacing window later therefore re-ran the
 * model and sent the customer a second reply.
 *
 * The sender, the subject and the body identify the message; the Date header
 * distinguishes two genuinely separate mails that happen to say the same thing.
 * When there is no Date either, a 15-minute bucket stands in — a redelivery
 * lands within seconds to minutes, so it will nearly always share the bucket,
 * and a bucket boundary merely degrades to the behaviour we had before.
 */
async function fallbackMessageKey(from: string, subject: string, date: string, text: string): Promise<string> {
  const when = date.trim() || new Date(Math.floor(Date.now() / 900_000) * 900_000).toISOString();
  const src = `${from}\n${subject}\n${when}\n${text.slice(0, 4000)}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(src));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex.slice(0, 48)}`;
}

async function authenticate(req: Request, rawBody: string): Promise<boolean> {
  const svixSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  if (svixSecret && req.headers.get("svix-signature")) {
    return await verifySvixSignature(req, rawBody, svixSecret);
  }
  return verifySharedSecret(req, "INBOUND_WEBHOOK_SECRET");
}

/** One POST to agent-inbound, carrying the proof that lets it trust the sender
 *  address and the channel (see internalProof.ts). */
async function callAgent(payload: Json): Promise<Json> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-inbound`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ANON}`,
      apikey: ANON,
      "Content-Type": "application/json",
      ...(await internalProofHeaders()),
    },
    body: JSON.stringify(payload),
  });
  return (await res.json().catch(() => ({}))) as Json;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get("key"); // the business's agent public key
    const ct = (req.headers.get("content-type") || "").toLowerCase();

    // Read the body once as text so the Svix HMAC sees the exact bytes signed.
    const rawBody = await req.text();
    if (!(await authenticate(req, rawBody))) {
      return new Response("Forbidden", { status: 403 });
    }

    let payload: Json = null;
    let form: FormData | null = null;
    if (ct.includes("json")) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        payload = null;
      }
    }
    if (!payload) {
      form = await new Response(rawBody, { headers: { "content-type": ct } }).formData().catch(() => null);
    }
    const { from, subject, text } = parseInbound(payload, form);
    const headers = parseHeaders(payload, form);

    // Always 200 so the provider doesn't retry. With no key or no sender there
    // is no business to file this against and nothing to answer — but a mail
    // whose BODY we cannot read is a different thing entirely, and it is handled
    // below, once the business is known, instead of being dropped in silence.
    if (!key || !from) return new Response("ok", { status: 200 });

    // The quoted thread underneath a real reply routinely pushed the message
    // past agent-inbound's 4000-character limit, which answered 400 — and this
    // function never looked at the status, so the customer got nothing at all
    // and no log line said so. Trim first; the model reads the new words.
    const message = trimForAgent(text);
    /** What goes on the row when there is no readable text: a real customer may
     *  have sent a purchase order as a single PDF, and a machine cannot read it.
     *  agent-inbound refuses an empty message outright, so the row needs a body. */
    const placeholder = `[a message with no readable text${subject ? ` — subject: "${subject}"` : ""}]`;

    const meta = {
      subject,
      source: "email-inbound",
      message_id: headers["message-id"] ?? "",
      references: headers["references"] ?? "",
      to: headers["to"] ?? "",
    };
    // The dedupe key handed to agent-inbound and stored as provider_sid. Never
    // empty now — see fallbackMessageKey.
    const idempotencyKey =
      meta.message_id.trim() ||
      (await fallbackMessageKey(from, subject, String(headers["date"] ?? ""), message || text));

    const admin = adminClient();

    // Which business this is, BEFORE anything is decided. The gates are per-org
    // and so is "are we talking to ourselves?", and this path used to learn the
    // organisation only from agent-inbound's reply — i.e. after the model had
    // already run and a send was one line away.
    const { data: cfgRow } = await admin
      .from("agent_config")
      .select("organization_id")
      .eq("public_key", key)
      .maybeSingle();
    const orgId = String((cfgRow as { organization_id?: string } | null)?.organization_id ?? "");
    if (!orgId) return new Response("ok", { status: 200 });

    // --- Machine-generated? File it, answer nothing. ---
    // selfAddresses is passed here for the first time: without it the "sent from
    // this business's own address" test could never fire on the one path that is
    // publicly reachable, so an alias, a forwarding rule or a member testing the
    // address had the agent answering its own organisation.
    const conn = await getConnection(admin, orgId);
    const self = await selfAddresses(admin, orgId, conn?.email ?? "");
    const automated = automatedMailReason({ headers, subject, fromEmail: from, selfAddresses: self });
    if (automated) {
      await callAgent({
        public_key: key,
        channel: "email",
        record_only: true,
        reason: automated.reason,
        // A heuristic must not bury a real customer forever — only a definitive
        // signal (RFC 3834, List-*, a bounce, our own address) settles it.
        retryable: !automated.definitive,
        message: message || placeholder,
        customer: { email: from },
        // The RFC 822 Message-ID is the idempotency key: a provider redelivery
        // must not produce a second reply to the same customer.
        inbound: { providerSid: idempotencyKey, meta },
      });
      return new Response("ok", { status: 200 });
    }

    // --- A mail the agent cannot read. ---
    // It used to be dropped before the business was even resolved: a purchase
    // order sent as one PDF, or a message built entirely of images, produced no
    // Inbox row, no reason and no notification, and — because nothing existed in
    // conversation_messages — agent-catchup could never find it either. The
    // customer had written in and the business never knew. Settled for the AGENT
    // (the body will not become readable on a later tick) but explicitly NOT for
    // the business: a person is told, once.
    if (!message) {
      const rec = await callAgent({
        public_key: key,
        channel: "email",
        record_only: true,
        reason: "the message had no readable text — it needs a person to open it",
        retryable: false,
        message: placeholder,
        customer: { email: from },
        inbound: { providerSid: idempotencyKey, meta },
      });
      const waiting = String(rec?.conversationId ?? "");
      if (waiting) await notifyNeedsHuman(admin, orgId, waiting, `${from}: ${subject || "(no subject)"}`);
      return new Response("ok", { status: 200 });
    }

    // --- The pre-flight, before a model turn is spent. ---
    // Email threads by the sender's address, so the thread this message belongs
    // to already exists for anyone who has written in before — which is what
    // makes the per-thread ceiling reachable here at all. A first-time sender has
    // no thread yet and is gated on the switch and the org-wide throttle alone;
    // deliverAutoReply re-runs everything once the conversation exists.
    const { data: thread } = await admin
      .from("conversations")
      .select("id")
      .eq("organization_id", orgId)
      .eq("channel_type", "email")
      .eq("customer_email", from)
      // The same predicate agentCore.resolveConversation uses, so the thread the
      // gates are read against is the thread the reply will land on. A sandbox
      // conversation never stands in for a real one.
      .eq("is_test", false)
      .neq("status", "closed")
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const knownConversation = String((thread as { id?: string } | null)?.id ?? "");

    const pre = await autoReplyAllowed(admin, orgId, {
      conversationId: knownConversation || null,
      channel: "email",
    });
    if (!pre.ok) {
      const rec = await callAgent({
        public_key: key,
        channel: "email",
        record_only: true,
        reason: pre.reason,
        retryable: pre.retryable,
        message,
        customer: { email: from },
        inbound: { providerSid: idempotencyKey, meta },
      });
      // The recording opens the thread for a first-time sender, so "ask me
      // first" reaches a human even on the very first message from someone.
      const waiting = String(rec?.conversationId ?? "") || knownConversation;
      if (pre.needsHuman && waiting) {
        await notifyNeedsHuman(admin, orgId, waiting, `${from}: ${subject}`);
      }
      return new Response("ok", { status: 200 });
    }

    const data = await callAgent({
      public_key: key,
      channel: "email",
      message,
      customer: { email: from },
      // The RFC 822 Message-ID is the idempotency key: a provider redelivery
      // must not produce a second reply to the same customer.
      inbound: { providerSid: idempotencyKey, meta },
    });

    // Four different ways the agent deliberately says "do not send this":
    //   throttled — the per-org hourly cap; the reply is a courtesy line, and
    //               mailing it would make the cap useless as a volume control.
    //   capped    — the plan's monthly allowance is spent; same reasoning.
    //   human     — somebody pressed "Take over"; silence is the promise.
    //   duplicate — the provider redelivered a message already on the thread.
    const reply = String(data?.reply ?? "").trim();
    if (!reply || data?.throttled || data?.capped || data?.human || data?.duplicate) {
      return new Response("ok", { status: 200 });
    }

    const conversationId = String(data?.conversationId ?? "");
    if (!conversationId) return new Response("ok", { status: 200 });

    // The funnel: the switch, the per-thread ceiling, the minimum spacing, the
    // hourly throttle and the daily cap, then the send, the delivery stamp and
    // the audit line. The threading keys are handed over, but NOT an assertion
    // about where the mail came from — conversations are keyed on the customer's
    // address, so a person who has also written to the business's connected
    // mailbox is this same thread, and sendConversationEmail has to discover that
    // and answer as the mailbox rather than flipping identity mid-conversation.
    await deliverAutoReply(admin, orgId, {
      channel: "email",
      trigger: "email-inbound",
      conversationId,
      to: from,
      text: reply,
      subject: replySubject(subject),
      inboundSubject: subject,
      agentMessageId: data?.agentMessageId ?? null,
      customerMessageId: data?.customerMessageId ?? null,
      customerMeta: meta,
      template: data?.template ?? null,
      thread: { messageId: meta.message_id, references: meta.references, subject },
      stampExtra: { source: "email-inbound", in_reply_to: meta.message_id },
    });
    return new Response("ok", { status: 200 });
  } catch (e) {
    // Still 200 — a provider retry would re-run the model and could send the
    // customer a second reply. The error has to be visible somewhere, though;
    // returning nothing at all is how this path stayed silent for months.
    console.error("[phoxta] email-inbound failed:", String((e as Error)?.message || e));
    return new Response("ok", { status: 200 });
  }
});
