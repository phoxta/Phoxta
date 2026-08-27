import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { confirmDanger, reportMutation, toast, toastError } from "@/lib/ops/feedback";
import { getGoogleConnection, startGoogleConnect, disconnectGoogle, listWorkspaceEmails, provisionEmails, type GoogleConnection, type WsGroup } from "@/lib/db/ops/google";
import { getEmailIngressHealth, ingressVerdict, type EmailIngressHealth } from "@/lib/db/ops/emailHealth";
import { Card, Chip } from "@/components/dash/Ui";

const CSS = `
.ggx-config .hrx-pill:disabled { opacity: 0.55; cursor: not-allowed; }
.ggx-alert { background: #fdeaea; color: #dc2626; border: 1px solid #f6c9c9; border-radius: 12px; padding: 10px 14px; font-size: 14px; margin-bottom: 12px; }
.ggx-copy { font-size: 14px; color: var(--hrx-muted); margin: 0 0 14px; max-width: 60ch; }
.ggx-copy strong { color: var(--hrx-ink); }
.ggx-conn { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.ggx-conn .dot {
  width: 44px; height: 44px; border-radius: 999px; flex-shrink: 0; font-size: 20px;
  display: inline-flex; align-items: center; justify-content: center;
  background: #e8effc; border: 1px solid #d4e2fb;
}
.ggx-conn .who { min-width: 0; }
.ggx-conn .who .a { font-size: 15px; font-weight: 600; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ggx-conn .who .b { font-size: 13px; color: var(--hrx-muted); display: block; margin-top: 1px; }
.ggx-state { border-radius: 12px; padding: 11px 13px; font-size: 13.5px; line-height: 1.55; margin-bottom: 14px; }
.ggx-state b { display: block; font-weight: 600; margin-bottom: 2px; }
.ggx-state.ok { background: #ecfdf5; color: #065f46; border: 1px solid #b7e4cd; }
.ggx-state.warn { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; }
.ggx-state.danger { background: #fdeaea; color: #b91c1c; border: 1px solid #f6c9c9; }
.ggx-state a { color: inherit; font-weight: 600; }
`;

const TONE_CHIP: Record<string, "ok" | "warn" | "danger"> = { ok: "ok", warn: "warn", danger: "danger" };

export default function GoogleConfigure({ orgId }: { orgId: string }) {
  const [conn, setConn] = useState<GoogleConnection | null>(null);
  /** The chip used to be `conn ? "Connected" : "Not connected"` — driven purely
   *  by a row EXISTING. A revoked grant, an expired refresh token and a mailbox
   *  nobody has ever synced all rendered as a green "Connected" forever, which
   *  is precisely the false reassurance an owner acts on when their mail is not
   *  arriving. This is the real state. */
  const [health, setHealth] = useState<EmailIngressHealth | null>(null);
  const [busy, setBusy] = useState(false);
  // Persistent, in-place error for the connection read — a toast would be gone
  // by the time the owner wonders why the card looks disconnected.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [groups, setGroups] = useState<WsGroup[]>([]);
  const [provBusy, setProvBusy] = useState(false);
  /** Addresses whose GROUP EXISTS but will not deliver to the connected mailbox
   *  — i.e. addresses whose mail can never reach the Inbox. Kept on the page
   *  rather than in a toast, because it is a job left half-done. */
  const [provNote, setProvNote] = useState<string[]>([]);
  /** Addresses Google refused to create at all. A different problem with a
   *  different remedy: mail to these bounces rather than piling up in a group
   *  archive, and there is no membership to fix because there is no group. */
  const [provFailed, setProvFailed] = useState<string[]>([]);

  useEffect(() => {
    getGoogleConnection(orgId).then(({ data, error }) => {
      setLoadError(error ?? null);
      setConn(data);
    });
    // On a failed read health stays null, so the card shows "Checking…" rather
    // than the health module's empty value — which reads as "not connected" and
    // would paint a red banner over a connection that is fine.
    getEmailIngressHealth(orgId).then(({ data, error }) => setHealth(error ? null : data));
    const q = new URLSearchParams(window.location.search).get("google");
    if (q === "connected") toast("Google Workspace connected.");
    else if (q === "error") toastError("Google connection failed — please try again.");
    if (q) window.history.replaceState({}, "", window.location.pathname);
  }, [orgId]);
  useEffect(() => {
    if (conn) listWorkspaceEmails(orgId).then(({ data }) => setGroups(data));
  }, [conn, orgId]);

  async function connect() {
    setBusy(true);
    const { error } = await startGoogleConnect(orgId);
    if (error) { setBusy(false); toastError(error); }
  }
  async function unlink() {
    if (!confirmDanger("Disconnect Google Workspace? Gmail, Calendar and Drive will stop syncing into this console.")) return;
    setBusy(true);
    const ok = await reportMutation(disconnectGoogle(orgId), "Google Workspace disconnected.");
    setBusy(false);
    // Only clear the card when the server actually dropped the link.
    if (ok) {
      setConn(null);
      setGroups([]);
      getEmailIngressHealth(orgId).then(({ data, error }) => setHealth(error ? null : data));
    }
  }
  async function provision() {
    setProvBusy(true);
    const { data, error } = await provisionEmails(orgId);
    setProvBusy(false);
    if (error) { toastError(error); return; }
    const results = data?.results ?? [];
    const created = results.filter((r) => r.created).length;
    // The step that actually matters is the delivery, not the creation. An
    // address whose group exists without delivery to the connected mailbox
    // collects mail in an archive Phoxta cannot read — and this used to report
    // "Done" regardless, which is one of the ways mail to hello@ goes missing.
    //
    // The two failures are separated because their remedies are opposite. A
    // group that could not be CREATED does not exist, so its mail bounces at
    // Google; sending that owner to fix the membership of a group that was never
    // made is worse than saying nothing. `!r.forwarded` alone put both in the
    // panel headed "Created, but not delivering".
    const notMade = results.filter((r) => !r.created && !r.exists);
    const notDelivering = results.filter((r) => (r.created || r.exists) && !r.forwarded);
    setProvFailed(notMade.map((r) => `${r.email}: ${r.note || "Google would not create it"}`));
    setProvNote(notDelivering.map((r) => `${r.email}: ${r.note || "delivery could not be set up"}`));
    if (notMade.length || notDelivering.length) {
      toastError(
        `${notMade.length + notDelivering.length} address(es) are not ready to receive customer mail — see the details below.`,
      );
    } else {
      toast(`Done — ${created} new address(es) created, all delivering to ${data?.forwardTo}.`);
    }
    listWorkspaceEmails(orgId).then(({ data: g }) => setGroups(g));
  }

  const verdict = health ? ingressVerdict(health) : null;
  const emailTab = `/dashboard/businesses/${orgId}/ops/google?tab=email`;

  return (
    <div className="row g-3 ggx-config" style={{ maxWidth: 720 }}>
      <style>{CSS}</style>
      <div className="col-12">
        <Card
          title="Connection"
          right={
            conn
              ? <Chip tone={verdict ? TONE_CHIP[verdict.tone] : "line"}>{verdict ? verdict.label : "Checking…"}</Chip>
              : <Chip tone="line">Not connected</Chip>
          }
        >
          {loadError && <div className="ggx-alert" role="alert">{loadError}</div>}
          {conn ? (
            <>
              <div className="ggx-conn">
                <span className="dot" aria-hidden="true">🔗</span>
                <span className="who">
                  <span className="a">{conn.email || "Your Google account"}</span>
                  <span className="b">Gmail, Drive, Docs, Sheets &amp; Calendar are available.</span>
                </span>
              </div>
              {/* THE VERDICT'S OWN WORDS, whatever they are.
                  The "ok" case used to discard them and substitute a hardcoded
                  "Mail is arriving — this mailbox was last checked 2 minutes
                  ago." For the mailbox that started all this — every check
                  succeeding, every check matching nothing, not one email
                  conversation ever — that sentence was simply false, and it was
                  the same false reassurance as the green "Connected" chip this
                  card set out to replace. One block, one source of truth. */}
              {verdict && (
                <div className={`ggx-state ${verdict.tone}`} role="status">
                  <b>{verdict.title}</b>
                  {verdict.detail}{" "}
                  <Link to={emailTab}>See email delivery →</Link>
                </div>
              )}
              <button type="button" className="hrx-pill" onClick={unlink} disabled={busy}>Disconnect</button>
            </>
          ) : (
            <>
              <p className="ggx-copy">Connect your Google Workspace to bring Gmail, Drive, Docs, Sheets and Calendar into Phoxta, and to manage business email addresses.</p>
              <button type="button" className="hrx-pill primary" onClick={connect} disabled={busy}>{busy ? "…" : "Connect Google Workspace"}</button>
            </>
          )}
        </Card>
      </div>

      {conn && (
        <div className="col-12">
          <Card title="Business email addresses">
            <p className="ggx-copy">Create the essential role addresses (hello@, info@, support@, sales@, billing@, contact@) as Google Groups that forward to you and accept customer email.</p>
            {/* Said plainly, because this is the single commonest reason mail to
                a role address never reaches the Inbox. A Google Group is not a
                mailbox: Phoxta reads the connected account, so it only ever sees
                the copy the group delivers to that account as a member. If the
                member was removed, or the group predates Phoxta, the mail is
                unreachable — and the console used to say nothing at all. */}
            <p className="ggx-copy">
              <strong>These are groups, not mailboxes.</strong> Phoxta reads <strong>{conn.email || "the connected account"}</strong> only, so a
              group&apos;s mail reaches the Inbox via the copy delivered to that account as a member. If mail to one of
              these addresses is not showing up,{" "}
              <Link to={emailTab}>check email delivery</Link> — it will tell you exactly where that mail went.
            </p>
            {provFailed.length > 0 && (
              <div className="ggx-state danger" role="alert">
                <b>Could not be created</b>
                These addresses do not exist at Google, so mail sent to them bounces straight back to the sender. The
                usual cause is that {conn.email || "the connected account"} is not an administrator of this Google
                Workspace — ask an administrator to connect Google here, or to create the addresses for you.
                <ul className="mb-0 mt-1 ps-3">
                  {provFailed.map((n) => <li key={n}>{n}</li>)}
                </ul>
              </div>
            )}
            {provNote.length > 0 && (
              <div className="ggx-state danger" role="alert">
                <b>Created, but not delivering</b>
                These groups exist, but they do not deliver a copy to {conn.email || "the connected account"} — so their
                mail sits in a Google Group archive that Phoxta cannot read, and no customer who writes to them reaches
                your Inbox. Add {conn.email || "the connected account"} to each group as a member with mail delivery
                switched on:
                <ul className="mb-0 mt-1 ps-3">
                  {provNote.map((n) => <li key={n}>{n}</li>)}
                </ul>
              </div>
            )}
            {groups.length > 0 && (
              <div className="d-flex flex-wrap gap-1 mb-3">
                {groups.map((g) => <Chip key={g.email} tone="blue">{g.email}</Chip>)}
              </div>
            )}
            <button type="button" className="hrx-pill dark" onClick={provision} disabled={provBusy}>{provBusy ? "Creating…" : "Create essential addresses"}</button>
          </Card>
        </div>
      )}
    </div>
  );
}
