// Phoxta — twilio-status: what actually happened to a message we sent.
//
// ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
// Twilio's REST API answers HTTP 201 with status `queued`. That is an
// acknowledgement that Twilio took the message, and nothing more. Almost every
// failure that matters to a real customer is reported LATER, on the message
// resource, and only to a StatusCallback:
//
//   30007  the mobile carrier filtered it as spam — the commonest silent failure
//   30003  the handset could not be reached
//   30006  it was a landline
//   63016  WhatsApp's 24-hour window had closed
//
// Until this endpoint existed, all of those looked like success. The agent's row
// was stamped `sent`, the customer's row was stamped `answered: true`, and
// agent-catchup treats answered:true as SETTLED FOREVER — so the one worker
// whose whole job is to repair an unanswered message ruled it out permanently.
// The console showed the owner a delivered reply their customer never received,
// and nothing retried.
//
// ── HOW IT IS AUTHENTICATED ─────────────────────────────────────────────────
// verify_jwt is declared false in supabase/config.toml (never pass
// --no-verify-jwt, which sets it permanently), so this endpoint is reachable by
// anyone — exactly like twilio-inbound. Every request is therefore authenticated
// against Twilio's X-Twilio-Signature: an HMAC-SHA1 over the full URL plus every
// POST parameter, keyed by TWILIO_AUTH_TOKEN. Without it, a stranger could mark
// a business's delivered replies as failed and drive re-sends on that business's
// bill.
//
// verifyTwilioSignature (see _shared/webhooks.ts) tries several reconstructions
// of the URL because the Supabase gateway strips `/functions/v1` before the
// function runs — the string Twilio signed is not the string this function sees.
// Set TWILIO_WEBHOOK_BASE when a proxy rewrites the host.
//
// ── WHAT IT DOES ────────────────────────────────────────────────────────────
// The callback URL carries the ids the send already knew: the organisation, the
// row holding our message, and — for an automatic reply — the customer's own row.
// So there is no lookup to get wrong and no cross-tenant guessing: every query
// behind this is scoped to the organisation named on a URL Twilio signed.
//
// A success is recorded (the Inbox finally shows a real delivered tick). A
// failure is corrected: the reply row reads `failed`, the customer's row goes
// back into the queue with the carrier's reason on it in plain words, and a
// failure that retrying cannot fix is handed to a person instead.
//
// It always answers 204. Twilio retries a callback that does not answer 2xx, and
// a retry storm on a status report helps nobody — the log line is where a
// problem here belongs.
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { verifyTwilioSignature } from "../_shared/webhooks.ts";
import { applyTwilioDeliveryUpdate } from "../_shared/autoReply.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Received, nothing to say. */
const ack = (): Response => new Response(null, { status: 204 });

Deno.serve(async (req) => {
  try {
    const form = await req.formData().catch(() => null);
    // Authenticate before touching the database. A status callback carries no
    // secret of its own; the signature over the URL and the parameters is the
    // whole proof.
    if (!form || !(await verifyTwilioSignature(req, form))) {
      return new Response("Forbidden", { status: 403 });
    }

    const url = new URL(req.url);
    const orgId = String(url.searchParams.get("org") ?? "").trim();
    // Shaped like a uuid before it reaches a query. The signature already proves
    // the caller, but a malformed id turns a scoped read into a PostgREST error
    // rather than an empty result, and this endpoint must never throw.
    if (!UUID_RE.test(orgId)) {
      console.error("[phoxta] twilio-status: the callback URL named no usable organisation");
      return ack();
    }
    const messageId = String(url.searchParams.get("m") ?? "").trim();
    const customerMessageId = String(url.searchParams.get("c") ?? "").trim();
    const channelParam = String(url.searchParams.get("ch") ?? "").trim();

    const sid = form.get("MessageSid")?.toString() ?? form.get("SmsSid")?.toString() ?? "";
    const status = (form.get("MessageStatus")?.toString() ?? form.get("SmsStatus")?.toString() ?? "").toLowerCase();
    const rawCode = form.get("ErrorCode")?.toString() ?? "";
    const errorCode = Number(rawCode);
    // WhatsApp callbacks carry `whatsapp:` on both ends; the channel is also on
    // the URL because a template send names it there. Either is enough.
    const to = form.get("To")?.toString() ?? "";
    const channel = channelParam || (to.startsWith("whatsapp:") ? "whatsapp" : "sms");

    if (!status) return ack();

    const result = await applyTwilioDeliveryUpdate(adminClient(), orgId, {
      sid,
      status,
      ...(Number.isFinite(errorCode) && errorCode > 0 ? { errorCode } : {}),
      channel,
      ...(UUID_RE.test(messageId) ? { messageId } : {}),
      ...(UUID_RE.test(customerMessageId) ? { customerMessageId } : {}),
    });
    // One line per report that changed something, and one per report that could
    // not be matched — the two questions anybody debugging silent non-delivery
    // actually asks.
    if (result.applied) console.log(`[phoxta] twilio-status ${sid || messageId}: ${result.note}`);
    else console.warn(`[phoxta] twilio-status ${sid || messageId} not applied: ${result.note}`);
    return ack();
  } catch (e) {
    console.error("[phoxta] twilio-status failed:", String((e as Error)?.message || e));
    return ack();
  }
});
