// Phoxta — google-oauth: the OAuth redirect callback (the URI whitelisted in the
// Google client). Verifies the signed state, exchanges the code for tokens,
// stores them per-org, and redirects back into the app. Deploy --no-verify-jwt
// (Google redirects here without a Supabase JWT).
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { redirectUri, appBase, verifyState } from "../_shared/google.ts";

const env = (k: string) => Deno.env.get(k) ?? "";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const back = (q: string, org?: string) =>
    Response.redirect(`${appBase()}${org ? `/dashboard/businesses/${org}/ops/agent/configure` : "/dashboard"}?google=${q}`, 302);
  try {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (url.searchParams.get("error") || !code || !state) return back("error");
    const p = await verifyState(state);
    if (!p?.org) return back("error");

    const tokRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env("GOOGLE_CLIENT_ID"),
        client_secret: env("GOOGLE_CLIENT_SECRET"),
        redirect_uri: redirectUri(),
        grant_type: "authorization_code",
      }),
    });
    // deno-lint-ignore no-explicit-any
    const tok: any = await tokRes.json().catch(() => ({}));
    if (!tok?.access_token) return back("error", p.org);

    let email = "";
    try {
      const ui = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tok.access_token}` } });
      email = ((await ui.json()) as { email?: string })?.email ?? "";
    } catch { /* non-fatal */ }

    const row: Record<string, unknown> = {
      organization_id: p.org,
      email,
      scope: tok.scope ?? "",
      access_token: tok.access_token,
      token_expiry: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
      connected_by: p.uid ?? null,
      updated_at: new Date().toISOString(),
    };
    if (tok.refresh_token) row.refresh_token = tok.refresh_token; // only present on first/forced consent
    await adminClient().from("google_connections").upsert(row, { onConflict: "organization_id" });

    return back("connected", p.org);
  } catch {
    return back("error");
  }
});
