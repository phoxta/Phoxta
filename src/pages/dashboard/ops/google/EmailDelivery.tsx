import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast, toastError } from "@/lib/ops/feedback";
import {
  checkMailbox,
  getEmailIngressHealth,
  ingressVerdict,
  listSyncRuns,
  relTime,
  runEmailSync,
  runReasons,
  saveSyncSettings,
  suggestedProbeAddress,
  type EmailIngressHealth,
  type MailboxCheck,
  type SyncReport,
  type SyncRun,
} from "@/lib/db/ops/emailHealth";
import { Card, Chip, Empty } from "@/components/dash/Ui";

/**
 * Email delivery — the screen that answers "why can I not see my mail?"
 *
 * Everything about a business's email ingress used to be invisible. The Inbox
 * showed the same calm empty state whether Google was connected or not, the
 * Configure card painted a green "Connected" chip purely because a row existed,
 * and the only manual sync was a pill buried three levels deep whose toast said
 * "Synced 0 new message(s)" for a totally dead connection. There was no record
 * anywhere that a sync had ever run.
 *
 * So this page states, plainly: which mailbox is being read, whether the
 * connection still works, when it was last checked and what came back, which
 * addresses are aliases of that mailbox (the alias-versus-Google-Group question,
 * settled in one glance), where a specific address's mail actually went, what
 * each sync reads, and — for a business whose mail is not in Gmail at all — the
 * inbound webhook that has existed all along and that no owner could discover.
 */

const CSS = `
.emx { max-width: 860px; }
.emx-copy { font-size: 14px; color: var(--hrx-muted); margin: 0 0 14px; max-width: 68ch; line-height: 1.6; }
.emx-copy strong { color: var(--hrx-ink); font-weight: 600; }
.emx-copy:last-child { margin-bottom: 0; }
.emx-alert { border-radius: 12px; padding: 12px 14px; font-size: 14px; line-height: 1.55; margin-bottom: 14px; }
.emx-alert.danger { background: #fdeaea; color: #b91c1c; border: 1px solid #f6c9c9; }
.emx-alert.warn { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; }
.emx-alert.ok { background: #ecfdf5; color: #065f46; border: 1px solid #b7e4cd; }
.emx-alert b { display: block; font-weight: 600; margin-bottom: 2px; }

.emx-who { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; min-width: 0; }
.emx-who .dot {
  width: 44px; height: 44px; border-radius: 999px; flex-shrink: 0; font-size: 20px;
  display: inline-flex; align-items: center; justify-content: center;
  background: #e8effc; border: 1px solid #d4e2fb;
}
.emx-who .a { font-size: 15px; font-weight: 600; display: block; word-break: break-all; }
.emx-who .b { font-size: 13px; color: var(--hrx-muted); display: block; margin-top: 2px; }

.emx-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 1px; background: var(--hrx-border-soft); border: 1px solid var(--hrx-border-soft); border-radius: 12px; overflow: hidden; margin-bottom: 16px; }
.emx-fact { background: var(--hrx-card); padding: 11px 13px; min-width: 0; }
.emx-fact .k { display: block; font-size: 12px; color: var(--hrx-muted); margin-bottom: 3px; }
.emx-fact .v { display: block; font-size: 14px; font-weight: 500; color: var(--hrx-ink); word-break: break-word; }
.emx-fact .v.mut { font-weight: 400; color: var(--hrx-muted); }

.emx-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.emx-hint { font-size: 12.5px; color: var(--hrx-muted); margin: 8px 0 0; }

.emx-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.emx-table th { text-align: left; font-weight: 500; color: var(--hrx-muted); font-size: 12px; padding: 6px 10px 6px 0; white-space: nowrap; }
.emx-table td { padding: 8px 10px 8px 0; border-top: 1px solid var(--hrx-border-soft); vertical-align: top; }
.emx-table td.n { font-variant-numeric: tabular-nums; white-space: nowrap; }
.emx-table .err { color: #b91c1c; font-size: 12.5px; }
.emx-scroll { overflow-x: auto; }

.emx-findings { margin: 12px 0 0; padding: 0; list-style: none; }
.emx-findings li { position: relative; padding-left: 20px; font-size: 14px; line-height: 1.6; color: var(--hrx-ink); margin-bottom: 8px; }
.emx-findings li::before { content: "→"; position: absolute; left: 0; color: var(--hrx-blue); }
.emx-findings li:last-child { margin-bottom: 0; }

.emx-nums { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.emx-num { background: var(--hrx-soft); border: 1px solid var(--hrx-border-soft); border-radius: 10px; padding: 7px 11px; min-width: 84px; }
.emx-num .k { display: block; font-size: 11.5px; color: var(--hrx-muted); }
.emx-num .v { display: block; font-size: 17px; font-weight: 600; font-variant-numeric: tabular-nums; }

.emx-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; }
.emx-row .hrx-field { margin-bottom: 0; flex: 1 1 240px; min-width: 0; }
.emx-code {
  display: block; width: 100%; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12.5px; line-height: 1.6; word-break: break-all; white-space: pre-wrap;
  background: var(--hrx-soft); border: 1px solid var(--hrx-border-soft); border-radius: 12px;
  padding: 12px 14px; color: var(--hrx-ink); margin-bottom: 10px;
}
.emx-choice { display: flex; gap: 10px; align-items: flex-start; padding: 11px 13px; border: 1px solid var(--hrx-border); border-radius: 12px; cursor: pointer; margin-bottom: 8px; }
.emx-choice.on { border-color: var(--hrx-blue); background: #f5f8ff; }
.emx-choice input { margin-top: 3px; flex-shrink: 0; }
.emx-choice .t { font-size: 14px; font-weight: 500; display: block; }
.emx-choice .d { font-size: 13px; color: var(--hrx-muted); display: block; margin-top: 2px; line-height: 1.5; }

.emx-table td.why { font-size: 12.5px; color: var(--hrx-muted); max-width: 34ch; }
.emx-table .warn { color: #9a3412; font-size: 12.5px; }
.emx-why { margin: 12px 0 0; padding: 10px 12px; border: 1px solid var(--hrx-border-soft); border-radius: 12px; background: var(--hrx-soft); }
.emx-why .h { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.emx-why ul { margin: 0; padding-left: 18px; }
.emx-why li { font-size: 13px; line-height: 1.6; color: var(--hrx-muted); }
`;

const TONE_CHIP: Record<string, "ok" | "warn" | "danger"> = { ok: "ok", warn: "warn", danger: "danger" };

const fmtDate = (iso: string | null | undefined): string => {
  const t = Date.parse(String(iso ?? ""));
  return Number.isFinite(t) ? new Date(t).toLocaleString() : "—";
};

/** Gmail's own label names, in words an owner recognises. */
const LABEL_WORDS: Record<string, string> = {
  INBOX: "Inbox",
  UNREAD: "Unread",
  STARRED: "Starred",
  IMPORTANT: "Important",
  SPAM: "Spam",
  TRASH: "Trash",
  SENT: "Sent",
  DRAFT: "Draft",
  CATEGORY_PERSONAL: "Primary",
  CATEGORY_SOCIAL: "Social",
  CATEGORY_PROMOTIONS: "Promotions",
  CATEGORY_UPDATES: "Updates",
  CATEGORY_FORUMS: "Forums",
};
const labelWords = (ids: string[]): string =>
  ids.map((id) => LABEL_WORDS[id] ?? (id.startsWith("Label_") ? "a custom label" : id)).join(", ") || "no labels";

/**
 * The headline for a failed check, from the state the server actually reached.
 *
 * Four very different problems used to arrive under one wording. "Google has
 * withdrawn access" is something the owner fixes by reconnecting; "Google could
 * not be reached" is a network blip worth retrying; "no refresh token" means the
 * connection was never made properly in the first place. The sentence
 * underneath is always Google's own words.
 */
function failureHeadline(tokenState: string | undefined, connected: boolean): string {
  if (!connected) return "This business's email settings could not be read";
  switch (tokenState) {
    case "not_connected": return "No Google account is connected to this business";
    case "no_refresh_token": return "This connection cannot renew its own access";
    case "refresh_denied": return "Google has withdrawn Phoxta's access to this mailbox";
    case "refused": return "Google refused access to this mailbox";
    case "network_error": return "Google could not be reached";
    default: return "Phoxta could not read this mailbox";
  }
}

/** The caller's role on this business, in the console's own words. */
const roleWords = (role: string | undefined): string =>
  role === "owner" ? "owner" : role === "admin" ? "admin" : "team member";

/** What Google actually let Phoxta do with this mailbox, from the granted OAuth
 *  scope. An owner who reconnected before mail sending was part of the consent
 *  has a connection that reads perfectly and cannot answer anybody, and the only
 *  trace of that used to be a 403 in a function log. */
function permissionWords(scope: string | undefined): string {
  const s = String(scope ?? "");
  if (!s.trim()) return "Recorded before Phoxta kept a list — treated as full access";
  if (/gmail\.modify|gmail\.send|mail\.google\.com/.test(s)) return "Read mail and send replies";
  if (/gmail\./.test(s)) return "Read mail only — replies cannot be sent";
  return "No Gmail permission was granted — reconnect Google";
}

function Fact({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className="emx-fact">
      <span className="k">{k}</span>
      <span className={`v${muted ? " mut" : ""}`}>{v}</span>
    </div>
  );
}

function Num({ k, v }: { k: string; v: number | string }) {
  return (
    <div className="emx-num">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  );
}

export default function EmailDelivery({ orgId }: { orgId: string }) {
  const [health, setHealth] = useState<EmailIngressHealth | null>(null);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Specifically the HEALTH read, as opposed to the run history. On a failed
   *  read the health module hands back its empty value, which says "not
   *  connected" — a verdict this screen must not repeat as if it were an answer. */
  const [healthError, setHealthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [check, setCheck] = useState<MailboxCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const [probeAddr, setProbeAddr] = useState("");
  const [probing, setProbing] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [report, setReport] = useState<SyncReport | null>(null);

  const [windowDays, setWindowDays] = useState(7);
  const [scopeMode, setScopeMode] = useState<"inbox" | "all_mail">("all_mail");
  const [savingSettings, setSavingSettings] = useState(false);

  const [showToken, setShowToken] = useState(false);

  const reload = useCallback(async () => {
    const [h, r] = await Promise.all([getEmailIngressHealth(orgId), listSyncRuns(orgId, 12)]);
    setLoadError(h.error ?? r.error);
    setHealthError(h.error);
    setHealth(h.error ? null : h.data);
    setRuns(r.data);
    if (h.data.windowDays) setWindowDays(h.data.windowDays);
    if (h.data.scopeMode === "inbox" || h.data.scopeMode === "all_mail") setScopeMode(h.data.scopeMode);
    setLoading(false);
    return h.data;
  }, [orgId]);

  // The mailbox is read on open, not on a button press. An owner who arrives
  // here is already asking the question; making them press something first is
  // the console withholding the answer it has.
  //
  // RUN EVEN WITH NO GOOGLE CONNECTION. It used to return early on `!connected`,
  // and that one line dead-ended the only route left for the businesses this
  // screen exists for: with no check, there is no webhook in the report, so the
  // inbound-webhook card told the OWNER that "only an owner or admin can see
  // this business's webhook address" — two paragraphs after telling them to use
  // that webhook if their mail is not in Google at all. The server was always
  // willing: the check leg builds the webhook before it looks for a connection.
  useEffect(() => {
    let live = true;
    (async () => {
      const h = await reload();
      if (!live) return;
      setChecking(true);
      const { data, error } = await checkMailbox(orgId);
      if (!live) return;
      setChecking(false);
      setCheck(data);
      setCheckError(error);
      const suggested = suggestedProbeAddress(data?.liveMailbox || data?.mailbox || h.mailbox);
      if (suggested) setProbeAddr((cur) => cur || suggested);
    })();
    return () => { live = false; };
  }, [orgId, reload]);

  const verdict = useMemo(() => ingressVerdict(health), [health]);
  const googleBase = `/dashboard/businesses/${orgId}/ops/google`;

  async function recheck(address?: string) {
    const isProbe = Boolean(address);
    if (isProbe) setProbing(true); else setChecking(true);
    const { data, error } = await checkMailbox(orgId, address);
    if (isProbe) setProbing(false); else setChecking(false);
    // A transport failure must not wipe the facts already on screen — the owner
    // came here for them, and blanking the card is the console going quiet again.
    if (data) setCheck(data);
    setCheckError(error);
    if (error && !data) toastError(error);
  }

  async function syncNow() {
    setSyncing(true);
    const { data, error } = await runEmailSync(orgId);
    setSyncing(false);
    setReport(data);
    if (error) {
      toastError(error);
    } else if (data) {
      // A truthful sentence. "Synced 0 new message(s)" was the same answer for a
      // dead connection, a filtered mailbox and a quiet Tuesday.
      toast(
        data.listed === 0
          ? "Gmail matched no messages for what this sync asks for — see the result below."
          : `Checked ${data.listed} message${data.listed === 1 ? "" : "s"}: ${data.imported} new, ${data.alreadyHad} already here.`,
        data.imported > 0 ? "success" : "info",
      );
    }
    await reload();
  }

  async function saveSettingsNow() {
    setSavingSettings(true);
    const { ok, error } = await saveSyncSettings(orgId, windowDays, scopeMode);
    setSavingSettings(false);
    if (!ok) { toastError(error ?? "The settings could not be saved."); return; }
    toast("Saved. The next sync uses these settings.");
    await reload();
    await recheck(probeAddr.trim() || undefined);
  }

  if (loading) {
    return <div className="hrx-card hrx-pad text-center" style={{ color: "var(--hrx-muted)" }} role="status">Loading…</div>;
  }

  // Either source will do. When the settings read fails, the live check still
  // knows whether a Google account is linked — and using it beats telling a
  // connected business it has no mailbox because one RPC hiccupped.
  const connected = Boolean(health?.connected || check?.connected);
  const liveMailbox = check?.liveMailbox || health?.mailbox || "";
  const mismatch = Boolean(check?.liveMailbox && health?.mailbox && check.liveMailbox !== health.mailbox);
  const probe = check?.probe ?? null;
  const webhook = check?.webhook ?? null;
  /**
   * Owner or admin? The SERVER says so, in the check report.
   *
   * It used to be `!check || check.webhook !== null` — admin-ness inferred from
   * whether the webhook credentials came back. That fell open in one direction
   * and closed in the other: a check that had not returned yet, or failed at
   * transport, showed a plain member the admin-only buttons (which then rejected
   * them), while a genuine admin whose check never ran was told they were not
   * one. `canManage` is the membership role, and false until it is known.
   */
  const isAdmin = check?.canManage === true;
  /** True once the server has actually stated the role — which is what separates
   *  "you are not an admin" from "we could not ask". */
  const roleKnown = typeof check?.canManage === "boolean";

  /**
   * THE REASON THIS CHECK FAILED, wherever it came from.
   *
   * The check leg answers HTTP 200 with `{ ok:false, error:"…" }` by design, so
   * a transport failure and a refused connection arrive in different places and
   * both have to be shown. `tokenDetail` carries Google's own explanation of a
   * dead grant ("invalid_grant", a 403 with the Workspace policy text) and was
   * computed, transmitted and then rendered nowhere at all.
   */
  const failure = checkError ?? check?.error ?? null;
  const failureDetail = check && !check.ok && check.tokenDetail && check.tokenDetail !== failure ? check.tokenDetail : "";
  /** Gmail was actually reached and answered. Nothing may assert a fact about
   *  the contents of the mailbox unless this is true. */
  const reachedGmail = check?.ok === true;
  /**
   * The banner is computed from the RECORD of past runs; the check above just
   * asked Google. A grant revoked two minutes ago leaves a perfectly healthy run
   * history behind it, so the record would say "Working" in green directly above
   * the alert saying the connection is dead. When they disagree the live answer
   * wins and the record's verdict is not shown at all — one statement, not two.
   */
  const liveContradicts = Boolean(check?.connected && check.ok === false);

  /**
   * Two of these facts have two possible sources, and until the sync-history
   * table exists on a project only ONE of them knows. Reading whichever knows
   * beats printing "Unknown" beside a question the console can answer.
   */
  const canRenew: boolean | null =
    health && health.connected && !health.degraded ? health.hasRefreshToken : check?.connected ? check.hasRefreshToken : null;
  const watermarkOn: boolean | null =
    health && health.connected && !health.degraded ? health.autoReplyFrom !== null : check?.connected ? check.watermarkInstalled : null;
  const autoReplyFact = health && !health.degraded && health.autoReplyFrom
    ? `On, for mail after ${fmtDate(health.autoReplyFrom)}`
    : watermarkOn === null
      ? "Checking…"
      : watermarkOn
        ? "On"
        : "Held while Phoxta finishes setting this up";

  return (
    <div className="row g-3 emx">
      <style>{CSS}</style>

      {/* ── Is mail arriving, and from where? ──────────────────────────────── */}
      <div className="col-12">
        <Card
          title="Where your email comes from"
          right={
            <Chip tone={liveContradicts ? "danger" : healthError ? "line" : TONE_CHIP[verdict.tone]}>
              {liveContradicts ? "Not working" : healthError ? "Unknown" : verdict.label}
            </Chip>
          }
        >
          {loadError && <div className="emx-alert danger" role="alert">{loadError}</div>}

          {/* THE REASON, RENDERED. A dead connection used to produce one tile
              reading "Connection: Not working" and no cause anywhere in the
              product — the exact silence this screen exists to end. Google's own
              words (invalid_grant, a Workspace policy block, a 403 on a scope
              that was never granted) were computed, sent to the browser and
              then thrown away by both the reader and the screen. */}
          {failure && (
            <div className={`emx-alert ${connected ? "danger" : "warn"}`} role="alert">
              <b>{check ? failureHeadline(check.tokenState, connected) : "This mailbox could not be checked"}</b>
              {failure}
              {failureDetail ? ` ${failureDetail}` : ""}
              {connected ? "" : " The webhook address below cannot be shown until that succeeds."}
            </div>
          )}

          {/* Not shown when the read that produces it failed: the health module
              answers a failure with its empty value, and repeating that as
              "Email is not connected for this business" would be the console
              stating a conclusion it never reached. */}
          {!liveContradicts && !healthError && (
            <div className={`emx-alert ${verdict.tone}`} role="status">
              <b>{verdict.title}</b>
              {verdict.detail}
            </div>
          )}

          {connected ? (
            <>
              <div className="emx-who">
                <span className="dot" aria-hidden="true">✉️</span>
                <span style={{ minWidth: 0 }}>
                  <span className="a">{liveMailbox || "Your Google account"}</span>
                  <span className="b">
                    This is the only mailbox Phoxta reads. Mail sent anywhere else only arrives here if it is
                    delivered into this account&apos;s inbox.
                  </span>
                </span>
              </div>

              {mismatch && (
                <div className="emx-alert warn" role="alert">
                  <b>Two different accounts</b>
                  Phoxta has {health?.mailbox} on record, but Google says this connection belongs to {check?.liveMailbox}.
                  Disconnect and reconnect Google so the record matches.
                </div>
              )}

              <div className="emx-facts">
                <Fact k="Connection" v={check ? (check.ok ? "Working" : "Not working") : checking ? "Checking…" : "Not checked"} muted={!check} />
                <Fact
                  k="Can renew access"
                  v={canRenew === null ? "Checking…" : canRenew ? "Yes" : "No — reconnect needed"}
                  muted={canRenew === null}
                />
                <Fact k="Can send replies" v={check ? (check.canSend ? "Yes" : "No — reconnect Google") : "Checking…"} muted={!check} />
                <Fact k="Google permissions" v={check ? permissionWords(check.scope || health?.scope) : "Checking…"} muted={!check} />
                <Fact k="Automatic replies" v={autoReplyFact} muted={watermarkOn === null} />
                {/* `degraded` means the sync-history table is not there yet, so
                    these three numbers come from EMPTY_HEALTH's placeholders and
                    not from anything measured. Printing them would tell an owner
                    with a busy mailbox that it has never been checked and holds
                    no email — the most alarming possible reading of "we have not
                    applied a migration". Not-known is the honest word. */}
                <Fact
                  k="Last checked"
                  v={health?.degraded ? "Not recorded yet" : health?.lastRun ? relTime(health.lastRun.at) : "Never"}
                  muted={health?.degraded || !health?.lastRun}
                />
                <Fact
                  k="Each sync reads"
                  v={`${scopeMode === "inbox" ? "Inbox only" : "All mail except Spam and Trash"}, last ${windowDays} day${windowDays === 1 ? "" : "s"}`}
                />
                {/* Only from a check that actually reached Google. A number here
                    while the connection is dead would be a fact about a mailbox
                    nobody managed to open. */}
                {reachedGmail && <Fact k="Messages in this mailbox" v={Number(check.messagesTotal ?? 0).toLocaleString()} />}
                <Fact
                  k="Emails in the Inbox screen"
                  v={health?.degraded ? "Not known yet" : String(health?.emailConversations ?? 0)}
                  muted={health?.degraded}
                />
                <Fact
                  k="Newest email conversation"
                  v={health?.degraded ? "Not known yet" : health?.lastEmailAt ? relTime(health.lastEmailAt) : "None yet"}
                  muted={health?.degraded || !health?.lastEmailAt}
                />
              </div>

              {/* GATED ON HAVING ASKED. This sentence states a fact about the
                  contents of the mailbox, and `query` is set before the check
                  touches Google at all — so on a revoked grant it used to read
                  "…which matches 0 messages in this mailbox right now", and the
                  owner walked away believing nobody had emailed them. */}
              {reachedGmail && check.query && (
                <p className="emx-copy">
                  Every five minutes Phoxta asks Gmail for <strong>{check.query}</strong>, which matches{" "}
                  <strong>{check.matchedCapped ? `at least ${check.matched}` : check.matched}</strong> message
                  {check.matched === 1 ? "" : "s"} in this mailbox right now.
                </p>
              )}
              {check && !reachedGmail && check.query && (
                <p className="emx-copy">
                  When it is working, Phoxta asks Gmail for <strong>{check.query}</strong> every five minutes. It could
                  not ask this time, so nothing on this screen tells you whether mail is waiting in the mailbox —
                  fix the connection above first.
                </p>
              )}

              <div className="emx-actions">
                <button type="button" className="hrx-pill" disabled={checking} onClick={() => recheck(probeAddr.trim() || undefined)}>
                  {checking ? "Checking…" : "Check the connection"}
                </button>
                {isAdmin && (
                  <button type="button" className="hrx-pill primary" disabled={syncing} onClick={syncNow}>
                    {syncing ? "Syncing…" : "Sync now"}
                  </button>
                )}
                <Link to={`${googleBase}?tab=configure`} className="hrx-seeall">Manage the connection →</Link>
              </div>
              <p className="emx-hint">
                Checking the connection only reads your mailbox.{" "}
                {!roleKnown
                  ? ""
                  : isAdmin
                    ? "Sync now brings mail in — and if automatic replies are switched on, the agent may answer up to five of the new messages from this mailbox."
                    : `Pulling mail in by hand is for an owner or admin, and you are a ${roleWords(check?.role)} on this business — it happens automatically every five minutes anyway.`}
              </p>

              {report && (
                <div className="emx-nums" role="status">
                  <Num k="Gmail matched" v={report.listed} />
                  <Num k="New" v={report.imported} />
                  <Num k="Already here" v={report.alreadyHad} />
                  <Num k="Answered" v={report.replied} />
                  <Num k="Left for a person" v={report.skipped} />
                  <Num k="Not brought in" v={report.ignored} />
                  <Num k="Failed" v={report.failed} />
                </div>
              )}
              {report && Object.keys(report.reasons).length > 0 && (
                <ul className="emx-findings">
                  {Object.entries(report.reasons).map(([why, n]) => (
                    <li key={why}>{n} left for a person because {why}.</li>
                  ))}
                </ul>
              )}
              {/* A stumble over one message, said as a stumble. It is not an
                  error: the rest of the mail came in. */}
              {report?.warning && !report.error && (
                <div className="emx-alert warn mt-3" role="status">{report.warning}</div>
              )}
              {report?.error && <div className="emx-alert danger mt-3" role="alert">{report.error}</div>}
            </>
          ) : (
            <>
              <p className="emx-copy">
                Two routes bring customer email into this Inbox. <strong>Connect Google Workspace</strong> and Phoxta
                reads the connected mailbox every five minutes. Or point your existing mail provider at the{" "}
                <strong>inbound webhook</strong> below — use that one if your mail is not in Google at all.
              </p>
              <div className="emx-actions">
                <Link to={`${googleBase}?tab=configure`} className="hrx-pill primary">Connect Google Workspace</Link>
                <button type="button" className="hrx-pill" disabled={checking} onClick={() => recheck()}>
                  {checking ? "Checking…" : "Check again"}
                </button>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ── Alias or Google Group? ─────────────────────────────────────────── */}
      {connected && (
        <div className="col-12">
          <Card title="Addresses on this mailbox">
            <p className="emx-copy">
              These are the addresses <strong>{liveMailbox || "the connected account"}</strong> can send as — its own
              address and its aliases. Mail to any of them lands in this mailbox&apos;s inbox, where Phoxta will find
              it.
            </p>
            <p className="emx-copy">
              An address that is <strong>not</strong> in this list is something else — most often a{" "}
              <strong>Google Group</strong>. A group has its own archive that Phoxta cannot read; the only copy it can
              ever see is one delivered into a member&apos;s mailbox. If a role address of yours is missing here, either
              add this account to the group as a member with delivery on, make the address an alias of this account, or
              use the inbound webhook below.
            </p>
            {check?.aliasError && (
              <div className="emx-alert warn" role="alert">
                <b>The address list could not be read</b>
                {check.aliasError} Without it, Phoxta cannot tell an alias from a group here — use{" "}
                <strong>Where is my mail?</strong> below, which answers the same question from the mail itself.
              </div>
            )}
            {check?.aliases.length ? (
              <div className="d-flex flex-wrap gap-1">
                {check.aliases.map((a) => (
                  <Chip key={a.address} tone={a.isPrimary ? "blue" : a.verified ? "ok" : "warn"}>
                    {a.address}{a.isPrimary ? " · the account itself" : a.verified ? "" : " · unverified"}
                  </Chip>
                ))}
              </div>
            ) : check?.aliasError ? null : (
              // THIS IS THE SCREEN'S MOST DECISIVE SENTENCE — it is how an owner
              // tells an alias from a Google Group, which is the whole diagnosis.
              // So it must never be said unless Gmail actually answered. When the
              // grant is revoked, checkOrg returns before it ever asks for the
              // address list, leaving `aliases` empty and `aliasError` empty too:
              // saying "Gmail listed no addresses" there states as fact the
              // outcome of a question nobody got to ask, and points the owner at
              // a Google Group hunt when the real problem is a dead token.
              <p className="emx-copy" style={{ marginBottom: 0 }}>
                {checking
                  ? "Reading the mailbox…"
                  : reachedGmail
                    ? "Gmail listed no addresses for this account."
                    : "The addresses on this mailbox could not be read, because Gmail could not be reached — fix the connection above and check again. Until then this does not tell you whether hello@ is an alias or a Google Group."}
              </p>
            )}
          </Card>
        </div>
      )}

      {/* ── Where did a particular address's mail go? ──────────────────────── */}
      {connected && (
        <div className="col-12">
          <Card title="Where is my mail?">
            <p className="emx-copy">
              Type the address customers write to. Phoxta searches the connected mailbox for the last 30 days and says
              what it finds — including mail that a Gmail filter has archived or sent to a label, which the Inbox
              screen would never have shown you.
            </p>
            <form
              className="emx-row"
              onSubmit={(e) => { e.preventDefault(); if (probeAddr.trim()) recheck(probeAddr.trim()); }}
            >
              <label className="hrx-field">
                <span>Address to look for</span>
                <input
                  className="form-control"
                  type="email"
                  inputMode="email"
                  placeholder="hello@yourbusiness.com"
                  value={probeAddr}
                  onChange={(e) => setProbeAddr(e.target.value)}
                />
              </label>
              <button type="submit" className="hrx-pill dark" disabled={probing || !probeAddr.trim()} style={{ height: 42 }}>
                {probing ? "Looking…" : "Look for it"}
              </button>
            </form>

            {probe && (
              <>
                {probe.error ? (
                  <div className="emx-alert danger mt-3" role="alert">{probe.error}</div>
                ) : (
                  <>
                    <div className="emx-nums">
                      <Num k="Reached this mailbox" v={probe.totalCapped ? `${probe.total}+` : probe.total} />
                      <Num k="In the Inbox" v={probe.inInbox} />
                      <Num k="The sync would take" v={probe.wouldSync} />
                      <Num k="In Spam" v={probe.inSpam} />
                      <Num k="In Trash" v={probe.inTrash} />
                    </div>
                    <ul className="emx-findings">
                      {probe.findings.map((f) => <li key={f}>{f}</li>)}
                    </ul>
                    {probe.latest && (
                      <p className="emx-copy" style={{ marginTop: 14, marginBottom: 0 }}>
                        Most recent: <strong>{probe.latest.subject || "(no subject)"}</strong> from{" "}
                        {probe.latest.from || "an unknown sender"}, {probe.latest.date || "date unknown"}. Gmail has it
                        under <strong>{labelWords(probe.latest.labels)}</strong>
                        {probe.latest.deliveredTo ? <> and delivered it to <strong>{probe.latest.deliveredTo}</strong></> : null}.
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      {/* ── What each sync reads ───────────────────────────────────────────── */}
      {connected && (
        <div className="col-12">
          <Card title="What each sync reads">
            <p className="emx-copy">
              Mail older than the window is never seen — there is no catching up on it later. Widening what is read
              does <strong>not</strong> widen what the AI answers: anything already filed out of your inbox was dealt
              with by a person, and anything more than two days old is brought in for you rather than answered
              automatically.
            </p>
            <p className="emx-copy">
              Junk, deleted mail, your own drafts and your own sent mail are never brought in. Neither are newsletters,
              receipts and delivery notices that you had <em>already</em> filed away — those stay where you put them
              instead of opening a conversation in your Inbox. Machine mail still sitting in your inbox does come in,
              so nothing you can currently see in Gmail is hidden from you here.
            </p>

            <label className={`emx-choice${scopeMode === "all_mail" ? " on" : ""}`}>
              <input type="radio" name="emx-scope" checked={scopeMode === "all_mail"} onChange={() => setScopeMode("all_mail")} />
              <span>
                <span className="t">All mail except Spam and Trash</span>
                <span className="d">
                  Includes mail your Gmail filters archived or sent straight to a label — the usual fate of mail to a
                  role address, and the usual reason an enquiry never appears here. Recommended.
                </span>
              </span>
            </label>
            <label className={`emx-choice${scopeMode === "inbox" ? " on" : ""}`}>
              <input type="radio" name="emx-scope" checked={scopeMode === "inbox"} onChange={() => setScopeMode("inbox")} />
              <span>
                <span className="t">Only mail still in the Inbox</span>
                <span className="d">
                  Anything a filter archives or labels is skipped. Choose this if you deliberately file mail away from
                  your inbox and do not want it in the console.
                </span>
              </span>
            </label>

            <label className="hrx-field" style={{ maxWidth: 260, marginTop: 14 }}>
              <span>How far back each sync looks</span>
              <select
                className="form-select"
                value={windowDays}
                onChange={(e) => setWindowDays(Number(e.target.value))}
              >
                {[1, 2, 3, 7, 14, 30].map((d) => (
                  <option key={d} value={d}>{d} day{d === 1 ? "" : "s"}</option>
                ))}
              </select>
            </label>

            {isAdmin ? (
              <button type="button" className="hrx-pill dark" disabled={savingSettings} onClick={saveSettingsNow}>
                {savingSettings ? "Saving…" : "Save"}
              </button>
            ) : (
              <p className="emx-hint" style={{ marginTop: 0 }}>Only an owner or admin can change these.</p>
            )}
          </Card>
        </div>
      )}

      {/* ── The record: every run, per business ────────────────────────────── */}
      <div className="col-12">
        <Card title="Recent checks">
          {runs.length === 0 ? (
            // "Empty" and "cannot be read" are different facts and only one of
            // them accuses the worker of being down. listSyncRuns deliberately
            // swallows the not-yet-migrated error so it is not shown as a
            // failure — which means an absent table arrives here looking exactly
            // like a silent scheduler, and would send an owner to debug a cron
            // job that is running perfectly.
            health?.degraded ? (
              <Empty title="Not recording checks yet" icon={<span aria-hidden="true">🕑</span>}>
                The place these are stored has not been set up on this
                installation yet, so there is nothing to show — and nothing here
                tells you whether the automatic checks are running. Everything
                else on this screen is read live from Google and is accurate.
              </Empty>
            ) : (
              <Empty title="No checks recorded yet" icon={<span aria-hidden="true">🕑</span>}>
                Every automatic check of your mailbox is logged here with what it asked Gmail for and what came back. If
                this stays empty while Google is connected, the five-minute worker is not running.
              </Empty>
            )
          ) : (
            <div className="emx-scroll">
              <table className="emx-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>How</th>
                    <th>Gmail matched</th>
                    <th>New</th>
                    <th>Already here</th>
                    <th>Answered</th>
                    <th>Result</th>
                    <th>Why nothing was answered</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r, i) => {
                    const why = runReasons(r);
                    return (
                      <tr key={`${r.at}-${i}`}>
                        <td title={fmtDate(r.at)}>{relTime(r.at)}</td>
                        <td>{r.trigger === "manual" ? "You" : "Automatic"}</td>
                        <td className="n">{r.listed}</td>
                        <td className="n">{r.imported}</td>
                        <td className="n">{r.alreadyHad}</td>
                        <td className="n">{r.replied}</td>
                        <td>
                          {r.ok ? (
                            <>
                              {r.listed === 0 ? "Nothing matched" : "OK"}
                              {r.warning && <div className="warn">{r.warning}</div>}
                            </>
                          ) : (
                            <span className="err">{r.error || "Failed"}</span>
                          )}
                        </td>
                        {/* Parsed since this screen was written, rendered
                            nowhere — so a business whose entire inbound flow is
                            group mail recorded the one fact that explains its
                            silence on every single run, and could only ever see
                            it in a report block that vanished on reload. */}
                        <td className="why" title={why.map((x) => `${x.count} × ${x.why}`).join("\n")}>
                          {why.length === 0
                            ? "—"
                            : why.slice(0, 2).map((x) => `${x.count} × ${x.why}`).join("; ") +
                              (why.length > 2 ? ` (+${why.length - 2} more)` : "")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {runs[0] && runReasons(runs[0]).length > 0 && (
            <div className="emx-why">
              <span className="h">
                On the most recent check ({relTime(runs[0].at)}), nothing was answered automatically because:
              </span>
              <ul>
                {runReasons(runs[0]).map((x) => (
                  <li key={x.why}>{x.count} × {x.why}</li>
                ))}
              </ul>
            </div>
          )}
          {runs[0]?.query && (
            <p className="emx-hint">Most recent search: <code>{runs[0].query}</code></p>
          )}
        </Card>
      </div>

      {/* ── The other route ────────────────────────────────────────────────── */}
      <div className="col-12">
        <Card title="If your mail is not in Gmail">
          <p className="emx-copy">
            Phoxta can also receive email straight from your mail provider, with no Google account involved. Use this
            when your business mail is hosted elsewhere, or when the address customers write to is a{" "}
            <strong>Google Group</strong> whose archive Gmail will not let Phoxta read.
          </p>
          <p className="emx-copy">
            In your provider&apos;s dashboard, find <strong>inbound parse</strong> (Resend, Postmark and SendGrid all
            call it something close to that; Cloudflare calls it Email Routing) and point it at this address. Mail
            posted here lands in the same Inbox as everything else and reaches the same AI agent.
          </p>

          {/* Three different reasons there is no address here, and they used to
              be one sentence — the wrong one. With no Google connection the
              check never ran at all, so an OWNER reading "point your provider at
              the webhook below" was then told only an admin may see it. */}
          {!webhook && checking ? (
            <p className="emx-copy" style={{ marginBottom: 0 }}>Reading this business&apos;s webhook address…</p>
          ) : !webhook && !roleKnown ? (
            <>
              <p className="emx-copy">
                This business&apos;s webhook address could not be read just now{failure ? `: ${failure}` : "."}
              </p>
              <button type="button" className="hrx-pill" disabled={checking} onClick={() => recheck()}>
                Try again
              </button>
            </>
          ) : !webhook ? (
            <p className="emx-copy" style={{ marginBottom: 0 }}>
              Only an owner or admin can see this business&apos;s webhook address, because it contains a key — and you
              are a {roleWords(check?.role)} here. Ask an owner or admin to set this up, or to send you the address.
            </p>
          ) : !webhook.configured ? (
            <div className="emx-alert warn" role="alert">
              <b>Not available yet</b>
              {webhook.publicKey
                ? "Inbound email is not configured on this Phoxta deployment (INBOUND_WEBHOOK_SECRET is not set). Ask your Phoxta administrator to set it, then reload this page."
                : "This business has no AI agent key yet. Open Engage → Agent to set the agent up, then come back."}
            </div>
          ) : (
            <>
              <code className="emx-code">
                {showToken ? webhook.url : webhook.url.replace(/token=[^&]+/, "token=••••••••••••••••")}
              </code>
              <div className="emx-actions">
                <button
                  type="button"
                  className="hrx-pill primary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(webhook.url);
                      toast("Webhook address copied.");
                    } catch {
                      setShowToken(true);
                      toastError("Copying is blocked in this browser — the full address is now shown, select it by hand.");
                    }
                  }}
                >
                  Copy the full address
                </button>
                <button type="button" className="hrx-pill" onClick={() => setShowToken((v) => !v)}>
                  {showToken ? "Hide the key" : "Show the key"}
                </button>
              </div>
              <p className="emx-hint">
                Treat this like a password: anyone holding it can post email into this business&apos;s Inbox. It works
                only for this business, and it changes if Phoxta rotates its inbound secret.
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
