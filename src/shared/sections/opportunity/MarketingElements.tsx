import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

// Public pages use the existing at-btn, service-card and Bootstrap component
// language. App components and the p2 stylesheet do not belong in this layer.
export function MarketingButton({ to, children }: { to: string; children: ReactNode }) {
    const arrow = <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M2 11 11 2M4 2h7v7" stroke="currentColor" strokeWidth="1.5" /></svg>;
    return <Link className="at-btn" to={to}><span><span className="text-1">{children}</span><span className="text-2" aria-hidden="true">{children}</span></span><i>{arrow}{arrow}</i></Link>;
}

export function MarketingCard({ eyebrow, title, children, action }: { eyebrow?: string; title: string; children: ReactNode; action?: ReactNode }) {
    return <article className="at-service-card border-100 rounded-2 overflow-hidden p-relative bg-neutral-0 h-100"><div className="at-service-card-content m-xxl-5 m-4">{eyebrow && <p className="fz-font-sm fw-600 neutral-600">{eyebrow}</p>}<h2 className="h4 fw-600 mb-20">{title}</h2><div className="at-service-card-description">{children}</div>{action && <div className="mt-30">{action}</div>}</div></article>;
}

export function MarketingStatus({ loading, error, retry }: { loading: boolean; error: string | null; retry: () => void }) {
    if (loading) return <p role="status" className="py-5">Loading…</p>;
    if (error) return <div role="alert" className="border-100 rounded-3 p-4 mb-4"><p>We couldn’t load this collection. Please try again.</p><button className="at-btn" onClick={retry}>Try again</button></div>;
    return null;
}

/** Public page introduction uses the same type, spacing and pill controls as the discovery homepage. */
export function PublicPageHero({ eyebrow, heading, subtitle, sideContent }: { eyebrow: string; heading: string; subtitle: string; sideContent?: ReactNode }) {
    return <section className="pd-page-hero"><div className="container"><p className="pd-eyebrow">[ {eyebrow} ]</p><div className="pd-page-hero-grid"><h1>{heading}</h1><div><p className="pd-body">{subtitle}</p>{sideContent && <div className="pd-page-hero-action">{sideContent}</div>}</div></div></div></section>;
}

export function MarketingPagination({ page, total, change }: { page: number; total: number; change: (value: number) => void }) {
    if (total <= 24 && page === 0) return null;
    return <nav className="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-40" aria-label="Results pages"><button className="at-btn" disabled={page === 0} onClick={() => change(page - 1)}>Previous</button><span>Page {page + 1} of {Math.max(1, Math.ceil(total / 24))} · {total} results</span><button className="at-btn" disabled={(page + 1) * 24 >= total} onClick={() => change(page + 1)}>Next</button></nav>;
}
