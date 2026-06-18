import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getGoogleConnection, driveList, calendarList, calendarCreate, docsCreate, type DriveFile, type CalEvent } from "@/lib/db/ops/google";
import type { OpsContext } from "@/layouts/OperatingLayout";

const fileKind = (mime: string) =>
  mime.includes("document") ? "Doc" : mime.includes("spreadsheet") ? "Sheet" : mime.includes("presentation") ? "Slides" : mime.includes("folder") ? "Folder" : mime.includes("pdf") ? "PDF" : "File";

export default function WorkspacePage() {
  const { orgId } = useOutletContext<OpsContext>();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showEvent, setShowEvent] = useState(false);
  const [evForm, setEvForm] = useState({ summary: "", start: "", end: "" });

  async function newDoc() {
    const title = window.prompt("Document title");
    if (!title) return;
    setBusy(true);
    const { ok, link, error } = await docsCreate(orgId, { title });
    setBusy(false);
    if (!ok || error) { setNotice(error ?? "Couldn't create the doc."); return; }
    if (link) window.open(link, "_blank");
    setNotice("Doc created.");
    loadDrive(q);
  }
  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!evForm.summary || !evForm.start) return;
    setBusy(true);
    setNotice(null);
    const { ok, error } = await calendarCreate(orgId, {
      summary: evForm.summary,
      start: new Date(evForm.start).toISOString(),
      end: new Date(evForm.end || evForm.start).toISOString(),
    });
    setBusy(false);
    if (!ok || error) { setNotice(error ?? "Couldn't create the event."); return; }
    setShowEvent(false);
    setEvForm({ summary: "", start: "", end: "" });
    const { data: ev } = await calendarList(orgId);
    setEvents(ev);
    setNotice("Event created.");
  }

  async function loadDrive(query = "") {
    const { data, error } = await driveList(orgId, query);
    if (error) setError(error);
    setFiles(data);
  }
  useEffect(() => {
    getGoogleConnection(orgId).then(async ({ data }) => {
      setConnected(!!data);
      if (data) {
        await loadDrive();
        const { data: ev, error } = await calendarList(orgId);
        if (error) setError(error);
        setEvents(ev);
      }
      setLoading(false);
    });
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (connected === false) {
    return (
      <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center">
        <h6 className="fw-600 mb-2">Connect Google Workspace</h6>
        <p className="neutral-500 fz-font-md mb-0">Connect your Google account in the <strong>Configure</strong> tab to see your Drive files and Calendar here.</p>
      </div>
    );
  }
  if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;

  return (
    <div className="row g-4">
      {error && <div className="col-12"><div className="alert alert-warning py-2 px-3 fz-font-md mb-0">{error}</div></div>}
      {notice && <div className="col-12"><div className="alert alert-info py-2 px-3 fz-font-sm mb-0">{notice}</div></div>}

      <div className="col-lg-7">
        <div className="d-flex align-items-center justify-content-between mb-3 gap-2">
          <h6 className="fw-600 mb-0">Drive</h6>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3 text-nowrap" onClick={newDoc} disabled={busy}>＋ Doc</button>
            <form className="d-flex gap-2" onSubmit={(e) => { e.preventDefault(); loadDrive(q); }}>
              <input className="form-control form-control-sm rounded-3" placeholder="Search Drive…" value={q} onChange={(e) => setQ(e.target.value)} />
              <button className="btn btn-dark btn-sm rounded-3 px-3" type="submit">Search</button>
            </form>
          </div>
        </div>
        {files.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No files.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {files.map((f) => (
              <a key={f.id} href={f.webViewLink} target="_blank" rel="noreferrer" className="bg-neutral-0 rounded-4 p-3 border-100 d-flex align-items-center justify-content-between gap-2 text-decoration-none">
                <div className="d-flex align-items-center gap-2 text-truncate">
                  <span className="badge bg-neutral-100 neutral-700 fw-500">{fileKind(f.mimeType)}</span>
                  <span className="fw-500 neutral-900 text-truncate">{f.name}</span>
                </div>
                <span className="fz-font-sm neutral-400 text-nowrap">{f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : ""}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="col-lg-5">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="fw-600 mb-0">Upcoming calendar</h6>
          <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={() => setShowEvent((v) => !v)}>＋ Event</button>
        </div>
        {showEvent && (
          <form onSubmit={createEvent} className="bg-neutral-0 rounded-4 p-3 border-100 mb-2 d-flex flex-column gap-2">
            <input className="form-control form-control-sm rounded-3" placeholder="Event title" value={evForm.summary} onChange={(e) => setEvForm({ ...evForm, summary: e.target.value })} required />
            <label className="fz-font-sm neutral-500 mb-0">Start<input type="datetime-local" className="form-control form-control-sm rounded-3" value={evForm.start} onChange={(e) => setEvForm({ ...evForm, start: e.target.value })} required /></label>
            <label className="fz-font-sm neutral-500 mb-0">End<input type="datetime-local" className="form-control form-control-sm rounded-3" value={evForm.end} onChange={(e) => setEvForm({ ...evForm, end: e.target.value })} /></label>
            <button type="submit" className="btn btn-dark btn-sm rounded-pill px-3" disabled={busy}>{busy ? "Creating…" : "Create event"}</button>
          </form>
        )}
        {events.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">Nothing upcoming.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {events.map((e) => (
              <a key={e.id} href={e.link} target="_blank" rel="noreferrer" className="bg-neutral-0 rounded-4 p-3 border-100 text-decoration-none d-block">
                <div className="fw-600 neutral-900">{e.summary}</div>
                <div className="fz-font-sm neutral-500">{e.start ? new Date(e.start).toLocaleString() : ""}{e.location ? ` · ${e.location}` : ""}</div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
