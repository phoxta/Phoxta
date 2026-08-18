// Phoxta — ticket-reply: helpdesk replies now actually reach the customer.
// Previously ticket replies were stored in ticket_messages and delivered
// nowhere. This member-authed function stores the reply AND emails it to the
// ticket's customer (Resend), optionally resolving the ticket.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { sendEmail } from "../_shared/dispatch.ts";

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = await req.json().catch(() => ({}));
    const a = await authorize(req, body.orgId);
    if (a.error) return a.error;
    const { admin, org } = a.ok;

    const ticketId = String(body.ticketId ?? "");
    const message = String(body.message ?? "").trim();
    const resolve = body.resolve === true;
    const asAi = body.asAi === true;
    if (!ticketId || !message) return json({ error: "A ticket and a message are required." }, 400);

    const { data: ticket } = await admin
      .from("tickets")
      .select("id, subject, customer_name, customer_email, status")
      .eq("id", ticketId).eq("organization_id", org.id).maybeSingle();
    if (!ticket) return json({ error: "Ticket not found." }, 404);

    const { error: storeErr } = await admin.from("ticket_messages").insert({
      organization_id: org.id,
      ticket_id: ticket.id,
      author: asAi ? "ai" : "agent",
      body: message,
    });
    if (storeErr) return json({ error: `Could not store the reply: ${storeErr.message}` }, 500);

    let delivery = "no-email";
    if (ticket.customer_email) {
      const subject = ticket.subject ? `Re: ${ticket.subject}` : `Update from ${org.name}`;
      const r = await sendEmail({
        to: [ticket.customer_email],
        subject,
        html: `<p>${message.replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</p><p>— ${org.name}</p>`,
        text: `${message}\n\n— ${org.name}`,
      });
      delivery = r.ok ? "sent" : r.status;
    }

    if (resolve) {
      await admin.from("tickets").update({ status: "resolved", ...(asAi ? { ai_deflected: true } : {}) }).eq("id", ticket.id);
    } else if (ticket.status === "open") {
      await admin.from("tickets").update({ status: "pending" }).eq("id", ticket.id);
    }

    return json({ ok: true, delivery });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
