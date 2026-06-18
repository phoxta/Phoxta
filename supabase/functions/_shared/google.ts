// Phoxta — shared Google OAuth helpers (consent scopes, redirect URI, an
// HMAC-signed `state` for the callback, and a refresh-aware access-token getter).
import type { SupabaseClient } from "./supabaseAdmin.ts";
const env = (k: string) => Deno.env.get(k) ?? "";

/** Return a valid Google access token for the org, refreshing it if expired. */
export async function getAccessToken(admin: SupabaseClient, orgId: string): Promise<string | null> {
  const { data } = await admin.from("google_connections").select("access_token, refresh_token, token_expiry").eq("organization_id", orgId).maybeSingle();
  // deno-lint-ignore no-explicit-any
  const c = data as any;
  if (!c) return null;
  const exp = c.token_expiry ? new Date(c.token_expiry).getTime() : 0;
  if (c.access_token && exp > Date.now() + 60_000) return c.access_token; // still valid (>1 min)
  if (!c.refresh_token) return c.access_token || null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"), refresh_token: c.refresh_token, grant_type: "refresh_token" }),
  });
  // deno-lint-ignore no-explicit-any
  const tok: any = await res.json().catch(() => ({}));
  if (!tok?.access_token) return null;
  await admin.from("google_connections").update({ access_token: tok.access_token, token_expiry: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString() }).eq("organization_id", orgId);
  return tok.access_token;
}

export const GOOGLE_SCOPES = [
  "openid", "email", "profile",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/calendar",
].join(" ");

export const redirectUri = () => `${env("SUPABASE_URL")}/functions/v1/google-oauth`;
export const appBase = () => env("APP_BASE_URL") || "https://www.phoxta.com";

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env("GOOGLE_CLIENT_SECRET")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

// deno-lint-ignore no-explicit-any
export async function signState(payload: any): Promise<string> {
  const data = btoa(JSON.stringify(payload));
  return `${data}.${await hmac(data)}`;
}

// deno-lint-ignore no-explicit-any
export async function verifyState(state: string): Promise<any | null> {
  const i = state.lastIndexOf(".");
  if (i < 0) return null;
  const data = state.slice(0, i);
  const sig = state.slice(i + 1);
  if ((await hmac(data)) !== sig) return null;
  try {
    const p = JSON.parse(atob(data));
    if (p.exp && Date.now() > p.exp) return null;
    return p;
  } catch {
    return null;
  }
}
