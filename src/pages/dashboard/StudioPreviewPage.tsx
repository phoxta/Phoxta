import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import RenderedPage from "@/builder/RenderedPage";
import { getPage } from "@/lib/db/ops/cms";
import type { PageDocument } from "@/builder/types";

/**
 * Full-fidelity preview of a built page (the last saved version). Renders through
 * the exact same path as the live storefront (RenderedPage = MainLayout chrome +
 * GSAP effects), so what you preview is what publishes.
 */
export default function StudioPreviewPage() {
  const { orgId, pageId } = useParams();
  const [doc, setDoc] = useState<PageDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pageId) return;
    getPage(pageId).then(({ data, error }) => {
      if (error || !data) setError(error ?? "Page not found.");
      else if (!data.document) setError("This page has no visual content yet.");
      else setDoc(data.document as PageDocument);
      setLoading(false);
    });
  }, [pageId]);

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
        <div className="spinner-border text-dark" role="status" aria-label="Loading">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center text-center" style={{ minHeight: "100vh" }}>
        <p className="neutral-500 mb-2">{error ?? "Nothing to preview."}</p>
        <Link to={`/studio/${orgId}/${pageId}`} className="fw-600 text-decoration-none">
          ← Back to editor
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Phoxta - Preview" />
      <RenderedPage doc={doc} />
      <Link
        to={`/studio/${orgId}/${pageId}`}
        className="btn btn-dark rounded-pill px-3 shadow"
        style={{ position: "fixed", left: 24, top: 24, zIndex: 99999 }}
      >
        ← Back to editor
      </Link>
    </>
  );
}
