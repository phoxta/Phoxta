import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Puck, type Data } from "@measured/puck";
import "@measured/puck/puck.css";
import "@/builder/studio.css";
import { puckConfig } from "@/builder/puckConfig";
import { emptyDocument } from "@/builder/types";
import StudioAssistants from "@/builder/ai/StudioAssistants";
import { documentToTsx } from "@/builder/codegen";
import { getPage, saveDocument, publishPage, unpublishPage, type PageStatus } from "@/lib/db/ops/cms";

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVE_LABEL: Record<SaveState, string> = {
  idle: "",
  saving: "Saving…",
  saved: "All changes saved",
  error: "Couldn't save — retry",
};

/**
 * Full-screen visual editor for one page. Renders the real Phoxta sections in a
 * Puck canvas (iframe disabled so the index.html-linked main.css + Bootstrap
 * style them) and autosaves the document tree to cms_pages.
 */
export default function StudioEditorPage() {
  const { orgId, pageId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Data | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<PageStatus>("draft");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [publishing, setPublishing] = useState(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!pageId) return;
    getPage(pageId).then(({ data: page, error }) => {
      if (error || !page) {
        setLoadError(error ?? "Page not found.");
        return;
      }
      setTitle(page.title);
      setSlug(page.slug);
      setStatus(page.status);
      setData((page.document as Data | null) ?? emptyDocument({ title: page.title }));
    });
  }, [pageId]);

  const persist = useCallback(
    async (doc: Data) => {
      if (!pageId) return;
      setSaveState("saving");
      const root = (doc.root?.props ?? {}) as {
        title?: string;
        headerStyle?: number;
        footerStyle?: number;
      };
      const { error } = await saveDocument(pageId, {
        document: doc,
        title: root.title,
        header_style: root.headerStyle,
        footer_style: root.footerStyle,
      });
      if (root.title) setTitle(root.title);
      setSaveState(error ? "error" : "saved");
    },
    [pageId],
  );

  const onChange = useCallback(
    (doc: Data) => {
      setData(doc);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => persist(doc), 1200);
    },
    [persist],
  );

  useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    },
    [],
  );

  // Open the animated preview in a new tab; save first so it's current. Open the
  // tab synchronously (inside the click) to dodge popup blockers, then redirect.
  async function preview() {
    if (!pageId || !data) return;
    const w = window.open("", "_blank");
    await persist(data);
    if (w) w.location.href = `/studio/${orgId}/${pageId}/preview`;
  }

  // "Eject to .tsx": download a real Phoxta page component for the current doc.
  function exportTsx() {
    if (!data) return;
    const base = (title || "GeneratedPage").replace(/[^a-zA-Z0-9]/g, "") || "GeneratedPage";
    const code = documentToTsx(data, `${base}Page`);
    const url = URL.createObjectURL(new Blob([code], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${base}Page.tsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Publish toggles status for the storefront (the same cms_pages flow the
  // Content console uses); save first so the live document is current.
  async function togglePublish() {
    if (!pageId || !data) return;
    setPublishing(true);
    await persist(data);
    const { error } = status === "published" ? await unpublishPage(pageId) : await publishPage(pageId);
    setPublishing(false);
    if (!error) setStatus(status === "published" ? "draft" : "published");
  }

  if (loadError) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: "100vh" }}>
        <p className="neutral-500 mb-2">{loadError}</p>
        <Link to="/dashboard/studio" className="fw-600 text-decoration-none">
          ← Back to Studio
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ height: "100vh" }}>
        <div className="spinner-border text-dark" role="status" aria-label="Loading">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="phoxta-studio d-flex flex-column" style={{ height: "100vh" }}>
      <div className="d-flex align-items-center gap-3 px-3 py-2 border-bottom bg-neutral-0">
        <button
          type="button"
          onClick={() => navigate("/dashboard/studio")}
          className="btn btn-link p-0 neutral-700 text-decoration-none fw-500"
        >
          ← Studio
        </button>
        <span className="fw-600 text-truncate" style={{ maxWidth: 320 }}>
          {title}
        </span>
        <span
          className={`badge fw-500 text-capitalize ${status === "published" ? "bg-success-subtle text-success" : "bg-neutral-100 neutral-700"}`}
        >
          {status}
        </span>
        <span className={`fz-font-sm ms-auto ${saveState === "error" ? "text-danger" : "neutral-500"}`}>
          {SAVE_LABEL[saveState]}
        </span>
        <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={preview}>
          Preview
        </button>
        <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={exportTsx}>
          Export .tsx
        </button>
        <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={() => persist(data)}>
          Save
        </button>
        <button
          type="button"
          className="btn btn-dark btn-sm rounded-pill px-3"
          onClick={togglePublish}
          disabled={publishing}
        >
          {publishing ? "…" : status === "published" ? "Unpublish" : "Publish"}
        </button>
        {status === "published" && (
          <a
            href={`/site/${orgId}/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-link btn-sm p-0 fw-500 text-decoration-none neutral-700"
          >
            View live ↗
          </a>
        )}
      </div>
      <div className="flex-grow-1" style={{ minHeight: 0 }}>
        <Puck
          config={puckConfig}
          data={data}
          onChange={onChange}
          onPublish={persist}
          iframe={{ enabled: false }}
          overrides={{
            // The assistants live inside <Puck> so they can read/replace the
            // live document via usePuck(); they render as fixed-position docks.
            headerActions: ({ children }) => (
              <>
                {children}
                {orgId ? <StudioAssistants orgId={orgId} /> : null}
              </>
            ),
          }}
        />
      </div>
    </div>
  );
}
