// Phoxta — conversation-send: a human (or the owner) replies inside the Inbox
// and the message is actually DELIVERED over the conversation's own channel
// (SMS / WhatsApp / email), or recorded as a private internal note. Enforces the
// WhatsApp 24-hour customer-service window (free-form only inside it; a template
// is required outside — Twilio error 63016) and tracks delivery status.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { twilioSend } from "../_shared/dispatch.ts";
import { dispatch } from "../_shared/dispatch.ts";

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
    if (!conversationId || !text) return json({ error: "Nothing to send." }, 400);

    const a = await authorize(req, orgId);
    if (a.error) return a.error;
    const { admin, userId, org } = a.ok;

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
      await admin.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
      return json({ ok: true, role: "note" });
    }

    const channel = (body?.channel || c.channel_type || "web") as string;
    let delivery_status = "sent";
    let provider_sid = "";
    let windowClosed = false;

    if (channel === "sms" || channel === "whatsapp") {
      if (!c.customer_phone) return json({ error: "No phone number on file for this contact." }, 400);

      // WhatsApp 24-hour window guardrail: outside it, a free-form message is
      // rejected (63016) — require an approved template instead. A template
      // (ContentSid) is allowed any time, so it bypasses the check.
      if (channel === "whatsapp" && !contentSid) {
        const { data: lastIn } = await admin
          .from("conversation_messages")
          .select("created_at")
          .eq("conversation_id", conversationId).eq("role", "customer")
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        const lastMs = lastIn ? Date.now() - new Date((lastIn as Json).created_at).getTime() : Infinity;
        if (lastMs > WA_WINDOW_MS) {
          return json({ ok: false, windowClosed: true, error: "Outside the WhatsApp 24-hour window. Send an approved template message instead." }, 200);
        }
      }

      const r = await twilioSend(channel as "sms" | "whatsapp", c.customer_phone, text, contentSid ? { contentSid, contentVariables: variables } : undefined);
      delivery_status = r.status;
      provider_sid = r.sid ?? "";
      if (r.errorCode === 63016) windowClosed = true;
      if (!r.ok && r.status !== "simulated") {
        return json({ ok: false, windowClosed, error: r.errorMessage || "Message could not be delivered.", code: r.errorCode }, 200);
      }
    } else if (channel === "email") {
      if (!c.customer_email) return json({ error: "No email on file for this contact." }, 400);
      const r = await dispatch("email", c.customer_email, `Reply from ${org.name}`, text);
      delivery_status = r.status;
      if (r.status === "failed") return json({ ok: false, error: "Email could not be sent." }, 200);
    } else {
      // web (chat widget) — recorded here; the widget renders it on next poll.
      delivery_status = "sent";
    }

    await admin.from("conversation_messages").insert({
      organization_id: orgId, conversation_id: conversationId, role: "human",
      channel_type: channel, body: text, author_id: userId,
      delivery_status, provider_sid,
    });
    await admin.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
    await admin.from("conversations").update({ first_response_at: new Date().toISOString() }).eq("id", conversationId).is("first_response_at", null);

    return json({ ok: true, delivery_status, windowClosed });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
