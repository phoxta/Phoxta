// Phoxta — shared Google OAuth helpers (consent scopes, redirect URI, an
// HMAC-signed `state` for the callback, and a refresh-aware access-token getter).
import type { SupabaseClient } from "./supabaseAdmin.ts";
import { messageIdOf, referenceIds } from "./mailText.ts";
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
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

function b64Bytes(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function b64Text(s: string): string {
  return b64Bytes(new TextEncoder().encode(s));
}
function b64urlText(s: string): string {
  return b64Text(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const gHeaders = (token: string) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });

/**
 * A header value can never contain a line break.
 *
 * These replies quote things that came from OUTSIDE — the sender's display
 * name, their Subject, their Message-ID. A CR or LF smuggled into any of them
 * would end our header and start one of the sender's choosing (a second To:, a
 * Bcc:), turning the business's own mailbox into a relay. Folded to one line
 * before it is ever written into a message.
 */
const headerValue = (v: string) => String(v ?? "").replace(/[\r\n]+/g, " ").trim();

// deno-lint-ignore no-control-regex
const NON_ASCII = /[^\x00-\x7F]/;

/**
 * RFC 2047 encoded-words. Raw UTF-8 in a header is not legal and arrives as
 * mojibake, which matters the moment a customer has an accent in their name or
 * writes a subject in a non-Latin script.
 *
 * Split, because RFC 2047 §2 caps an encoded-word at 75 octets and a single
 * one for a long German or Japanese subject runs well past that — legible in
 * every mainstream client, and rejectable by a strict gateway. 45 raw bytes
 * base64-encode to 60 characters, which with the `=?UTF-8?B?` … `?=` wrapper is
 * 72; the boundary is walked back so no encoded-word ends mid-character.
 */
function encodeWords(v: string): string {
  const bytes = new TextEncoder().encode(v);
  const out: string[] = [];
  for (let i = 0; i < bytes.length;) {
    let end = Math.min(i + 45, bytes.length);
    while (end > i + 1 && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    out.push(`=?UTF-8?B?${b64Bytes(bytes.subarray(i, end))}?=`);
    i = end;
  }
  // Continuation lines are folded with CRLF + a space, which is how a header is
  // legally continued and how a decoder is told the words are one value.
  return out.join("\r\n ");
}

function encodeHeader(v: string): string {
  const clean = headerValue(v);
  return NON_ASCII.test(clean) ? encodeWords(clean) : clean;
}

/**
 * An address header, where ONLY the display name may be encoded.
 *
 * `encodeHeader` over the whole value produced `To: =?UTF-8?B?…?=` with the
 * address itself sealed inside the encoded word — a message with no routable
 * recipient. Nothing in the old signature said "bare addresses only", so the
 * first caller to address a customer by name would have sent mail to nobody.
 */
function encodeAddress(v: string): string {
  const clean = headerValue(v);
  const m = clean.match(/^(.*?)\s*<([^>]*)>\s*$/);
  if (!m) return clean;
  const name = m[1].trim().replace(/^"(.*)"$/, "$1");
  const addr = m[2].trim();
  if (!name) return `<${addr}>`;
  const encoded = NON_ASCII.test(name) ? encodeWords(name) : `"${name.replace(/(["\\])/g, "\\$1")}"`;
  return `${encoded} <${addr}>`;
}

/** Base64 body, wrapped at 76 columns as MIME requires. */
const b64Body = (s: string) => (b64Text(s).match(/.{1,76}/g) ?? []).join("\r\n");

/** The References chain for a reply: the inbound chain plus the message being
 *  answered, normalised, de-duplicated and bounded (an unbounded chain grows
 *  without limit on a long thread and some servers reject the header outright). */
function referencesChain(references: string | undefined, inReplyTo: string): string {
  const ids = [...referenceIds(references ?? ""), ...(inReplyTo ? [inReplyTo] : [])];
  return [...new Set(ids)].slice(-12).join(" ");
}

export type GmailSendResult = { id: string; threadId: string };

/**
 * Send from the connected mailbox, correctly threaded.
 *
 * `threadId` alone does NOT thread a message: Gmail also wants In-Reply-To and
 * References pointing at a real Message-ID in that thread, and a Subject that
 * matches the thread's (the "Re: " prefix is normalised away). Get any of them
 * wrong and the reply silently opens a new thread in the customer's client.
 *
 * From is deliberately absent — Gmail stamps the authenticated mailbox, which
 * is the entire reason a reply to mail that arrived here must go out here and
 * not through the platform's own sending domain.
 *
 * `autoReplied` marks the message machine-generated (RFC 3834 + the Microsoft
 * equivalent) so the far end's own autoresponder suppresses itself. Without it
 * we are the undetectable half of somebody else's mail loop.
 */
export async function gmailSendMessage(token: string, o: {
  to: string;
  subject: string;
  text: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
  autoReplied?: boolean;
}): Promise<GmailSendResult> {
  const headers = [
    `To: ${encodeAddress(o.to)}`,
    `Subject: ${encodeHeader(o.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
  ];
  // Only a real msg-id may be written here. A provider GUID (Postmark's
  // MessageID, Resend's message_id) used to go in verbatim, emitting an invalid
  // In-Reply-To and NO References at all — breaking threading on exactly the
  // mail the header was there to thread.
  const inReplyTo = messageIdOf(o.inReplyTo ?? "");
  if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`);
  const refs = referencesChain(o.references, inReplyTo);
  if (refs) headers.push(`References: ${refs}`);
  if (o.autoReplied) headers.push("Auto-Submitted: auto-replied", "X-Auto-Response-Suppress: All");

  const raw = b64urlText(`${headers.join("\r\n")}\r\n\r\n${b64Body(o.text)}`);
  const payload: Record<string, string> = { raw };
  if (o.threadId) payload.threadId = o.threadId;

  const r = await fetch(`${GMAIL_API}/messages/send`, { method: "POST", headers: gHeaders(token), body: JSON.stringify(payload) });
  const d = (await r.json().catch(() => ({}))) as Json;
  if (!r.ok || !d?.id) throw new Error(d?.error?.message || `Gmail send failed (${r.status})`);
  return { id: String(d.id), threadId: String(d.threadId ?? o.threadId ?? "") };
}

/** Back-compat wrapper: a fresh, unthreaded mail from the connected mailbox
 *  (the operator agent's google_send_email tool). */
export async function gmailSendRaw(token: string, o: { to: string; subject: string; text: string }): Promise<void> {
  await gmailSendMessage(token, o);
}

/**
 * Has somebody already answered this thread FROM the mailbox?
 *
 * The owner replying in Gmail itself never reaches our database — gmail-sync
 * only ingests INBOX — so without this the agent would write a second reply on
 * top of a human's, which is precisely what "the AI talked over me" looks like.
 * Any SENT message in the thread newer than the inbound one counts.
 */
export async function gmailThreadHasNewerSent(token: string, threadId: string, afterMs: number): Promise<boolean> {
  if (!threadId || !afterMs) return false;
  try {
    const r = await fetch(`${GMAIL_API}/threads/${encodeURIComponent(threadId)}?format=minimal`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return false;
    const d = (await r.json()) as Json;
    return ((d?.messages ?? []) as Json[]).some(
      (m) => (m?.labelIds ?? []).includes("SENT") && Number(m?.internalDate ?? 0) > afterMs,
    );
  } catch {
    return false;
  }
}

/**
 * Has anyone at the business already answered THIS person from the mailbox?
 *
 * gmailThreadHasNewerSent needs a Gmail thread id, which only mail pulled from
 * the connected mailbox has. Mail that arrived through the platform's inbound
 * webhook has none — so on that channel the "a human already replied" check
 * could not run at all, and a catch-up worker on a five-minute cron would answer
 * a message the owner had already dealt with in their own mail client. Gmail's
 * search covers it: any SENT message to that address after the mail arrived.
 *
 * Deliberately quiet on failure: a missing token, a search scope that was never
 * granted, or an API error must not stop the agent answering — the other gates
 * (the ceiling, the cap, the switch) are the ones that must hold.
 */
export async function gmailHasNewerSentTo(token: string, email: string, afterMs: number): Promise<boolean> {
  const to = String(email ?? "").trim();
  if (!token || !to.includes("@") || !afterMs) return false;
  try {
    // Gmail's `after:` takes whole seconds; a second early is the safe direction
    // (it can only find MORE evidence that a human replied).
    const after = Math.floor(afterMs / 1000);
    const q = `in:sent to:${to} after:${after}`;
    const r = await fetch(`${GMAIL_API}/messages?maxResults=1&q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return false;
    const d = (await r.json()) as Json;
    return ((d?.messages ?? []) as Json[]).length > 0;
  } catch {
    return false;
  }
}

/** The org's Google connection row. `select("*")` on purpose: auto_reply_from
 *  arrives with migration 0114 and a named select of a not-yet-applied column
 *  errors into `null`, which would read as "no connection at all".
 *
 *  `autoReplyFrom` is null when the COLUMN itself is absent — a deploy that ran
 *  before the migration. That is not the same as "no watermark": treating it as
 *  0 let the first tick auto-answer up to two days of correspondence the owner
 *  had already handled, from the owner's own address. The callers refuse to
 *  answer anything until the column exists. */
export type GoogleConnection = { email: string; scope: string; autoReplyFrom: number | null };

export async function getConnection(admin: SupabaseClient, orgId: string): Promise<GoogleConnection | null> {
  const { data } = await admin.from("google_connections").select("*").eq("organization_id", orgId).maybeSingle();
  if (!data) return null;
  const c = data as Json;
  const hasColumn = Object.prototype.hasOwnProperty.call(c, "auto_reply_from");
  const from = c.auto_reply_from ? Date.parse(String(c.auto_reply_from)) : NaN;
  return {
    email: String(c.email ?? "").trim().toLowerCase(),
    scope: String(c.scope ?? ""),
    autoReplyFrom: hasColumn ? (Number.isFinite(from) ? from : 0) : null,
  };
}

/** The reason a mailbox may not be auto-answered yet, or null when it may be.
 *  One place, because gmail-sync and agent-catchup must not disagree about
 *  whether a connection is fit to reply from. */
export function mailboxReplyBlocker(conn: GoogleConnection | null): string | null {
  if (!conn) return "this business has no connected Google mailbox";
  if (conn.autoReplyFrom === null) {
    return "the automatic-reply watermark is not installed yet — apply migration 0114 before the agent answers this mailbox";
  }
  if (!canSendMail(conn)) return "Google is connected without permission to send mail — reconnect Google in Settings";
  return null;
}

/** Gmail sending needs gmail.modify (or gmail.send). GOOGLE_SCOPES has carried
 *  gmail.modify for a long time, but a refresh token only holds what was
 *  granted at ITS consent — an older connection fails the send with 403 and the
 *  honest answer is "reconnect Google", not a silent nothing. */
export function canSendMail(conn: GoogleConnection | null): boolean {
  if (!conn) return false;
  const s = conn.scope;
  // An empty scope string predates the column being recorded; those connections
  // were made with the full GOOGLE_SCOPES list, so treat it as permissive and
  // let a real 403 be the thing that reports the problem.
  if (!s.trim()) return true;
  return s.includes("gmail.modify") || s.includes("gmail.send") || s.includes("https://mail.google.com/");
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
