import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { organizationsQuery, DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { listPages, createVisualPage, type CmsPage } from "@/lib/db/ops/cms";
import { SECTION_MANIFESTS } from "@/builder/registry";
import { PAGE_TEMPLATES } from "@/builder/templates/generated";
import type { PageDocument } from "@/builder/types";
import BusinessBrandCard from "@/pages/dashboard/business/BusinessBrandCard";
import { PageHeader, Card, Chip, stageTone, Empty, InitialAvatar } from "@/components/dash/Ui";

const LAST_ORG_KEY = "phoxta-studio-last-org";

const CSS = `
.sdx-role { margin-left: 2px; }
.hrx-tab .sdx-role { background: #f1f2f4; color: var(--hrx-ink); }
.hrx-tab.active .sdx-role { background: rgba(255, 255, 255, 0.18); color: #fff; }
.sdx-stack { display: flex; flex-direction: column; gap: 8px; }
.sdx-bizrow { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.sdx-bizrow .meta { min-width: 0; flex: 1 1 auto; }
.sdx-bizrow .meta .nm { font-size: 17px; font-weight: 600; letter-spacing: -0.02em; }
.sdx-bizrow .acts { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.sdx-newpage { background: var(--hrx-soft); border: 1px solid var(--hrx-border-soft); border-radius: 16px; padding: 14px 16px; margin-bottom: 14px; }
.sdx-newpage .row-fields { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.sdx-newpage .hrx-field { flex: 1 1 220px; margin-bottom: 0; }
.sdx-newpage .hrx-field.tpl { flex: 0 1 260px; }
.sdx-pagerow-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.sdx-hint { font-size: 14px; color: var(--hrx-muted); margin: 0 0 14px; max-width: 78ch; }
.sdx-live { font-size: 13px; font-weight: 500; color: var(--hrx-blue); text-decoration: none; white-space: nowrap; }
.sdx-live:hover { color: var(--hrx-blue-deep); text-decoration: underline; }
`;

const IconPencil = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

const IconArrow = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);

const IconLayout = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
  </svg>
);

/**
 * Studio — the design home for a business you own. Pick a business (every business
 * you bought or created shows here), then edit its BRAND (logo, palette, fonts — or
 * generate it with AI; this themes the live storefront) and build/publish PAGES.
 * Pages are tenant-scoped via cms_pages.organization_id; the editor is a full-screen route.
 */
export default function StudioPage() {
  const navigate = useNavigate();
  // Businesses come from the shared, warmed "organizations" cache.
  const { data: biz = [], loading: loadingBiz, error: bizError } = useCachedData(
    organizationsQuery.key,
    organizationsQuery.fetch,
    { ttl: DASHBOARD_TTL },
  );
  const [orgId, setOrgId] = useState<string>(() => localStorage.getItem(LAST_ORG_KEY) ?? "");
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [templateSlug, setTemplateSlug] = useState("");
  const [creating, setCreating] = useState(false);

  const visualPages = useMemo(() => pages.filter((p) => p.kind === "visual"), [pages]);
  const current = useMemo(() => biz.find((b) => b.organization.id === orgId) ?? null, [biz, orgId]);
  const canManage = current?.role === "owner" || current?.role === "admin";

  // Keep the last business if it's still ours, else default to the first, once the
  // (shared, warmed) business list is available.
  useEffect(() => {
    if (biz.length === 0) return;
    setOrgId((cur) => (cur && biz.some((d) => d.organization.id === cur) ? cur : biz[0]?.organization.id ?? ""));
  }, [biz]);

  useEffect(() => {
    if (!orgId) { setPages([]); return; }
    localStorage.setItem(LAST_ORG_KEY, orgId);
    setLoadingPages(true);
    listPages(orgId).then(({ data, error }) => {
      if (error) setError(error);
      setPages(data);
      setLoadingPages(false);
    });
  }, [orgId]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !orgId) return;
    setCreating(true);
    setError(null);
    const tpl = PAGE_TEMPLATES.find((t) => t.slug === templateSlug);
    let document: PageDocument | undefined;
    if (tpl) {
      document = structuredClone(tpl.document) as PageDocument;
      (document.root as { props?: Record<string, unknown> }).props = {
        ...(document.root as { props?: Record<string, unknown> }).props,
        title: title.trim(),
      };
    }
    const { id, error } = await createVisualPage(orgId, { title, document });
    setCreating(false);
    if (error) { setError(error); return; }
    if (id) navigate(`/studio/${orgId}/${id}`);
  }

  return (
    <div className="sdx-stack">
      <PageMeta title="Phoxta - Studio" />
      <style>{CSS}</style>

      <PageHeader
        crumb="Portal"
        title="Studio"
        note={`Design any business you own — set its brand and build pages from ${SECTION_MANIFESTS.length} ready-made sections.`}
        actions={current && (
          <>
            {canManage && (
              <Link to={`/studio/${current.organization.id}/site`} className="hrx-pill primary">
                {IconPencil} Edit site content
              </Link>
            )}
            <Link to={`/dashboard/businesses/${current.organization.id}`} className="hrx-pill">
              Site &amp; domains {IconArrow}
            </Link>
          </>
        )}
        stat={current ? { label: "Pages", value: loadingPages ? "…" : visualPages.length } : undefined}
      />

      {(error || bizError) && <div className="alert alert-warning py-2 px-3 mb-0" role="alert">{error || bizError}</div>}

      {loadingBiz ? (
        <Card><p className="text-center mb-0" style={{ color: "var(--hrx-muted)" }}>Loading your businesses…</p></Card>
      ) : biz.length === 0 ? (
        <Empty
          icon={IconLayout}
          title="No businesses yet"
          action={<Link to="/dashboard/marketplace" className="hrx-pill dark">Browse the marketplace {IconArrow}</Link>}
        >
          Buy a business from the marketplace (or create one), then design it here.
        </Empty>
      ) : (
        <>
          {/* Business switcher — every business you own */}
          <Card title="Business">
            <div className="hrx-tabbar" role="tablist" aria-label="Choose a business">
              {biz.map(({ role, organization }) => (
                <button
                  key={organization.id}
                  type="button"
                  role="tab"
                  aria-selected={orgId === organization.id}
                  onClick={() => setOrgId(organization.id)}
                  className={`hrx-tab${orgId === organization.id ? " active" : ""}`}
                >
                  {organization.name}
                  <span className="hrx-chip sdx-role">{role}</span>
                </button>
              ))}
            </div>

            {current && (
              <div className="sdx-bizrow mt-3">
                <InitialAvatar name={current.organization.name} size={48} />
                <div className="meta">
                  <div className="nm">{current.organization.name}</div>
                  <div className="mt-1 d-flex align-items-center gap-2 flex-wrap">
                    <Chip tone="line">{current.organization.vertical ?? "business"}</Chip>
                    <Chip tone={stageTone(current.organization.stage)}>{current.organization.stage}</Chip>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {current && (
            <>
              {/* Brand & theme — edits the live storefront's look (reused editor + AI rebrand) */}
              <BusinessBrandCard org={current.organization} canManage={canManage} />

              {/* Pages */}
              <Card
                title="Pages"
                right={!loadingPages && visualPages.length > 0 ? (
                  <span className="hrx-chip line">{visualPages.length} page{visualPages.length === 1 ? "" : "s"}</span>
                ) : undefined}
              >
                <p className="sdx-hint">
                  Two editors, two jobs: <b>Edit site content</b> (above) changes the text and images
                  of your live storefront in place. <b>Pages</b> (below) builds extra pages — landing
                  pages, promos — published at their own links.
                </p>

                {canManage && (
                  <form onSubmit={create} className="sdx-newpage">
                    <div className="row-fields">
                      <label className="hrx-field">
                        <span>New page title</span>
                        <input className="form-control" placeholder="e.g. Homepage, About, Landing…" value={title} onChange={(e) => setTitle(e.target.value)} required />
                      </label>
                      <label className="hrx-field tpl">
                        <span>Start from</span>
                        <select className="form-select" value={templateSlug} onChange={(e) => { setTemplateSlug(e.target.value); const tpl = PAGE_TEMPLATES.find((t) => t.slug === e.target.value); if (tpl && !title.trim()) setTitle(tpl.name); }}>
                          <option value="">Blank page</option>
                          {PAGE_TEMPLATES.map((t) => (
                            <option key={t.slug} value={t.slug}>{t.name} ({t.document.content?.length ?? 0} sections)</option>
                          ))}
                        </select>
                      </label>
                      <button type="submit" className="hrx-pill primary" disabled={creating || !orgId}>
                        {creating ? "Creating…" : "Create & open editor"} {IconArrow}
                      </button>
                    </div>
                  </form>
                )}

                {loadingPages ? (
                  <p className="mb-0" style={{ color: "var(--hrx-muted)", fontSize: 14 }}>Loading pages…</p>
                ) : visualPages.length === 0 ? (
                  <Empty icon={IconLayout} title="No pages yet">
                    {canManage ? "Create your first page above — start blank or from a template." : "Pages this business publishes will appear here."}
                  </Empty>
                ) : (
                  <div>
                    {visualPages.map((p) => (
                      <div
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/studio/${orgId}/${p.id}`)}
                        onKeyDown={(e) => { if (e.key === "Enter") navigate(`/studio/${orgId}/${p.id}`); }}
                        className="hrx-listrow"
                        style={{ cursor: "pointer" }}
                      >
                        <InitialAvatar name={p.title} />
                        <div className="main">
                          <p className="t">{p.title} <span style={{ color: "var(--hrx-muted)", fontWeight: 400 }}>/{p.slug}</span></p>
                          <p className="s">{(p.document?.content?.length ?? 0)} sections · updated {new Date(p.updated_at).toLocaleDateString()}</p>
                        </div>
                        <div className="sdx-pagerow-right">
                          <Chip tone={p.status === "published" ? "ok" : stageTone(p.status)}>{p.status}</Chip>
                          {p.status === "published" && (
                            <a href={`/site/${orgId}/${p.slug}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="sdx-live">View live ↗</a>
                          )}
                          <span className="hrx-rbtn dark" aria-hidden="true" title="Open editor">{IconPencil}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
