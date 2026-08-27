// Phoxta — social-connect: hand the console the consent URL to send someone to.
//
// Member-authed, per business. It does not redirect: it returns the URL, so the
// console can open it in a new tab and keep the page the person was on. The
// state it signs carries the business and the platform, so the callback can
// tell whose account is being attached to what without trusting a query string.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { type Platform, SPECS, authorizeUrl, callbackUrl, configured, signState } from "../_shared/socialOauth.ts";

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = await req.json().catch(() => ({}));
    const platform = String((body as { platform?: string })?.platform ?? "") as Platform;
    if (!SPECS[platform]) return json({ error: "Unknown platform." }, 400);

    const a = await authorize(req, (body as { organizationId?: string })?.organizationId);
    if (a.error) return a.error;
    const { org, userId } = a.ok;

    if (!configured(platform)) {
      // Said plainly rather than bouncing someone to a consent screen that
      // cannot work. The redirect URI is included because whoever sets the app
      // up needs to whitelist exactly this.
      return json({
        error: `${platform} is not set up yet. Create the developer app, then set its id and secret as function secrets.`,
        needs: platform === "instagram" ? ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET"]
          : platform === "linkedin" ? ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"]
            : platform === "tiktok" ? ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"]
              : ["X_CLIENT_ID", "X_CLIENT_SECRET"],
        redirectUri: callbackUrl(),
      }, 400);
    }

    // X wants PKCE. There is nowhere to keep a verifier between the two legs,
    // so it rides inside the signed state — which is signed with the client
    // secret and therefore not something a caller can forge.
    const verifier = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const state = await signState(platform, { org: org.id, by: userId, v: verifier });

    return json({ ok: true, url: authorizeUrl(platform, state, verifier), redirectUri: callbackUrl() });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
