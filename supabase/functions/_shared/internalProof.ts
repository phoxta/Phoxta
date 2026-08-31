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

/** HMAC-SHA256 of `message` under `secret`, base64url encoded. */
async function hmacWith(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

/** HMAC-SHA256 of `message`, keyed by the service-role key, base64url encoded. */
export function hmacToken(message: string): Promise<string> {
  return hmacWith(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", message);
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

// ---------------------------------------------------------------------------
// The voice bridge's proof — a SECOND, weaker capability, on purpose.
//
// The Pipecat bridge runs on a VM outside the platform and, until now, spoke to
// agent-inbound with nothing but the public key. That made it indistinguishable
// from a browser: the caller's phone number was stripped as a stranger's claim,
// the channel could never be "voice", and so a failed greeting filed a live
// phone call as web chat. The obvious fix — hand the VM the internal proof — is
// wrong: that proof is keyed by the SERVICE-ROLE KEY, and a machine that holds
// it (or can be made to compute tags with it) is a machine that can speak as
// twilio-inbound and email-inbound too, asserting any customer's email on any
// channel. The voice VM must never hold it.
//
// So the bridge gets its own shared secret, VOICE_BRIDGE_SECRET, and a proof
// derived from it vouches for EXACTLY what a phone call can truthfully claim:
// the "voice" channel, the caller's phone and name, and the voice-only
// operations (voice_config, greeting, summarize, recording_init,
// recording_done). Never another channel, never a provider id, never `test`.
// With the secret unset the proof is always invalid — a missing secret must
// fail closed to "anonymous", not open to "trusted".
// ---------------------------------------------------------------------------
export const VOICE_PROOF_HEADER = "x-voice-proof";
const VOICE_PROOF_MESSAGE = "phoxta-voice-bridge-v1";

/** True when this request carries a valid voice-bridge proof. */
export async function voiceProofValid(req: Request): Promise<boolean> {
  const presented = req.headers.get(VOICE_PROOF_HEADER) ?? "";
  const secret = Deno.env.get("VOICE_BRIDGE_SECRET") ?? "";
  if (!presented || !secret) return false;
  return safeEqual(presented, await hmacWith(secret, VOICE_PROOF_MESSAGE));
}
