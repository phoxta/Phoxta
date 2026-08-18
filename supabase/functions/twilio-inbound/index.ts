// Phoxta — twilio-inbound: receives inbound SMS/WhatsApp from Twilio and replies
// with the business's own AI agent. Point a Twilio number's "A message comes in"
// webhook at:  <FUNCTIONS_URL>/twilio-inbound?org=<organization_id>
// The reply is returned as TwiML, so Twilio sends it (no outbound API/keys needed).
// Deploy with --no-verify-jwt (Twilio posts without a Supabase JWT).
//
// Because this endpoint is deployed without JWT verification it is reachable by
// anyone, so every request is authenticated against Twilio's X-Twilio-Signature
// (HMAC-SHA1 over the URL + POST params, keyed by TWILIO_AUTH_TOKEN). Without
// that check, anyone could inject fabricated inbound messages into a tenant's
// Inbox and drive the LLM on that tenant's bill.
// Requires: TWILIO_AUTH_TOKEN (and TWILIO_WEBHOOK_BASE if a proxy rewrites the host).
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { verifyTwilioSignature } from "../_shared/webhooks.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

function twiml(message: string): Response {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${esc(message)}</Message></Response>`;
  return new Response(xml, { headers: { "Content-Type": "text/xml" } });
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get("org");
    // A number can bind straight to an agent public key (?key=…) — used for the
    // Phoxta platform line — or to an org (?org=…) whose key we resolve below.
    const directKey = url.searchParams.get("key");
    const form = await req.formData().catch(() => null);

    // Authenticate the sender before touching the database or the model.
    if (!form || !(await verifyTwilioSignature(req, form))) {
      return new Response("Forbidden", { status: 403 });
    }

    const body = form.get("Body")?.toString()?.trim() ?? "";
    const from = form.get("From")?.toString() ?? "";
    if ((!orgId && !directKey) || !body) return twiml("Sorry, this number isn't set up yet.");

    let key = directKey;
    if (!key && orgId) {
      const admin = adminClient();
      const { data } = await admin.rpc("app_storefront_agent_key", { p_org: orgId });
      key = data;
    }
    if (!key) return twiml("Sorry, the assistant isn't available right now.");

    const channel = from.startsWith("whatsapp:") ? "whatsapp" : "sms";
    // Pass the sender's phone as the customer (not as conversationId — that's a
    // UUID). agent-inbound threads SMS/WhatsApp by (org, channel, phone).
    const phone = from.replace(/^whatsapp:/, "");
    const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-inbound`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ public_key: key, channel, message: body, customer: { phone } }),
    });
    const data = await res.json().catch(() => ({}));
    return twiml((data as { reply?: string })?.reply || "Thanks for your message — we'll be in touch shortly.");
  } catch {
    return twiml("Sorry, something went wrong. Please try again in a moment.");
  }
});
