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
export async function gmailImport(orgId: string, id: string): Promise<{ ok: boolean; conversationId: string | null; error: string | null }> {
  const { data, error } = await gmail<{ ok: boolean; conversationId: string }>(orgId, { action: "import", id });
  return { ok: !!data?.ok, conversationId: data?.conversationId ?? null, error };
}
/** Pull recent inbox mail into the unified Inbox (deduped). */
export async function gmailSync(orgId: string): Promise<{ imported: number; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("gmail-sync", { body: { organizationId: orgId } });
  if (error) {
    let msg = error.message;
    try { const ctx = await (error as { context?: Response }).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* keep */ }
    return { imported: 0, error: friendlyError(msg) };
  }
  return { imported: (data as { imported?: number })?.imported ?? 0, error: null };
}

// --- Workspace: email provisioning (Groups) + Drive + Calendar -------------
export type WsGroup = { email: string; name: string; members: number };
export type ProvisionResult = { email: string; created: boolean; forwarded: boolean; note: string };
export type DriveFile = { id: string; name: string; mimeType: string; modifiedTime: string; webViewLink: string; iconLink?: string };
export type CalEvent = { id: string; summary: string; start: string; end: string; link: string; location: string };

async function ws<T>(orgId: string, payload: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("google-workspace", { body: { organizationId: orgId, ...payload } });
  if (error) {
    let msg = error.message;
    try { const ctx = await (error as { context?: Response }).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* keep */ }
    return { data: null, error: friendlyError(msg) };
  }
  if ((data as { error?: string })?.error) return { data: null, error: String((data as { error: string }).error) };
  return { data: data as T, error: null };
}

export async function listWorkspaceEmails(orgId: string): Promise<{ data: WsGroup[]; error: string | null }> {
  const { data, error } = await ws<{ groups: WsGroup[] }>(orgId, { action: "list_emails" });
  return { data: data?.groups ?? [], error };
}
export async function provisionEmails(orgId: string, addresses?: string[]): Promise<{ data: { forwardTo: string; results: ProvisionResult[] } | null; error: string | null }> {
  return ws<{ forwardTo: string; results: ProvisionResult[] }>(orgId, { action: "provision_emails", addresses });
}
export async function driveList(orgId: string, opts?: { q?: string; mime?: string }): Promise<{ data: DriveFile[]; error: string | null }> {
  const { data, error } = await ws<{ files: DriveFile[] }>(orgId, { action: "drive_list", q: opts?.q, mime: opts?.mime });
  return { data: data?.files ?? [], error };
}
export async function calendarList(orgId: string): Promise<{ data: CalEvent[]; error: string | null }> {
  const { data, error } = await ws<{ events: CalEvent[] }>(orgId, { action: "calendar_list" });
  return { data: data?.events ?? [], error };
}
export async function calendarCreate(orgId: string, ev: { summary: string; start: string; end?: string; location?: string; description?: string; attendees?: string[] }): Promise<{ ok: boolean; link: string | null; error: string | null }> {
  const { data, error } = await ws<{ ok: boolean; link: string }>(orgId, { action: "calendar_create", ...ev });
  return { ok: !!data?.ok, link: data?.link ?? null, error };
}
export async function docsCreate(orgId: string, opts: { title: string; text?: string }): Promise<{ ok: boolean; link: string | null; error: string | null }> {
  const { data, error } = await ws<{ ok: boolean; link: string }>(orgId, { action: "docs_create", ...opts });
  return { ok: !!data?.ok, link: data?.link ?? null, error };
}
export async function sheetsRead(orgId: string, spreadsheetId: string, range?: string): Promise<{ data: string[][]; error: string | null }> {
  const { data, error } = await ws<{ values: string[][] }>(orgId, { action: "sheets_read", spreadsheetId, range });
  return { data: data?.values ?? [], error };
}
export async function sheetsAppend(orgId: string, spreadsheetId: string, rows: string[][], range?: string): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await ws<{ ok: boolean }>(orgId, { action: "sheets_append", spreadsheetId, rows, range });
  return { ok: !!data?.ok, error };
}
