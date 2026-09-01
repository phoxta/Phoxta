// Phoxta — twilio-inbound: receives inbound SMS/WhatsApp from Twilio and replies
// with the business's own AI agent. Point a Twilio number's "A message comes in"
// webhook at:  <FUNCTIONS_URL>/twilio-inbound?org=<organization_id>
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
// ── ANSWER TWILIO FIRST, COMPOSE AFTERWARDS ─────────────────────────────────
// This webhook used to hand Twilio the reply as TwiML inside its own HTTP
// response, which meant Twilio held the request open for the whole model turn.
// Twilio abandons a messaging webhook at about fifteen seconds (error 11200)
// and does NOT retry an incoming-message webhook, so any turn that used a tool
// — routinely twelve to twenty seconds — was simply never delivered. The
// honest-refusal message an owner has been seeing ("the reply took 16s to
// compose, past Twilio's webhook deadline") was that deadline being reported
// rather than hidden.
//
// So the shape is now the one the deadline actually allows:
//   1. authenticate the request,
//   2. FILE the customer's message and claim it (a few hundred milliseconds),
//   3. answer Twilio with an empty <Response/> — nothing to send, no deadline
//      left to miss,
//   4. compose and send AFTER responding, in the runtime's background hook,
//      over Twilio's REST API.
//
// Filing before responding is what makes step 4 safe to lose: if the background
// turn dies mid-flight, the customer's message is already on the thread with a
// claim that expires in ten minutes, so agent-catchup answers it on a later
// tick. Nothing is silently dropped. And where the runtime offers no background
// hook, the work is simply awaited — Twilio may log an 11200 for the webhook,
// which costs nothing here because the response carries no message anyway.
//
// ── WHOSE NUMBER THE REPLY COMES FROM ───────────────────────────────────────
// TwiML was originally chosen for one good reason: Twilio sends a TwiML reply
// FROM the number the customer texted, whereas the REST API sends from whatever
// `From` you pass — and there was only ever one platform-wide TWILIO_FROM, so a
// REST reply answered one business's customer from another business's number.
// That reason has expired. The signature-proven `To` on this very request is
// the business's own number: it is recorded as meta.twilio_to on the customer's
// row AND handed to deliverAutoReply as `smsFrom`, so the REST send speaks as
// the right business. When it cannot be resolved, the reply is REFUSED and a
// person is told — a message from the wrong company is worse than a message not
// sent, and its reply would land in the wrong business's Inbox.
//
// There is exactly ONE delivery path now. A "fast replies by TwiML, slow ones
// async" split would double the delivery logic on the channel that is metered
// per segment and policed by carriers, and the two halves would drift.
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import { verifyTwilioSignature } from "../_shared/webhooks.ts";
import { internalProofHeaders } from "../_shared/internalProof.ts";
import {
  autoReplyAllowed,
  deliverAutoReply,
  markNotAnswered,
  notifyNeedsHuman,
  tenantSenderFrom,
} from "../_shared/autoReply.ts";
import { phoneForStorage } from "../_shared/telephony.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// deno-lint-ignore no-explicit-any
type Json = any;

/** The only thing this webhook ever returns now: "received, nothing to send".
 *  A `<Response>` with no `<Message>` is how Twilio is told to send nothing —
 *  the reply itself goes out over the REST API once it has been composed. */
function ack(): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
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

/** Compose-and-send the reply, INLINE — before this handler returns to Twilio.
 *
 *  It used to run in `EdgeRuntime.waitUntil`, after the response: ack Twilio in
 *  milliseconds, compose in the background. The measured cost of that was a
 *  THIRTEEN-MINUTE reply. A WhatsApp/SMS answer that needs a tool call or a RAG
 *  lookup takes longer than the sliver of post-response budget Supabase keeps
 *  the isolate alive for, so the background task was being terminated mid-send
 *  and the message fell through to agent-catchup — the 5-minute cron backstop —
 *  which delivered it two or three ticks later. Fast replies survived the hook;
 *  every reply worth waiting for did not.
 *
 *  Awaiting here moves the work into the request's OWN lifetime, which gets the
 *  full function budget (~150s), so the send completes for slow replies too.
 *  Three facts make holding the webhook open until then free of cost:
 *    • the reply never travelled in the TwiML response anyway — deliverAutoReply
 *      sends it out of band over the REST API, so the webhook's timing has never
 *      affected delivery, only WHETHER the send ran to completion;
 *    • Twilio does not retry an inbound-message webhook on timeout (unlike a
 *      status callback), so a compose slower than Twilio's 15s wait costs one
 *      cosmetic 11200 in the Twilio console and nothing on the wire;
 *    • the per-message claim (10-min TTL) already stops any second path — a
 *      Twilio retry that did happen, or agent-catchup arriving early — from
 *      composing a duplicate.
 *  A compose that somehow outruns even the function budget still lands in the
 *  queue for agent-catchup; the cron stays the backstop, it is no longer the
 *  primary. The task never throws (its own catch files the message). */
async function afterResponding(task: Promise<void>): Promise<void> {
  await task;
}

Deno.serve(async (req) => {
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
    // Twilio's signature on this request. It is recorded on the customer's row
    // (so agent-catchup, the operator's reply tool and an Engage flow can all
    // answer as the right business later) and handed to this turn's own send.
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
      return ack();
    };

    if (!orgParam && !directKey) return quiet("no ?org= or ?key= on the webhook URL — this number is not wired to a business");
    // Nothing at all — no text, no attachment. Nothing to record and nothing to
    // answer. A text WITH an attachment and no caption is handled below, once the
    // business is known: it used to return silence here and be dropped entirely,
    // so a customer who photographed a broken part and sent it got no reply, and
    // the business never saw the message.
    if (!body && numMedia === 0) return ack();

    const admin: SupabaseClient = adminClient();
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

    // The sender for this turn's own reply, in the form twilioSend wants. Proven
    // by the signature on this request rather than read back from a row, so the
    // live path never depends on the recording having succeeded. Empty means the
    // reply cannot be sent as this business at all — autoReplyAllowed refuses on
    // exactly that below, and tells a person.
    const smsFrom = tenantSenderFrom(twilioTo, channel);

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
      return ack();
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
      // The reply now leaves over Twilio's REST API, so it needs a sender — and
      // the sender is the number this very request proves the customer texted.
      // With none resolvable the gate refuses (TENANT_SENDER_MISSING) rather
      // than letting the business be answered for by the platform line.
      outbound: { smsFrom },
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
      return ack();
    }

    // --- FILE IT AND CLAIM IT, BEFORE ANSWERING TWILIO. ---
    //
    // Two jobs in one call. The message reaches the business's Inbox
    // immediately, whatever happens to the model turn afterwards — and the claim
    // (the same stamp claimForReply writes) stops agent-catchup answering the
    // same text while this function is still composing. It expires after ten
    // minutes, which is exactly how a background turn that never finished gets
    // repaired rather than lost.
    //
    // This call also runs the provider-id dedupe: a Twilio redelivery of the
    // same MessageSid comes back `duplicate` and stops here, before a model turn
    // and before a second text.
    const filed = await callAgent({
      public_key: key,
      channel,
      record_only: true,
      claim: true,
      reason: "the agent is composing a reply",
      retryable: true,
      message: body,
      customer: { phone },
      ...(knownConversation ? { conversationId: knownConversation } : {}),
      inbound: { providerSid, meta: inboundMeta },
    });
    if (filed?.duplicate) {
      console.log(`[phoxta] twilio-inbound: ${providerSid} was already on the thread — Twilio redelivered it, nothing composed`);
      return ack();
    }
    const conversationId = String(filed?.conversationId ?? "") || knownConversation;
    // The row the whole outcome gets written onto. When the filing failed we
    // carry on WITHOUT it rather than dropping the customer: respondCore writes
    // its own row (and its own claim) in that case, so the message still reaches
    // the Inbox and still gets answered — it simply loses the head start.
    const filedRowId = String(filed?.messageId ?? "");
    if (!filedRowId) {
      console.error(`[phoxta] twilio-inbound: could not file ${providerSid} before composing — the reply will file it instead`);
    }

    /** Everything after the response to Twilio: the model turn and the send. */
    const composeAndSend = async (): Promise<void> => {
      /** Record on the customer's own row why no reply went out. Retryable
       *  refusals stay in agent-catchup's queue; settled ones do not. */
      const file = async (reason: string, retryable: boolean): Promise<void> => {
        if (filedRowId) await markNotAnswered(admin, orgId, filedRowId, inboundMeta, reason, retryable);
      };
      try {
        const data = await callAgent({
          public_key: key,
          channel,
          message: body,
          customer: { phone },
          ...(conversationId ? { conversationId } : {}),
          inbound: {
            providerSid,
            meta: inboundMeta,
            // Answer the row we just wrote — do not file the customer's words a
            // second time, and do not read them back to the model as history.
            ...(filedRowId ? { recorded: true, recordedId: filedRowId } : {}),
          },
        });

        // Six ways this turn ends without a reply on the wire. Each one leaves
        // the customer's row saying WHY, in words the owner can read in the
        // Inbox, and each one says honestly whether it is worth trying again.
        if (!data?.__ok) {
          // The model or the endpoint failed. Retryable on purpose: this is the
          // case agent-catchup exists for.
          return await file("the agent could not compose a reply just now — it stays in the queue and will be tried again", true);
        }
        // Recorded by the compose call itself (a redelivery it saw first), or by
        // agent-inbound writing the reason onto this very row.
        if (data?.duplicate || data?.throttled) return;
        if (data?.human) {
          // `autoReply` distinguishes the owner's switch (already written onto
          // this row by agent-inbound) from somebody pressing "Take over"
          // mid-turn, which is a promise of silence and is settled for the agent.
          if (!data?.autoReply) await file("a human has taken over this thread", false);
          return;
        }
        if (data?.capped) {
          return await file("this business has used its monthly AI allowance, so the agent stopped composing replies", true);
        }
        const reply = String(data?.reply ?? "").trim();
        if (!reply) return await file("the agent composed no reply", true);

        const convId = String(data?.conversationId ?? "") || conversationId;
        if (!convId) return await file("the agent answered without naming a conversation", true);

        // --- THE FUNNEL, and the only way a text leaves here. The switch, the
        //     per-thread ceiling, the texting burst window, the minimum spacing,
        //     the hourly throttle, the daily cap and human takeover are all
        //     re-checked at the moment of delivery; then the send, the delivery
        //     stamp on the agent's row, the reason on the customer's row when
        //     nothing goes out, and the audit line either way.
        //
        //     `smsFrom` is the business's own number, proven by the signature on
        //     the request this reply answers. Without it the funnel refuses
        //     rather than borrowing the platform line. ---
        await deliverAutoReply(admin, orgId, {
          channel,
          trigger: "twilio-inbound",
          conversationId: convId,
          to: phone,
          text: reply,
          agentMessageId: data?.agentMessageId ?? null,
          // Ours when we filed it; the compose call's own row when we could not.
          customerMessageId: filedRowId || (data?.customerMessageId ?? null),
          // The FULL inbound meta, not just the source: markNotAnswered and the
          // answered-stamp both rewrite the row's meta from this object, so
          // passing a thinner one would erase the business's own number from the
          // row and leave a later retry with no honest way to send.
          customerMeta: inboundMeta,
          template: data?.template ?? null,
          // The picture the agent deliberately chose, if it chose one. The funnel
          // decides whether it can be attached on this channel, whether the file
          // is one WhatsApp will take, and — when it cannot go — sends the reply
          // with a link rather than dropping either half.
          media: Array.isArray(data?.media) ? data.media : [],
          smsFrom,
          stampExtra: inboundMeta,
        });
      } catch (e) {
        // The customer must not be lost because this function fell over after it
        // had already answered Twilio. Retryable, so agent-catchup takes it.
        const why = String((e as Error)?.message || e);
        console.error("[phoxta] twilio-inbound: composing the reply failed:", why);
        await file(`the agent could not compose a reply just now (${why}) — it stays in the queue and will be tried again`, true)
          .catch(() => { /* the claim expires in ten minutes either way */ });
      }
    };

    await afterResponding(composeAndSend());
    return ack();
  } catch (e) {
    // Silence, for the same reason as every other failure above: an apology sent
    // from outside the funnel is a message with no ceiling behind it.
    console.error("[phoxta] twilio-inbound failed:", String((e as Error)?.message || e));
    return ack();
  }
});
