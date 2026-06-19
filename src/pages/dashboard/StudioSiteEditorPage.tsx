import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { listDomains, type Domain } from "@/lib/db/domains";
import { getPageContent, savePageContent, type PageSlots } from "@/lib/db/pageContent";

// Studio in-context editor — edit the TEXT and IMAGES on the bought storefront's real
// pages. We iframe the tenant's live storefront with ?phoxta-edit=1; its LiveEdit
// script makes text/images editable and streams each change here, keyed by page path.
// Save writes per-page overrides to tenant_page_content, which the storefront then
// applies for every visitor. Full-screen route (no dashboard chrome).

type EditsByPath = Record<string, PageSlots>;

export default function StudioSiteEditorPage() {
  const { orgId = "" } = useParams();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [host, setHost] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notReady, setNotReady] = useState<string | null>(null);
  const [edits, setEdits] = useState<EditsByPath>({});
  const [currentPath, setCurrentPath] = useState("/");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const origin = host ? `https://${host}` : "";
  const editedCount = useMemo(
    () => Object.values(edits).reduce((n, s) => n + Object.keys(s.text ?? {}).length + Object.keys(s.img ?? {}).length, 0),
    [edits],
  );

  // Resolve the storefront URL: the primary live domain (prefer custom, then subdomain).
  useEffect(() => {
    if (!orgId) return;
    listDomains(orgId).then(({ data }) => {
      const live = data.filter((d: Domain) => d.status === "live");
      const pick = live.find((d) => d.is_primary) ?? live.find((d) => d.kind === "custom") ?? live[0] ?? null;
      if (!pick) setNotReady("This business isn't live on a domain yet — connect or buy a domain first, then come back to edit its pages.");
      else setHost(pick.hostname);
      setLoading(false);
    });
  }, [orgId]);

  // Receive edits from the storefront iframe.
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (origin && e.origin !== origin) return;
      const d = e.data as { source?: string; kind?: string; path?: string; index?: number; value?: string; current?: string };
      if (d?.source !== "phoxta-edit") return;
      const path = d.path || currentPath;
      if (d.kind === "slots") { setCurrentPath(path); return; }
      if (d.kind === "text" && typeof d.index === "number") {
        setEdits((p) => ({ ...p, [path]: { ...p[path], text: { ...p[path]?.text, [d.index as number]: d.value ?? "" } } }));
      } else if (d.kind === "img" && typeof d.index === "number") {
        setEdits((p) => ({ ...p, [path]: { ...p[path], img: { ...p[path]?.img, [d.index as number]: d.value ?? "" } } }));
      } else if (d.kind === "img-select" && typeof d.index === "number") {
        const url = window.prompt("Replace image — paste a new image URL:", d.current ?? "");
        if (url != null && origin) {
          iframeRef.current?.contentWindow?.postMessage({ source: "phoxta-studio", kind: "set-img", index: d.index, value: url }, origin);
        }
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [origin, currentPath]);

  async function save() {
    setSaving(true);
    setMsg(null);
    let err: string | null = null;
    for (const [path, slots] of Object.entries(edits)) {
      // Merge with any previously-saved overrides for this page so we never wipe them.
      const { slots: existing } = await getPageContent(orgId, path);
      const merged: PageSlots = { text: { ...existing.text, ...slots.text }, img: { ...existing.img, ...slots.img } };
      const { error } = await savePageContent(orgId, path, merged);
      if (error) err = error;
    }
    setSaving(false);
    if (err) setMsg(err);
    else { setEdits({}); setMsg("Saved — your changes are live on the storefront."); }
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <PageMeta title="Phoxta - Edit site" />

      {/* Top bar */}
      <div className="d-flex align-items-center justify-content-between gap-2 px-3 py-2 border-bottom bg-neutral-0" style={{ flexShrink: 0 }}>
        <div className="d-flex align-items-center gap-3">
          <Link to="/dashboard/studio" className="btn btn-link btn-sm p-0 neutral-700 text-decoration-none">← Studio</Link>
          <span className="fw-600">Edit site content</span>
          {host && <span className="fz-font-sm neutral-500">{host}</span>}
        </div>
        <div className="d-flex align-items-center gap-3">
          {msg && <span className="fz-font-sm neutral-600">{msg}</span>}
          <span className="fz-font-sm neutral-500">{editedCount} change{editedCount === 1 ? "" : "s"}</span>
          <button type="button" className="btn btn-dark btn-sm rounded-pill px-4" onClick={save} disabled={saving || editedCount === 0}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-grow-1 d-flex align-items-center justify-content-center neutral-500">Loading your storefront…</div>
      ) : notReady ? (
        <div className="flex-grow-1 d-flex align-items-center justify-content-center text-center p-4">
          <div style={{ maxWidth: 460 }}>
            <h6 className="fw-600 mb-2">Not live yet</h6>
            <p className="neutral-500 mb-3">{notReady}</p>
            <Link to={`/dashboard/businesses/${orgId}`} className="btn btn-dark rounded-pill px-4">Site &amp; domains →</Link>
          </div>
        </div>
      ) : (
        <div className="flex-grow-1 d-flex" style={{ minHeight: 0 }}>
          {/* Instructions sidebar */}
          <div className="border-end bg-neutral-0 p-3" style={{ width: 280, flexShrink: 0, overflow: "auto" }}>
            <div className="fz-font-sm fw-600 neutral-700 mb-2">How to edit</div>
            <ul className="fz-font-sm neutral-600 ps-3 mb-3" style={{ lineHeight: 1.7 }}>
              <li>Click any <strong>text</strong> on the page and type.</li>
              <li>Click any <strong>image</strong> to replace it with a new URL.</li>
              <li>Navigate the site to edit other pages.</li>
              <li>Hit <strong>Save changes</strong> when done.</li>
            </ul>
            <div className="fz-font-sm fw-600 neutral-700 mb-1">Editing</div>
            <div className="fz-font-sm neutral-500 mb-3"><code>{currentPath}</code></div>
            {Object.keys(edits).length > 0 && (
              <>
                <div className="fz-font-sm fw-600 neutral-700 mb-1">Unsaved pages</div>
                <ul className="list-unstyled fz-font-sm neutral-600 m-0">
                  {Object.entries(edits).map(([path, s]) => (
                    <li key={path} className="d-flex justify-content-between"><code>{path}</code><span>{Object.keys(s.text ?? {}).length + Object.keys(s.img ?? {}).length}</span></li>
                  ))}
                </ul>
              </>
            )}
            <div className="fz-font-sm neutral-400 mt-3">Tip: headings, copy and hero/section images edit reliably. Items in dynamic lists (e.g. the live menu) are best edited in the console.</div>
          </div>

          {/* The live storefront in edit mode */}
          <iframe
            ref={iframeRef}
            title="storefront"
            src={`${origin}/?phoxta-edit=1`}
            style={{ flexGrow: 1, border: "none", minWidth: 0 }}
          />
        </div>
      )}
    </div>
  );
}
