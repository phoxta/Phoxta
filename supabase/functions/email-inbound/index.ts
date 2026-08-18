// Phoxta — email-inbound: receives an inbound email (via a provider's inbound-
// parse webhook — Resend / Postmark / SendGrid / Cloudflare Email Routing),
// threads it into the business's Inbox and replies with the AI agent. Point the
// provider's inbound webhook at:
//   <FUNCTIONS_URL>/email-inbound?key=<agent_public_key>&token=<INBOUND_WEBHOOK_SECRET>
// Reply delivery uses the configured email provider (RESEND_* / POSTMARK_*);
// without one it degrades to "simulated". Deploy with --no-verify-jwt.
//
// SECURITY: this endpoint is deployed without JWT verification, and the agent
// public key it takes is genuinely public (it ships in client JS for the chat
// widget). Authenticating the *sender* is therefore mandatory — otherwise anyone
// could POST an arbitrary `from` address and have Phoxta send mail from its own
// verified sending domain to any recipient (an open relay), while burning model
// spend. Accepted proofs, in order:
//   1. RESEND_WEBHOOK_SECRET  → Svix signature headers (Resend).
//   2. INBOUND_WEBHOOK_SECRET → ?token=… or x-webhook-secret (any provider).
// At least one must be configured; with neither, every request is rejected.
import { dispatch } from "../_shared/dispatch.ts";
import { verifySvixSignature, verifySharedSecret } from "../_shared/webhooks.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// deno-lint-ignore no-explicit-any
type Json = any;

const emailOf = (raw: string) => {
  const m = raw.match(/<([^>]+)>/);
  return (m ? m[1] : raw).trim().toLowerCase();
};

/** Normalise the many provider payload shapes into { from, subject, text }. */
function parseInbound(payload: Json, form: FormData | null): { from: string; subject: string; text: string } {
  const g = (k: string) => (form ? (form.get(k)?.toString() ?? "") : "");
  if (payload) {
    // Postmark: { From, Subject, TextBody, StrippedTextReply, FromFull:{Email} }
    // Resend:   { from:{address}|string, subject, text } (or nested under data)
    const p = payload.data ?? payload;
    const fromRaw =
      p.FromFull?.Email || p.From || (typeof p.from === "object" ? p.from?.address || p.from?.email : p.from) || p.sender || "";
    const subject = p.Subject || p.subject || "";
    const text = p.StrippedTextReply || p.TextBody || p.text || p["body-plain"] || p.body || "";
    return { from: emailOf(String(fromRaw || "")), subject: String(subject || ""), text: String(text || "").trim() };
  }
  // SendGrid Inbound Parse (multipart form): from, subject, text
  return { from: emailOf(g("from")), subject: g("subject"), text: (g("text") || g("html")).trim() };
}

async function authenticate(req: Request, rawBody: string): Promise<boolean> {
  const svixSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  if (svixSecret && req.headers.get("svix-signature")) {
    return await verifySvixSignature(req, rawBody, svixSecret);
  }
  return verifySharedSecret(req, "INBOUND_WEBHOOK_SECRET");
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get("key"); // the business's agent public key
    const ct = (req.headers.get("content-type") || "").toLowerCase();

    // Read the body once as text so the Svix HMAC sees the exact bytes signed.
    const rawBody = await req.text();
    if (!(await authenticate(req, rawBody))) {
      return new Response("Forbidden", { status: 403 });
    }

    let payload: Json = null;
    let form: FormData | null = null;
    if (ct.includes("json")) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        payload = null;
      }
    }
    if (!payload) {
      form = await new Response(rawBody, { headers: { "content-type": ct } }).formData().catch(() => null);
    }
    const { from, subject, text } = parseInbound(payload, form);

    // Always 200 so the provider doesn't retry; bail quietly if unusable.
    if (!key || !from || !text) return new Response("ok", { status: 200 });

    const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-inbound`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ public_key: key, channel: "email", message: text, customer: { email: from } }),
    });
    const data = (await res.json().catch(() => ({}))) as { reply?: string; throttled?: boolean };
    // When the agent is rate-limited it still returns a courtesy line. Do NOT
    // send that as an email — it would make the per-org throttle useless as an
    // outbound-volume control.
    if (data?.reply && !data.throttled) {
      const subj = subject ? (/^re:/i.test(subject) ? subject : `Re: ${subject}`) : "Re: your message";
      await dispatch("email", from, subj, data.reply);
    }
    return new Response("ok", { status: 200 });
  } catch {
    return new Response("ok", { status: 200 });
  }
});
