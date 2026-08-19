import { useEffect, useState } from "react";
import { driveList, docsCreate, type DriveFile } from "@/lib/db/ops/google";

const kind = (mime: string) =>
  mime.includes("document") ? "Doc" : mime.includes("spreadsheet") ? "Sheet" : mime.includes("presentation") ? "Slides" : mime.includes("folder") ? "Folder" : mime.includes("pdf") ? "PDF" : mime.includes("image") ? "Image" : "File";

export default function DriveApp({ orgId }: { orgId: string }) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Inline "new doc" row instead of a native window.prompt — usable on a phone.
  const [newTitle, setNewTitle] = useState<string | null>(null);

  async function load(query = "") {
    setLoading(true);
    const { data, error } = await driveList(orgId, { q: query });
    setError(error ?? null);
    setFiles(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function newDoc(e: React.FormEvent) {
    e.preventDefault();
    const title = (newTitle ?? "").trim();
    if (!title) return;
    setBusy(true);
    setNotice(null);
    const { ok, link, error } = await docsCreate(orgId, { title });
    setBusy(false);
    if (!ok || error) { setNotice(error ?? "Couldn't create the doc."); return; }
    setNewTitle(null);
    setNotice(`Created “${title}”.`);
    if (link) window.open(link, "_blank");
    load(q);
  }

  return (
    <div>
      {error && <div className="alert alert-warning py-2 px-3 fz-font-md mb-3" role="alert">{error}</div>}
      {notice && <div className="alert alert-info py-2 px-3 fz-font-sm mb-3" role="status">{notice}</div>}

      <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center justify-content-between gap-2 mb-3">
        <form className="d-flex gap-2 flex-grow-1" onSubmit={(e) => { e.preventDefault(); load(q); }} style={{ maxWidth: 420 }}>
          <label className="visually-hidden" htmlFor="drive-search">Search Drive</label>
          <input id="drive-search" type="search" className="form-control form-control-sm rounded-3" style={{ minWidth: 0 }} placeholder="Search Drive…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-dark btn-sm rounded-3 px-3 flex-shrink-0 ops-tap" type="submit">Search</button>
        </form>
        <button
          type="button"
          className="btn btn-outline-dark btn-sm rounded-pill px-3 text-nowrap ops-tap justify-content-center"
          onClick={() => setNewTitle((t) => (t === null ? "" : null))}
          aria-expanded={newTitle !== null}
        >
          <span aria-hidden="true">＋ </span>New Doc
        </button>
      </div>

      {newTitle !== null && (
        <form onSubmit={newDoc} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <label className="fz-font-sm fw-500 neutral-500 mb-1 d-block" htmlFor="drive-new-title">Document title</label>
          <div className="d-flex flex-wrap gap-2">
            <input id="drive-new-title" className="form-control rounded-3" style={{ flex: "1 1 200px", minWidth: 0 }} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus />
            <button className="btn btn-dark rounded-3 px-4 ops-tap justify-content-center" type="submit" disabled={busy || !newTitle.trim()}>{busy ? "Creating…" : "Create"}</button>
            <button className="btn btn-link btn-sm p-0 px-2 neutral-500 text-decoration-none ops-tap" type="button" onClick={() => setNewTitle(null)}>Cancel</button>
          </div>
          <p className="fz-font-sm neutral-500 mt-2 mb-0">The new doc opens in a new tab.</p>
        </form>
      )}

      {loading ? (
        <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500" role="status">Loading…</div>
      ) : files.length === 0 ? (
        <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500 fz-font-md">{q.trim() ? "No files match that search." : "No files yet."}</div>
      ) : (
        <ul className="list-unstyled m-0 d-flex flex-column gap-2">
          {files.map((f) => (
            <li key={f.id}>
              <a href={f.webViewLink} target="_blank" rel="noreferrer" className="bg-neutral-0 rounded-4 p-3 border-100 d-flex align-items-center justify-content-between gap-2 text-decoration-none">
                <span className="d-flex align-items-center gap-2 text-truncate">
                  <span className="badge bg-neutral-100 neutral-700 fw-500 flex-shrink-0">{kind(f.mimeType)}</span>
                  <span className="fw-500 neutral-900 text-truncate">{f.name}<span className="visually-hidden"> (opens in a new tab)</span></span>
                </span>
                <span className="fz-font-sm neutral-500 text-nowrap flex-shrink-0">{f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : ""}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
