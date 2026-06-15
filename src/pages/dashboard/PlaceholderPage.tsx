import PageMeta from "@/seo/PageMeta";

/** Generic dashboard area shell — a real feature surface to be built against Supabase. */
export default function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <PageMeta title={`Phoxta - ${title}`} />
      <div className="mb-4">
        <h2 className="fw-600 mb-1">{title}</h2>
        <p className="neutral-500 mb-0">{description}</p>
      </div>
      <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center">
        <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-neutral-100 mb-3" style={{ width: 56, height: 56 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <h6 className="fw-600 mb-1">Coming together</h6>
        <p className="neutral-500 mb-0 mx-auto" style={{ maxWidth: 420 }}>
          This area will connect to your Supabase data. We&apos;re building it out feature by feature.
        </p>
      </div>
    </div>
  );
}
