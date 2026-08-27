import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

/**
 * Email ingress — is mail actually reaching this business, and if not, why not?
 *
 * A business owner reported that mail sent to their hello@ address never
 * appeared in the console, and nothing in the product could answer them. Every
 * distinct failure looked identical from the outside: no Google connection, a
 * revoked grant, the wrong Google account, a Gmail filter archiving the mail out
 * of the sync's reach, mail older than the sync window, a cron that had stopped.
 * All of them produced an Inbox reading "No conversations yet — messages from
 * your website chat, SMS, WhatsApp, email and calls all land here."
 *
 * This module is the answer to that. It reads:
 *   • app_email_ingress_health — connection status, sync settings and the last
 *     run, without ever returning an OAuth token (migration 0117).
 *   • email_sync_runs          — the history, per business.
 *   • gmail-sync mode:"check"  — Gmail itself: which mailbox, does the token
 *     work, which addresses are aliases of it, and where did the mail go.
 *
 * Nothing here sends anything. `runEmailSync` is the one call that can, and it
 * says so at its definition.
 */

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export type SyncRun = {
  at: string;
  trigger: string;
  ok: boolean;
  mailbox: string;
  /** The exact Gmail search the run made. "It found nothing" is not an answer;
   *  "it found nothing, and this is what it asked for" is. */
  query: string;
  /** Message ids Gmail returned, before deduplication. */
  listed: number;
  imported: number;
  replied: number;
  skipped: number;
  failed: number;
  /** Already in the Inbox from an earlier run — why a healthy mailbox reports
   *  "0 new". */
  alreadyHad: number;
  /** THE RUN DIED. Everything after it was not attempted. */
  error: string;
  /** One message hiccupped — most often the owner deleting it in Gmail between
   *  the list call and the fetch — and the run carried on. Deliberately NOT
   *  `error`: a routine race used to mark a perfect sync as failed everywhere. */
  warning: string;
  /** Why messages were not auto-answered, tallied. */
  reasons: Record<string, number>;
  filedAway: number;
  /** Matched, but deliberately not brought into the Inbox: junk, drafts, chats,
   *  and machine mail the business had already filed away. */
  ignored: number;
};

export type EmailIngressHealth = {
  connected: boolean;
  /** The Google account gmail-sync reads. This one fact alone reveals the
   *  commonest cause: an owner expecting hello@ while a different account is
   *  connected. */
  mailbox: string;
  scope: string;
  /** Whether a refresh token exists — not its value, which never leaves the
   *  database. Without one the connection dies within the hour and cannot renew. */
  hasRefreshToken: boolean;
  tokenExpiry: string | null;
  tokenExpired: boolean | null;
  connectedAt: string | null;
  updatedAt: string | null;
  /** Migration 0114's watermark. Null means the column is not installed, and the
   *  agent refuses to answer anything from this mailbox until it is. */
  autoReplyFrom: string | null;
  windowDays: number | null;
  scopeMode: string | null;
  lastRun: SyncRun | null;
  emailConversations: number;
  lastEmailAt: string | null;
  /** True when migration 0117 has not been applied, so only the connection row
   *  could be read. The screen says so rather than inventing a green tick. */
  degraded: boolean;
};

export type MailboxAlias = { address: string; isPrimary: boolean; isDefault: boolean; verified: boolean; displayName: string };

export type MailPeek = {
  id: string;
  labels: string[];
  from: string;
  to: string;
  subject: string;
  date: string;
  deliveredTo: string;
  listId: string;
  internalDate: number;
};

export type AddressProbe = {
  address: string;
  isAlias: boolean;
  /** False when Gmail would not list the mailbox's addresses, so `isAlias:false`
   *  means "could not tell" rather than "no". */
  aliasesKnown: boolean;
  total: number;
  totalCapped: boolean;
  inInbox: number;
  inSpam: number;
  inTrash: number;
  wouldSync: number;
  latest: MailPeek | null;
  findings: string[];
  error: string;
};

export type MailboxCheck = {
  ok: boolean;
  connected: boolean;
  /** The caller's role on this business, straight from the server. */
  role: string;
  /** Whether this person may run the admin-only legs (Sync now, Save). Stated
   *  by the server rather than inferred from what came back. */
  canManage: boolean;
  mailbox: string;
  /** What Gmail says `users/me` is. A mismatch with `mailbox` means the stored
   *  row is stale. */
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
  matched: number;
  matchedCapped: boolean;
  messagesTotal: number;
  aliases: MailboxAlias[];
  aliasError: string;
  probe: AddressProbe | null;
  webhook: { url: string; publicKey: string; token: string; configured: boolean } | null;
  error: string | null;
};

export type SyncReport = {
  ok: boolean;
  mailbox: string;
  query: string;
  listed: number;
  imported: number;
  alreadyHad: number;
  replied: number;
  skipped: number;
  failed: number;
  filedAway: number;
  ignored: number;
  reasons: Record<string, number>;
  error: string | null;
  /** One message hiccupped; the run itself succeeded. */
  warning: string | null;
};

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

type RunRow = {
  created_at?: string;
  trigger?: string;
  ok?: boolean;
  mailbox?: string;
  query?: string;
  listed?: number;
  imported?: number;
  replied?: number;
  skipped?: number;
  failed?: number;
  already_had?: number;
  error?: string;
  detail?: { reasons?: Record<string, number>; filed_away?: number; ignored?: number; warning?: string } | null;
  /** app_email_ingress_health names the timestamp `at`; the table names it
   *  created_at. One mapper reads both. */
  at?: string;
};

function toRun(row: RunRow | null | undefined): SyncRun | null {
  if (!row) return null;
  return {
    at: String(row.at ?? row.created_at ?? ""),
    trigger: String(row.trigger ?? "cron"),
    ok: row.ok !== false,
    mailbox: String(row.mailbox ?? ""),
    query: String(row.query ?? ""),
    listed: num(row.listed),
    imported: num(row.imported),
    replied: num(row.replied),
    skipped: num(row.skipped),
    failed: num(row.failed),
    alreadyHad: num(row.already_had),
    error: String(row.error ?? ""),
    warning: String(row.detail?.warning ?? ""),
    reasons: (row.detail?.reasons ?? {}) as Record<string, number>,
    filedAway: num(row.detail?.filed_away),
    ignored: num(row.detail?.ignored),
  };
}

/**
 * The per-run "why nothing was answered" tally, in reading order — commonest
 * first.
 *
 * This was parsed and then rendered nowhere, so the single fact that explains a
 * whole business's silence — every run recording "a mailing list (List-*
 * headers)", say — existed only for the thirty seconds after a manual sync.
 */
export function runReasons(run: SyncRun | null | undefined): { why: string; count: number }[] {
  return Object.entries(run?.reasons ?? {})
    .map(([why, count]) => ({ why, count: num(count) }))
    .sort((a, b) => b.count - a.count);
}

const EMPTY_HEALTH: EmailIngressHealth = {
  connected: false, mailbox: "", scope: "", hasRefreshToken: false,
  tokenExpiry: null, tokenExpired: null, connectedAt: null, updatedAt: null,
  autoReplyFrom: null, windowDays: null, scopeMode: null, lastRun: null,
  emailConversations: 0, lastEmailAt: null, degraded: false,
};

/**
 * True when the failure is "that function/table does not exist yet" rather than
 * a real error — i.e. migration 0117 has not been applied to this project.
 *
 * PostgREST answers a missing function with PGRST202 and a missing table with
 * PGRST205, both worded "Could not find … in the schema cache". Both the code
 * and the message are checked, because the code is absent on some transports.
 */
const notMigrated = (err: { code?: string; message?: string } | null | undefined): boolean =>
  err?.code === "PGRST202" ||
  err?.code === "PGRST205" ||
  /does not exist|schema cache/i.test(String(err?.message ?? ""));

export async function getEmailIngressHealth(orgId: string): Promise<{ data: EmailIngressHealth; error: string | null }> {
  const { data, error } = await supabase.rpc("app_email_ingress_health", { p_org: orgId });
  if (error) {
    // Before 0117 the console can still say WHICH account is connected — which
    // is most of the value — so it degrades rather than showing nothing.
    if (notMigrated(error)) {
      const { data: row } = await supabase
        .from("google_connections")
        .select("email, scope, updated_at, created_at")
        .eq("organization_id", orgId)
        .maybeSingle();
      const c = row as { email?: string; scope?: string; updated_at?: string; created_at?: string } | null;
      return {
        data: {
          ...EMPTY_HEALTH,
          connected: Boolean(c),
          mailbox: c?.email ?? "",
          scope: c?.scope ?? "",
          connectedAt: c?.created_at ?? null,
          updatedAt: c?.updated_at ?? null,
          degraded: true,
        },
        error: null,
      };
    }
    return { data: EMPTY_HEALTH, error: friendlyError(error.message) };
  }
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    data: {
      connected: Boolean(d.connected),
      mailbox: String(d.mailbox ?? ""),
      scope: String(d.scope ?? ""),
      hasRefreshToken: Boolean(d.has_refresh_token),
      tokenExpiry: (d.token_expiry as string | null) ?? null,
      tokenExpired: d.token_expired === null || d.token_expired === undefined ? null : Boolean(d.token_expired),
      connectedAt: (d.connected_at as string | null) ?? null,
      updatedAt: (d.updated_at as string | null) ?? null,
      autoReplyFrom: (d.auto_reply_from as string | null) ?? null,
      windowDays: d.window_days === null || d.window_days === undefined ? null : num(d.window_days),
      scopeMode: (d.scope_mode as string | null) ?? null,
      lastRun: toRun(d.last_run as RunRow | null),
      emailConversations: num(d.email_conversations),
      lastEmailAt: (d.last_email_at as string | null) ?? null,
      degraded: false,
    },
    error: null,
  };
}

export async function listSyncRuns(orgId: string, limit = 12): Promise<{ data: SyncRun[]; error: string | null }> {
  const { data, error } = await supabase
    .from("email_sync_runs")
    .select("created_at, trigger, ok, mailbox, query, listed, imported, replied, skipped, failed, already_had, error, detail")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    // No table yet is not an error to show an owner — the screen's own empty
    // state already says what an absent history means.
    return { data: [], error: notMigrated(error) ? null : friendlyError(error.message) };
  }
  return { data: ((data ?? []) as RunRow[]).map(toRun).filter((r): r is SyncRun => r !== null), error: null };
}

// ---------------------------------------------------------------------------
// The edge function legs
// ---------------------------------------------------------------------------

/** supabase.functions.invoke only fills `error` on a NON-2xx response, and these
 *  functions answer 200 with `{ ok:false, error }` by design (the cron path must
 *  not be retried). Reading only `error` is exactly the bug that made a totally
 *  dead Google connection toast "Synced 0 new message(s)". Both are read here. */
async function callSync<T extends { error?: string | null }>(body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("gmail-sync", { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = await (error as { context?: Response }).context?.json?.();
      if (ctx?.error) msg = ctx.error;
    } catch { /* keep the transport message */ }
    return { data: null, error: friendlyError(msg) };
  }
  const d = (data ?? {}) as T;
  return { data: d, error: d.error ? String(d.error) : null };
}

/**
 * Read the mailbox and report. SENDS NOTHING, WRITES NOTHING.
 *
 * Safe to run on page load and safe to press repeatedly — it lists message ids
 * and reads message headers, and never touches conversation_messages.
 */
export async function checkMailbox(orgId: string, address?: string): Promise<{ data: MailboxCheck | null; error: string | null }> {
  const { data, error } = await callSync<MailboxCheck>({
    organizationId: orgId,
    mode: "check",
    ...(address ? { address } : {}),
  });
  // BOTH are returned, and this line used to throw the important one away.
  //
  // A check that reaches the function always has a report to show, even when the
  // report's headline is "this connection is dead" — that IS the answer, and it
  // is the answer this whole screen exists to give. It used to read
  // `error: data ? null : error`, so a revoked Google grant came back as a full
  // report whose reason ("Google refused to renew access (invalid_grant) —
  // reconnect Google…") was nulled on the way to the screen, leaving a tile
  // reading "Connection: Not working" and nothing else anywhere in the product.
  return { data, error };
}

/**
 * Pull mail in now.
 *
 * THIS SENDS. Every message it imports is a message the agent may answer, up to
 * GMAIL_SYNC_MAX_REPLIES_PER_RUN real emails from the business's own mailbox per
 * press — which is why the edge function requires an owner or admin, and why the
 * button that calls it says so.
 */
export async function runEmailSync(orgId: string): Promise<{ data: SyncReport | null; error: string | null }> {
  return callSync<SyncReport>({ organizationId: orgId });
}

export async function saveSyncSettings(
  orgId: string,
  windowDays: number,
  scopeMode: "inbox" | "all_mail",
): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await callSync<{ ok?: boolean; error?: string | null }>({
    organizationId: orgId,
    mode: "settings",
    windowDays,
    scopeMode,
  });
  return { ok: Boolean(data?.ok), error: error ?? (data?.ok ? null : "The settings could not be saved.") };
}

// ---------------------------------------------------------------------------
// The verdict — one sentence, the same wording everywhere it is shown
// ---------------------------------------------------------------------------

/**
 * Which state this business's email is in. Named rather than merely coloured,
 * because three different surfaces have to make three different decisions from
 * the same verdict — whether to nag in the Inbox queue, whether to count the
 * channel as in use, whether to paint the chip red or amber — and inferring any
 * of that from the label text is how a state ends up indistinguishable from its
 * neighbour.
 */
export type IngressVerdictKind =
  | "not_connected"
  | "no_refresh_token"
  | "failing"
  | "setup_pending"
  | "replies_held"
  | "never_run"
  | "stale"
  | "nothing_yet"
  | "ok";

export type IngressVerdict = {
  kind: IngressVerdictKind;
  tone: "ok" | "warn" | "danger";
  /** Short enough for a chip. */
  label: string;
  /** A headline an owner can act on. */
  title: string;
  /**
   * One supporting sentence, written so it reads correctly on EVERY surface —
   * the Inbox banner, the Channels card, the Google Configure card and the Email
   * delivery screen. It therefore names no button: only the Email delivery
   * screen has buttons, and each surface adds its own link to it.
   */
  detail: string;
  /** Mail is reaching this Inbox as far as anything here can tell. */
  healthy: boolean;
  /**
   * The only thing wrong is that Phoxta has not finished setting this up on this
   * project — nothing the owner did, and nothing they can do. Surfaces that nag
   * (the Inbox queue banner) stay quiet; the screens an owner opens ON PURPOSE
   * to investigate still say it plainly.
   */
  setupPending: boolean;
};

/** How long after a run we start calling the five-minute sync stale. Two missed
 *  ticks plus slack — a single slow tick is not an outage. */
const STALE_MS = 20 * 60_000;

export function ingressVerdict(h: EmailIngressHealth | null | undefined): IngressVerdict {
  if (!h || !h.connected) {
    return {
      kind: "not_connected",
      tone: "danger",
      label: "Not connected",
      title: "Email is not connected for this business",
      detail: "No Google account is linked, so nothing sent to your business address can reach this Inbox. Connect Google Workspace, or point your mail provider at the inbound webhook instead.",
      healthy: false,
      setupPending: false,
    };
  }
  if (!h.degraded && !h.hasRefreshToken) {
    return {
      kind: "no_refresh_token",
      tone: "danger",
      label: "Reconnect needed",
      title: `${h.mailbox || "The connected mailbox"} cannot renew its access`,
      detail: "Google was linked without a refresh token, so access expires within the hour and cannot be renewed. Disconnect and reconnect Google Workspace.",
      healthy: false,
      setupPending: false,
    };
  }
  const run = h.lastRun;
  if (!h.degraded && run && !run.ok && run.error) {
    return {
      kind: "failing",
      tone: "danger",
      label: "Failing",
      title: "The last check of your mailbox failed",
      detail: run.error,
      healthy: false,
      setupPending: false,
    };
  }
  // NEITHER OF THE NEXT TWO NAMES A MIGRATION.
  //
  // Both used to: "the automatic-reply watermark is not installed on this
  // project (migration 0114)" and "sync history is not available on this project
  // yet (migration 0117)". Those numbers mean nothing to a business owner, they
  // were rendered in the main Inbox queue, and — because the functions ship
  // before the migrations — the second one fired for EVERY connected business
  // the moment this shipped, an indefinite amber alarm about a mailbox that was
  // working perfectly.
  if (!h.degraded && h.autoReplyFrom === null) {
    return {
      kind: "replies_held",
      tone: "warn",
      label: "Replies held",
      title: "Mail is being collected, but the agent will not answer it",
      detail: "Phoxta is still finishing the setup for automatic replies on this business, so every message is filed for a person to answer instead. Nothing is lost — the mail still arrives in your Inbox.",
      healthy: true,
      setupPending: true,
    };
  }
  if (h.degraded) {
    return {
      kind: "setup_pending",
      tone: "warn",
      label: "Setting up",
      title: `Connected to ${h.mailbox || "a Google account"}`,
      detail: "Phoxta is still finishing the setup for the record of each check on this business, so the history of recent checks cannot be shown yet. Your mailbox is still being read every five minutes, and it can be read on demand from the Email delivery screen.",
      healthy: true,
      setupPending: true,
    };
  }
  if (!run) {
    return {
      kind: "never_run",
      tone: "warn",
      label: "Never checked",
      title: "Your mailbox has not been checked yet",
      detail: `Google is connected as ${h.mailbox || "your account"}, but no check of the mailbox has run. Checks happen automatically every five minutes; if this does not clear, the worker that runs them is not running.`,
      healthy: false,
      setupPending: false,
    };
  }
  const age = Date.now() - Date.parse(run.at);
  if (Number.isFinite(age) && age > STALE_MS) {
    return {
      kind: "stale",
      tone: "warn",
      label: "Stale",
      title: "Your mailbox has not been checked recently",
      detail: `The last check was ${relTime(run.at)}, and checks are meant to run every five minutes — so the worker that reads your mailbox has stopped. New mail is not arriving in this Inbox until it starts again.`,
      healthy: false,
      setupPending: false,
    };
  }
  // THE REPORTED STATE, AND IT IS NOT A GREEN TICK.
  //
  // The connection works, the checks run, and not one message has ever come
  // through: Gmail matched nothing at all in the whole window, and this business
  // holds no email conversation. That is precisely the hello@-is-a-Google-Group
  // case that started all this, and calling it "Working — mail is arriving" is
  // the same false reassurance as the old green "Connected" chip.
  //
  // Both halves are required, so a business that simply had a quiet five minutes
  // is untouched: `listed` counts everything the query matched in the window
  // (seven days of all mail by default), not just what was new.
  if (run.ok && run.listed === 0 && h.emailConversations === 0) {
    return {
      kind: "nothing_yet",
      tone: "warn",
      label: "Nothing arriving",
      title: `No email has ever reached ${h.mailbox || "this mailbox"}`,
      detail: `The connection works and the mailbox was checked ${relTime(run.at)}, but Gmail matched nothing at all and no email conversation has ever appeared in this Inbox. If customers write to a different address — a hello@ or support@ that is a Google Group rather than this mailbox — their mail never lands here.`,
      healthy: false,
      setupPending: false,
    };
  }
  return {
    kind: "ok",
    tone: "ok",
    label: "Working",
    title: `Reading mail from ${h.mailbox || "your Google account"}`,
    detail: `Last checked ${relTime(run.at)}: Gmail matched ${run.listed} message${run.listed === 1 ? "" : "s"}, ${run.imported} new.`,
    healthy: true,
    setupPending: false,
  };
}

/** "4 minutes ago". Shared by every surface that shows a run time. */
export function relTime(iso: string | null | undefined): string {
  const t = Date.parse(String(iso ?? ""));
  if (!Number.isFinite(t)) return "never";
  const secs = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (secs < 45) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(t).toLocaleDateString();
}

/**
 * The address an owner is most likely to be asking about.
 *
 * Phoxta's own provisioning creates hello@ on the business's domain (as a Google
 * Group), and hello@ is what the report that started all this was about — so the
 * probe box is pre-filled with it whenever the connected account is on a custom
 * domain. A consumer gmail.com account has no such address and gets a blank box.
 */
const CONSUMER_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

export function suggestedProbeAddress(mailbox: string): string {
  const at = String(mailbox ?? "").indexOf("@");
  if (at < 1) return "";
  const domain = mailbox.slice(at + 1).toLowerCase();
  if (!domain || CONSUMER_DOMAINS.has(domain)) return "";
  return `hello@${domain}`;
}
