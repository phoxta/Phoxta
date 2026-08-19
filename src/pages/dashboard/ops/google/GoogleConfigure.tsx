import { useEffect, useState } from "react";
import { confirmDanger, reportMutation, toast, toastError } from "@/lib/ops/feedback";
import { getGoogleConnection, startGoogleConnect, disconnectGoogle, listWorkspaceEmails, provisionEmails, type GoogleConnection, type WsGroup } from "@/lib/db/ops/google";

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
    <div className="row g-4" style={{ maxWidth: 720 }}>
      <div className="col-12">
        <div className="bg-neutral-0 rounded-4 p-4 border-100">
          <h6 className="fw-600 mb-2">Connection</h6>
          {loadError && <div className="alert alert-danger py-2 px-3 fz-font-sm mb-2" role="alert">{loadError}</div>}
          {conn ? (
            <>
              <p className="fz-font-sm neutral-700 mb-2">Connected as <strong>{conn.email || "your Google account"}</strong> — Gmail, Drive, Docs, Sheets &amp; Calendar are available.</p>
              <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={unlink} disabled={busy}>Disconnect</button>
            </>
          ) : (
            <>
              <p className="fz-font-sm neutral-500 mb-2">Connect your Google Workspace to bring Gmail, Drive, Docs, Sheets and Calendar into Phoxta, and to manage business email addresses.</p>
              <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={connect} disabled={busy}>{busy ? "…" : "Connect Google Workspace"}</button>
            </>
          )}
        </div>
      </div>

      {conn && (
        <div className="col-12">
          <div className="bg-neutral-0 rounded-4 p-4 border-100">
            <h6 className="fw-600 mb-2">Business email addresses</h6>
            <p className="fz-font-sm neutral-500 mb-2">Create the essential role addresses (hello@, info@, support@, sales@, billing@, contact@) as Google Groups that forward to you and accept customer email.</p>
            {groups.length > 0 && (
              <div className="d-flex flex-wrap gap-1 mb-2">
                {groups.map((g) => <span key={g.email} className="badge bg-neutral-100 neutral-700 fw-500">{g.email}</span>)}
              </div>
            )}
            <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={provision} disabled={provBusy}>{provBusy ? "Creating…" : "Create essential addresses"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
