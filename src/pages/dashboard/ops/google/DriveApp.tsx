import { useState } from "react";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { toast, toastError } from "@/lib/ops/feedback";
import { driveList, docsCreate, type DriveFile } from "@/lib/db/ops/google";
import { Card, Chip, Empty } from "@/components/dash/Ui";

const CSS = `
.ggx-drive .hrx-pill:disabled { opacity: 0.55; cursor: not-allowed; }
.ggx-alert { background: #fdeaea; color: #dc2626; border: 1px solid #f6c9c9; border-radius: 12px; padding: 10px 14px; font-size: 14px; margin-bottom: 16px; }
.ggx-loading { background: var(--hrx-soft); border: 1px solid var(--hrx-border-soft); border-radius: 16px; padding: 32px 24px; text-align: center; color: var(--hrx-muted); font-size: 14px; }
.ggx-filelink { color: var(--hrx-ink); font-weight: 500; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; min-width: 0; max-width: 100%; }
.ggx-filelink:hover { color: var(--hrx-blue); }
.ggx-filelink .nm { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ggx-fico {
  width: 34px; height: 34px; border-radius: 10px; background: #e8effc; color: var(--hrx-blue); flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; letter-spacing: 0.02em;
}
`;

const kind = (mime: string) =>
  mime.includes("document") ? "Doc" : mime.includes("spreadsheet") ? "Sheet" : mime.includes("presentation") ? "Slides" : mime.includes("folder") ? "Folder" : mime.includes("pdf") ? "PDF" : mime.includes("image") ? "Image" : "File";

const kindTone = (k: string): "blue" | "ok" | "orange" | "plain" =>
  k === "Doc" ? "blue" : k === "Sheet" ? "ok" : k === "Slides" ? "orange" : "plain";

export default function DriveApp({ orgId }: { orgId: string }) {
  const [q, setQ] = useState("");
  // The *committed* search term — typing doesn't refetch, submitting does.
  const [applied, setApplied] = useState("");
  const [busy, setBusy] = useState(false);
  // Inline "new doc" row instead of a native window.prompt — usable on a phone.
  const [newTitle, setNewTitle] = useState<string | null>(null);

  const { data: files = [], loading, error, reload } = useCachedData<DriveFile[]>(
    `google:drive:${orgId}:${applied}`,
    async () => {
      const { data, error } = await driveList(orgId, { q: applied });
      if (error) throw new Error(error);
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );

  function runSearch() {
    const term = q.trim();
    if (term === applied) reload();
    else setApplied(term);
  }

  async function newDoc(e: React.FormEvent) {
    e.preventDefault();
    const title = (newTitle ?? "").trim();
    if (!title) return;
    setBusy(true);
    const { ok, link, error } = await docsCreate(orgId, { title });
    setBusy(false);
    if (!ok || error) { toastError(error ?? "Couldn't create the doc."); return; }
    setNewTitle(null);
    toast(`Created “${title}”.`);
    if (link) window.open(link, "_blank");
    reload();
  }

  return (
    <div className="ggx-drive">
      <style>{CSS}</style>
      {error && <div className="ggx-alert" role="alert">{error}</div>}

      <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center justify-content-between gap-2 mb-3">
        <form className="d-flex gap-2 flex-grow-1" onSubmit={(e) => { e.preventDefault(); runSearch(); }} style={{ maxWidth: 420 }}>
          <label className="visually-hidden" htmlFor="drive-search">Search Drive</label>
          <input id="drive-search" type="search" className="form-control form-control-sm" style={{ minWidth: 0 }} placeholder="Search Drive…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="hrx-pill dark flex-shrink-0" type="submit" style={{ height: 38 }}>Search</button>
        </form>
        <button
          type="button"
          className="hrx-pill primary justify-content-center"
          onClick={() => setNewTitle((t) => (t === null ? "" : null))}
          aria-expanded={newTitle !== null}
        >
          <span aria-hidden="true">＋ </span>New Doc
        </button>
      </div>

      {newTitle !== null && (
        <Card className="mb-3">
          <form onSubmit={newDoc}>
            <label className="hrx-field" htmlFor="drive-new-title" style={{ marginBottom: 10 }}>
              <span>Document title</span>
            </label>
            <div className="d-flex flex-wrap gap-2">
              <input id="drive-new-title" className="form-control" style={{ flex: "1 1 200px", minWidth: 0 }} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus />
              <button className="hrx-pill primary justify-content-center" type="submit" disabled={busy || !newTitle.trim()}>{busy ? "Creating…" : "Create"}</button>
              <button className="hrx-pill" type="button" onClick={() => setNewTitle(null)}>Cancel</button>
            </div>
            <p className="mt-2 mb-0" style={{ fontSize: 13, color: "var(--hrx-muted)" }}>The new doc opens in a new tab.</p>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="ggx-loading" role="status">Loading…</div>
      ) : files.length === 0 ? (
        <Empty title={applied ? "No files match that search" : "No files yet"} icon={<span aria-hidden="true">📁</span>}>
          {applied ? "Try a different search term." : "Files in your business Drive show up here."}
        </Empty>
      ) : (
        <Card pad={false}>
          <div className="hrx-tablewrap">
            <table className="hrx-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th className="text-end">Modified</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => {
                  const k = kind(f.mimeType);
                  return (
                    <tr key={f.id}>
                      <td style={{ maxWidth: 0, width: "70%" }}>
                        <a href={f.webViewLink} target="_blank" rel="noreferrer" className="ggx-filelink">
                          <span className="ggx-fico" aria-hidden="true">{k === "Folder" ? "▸" : k.slice(0, 2).toUpperCase()}</span>
                          <span className="nm">{f.name}<span className="visually-hidden"> (opens in a new tab)</span></span>
                        </a>
                      </td>
                      <td><Chip tone={kindTone(k)}>{k}</Chip></td>
                      <td className="text-end text-nowrap" style={{ color: "var(--hrx-muted)", fontSize: 13 }}>{f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
