// Phoxta — platform-lead: the marketing site's own lead capture.
// The /contact and /startup-school forms previously posted to '#' and dropped
// every submission. This function records the lead in platform_leads and
// emails it to the team (Resend), with a light abuse guard.
//
// A Startup School signup also gets a confirmation back. Someone who has just
// agreed to pay for a place and receives nothing has no way to tell whether the
// form worked, and the next thing they do is either fill it in again or give
// up — so the acknowledgement is part of the signup, not a nicety.
import { preflight, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { sendEmail } from "../_shared/dispatch.ts";

const NOTIFY_TO = Deno.env.get("PLATFORM_LEAD_EMAIL") ?? "femi@phoxta.com";
// Shares RESEND_REPLY_TO with _shared/dispatch so one change moves every
// reply address, and keeps PLATFORM_REPLY_EMAIL as an override for the one
// case that might reasonably differ.
const REPLY_TO = Deno.env.get("PLATFORM_REPLY_EMAIL") ?? Deno.env.get("RESEND_REPLY_TO") ?? "hello@phoxta.com";

// Keep in step with STARTUP_SCHOOL in src/lib/db/platformLead.ts. A Deno
// function cannot import from src/, so the price lives in two places; a price
// quoted differently in an email from the one on the page is the kind of
// mistake the customer finds rather than we do.
const SCHOOL = { price: "£500", duration: "2 weeks" };

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * What an applicant receives the moment they sign up.
 *
 * Deliberately plain: what they asked for, what it costs, what happens next,
 * and that nothing has been charged. The last line matters most — a signup that
 * states a price and then goes quiet reads like a payment they cannot find.
 */
function schoolConfirmation(name: string) {
  const hi = name ? `Hi ${esc(name.split(/\s+/)[0])},` : "Hi,";
  const lines = [
    `You're on the list for Phoxta Startup School.`,
    `<b>${SCHOOL.price} for ${SCHOOL.duration}.</b> Live sessions with mentors who have built and sold companies, covering strategy, finance, marketing and the AI tools that actually matter now — and you finish with a real business running, not a certificate.`,
    `<b>What happens next.</b> One of us will be in touch within one working day with the dates for the next cohort and how to pay. Nothing has been charged, and your place is held until you confirm.`,
    `If anything has changed, or you have a question first, just reply to this email — it comes straight to us.`,
  ];
  return {
    subject: "Your place at Phoxta Startup School",
    html: `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#14194e;max-width:560px">
      <p>${hi}</p>
      ${lines.map((l) => `<p>${l}</p>`).join("")}
      <p style="margin-top:24px">— The Phoxta team</p>
    </div>`,
    text: [
      hi, "",
      "You're on the list for Phoxta Startup School.",
      "",
      `${SCHOOL.price} for ${SCHOOL.duration}. Live sessions with mentors who have built and sold companies, covering strategy, finance, marketing and the AI tools that actually matter now - and you finish with a real business running, not a certificate.`,
      "",
      "What happens next. One of us will be in touch within one working day with the dates for the next cohort and how to pay. Nothing has been charged, and your place is held until you confirm.",
      "",
      "If anything has changed, or you have a question first, just reply to this email - it comes straight to us.",
      "",
      "- The Phoxta team",
    ].join("\n"),
  };
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCES = new Set(["contact", "startup-school", "careers", "other"]);

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = await req.json().catch(() => ({}));
    const source = SOURCES.has(String(body.source)) ? String(body.source) : "contact";
    const name = String(body.name ?? "").trim().slice(0, 120);
    const email = String(body.email ?? "").trim().slice(0, 200);
    const phone = String(body.phone ?? "").trim().slice(0, 40);
    const message = String(body.message ?? "").trim().slice(0, 4000);
    if (!EMAIL_RE.test(email)) return json({ error: "Enter a valid email address." }, 400);
    if (!message && source === "contact") return json({ error: "Add a short message." }, 400);
    if (source === "startup-school" && !name) return json({ error: "Tell us your name." }, 400);
    // Honeypot: bots fill every field — a non-empty "website" means spam.
    if (String(body.website ?? "").trim() !== "") return json({ ok: true });

    const admin = adminClient();
    // Abuse guard: cap identical-sender and total volume per hour.
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count: mine } = await admin
      .from("platform_leads").select("id", { count: "exact", head: true })
      .eq("email", email).gte("created_at", hourAgo);
    const { count: total } = await admin
      .from("platform_leads").select("id", { count: "exact", head: true })
      .gte("created_at", hourAgo);
    if ((mine ?? 0) >= 3 || (total ?? 0) >= 100) {
      return json({ ok: true }); // silently accept; nothing stored
    }

    // The row IS the lead. If it does not land there is nothing to follow up,
    // so this is the one step that must not fail quietly -- telling someone
    // "you're on the list" when no list exists is worse than an error, because
    // they stop trying.
    const { error: saveError } = await admin
      .from("platform_leads").insert({ source, name, email, phone, message });
    if (saveError) {
      console.error("platform-lead insert failed", saveError.message);
      return json({ error: "We could not record that just now — please email hello@phoxta.com and we'll sort it." }, 500);
    }

    // Best-effort notification — the row is the source of truth.
    await sendEmail({
      to: [NOTIFY_TO],
      subject: `New ${source} lead: ${name || email}`,
      html: `<p><b>Source:</b> ${source}</p><p><b>Name:</b> ${name}</p><p><b>Email:</b> ${email}</p><p><b>Phone:</b> ${phone}</p><p><b>Message:</b></p><p>${message.replace(/</g, "&lt;")}</p>`,
      text: `Source: ${source}\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\n\n${message}`,
      replyTo: email,
    }).catch((e) => console.error("team notification failed", e));

    // The applicant's own confirmation. Best effort, exactly like the team
    // notification: the row is the source of truth, and a mail provider having
    // a bad minute must not cost us the lead.
    if (source === "startup-school") {
      const mail = schoolConfirmation(name);
      await sendEmail({
        to: [email],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        // Replies go to a person, not to the no-reply sender the rest of the
        // platform's transactional mail uses.
        replyTo: REPLY_TO,
      })
        // Best effort by design: the lead is already saved and a mail provider
        // having a bad minute must not cost us it. Logged, though, because a
        // confirmation that silently never sends looks to the applicant exactly
        // like a form that silently never worked.
        .then((r) => { if (!r?.ok) console.error("confirmation not sent", email, r?.status); })
        .catch((e) => console.error("confirmation threw", email, e));
    }

    return json({ ok: true });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
