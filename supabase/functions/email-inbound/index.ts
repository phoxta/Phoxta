// Phoxta — email-inbound: receives an inbound email (via a provider's inbound-
// parse webhook — Resend / Postmark / SendGrid / Cloudflare Email Routing),
// threads it into the business's Inbox and replies with the AI agent. Point the
// provider's inbound webhook at:  <FUNCTIONS_URL>/email-inbound?key=<agent_public_key>
// Reply delivery uses the configured email provider (RESEND_* / POSTMARK_*);
// without one it degrades to "simulated". Deploy with --no-verify-jwt.
import { dispatch } from "../_shared/dispatch.ts";

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

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get("key"); // the business's agent public key
    const ct = (req.headers.get("content-type") || "").toLowerCase();
    const payload = ct.includes("json") ? await req.json().catch(() => null) : null;
    const form = payload ? null : await req.formData().catch(() => null);
    const { from, subject, text } = parseInbound(payload, form);

    // Always 200 so the provider doesn't retry; bail quietly if unusable.
    if (!key || !from || !text) return new Response("ok", { status: 200 });

    const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-inbound`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ public_key: key, channel: "email", message: text, customer: { email: from } }),
    });
    const data = (await res.json().catch(() => ({}))) as { reply?: string };
    const reply = data?.reply;
    if (reply) {
      const subj = subject ? (/^re:/i.test(subject) ? subject : `Re: ${subject}`) : "Re: your message";
      await dispatch("email", from, subj, reply);
    }
    return new Response("ok", { status: 200 });
  } catch {
    return new Response("ok", { status: 200 });
  }
});
