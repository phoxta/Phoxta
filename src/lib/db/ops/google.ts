import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

// Per-org Google Workspace connection (status only — tokens stay server-side).
export type GoogleConnection = { email: string; scope: string; updated_at: string };

export async function getGoogleConnection(orgId: string): Promise<{ data: GoogleConnection | null; error: string | null }> {
  const { data, error } = await supabase
    .from("google_connections")
    .select("email, scope, updated_at")
    .eq("organization_id", orgId)
    .maybeSingle();
  return { data: (data as GoogleConnection | null) ?? null, error: friendlyError(error?.message) };
}

/** Kicks off the OAuth flow by redirecting the browser to Google's consent screen. */
export async function startGoogleConnect(orgId: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke("google-connect", { body: { organizationId: orgId, action: "url" } });
  const url = (data as { url?: string })?.url;
  if (error || !url) return { error: friendlyError(error?.message) ?? "Could not start Google connect." };
  window.location.href = url;
  return { error: null };
}

export async function disconnectGoogle(orgId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.functions.invoke("google-connect", { body: { organizationId: orgId, action: "disconnect" } });
  return { error: friendlyError(error?.message) };
}

// --- Gmail (via the connected Workspace mailbox) ----------------------------
export type GmailMsg = { id: string; threadId: string; from: string; subject: string; date: string; snippet: string; unread: boolean };
export type GmailFull = { id: string; threadId: string; from: string; to: string; subject: string; date: string; body: string };

async function gmail<T>(orgId: string, payload: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("google-gmail", { body: { organizationId: orgId, ...payload } });
  if (error) {
    let msg = error.message;
    try { const ctx = await (error as { context?: Response }).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* keep */ }
    return { data: null, error: friendlyError(msg) };
  }
  if ((data as { error?: string })?.error) return { data: null, error: String((data as { error: string }).error) };
  return { data: data as T, error: null };
}

export async function gmailList(orgId: string, q?: string): Promise<{ data: GmailMsg[]; error: string | null }> {
  const { data, error } = await gmail<{ messages: GmailMsg[] }>(orgId, { action: "list", q });
  return { data: data?.messages ?? [], error };
}
export async function gmailGet(orgId: string, id: string): Promise<{ data: GmailFull | null; error: string | null }> {
  return gmail<GmailFull>(orgId, { action: "get", id });
}
export async function gmailSend(orgId: string, opts: { to: string; subject: string; text: string; threadId?: string; inReplyTo?: string }): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await gmail<{ ok: boolean }>(orgId, { action: "send", ...opts });
  return { ok: !!data?.ok, error };
}
