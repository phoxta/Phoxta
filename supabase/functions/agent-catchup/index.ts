// Phoxta — agent-catchup: answer the customer messages that were never answered.
//
// gmail-sync now wakes the agent as mail arrives, but everything that came in
// while it did not is still sitting in the Inbox unanswered — including the
// email that prompted this whole change. This worker is the repair: it finds
// inbound customer messages with no delivered reply after them and answers them
// through exactly the same funnel a live message takes.
//
// It is ALSO the retry loop for the live path, which is why it is on the cron
// (integrations/worker-cron/ping.sh) rather than waiting for a human to run it.
// gmail-sync answers at most GMAIL_SYNC_MAX_REPLIES_PER_RUN messages a tick and
// files the rest; a model error, a provider 4xx or the function's wall clock
// expiring mid-loop leaves a message filed and unanswered; and the next sync
// skips it on the provider_sid dedupe without re-reading the gates. Every one of
// those is "the AI did not pick it up" all over again, silently, so every one of
// them has to land somewhere that will try again. This is that somewhere.
//
// BOUNDED, IDEMPOTENT, SAFE TO RUN TWICE OR CONCURRENTLY, by construction:
//   • a time window (default 48h, hard maximum 14 days) measured against the
//     MAIL'S OWN DATE, not the row's insert time,
//   • the connection's auto_reply_from watermark, so "catch up on the last week"
//     cannot answer the backlog that watermark exists to protect,
//   • a per-organisation cap, a per-run inspection cap and an overall cap,
//   • the candidate query is the idempotency check — a DELIVERED agent or human
//     reply after the message removes it; a reply that FAILED to send does not,
//     because that is exactly the message nothing else will ever retry,
//   • claimForReply is taken before composing, so this worker and gmail-sync
//     cannot both answer the same email during the model call,
//   • every gate the live path uses runs here too, and the send goes through the
//     same deliverAutoReply funnel,
//   • `dryRun: true` reports what it would answer, sends nothing AND writes
//     nothing permanent — a preview that burned messages before anyone read the
//     report was worse than no preview.
//
// Modes: cron (x-cron-secret) across every organisation, or member-authed for
// one business. verify_jwt is declared false in supabase/config.toml because the
// cron leg carries no Supabase JWT; the member leg is guarded by authorize().
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import { loadConfig, respondCore, type Org } from "../_shared/agentCore.ts";
import {
  getAccessToken,
  getConnection,
  gmailHasNewerSentTo,
  gmailThreadHasNewerSent,
  mailboxReplyBlocker,
} from "../_shared/google.ts";
import {
  autoReplyAllowed,
  autoReplyMode,
  automatedMailReason,
  claimForReply,
  deliverAutoReply,
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

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
/** Channels a reply can actually be DELIVERED on from here. Web chat is left
 *  out deliberately: its only delivery leg is the widget polling, and a visitor
 *  who left hours ago will never see the answer — spending a model turn on it
 *  would be spending for nothing. */
const CHANNELS = ["email", "sms", "whatsapp"];
const WA_WINDOW_MS = 24 * 60 * 60 * 1000;
/** How many rows to look at before filtering. Bounded so one call cannot walk a
 *  large history. Raised from 400 alongside the settled-message filter below:
 *  what used to fill this budget was traffic that needed nothing. */
const SCAN_LIMIT = 1000;
/** Conversations per batched "has anyone replied?" query. This used to be ONE
 *  count query per candidate — up to 400 round trips — which is affordable for a
 *  deliberate run and not for a five-minute cron. */
const REPLY_CHUNK = 50;
/** Rows one "has anyone replied?" query may return. Hitting it means the answer
 *  may be incomplete, which is handled rather than assumed away. */
const REPLY_ROWS = 1000;
/** How many candidates one organisation is INSPECTED for in a single run, even
 *  when none of them can be answered. Without it a handful of permanently
 *  unanswerable threads at the front of the queue would be re-read every tick. */
const CONSIDER_FLOOR = 25;
/**
 * How far back the CRON leg will automatically answer a message on a channel the
 * auto_reply_from watermark does not cover — SMS, WhatsApp, and mail that came
 * through the inbound webhook rather than the connected mailbox.
 *
 * The watermark is what makes "answer the past" safe for mailbox mail: it marks
 * the moment the owner switched this on, and nothing older is ever auto-answered.
 * The other channels have no such line, so putting this worker on a five-minute
 * cron (with a 48-hour daily sweep behind it) turned "answer the past" into an
 * automatic action on them: every message the owner had already dealt with by
 * other means — phoning the customer back, replying from their own phone — and
 * every message recorded while the switch was Off became answerable the moment
 * the switch went back to Auto. That is a backlog burst on the two channels
 * where a burst is most visible.
 *
 * Six hours is the honest line. Everything this worker exists to repair — a
 * deferral, a send that failed, a model error, a tick that did not run — happens
 * within minutes, so a six-hour reach loses none of it; and a text answered more
 * than six hours late is an odd thing to receive out of the blue. It binds ONLY
 * on the cron leg: an owner pressing "catch up" over a wider window is making an
 * explicit decision, and the message is never marked, so that decision still works.
 */
const CRON_NON_MAILBOX_MAX_AGE_MS = 6 * 3600_000;

/** How long an agent row with NO delivery status is still treated as a reply in
 *  flight. Longer than autoReply.ts's ten-minute claim, so a live turn is never
 *  double-answered; short enough that a worker killed before it could stamp the
 *  row does not strand the customer permanently. See newestReplyAt. */
const UNSTAMPED_GRACE_MS = 15 * 60_000;

/**
 * A decision already recorded against this message that nothing here can change.
 *
 * Two kinds: settled forever (a bounce, a mailing list, a closed thread, "no
 * address on file"), and ALREADY ANSWERED — deliverAutoReply writes
 * {answered:true} onto the customer's row the moment a send succeeds, and that
 * was never consulted. Both used to stay candidates for as long as they were the
 * newest customer message on their conversation, and the per-org inspection
 * budget was spent on them BEFORE answerOne's own check could return: a business
 * whose mailbox had collected 25 newsletters and bounces spent all 25 slots on
 * that same, stable, always-oldest set on every tick, and the one genuine
 * enquiry queued behind them was never reached. considered=25, answered=0,
 * forever. Filtering here is what gives the budget to messages that can use it.
 */
const settledForever = (meta: Json): boolean => {
  const a = meta?.auto_reply;
  if (!a || typeof a !== "object") return false;
  if (a.answered === true) return true;
  return a.answered === false && a.retryable === false;
};

const clamp = (v: unknown, d: number, lo: number, hi: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(n, hi)) : d;
};

type Candidate = {
  messageId: string;
  orgId: string;
  conversationId: string;
  channel: string;
  body: string;
  meta: Json;
  providerSid: string;
  createdAt: string;
};

type OrgReport = {
  org: string;
  /** Candidates that cost a query, a fetch or a write to reject or answer. */
  considered: number;
  /** Candidates looked at at all, including the ones rejected for free. */
  walked?: number;
  answered: number;
  skipped: number;
  failed: number;
  details: { conversation: string; outcome: string; reason?: string }[];
};

/** When this message actually reached the business. The row's insert time is
 *  NOT that: google-gmail's import writes created_at = now() for a message that
 *  may be a year old, so a browsed-and-imported thread would fall inside a
 *  48-hour catch-up window the same hour it was imported. */
const arrivedAt = (c: Candidate): number => {
  const internal = Number(c.meta?.internal_date ?? 0);
  return Number.isFinite(internal) && internal > 0 ? internal : Date.parse(c.createdAt);
};

/** Mail that came from the business's own connected mailbox — the only kind the
 *  watermark and the mailbox send-permission apply to. */
const fromMailbox = (c: Candidate): boolean =>
  c.channel === "email" &&
  (!!String(c.meta?.gmail_thread_id ?? "") || ["gmail-sync", "gmail"].includes(String(c.meta?.source ?? "")));

/**
 * The newest unanswered customer message on each conversation.
 *
 * Only the newest matters: answering the older ones as well would send a person
 * three emails about a conversation they have moved on from.
 */
/**
 * The newest DELIVERED reply on each of these conversations, as a timestamp.
 *
 * "Delivered" excludes delivery_status 'failed': a reply that was composed and
 * then failed on the wire is exactly the message nothing else will ever retry.
 *
 * Truncation is handled rather than assumed away. The query returns at most
 * REPLY_ROWS rows for a chunk of up to REPLY_CHUNK conversations, and it used to
 * take them in NO order — so an organisation whose candidate conversations held
 * more than a thousand replies inside the window had rows dropped arbitrarily,
 * the affected conversations reappeared as candidates, and their customers got a
 * duplicate reply hours later. Newest-first ordering makes a truncated answer
 * correct for a single conversation, and splitting the chunk in half when the
 * limit is hit makes it correct for a mixed one.
 */
async function newestReplyAt(
  admin: SupabaseClient,
  orgId: string,
  conversationIds: string[],
  since: string,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const walk = async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return;
    const { data, error } = await admin
      .from("conversation_messages")
      .select("conversation_id, role, created_at, delivery_status")
      .eq("organization_id", orgId)
      .in("conversation_id", ids)
      .in("role", ["agent", "human"])
      // Every reply that could count is newer than a candidate, and every
      // candidate is inside the window — so the window bounds this scan too.
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(REPLY_ROWS);
    if (error) {
      // Fail CLOSED: not knowing whether a thread was answered must never mean
      // "answer it again".
      console.error("[phoxta] agent-catchup reply scan failed:", error.message);
      for (const id of ids) out.set(id, Number.MAX_SAFE_INTEGER);
      return;
    }
    const rows = ((data as Json[] | null) ?? []);
    if (rows.length >= REPLY_ROWS && ids.length > 1) {
      const mid = Math.ceil(ids.length / 2);
      await walk(ids.slice(0, mid));
      await walk(ids.slice(mid));
      return;
    }
    for (const r of rows) {
      const status = String(r.delivery_status ?? "");
      if (status === "failed") continue;
      // AN AGENT ROW THAT WAS NEVER STAMPED IS NOT A DELIVERED REPLY.
      //
      // respondCore writes the agent's row; deliverAutoReply stamps it a moment
      // later with what happened on the wire. A worker killed in between leaves
      // delivery_status NULL — nothing was sent and nothing was recorded — and
      // this filter only discarded 'failed', so that row counted as a delivered
      // reply and the conversation was dropped from the candidate set FOR GOOD.
      // The customer was never answered and never retried, while the Inbox showed
      // an agent bubble with no delivery tick.
      //
      // A young NULL row is a turn genuinely in flight (the claim window is ten
      // minutes) and must still count, or two workers double-answer. An old one
      // is a corpse. HUMAN rows are exempt: a reply typed in the console has no
      // delivery status by design and is a real answer at any age.
      if (!status && String(r.role) === "agent") {
        const at = Date.parse(String(r.created_at));
        if (Number.isFinite(at) && Date.now() - at > UNSTAMPED_GRACE_MS) continue;
      }
      const key = String(r.conversation_id);
      const at = Date.parse(String(r.created_at));
      if (Number.isFinite(at) && at > (out.get(key) ?? 0)) out.set(key, at);
    }
  };
  for (let i = 0; i < conversationIds.length; i += REPLY_CHUNK) {
    await walk(conversationIds.slice(i, i + REPLY_CHUNK));
  }
  return out;
}

type Scan = {
  candidates: Candidate[];
  /** Rows the scan read. At SCAN_LIMIT the window held more than one run can see. */
  scanned: number;
  truncated: boolean;
  /**
   * Did the "live rows only" server-side filter actually run?
   *
   * It is a nested PostgREST logic tree, and nobody could say whether the
   * deployed server accepts it. Correctness never depended on it — the same
   * predicate is applied in TypeScript below — but efficiency does: when it is
   * rejected the 1000-row cap is spent mostly on already-answered traffic and the
   * repair worker quietly stops repairing. The only signal used to be one
   * console.warn nobody would read, so the answer now rides in the run's response
   * AND in the cron heartbeat the console renders.
   */
  liveFilter: "applied" | "unavailable";
};

async function findCandidates(
  admin: SupabaseClient,
  since: string,
  orgId: string | null,
): Promise<Scan> {
  const base = () => {
    let q = admin
      .from("conversation_messages")
      .select("id, organization_id, conversation_id, channel_type, body, meta, provider_sid, created_at")
      .eq("role", "customer")
      .in("channel_type", CHANNELS)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(SCAN_LIMIT);
    if (orgId) q = q.eq("organization_id", orgId);
    return q;
  };

  // Ask the database not to hand back what is already settled. The scan is
  // newest-first and capped, so on a busy window the rows that fall off the end
  // are the OLDEST — the ones that have waited longest, which is the exact
  // opposite of what this worker is for. Every message that has been answered,
  // bounced or permanently ruled out and still sits at the front of its
  // conversation was consuming one of those slots.
  //
  // Expressed with values that carry no PostgREST-reserved characters (`null`,
  // `true`, `false`), and if the server rejects the filter anyway the scan falls
  // back to the plain query — the same predicate is applied in TypeScript below,
  // so correctness never depends on this working, only efficiency.
  const LIVE =
    "meta->auto_reply.is.null,and(meta->auto_reply->>answered.eq.false,meta->auto_reply->>retryable.eq.true)";
  let liveFilter: Scan["liveFilter"] = "applied";
  let { data, error } = await base().or(LIVE);
  if (error) {
    console.warn("[phoxta] agent-catchup live-only filter unavailable, scanning unfiltered:", error.message);
    liveFilter = "unavailable";
    ({ data, error } = await base());
  }
  if (error) {
    console.error("[phoxta] agent-catchup candidate scan failed:", error.message);
    return { candidates: [], scanned: 0, truncated: false, liveFilter };
  }
  const scanned = ((data as Json[] | null) ?? []).length;

  const newestPerConversation = new Map<string, Candidate>();
  for (const r of ((data as Json[] | null) ?? [])) {
    const meta = (r.meta ?? {}) as Json;
    if (settledForever(meta)) continue; // authoritative; the SQL filter is the optimisation
    const convId = String(r.conversation_id);
    if (newestPerConversation.has(convId)) continue; // rows arrive newest first
    newestPerConversation.set(convId, {
      messageId: String(r.id),
      orgId: String(r.organization_id),
      conversationId: convId,
      channel: String(r.channel_type),
      body: String(r.body ?? ""),
      meta,
      providerSid: String(r.provider_sid ?? ""),
      createdAt: String(r.created_at),
    });
  }

  // Drop anything somebody (or something) already replied to. Batched per
  // organisation: the per-candidate count query this replaces was up to 400
  // round trips a run.
  const byOrg = new Map<string, Candidate[]>();
  for (const c of newestPerConversation.values()) {
    const list = byOrg.get(c.orgId) ?? [];
    list.push(c);
    byOrg.set(c.orgId, list);
  }

  const out: Candidate[] = [];
  for (const [org, list] of byOrg) {
    const replied = await newestReplyAt(admin, org, list.map((c) => c.conversationId), since);
    for (const c of list) {
      if ((replied.get(c.conversationId) ?? 0) <= Date.parse(c.createdAt)) out.push(c);
    }
  }

  // Oldest first: the person who has been waiting longest is answered first.
  out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { candidates: out, scanned, truncated: scanned >= SCAN_LIMIT, liveFilter };
}

/** Everything about an org that the reply leg needs, resolved once. */
type OrgContext = {
  org: Org;
  mode: AutoReplyMode;
  self: string[];
  gmailToken: string | null;
  /** Why mail from the CONNECTED MAILBOX may not be answered, or null. Never
   *  applied to webhook mail, which has no mailbox behind it. */
  mailboxBlocker: string | null;
  /** Mail that reached the mailbox before this is never auto-answered. */
  watermark: number;
};

async function loadOrgContext(admin: SupabaseClient, orgId: string): Promise<OrgContext | null> {
  const { data } = await admin.from("organizations").select("id, name, vertical").eq("id", orgId).maybeSingle();
  if (!data) return null;
  const conn = await getConnection(admin, orgId);
  return {
    org: data as Org,
    mode: await autoReplyMode(admin, orgId),
    self: await selfAddresses(admin, orgId, conn?.email ?? ""),
    gmailToken: conn ? await getAccessToken(admin, orgId) : null,
    mailboxBlocker: mailboxReplyBlocker(conn),
    // The watermark is the whole reason the first command an owner is told to
    // run — a 168-hour catch-up — does not answer the week of correspondence
    // they have already dealt with by hand.
    watermark: conn?.autoReplyFrom ?? 0,
  };
}

/**
 * Re-read the original mail's headers so the full automation check can run.
 *
 * A message ingested before threading keys were stored has nothing but its
 * subject and sender on file, which is enough to catch the obvious robots and
 * not much else. When the Gmail id and a live connection are both there, the
 * real headers are one cheap request away — and the difference is whether a
 * newsletter from `news@brand.com` gets answered.
 */
type GmailFacts = {
  headers: Record<string, string>;
  labelIds: string[];
  mimeType: string;
  threadId: string;
  messageId: string;
  references: string;
  internalDate: number;
};

async function headersFor(token: string | null, providerSid: string): Promise<GmailFacts | null> {
  if (!token || !providerSid) return null;
  try {
    const r = await fetch(`${GMAIL_API}/messages/${encodeURIComponent(providerSid)}?format=metadata`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const md = (await r.json()) as Json;
    const headers = Object.fromEntries(((md?.payload?.headers ?? []) as Json[]).map((h) => [String(h.name).toLowerCase(), String(h.value ?? "")]));
    return {
      headers,
      labelIds: (md?.labelIds ?? []) as string[],
      mimeType: String(md?.payload?.mimeType ?? ""),
      threadId: String(md?.threadId ?? ""),
      messageId: String(headers["message-id"] ?? ""),
      references: String(headers["references"] ?? ""),
      internalDate: Number(md?.internalDate ?? 0),
    };
  } catch {
    return null;
  }
}

/**
 * Did looking at this candidate cost anything?
 *
 * The per-organisation inspection budget exists so a handful of unanswerable
 * threads cannot make a five-minute cron expensive. But it was charged for
 * candidates rejected by the FREE checks at the top of answerOne — no query, no
 * fetch, nothing written — and one of those is the mailbox watermark. 0114
 * defaults auto_reply_from to now(), so on the day an owner switches this on
 * EVERY unreplied mail from the preceding 48 hours is watermark-blocked; they
 * sort oldest-first, they are deliberately never marked (so the owner can move
 * the watermark back), and a mailbox with 25 of them therefore spent all 25 slots
 * re-rejecting the same stable set on every run and never reached a message it
 * could answer. considered=25, answered=0, for the first two days.
 *
 * Free rejections are now walked past instead of charged for, under a separate
 * and much larger walk ceiling, so the budget goes to candidates that can use it.
 */
type OneOutcome = { costly: boolean };
const FREE: OneOutcome = { costly: false };
const SPENT: OneOutcome = { costly: true };

/** Details are for a human reading the run; a walk past a large blocked backlog
 *  must not turn the response into a megabyte of JSON. */
const MAX_DETAILS = 100;

async function answerOne(
  admin: SupabaseClient,
  ctx: OrgContext,
  c: Candidate,
  o: { dryRun: boolean; sinceMs: number; nonMailboxMaxAgeMs: number },
  report: OrgReport,
): Promise<OneOutcome> {
  const orgId = ctx.org.id;
  const { dryRun } = o;
  const note = (outcome: string, reason?: string) => {
    if (report.details.length >= MAX_DETAILS) return;
    report.details.push({ conversation: c.conversationId, outcome, ...(reason ? { reason } : {}) });
  };
  /** A dry run "reports exactly what it would answer and sends nothing" — so it
   *  must also WRITE nothing permanent. It used to reach markNotAnswered with
   *  retryable:false before its own return, which ruled those messages out of
   *  every later run: the preview burned the backlog it was previewing. */
  const mark = async (reason: string, retryable: boolean) => {
    if (!dryRun) await markNotAnswered(admin, orgId, c.messageId, c.meta, reason, retryable);
  };
  const skip = async (reason: string, opts?: { mark?: boolean; retryable?: boolean }): Promise<OneOutcome> => {
    if (opts?.mark) await mark(reason, opts.retryable ?? false);
    report.skipped++;
    note("skipped", reason);
    return SPENT;
  };
  /** A rejection that cost nothing — no query, no fetch, nothing written — so it
   *  must not consume one of this organisation's inspection slots. */
  const freeSkip = async (reason: string, opts?: { mark?: boolean; retryable?: boolean }): Promise<OneOutcome> => {
    await skip(reason, opts);
    return FREE;
  };

  // --- Free rejections first: no query, no fetch, nothing written. ---

  // A decision already recorded against this message, when it was permanent, or
  // when the send already succeeded. findCandidates drops both before the
  // inspection budget is spent; this stays as the second line.
  const prior = (c.meta?.auto_reply ?? null) as Json;
  if (prior && prior.answered === true) return freeSkip("it has already been answered");
  if (prior && prior.answered === false && prior.retryable === false) {
    return freeSkip(String(prior.reason ?? "previously ruled out"));
  }

  const at = arrivedAt(c);
  if (at && at < o.sinceMs) {
    // Inside the window by INSERT time, outside it by the mail's own date — an
    // imported six-month-old thread. Never marked: a wider window is a legitimate
    // thing for an owner to ask for, and burning the row would make that
    // impossible.
    return freeSkip("it is older than the catch-up window");
  }
  if (fromMailbox(c)) {
    if (ctx.mailboxBlocker) return freeSkip(ctx.mailboxBlocker);
    if (ctx.watermark && at && at < ctx.watermark) {
      return freeSkip("it arrived before automatic replies were switched on for this mailbox");
    }
  } else if (o.nonMailboxMaxAgeMs > 0 && at && Date.now() - at > o.nonMailboxMaxAgeMs) {
    // SMS, WhatsApp and webhook mail have no auto_reply_from watermark, so on the
    // unattended cron leg their only protection against "answer the past" is age.
    // Never marked — a human asking for a wider window is an explicit decision
    // and must still work. See CRON_NON_MAILBOX_MAX_AGE_MS.
    return freeSkip("it is older than the automatic catch-up window for this channel");
  }

  const { data: convRow, error: convErr } = await admin
    .from("conversations")
    .select("*")
    .eq("id", c.conversationId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (convErr) {
    // A transient read failure is not "there is no such conversation". Left
    // unmarked and retried on the next tick.
    console.error("[phoxta] agent-catchup conversation unreadable:", convErr.message);
    return skip("the conversation could not be read");
  }
  // Marked permanently: the row is gone (a deleted thread, a cascade), and it is
  // never coming back — leaving it live keeps it at the front of the queue for
  // the whole window, re-read on every tick.
  if (!convRow) return skip("conversation not found", { mark: true, retryable: false });
  const conv = convRow as Json;
  // Marked, not merely skipped: a sandbox thread never becomes a real one, so an
  // unanswered message on one would otherwise be a permanent candidate, re-read
  // and re-rejected on every tick while occupying one of this org's inspection
  // slots — the same starvation the settled filter exists to end.
  if (conv.is_test === true) return skip("a sandbox conversation", { mark: true, retryable: false });

  const to = c.channel === "email" ? String(conv.customer_email ?? "").trim() : String(conv.customer_phone ?? "").trim();
  if (!to) return skip("no address or number on file", { mark: true, retryable: false });

  // --- Is this a person, or a machine? Email only: the checks are mail headers,
  //     list markers and no-reply local parts, none of which mean anything on a
  //     phone number. ---
  let gm: GmailFacts | null = null;
  if (c.channel === "email") {
    gm = await headersFor(ctx.gmailToken, c.providerSid);
    // Mail synced before the threading keys were stored has none, so a reply
    // could not thread — and worse, could not be recognised as belonging to the
    // mailbox at all. One metadata fetch repairs the row permanently, which is
    // what makes the existing backlog answerable.
    if (gm?.threadId && !c.meta?.gmail_thread_id) {
      c.meta = {
        ...c.meta,
        source: String(c.meta?.source ?? "gmail-sync"),
        gmail_thread_id: gm.threadId,
        message_id: gm.messageId,
        references: gm.references,
        internal_date: gm.internalDate,
      };
      if (!dryRun) await admin.from("conversation_messages").update({ meta: c.meta }).eq("id", c.messageId).eq("organization_id", orgId);
      // Repairing the row can reveal that this is mailbox mail after all, which
      // brings the watermark and the send permission into play.
      if (ctx.mailboxBlocker) return skip(ctx.mailboxBlocker);
      const repaired = gm.internalDate || at;
      if (ctx.watermark && repaired && repaired < ctx.watermark) {
        return skip("it arrived before automatic replies were switched on for this mailbox");
      }
      if (repaired && repaired < o.sinceMs) return skip("it is older than the catch-up window");
      // (costly by now — the metadata fetch and the repair write have happened)
    }
    const automated = automatedMailReason({
      headers: gm?.headers ?? {},
      labelIds: gm?.labelIds,
      mimeType: gm?.mimeType,
      subject: String(c.meta?.subject ?? conv.summary ?? ""),
      fromEmail: to,
      selfAddresses: ctx.self,
    });
    if (automated) {
      // Only a definitive signal settles it forever. A heuristic stays live, so
      // a real customer this misjudges keeps its place in the queue and keeps
      // the reason visible on the message in the Inbox.
      return skip(automated.reason, { mark: true, retryable: !automated.definitive });
    }
  }
  if (!c.body.trim()) {
    // Settled for the AGENT — the body will not become readable on a later tick,
    // and leaving it live would burn an inspection slot every five minutes with
    // no possible progress. But it is not settled for the BUSINESS: a purchase
    // order sent as a single PDF, or a mail built entirely of images, is a real
    // customer that a machine cannot read. Tell a person, once (notifyNeedsHuman
    // dedupes on the conversation), rather than burying it.
    if (!dryRun) await notifyNeedsHuman(admin, orgId, c.conversationId, "A message arrived that the agent could not read.");
    return skip("the message had no readable text — it needs a person to open it", { mark: true, retryable: false });
  }

  // --- Channel-specific delivery constraints, checked before spending. ---
  if (c.channel === "whatsapp" && Date.now() - Date.parse(c.createdAt) > WA_WINDOW_MS) {
    // Permanent: the window only ever gets further away.
    return skip("outside WhatsApp's 24-hour window — an approved template is required", { mark: true, retryable: false });
  }

  // --- The same gates the live path runs, and for the same reasons. ---
  const gate = await autoReplyAllowed(admin, orgId, {
    conversationId: c.conversationId,
    channel: c.channel,
    mode: ctx.mode,
  });
  if (!gate.ok) {
    // Some refusals are a moment in time and some are a dead end. A dead end that
    // a PERSON can still act on — above all "this text can only be answered from
    // the business's own number" — must reach a person, or the message is settled
    // forever with nobody told. notifyNeedsHuman dedupes per conversation.
    if (gate.needsHuman && !dryRun) await notifyNeedsHuman(admin, orgId, c.conversationId, c.body);
    return skip(gate.reason, { mark: true, retryable: gate.retryable });
  }

  if (c.channel === "email" && ctx.gmailToken) {
    const threadId = String(c.meta?.gmail_thread_id ?? "");
    // Mail from the connected mailbox: the exact thread. Mail that arrived
    // through the inbound webhook has no Gmail thread, and until now that meant
    // the "a human already replied" check could not run on it at all — so an
    // owner who answered from their own mail client got answered over by a cron
    // tick. Gmail's search is the equivalent evidence: anything SENT to this
    // person after their message arrived.
    const answeredByHand = threadId
      ? await gmailThreadHasNewerSent(ctx.gmailToken, threadId, at)
      : await gmailHasNewerSentTo(ctx.gmailToken, to, at);
    if (answeredByHand) {
      return skip("someone had already replied from the mailbox", { mark: true, retryable: false });
    }
  }

  if (dryRun) {
    note("would answer");
    return SPENT;
  }

  // --- Claim it, so gmail-sync (or a second catch-up run) cannot answer the
  //     same message while this one is in the model. ---
  if (!(await claimForReply(admin, orgId, c.messageId, c.meta))) {
    return skip("another worker is already answering it");
  }

  // --- Compose. ---
  const config = await loadConfig(admin, orgId);
  let result;
  try {
    result = await respondCore(admin, ctx.org, config, {
      channel: c.channel,
      conversationId: c.conversationId,
      customer: {
        email: String(conv.customer_email ?? "") || undefined,
        phone: String(conv.customer_phone ?? "") || undefined,
        name: String(conv.customer_name ?? "") || undefined,
      },
      message: trimForAgent(c.body),
      // The message has been on the thread for hours — respondCore must answer
      // it, not file it a second time, and must drop it from the history rather
      // than hand the model the same words twice.
      inbound: { recorded: true, recordedId: c.messageId },
    });
  } catch (e) {
    const why = String((e as Error)?.message || e);
    await mark(`the agent could not compose a reply: ${why}`, true);
    report.failed++;
    note("failed", why);
    return SPENT;
  }
  if (result.paused) return skip("a human has taken over this thread", { mark: true, retryable: false });
  if (result.capped) return skip("the monthly usage allowance for this plan is spent", { mark: true, retryable: true });
  const reply = result.reply.trim();
  if (!reply) return skip("the agent composed no reply", { mark: true, retryable: true });

  // --- Deliver, on the channel it arrived on, through the one funnel. ---
  const subject = replySubject(String(c.meta?.subject ?? conv.summary ?? ""));
  const gmailThreadId = String(c.meta?.gmail_thread_id ?? "");
  const delivered = await deliverAutoReply(admin, orgId, {
    channel: c.channel,
    trigger: "agent-catchup",
    conversationId: c.conversationId,
    to,
    text: reply,
    ...(c.channel === "email" ? { subject, inboundSubject: String(c.meta?.subject ?? conv.summary ?? "") } : {}),
    agentMessageId: result.agentMessageId,
    customerMessageId: c.messageId,
    customerMeta: c.meta,
    template: result.template,
    mode: ctx.mode,
    // Known keys are passed straight through; when there are none, the helper
    // recovers what it can from the thread and — crucially — still decides the
    // sending identity from where the mail originally arrived.
    ...(gmailThreadId
      ? {
        thread: {
          threadId: gmailThreadId,
          messageId: String(c.meta?.message_id ?? ""),
          references: String(c.meta?.references ?? ""),
          subject,
          fromMailbox: true,
        },
      }
      : {}),
    stampExtra: {
      source: "agent-catchup",
      ...(c.channel === "email" ? { in_reply_to: String(c.meta?.message_id ?? "") } : {}),
    },
  });

  if (delivered.sent) { report.answered++; note("answered"); return SPENT; }
  if (delivered.outcome) { report.failed++; note("failed", delivered.reason); return SPENT; }
  report.skipped++;
  note("skipped", delivered.reason);
  return SPENT;
}

async function catchUpOrg(
  admin: SupabaseClient,
  orgId: string,
  candidates: Candidate[],
  perOrgLimit: number,
  o: { dryRun: boolean; sinceMs: number; nonMailboxMaxAgeMs: number },
): Promise<OrgReport> {
  const report: OrgReport = { org: orgId, considered: 0, answered: 0, skipped: 0, failed: 0, details: [] };
  const ctx = await loadOrgContext(admin, orgId);
  if (!ctx) {
    report.skipped = candidates.length;
    report.details.push({ conversation: "-", outcome: "skipped", reason: "the business record could not be loaded" });
    return report;
  }
  if (ctx.mode !== "auto") {
    report.skipped = candidates.length;
    report.details.push({ conversation: "-", outcome: "skipped", reason: modeReason(ctx.mode) });
    // "Ask me": tell a human, ONCE PER MESSAGE.
    //
    // This loop wrote nothing to the message rows, so findCandidates returned
    // exactly the same set on the next tick and notifyNeedsHuman was a bare
    // insert — five waiting messages became up to 360 identical alerts in six
    // hours, and the one person who needed to see "a customer is waiting"
    // stopped reading them. The mark records that they were told; the reason
    // stays retryable, so flipping the switch back to Auto still answers these.
    if (ctx.mode === "approve" && !o.dryRun) {
      const reason = modeReason(ctx.mode);
      // FILTER, THEN SLICE. It used to slice first, so past the limit the same
      // already-notified messages occupied the whole slice on every tick — each
      // one skipped by the guard below — and messages six onward were never
      // reached at all until the first five aged out of the window.
      const waiting = candidates.filter((c) => !c.meta?.auto_reply?.needs_human_notified_at).slice(0, perOrgLimit);
      for (const c of waiting) {
        await notifyNeedsHuman(admin, orgId, c.conversationId, c.body);
        await markNotAnswered(admin, orgId, c.messageId, c.meta, reason, true, {
          needs_human_notified_at: new Date().toISOString(),
        });
      }
    }
    return report;
  }
  // THREE ceilings: how many are ANSWERED, how many cost anything to look at, and
  // how many are walked past at all. The middle one keeps a five-minute cron
  // cheap when a business has a queue of threads that can never be answered (no
  // address on file, a closed thread); the third bounds the walk itself, because
  // the free rejections at the top of answerOne cost nothing but CPU and must not
  // be charged to the inspection budget — see the OneOutcome comment.
  const inspectLimit = o.dryRun ? perOrgLimit : Math.max(perOrgLimit, CONSIDER_FLOOR);
  const walkLimit = o.dryRun ? inspectLimit : Math.max(inspectLimit * 8, 200);
  let walked = 0;
  for (const c of candidates) {
    if (report.answered >= perOrgLimit || report.considered >= inspectLimit) break;
    if (++walked > walkLimit) break;
    const outcome = await answerOne(admin, ctx, c, o, report);
    if (outcome.costly) report.considered++;
  }
  report.walked = walked;
  return report;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const admin = adminClient();
    const body = (await req.json().catch(() => ({}))) as {
      organizationId?: string;
      hours?: number;
      limit?: number;
      dryRun?: boolean;
    };
    // Hard bounds, not suggestions: 14 days back at most, 50 replies per
    // business at most, 200 across the whole run at most.
    const hours = clamp(body?.hours, 48, 1, 24 * 14);
    const perOrgLimit = clamp(body?.limit, 10, 1, 50);
    const dryRun = body?.dryRun === true;
    const sinceMs = Date.now() - hours * 3600_000;
    const since = new Date(sinceMs).toISOString();

    const cronSecret = Deno.env.get("CRON_SECRET");
    const isCron = !!cronSecret && req.headers.get("x-cron-secret") === cronSecret;

    let scopeOrg: string | null = null;
    if (!isCron) {
      const a = await authorize(req, body?.organizationId, { requireAdmin: true });
      if (a.error) return a.error;
      scopeOrg = a.ok.org.id;
    }

    // The cron leg is unattended, so it does not reach back on the channels the
    // watermark cannot protect. A member-authed run is a person deciding.
    const nonMailboxMaxAgeMs = isCron ? CRON_NON_MAILBOX_MAX_AGE_MS : 0;

    const scan = await findCandidates(admin, since, scopeOrg);
    // Applied HERE as well as inside answerOne, and for the reason the settled
    // filter is applied in the scan: a candidate that can never be answered on
    // this leg must not occupy one of the org's inspection slots. Otherwise the
    // 48-hour daily sweep spends its whole budget re-rejecting texts from
    // yesterday, oldest first, and never reaches the ones it could answer.
    const candidates = nonMailboxMaxAgeMs > 0
      ? scan.candidates.filter((c) => {
        if (fromMailbox(c)) return true;
        const at = arrivedAt(c);
        return !at || Date.now() - at <= nonMailboxMaxAgeMs;
      })
      : scan.candidates;
    const byOrg = new Map<string, Candidate[]>();
    for (const c of candidates) {
      const list = byOrg.get(c.orgId) ?? [];
      list.push(c);
      byOrg.set(c.orgId, list);
    }

    const reports: OrgReport[] = [];
    let answered = 0;
    const overall = 200;
    for (const [orgId, list] of byOrg) {
      if (answered >= overall) break;
      const room = Math.min(perOrgLimit, overall - answered);
      try {
        const r = await catchUpOrg(admin, orgId, list, room, { dryRun, sinceMs, nonMailboxMaxAgeMs });
        answered += r.answered;
        reports.push(r);
        console.log(`[phoxta] agent-catchup ${orgId}: walked=${r.walked ?? r.considered} considered=${r.considered} answered=${r.answered} skipped=${r.skipped} failed=${r.failed}${dryRun ? " (dry run)" : ""}`);
      } catch (e) {
        reports.push({ org: orgId, considered: list.length, answered: 0, skipped: 0, failed: list.length, details: [{ conversation: "-", outcome: "failed", reason: String((e as Error)?.message || e) }] });
      }
    }

    // HOW LONG HAS THE OLDEST PERSON BEEN WAITING?
    //
    // The Inbox promises "It stays in the queue and will be tried again" for
    // every retryable skip, and the queue is only ever this worker's window.
    // Nothing measured or reported the age of the oldest unanswered message, so
    // an owner had no signal at all that the promise had quietly expired — and
    // neither did anyone operating the platform. Both numbers go into the run's
    // answer and into the heartbeat detail the console renders.
    // Measured against the WHOLE unanswered set, not the slice this leg was
    // willing to answer — the point is to surface a backlog, including one this
    // run deliberately left alone.
    const oldest = scan.candidates.length ? Date.parse(scan.candidates[0].createdAt) : 0;
    const oldestWaitingMinutes = oldest ? Math.round((Date.now() - oldest) / 60_000) : 0;
    const deferredOtherChannels = scan.candidates.length - candidates.length;
    if (scan.truncated) {
      console.warn(`[phoxta] agent-catchup scan hit its ${SCAN_LIMIT}-row ceiling — the window holds more than one run can see`);
    }
    if (scan.liveFilter === "unavailable") {
      console.warn("[phoxta] agent-catchup ran WITHOUT the live-only scan filter — settled traffic is consuming the row budget");
    }

    if (isCron) {
      try {
        await admin.rpc("app_cron_beat", {
          p_worker: "agent-catchup",
          // The live-only filter degrading is not a correctness failure, but it
          // IS the worker quietly ceasing to repair, so the heartbeat goes amber
          // for it too — otherwise the only signal is a console.warn on the first
          // tick that nobody will be watching for.
          p_ok: !scan.truncated && scan.liveFilter === "applied",
          p_detail:
            `${scan.candidates.length} unanswered, ${answered} answered` +
            (deferredOtherChannels ? `, ${deferredOtherChannels} left for a person (older than the automatic window on their channel)` : "") +
            (oldestWaitingMinutes ? `, oldest waiting ${oldestWaitingMinutes}m` : "") +
            (scan.truncated ? `, SCAN TRUNCATED at ${SCAN_LIMIT} rows` : "") +
            (scan.liveFilter === "unavailable" ? ", LIVE-ONLY SCAN FILTER REJECTED BY POSTGREST (scanning unfiltered — settled traffic is eating the row budget)" : "") +
            (dryRun ? " (dry run)" : ""),
        });
      } catch { /* the run still happened */ }
    }

    return json({
      ok: true,
      dryRun,
      windowHours: hours,
      unanswered: scan.candidates.length,
      considered: candidates.length,
      deferredOtherChannels,
      answered,
      scanned: scan.scanned,
      scanTruncated: scan.truncated,
      // "applied" or "unavailable" — whether the server-side live-only filter ran.
      // Nobody could tell which branch was live without reading function logs.
      liveFilter: scan.liveFilter,
      oldestWaitingMinutes,
      organizations: reports,
    });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
