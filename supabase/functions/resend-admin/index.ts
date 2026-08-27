// Phoxta — resend-admin: a narrow window onto the Resend domains API.
//
// TEMPORARY, AND DELIBERATELY SO. Moving the sending identity from
// hello@send.phoxta.com to hello@phoxta.com needs the root domain verified in
// Resend, which is an admin-API operation. RESEND_API_KEY lives as a Supabase
// secret and should stay there — pasting it into a terminal, a chat or a local
// .env is how keys end up in scrollback and shell history.
//
// So the key never moves. This function reads it from the environment it
// already lives in, exposes exactly four read/verify operations, and is deleted
// once the cutover is done. It cannot send mail and cannot delete a domain.
//
// Gated on the cron secret, which is the strongest credential that is already
// provisioned to a machine rather than a person.
import { preflight, json } from "../_shared/cors.ts";

const API = "https://api.resend.com";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const presented = req.headers.get("x-cron-secret");
  const secrets = [Deno.env.get("CRON_SECRET"), Deno.env.get("BILLING_CRON_SECRET")].filter(Boolean);
  if (!presented || !secrets.includes(presented)) return json({ error: "Not permitted." }, 403);

  // A SEPARATE key from the one that sends mail. RESEND_API_KEY is restricted
  // to sending -- Resend refuses domain operations on it with
  // "restricted_api_key" -- so the cutover needs a full-access key. Keeping it
  // under its own name means it can be revoked the moment this is done without
  // touching the key every tenant's mail depends on.
  const key = Deno.env.get("RESEND_ADMIN_KEY");
  if (!key) {
    return json({
      error: "RESEND_ADMIN_KEY is not set. Create a full-access key in Resend and add it with: npx supabase secrets set RESEND_ADMIN_KEY=...",
    }, 503);
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "list");

  const call = async (path: string, init?: RequestInit) => {
    const r = await fetch(`${API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const text = await r.text();
    let parsed: unknown = text;
    try { parsed = JSON.parse(text); } catch { /* keep the raw body */ }
    return json({ status: r.status, body: parsed }, 200);
  };

  // Every branch is explicit. A generic passthrough would make this a way to
  // drive the whole Resend account with a cron secret, which is not what it is
  // for and not what it should survive as if anyone forgets to delete it.
  if (action === "list") return call("/domains");
  if (action === "get") return call(`/domains/${encodeURIComponent(String(body.id ?? ""))}`);
  if (action === "create") {
    const name = String(body.name ?? "").trim();
    if (!name) return json({ error: "Which domain?" }, 400);
    return call("/domains", { method: "POST", body: JSON.stringify({ name, region: String(body.region ?? "us-east-1") }) });
  }
  if (action === "verify") return call(`/domains/${encodeURIComponent(String(body.id ?? ""))}/verify`, { method: "POST" });

  return json({ error: "Unknown action." }, 400);
});
