// Phoxta — gmail-sync: pulls recent Gmail inbox messages into the unified Inbox
// AND lets the agent answer them, on the same mailbox and inside the same
// thread. Two modes:
//   • cron  : POST with header x-cron-secret: $CRON_SECRET → syncs ALL connected orgs
//   • manual: member-authed { organizationId } → syncs that one business
// verify_jwt is declared in supabase/config.toml (false — the cron path has no
// Supabase JWT). Never pass --no-verify-jwt on the command line: the flag is
// permanent and the file is the only thing that can put it back.
//
// ── WHY THIS FILE GREW A REPLY LEG ──────────────────────────────────────────
// It used to insert the customer's message, touch last_message_at and return.
// Mail arriving in a business's connected mailbox was therefore filed for a
// human and never answered, while every other channel (web chat, SMS, WhatsApp,
// voice, and the inbound-webhook email path) reached the agent automatically.
// That single missing call is the whole of "an email came in and the AI did not
// pick it up".
//
// The reply goes back out through the Gmail API as the connected mailbox, in the
// original thread. Sending it through the platform's own provider instead would
// answer the customer from a different company's address, start a new thread,
// and route their next reply into Phoxta's mailbox rather than the business's —
// see _shared/conversationEmail.ts, which owns that decision for every caller.
//
// Every gate that decides whether an answer is allowed lives in
// _shared/autoReply.ts, shared with email-inbound and agent-catchup, so there is
// one place where "may the agent answer this?" is decided rather than three.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import { getAccessToken, getConnection, gmailThreadHasNewerSent, mailboxReplyBlocker, type GoogleConnection } from "../_shared/google.ts";
import { loadConfig, respondCore, type AgentConfig, type Org } from "../_shared/agentCore.ts";
import {
  addressOf,
  autoReplyAllowed,
  autoReplyMode,
  automatedMailReason,
  claimForReply,
  deliverAutoReply,
  displayNameOf,
  markNotAnswered,
  modeReason,
  notifyNeedsHuman,
  replySubject,
  selfAddresses,
  trimForAgent,
  type AutoReplyMode,
} from "../_shared/autoReply.ts";

// deno-lint-ignore no-explicit-any
type Json = any;
const API = "https://gmail.googleapis.com/gmail/v1/users/me";

const envNum = (k: string, d: number) => {
  const v = Number(Deno.env.get(k));
  return Number.isFinite(v) && v > 0 ? v : d;
};

/** How much mail one tick will look at. The old ceiling was a single page of 20
 *  inside a fixed two-day window with no pageToken, so anything past the 20th
 *  message never rotated back into view and was lost silently. */
const PAGE_SIZE = 25;
const maxMessages = () => envNum("GMAIL_SYNC_MAX_MESSAGES", 60);
/** How many replies one org may send in one tick. The rest are ingested and left
 *  for the next tick or for agent-catchup — a cap is what stops a first run
 *  after connecting a mailbox turning into a burst of mail. */
const maxRepliesPerRun = () => envNum("GMAIL_SYNC_MAX_REPLIES_PER_RUN", 5);

const b64urlDecode = (s: string): string => {
  try { return new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))); } catch { return ""; }
};
const headerMap = (p: Json): Record<string, string> => Object.fromEntries((p?.headers ?? []).map((h: Json) => [String(h.name).toLowerCase(), h.value]));
/** Readable text from a markup body — for previews, search and the agent. */
function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Both halves of a mail body, kept separate.
 *
 * This used to return one string and throw the markup away — text/html was
 * flattened with a tag strip, so every synced email arrived in the console as
 * one grey paragraph with its layout, headings, links and images gone. The HTML
 * is what a mail client renders; the text is what a preview and the agent read.
 */
function extractBody(p: Json): { text: string; html: string } {
  const out = { text: "", html: "" };
  const walk = (n: Json) => {
    if (!n) return;
    if (n.mimeType === "text/plain" && n.body?.data && !out.text) out.text = b64urlDecode(n.body.data);
    if (n.mimeType === "text/html" && n.body?.data && !out.html) out.html = b64urlDecode(n.body.data);
    for (const part of n.parts ?? []) walk(part);
  };
  walk(p);
  if (!out.text && out.html) out.text = htmlToText(out.html);
  return out;
}

/** Why a sync produced nothing. "no new mail" and "the connection is dead" both
 *  used to return 0, so a revoked Google token looked exactly like a quiet
 *  inbox: the cron logged HTTP 200 forever and nobody learned email had stopped
 *  arriving. The caller now gets the reason. */
type SyncResult = { imported: number; replied: number; skipped: number; failed: number; error?: string };

/** Link the sender to the org's unified contact record. gmail-synced threads had
 *  contact_id null forever, which is why the agent answered an email with no
 *  memory of the same person's calls and texts. Best-effort by design: identity
 *  bookkeeping must never cost us the message. */
async function resolveContact(admin: SupabaseClient, orgId: string, email: string, name: string): Promise<string | null> {
  try {
    const { data, error } = await admin.rpc("app_resolve_contact", {
      p_org: orgId, p_kind: "email", p_value: email, p_name: name, p_verified: true,
    });
    if (error) {
      console.warn("[phoxta] gmail-sync contact link skipped:", error.message);
      return null;
    }
    return (data as string | null) ?? null;
  } catch {
    return null;
  }
}

/** The newest open email thread for this sender, or a new one. */
async function resolveConversation(
  admin: SupabaseClient,
  orgId: string,
  fromEmail: string,
  customerName: string,
  subject: string,
): Promise<string | null> {
  const contactId = await resolveContact(admin, orgId, fromEmail, customerName);
  const { data: existing } = await admin
    .from("conversations")
    .select("id, contact_id")
    .eq("organization_id", orgId).eq("channel_type", "email").eq("customer_email", fromEmail)
    // is_test=false, the same predicate email-inbound and agentCore.resolveConversation
    // use. Without it, an owner who had ever exercised the Playground on the email
    // channel with their own address left a sandbox thread that was the newest open
    // email conversation for it — so the next REAL mail from that person attached to
    // a conversation the console labels as a test, and the agent answered it for real
    // from the business's own mailbox. (agent-catchup refuses a sandbox thread; this
    // funnel had no such check.)
    .eq("is_test", false)
    .neq("status", "closed")
    .order("last_message_at", { ascending: false }).limit(1).maybeSingle();
  if (existing) {
    const e = existing as Json;
    if (contactId && !e.contact_id) {
      await admin.from("conversations").update({ contact_id: contactId }).eq("id", e.id);
    }
    return String(e.id);
  }
  const { data: conv, error } = await admin.from("conversations")
    .insert({
      organization_id: orgId, channel_type: "email", customer_email: fromEmail,
      customer_name: customerName, status: "open", summary: subject, contact_id: contactId,
      is_test: false,
    })
    .select("id").single();
  if (error || !conv) {
    console.error("[phoxta] gmail-sync could not open a conversation:", error?.message);
    return null;
  }
  return String((conv as Json).id);
}

/** Everything the reply leg needs, resolved once per organisation. Kept inside
 *  syncOrg's scope on purpose: the org's own access token and its own connection
 *  row are the tenant boundary, and hoisting either would send one business's
 *  reply from another business's mailbox. */
type ReplyContext = {
  org: Org | null;
  config: AgentConfig | null;
  conn: GoogleConnection | null;
  mode: AutoReplyMode;
  self: string[];
  /** Mail older than this is ingested but never auto-answered. */
  watermark: number;
  /** Why this mailbox may not be auto-answered AT ALL (no send scope, or the
   *  watermark column is not installed yet — a deploy that ran before the
   *  migration must not answer two days of already-handled correspondence). */
  blocker: string | null;
};

async function syncOrg(admin: SupabaseClient, orgId: string): Promise<SyncResult> {
  const out: SyncResult = { imported: 0, replied: 0, skipped: 0, failed: 0 };

  const token = await getAccessToken(admin, orgId);
  if (!token) {
    // Either never connected, or the refresh token was revoked/expired — both
    // need a human to reconnect Google, so both must be visible.
    out.error = "google not connected or token expired — reconnect in Settings";
    return out;
  }
  const gf = (p: string) => fetch(`${API}${p}`, { headers: { Authorization: `Bearer ${token}` } });

  // Paged, and bounded. Gmail returns newest first, so without a pageToken a
  // busier mailbox than one page silently lost everything past the first page
  // for good — the window is `newer_than:2d`, so it never came back.
  const ids: string[] = [];
  let pageToken = "";
  const ceiling = maxMessages();
  while (ids.length < ceiling) {
    const q = `/messages?maxResults=${PAGE_SIZE}&q=${encodeURIComponent("in:inbox newer_than:2d")}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
    const r = await gf(q);
    if (!r.ok) {
      out.error = `gmail api ${r.status}`;
      return out;
    }
    const page = (await r.json()) as Json;
    for (const m of (page.messages ?? []) as Json[]) {
      if (ids.length < ceiling) ids.push(String(m.id));
    }
    pageToken = String(page.nextPageToken ?? "");
    if (!pageToken) break;
  }
  if (ids.length === 0) return out;

  const conn = await getConnection(admin, orgId);
  const { data: orgRow } = await admin.from("organizations").select("id, name, vertical").eq("id", orgId).maybeSingle();
  const ctx: ReplyContext = {
    org: (orgRow as Org | null) ?? null,
    config: null, // loaded on the first message that actually needs it
    conn,
    mode: await autoReplyMode(admin, orgId),
    self: await selfAddresses(admin, orgId, conn?.email ?? ""),
    watermark: conn?.autoReplyFrom ?? 0,
    blocker: mailboxReplyBlocker(conn),
  };
  const replyCap = maxRepliesPerRun();

  // Gmail lists newest first; answer in the order the customer sent, so a person
  // who wrote twice gets a reply to the conversation, not to the older message.
  ids.reverse();

  for (const id of ids) {
    // Org-scoped and ROLE-AGNOSTIC on purpose: the agent's own sent reply is
    // recorded with the Gmail id of the message it sent, so if that reply ever
    // lands back in this inbox (a group alias, a self-addressed list) this same
    // check refuses to re-ingest it as a new customer message.
    //
    // The error is NOT discarded. maybeSingle() errors when more than one row
    // matches — the exact state migration 0114 tolerates when a project already
    // held duplicate provider_sid rows and the unique index could not be built —
    // and a discarded error reads as data:null, i.e. "never seen", forever. With
    // a reply hanging off the insert, "I could not tell" has to mean "already
    // seen": re-ingesting means re-answering, every five minutes.
    const { data: dup, error: dupErr } = await admin
      .from("conversation_messages")
      .select("id")
      .eq("organization_id", orgId)
      .eq("provider_sid", id)
      .maybeSingle();
    if (dupErr) {
      console.error("[phoxta] gmail-sync dedupe read failed, skipping message:", dupErr.message);
      out.skipped++;
      continue;
    }
    if (dup) continue;

    const mr = await gf(`/messages/${id}?format=full`);
    if (!mr.ok) {
      out.failed++;
      out.error = `gmail api ${mr.status}`;
      continue;
    }
    const md = (await mr.json()) as Json;
    const h = headerMap(md.payload);
    const from = h.from ?? "";
    const subject = h.subject ?? "(no subject)";
    const parsed = extractBody(md.payload);
    const text = parsed.text || md.snippet || "";
    const html = parsed.html;
    const fromEmail = addressOf(from);
    const customerName = displayNameOf(from);
    const labelIds = (md.labelIds ?? []) as string[];
    const gmailThreadId = String(md.threadId ?? "");
    const messageId = String(h["message-id"] ?? "");
    const references = String(h["references"] ?? "");
    const internalDate = Number(md.internalDate ?? 0);

    const convId = await resolveConversation(admin, orgId, fromEmail, customerName, subject);
    if (!convId) { out.failed++; continue; }

    // The threading keys were fetched and thrown away on every sync until now,
    // so nothing — not a retry, not the console, not a human — could compose a
    // threaded reply to a message already in the Inbox. They are stored per
    // MESSAGE rather than per conversation because one email conversation here
    // can span several distinct Gmail threads (it is keyed on the sender).
    const meta: Json = {
      subject,
      source: "gmail-sync",
      ...(html ? { html } : {}),
      gmail_thread_id: gmailThreadId,
      message_id: messageId,
      references,
      to: String(h["to"] ?? ""),
      internal_date: internalDate,
      labels: labelIds,
    };

    // Decided BEFORE the write, so the reason is stored with the message and the
    // question "why did the agent ignore this one?" has an answer on the row.
    //
    // `retryable` is what agent-catchup reads to decide what still deserves an
    // answer later, and it is set PER REASON. It used to be false for every
    // classifier hit, so a heuristic — a shared-mailbox local part, an
    // out-of-office-shaped subject — buried a real customer permanently. Only a
    // definitive signal (RFC 3834, List-*, a bounce, our own address) settles it.
    const verdict = automatedMailReason({
      headers: h,
      labelIds,
      mimeType: md.payload?.mimeType,
      subject,
      fromEmail,
      selfAddresses: ctx.self,
    });
    let skip: string | null = verdict?.reason ?? null;
    let retryable = verdict ? !verdict.definitive : true;
    let needsHuman = false;
    if (!skip && !text.trim()) {
      // Settled for the AGENT (the body will not become readable on a later tick,
      // and leaving it live burns an inspection slot every five minutes with no
      // possible progress) but NOT for the business: a purchase order sent as one
      // PDF, or a mail built entirely of images, is a real customer a machine
      // cannot read. A person is told instead of it being buried silently.
      skip = "the message had no readable text — it needs a person to open it";
      retryable = false;
      needsHuman = true;
    }
    if (!skip) {
      if (ctx.mode !== "auto") { skip = modeReason(ctx.mode); needsHuman = ctx.mode === "approve"; }
      else if (!ctx.org) skip = "the business record could not be loaded";
      else if (ctx.blocker) skip = ctx.blocker;
      else if (ctx.watermark && internalDate && internalDate < ctx.watermark) {
        // Retryable on purpose: the watermark is a setting an owner can move
        // back deliberately to let the agent answer older mail, and agent-catchup
        // re-reads it, so burning the row here would make that impossible.
        skip = "it arrived before automatic replies were switched on for this mailbox";
      } else if (out.replied >= replyCap) {
        skip = "this sync had already sent its maximum replies — the catch-up worker answers it on the next tick";
      }
    }

    // html goes in meta so the console renders the real message; body stays the
    // readable text that previews, search and the agent work from. The insert is
    // also the lock: if it fails, nothing is answered, because an unrecorded
    // message cannot be deduplicated and would be answered again next tick.
    const { data: row, error: insErr } = await admin.from("conversation_messages").insert({
      organization_id: orgId, conversation_id: convId, role: "customer", channel_type: "email",
      body: text, provider_sid: id,
      meta: skip ? { ...meta, auto_reply: { answered: false, reason: skip, retryable, at: new Date().toISOString() } } : meta,
    }).select("id").single();
    if (insErr || !row) {
      console.error("[phoxta] gmail-sync message insert failed:", insErr?.message);
      out.failed++;
      continue;
    }
    await admin.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", convId);
    out.imported++;
    const rowId = String((row as Json).id);

    if (skip) {
      out.skipped++;
      if (needsHuman) await notifyNeedsHuman(admin, orgId, convId, `${customerName || fromEmail}: ${subject}`);
      continue;
    }

    // --- The pre-flight: every gate, run before a model turn is spent. The
    //     SAME gates run again inside deliverAutoReply, which is what actually
    //     sends — this call only exists so a refusal costs nothing. ---
    const pre = await autoReplyAllowed(admin, orgId, { conversationId: convId, channel: "email", mode: ctx.mode });
    if (!pre.ok) {
      await markNotAnswered(admin, orgId, rowId, meta, pre.reason, pre.retryable);
      if (pre.needsHuman) await notifyNeedsHuman(admin, orgId, convId, `${customerName || fromEmail}: ${subject}`);
      out.skipped++;
      continue;
    }
    // Somebody may have answered from Gmail itself in the minutes since the mail
    // arrived — that reply never reaches our database, because only INBOX is
    // ingested. Without this the agent writes on top of a human.
    if (gmailThreadId && await gmailThreadHasNewerSent(token, gmailThreadId, internalDate)) {
      await markNotAnswered(admin, orgId, rowId, meta, "someone had already replied from the mailbox", false);
      out.skipped++;
      continue;
    }

    // --- Claim it. Ingest and reply are not one step: the agent row only exists
    //     once the model returns, so for the whole of that window agent-catchup
    //     sees this message as unanswered and would compose a second reply to
    //     the same email. Whoever wins the claim owns the answer. ---
    if (!(await claimForReply(admin, orgId, rowId, meta))) {
      out.skipped++;
      continue;
    }

    // --- Compose. respondCore owns ai_paused, the monthly allowance, the
    //     knowledge base, the tools and the owner's saved replies. ---
    const config = ctx.config ?? (ctx.config = await loadConfig(admin, orgId));
    let result;
    try {
      result = await respondCore(admin, ctx.org!, config, {
        channel: "email",
        conversationId: convId,
        customer: { email: fromEmail, name: customerName },
        message: trimForAgent(text),
        // The customer's message is already on the thread, with its provider id,
        // its HTML and its threading keys — respondCore must not file it again,
        // and must drop it from the history rather than send it to the model a
        // second time. The row id is how it recognises it.
        inbound: { recorded: true, recordedId: rowId },
      });
    } catch (e) {
      const why = String((e as Error)?.message || e);
      console.error("[phoxta] gmail-sync compose failed:", why);
      await markNotAnswered(admin, orgId, rowId, meta, `the agent could not compose a reply: ${why}`);
      out.failed++;
      continue;
    }
    if (result.paused) {
      await markNotAnswered(admin, orgId, rowId, meta, "a human has taken over this thread", false);
      out.skipped++;
      continue;
    }
    if (result.capped) {
      await markNotAnswered(admin, orgId, rowId, meta, "the monthly usage allowance for this plan is spent");
      out.skipped++;
      continue;
    }
    const reply = result.reply.trim();
    if (!reply) {
      await markNotAnswered(admin, orgId, rowId, meta, "the agent composed no reply");
      out.skipped++;
      continue;
    }

    // --- The funnel. It re-runs the gates, claims the daily budget, sends from
    //     this mailbox in this thread, stamps the delivery status onto the agent
    //     row (provider_sid there is the Gmail id of what we SENT — the dedupe
    //     key that stops the next sync reading our own reply as new mail) and
    //     writes the audit line. ---
    const delivered = await deliverAutoReply(admin, orgId, {
      channel: "email",
      trigger: "gmail-sync",
      conversationId: convId,
      to: fromEmail,
      text: reply,
      subject: replySubject(subject),
      inboundSubject: subject,
      agentMessageId: result.agentMessageId,
      customerMessageId: rowId,
      customerMeta: meta,
      template: result.template,
      mode: ctx.mode,
      thread: { threadId: gmailThreadId, messageId, references, subject, fromMailbox: true },
      stampExtra: { source: "gmail-sync", in_reply_to: messageId, gmail_thread_id: gmailThreadId },
    });
    if (delivered.sent) out.replied++;
    else if (delivered.outcome) out.failed++;
    else out.skipped++;
  }
  return out;
}

/**
 * Recover the HTML and the threading keys for mail imported before they were kept.
 *
 * The old extractBody preferred text/plain and dropped the markup, so every
 * message synced before that fix holds a sender's plain-text alternative — the
 * flattened "Docs ( https://... )" version — and nothing else. The threading
 * keys (Gmail thread id, Message-ID, References) were never stored at all, so
 * nothing could compose a threaded reply to the existing backlog.
 *
 * Both are still in Gmail, and provider_sid holds the message id, so they can be
 * fetched again and filed into meta where the console and the reply path look
 * for them. Bounded per call, so a large mailbox is several passes rather than a
 * timeout.
 *
 * This path NEVER answers anything. It re-reads historical mail across every
 * connected org in one pass, and an auto-reply hook here would answer months of
 * correspondence at once.
 */
type BackfillResult = {
  filled: number;
  threaded: number;
  checked: number;
  alreadyHad: number;
  noHtmlInGmail: number;
  fetchFailed: number;
  lastError?: string;
  error?: string;
};

async function backfillOrg(admin: SupabaseClient, orgId: string, limit: number): Promise<BackfillResult> {
  const out: BackfillResult = { filled: 0, threaded: 0, checked: 0, alreadyHad: 0, noHtmlInGmail: 0, fetchFailed: 0 };

  const token = await getAccessToken(admin, orgId);
  if (!token) {
    out.error = "google not connected or token expired — reconnect in Settings";
    return out;
  }
  const gf = (p: string) => fetch(`${API}${p}`, { headers: { Authorization: `Bearer ${token}` } });

  // Any email message carrying a provider id is a candidate. Filtering on
  // meta->>source = 'gmail-sync' missed everything the Gmail app imported,
  // which writes source 'gmail' — a fetch that 404s costs one call and is
  // counted, which is cheaper than being wrong about who owns a row.
  const { data: rows, error } = await admin
    .from("conversation_messages")
    .select("id, provider_sid, meta")
    .eq("organization_id", orgId)
    .eq("channel_type", "email")
    .not("provider_sid", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    out.error = `read failed: ${error.message}`;
    return out;
  }

  for (const m of ((rows ?? []) as Json[])) {
    out.checked++;
    const meta = (m.meta ?? {}) as Json;
    const needsHtml = !meta.html;
    const needsThread = !meta.gmail_thread_id;
    if (!needsHtml && !needsThread) { out.alreadyHad++; continue; }
    if (!m.provider_sid) continue;

    const res = await gf(`/messages/${m.provider_sid}?format=full`);
    if (!res.ok) {
      // Counted and reported. Swallowing this is what made the first attempt
      // return "0 filled, all good" when the token was the problem.
      out.fetchFailed++;
      out.lastError = `gmail api ${res.status}`;
      continue;
    }
    const md = (await res.json()) as Json;
    const { html } = extractBody(md.payload);
    const h = headerMap(md.payload);
    if (needsHtml && !html && !needsThread) { out.noHtmlInGmail++; continue; }

    const patch: Json = { ...meta };
    if (needsHtml && html) patch.html = html;
    if (needsThread) {
      patch.gmail_thread_id = String(md.threadId ?? "");
      patch.message_id = String(h["message-id"] ?? "");
      patch.references = String(h["references"] ?? "");
      patch.internal_date = Number(md.internalDate ?? 0);
    }

    const { error: upErr } = await admin.from("conversation_messages").update({ meta: patch }).eq("id", m.id);
    if (upErr) {
      out.lastError = `write failed: ${upErr.message}`;
      continue;
    }
    if (needsHtml && html) out.filled++;
    if (needsThread) out.threaded++;
    if (needsHtml && !html) out.noHtmlInGmail++;
  }
  return out;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const admin = adminClient();
    // Parsed up front so the cron path can ask for a backfill too — it is the
    // only caller that can reach every org in one pass.
    const body = (await req.json().catch(() => ({}))) as { organizationId?: string; mode?: string; limit?: number };
    const backfill = body?.mode === "backfill";
    const limit = Math.max(1, Math.min(Number(body?.limit ?? 50), 200));

    const cronSecret = Deno.env.get("CRON_SECRET");
    if (cronSecret && req.headers.get("x-cron-secret") === cronSecret) {
      const { data: conns } = await admin.from("google_connections").select("organization_id");
      const list = (conns as Json[] | null) ?? [];
      let total = 0;
      let replied = 0;
      // One broken connection must not stop the others, but it must be reported:
      // swallowing it is what made a dead mailbox indistinguishable from a quiet one.
      const problems: { org: string; error: string }[] = [];
      for (const c of list) {
        try {
          const r = backfill
            ? await backfillOrg(admin, c.organization_id, limit)
            : await syncOrg(admin, c.organization_id);
          if (backfill) {
            total += (r as BackfillResult).filled;
          } else {
            const s = r as SyncResult;
            total += s.imported;
            replied += s.replied;
            // The function logs were completely silent about this worker, so a
            // mailbox that stopped importing looked identical to a quiet one.
            console.log(`[phoxta] gmail-sync ${c.organization_id}: imported=${s.imported} replied=${s.replied} skipped=${s.skipped} failed=${s.failed}${s.error ? ` error=${s.error}` : ""}`);
          }
          if (r.error) problems.push({ org: c.organization_id, error: r.error });
        } catch (e) {
          problems.push({ org: c.organization_id, error: String((e as Error)?.message || e) });
        }
      }
      // A heartbeat, so cron_heartbeats proves THIS worker ran rather than only
      // proving the loop that pings it is alive.
      try {
        await admin.rpc("app_cron_beat", {
          p_worker: "gmail-sync",
          p_ok: problems.length === 0,
          p_detail: problems.length ? problems.map((p) => `${p.org}: ${p.error}`).join("; ") : `${list.length} mailbox(es), ${total} imported, ${replied} answered`,
        });
      } catch { /* the tick still ran */ }
      // Which orgs were synced, not just how many: "1 connection" does not tell
      // you WHICH mailbox is wired up, which is the first question when mail is
      // not arriving where you expect.
      return json({
        ok: problems.length === 0,
        mode: backfill ? "backfill" : "sync",
        orgs: list.map((c) => c.organization_id),
        [backfill ? "filled" : "imported"]: total,
        ...(backfill ? {} : { replied }),
        problems,
      });
    }
    // A manual sync now SENDS: up to GMAIL_SYNC_MAX_REPLIES_PER_RUN real
    // customer emails per press, from the business's own mailbox. That is an
    // owner/admin action, the same as agent-catchup. The backfill leg never
    // sends anything, so it stays open to any member.
    const a = await authorize(req, body?.organizationId, backfill ? undefined : { requireAdmin: true });
    if (a.error) return a.error;
    if (backfill) {
      const r = await backfillOrg(a.ok.admin, a.ok.org.id, limit);
      return json({ ok: !r.error, ...r, error: r.error ?? r.lastError ?? null });
    }
    const r = await syncOrg(a.ok.admin, a.ok.org.id);
    return json({ ok: !r.error, imported: r.imported, replied: r.replied, skipped: r.skipped, failed: r.failed, error: r.error ?? null });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
