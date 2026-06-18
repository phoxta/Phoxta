import { useEffect, useState } from "react";
import { driveList, docsCreate, type DriveFile } from "@/lib/db/ops/google";

const MIME: Record<string, string | undefined> = {
  all: undefined,
  docs: "application/vnd.google-apps.document",
  sheets: "application/vnd.google-apps.spreadsheet",
};
const kind = (mime: string) =>
  mime.includes("document") ? "Doc" : mime.includes("spreadsheet") ? "Sheet" : mime.includes("presentation") ? "Slides" : mime.includes("folder") ? "Folder" : mime.includes("pdf") ? "PDF" : mime.includes("image") ? "Image" : "File";

export default function DriveApp({ orgId, filter = "all" }: { orgId: string; filter?: "all" | "docs" | "sheets" }) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(query = "") {
    setLoading(true);
    const { data, error } = await driveList(orgId, { q: query, mime: MIME[filter] });
    if (error) setError(error);
    setFiles(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, [orgId, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function newDoc() {
    const title = window.prompt("Document title");
    if (!title) return;
    setBusy(true);
    const { ok, link, error } = await docsCreate(orgId, { title });
    setBusy(false);
    if (!ok || error) { setNotice(error ?? "Couldn't create the doc."); return; }
    if (link) window.open(link, "_blank");
    load(q);
  }

  return (
    <div>
      {error && <div className="alert alert-warning py-2 px-3 fz-font-md mb-3">{error}</div>}
      {notice && <div className="alert alert-info py-2 px-3 fz-font-sm mb-3">{notice}</div>}
      <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
        <form className="d-flex gap-2 flex-grow-1" onSubmit={(e) => { e.preventDefault(); load(q); }} style={{ maxWidth: 420 }}>
          <input className="form-control form-control-sm rounded-3" placeholder={`Search ${filter === "all" ? "Drive" : filter}…`} value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-dark btn-sm rounded-3 px-3" type="submit">Search</button>
        </form>
        {filter !== "sheets" && <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3 text-nowrap" onClick={newDoc} disabled={busy}>＋ New Doc</button>}
      </div>
      {loading ? (
        <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">Loading…</div>
      ) : files.length === 0 ? (
        <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No files.</div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {files.map((f) => (
            <a key={f.id} href={f.webViewLink} target="_blank" rel="noreferrer" className="bg-neutral-0 rounded-4 p-3 border-100 d-flex align-items-center justify-content-between gap-2 text-decoration-none">
              <div className="d-flex align-items-center gap-2 text-truncate">
                <span className="badge bg-neutral-100 neutral-700 fw-500">{kind(f.mimeType)}</span>
                <span className="fw-500 neutral-900 text-truncate">{f.name}</span>
              </div>
              <span className="fz-font-sm neutral-400 text-nowrap">{f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : ""}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
