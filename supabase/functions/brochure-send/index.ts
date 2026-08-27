// Phoxta — brochure-send: send the Phoxta brochure to an address.
//
// The brochure is the one email nobody asked for, so it gets its own door with
// its own lock rather than riding on a transactional function. Two ways in:
//
//   x-brochure-secret        matching BROCHURE_SECRET — for the team, and for
//                            sending yourself a copy before a campaign.
//   a platform_leads row     someone who filled a form and ticked to hear more;
//                            the address must already be in the table, so this
//                            endpoint can never be pointed at a list it was not
//                            given.
//
// It will not send to an address that has unsubscribed, and it records every
// send, because a brochure that goes out twice to the same person is worse than
// one that never went at all.
import { preflight, json } from "../_shared/cors.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { phoxtaBrochure, BROCHURE_SUBJECT } from "../../../packages/email/src/brochure.ts";

const env = (k: string) => Deno.env.get(k);

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = await req.json().catch(() => ({}));
    const to = String((body as { to?: unknown })?.to ?? "").trim().toLowerCase();
    if (!to || !to.includes("@")) return json({ error: "A recipient is required." }, 400);

    const secret = env("BROCHURE_SECRET");
    const authorised = Boolean(secret) && req.headers.get("x-brochure-secret") === secret;

    const admin = createClient(env("SUPABASE_URL")!, env("SUPABASE_SERVICE_ROLE_KEY")!);

    if (!authorised) {
      // No secret: the address has to have come to us first.
      const { data } = await admin.from("platform_leads").select("id").eq("email", to).limit(1);
      if (!data || data.length === 0) return json({ error: "Not authorised for this address." }, 403);
    }

    const { data: gone, error: goneErr } = await admin.from("platform_optouts").select("email").eq("email", to).limit(1);
    // A suppression check that fails open is not a suppression check. If the
    // list cannot be read, nothing goes out.
    if (goneErr) return json({ error: "Could not check the opt-out list." }, 500);
    if (gone && gone.length > 0) return json({ ok: false, skipped: "opted out" }, 200);

    const force = (body as { force?: unknown })?.force === true;
    const { data: already } = await admin.from("platform_brochure_sends").select("sent_at").eq("email", to).limit(1);
    if (!force && already && already.length > 0) {
      return json({ ok: false, skipped: "already sent", at: already[0].sent_at }, 200);
    }

    const key = env("RESEND_API_KEY");
    const from = env("RESEND_FROM");
    if (!key || !from) return json({ error: "Email is not configured." }, 500);

    const { html, text } = phoxtaBrochure();
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to, subject: BROCHURE_SUBJECT,
        reply_to: env("RESEND_REPLY_TO") || "hello@phoxta.com",
        html, text,
      }),
    });
    const detail = await res.json().catch(() => ({}));
    // Resend answers 200 with an id, or 4xx with a reason. Returning the reason
    // is the whole point: the last round of these failed silently.
    if (!res.ok) return json({ ok: false, status: res.status, error: detail }, 200);

    const id = (detail as { id?: string })?.id ?? "";
    await admin.from("platform_brochure_sends").insert({ email: to, resend_id: id });
    return json({ ok: true, id });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
