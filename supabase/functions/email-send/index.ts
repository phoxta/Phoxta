// Phoxta — email-send: compose a NEW email or reply by email from the Inbox,
// with CC/BCC, an HTML body and attachments. Resolves/creates the email
// conversation, sends via Resend, and records the message. Member-authed.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { sendEmail, type EmailAttachment } from "../_shared/dispatch.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const list = (v: unknown): string[] =>
  (Array.isArray(v) ? v : String(v ?? "").split(/[,;]/)).map((s) => String(s).trim()).filter(Boolean);
const stripHtml = (h: string) => h.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const orgId = body?.organizationId;
    const to = list(body?.to);
    const cc = list(body?.cc);
    const bcc = list(body?.bcc);
    const subject = String(body?.subject ?? "").trim() || "(no subject)";
    const html = String(body?.html ?? "").trim();
    const attachments = (Array.isArray(body?.attachments) ? body.attachments : []) as EmailAttachment[];
    const conversationId = body?.conversationId as string | undefined;
    if (to.length === 0 || !html) return json({ error: "A recipient and a message are required." }, 400);

    const a = await authorize(req, orgId);
    if (a.error) return a.error;
    const { admin, org, userId } = a.ok;

    // Resolve (reply) or create (new) the email conversation.
    let convId = conversationId;
    if (!convId) {
      const { data: conv, error } = await admin
        .from("conversations")
        .insert({ organization_id: org.id, channel_type: "email", customer_email: to[0], customer_name: "", status: "open" })
        .select("id").single();
      if (error || !conv) return json({ error: "Could not start the conversation." }, 500);
      convId = (conv as Json).id;
    }

    const r = await sendEmail({ to, cc, bcc, subject, html, text: stripHtml(html), attachments });

    await admin.from("conversation_messages").insert({
      organization_id: org.id, conversation_id: convId, role: "human", channel_type: "email",
      body: stripHtml(html), author_id: userId, delivery_status: r.status,
      meta: { subject, cc, bcc, attachments: attachments.map((x) => x.filename) },
    });
    const now = new Date().toISOString();
    await admin.from("conversations").update({ last_message_at: now }).eq("id", convId);
    await admin.from("conversations").update({ first_response_at: now }).eq("id", convId).is("first_response_at", null);

    if (!r.ok && r.status !== "simulated") return json({ ok: false, conversationId: convId, error: r.error ?? "Email could not be sent." }, 200);
    return json({ ok: true, conversationId: convId, status: r.status });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
