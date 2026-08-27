// Phoxta — conversation-send: a human (or the owner) replies inside the Inbox
// and the message is actually DELIVERED over the conversation's own channel
// (SMS / WhatsApp / email), or recorded as a private internal note. Enforces the
// WhatsApp 24-hour customer-service window (free-form only inside it; a template
// is required outside — Twilio error 63016) and tracks delivery status.
//
// ── WHOSE NUMBER A HUMAN'S REPLY COMES FROM ─────────────────────────────────
// The same question the agent's own replies answer, on the same threads, and it
// had the same wrong answer here for longer: this function passed no `from` at
// all, so twilioSend fell through to the platform-wide TWILIO_FROM. On a thread
// where the agent now correctly answers from the business's own number, the
// customer saw two different senders in one conversation — and their reply to
// the second landed on the Phoxta line, whose webhook is
// twilio-inbound?key=<Phoxta's own agent key>, i.e. in ANOTHER business's Inbox.
//
// tenantSmsFrom reads the business's own number off the thread: it is the `To`
// of the inbound message Twilio signed, recorded as meta.twilio_to by
// twilio-inbound. When a thread carries none — an outbound-only conversation
// nobody has ever texted in on — the send is REFUSED and the person is told why.
// A message from the wrong company is worse than a message not sent, and this is
// a person at a keyboard who can act on the explanation.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { twilioSend, twilioStatusCallback } from "../_shared/dispatch.ts";
import { sendConversationEmail } from "../_shared/conversationEmail.ts";
import { tenantSmsFrom } from "../_shared/autoReply.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const WA_WINDOW_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const orgId = body?.organizationId;
    const conversationId = body?.conversationId;
    const text = (body?.body ?? "").toString().trim();
    const internal = !!body?.internal;
    // Pre-approved WhatsApp template send (ContentSid + variables) — allowed
    // outside the 24h window; `text` is the rendered body, recorded for display.
    const contentSid = body?.contentSid ? String(body.contentSid) : undefined;
    const variables = (body?.variables ?? {}) as Record<string, string>;
    const subject = body?.subject ? String(body.subject) : "";
    if (!conversationId || !text) return json({ error: "Nothing to send." }, 400);

    const a = await authorize(req, orgId);
    if (a.error) return a.error;
    const { admin, userId } = a.ok;

    const { data: conv } = await admin
      .from("conversations")
      .select("id, channel_type, customer_phone, customer_email, first_response_at")
      .eq("id", conversationId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (!conv) return json({ error: "Conversation not found." }, 404);
    const c = conv as Json;

    // --- Internal note: private, never delivered to the customer. ---
    if (internal) {
      await admin.from("conversation_messages").insert({
        organization_id: orgId, conversation_id: conversationId, role: "note",
        channel_type: c.channel_type, body: text, author_id: userId,
      });
      await admin.from("conversations").update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId).eq("organization_id", orgId);
      return json({ ok: true, role: "note" });
    }

    const channel = (body?.channel || c.channel_type || "web") as string;
    let delivery_status = "sent";
    let provider_sid = "";
    let windowClosed = false;

    if (channel === "sms" || channel === "whatsapp") {
      if (!c.customer_phone) return json({ error: "No phone number on file for this contact." }, 400);

      // THE BUSINESS'S OWN NUMBER, or nothing. See the header comment.
      const from = await tenantSmsFrom(admin, orgId, conversationId, channel);
      if (!from) {
        return json({
          ok: false,
          error:
            channel === "whatsapp"
              ? "This thread has no record of which of your WhatsApp numbers the customer messaged, so a reply would go out from Phoxta's shared number and their answer would land in someone else's inbox. Ask them to send one message first, then reply here."
              : "This thread has no record of which of your numbers the customer texted, so a reply would go out from Phoxta's shared number and their answer would land in someone else's inbox. Ask them to text you first, then reply here.",
        }, 200);
      }

      // WhatsApp 24-hour window guardrail: outside it, a free-form message is
      // rejected (63016) — require an approved template instead. A template
      // (ContentSid) is allowed any time, so it bypasses the check.
      if (channel === "whatsapp" && !contentSid) {
        const { data: lastIn } = await admin
          .from("conversation_messages")
          .select("created_at")
          .eq("organization_id", orgId)
          .eq("conversation_id", conversationId).eq("role", "customer")
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        const lastMs = lastIn ? Date.now() - new Date((lastIn as Json).created_at).getTime() : Infinity;
        if (lastMs > WA_WINDOW_MS) {
          return json({ ok: false, windowClosed: true, error: "Outside the WhatsApp 24-hour window. Send an approved template message instead." }, 200);
        }
      }

      const r = await twilioSend(channel as "sms" | "whatsapp", c.customer_phone, text, {
        from,
        ...(contentSid ? { contentSid, contentVariables: variables } : {}),
        // Twilio answers 201 `queued` and reports the real outcome minutes later.
        // The row is written below, AFTER the send, so this callback carries only
        // the organisation: twilio-status matches on the message SID, which is
        // exactly what provider_sid holds. An early `queued` callback that beats
        // the insert simply finds nothing and is logged; the ones that matter —
        // `delivered`, `failed`, `undelivered` — arrive long afterwards.
        statusCallback: twilioStatusCallback({ orgId: String(orgId), channel }),
      });
      delivery_status = r.status;
      provider_sid = r.sid ?? "";
      if (r.errorCode === 63016) windowClosed = true;
      if (!r.ok && r.status !== "simulated") {
        return json({ ok: false, windowClosed, error: r.errorMessage || "Message could not be delivered.", code: r.errorCode }, 200);
      }
    } else if (channel === "email") {
      if (!c.customer_email) return json({ error: "No email on file for this contact." }, 400);
      // The same sender the AI uses, for the same reason: a thread that arrived
      // in the business's connected mailbox is answered FROM that mailbox and
      // inside that thread. Replying through the platform's own domain meant the
      // customer saw a reply from an address they had never written to, on a new
      // thread, with their next reply landing in Phoxta's mailbox rather than
      // the business's.
      const r = await sendConversationEmail(admin, orgId, {
        conversationId,
        to: c.customer_email,
        // No subject typed in the composer means "carry on this thread": the
        // helper uses the thread's own subject, so a customer whose email was
        // "Order #4471 — wrong size delivered" gets a reply with that subject
        // rather than a bare "Reply from <business>" opening a new thread.
        subject: subject || undefined,
        text,
      });
      delivery_status = r.status;
      provider_sid = r.id;
      if (r.status === "failed") return json({ ok: false, error: r.error ?? "Email could not be sent." }, 200);
    } else {
      // web (chat widget) — recorded here; the widget renders it on next poll.
      delivery_status = "sent";
    }

    await admin.from("conversation_messages").insert({
      organization_id: orgId, conversation_id: conversationId, role: "human",
      channel_type: channel, body: text, author_id: userId,
      delivery_status, provider_sid,
    });
    // Org-scoped like every other query here: this runs on the service-role key,
    // where a conversation id alone is enough to write to any tenant's row.
    await admin.from("conversations").update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId).eq("organization_id", orgId);
    await admin.from("conversations").update({ first_response_at: new Date().toISOString() })
      .eq("id", conversationId).eq("organization_id", orgId).is("first_response_at", null);

    return json({ ok: true, delivery_status, windowClosed });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
