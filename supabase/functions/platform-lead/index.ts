// Phoxta — platform-lead: the marketing site's own lead capture.
// The /contact and /startup-school forms previously posted to '#' and dropped
// every submission. This function records the lead in platform_leads and
// emails it to the team (Resend), with a light abuse guard.
import { preflight, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { sendEmail } from "../_shared/dispatch.ts";

const NOTIFY_TO = Deno.env.get("PLATFORM_LEAD_EMAIL") ?? "femi@phoxta.com";
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

    await admin.from("platform_leads").insert({ source, name, email, phone, message });

    // Best-effort notification — the row is the source of truth.
    await sendEmail({
      to: [NOTIFY_TO],
      subject: `New ${source} lead: ${name || email}`,
      html: `<p><b>Source:</b> ${source}</p><p><b>Name:</b> ${name}</p><p><b>Email:</b> ${email}</p><p><b>Phone:</b> ${phone}</p><p><b>Message:</b></p><p>${message.replace(/</g, "&lt;")}</p>`,
      text: `Source: ${source}\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\n\n${message}`,
      replyTo: email,
    }).catch(() => {});

    return json({ ok: true });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
