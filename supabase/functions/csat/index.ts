// Phoxta — csat: PUBLIC customer-satisfaction survey (deployed with
// --no-verify-jwt). Linked from post-conversation follow-ups.
//   GET ?cv=<conversationId>           → rating page (five big 1–5 buttons)
//   GET ?cv=<conversationId>&s=1..5    → records the score, thanks the customer
// Writes conversations.csat_score + csat_source='customer' and clears
// csat_requested. Invalid params → 400.
import { adminClient } from "../_shared/supabaseAdmin.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STYLE = `
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f6f6f4;color:#1a1a1a;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .card{background:#fff;border:1px solid #e6e6e2;border-radius:16px;padding:40px 32px;max-width:460px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.04)}
  h1{font-size:22px;margin:0 0 8px}
  p{font-size:15px;color:#666;margin:0 0 24px;line-height:1.5}
  .row{display:flex;gap:10px;justify-content:center}
  .row a{display:flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:12px;border:1px solid #d9d9d4;background:#fafaf8;color:#1a1a1a;font-size:20px;font-weight:600;text-decoration:none}
  .row a:hover{background:#111;color:#fff;border-color:#111}
  .scale{display:flex;justify-content:space-between;max-width:340px;margin:10px auto 0;font-size:12px;color:#999}
`;

function page(body: string, title: string, status = 200): Response {
  const html = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>${STYLE}</style></head><body>
<div class="card">${body}</div>
</body></html>`;
  return new Response(html, { status, headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" } });
}

// The Supabase gateway forces text/plain + a sandbox CSP on every function
// response, so HTML served from *.supabase.co renders as raw markup in a
// browser. The customer-facing page therefore lives on the Phoxta domain
// (/rate) and calls this endpoint with json=1; the HTML below stays as a
// fallback for anyone hitting the raw URL.
function apiJson(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") {
    return page("<h1>Not allowed</h1><p>This link only supports GET.</p>", "Not allowed", 405);
  }
  try {
    const url = new URL(req.url);
    const wantsJson = url.searchParams.get("json") === "1";
    const cv = (url.searchParams.get("cv") ?? "").trim();
    const s = (url.searchParams.get("s") ?? "").trim();

    if (!UUID.test(cv)) {
      if (wantsJson) return apiJson({ error: "This rating link is missing or malformed." }, 400);
      return page("<h1>Invalid link</h1><p>This survey link is missing or malformed. Please use the link from your message.</p>", "Invalid link", 400);
    }
    if (wantsJson && !s) return apiJson({ ok: true, ready: true });

    if (!s) {
      const buttons = [1, 2, 3, 4, 5]
        // Relative href (query-only) keeps whatever path the gateway served us on.
        .map((n) => `<a href="?cv=${cv}&s=${n}" aria-label="Rate ${n} out of 5">${n}</a>`)
        .join("");
      return page(
        `<h1>How did we do?</h1><p>Rate your recent experience with us from 1 to 5.</p>
<div class="row">${buttons}</div>
<div class="scale"><span>Not great</span><span>Excellent</span></div>`,
        "How did we do?",
      );
    }

    const score = Number(s);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      if (wantsJson) return apiJson({ error: "Ratings run from 1 to 5." }, 400);
      return page("<h1>Invalid rating</h1><p>Ratings run from 1 to 5. Please use the buttons on the survey page.</p>", "Invalid rating", 400);
    }

    const admin = adminClient();
    const { error } = await admin
      .from("conversations")
      .update({ csat_score: score, csat_source: "customer", csat_requested: false })
      .eq("id", cv);
    if (error) {
      if (wantsJson) return apiJson({ error: "We couldn't record your rating." }, 500);
      return page("<h1>Something went wrong</h1><p>We couldn't record your rating. Please try again later.</p>", "Something went wrong", 500);
    }

    if (wantsJson) return apiJson({ ok: true, score });
    return page("<h1>Thanks for the feedback!</h1><p>We appreciate you taking the time to rate your experience.</p>", "Thanks for the feedback!");
  } catch {
    if (new URL(req.url).searchParams.get("json") === "1") {
      return apiJson({ error: "We couldn't record your rating." }, 500);
    }
    return page("<h1>Something went wrong</h1><p>We couldn't record your rating. Please try again later.</p>", "Something went wrong", 500);
  }
});
