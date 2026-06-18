// Phoxta — shared Google OAuth helpers (consent scopes, redirect URI, and an
// HMAC-signed `state` so the public callback can trust which org is connecting).
const env = (k: string) => Deno.env.get(k) ?? "";

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
