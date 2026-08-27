// Phoxta — social-callback: the redirect URI every platform's app whitelists.
//
// Deployed with verify_jwt = false: Instagram, LinkedIn, TikTok and X redirect
// a browser here, and a browser mid-OAuth carries no Supabase JWT. The signed
// state is what authorises the write — it names the business, it is HMAC'd with
// that platform's own client secret and it expires in ten minutes, so a
// stranger cannot attach their account to someone else's business by editing a
// query string.
//
// It always ends in a redirect back into the console with a readable outcome.
// An OAuth callback that renders its own error page is one nobody ever sees,
// because the person is already looking at the tab they came from.
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { type Platform, appBase, exchange, identify, verifyState } from "../_shared/socialOauth.ts";

Deno.serve(async (req) => {
  const url = new URL(req.url);

  const back = (org: string | undefined, q: string) =>
    Response.redirect(
      org
        ? `${appBase()}/dashboard/businesses/${org}/ops/designs?social=${encodeURIComponent(q)}`
        : `${appBase()}/dashboard?social=${encodeURIComponent(q)}`,
      302,
    );

  let org: string | undefined;
  try {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    // The person pressed Cancel on the consent screen. Not an error worth a
    // stack trace, but it must not look like success either.
    if (url.searchParams.get("error") || !code || !state) return back(undefined, "cancelled");

    const p = await verifyState(state);
    if (!p?.org || !p?.p) return back(undefined, "bad-state");
    org = p.org as string;
    const platform = p.p as Platform;

    const tok = await exchange(platform, code, String(p.v ?? ""));
    if (!tok.accessToken) return back(org, "no-token");

    const who = await identify(platform, tok);
    if (!who.externalId) return back(org, "no-account");

    const admin = adminClient();
    const row = {
      organization_id: org,
      platform,
      external_id: who.externalId,
      handle: who.handle,
      display_name: who.displayName,
      avatar_url: who.avatarUrl,
      access_token: tok.accessToken,
      refresh_token: tok.refreshToken,
      token_expiry: tok.expiresIn ? new Date(Date.now() + tok.expiresIn * 1000).toISOString() : null,
      status: "connected",
      last_error: "",
      connected_by: p.by ?? null,
    };
    // Reconnecting the same account must update it, not add a second row —
    // otherwise the queue would post twice to one profile.
    const { error } = await admin
      .from("social_accounts")
      .upsert(row, { onConflict: "organization_id,platform,external_id" });
    if (error) return back(org, "not-saved");

    return back(org, `connected-${platform}`);
  } catch (e) {
    // The platform's own words, truncated, so the console can show why rather
    // than "something went wrong".
    return back(org, "failed: " + String((e as Error)?.message ?? e).slice(0, 120));
  }
});
