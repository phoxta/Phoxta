// Phoxta — unsubscribe: PUBLIC one-click opt-out endpoint (deployed with
// --no-verify-jwt). Linked from every campaign email/SMS footer and from the
// List-Unsubscribe header (RFC 8058 one-click POST).
//   GET/POST ?c=<contactId>&o=<orgId>&ch=email|sms
// Sets crm_contacts.email_opt_out / sms_opt_out for that contact in that org
// and shows a tiny confirmation page. Invalid params → 400.
import { adminClient } from "../_shared/supabaseAdmin.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function page(title: string, message: string, status = 200): Response {
  const html = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f6f6f4;color:#1a1a1a;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .card{background:#fff;border:1px solid #e6e6e2;border-radius:16px;padding:40px 32px;max-width:420px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.04)}
  h1{font-size:22px;margin:0 0 8px}
  p{font-size:15px;color:#666;margin:0;line-height:1.5}
</style></head><body>
<div class="card"><h1>${title}</h1><p>${message}</p></div>
</body></html>`;
  return new Response(html, { status, headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" } });
}

// The Supabase gateway forces text/plain + a sandbox CSP on function
// responses, so this HTML never renders as a page in a browser. The
// human-facing link in emails points at https://www.phoxta.com/unsubscribe,
// which calls this endpoint with json=1. The RFC 8058 one-click POST in the
// List-Unsubscribe header still targets this function directly — mail clients
// consume the response, they don't render it.
function apiJson(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET" && req.method !== "POST") {
    return page("Not allowed", "This link only supports GET or POST.", 405);
  }
  const wantsJson = new URL(req.url).searchParams.get("json") === "1";
  try {
    const url = new URL(req.url);
    const c = (url.searchParams.get("c") ?? "").trim();
    const o = (url.searchParams.get("o") ?? "").trim();
    const ch = (url.searchParams.get("ch") ?? "email").trim().toLowerCase();

    if (!UUID.test(c) || !UUID.test(o) || (ch !== "email" && ch !== "sms")) {
      if (wantsJson) return apiJson({ error: "This unsubscribe link is missing or malformed." }, 400);
      return page("Invalid link", "This unsubscribe link is missing or malformed. Please use the link from your message.", 400);
    }

    const admin = adminClient();
    const patch = ch === "sms" ? { sms_opt_out: true } : { email_opt_out: true };
    const { error } = await admin.from("crm_contacts").update(patch).eq("id", c).eq("organization_id", o);
    if (error) {
      if (wantsJson) return apiJson({ error: "We couldn't process your request." }, 500);
      return page("Something went wrong", "We couldn't process your request. Please try again later.", 500);
    }

    if (wantsJson) return apiJson({ ok: true, channel: ch });
    return page(
      "You're unsubscribed.",
      ch === "sms"
        ? "You won't receive any more marketing texts from this business."
        : "You won't receive any more marketing emails from this business.",
    );
  } catch {
    if (wantsJson) return apiJson({ error: "We couldn't process your request." }, 500);
    return page("Something went wrong", "We couldn't process your request. Please try again later.", 500);
  }
});
