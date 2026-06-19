import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import RenderedPage from "@/builder/RenderedPage";
import { getPublishedPage } from "@/lib/db/ops/cms";
import type { PageDocument } from "@/builder/types";

/**
 * Public storefront route for a PUBLISHED Studio page — the live end of the
 * build → edit → publish loop. Reads with the anon key via the public-read
 * policy (migration 0021) and renders through the shared RenderedPage path.
 */
export default function PublishedPage() {
  const { orgId, slug } = useParams();
  const [doc, setDoc] = useState<PageDocument | null>(null);
  const [title, setTitle] = useState("Phoxta");
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !slug) return;
    getPublishedPage(orgId, slug).then(({ data }) => {
      if (!data || !data.document) setNotFound(true);
      else {
        setDoc(data.document as PageDocument);
        setTitle(data.title);
      }
      setLoading(false);
    });
  }, [orgId, slug]);

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
        <div className="spinner-border text-dark" role="status" aria-label="Loading">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  if (notFound || !doc) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center text-center" style={{ minHeight: "100vh" }}>
        <PageMeta title="Phoxta - Not found" />
        <h3 className="fw-600 mb-1">Page not found</h3>
        <p className="neutral-500 mb-0">This page isn’t published, or the link is wrong.</p>
      </div>
    );
  }

  return (
    <>
      <PageMeta title={title} />
      <RenderedPage doc={doc} />
    </>
  );
}
