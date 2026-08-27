// Phoxta — gmail-sync: pulls recent Gmail messages into the unified Inbox AND
// lets the agent answer them, on the same mailbox and inside the same thread.
// Modes:
//   • cron    : POST with header x-cron-secret: $CRON_SECRET → syncs ALL connected orgs
//   • manual  : member-authed { organizationId } → syncs that one business (admin;
//               it sends real mail)
//   • check   : member-authed { organizationId, mode:"check", address? } → reads
//               the mailbox and reports what it finds. SENDS NOTHING, WRITES
//               NOTHING. This is the leg the console's "Email delivery" screen
//               calls, and the reason an owner can now answer "where is my mail?"
//   • settings: admin-authed { organizationId, mode:"settings", … } → the sync
//               window and scope for this business
//   • backfill: re-fetches HTML/threading keys for mail already in the Inbox
// verify_jwt is declared in supabase/config.toml (false — the cron path has no
// Supabase JWT). Never pass --no-verify-jwt on the command line: the flag is
// permanent and the file is the only thing that can put it back.
//
// ── WHY THIS FILE GREW A DIAGNOSTIC LEG ─────────────────────────────────────
// A business owner reported that mail sent to their hello@ address never showed
// up in the console. Nothing in the product could tell them why, and neither
// could anyone reading the code, because every distinct failure produced the
// same silence: no connection, a revoked grant, the wrong Google account, a
// Gmail filter archiving the mail out of `in:inbox`, mail older than the
// two-day window, a cron that had stopped. syncOrg returned `imported: 0` for
// all of them, the client threw the error string away, and the Inbox rendered
// "No conversations yet".
//
// Every return path now carries its reason, every run is recorded against the
// organisation (email_sync_runs, migration 0117), and `mode:"check"` answers the
// questions that need Gmail itself: which mailbox is connected, does the token
// still work, is hello@ an alias of that mailbox or a Google Group, and where
// did the last message to it actually land.
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
import { authorize, isAdminRole } from "../_shared/auth.ts";
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import {
  canSendMail,
  getAccessTokenDetailed,
  getConnection,
  gmailErrorText,
  gmailMessagePeek,
  gmailProfile,
  gmailSearch,
  gmailSendAsList,
  gmailThreadHasNewerSent,
  mailboxReplyBlocker,
  type GmailMessagePeek,
  type GmailSendAs,
  type GoogleConnection,
} from "../_shared/google.ts";
import { orgInboundToken } from "../_shared/webhooks.ts";
import { loadConfig, respondCore, type AgentConfig, type Org } from "../_shared/agentCore.ts";
import {
  addressOf,
  autoReplyAllowed,
  autoReplyMode,
  automatedMailReason,
  claimForReply,
  deliverAutoReply,
  displayNameOf,
  INGEST_BACKFILL,
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
/**
 * How old a message may be and still be answered BY THIS SYNC.
 *
 * The read window below is now a per-business setting that defaults to seven
 * days, up from a hardcoded two. That is a change to what is INGESTED, and it
 * must not become a change to what is ANSWERED — an enquiry from six days ago is
 * one the business has almost certainly dealt with elsewhere, and a surprise AI
 * reply to it is exactly the kind of thing that makes an owner switch the agent
 * off. So the reply leg keeps the old two days regardless of how far the read
 * reaches.
 *
 * Deliberately RETRYABLE: agent-catchup is the path for older mail, it takes an
 * explicit `hours` from whoever runs it, and its own cron leg declines anything
 * past 48 hours for free. Burning the row here would take that decision away
 * from the owner.
 */
const replyMaxAgeMs = () => envNum("GMAIL_SYNC_REPLY_MAX_AGE_HOURS", 48) * 3600_000;
/** A hard stop on the pagination loop. The loop's own condition is
 *  `ids.length < ceiling`, and Gmail can return a page with no `messages` array
 *  but a live nextPageToken when a query is heavily filtered — so `ids` never
 *  grows, the ceiling is never reached, and the loop runs until Google runs out
 *  of pages. Inside a cron request budgeted at 100 seconds for four workers,
 *  that is how one mailbox starves the rest. */
const MAX_PAGES = 8;

// ── What the sync reads ─────────────────────────────────────────────────────
//
// This was the single constant `in:inbox newer_than:2d`, hardcoded, with no
// override on any caller. Both halves lose customer mail in silence:
//   • `in:inbox` misses everything a Gmail filter archived or routed to a label
//     with "Skip the Inbox" — the standard way a business files mail sent to a
//     role address, and therefore precisely the mail most likely to be a
//     customer enquiry.
//   • `newer_than:2d` is a hard floor, and there is no recovery behind it: no
//     historyId cursor, no backfill of MISSED mail anywhere in the product. A
//     tick that did not run, or a mailbox connected three days late, loses that
//     mail permanently.
//
// Both are now per-business settings (migration 0117) with wider defaults.
//
// Widening what is INGESTED does not widen what may be ANSWERED. Three separate
// gates hold that line, and none of them moves with the read window:
//   • mail no longer in the INBOX was filed away by a person — never answered
//     (the `inInbox` gate in the message loop, settled forever);
//   • mail older than replyMaxAgeMs — ingested, left for a human, retryable so
//     an owner can still point agent-catchup at it deliberately;
//   • the 0114 watermark still refuses anything from before automatic replies
//     were switched on for the mailbox.
const SCOPE_INBOX = "inbox";
const SCOPE_ALL = "all_mail";
const defaultWindowDays = () => Math.max(1, Math.min(30, envNum("GMAIL_SYNC_WINDOW_DAYS", 7)));
const defaultScope = () => (Deno.env.get("GMAIL_SYNC_SCOPE") === SCOPE_INBOX ? SCOPE_INBOX : SCOPE_ALL);

/** null (the column is not installed) and 0 both fall back to the env default. */
const windowDaysOf = (conn: GoogleConnection | null): number => {
  const n = Number(conn?.syncWindowDays);
  return Number.isFinite(n) && n > 0 ? Math.max(1, Math.min(30, Math.trunc(n))) : defaultWindowDays();
};
const scopeOf = (conn: GoogleConnection | null): string =>
  conn?.syncScope === SCOPE_INBOX || conn?.syncScope === SCOPE_ALL ? conn.syncScope : defaultScope();

/**
 * The Gmail search one run makes.
 *
 * `all_mail` deliberately carries no `in:` term. A Gmail query with no location
 * operator searches All Mail — Inbox, archived and every label — while still
 * excluding Spam and Trash unless `in:anywhere` is present. The negations are
 * belt and braces, and they matter: `-in:sent` is what stops the mailbox
 * re-ingesting the agent's own replies as new customer mail.
 *
 * THE QUERY IS NOT THE GUARANTEE. Gmail treats an operator it does not
 * recognise as free text, which turns a negation into a near no-op — and under
 * the old `in:inbox` query none of these negations was load-bearing, so nobody
 * would ever have noticed. Sent, Spam, Trash, drafts and Chat messages are all
 * refused AGAIN at row level, by label, inside the message loop. The query is
 * the optimisation; the label check is the promise.
 */
function buildQuery(scopeMode: string, windowDays: number): string {
  const window = `newer_than:${windowDays}d`;
  if (scopeMode === SCOPE_INBOX) return `in:inbox ${window}`;
  return `${window} -in:sent -in:drafts -in:chats -in:spam -in:trash`;
}

/** Gmail's own labels for mail that is not a customer writing in: junk, deleted
 *  mail, the owner's unsent drafts (Gmail mints a NEW message id on every draft
 *  save, so one long email being composed becomes several "customer" rows), the
 *  business's own Chat history, and our own outbound. Refused by label, whatever
 *  the query did or did not parse. */
const NOT_CUSTOMER_MAIL: Record<string, string> = {
  SPAM: "Gmail has it in Spam, which the sync never reads",
  TRASH: "Gmail has it in Trash, which the sync never reads",
  DRAFT: "it is an unsent draft in this mailbox, not a message from a customer",
  CHAT: "it is a Google Chat message, not an email",
  SENT: "it was sent from this mailbox rather than received",
};

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

/**
 * Everything a run did, and everything it decided not to do.
 *
 * "No new mail" and "the connection is dead" both used to return 0, so a revoked
 * Google token looked exactly like a quiet inbox: the cron logged HTTP 200
 * forever and nobody learned email had stopped arriving. Worse, "0 imported" was
 * ALSO what a perfectly healthy mailbox returns once its mail is already in the
 * Inbox, because the dedupe `continue` was counted in nothing at all.
 *
 * The three numbers that make a run legible are therefore `listed` (what Gmail
 * matched), `alreadyHad` (what we had seen before) and `imported` (what is new).
 * A run with listed=14, alreadyHad=14, imported=0 is working. A run with
 * listed=0 is not finding the mail, and `query` says what it asked for.
 */
type SyncResult = {
  imported: number;
  replied: number;
  skipped: number;
  failed: number;
  /** Message ids Gmail returned for `query`, before deduplication. */
  listed: number;
  /** Already in this org's Inbox from an earlier run. */
  alreadyHad: number;
  /** Ingested, but filed out of the Inbox in Gmail — so never auto-answered. */
  filedAway: number;
  /** Matched by the query but deliberately not brought into the Inbox at all —
   *  junk, drafts, chats, and machine mail the business had already filed away.
   *  Not a failure and not "left for a person": nobody is waiting on it. */
  ignored: number;
  /** The mailbox the run read, from google_connections. */
  mailbox: string;
  /** The exact Gmail search that was run. */
  query: string;
  /** Why messages were not auto-answered, tallied. Ingestion is unaffected. */
  reasons: Record<string, number>;
  /**
   * THE RUN DIED. Everything after this point was not attempted, and the console
   * paints the business red. Reserved for exactly that.
   */
  error?: string;
  /** Google's own words, when there are any — a bare "gmail api 403" covers a
   *  missing scope, a disabled API and an admin policy block. */
  errorDetail?: string;
  /**
   * ONE MESSAGE HICCUPPED. The run carried on and the rest of the mail came in.
   *
   * This used to be written into `error`, which made a routine race — the owner
   * deleting a message in Gmail between our list call and our fetch of it — mark
   * an otherwise perfect sync as FAILED: a red "the last check of your mailbox
   * failed" panel in the Inbox queue, a red chip on the Google card, and the
   * whole gmail-sync worker reported as unhealthy platform-wide. "The run died"
   * and "one message would not come back" are different facts and they now have
   * different fields.
   */
  warning?: string;
};

const emptyResult = (): SyncResult => ({
  imported: 0, replied: 0, skipped: 0, failed: 0,
  listed: 0, alreadyHad: 0, filedAway: 0, ignored: 0,
  mailbox: "", query: "", reasons: {},
});

/** Tally a not-answered reason, bounded so one org's error text cannot grow the
 *  stored jsonb without limit. */
function noteReason(out: SyncResult, why: string) {
  const key = String(why ?? "").slice(0, 160) || "unknown";
  if (out.reasons[key] === undefined && Object.keys(out.reasons).length >= 24) {
    out.reasons["…other"] = (out.reasons["…other"] ?? 0) + 1;
    return;
  }
  out.reasons[key] = (out.reasons[key] ?? 0) + 1;
}

/**
 * File the run against the business.
 *
 * Until now nothing recorded, per organisation, that a sync had run — not what
 * it queried, not what came back, not why it wrote nothing. cron_heartbeats
 * records one row for the WORKER, platform-wide, readable only by Phoxta staff,
 * so a business owner had no way to see whether their own mailbox was checked.
 *
 * Best-effort on purpose: 0117 may not be applied yet, and a bookkeeping failure
 * must never cost the mail.
 */
async function recordRun(admin: SupabaseClient, orgId: string, trigger: "cron" | "manual", r: SyncResult): Promise<void> {
  try {
    const { error } = await admin.rpc("app_email_sync_record", {
      p_org: orgId,
      p_trigger: trigger,
      p_ok: !r.error,
      p_mailbox: r.mailbox,
      p_query: r.query,
      p_listed: r.listed,
      p_imported: r.imported,
      p_replied: r.replied,
      p_skipped: r.skipped,
      p_failed: r.failed,
      p_already: r.alreadyHad,
      p_error: r.error ? (r.errorDetail ? `${r.error} — ${r.errorDetail}` : r.error) : "",
      // `warning` rides in the detail rather than in `error`, so a run that
      // stumbled over one message is still recorded as OK. See SyncResult.
      p_detail: { reasons: r.reasons, filed_away: r.filedAway, ignored: r.ignored, warning: r.warning ?? "" },
    });
    if (error) console.warn("[phoxta] gmail-sync could not record the run (apply migration 0117):", error.message);
  } catch (e) {
    console.warn("[phoxta] gmail-sync could not record the run:", String((e as Error)?.message || e));
  }
}

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
  const out = emptyResult();

  // The connection is read FIRST, before the token, so a run that fails on the
  // token still records WHICH mailbox it was trying to read and WHAT it would
  // have asked for. A failed run with no context is the thing this whole change
  // exists to stop producing.
  const conn = await getConnection(admin, orgId);
  out.mailbox = conn?.email ?? "";
  const scopeMode = scopeOf(conn);
  const windowDays = windowDaysOf(conn);
  out.query = buildQuery(scopeMode, windowDays);

  const access = await getAccessTokenDetailed(admin, orgId);
  const token = access.token;
  if (!token) {
    // Four distinct states used to collapse into one message. They have four
    // different fixes, so they get four different sentences — and the sentence
    // reaches the owner's console, not only the function log.
    out.error = access.detail;
    return out;
  }
  const gf = (p: string) => fetch(`${API}${p}`, { headers: { Authorization: `Bearer ${token}` } });

  // Paged, and bounded twice over. Gmail returns newest first, so without a
  // pageToken a busier mailbox than one page silently lost everything past the
  // first page for good. MAX_PAGES is the second bound: a page can come back
  // with no `messages` array and a live nextPageToken, in which case `ids` never
  // grows and `ids.length < ceiling` can never become false.
  const ids: string[] = [];
  let pageToken = "";
  let pages = 0;
  const ceiling = maxMessages();
  while (ids.length < ceiling && pages < MAX_PAGES) {
    pages++;
    const q = `/messages?maxResults=${PAGE_SIZE}&q=${encodeURIComponent(out.query)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
    const r = await gf(q);
    if (!r.ok) {
      out.error = `Gmail refused the request (HTTP ${r.status}).`;
      out.errorDetail = await gmailErrorText(r);
      if (r.status === 401) out.error = "Google rejected the connection (401) — reconnect Google in Settings → Google Workspace.";
      if (r.status === 403) out.error = "Google refused access to this mailbox (403) — the Gmail permission may have been withdrawn, or a Workspace admin policy is blocking it. Reconnect Google in Settings → Google Workspace.";
      return out;
    }
    const page = (await r.json()) as Json;
    for (const m of (page.messages ?? []) as Json[]) {
      if (ids.length < ceiling) ids.push(String(m.id));
    }
    pageToken = String(page.nextPageToken ?? "");
    if (!pageToken) break;
  }
  out.listed = ids.length;
  // A run that matched nothing is a RESULT, not an absence. It is recorded with
  // its query, so "the mailbox is quiet" and "the sync is looking in the wrong
  // place" stop being the same output.
  if (ids.length === 0) return out;

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

  // --- Which of these have we already got? ONE query, not sixty. ---
  //
  // This was a `maybeSingle()` per message: on a mailbox at the ceiling that is
  // sixty round trips before a single message is fetched, inside a cron request
  // budgeted at a hundred seconds for four workers — and the widened scope makes
  // the ceiling far easier to reach. One `in` read answers all of them.
  //
  // Org-scoped and ROLE-AGNOSTIC on purpose: the agent's own sent reply is
  // recorded with the Gmail id of the message it sent, so if that reply ever
  // lands back in this inbox (a group alias, a self-addressed list) this same
  // check refuses to re-ingest it as a new customer message. Duplicate rows for
  // one id — the state migration 0114 tolerates when its unique index could not
  // be built — simply appear twice in the result and still mean "already seen".
  //
  // An ERROR here abandons the tick rather than ingesting. With a reply hanging
  // off the insert, "I could not tell whether we have this" has to mean "we
  // have it": guessing the other way sends the customer the same answer again
  // every five minutes.
  const { data: known, error: knownErr } = await admin
    .from("conversation_messages")
    .select("provider_sid")
    .eq("organization_id", orgId)
    .in("provider_sid", ids);
  if (knownErr) {
    out.error = "The Inbox could not be checked for messages already imported, so nothing was brought in this time.";
    out.errorDetail = knownErr.message;
    return out;
  }
  const seen = new Set(((known ?? []) as Json[]).map((r) => String(r.provider_sid)));

  // And the ones we looked at and deliberately did not import. They write no
  // conversation_messages row by design, so without this they are invisible to
  // the dedupe above and get downloaded in full on every tick for as long as
  // they sit inside the window — sixty a run on a mailbox that archives its
  // marketing. A missing table (0117 not applied) is not an error here: the
  // sync is correct either way, it just does the work again.
  const { data: ignored } = await admin
    .from("gmail_ignored_messages")
    .select("provider_sid")
    .eq("organization_id", orgId)
    .in("provider_sid", ids);
  for (const r of ((ignored ?? []) as Json[])) seen.add(String(r.provider_sid));

  /** Remember that we passed on this one, so the next tick need not re-fetch it. */
  const rememberIgnored = async (id: string, reason: string) => {
    try {
      await admin.from("gmail_ignored_messages")
        .upsert({ organization_id: orgId, provider_sid: id, reason: reason.slice(0, 300) },
                { onConflict: "organization_id,provider_sid" });
    } catch { /* the sync is still correct; it will simply look again next time */ }
  };

  for (const id of ids) {
    // Counted, at last. This `continue` was silent — not even counted as skipped
    // — which is why a healthy mailbox whose mail was already imported reported
    // "Synced 0 new message(s)" and read as a failure.
    if (seen.has(id)) { out.alreadyHad++; continue; }

    const mr = await gf(`/messages/${id}?format=full`);
    if (!mr.ok) {
      const why = await gmailErrorText(mr);
      // 401/403 is the CONNECTION dying under us, not one message misbehaving:
      // every remaining fetch in this run will fail the same way, so the run
      // stops and says so rather than burning fifty-nine more round trips.
      if (mr.status === 401 || mr.status === 403) {
        out.failed++;
        out.error = mr.status === 401
          ? "Google rejected the connection part-way through reading the mailbox (401) — reconnect Google in Settings → Google Workspace."
          : "Google refused access to this mailbox part-way through reading it (403) — the Gmail permission may have been withdrawn, or a Workspace admin policy is blocking it. Reconnect Google in Settings → Google Workspace.";
        out.errorDetail = why;
        return out;
      }
      // Anything else is a hiccup on ONE message — most often the owner deleting
      // it in Gmail between our list call and our fetch. The other messages are
      // still imported and the run is still a success; see SyncResult.warning.
      out.failed++;
      out.warning = `Gmail would not return one of the messages (HTTP ${mr.status})${why ? `: ${why}` : ""}. The rest of the mail came in normally.`;
      noteReason(out, `Gmail would not return the message (HTTP ${mr.status})`);
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
    // Junk, deleted mail, drafts, Chat and our own outbound, refused BY LABEL.
    // The query excludes all five in both scopes; this is the guarantee rather
    // than the expectation, because Gmail silently treats an operator it does
    // not recognise as free text. Widening what the sync reads must never be
    // able to put any of these in front of a customer-facing Inbox.
    const notCustomer = labelIds.map((l) => NOT_CUSTOMER_MAIL[l]).find(Boolean);
    if (notCustomer) {
      out.ignored++;
      noteReason(out, notCustomer);
      await rememberIgnored(id, notCustomer);
      continue;
    }
    /**
     * Still in the Inbox in Gmail. False means a person (or their filter) has
     * already filed this message away — it is worth showing, never worth
     * answering on their behalf.
     *
     * Requires the label OUTRIGHT. This used to read `labelIds.length === 0 ||
     * labelIds.includes("INBOX")`, and under the old `in:inbox` query the label
     * was guaranteed, so the empty-array fallback was inert. Under the widened
     * scope it was an escape hatch in the exact shape of the mail the widening
     * surfaces: a Gmail filter set to "Skip the Inbox" and "Mark as read" with
     * no label leaves a message whose labelIds is empty, which would have read
     * as "in the Inbox" and let the agent answer mail a person had already
     * filed. Absent labels now mean not-in-inbox, which is the truth and is also
     * the restrictive direction every other gate here is chosen in.
     */
    const inInbox = labelIds.includes("INBOX");
    const gmailThreadId = String(md.threadId ?? "");
    const messageId = String(h["message-id"] ?? "");
    const references = String(h["references"] ?? "");
    const internalDate = Number(md.internalDate ?? 0);

    // Decided BEFORE anything is written, so the reason is stored with the
    // message and the question "why did the agent ignore this one?" has an
    // answer on the row.
    //
    // `retryable` is what agent-catchup reads to decide what still deserves an
    // answer later, and it is set PER REASON. It used to be false for every
    // classifier hit, so a heuristic — a shared-mailbox local part, an
    // out-of-office-shaped subject — buried a real customer permanently. Only a
    // definitive signal (RFC 3834, List-*, a bounce, our own address) settles it.
    // A business's OWN Google group is deliberately NOT one of those signals —
    // see the List-* block in _shared/autoReply.ts.
    const verdict = automatedMailReason({
      headers: h,
      labelIds,
      mimeType: md.payload?.mimeType,
      subject,
      fromEmail,
      selfAddresses: ctx.self,
    });

    // THE WIDENING MUST NOT FILL THE QUEUE WITH ROBOTS.
    //
    // Reading all mail rather than only the Inbox means every archived
    // newsletter, receipt and vendor notification in the window is now matched.
    // Each one used to open a conversations row and a contacts row, so the queue
    // a human works and the contact list the agent reasons over filled with mail
    // no customer sent — sixty a tick on a busy first run.
    //
    // The rule is narrow on purpose: it takes both halves. DEFINITIVELY machine
    // mail (RFC 3834, a bounce, a genuine mailing list) AND already filed out of
    // the Inbox by the business. Mail still sitting in the Inbox is ingested
    // exactly as before, so nothing the old inbox-only scope would have shown is
    // hidden; and mail relayed by the business's own Google group is never
    // definitive, so a customer writing to hello@ is never caught by this.
    if (verdict?.definitive && !inInbox) {
      out.ignored++;
      out.filedAway++;
      const why = `${verdict.reason} — and it was already filed out of the inbox, so it was not added to the Inbox`;
      noteReason(out, why);
      await rememberIgnored(id, why);
      continue;
    }

    const convId = await resolveConversation(admin, orgId, fromEmail, customerName, subject);
    if (!convId) { out.failed++; noteReason(out, "a conversation could not be opened for the sender"); continue; }

    /**
     * Mail pulled out of HISTORY rather than mail that just arrived.
     *
     * Filed away in Gmail, or older than the window an automatic reply may
     * cover, or carrying no arrival time at all — three states that all mean
     * "the agent was never going to answer this". Stamped so the org-wide hourly
     * throttle can leave it out of its count (see INGEST_BACKFILL in
     * _shared/autoReply.ts): that throttle governs auto-reply on EVERY channel,
     * so a first tick importing sixty archived messages would otherwise silence
     * web chat, SMS and WhatsApp for the next hour.
     */
    const historical = !inInbox || !internalDate || Date.now() - internalDate > replyMaxAgeMs();

    // The threading keys were fetched and thrown away on every sync until now,
    // so nothing — not a retry, not the console, not a human — could compose a
    // threaded reply to a message already in the Inbox. They are stored per
    // MESSAGE rather than per conversation because one email conversation here
    // can span several distinct Gmail threads (it is keyed on the sender).
    const meta: Json = {
      subject,
      source: "gmail-sync",
      ...(html ? { html } : {}),
      ...(historical ? { ingest: INGEST_BACKFILL } : {}),
      gmail_thread_id: gmailThreadId,
      message_id: messageId,
      references,
      to: String(h["to"] ?? ""),
      internal_date: internalDate,
      labels: labelIds,
    };

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
      else if (!inInbox) {
        // THE LINE BETWEEN INGESTING AND ANSWERING.
        //
        // The sync's scope was widened past `in:inbox` so that mail a Gmail
        // filter archived or sent straight to a label — the ordinary fate of
        // mail to a role address like hello@ — stops being invisible. That mail
        // belongs in the console. It does not belong to the agent: it is out of
        // the Inbox because a person, or a rule that person wrote, put it there,
        // and answering it would be the agent talking over somebody who had
        // already dealt with it.
        //
        // Settled forever (retryable false), because nothing about a filed
        // message will make it un-filed. agent-catchup drops it from its
        // candidate set rather than reconsidering it on every tick.
        skip = "it had already been filed out of the inbox in Gmail, so someone had dealt with it";
        retryable = false;
        out.filedAway++;
      } else if (!internalDate) {
        // NO ARRIVAL TIME, NO AUTOMATIC ANSWER.
        //
        // Both gates below were written as `internalDate && …`, so a message
        // Gmail returned without one skipped the watermark AND the age limit and
        // became answerable with no constraint at all. That exposure used to be
        // the two-day read window; it is now seven by default and up to thirty.
        // A missing arrival time is treated as "too old", which is the same
        // direction every other unknown here is resolved in. Settled, because it
        // will not grow one on a later tick — the message is still in the Inbox
        // for a person, with this reason beside it.
        skip = "Gmail did not say when it arrived, so it is here for a person rather than answered automatically";
        retryable = false;
      } else if (ctx.watermark && internalDate < ctx.watermark) {
        // Retryable on purpose: the watermark is a setting an owner can move
        // back deliberately to let the agent answer older mail, and agent-catchup
        // re-reads it, so burning the row here would make that impossible.
        skip = "it arrived before automatic replies were switched on for this mailbox";
      } else if (Date.now() - internalDate > replyMaxAgeMs()) {
        // The second half of "ingest more without answering more". The read
        // window widened; this did not. See replyMaxAgeMs.
        skip = "it is older than the window for an automatic reply, so it is here for a person to answer";
      } else if (out.replied >= replyCap) {
        skip = "this sync had already sent its maximum replies — the catch-up worker answers it on the next tick";
      }
    }

    // html goes in meta so the console renders the real message; body stays the
    // readable text that previews, search and the agent work from.
    //
    // The insert is also the LOCK, and that is what makes the one-query dedupe
    // above safe. A concurrent run — the cron and a manual sync at the same
    // moment — can write this message between our read and this insert; 0114's
    // unique index on (organization_id, provider_sid) then rejects it, we do not
    // reply, and the other run's copy is the one the Inbox shows. Nothing is
    // answered off a failed insert, ever.
    const { data: row, error: insErr } = await admin.from("conversation_messages").insert({
      organization_id: orgId, conversation_id: convId, role: "customer", channel_type: "email",
      body: text, provider_sid: id,
      meta: skip ? { ...meta, auto_reply: { answered: false, reason: skip, retryable, at: new Date().toISOString() } } : meta,
    }).select("id").single();
    if (insErr || !row) {
      console.error("[phoxta] gmail-sync message insert failed:", insErr?.message);
      out.failed++;
      noteReason(out, "the message could not be written to the Inbox");
      continue;
    }
    await admin.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", convId);
    out.imported++;
    const rowId = String((row as Json).id);

    if (skip) {
      out.skipped++;
      noteReason(out, skip);
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
      noteReason(out, pre.reason);
      continue;
    }
    // Somebody may have answered from Gmail itself in the minutes since the mail
    // arrived — that reply never reaches our database, because only INBOX is
    // ingested. Without this the agent writes on top of a human.
    if (gmailThreadId && await gmailThreadHasNewerSent(token, gmailThreadId, internalDate)) {
      await markNotAnswered(admin, orgId, rowId, meta, "someone had already replied from the mailbox", false);
      out.skipped++;
      noteReason(out, "someone had already replied from the mailbox");
      continue;
    }

    // --- Claim it. Ingest and reply are not one step: the agent row only exists
    //     once the model returns, so for the whole of that window agent-catchup
    //     sees this message as unanswered and would compose a second reply to
    //     the same email. Whoever wins the claim owns the answer. ---
    if (!(await claimForReply(admin, orgId, rowId, meta))) {
      out.skipped++;
      noteReason(out, "another worker was already answering it");
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
      noteReason(out, "the agent could not compose a reply");
      continue;
    }
    if (result.paused) {
      await markNotAnswered(admin, orgId, rowId, meta, "a human has taken over this thread", false);
      out.skipped++;
      noteReason(out, "a human has taken over this thread");
      continue;
    }
    if (result.capped) {
      await markNotAnswered(admin, orgId, rowId, meta, "the monthly usage allowance for this plan is spent");
      out.skipped++;
      noteReason(out, "the monthly usage allowance for this plan is spent");
      continue;
    }
    const reply = result.reply.trim();
    if (!reply) {
      await markNotAnswered(admin, orgId, rowId, meta, "the agent composed no reply");
      out.skipped++;
      noteReason(out, "the agent composed no reply");
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
      // A picture the agent chose. Mail carries no attachment from the agent, so
      // the funnel puts a link to it in the body rather than dropping it.
      media: result.media ?? [],
      mode: ctx.mode,
      thread: { threadId: gmailThreadId, messageId, references, subject, fromMailbox: true },
      stampExtra: { source: "gmail-sync", in_reply_to: messageId, gmail_thread_id: gmailThreadId },
    });
    if (delivered.sent) out.replied++;
    else if (delivered.outcome) { out.failed++; noteReason(out, `the reply could not be delivered (${delivered.outcome})`); }
    else { out.skipped++; noteReason(out, "a gate refused the send at the last moment"); }
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

  const access = await getAccessTokenDetailed(admin, orgId);
  const token = access.token;
  if (!token) {
    out.error = access.detail;
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

// ---------------------------------------------------------------------------
// The diagnostic. Reads Gmail, writes nothing, sends nothing.
// ---------------------------------------------------------------------------

/** How far back the "where is my mail?" probe looks. Independent of the sync
 *  window on purpose: the owner is asking about history, and the answer "none in
 *  the last two days" is not an answer. */
const PROBE_DAYS = 30;
const PROBE_MAX = 50;

/** Reject anything that is not plainly an address before it goes into a Gmail
 *  query. Spaces, quotes, braces and parentheses are all query syntax. */
const SAFE_ADDRESS = /^[^\s<>(){}"',\\]+@[^\s<>(){}"',\\]+\.[^\s<>(){}"',\\]+$/;

/** Every field a message could have been addressed through. `deliveredto:` is
 *  the one that matters for a role address: a Google Group or an alias puts the
 *  member's own address in To on some paths, and only Delivered-To reliably
 *  carries the address the customer actually wrote to. */
const addressClause = (a: string) => `(to:${a} OR cc:${a} OR bcc:${a} OR deliveredto:${a})`;

type ProbeReport = {
  address: string;
  /** The address is a send-as alias of the connected mailbox — so mail to it
   *  arrives in this mailbox's own INBOX and the sync can see it. */
  isAlias: boolean;
  /** False when Gmail would not list this mailbox's addresses, in which case
   *  `isAlias:false` means "we could not tell" and must not be reported as
   *  "it is not an alias". */
  aliasesKnown: boolean;
  total: number;
  totalCapped: boolean;
  inInbox: number;
  inSpam: number;
  inTrash: number;
  /** Matched by the query this business's sync actually runs. */
  wouldSync: number;
  latest: GmailMessagePeek | null;
  /** Plain sentences, in the order they should be read. */
  findings: string[];
  error: string;
};

type CheckReport = {
  ok: boolean;
  connected: boolean;
  /**
   * The caller's role on this business, and whether it may run the admin-only
   * legs (Sync now, Save).
   *
   * Stated OUTRIGHT rather than inferred. The console used to read admin-ness
   * from whether the webhook credentials came back — which meant a check that
   * failed at transport, or simply had not returned yet, read as "you are an
   * admin", so a plain member was shown buttons that then rejected them; and a
   * genuine admin with no Google connection was told "only an owner or admin can
   * see this", because no check had run at all.
   */
  role: string;
  canManage: boolean;
  /** The account recorded in google_connections. */
  mailbox: string;
  /** The account Gmail says `users/me` is. A mismatch means the row is stale. */
  liveMailbox: string;
  scope: string;
  canSend: boolean;
  hasRefreshToken: boolean;
  tokenState: string;
  tokenDetail: string;
  watermarkInstalled: boolean;
  windowDays: number;
  scopeMode: string;
  query: string;
  /** How many messages that query matches in the mailbox right now. */
  matched: number;
  matchedCapped: boolean;
  messagesTotal: number;
  aliases: GmailSendAs[];
  aliasError: string;
  probe: ProbeReport | null;
  webhook: { url: string; publicKey: string; token: string; configured: boolean } | null;
  error: string | null;
};

async function probeAddress(
  token: string,
  raw: string,
  aliases: GmailSendAs[],
  aliasesKnown: boolean,
  mailbox: string,
  syncQuery: string,
): Promise<ProbeReport> {
  const address = String(raw ?? "").trim().toLowerCase();
  const out: ProbeReport = {
    address, isAlias: false, aliasesKnown, total: 0, totalCapped: false, inInbox: 0, inSpam: 0, inTrash: 0,
    wouldSync: 0, latest: null, findings: [], error: "",
  };
  if (!SAFE_ADDRESS.test(address)) {
    out.error = "That does not look like an email address.";
    return out;
  }
  out.isAlias = aliasesKnown && aliases.some((a) => a.address === address);

  const clause = addressClause(address);
  const [all, inbox, spam, trash, wouldSync] = await Promise.all([
    gmailSearch(token, `${clause} newer_than:${PROBE_DAYS}d`, PROBE_MAX),
    gmailSearch(token, `in:inbox ${clause} newer_than:${PROBE_DAYS}d`, PROBE_MAX),
    gmailSearch(token, `in:spam ${clause} newer_than:${PROBE_DAYS}d`, PROBE_MAX),
    gmailSearch(token, `in:trash ${clause} newer_than:${PROBE_DAYS}d`, PROBE_MAX),
    gmailSearch(token, `${syncQuery} ${clause}`, PROBE_MAX),
  ]);
  if (!all.ok) {
    out.error = all.error || `Gmail refused the search (HTTP ${all.status}).`;
    return out;
  }
  out.total = all.ids.length;
  out.totalCapped = all.capped;
  out.inInbox = inbox.ids.length;
  out.inSpam = spam.ids.length;
  out.inTrash = trash.ids.length;
  out.wouldSync = wouldSync.ids.length;
  // Gmail lists newest first, so the head of the unfiltered search is the most
  // recent thing that reached this mailbox for that address.
  if (all.ids[0]) out.latest = await gmailMessagePeek(token, all.ids[0]);

  const at = out.total >= PROBE_MAX ? `at least ${PROBE_MAX}` : String(out.total);
  const box = mailbox || "the connected mailbox";

  if (out.total === 0 && out.inSpam === 0 && out.inTrash === 0) {
    if (out.isAlias) {
      out.findings.push(
        `Nothing has arrived for ${address} in the last ${PROBE_DAYS} days. The address IS an alias of ${box}, so mail sent to it does land in this mailbox — there simply has not been any.`,
      );
    } else {
      out.findings.push(
        aliasesKnown
          ? `No mail addressed to ${address} has reached ${box} in the last ${PROBE_DAYS} days, and ${address} is not an alias of this mailbox.`
          : `No mail addressed to ${address} has reached ${box} in the last ${PROBE_DAYS} days.`,
      );
      out.findings.push(
        `If ${address} is a Google Group, Phoxta cannot read a group's archive — only a copy delivered into a member's mailbox. Add ${box} to the group as a member with mail delivery switched on, or make ${address} an alias of ${box} instead.`,
      );
      out.findings.push(
        `If the address is hosted somewhere other than this Google account, use the inbound webhook below instead — that route does not go through Gmail at all.`,
      );
    }
  } else {
    out.findings.push(`${at} message(s) addressed to ${address} reached ${box} in the last ${PROBE_DAYS} days.`);
    if (out.inInbox === 0) {
      out.findings.push(
        `None of them are in the Inbox — a Gmail filter is archiving them or sending them straight to a label. Set "What each sync reads" to all mail (below) and they will be picked up from now on.`,
      );
    } else {
      out.findings.push(`${out.inInbox} of them ${out.inInbox === 1 ? "is" : "are"} in the Inbox.`);
    }
    out.findings.push(
      out.wouldSync > 0
        ? `${out.wouldSync} match what this business's sync currently asks Gmail for.`
        : `None of them match what this business's sync currently asks Gmail for — that is why they are not in the Inbox screen.`,
    );
  }
  if (out.inSpam > 0) {
    out.findings.push(`${out.inSpam} ${out.inSpam === 1 ? "is" : "are"} in Spam. The sync never reads Spam — mark them "Not spam" in Gmail and they will come through.`);
  }
  if (out.inTrash > 0) {
    out.findings.push(`${out.inTrash} ${out.inTrash === 1 ? "is" : "are"} in Trash, which the sync never reads.`);
  }
  if (out.latest?.listId) {
    out.findings.push(
      `The most recent one was delivered by a Google Group (List-Id: ${out.latest.listId.replace(/[<>]/g, "")}). Group mail carries mailing-list headers, and the agent never auto-answers list mail — these will always need a person, even once they are visible.`,
    );
  } else if (out.latest && !out.isAlias && out.latest.deliveredTo && out.latest.deliveredTo.toLowerCase().includes(box)) {
    out.findings.push(`The most recent one was delivered straight to ${box}, so forwarding to this mailbox is working.`);
  }
  return out;
}

/**
 * Everything the console needs to explain the state of a business's email, in
 * one call. Read-only: no message is written, no reply is composed, nothing is
 * sent. It is safe to run on page load and safe to press repeatedly.
 */
async function checkOrg(
  admin: SupabaseClient,
  orgId: string,
  opts: { address?: string; role: string },
): Promise<CheckReport> {
  const conn = await getConnection(admin, orgId);
  const scopeMode = scopeOf(conn);
  const windowDays = windowDaysOf(conn);
  const canManage = isAdminRole(opts.role);
  const out: CheckReport = {
    ok: false,
    connected: Boolean(conn),
    role: opts.role,
    canManage,
    mailbox: conn?.email ?? "",
    liveMailbox: "",
    scope: conn?.scope ?? "",
    canSend: canSendMail(conn),
    hasRefreshToken: Boolean(conn?.hasRefreshToken),
    tokenState: conn ? "unknown" : "not_connected",
    tokenDetail: "",
    watermarkInstalled: conn ? conn.autoReplyFrom !== null : false,
    windowDays,
    scopeMode,
    query: buildQuery(scopeMode, windowDays),
    matched: 0,
    matchedCapped: false,
    messagesTotal: 0,
    aliases: [],
    aliasError: "",
    probe: null,
    webhook: null,
    error: null,
  };

  // The other route is described whether or not Google works — for a business
  // whose mail is not in Gmail at all, it is the ONLY route, and until now no
  // owner could discover it existed. Built BEFORE the `if (!conn)` return below
  // for exactly that reason: a business with no Google connection is the one
  // that needs this address most.
  if (canManage) {
    const { data: cfg } = await admin.from("agent_config").select("public_key").eq("organization_id", orgId).maybeSingle();
    const publicKey = String((cfg as { public_key?: string } | null)?.public_key ?? "");
    const token = await orgInboundToken(orgId);
    const base = `${Deno.env.get("SUPABASE_URL") ?? ""}/functions/v1/email-inbound`;
    out.webhook = {
      url: publicKey && token ? `${base}?key=${encodeURIComponent(publicKey)}&token=${encodeURIComponent(token)}` : "",
      publicKey,
      token: token ?? "",
      configured: Boolean(publicKey && token),
    };
  }

  if (!conn) {
    out.tokenDetail = "No Google account is connected to this business, so no mail can be read from Gmail.";
    return out;
  }

  const access = await getAccessTokenDetailed(admin, orgId);
  out.tokenState = access.state;
  out.tokenDetail = access.detail;
  if (!access.token) {
    out.error = access.detail;
    return out;
  }

  // Does the token actually work, and against WHICH mailbox? A green chip based
  // on a row existing has been the console's entire answer to that question.
  const prof = await gmailProfile(access.token);
  if (!prof.ok) {
    out.tokenState = prof.status === 401 ? "refresh_denied" : "refused";
    out.error =
      prof.status === 401
        ? "Google rejected the connection — reconnect Google in Settings → Google Workspace."
        : prof.status === 403
          ? `Google refused access to this mailbox${prof.error ? `: ${prof.error}` : ""}. The Gmail permission may have been withdrawn, or a Workspace admin policy is blocking it — reconnect Google to grant it again.`
          : `Gmail could not be reached (HTTP ${prof.status})${prof.error ? `: ${prof.error}` : ""}.`;
    return out;
  }
  out.ok = true;
  out.tokenState = "ok";
  out.tokenDetail = "";
  out.liveMailbox = prof.profile?.emailAddress ?? "";
  out.messagesTotal = prof.profile?.messagesTotal ?? 0;

  const [aliases, matched] = await Promise.all([
    gmailSendAsList(access.token),
    gmailSearch(access.token, out.query, PROBE_MAX),
  ]);
  out.aliases = aliases.addresses;
  out.aliasError = aliases.ok ? "" : aliases.error || `Gmail would not list this mailbox's addresses (HTTP ${aliases.status}).`;
  out.matched = matched.ids.length;
  out.matchedCapped = matched.capped;

  if (opts.address) {
    out.probe = await probeAddress(
      access.token,
      opts.address,
      out.aliases,
      aliases.ok,
      out.liveMailbox || out.mailbox,
      out.query,
    );
  }
  return out;
}

/** The window and the scope, saved by an owner. Bounded here as well as by the
 *  0117 check constraint, so a bad value is a friendly refusal rather than a
 *  Postgres error string. */
async function saveSettings(
  admin: SupabaseClient,
  orgId: string,
  body: { windowDays?: number; scopeMode?: string },
): Promise<{ ok: boolean; windowDays: number; scopeMode: string; error: string | null }> {
  const days = Math.max(1, Math.min(30, Math.trunc(Number(body.windowDays))));
  const scope = body.scopeMode === SCOPE_INBOX ? SCOPE_INBOX : SCOPE_ALL;
  if (!Number.isFinite(days)) {
    return { ok: false, windowDays: defaultWindowDays(), scopeMode: defaultScope(), error: "Choose how many days of mail each sync should look at (1 to 30)." };
  }
  const { error } = await admin
    .from("google_connections")
    .update({ sync_window_days: days, sync_scope: scope })
    .eq("organization_id", orgId);
  if (error) {
    // The commonest cause by far, and it names the fix rather than the symptom.
    //
    // Matched on PostgREST's code first. The message test used to require the
    // word "column" BEFORE the column name — and PostgREST writes it after
    // ("Could not find the 'sync_scope' column of 'google_connections' in the
    // schema cache") — so the friendly sentence never once fired and the owner
    // was shown the raw PostgREST string instead.
    const msg = String(error.message ?? "");
    const missing =
      (error as { code?: string }).code === "PGRST204" ||
      (/(sync_window_days|sync_scope)/i.test(msg) && /column|schema cache|does not exist/i.test(msg));
    return {
      ok: false,
      windowDays: days,
      scopeMode: scope,
      error: missing
        ? "Phoxta is still finishing the setup for these settings on this project, so they cannot be saved yet. Everything else on this screen keeps working, and the sync uses its standard window in the meantime."
        : msg,
    };
  }
  return { ok: true, windowDays: days, scopeMode: scope, error: null };
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const admin = adminClient();
    // Parsed up front so the cron path can ask for a backfill too — it is the
    // only caller that can reach every org in one pass.
    const body = (await req.json().catch(() => ({}))) as {
      organizationId?: string;
      mode?: string;
      limit?: number;
      address?: string;
      windowDays?: number;
      scopeMode?: string;
    };
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
            // Recorded against the BUSINESS, not only in a platform-wide log the
            // owner cannot read. This row is what the console's "Email delivery"
            // screen renders, and it is written on every outcome — including the
            // ones that used to return silently.
            await recordRun(admin, c.organization_id, "cron", s);
            // The function logs were completely silent about this worker, so a
            // mailbox that stopped importing looked identical to a quiet one.
            console.log(`[phoxta] gmail-sync ${c.organization_id}: listed=${s.listed} imported=${s.imported} known=${s.alreadyHad} replied=${s.replied} skipped=${s.skipped} ignored=${s.ignored} failed=${s.failed} q="${s.query}"${s.error ? ` error=${s.error}` : ""}${s.warning ? ` warning=${s.warning}` : ""}`);
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
    // Which legs need an admin, and why:
    //   sync     — SENDS. Up to GMAIL_SYNC_MAX_REPLIES_PER_RUN real customer
    //              emails per press, from the business's own mailbox.
    //   settings — changes what every future sync reads.
    //   check    — reads the mailbox and reports. Sends nothing, writes nothing,
    //              so any member may run it; the webhook credentials inside the
    //              answer are withheld from anyone below admin.
    //   backfill — re-fetches formatting for mail already in the Inbox.
    const check = body?.mode === "check";
    const settings = body?.mode === "settings";
    const needsAdmin = !backfill && !check;
    const a = await authorize(req, body?.organizationId, needsAdmin ? { requireAdmin: true } : undefined);
    if (a.error) return a.error;

    if (check) {
      const report = await checkOrg(a.ok.admin, a.ok.org.id, {
        address: String(body?.address ?? "").trim() || undefined,
        role: a.ok.role,
      });
      return json(report);
    }
    if (settings) {
      const saved = await saveSettings(a.ok.admin, a.ok.org.id, { windowDays: body?.windowDays, scopeMode: body?.scopeMode });
      return json(saved);
    }
    if (backfill) {
      const r = await backfillOrg(a.ok.admin, a.ok.org.id, limit);
      return json({ ok: !r.error, ...r, error: r.error ?? r.lastError ?? null });
    }
    const r = await syncOrg(a.ok.admin, a.ok.org.id);
    await recordRun(a.ok.admin, a.ok.org.id, "manual", r);
    // The whole result, not a bare count. "imported: 0" was the same answer for
    // a dead token, a wrong mailbox, a filtered inbox and a quiet Tuesday, and
    // the client dropped the error string on the floor besides.
    return json({
      ok: !r.error,
      mailbox: r.mailbox,
      query: r.query,
      listed: r.listed,
      imported: r.imported,
      alreadyHad: r.alreadyHad,
      replied: r.replied,
      skipped: r.skipped,
      failed: r.failed,
      filedAway: r.filedAway,
      ignored: r.ignored,
      reasons: r.reasons,
      error: r.error ?? null,
      errorDetail: r.errorDetail ?? null,
      // A run that stumbled over one message is still `ok: true` — the client
      // shows this beside the result rather than painting the business red.
      warning: r.warning ?? null,
    });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
