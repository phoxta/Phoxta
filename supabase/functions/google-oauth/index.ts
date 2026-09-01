// Phoxta — google-oauth: the OAuth redirect callback (the URI whitelisted in the
// Google client). Verifies the signed state, exchanges the code for tokens,
// stores them per-org, and redirects back into the app. Deploy --no-verify-jwt
// (Google redirects here without a Supabase JWT).
//
// It also serves Jobtra (femi.phoxta.com/jobtra): when the signed state carries
// `jobtra:true` it stores the tokens in jobtra_gmail_connections (Jobtra's OWN
// connection, separate from the org google_connections) plus a UI account row,
// and redirects back to the Jobtra app. The two paths never cross — a jobtra
// state has no `org`, and the org path is unchanged.
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { redirectUri, appBase, verifyState } from "../_shared/google.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const jobtraBase = () => (env("JOBTRA_APP_BASE") || "https://femi.phoxta.com").replace(/\/+$/, "");

async function exchangeCode(code: string) {
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
  return (await tokRes.json().catch(() => ({}))) as any;
}

async function emailOf(accessToken: string): Promise<string> {
  try {
    const ui = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
    return ((await ui.json()) as { email?: string })?.email ?? "";
  } catch { return ""; }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const back = (q: string, org?: string) =>
    Response.redirect(`${appBase()}${org ? `/dashboard/businesses/${org}/ops/google` : "/dashboard"}?google=${q}`, 302);
  const jobtraBack = (q: string) => Response.redirect(`${jobtraBase()}/jobtra?gmail=${q}`, 302);
  try {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (url.searchParams.get("error") || !code || !state) return back("error");
    const p = await verifyState(state);
    if (!p) return back("error");

    // ── Jobtra's own Gmail connection ──────────────────────────────────────
    if (p.jobtra) {
      const tok = await exchangeCode(code);
      if (!tok?.access_token) return jobtraBack("error");
      const email = await emailOf(tok.access_token);
      if (!email) return jobtraBack("error");
      const admin = adminClient();
      const conn: Record<string, unknown> = {
        email,
        access_token: tok.access_token,
        scope: tok.scope ?? "",
        token_expiry: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (tok.refresh_token) conn.refresh_token = tok.refresh_token;
      await admin.from("jobtra_gmail_connections").upsert(conn, { onConflict: "email" });
      // A UI account row so the tracker shows the connected inbox (no token here).
      const account = {
        id: `gmail-${email}`,
        email,
        name: `${email.split("@")[0]} (Gmail)`,
        provider: "gmail",
        status: "active",
        isPrimary: true,
        lastSyncedAt: null,
      };
      await admin.from("jobtra_connected_accounts").upsert(
        { id: account.id, data: account, updated_at: new Date().toISOString() },
        { onConflict: "id" },
      );
      return jobtraBack("connected");
    }

    // ── Phoxta org connection (unchanged) ──────────────────────────────────
    if (!p.org) return back("error");
    const tok = await exchangeCode(code);
    if (!tok?.access_token) return back("error", p.org);
    const email = await emailOf(tok.access_token);
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
