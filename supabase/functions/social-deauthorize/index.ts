// Phoxta — social-deauthorize: the two callbacks Meta requires of every app.
//
//   POST /oauth/social/deauthorize    someone removed Phoxta from their
//                                     Instagram account
//   POST /oauth/social/data-deletion  someone asked for their data to be
//                                     deleted
//
// Both are mandatory fields on the app, and both are enforced at review. They
// are also the right thing to honour regardless: a person who disconnects us
// from their side should not discover a week later that we still hold a token
// and are still posting.
//
// Deployed with verify_jwt = false — Meta calls these server to server with no
// Supabase JWT. What authorises them is the SIGNED REQUEST: Meta signs the
// payload with the app secret, so a caller who cannot produce that signature
// cannot delete anybody's account. Without checking it, this endpoint would let
// any stranger revoke any account by posting a user id.
import { adminClient } from "../_shared/supabaseAdmin.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const secret = () => env("INSTAGRAM_APP_SECRET") || env("META_APP_SECRET");

const b64url = (s: string) => {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  return atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
};

/**
 * Verify and unpack Meta's signed_request.
 *
 * Format is `<signature>.<payload>`, both base64url, the signature being an
 * HMAC-SHA256 of the payload STRING — not of the decoded object, which is the
 * classic way to implement this wrongly and end up verifying nothing.
 */
async function verify(signed: string): Promise<{ user_id?: string } | null> {
  const [sig, payload] = signed.split(".");
  if (!sig || !payload) return null;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
  );
  const bytes = Uint8Array.from(b64url(sig), (c) => c.charCodeAt(0));
  const ok = await crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(payload));
  if (!ok) return null;
  try {
    return JSON.parse(b64url(payload));
  } catch {
    return null;
  }
}

/** Forget the account: the token goes, the row stays marked so the console can
 *  say why it stopped posting rather than the account simply vanishing. */
async function revoke(userId: string): Promise<number> {
  const admin = adminClient();
  const { data } = await admin
    .from("social_accounts")
    .update({ status: "revoked", access_token: "", refresh_token: "", last_error: "Disconnected from Instagram." })
    .eq("platform", "instagram")
    .eq("external_id", userId)
    .select("id");
  return (data ?? []).length;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const isDeletion = url.pathname.includes("data-deletion");

  try {
    // Meta posts it as a form field; some tooling sends json.
    let signed = "";
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      signed = String((await req.json().catch(() => ({})))?.signed_request ?? "");
    } else {
      signed = String((await req.formData().catch(() => new FormData())).get("signed_request") ?? "");
    }

    const payload = signed ? await verify(signed) : null;
    if (!payload?.user_id) {
      return new Response(JSON.stringify({ error: "Invalid signed_request." }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    const removed = await revoke(payload.user_id);

    if (!isDeletion) {
      // Deauthorize wants nothing back but a 200.
      return new Response(JSON.stringify({ ok: true, removed }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }

    // Data deletion must answer with a URL a person can open to check the
    // status, and a code they can quote. The code is derived from the account
    // id so the same request always reports the same code.
    const code = "ig-" + payload.user_id.slice(-10);
    return new Response(JSON.stringify({
      url: `https://www.phoxta.com/data-deletion?code=${encodeURIComponent(code)}`,
      confirmation_code: code,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error)?.message || err) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
