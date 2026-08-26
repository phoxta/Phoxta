// Phoxta — proving that a caller is one of our own edge functions.
//
// agent-inbound is public: it is gated only by an agent public_key, which ships
// inside every storefront's JS bundle and is handed to anonymous callers by
// app_storefront_agent_key. The key therefore identifies a BUSINESS, never a
// person — and identity is exactly what threads a conversation (a phone number
// re-attaches to an existing SMS thread; an email links the contact whose other
// conversations the agent is then fed as memory). A caller who may assert
// someone else's phone or email can read their history back out of the reply.
//
// So the transports that genuinely received a message on a channel —
// twilio-inbound, email-inbound — prove it, and everyone else speaks only as an
// anonymous web visitor. The proof is an HMAC keyed by the service-role key:
// the platform injects it into every edge function, it never reaches a browser,
// and sending a derived tag rather than the key itself means the secret is not
// on the wire even between our own functions.
//
// Deliberately NOT a bearer of authority on its own: it says "this call came
// from inside", nothing more. Authorisation still happens per action.

const enc = new TextEncoder();

const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

/** HMAC-SHA256 of `message`, keyed by the service-role key, base64url encoded. */
export async function hmacToken(message: string): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

/** Constant-time compare — a timing oracle on a capability check is still a hole. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const INTERNAL_PROOF_HEADER = "x-internal-proof";
const INTERNAL_PROOF_MESSAGE = "phoxta-internal-transport-v1";

/** Headers a server function adds when calling another one. */
export async function internalProofHeaders(): Promise<Record<string, string>> {
  return { [INTERNAL_PROOF_HEADER]: await hmacToken(INTERNAL_PROOF_MESSAGE) };
}

/** True when this request came from one of our own edge functions. */
export async function isTrustedTransport(req: Request): Promise<boolean> {
  const presented = req.headers.get(INTERNAL_PROOF_HEADER) ?? "";
  if (!presented) return false;
  return safeEqual(presented, await hmacToken(INTERNAL_PROOF_MESSAGE));
}
