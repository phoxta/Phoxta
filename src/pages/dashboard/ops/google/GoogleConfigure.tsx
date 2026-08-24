import { useEffect, useState } from "react";
import { confirmDanger, reportMutation, toast, toastError } from "@/lib/ops/feedback";
import { getGoogleConnection, startGoogleConnect, disconnectGoogle, listWorkspaceEmails, provisionEmails, type GoogleConnection, type WsGroup } from "@/lib/db/ops/google";
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
`;

export default function GoogleConfigure({ orgId }: { orgId: string }) {
  const [conn, setConn] = useState<GoogleConnection | null>(null);
  const [busy, setBusy] = useState(false);
  // Persistent, in-place error for the connection read — a toast would be gone
  // by the time the owner wonders why the card looks disconnected.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [groups, setGroups] = useState<WsGroup[]>([]);
  const [provBusy, setProvBusy] = useState(false);

  useEffect(() => {
    getGoogleConnection(orgId).then(({ data, error }) => {
      setLoadError(error ?? null);
      setConn(data);
    });
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
    if (ok) { setConn(null); setGroups([]); }
  }
  async function provision() {
    setProvBusy(true);
    const { data, error } = await provisionEmails(orgId);
    setProvBusy(false);
    if (error) { toastError(error); return; }
    const created = (data?.results ?? []).filter((r) => r.created).length;
    toast(`Done — ${created} new address(es) created, forwarding to ${data?.forwardTo}.`);
    listWorkspaceEmails(orgId).then(({ data: g }) => setGroups(g));
  }

  return (
    <div className="row g-3 ggx-config" style={{ maxWidth: 720 }}>
      <style>{CSS}</style>
      <div className="col-12">
        <Card title="Connection" right={conn ? <Chip tone="ok">Connected</Chip> : <Chip tone="line">Not connected</Chip>}>
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
