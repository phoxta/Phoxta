// Phoxta — ops-maintenance: scheduled housekeeping for the operating consoles.
// Cron-secret only (x-cron-secret = CRON_SECRET or BILLING_CRON_SECRET) — no
// user path. Currently runs app_expire_pending(): abandoned pending
// reservations/orders older than 24h are cancelled and their stock restored.
import { preflight, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const presented = req.headers.get("x-cron-secret");
    const cronSecrets = [Deno.env.get("CRON_SECRET"), Deno.env.get("BILLING_CRON_SECRET")].filter(Boolean);
    if (!presented || !cronSecrets.includes(presented)) return json({ error: "Cron only." }, 401);

    const admin = adminClient();
    const { data, error } = await admin.rpc("app_expire_pending");
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, ...(typeof data === "object" && data !== null ? data : { result: data }) });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
