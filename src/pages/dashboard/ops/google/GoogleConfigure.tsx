import { useEffect, useState } from "react";
import { getGoogleConnection, startGoogleConnect, disconnectGoogle, listWorkspaceEmails, provisionEmails, type GoogleConnection, type WsGroup } from "@/lib/db/ops/google";

export default function GoogleConfigure({ orgId }: { orgId: string }) {
  const [conn, setConn] = useState<GoogleConnection | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [groups, setGroups] = useState<WsGroup[]>([]);
  const [provBusy, setProvBusy] = useState(false);
  const [provMsg, setProvMsg] = useState<string | null>(null);

  useEffect(() => {
    getGoogleConnection(orgId).then(({ data }) => setConn(data));
    const q = new URLSearchParams(window.location.search).get("google");
    if (q === "connected") setMsg("Google Workspace connected.");
    else if (q === "error") setMsg("Google connection failed — please try again.");
    if (q) window.history.replaceState({}, "", window.location.pathname);
  }, [orgId]);
  useEffect(() => {
    if (conn) listWorkspaceEmails(orgId).then(({ data }) => setGroups(data));
  }, [conn, orgId]);

  async function connect() {
    setBusy(true);
    const { error } = await startGoogleConnect(orgId);
    if (error) { setBusy(false); setMsg(error); }
  }
  async function unlink() {
    setBusy(true);
    await disconnectGoogle(orgId);
    setConn(null);
    setGroups([]);
    setBusy(false);
    setMsg("Disconnected.");
  }
  async function provision() {
    setProvBusy(true);
    setProvMsg(null);
    const { data, error } = await provisionEmails(orgId);
    setProvBusy(false);
    if (error) { setProvMsg(error); return; }
    const created = (data?.results ?? []).filter((r) => r.created).length;
    setProvMsg(`Done — ${created} new address(es) created, forwarding to ${data?.forwardTo}.`);
    listWorkspaceEmails(orgId).then(({ data: g }) => setGroups(g));
  }

  return (
    <div className="row g-4" style={{ maxWidth: 720 }}>
      <div className="col-12">
        <div className="bg-neutral-0 rounded-4 p-4 border-100">
          <h6 className="fw-600 mb-2">Connection</h6>
          {msg && <div className="alert alert-info py-1 px-2 fz-font-sm mb-2">{msg}</div>}
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
            {provMsg && <div className="alert alert-info py-1 px-2 fz-font-sm mb-2">{provMsg}</div>}
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
