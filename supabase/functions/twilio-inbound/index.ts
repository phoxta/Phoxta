// Phoxta — twilio-inbound: receives inbound SMS/WhatsApp from Twilio and replies
// with the business's own AI agent. Point a Twilio number's "A message comes in"
// webhook at:  <FUNCTIONS_URL>/twilio-inbound?org=<organization_id>
// The reply is returned as TwiML, so Twilio sends it (no outbound API/keys needed).
// verify_jwt is declared false in supabase/config.toml — never pass
// --no-verify-jwt, which sets it permanently.
//
// Because this endpoint is deployed without JWT verification it is reachable by
// anyone, so every request is authenticated against Twilio's X-Twilio-Signature
// (HMAC-SHA1 over the URL + POST params, keyed by TWILIO_AUTH_TOKEN). Without
// that check, anyone could inject fabricated inbound messages into a tenant's
// Inbox and drive the LLM on that tenant's bill.
// Requires: TWILIO_AUTH_TOKEN (and TWILIO_WEBHOOK_BASE if a proxy rewrites the host).
//
// ── WHY THIS FILE RUNS THE GATES ────────────────────────────────────────────
// It used to POST to agent-inbound and return twiml(data.reply) — so the live
// SMS/WhatsApp path had NO per-thread ceiling, NO burst window and NO daily cap,
// on the one channel that is metered per segment and policed by carriers. A
// customer's number running an autoresponder (a "driving, will reply later"
// service, an SMS-to-email gateway, or another tenant's agent number saved as a
// contact) ping-ponged without bound: nothing in the chain read threadReplyGate,
// and agent-inbound's hourly throttle returned a SENDABLE courtesy line, so it
// texted that out too and then decayed and let full replies resume.
//
// Now this file is a transport like any other and it is shaped exactly like
// email-inbound: resolve the business, resolve the thread, run the cheap
// pre-flight BEFORE a model turn is spent, and put nothing on the wire except
// through deliverAutoReply. The one thing it keeps for itself is the send: a
// TwiML reply rides back in this webhook's own response, which is what makes it
// free and — more importantly — what makes it come from THE NUMBER THE CUSTOMER
// TEXTED. Twilio's REST API would send from the platform-wide TWILIO_FROM, i.e.
// one tenant's customer would hear from another tenant's number.
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { verifyTwilioSignature } from "../_shared/webhooks.ts";
import { internalProofHeaders } from "../_shared/internalProof.ts";
import {
  autoReplyAllowed,
  deliverAutoReply,
  notifyNeedsHuman,
  type SendOutcome,
} from "../_shared/autoReply.ts";
import { phoneForStorage } from "../_shared/telephony.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// deno-lint-ignore no-explicit-any
type Json = any;

/** TwiML for one reply. An EMPTY message means say nothing: a `<Response>` with
 *  no `<Message>` is how Twilio is told to send no SMS/WhatsApp at all. */
function twiml(message: string): Response {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = message ? `<Message>${esc(message)}</Message>` : "";
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;
  return new Response(xml, { headers: { "Content-Type": "text/xml" } });
}

/** One POST to agent-inbound carrying the proof that lets it trust the channel
 *  and the sender's phone number (see internalProof.ts). */
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
  const data = (await res.json().catch(() => ({}))) as Json;
  return { ...data, __ok: res.ok };
}

/**
 * How long a turn may take before handing Twilio the TwiML stops being a send.
 *
 * Twilio abandons a messaging webhook at about 15 seconds (error 11200) and does
 * NOT retry an incoming-message webhook, so past that the <Message> body never
 * reaches Twilio and no SMS is sent. The transport below used to report
 * {ok:true,status:'sent'} unconditionally, which stamped the agent's row
 * delivered and the customer's row answered:true — a signal agent-catchup now
 * treats as settled forever. A turn that ran long was therefore silently dropped
 * AND made unrecoverable, while the owner's Inbox showed a delivered reply.
 *
 * Nine seconds leaves room for the writes deliverAutoReply still has to make
 * (the delivery stamp, the customer's row, the audit line) plus the round trip
 * back to Twilio. Past it the send is reported as FAILED, which is the honest
 * answer — the agent row reads failed, so it consumes no ceiling and does not
 * count as a reply, and the customer's message stays retryable for agent-catchup,
 * which can now answer it from this same tenant's own number.
 */
const TWIML_BUDGET_MS = (() => {
  const v = Number(Deno.env.get("TWILIO_TWIML_BUDGET_MS"));
  return Number.isFinite(v) && v > 0 ? v : 9000;
})();

Deno.serve(async (req) => {
  const startedAt = Date.now();
  try {
    const url = new URL(req.url);
    const orgParam = url.searchParams.get("org");
    // A number can bind straight to an agent public key (?key=…) — used for the
    // Phoxta platform line — or to an org (?org=…) whose key we resolve below.
    const directKey = url.searchParams.get("key");
    const form = await req.formData().catch(() => null);

    // Authenticate the sender before touching the database or the model.
    if (!form || !(await verifyTwilioSignature(req, form))) {
      return new Response("Forbidden", { status: 403 });
    }

    const body = form.get("Body")?.toString()?.trim() ?? "";
    const from = form.get("From")?.toString() ?? "";
    // THE BUSINESS'S OWN NUMBER — the one the customer actually texted, proven by
    // Twilio's signature on this request.
    //
    // The reply below rides back as TwiML, which Twilio sends from this number,
    // so the live path was always right. Everything else that answers a text —
    // agent-catchup retrying a deferred message, the operator's reply tool, an
    // Engage flow waking from a delay — goes through Twilio's REST API, which
    // sends from the single platform-wide TWILIO_FROM. There is no per-org number
    // anywhere in the schema, so those answered a business's customer from the
    // PHOXTA line; the customer's reply then hit Phoxta's own webhook and Phoxta's
    // agent answered another company's customer, in thread, as Phoxta. Recording
    // it here is what lets those paths send as the right business — and
    // _shared/autoReply.ts refuses to text at all when it is absent.
    const twilioTo = form.get("To")?.toString() ?? "";
    // Twilio's own id for this inbound message: the idempotency key. Twilio
    // retries a webhook that did not answer 200 in time, and without this a
    // retry re-runs the model and texts the customer a second reply.
    const providerSid = form.get("MessageSid")?.toString() ?? form.get("SmsMessageSid")?.toString() ?? "";
    const numMedia = Math.max(0, Math.min(10, Number(form.get("NumMedia")?.toString() ?? "0") || 0));

    // EVERY failure below answers with silence rather than a canned line.
    //
    // Those lines were sent with no gate in front of them — before the business
    // is even known, so there is no thread, no ceiling and no counter to
    // increment. A misconfigured number facing a customer's autoresponder would
    // therefore ping-pong "Sorry, this number isn't set up yet." without bound:
    // the exact defect being fixed, on the exact channel, moved onto the error
    // path. An empty <Response/> sends nothing, Twilio records the webhook as
    // healthy, and the reason is in this function's logs where an operator can
    // act on it — which is where a configuration problem belongs anyway.
    const quiet = (why: string): Response => {
      console.error(`[phoxta] twilio-inbound: ${why} (from ${from || "unknown"})`);
      return twiml("");
    };

    if (!orgParam && !directKey) return quiet("no ?org= or ?key= on the webhook URL — this number is not wired to a business");
    // Nothing at all — no text, no attachment. Nothing to record and nothing to
    // answer. A text WITH an attachment and no caption is handled below, once the
    // business is known: it used to return silence here and be dropped entirely,
    // so a customer who photographed a broken part and sent it got no reply, and
    // the business never saw the message.
    if (!body && numMedia === 0) return twiml("");

    const admin = adminClient();
    let key = directKey;
    if (!key && orgParam) {
      const { data } = await admin.rpc("app_storefront_agent_key", { p_org: orgParam });
      key = data;
    }
    if (!key) return quiet(`no agent key for org ${orgParam ?? "?"}`);

    // WHICH BUSINESS, before anything is decided. Every gate is per-org, and this
    // path used to learn the organisation only from agent-inbound's reply — i.e.
    // after the model had already run and the reply was one line from the wire.
    const { data: cfgRow } = await admin
      .from("agent_config")
      .select("organization_id")
      .eq("public_key", key)
      .maybeSingle();
    const orgId = String((cfgRow as { organization_id?: string } | null)?.organization_id ?? "");
    if (!orgId) return quiet("the agent key on this number matches no business");

    const channel = from.startsWith("whatsapp:") ? "whatsapp" : "sms";
    // Pass the sender's phone as the customer (not as conversationId — that's a
    // UUID). agent-inbound threads SMS/WhatsApp by (org, channel, phone).
    const phone = from.replace(/^whatsapp:/, "");
    const stored = phoneForStorage(phone);
    // Everything a later reply needs to know about how this message arrived —
    // above all WHICH OF THE BUSINESS'S NUMBERS it came in on.
    const inboundMeta: Json = { source: "twilio-inbound", twilio_to: twilioTo };

    // --- A photo with no caption. ---
    // The customer sent something real and expects it to have arrived. The agent
    // cannot read it, so nothing is composed and nothing is texted back — but the
    // message is FILED with the media links on it and a person is told, instead
    // of being dropped in silence before the business was even resolved.
    if (!body) {
      const media: string[] = [];
      for (let i = 0; i < numMedia; i++) {
        const u = form.get(`MediaUrl${i}`)?.toString() ?? "";
        if (u) media.push(u);
      }
      const rec = await callAgent({
        public_key: key,
        channel,
        record_only: true,
        reason: "the message was an attachment with no text — it needs a person to open it",
        retryable: false,
        message: `[${numMedia} attachment${numMedia === 1 ? "" : "s"} with no message text]`,
        customer: { phone },
        inbound: { providerSid, meta: { ...inboundMeta, media } },
      });
      const waiting = String(rec?.conversationId ?? "");
      if (waiting) await notifyNeedsHuman(admin, orgId, waiting, `${phone} sent an attachment with no text.`);
      return twiml("");
    }

    // --- The thread this text belongs to, resolved with the SAME predicate
    //     agentCore.resolveConversation uses, so the gates are read against the
    //     thread the reply will land on. A first-time sender has no thread yet
    //     and is gated on the switch, the org throttle and the daily cap alone;
    //     deliverAutoReply re-runs everything once the conversation exists. ---
    const { data: thread } = await admin
      .from("conversations")
      .select("id")
      .eq("organization_id", orgId)
      .eq("channel_type", channel)
      .eq("customer_phone", stored)
      .eq("is_test", false)
      .neq("status", "closed")
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const knownConversation = String((thread as { id?: string } | null)?.id ?? "");

    // --- The pre-flight, before a model turn is spent. The same gates run again
    //     inside deliverAutoReply, which is what actually authorises the send;
    //     this call only exists so a refusal costs nothing. ---
    const pre = await autoReplyAllowed(admin, orgId, {
      conversationId: knownConversation || null,
      channel,
      // This leg answers inside Twilio's own webhook response, so the reply
      // leaves from the number the customer texted by construction — it needs no
      // sender resolved and must never be refused for the want of one.
      outbound: { ownTransport: true },
    });
    if (!pre.ok) {
      const rec = await callAgent({
        public_key: key,
        channel,
        record_only: true,
        reason: pre.reason,
        retryable: pre.retryable,
        message: body,
        customer: { phone },
        ...(knownConversation ? { conversationId: knownConversation } : {}),
        // ALWAYS, even with no MessageSid: this meta is what carries the
        // business's own number onto the row, and a deferred text that loses it
        // can never be answered by anything but a person.
        inbound: { providerSid, meta: inboundMeta },
      });
      // The recording opens the thread for a first-time sender, so "ask me
      // first" reaches a human even on someone's very first text.
      const waiting = String(rec?.conversationId ?? "") || knownConversation;
      if (pre.needsHuman && waiting) await notifyNeedsHuman(admin, orgId, waiting, `${phone}: ${body}`);
      // Silence, not a canned line. A refusal here is the switch, the ceiling,
      // the burst window or the daily cap — texting a bot line on top of any of
      // them is the loop we are bounding.
      return twiml("");
    }

    const data = await callAgent({
      public_key: key,
      channel,
      message: body,
      customer: { phone },
      inbound: { providerSid, meta: inboundMeta },
    });

    // Five different ways the agent deliberately says "do not send this":
    //   throttled — the per-org hourly cap; the reply is a courtesy line, and
    //               texting it makes the cap useless as a volume control (and it
    //               is what let a loop resume once the hour rolled over).
    //   capped    — the plan's monthly allowance is spent; same reasoning.
    //   human     — somebody pressed "Take over", or the owner's switch is off;
    //               silence is the promise.
    //   duplicate — Twilio redelivered a message already on the thread.
    //   the call failed outright — and this one is silent too: a holding line
    //               here would be an unbounded, ungated send (no agent row is
    //               written, so no ceiling and no counter ever increments), and
    //               it would promise a follow-up on a message nothing recorded.
    if (!data?.__ok) return quiet("agent-inbound did not answer this message");
    const reply = String(data?.reply ?? "").trim();
    if (!reply || data?.throttled || data?.capped || data?.human || data?.duplicate) return twiml("");

    const conversationId = String(data?.conversationId ?? "");
    if (!conversationId) return quiet("the agent answered without naming a conversation");

    // --- THE FUNNEL. The switch, the per-thread ceiling, the texting burst
    //     window, the minimum spacing, the hourly throttle and the daily cap,
    //     then the delivery stamp on the agent's row, the reason on the
    //     customer's row when nothing goes out, and the audit line either way.
    //
    //     The transport is ours because the reply rides back in THIS response —
    //     which is what keeps it coming from the number the customer texted. It
    //     is called only after every gate has passed. ---
    let outgoing = "";
    const delivered = await deliverAutoReply(admin, orgId, {
      channel,
      trigger: "twilio-inbound",
      conversationId,
      to: phone,
      text: reply,
      agentMessageId: data?.agentMessageId ?? null,
      customerMessageId: data?.customerMessageId ?? null,
      // The FULL inbound meta, not just the source: markNotAnswered and the
      // answered-stamp both rewrite the row's meta from this object, so passing
      // a thinner one would erase the business's own number from the row and
      // leave a later retry with no honest way to send.
      customerMeta: inboundMeta,
      template: data?.template ?? null,
      stampExtra: inboundMeta,
      transport: (): Promise<SendOutcome> => {
        // Handing the text to Twilio in a 200 with a <Message> body IS the send
        // — but only while Twilio is still listening. It abandons a messaging
        // webhook at ~15s with error 11200 and does not retry it, so past the
        // budget the <Message> never reaches Twilio and nothing is texted.
        // Reporting 'sent' anyway stamped the row delivered and the customer's
        // message answered:true, which is now PERMANENT: no worker, sweep or dry
        // run would ever look at it again. A transport that cannot confirm
        // delivery must say so, and uncertainty must stay retryable.
        const elapsed = Date.now() - startedAt;
        if (elapsed > TWIML_BUDGET_MS) {
          console.warn(`[phoxta] twilio-inbound: turn took ${elapsed}ms, past the ${TWIML_BUDGET_MS}ms webhook budget — not claiming delivery`);
          return Promise.resolve({
            ok: false,
            provider: "twilio-twiml",
            id: "",
            status: "failed" as const,
            error: `the reply took ${Math.round(elapsed / 1000)}s to compose, past Twilio's webhook deadline — it was not put on the wire`,
          });
        }
        // No id until the status callback — deliberately EMPTY rather than the
        // inbound MessageSid, which already sits on the customer's row and would
        // collide on 0114's unique (organization_id, provider_sid) index the
        // moment delivery is stamped.
        outgoing = reply;
        return Promise.resolve({ ok: true, provider: "twilio-twiml", id: "", status: "sent" as const });
      },
    });

    // ONLY what the funnel authorised. `outgoing` is set by the transport, which
    // deliverAutoReply calls after the last gate — so there is no expression
    // here that can put text in front of a customer on its own.
    return twiml(delivered.sent ? outgoing : "");
  } catch (e) {
    // Silence, for the same reason as every other failure above: an apology sent
    // from outside the funnel is a message with no ceiling behind it.
    console.error("[phoxta] twilio-inbound failed:", String((e as Error)?.message || e));
    return twiml("");
  }
});
