// Phoxta — voice-session: mints a short-lived token the in-browser voice widget
// hands to the self-hosted Pipecat server so /ice and /offer are no longer open
// to the world.
//
// Before this, the voice server's /ice route gave one-hour Twilio TURN
// credentials to anyone who asked, and /offer ran a full agent session (Deepgram
// STT + TTS, a concurrency slot, real money) for any caller who POSTed an SDP
// offer with a public key that ships in every storefront bundle. The key names a
// BUSINESS, not a person, so it authorises nothing on its own.
//
// So the widget must first come here. We verify the key resolves to a real
// business, rate-limit per caller, and return a token the voice server can check
// with nothing but the shared VOICE_BRIDGE_SECRET — no round-trip back to us.
// The token is deliberately narrow: it is scoped to the "web" transport and this
// exact key, and it expires in five minutes.
//
// Contract (must match server.py /ice and /offer, byte-for-byte):
//   exp   = now + 300  (unix seconds)
//   token = hex(HMAC-SHA256(VOICE_BRIDGE_SECRET, `${key}|web|${exp}`))
import { preflight, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { hashIp } from "../_shared/clientIp.ts";

// How long a minted token is good for. Long enough for the browser to gather ICE
// and complete signalling, short enough that a leaked token is worthless before
// anyone could reuse it. server.py mints web tokens with the SAME 300s window.
const TOKEN_TTL_SECS = 300;

// Per-caller ceiling. A real visitor opens the widget a handful of times; this is
// sized well above that and below the volume that would make farming tokens (to
// then farm TURN credentials or agent sessions off the voice server) worthwhile.
// Env-overridable so it can be tightened without a redeploy of the code.
const RATE_MAX = Number(Deno.env.get("VOICE_SESSION_RATE_MAX")) || 10;
const RATE_WINDOW_MS = 60_000;

// In-memory sliding window, per warm instance. There is no DB table for this and
// migrations are out of scope here, so the limiter lives in process memory: it
// resets when the instance recycles and does not coordinate across instances.
// That is acceptable precisely because the token it guards is itself weak and
// short-lived — the limiter raises the cost of automated abuse, it is not the
// security boundary (the boundary is "key resolves to a business" + the 5-minute
// HMAC). Keyed on the hashed IP so we never hold a raw address here either.
const hits = new Map<string, number[]>();

function rateLimited(ipHash: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ipHash) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ipHash, recent);
  // Opportunistic prune so the map cannot grow without bound on a long-lived
  // instance — anything with no hit in the last window is gone anyway.
  if (hits.size > 2000) {
    for (const [k, v] of hits) {
      if (!v.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(k);
    }
  }
  return recent.length > RATE_MAX;
}

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = await req.json().catch(() => ({}));
    const key = String((body as { public_key?: string })?.public_key ?? "").trim();
    if (!key) return json({ error: "Missing public_key." }, 400);

    const ipHash = await hashIp(req);
    if (rateLimited(ipHash)) {
      return json({ error: "Too many voice sessions just now — give it a minute." }, 429);
    }

    // The key must resolve to a real business. This is what stops a made-up or
    // revoked key from being handed a working voice session.
    const admin = adminClient();
    const { data: cfg } = await admin
      .from("agent_config")
      .select("organization_id")
      .eq("public_key", key)
      .maybeSingle();
    if (!cfg || !(cfg as { organization_id?: string }).organization_id) {
      return json({ error: "This voice agent isn't set up." }, 404);
    }

    const secret = Deno.env.get("VOICE_BRIDGE_SECRET") ?? "";
    if (!secret) {
      // Fail LOUD, not closed: with the secret unset the voice server also skips
      // verification (its "today's behaviour" degrade), so a token it would
      // ignore is no worse than none. But this is a misconfiguration worth a log
      // line — a set secret is what actually locks /ice and /offer down.
      console.warn("[phoxta] voice-session: VOICE_BRIDGE_SECRET unset — minted token is unverifiable");
    }

    const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECS;
    const token = await hmacHex(secret, `${key}|web|${exp}`);
    return json({ token, exp });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
