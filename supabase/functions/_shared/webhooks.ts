// Phoxta — inbound webhook authentication.
//
// The inbound webhook endpoints (twilio-inbound, email-inbound) are deployed
// --no-verify-jwt because the providers post without a Supabase JWT. That makes
// them internet-reachable by anyone, so each one must authenticate the *sender*
// itself. Without this, anybody who can read the site's public agent key (it
// ships in client JS for the chat widget) can drive the AI agent — and, for the
// email path, make Phoxta send mail from its own verified domain to any address.
//
//   Twilio  : X-Twilio-Signature — HMAC-SHA1 over the exact request URL plus the
//             POST body params, keyed by the account auth token. Twilio's spec.
//   Resend  : Svix signature headers (svix-id / svix-timestamp / svix-signature).
//   Generic : a shared secret on the webhook URL (?token=…) or an
//             x-webhook-secret header — works with every provider, since they
//             all let you choose an arbitrary URL (Postmark, SendGrid,
//             Cloudflare Email Routing, …).
//
// All comparisons are constant-time.

/** Constant-time string compare — avoids leaking the secret via response timing. */
export function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  // Compare lengths without early-exit on content; unequal lengths still fail.
  let diff = ea.length ^ eb.length;
  const n = Math.max(ea.length, eb.length);
  for (let i = 0; i < n; i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

async function hmac(algo: "SHA-1" | "SHA-256", key: string, data: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: algo }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

function b64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * Verify Twilio's X-Twilio-Signature.
 *
 * Twilio signs: the full request URL, followed by every POST parameter as
 * key+value, sorted by key. Set TWILIO_WEBHOOK_BASE when a proxy rewrites the
 * scheme/host (the signature is over the URL Twilio actually called).
 */
export async function verifyTwilioSignature(req: Request, form: FormData): Promise<boolean> {
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  // Fail closed: an unset token means the endpoint cannot authenticate callers.
  if (!token) return false;

  const header = req.headers.get("x-twilio-signature");
  if (!header) return false;

  const reqUrl = new URL(req.url);
  const base = Deno.env.get("TWILIO_WEBHOOK_BASE");
  const url = base ? `${base.replace(/\/$/, "")}${reqUrl.pathname}${reqUrl.search}` : reqUrl.toString();

  const keys: string[] = [];
  for (const [k] of form.entries()) keys.push(k);
  keys.sort();
  let payload = url;
  for (const k of keys) payload += k + (form.get(k)?.toString() ?? "");

  return timingSafeEqual(b64(await hmac("SHA-1", token, payload)), header);
}

/**
 * Verify a Svix-style signature (Resend inbound webhooks).
 * Header `svix-signature` is a space-separated list of `v1,<base64>` entries.
 */
export async function verifySvixSignature(req: Request, rawBody: string, secret: string): Promise<boolean> {
  const id = req.headers.get("svix-id");
  const ts = req.headers.get("svix-timestamp");
  const sigHeader = req.headers.get("svix-signature");
  if (!id || !ts || !sigHeader) return false;

  // Reject replays outside a 5-minute window.
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 300) return false;

  // The signing key is base64 after the `whsec_` prefix.
  const raw = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyStr: string;
  try {
    keyStr = atob(raw);
  } catch {
    keyStr = raw;
  }
  const expected = b64(await hmac("SHA-256", keyStr, `${id}.${ts}.${rawBody}`));
  for (const part of sigHeader.split(" ")) {
    const [version, value] = part.split(",");
    if (version === "v1" && value && timingSafeEqual(value, expected)) return true;
  }
  return false;
}

/**
 * Verify a shared secret presented as `?token=…` or an `x-webhook-secret`
 * header. Returns false when `envName` is unset — fail closed.
 */
export function verifySharedSecret(req: Request, envName: string): boolean {
  const secret = Deno.env.get(envName);
  if (!secret) return false;
  const presented = new URL(req.url).searchParams.get("token") ?? req.headers.get("x-webhook-secret") ?? "";
  if (!presented) return false;
  return timingSafeEqual(presented, secret);
}
