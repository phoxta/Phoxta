// Phoxta — shared Google OAuth helpers (consent scopes, redirect URI, an
// HMAC-signed `state` for the callback, and a refresh-aware access-token getter).
import type { SupabaseClient } from "./supabaseAdmin.ts";
// deno-lint-ignore no-explicit-any
type Json = any;
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
  // Admin (key-free provisioning of business email addresses as Groups) — the
  // connecting user must be a Workspace admin for these to take effect.
  "https://www.googleapis.com/auth/admin.directory.group",
  "https://www.googleapis.com/auth/admin.directory.group.member",
  "https://www.googleapis.com/auth/admin.directory.user.alias",
  "https://www.googleapis.com/auth/apps.groups.settings",
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

// --- Action helpers (token-based) used by the operator agent's write tools ---
function b64urlText(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const gHeaders = (token: string) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });

export async function gmailSendRaw(token: string, o: { to: string; subject: string; text: string }): Promise<void> {
  const raw = b64urlText(`To: ${o.to}\r\nSubject: ${o.subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${o.text}`);
  const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: gHeaders(token), body: JSON.stringify({ raw }) });
  if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as Json)?.error?.message || "Gmail send failed");
}

export async function createDoc(token: string, o: { title: string; text?: string }): Promise<string> {
  const cr = await fetch("https://docs.googleapis.com/v1/documents", { method: "POST", headers: gHeaders(token), body: JSON.stringify({ title: o.title || "Untitled" }) });
  const doc = (await cr.json()) as Json;
  if (!doc?.documentId) throw new Error(doc?.error?.message || "Doc create failed");
  if (o.text) {
    await fetch(`https://docs.googleapis.com/v1/documents/${doc.documentId}:batchUpdate`, { method: "POST", headers: gHeaders(token), body: JSON.stringify({ requests: [{ insertText: { location: { index: 1 }, text: o.text } }] }) }).catch(() => {});
  }
  return `https://docs.google.com/document/d/${doc.documentId}/edit`;
}

export async function appendSheet(token: string, spreadsheetId: string, rows: string[][], range = "A1"): Promise<void> {
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`, { method: "POST", headers: gHeaders(token), body: JSON.stringify({ values: rows }) });
  if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as Json)?.error?.message || "Sheet append failed");
}

export async function createEvent(token: string, o: { summary: string; start: string; end?: string; attendees?: string[] }): Promise<string> {
  const ev: Json = { summary: o.summary, start: { dateTime: o.start }, end: { dateTime: o.end || o.start } };
  if (o.attendees?.length) ev.attendees = o.attendees.map((e) => ({ email: e }));
  const r = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", { method: "POST", headers: gHeaders(token), body: JSON.stringify(ev) });
  const d = (await r.json()) as Json;
  if (!d?.id) throw new Error(d?.error?.message || "Event create failed");
  return d.htmlLink || "created";
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
