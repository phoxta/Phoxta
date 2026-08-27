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
//             Cloudflare Email Routing, …). Two secrets are accepted there: the
//             platform-wide INBOUND_WEBHOOK_SECRET, and the per-business token
//             derived from it by orgInboundToken() below — the one a business
//             owner is shown in their own console.
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

  // THE URL TWILIO SIGNED IS NOT THE URL THIS FUNCTION SEES.
  //
  // Twilio signs the address it dialled — including `/functions/v1/` — but the
  // Supabase gateway strips that prefix before the function is invoked, and
  // rewrites the host besides. So `req.url` is a DIFFERENT string from the one
  // the HMAC was computed over, and a single reconstruction is a guess about
  // somebody else's proxy that fails closed and silently: every inbound SMS and
  // WhatsApp message answered 403, Twilio recorded a delivery failure nobody was
  // watching, and the customer got nothing.
  //
  // So try the reconstructions that are actually plausible and accept if ANY of
  // them verifies. This does not weaken anything: each candidate is still a full
  // HMAC-SHA1 against the auth token, and an attacker without that token cannot
  // produce a signature matching any of them. The alternative — demanding that
  // one guess be right — is a guarantee of nothing except downtime the next time
  // a platform changes how it proxies.
  const reqUrl = new URL(req.url);
  const base = (Deno.env.get("TWILIO_WEBHOOK_BASE") ?? "").replace(/\/$/, "");
  const path = reqUrl.pathname;
  const search = reqUrl.search;
  // Supabase invokes at /<name>; Twilio was given /functions/v1/<name>.
  const prefixed = path.startsWith("/functions/v1") ? path : `/functions/v1${path}`;

  const candidates = [
    reqUrl.toString(),
    ...(base ? [`${base}${prefixed}${search}`, `${base}${path}${search}`] : []),
    `${reqUrl.origin}${prefixed}${search}`,
  ];

  const keys: string[] = [];
  for (const [k] of form.entries()) keys.push(k);
  keys.sort();
  let tail = "";
  for (const k of keys) tail += k + (form.get(k)?.toString() ?? "");

  for (const candidate of new Set(candidates)) {
    if (timingSafeEqual(b64(await hmac("SHA-1", token, candidate + tail)), header)) return true;
  }
  // One line, so the next person debugging silence has somewhere to start.
  console.warn("[phoxta] twilio signature rejected; tried:", [...new Set(candidates)].join(" | "));
  return false;
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
  const presented = presentedSecret(req);
  if (!presented) return false;
  return timingSafeEqual(presented, secret);
}

/** The secret a caller put on the request, wherever they put it. */
export function presentedSecret(req: Request): string {
  return new URL(req.url).searchParams.get("token") ?? req.headers.get("x-webhook-secret") ?? "";
}

/**
 * A per-business inbound-webhook token, derived from the platform secret.
 *
 * The inbound-parse endpoint has only ever accepted INBOUND_WEBHOOK_SECRET —
 * ONE secret, shared by every tenant. That is why no console screen has ever
 * shown an owner their webhook URL: handing a business owner the platform-wide
 * secret would let them post mail into any other business's Inbox, since the
 * `key` half of the URL is a genuinely public value that ships in the chat
 * widget's client JS.
 *
 * This is the token an owner may safely hold. It is an HMAC of their own
 * organisation id, so it authenticates exactly one tenant, it needs no storage
 * and no rotation bookkeeping, and it is invalidated for everyone at once by
 * rotating INBOUND_WEBHOOK_SECRET. The platform-wide secret still works, so
 * nothing already pointed at the endpoint breaks.
 *
 * Returns null when INBOUND_WEBHOOK_SECRET is unset — there is no key to derive
 * from, and a made-up token would be an authentication bypass wearing a hat.
 */
export async function orgInboundToken(orgId: string): Promise<string | null> {
  const secret = Deno.env.get("INBOUND_WEBHOOK_SECRET") ?? "";
  const org = String(orgId ?? "").trim();
  if (!secret || !org) return null;
  const sig = await hmac("SHA-256", secret, `email-inbound:v1:${org}`);
  // base64url, unpadded: it travels in a query string.
  return b64(sig).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
