// Phoxta — commerce-notify: a member sends the customer a transactional email
// about their order / reservation / booking / invoice.
//   { orgId, kind, orderId?, reservationId?, bookingId?, invoiceId?,
//     tracking?, subject?, message? }
//   kind: order_fulfilled | order_cancelled | reservation_confirmed |
//         reservation_cancelled | booking_confirmed | booking_cancelled |
//         invoice_reminder
// → { ok, delivery: 'sent' | 'no-email' | 'failed' }
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { sendEmail } from "../_shared/dispatch.ts";
import { orgReplyTo } from "../_shared/conversationEmail.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const KINDS = [
  "order_fulfilled", "order_cancelled",
  "reservation_confirmed", "reservation_cancelled",
  "booking_confirmed", "booking_cancelled",
  "invoice_reminder",
] as const;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function money(cents: number, currency: string): string {
  const cur = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(cents / 100);
  } catch {
    return `${cur} ${(cents / 100).toFixed(2)}`;
  }
}

function fmtDate(d: string): string {
  try {
    return new Date(d.length <= 10 ? `${d}T00:00:00Z` : d).toLocaleDateString("en-US", {
      weekday: "short", year: "numeric", month: "short", day: "numeric",
      timeZone: d.length <= 10 ? "UTC" : undefined,
    });
  } catch {
    return d;
  }
}

function fmtDateTime(d: string): string {
  try {
    return new Date(d).toLocaleString("en-US", {
      weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
  } catch {
    return d;
  }
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const orgId = body?.orgId;
    const kind = String(body?.kind ?? "");
    if (!KINDS.includes(kind as typeof KINDS[number])) return json({ error: "Unknown notification kind." }, 400);

    const a = await authorize(req, orgId);
    if (a.error) return a.error;
    const { admin, org } = a.ok;

    const { data: orgRow } = await admin.from("organizations").select("name, currency").eq("id", orgId).maybeSingle();
    const business = (orgRow as Json)?.name || org.name || "Your business";
    const orgCurrency = (orgRow as Json)?.currency || "USD";

    let to = "";
    let customer = "";
    let subject = "";
    const lines: string[] = [];

    if (kind === "order_fulfilled" || kind === "order_cancelled") {
      if (!body?.orderId) return json({ error: "Missing orderId." }, 400);
      const { data: ord } = await admin
        .from("orders")
        .select("id, customer_name, customer_email, total_cents, currency, tracking")
        .eq("id", body.orderId).eq("organization_id", orgId).maybeSingle();
      if (!ord) return json({ error: "Order not found." }, 404);
      const o = ord as Json;
      to = o.customer_email || "";
      customer = o.customer_name || "";
      const currency = o.currency || orgCurrency;

      if (kind === "order_fulfilled") {
        subject = `Your order from ${business} is on its way`;
        lines.push("Good news — your order has been fulfilled.");
        const { data: items } = await admin
          .from("order_items")
          .select("name, quantity, unit_price_cents")
          .eq("order_id", o.id);
        const its = (items as Json[]) ?? [];
        if (its.length) {
          lines.push("");
          lines.push("Your order:");
          for (const it of its) {
            lines.push(`  • ${it.name} × ${it.quantity} — ${money((Number(it.unit_price_cents) || 0) * (Number(it.quantity) || 1), currency)}`);
          }
          lines.push(`Total: ${money(Number(o.total_cents) || 0, currency)}`);
        }
        const tracking = String(body?.tracking || o.tracking || "").trim();
        if (tracking) {
          lines.push("");
          lines.push(`Tracking: ${tracking}`);
        }
      } else {
        subject = `Your order from ${business} has been cancelled`;
        lines.push("Your order has been cancelled.");
        lines.push("If you already paid, your refund is on its way. Reply to this email if you have any questions.");
      }
    } else if (kind === "reservation_confirmed" || kind === "reservation_cancelled") {
      if (!body?.reservationId) return json({ error: "Missing reservationId." }, 400);
      const { data: resv } = await admin
        .from("reservations")
        .select("id, customer_name, customer_email, start_date, end_date, units, total_cents, currency")
        .eq("id", body.reservationId).eq("organization_id", orgId).maybeSingle();
      if (!resv) return json({ error: "Reservation not found." }, 404);
      const rv = resv as Json;
      to = rv.customer_email || "";
      customer = rv.customer_name || "";
      const when = `${fmtDate(String(rv.start_date))} → ${fmtDate(String(rv.end_date))}`;
      if (kind === "reservation_confirmed") {
        subject = `Your reservation with ${business} is confirmed`;
        lines.push("Your reservation is confirmed. Here are the details:");
        lines.push("");
        lines.push(`Dates: ${when}`);
        if (Number(rv.total_cents) > 0) lines.push(`Total: ${money(Number(rv.total_cents), rv.currency || orgCurrency)}`);
        lines.push("");
        lines.push("We look forward to seeing you.");
      } else {
        subject = `Your reservation with ${business} has been cancelled`;
        lines.push(`Your reservation (${when}) has been cancelled.`);
        lines.push("If you already paid, your refund is on its way. Reply to this email if you have any questions.");
      }
    } else if (kind === "booking_confirmed" || kind === "booking_cancelled") {
      if (!body?.bookingId) return json({ error: "Missing bookingId." }, 400);
      const { data: bk } = await admin
        .from("bookings")
        .select("id, customer_name, customer_email, start_at")
        .eq("id", body.bookingId).eq("organization_id", orgId).maybeSingle();
      if (!bk) return json({ error: "Booking not found." }, 404);
      const b = bk as Json;
      to = b.customer_email || "";
      customer = b.customer_name || "";
      const when = fmtDateTime(String(b.start_at));
      if (kind === "booking_confirmed") {
        subject = `Your appointment with ${business} is confirmed`;
        lines.push("Your appointment is confirmed.");
        lines.push("");
        lines.push(`When: ${when}`);
        lines.push("");
        lines.push("We look forward to seeing you.");
      } else {
        subject = `Your appointment with ${business} has been cancelled`;
        lines.push(`Your appointment on ${when} has been cancelled.`);
        lines.push("Reply to this email if you'd like to rebook.");
      }
    } else {
      // invoice_reminder
      if (!body?.invoiceId) return json({ error: "Missing invoiceId." }, 400);
      const { data: inv } = await admin
        .from("invoices")
        .select("id, number, customer_name, customer_email, total_cents, currency, due_date, status")
        .eq("id", body.invoiceId).eq("organization_id", orgId).maybeSingle();
      if (!inv) return json({ error: "Invoice not found." }, 404);
      const i = inv as Json;
      to = i.customer_email || "";
      customer = i.customer_name || "";
      subject = String(body?.subject || "").trim() ||
        `Reminder: invoice ${i.number || ""} from ${business}`.replace("  ", " ");
      const custom = String(body?.message || "").trim();
      if (custom) {
        lines.push(custom);
      } else {
        lines.push(`This is a friendly reminder that invoice ${i.number || ""} for ${money(Number(i.total_cents) || 0, i.currency || orgCurrency)} is ${i.due_date ? `due ${fmtDate(String(i.due_date))}` : "awaiting payment"}.`);
        lines.push("");
        lines.push("Reply to this email if you have any questions.");
      }
    }

    if (!to) return json({ ok: true, delivery: "no-email" });

    // A caller-provided subject/message overrides the composed default.
    if (body?.subject && kind !== "invoice_reminder") subject = String(body.subject).trim() || subject;
    if (body?.message && kind !== "invoice_reminder") {
      lines.length = 0;
      lines.push(String(body.message).trim());
    }

    const text = [customer ? `Hi ${customer},` : "Hi,", "", ...lines, "", `— ${business}`].join("\n");
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#222">${
      text.split("\n").map((l) => (l ? `<p style="margin:0 0 4px">${esc(l)}</p>` : "<br/>")).join("")
    }</div>`;

    // WHERE THE CUSTOMER'S REPLY LANDS. This mail is signed "— <business>" and
    // the invoice reminder says "Reply to this email if you have any questions",
    // yet sendEmail's default Reply-To is hello@phoxta.com — so those questions
    // went to Phoxta, whose own agent then answers another company's customer.
    // No tenant address, no send: an order or invoice mail the customer cannot
    // answer is worse than one the console reports as undeliverable.
    const replyTo = await orgReplyTo(admin, org.id);
    if (!replyTo) return json({ ok: true, delivery: "no-reply-address" });
    const r = await sendEmail({ to: [to], subject, html, text, replyTo });
    // "simulated" (no email keys configured) counts as sent so the console
    // flow stays exercisable in development.
    return json({ ok: true, delivery: r.ok || r.status === "simulated" ? "sent" : "failed" });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
