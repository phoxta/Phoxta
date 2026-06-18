// Phoxta — voice-token: mints a Twilio Voice access token so the operator can
// place/receive calls from the browser (Twilio Voice JS SDK). The token is a
// JWT signed with the API Key secret, carrying a Voice grant scoped to the
// TwiML App (voice-outgoing). Member-authed.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";

const env = (k: string) => Deno.env.get(k) ?? "";

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const b64urlStr = (s: string) => b64url(new TextEncoder().encode(s));

async function mintToken(identity: string): Promise<string> {
  const keySid = env("TWILIO_VOICE_KEY_SID");
  const keySecret = env("TWILIO_VOICE_KEY_SECRET");
  const accountSid = env("TWILIO_ACCOUNT_SID");
  const appSid = env("TWILIO_TWIML_APP_SID");
  const now = Math.floor(Date.now() / 1000);
  const header = { typ: "JWT", alg: "HS256", cty: "twilio-fpa;v=1" };
  const payload = {
    jti: `${keySid}-${now}`,
    iss: keySid,
    sub: accountSid,
    nbf: now,
    exp: now + 3600,
    grants: {
      identity,
      voice: { incoming: { allow: false }, outgoing: { application_sid: appSid } },
    },
  };
  const signingInput = `${b64urlStr(JSON.stringify(header))}.${b64urlStr(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(keySecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${b64url(new Uint8Array(sig))}`;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = await req.json().catch(() => ({}));
    const a = await authorize(req, (body as { organizationId?: string })?.organizationId);
    if (a.error) return a.error;
    if (!env("TWILIO_VOICE_KEY_SID") || !env("TWILIO_TWIML_APP_SID")) {
      return json({ error: "Browser calling isn't configured yet." }, 400);
    }
    const identity = `op_${a.ok.userId.replace(/-/g, "").slice(0, 16)}`;
    const token = await mintToken(identity);
    return json({ token, identity });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
