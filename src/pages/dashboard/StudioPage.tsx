import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { listMyOrganizations, type Organization } from "@/lib/db/organizations";
import { listPages, createVisualPage, type CmsPage } from "@/lib/db/ops/cms";
import { SECTION_MANIFESTS } from "@/builder/registry";
import { PAGE_TEMPLATES } from "@/builder/templates/generated";
import type { PageDocument } from "@/builder/types";
import BusinessBrandCard from "@/pages/dashboard/business/BusinessBrandCard";

const LAST_ORG_KEY = "phoxta-studio-last-org";

type BizRow = { role: "owner" | "admin" | "staff" | "viewer"; organization: Organization };

/**
 * Studio — the design home for a business you own. Pick a business (every business
 * you bought or created shows here), then edit its BRAND (logo, palette, fonts — or
 * generate it with AI; this themes the live storefront) and build/publish PAGES.
 * Pages are tenant-scoped via cms_pages.organization_id; the editor is a full-screen route.
 */
export default function StudioPage() {
  const navigate = useNavigate();
  const [biz, setBiz] = useState<BizRow[]>([]);
  const [orgId, setOrgId] = useState<string>(() => localStorage.getItem(LAST_ORG_KEY) ?? "");
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loadingBiz, setLoadingBiz] = useState(true);
  const [loadingPages, setLoadingPages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [templateSlug, setTemplateSlug] = useState("");
  const [creating, setCreating] = useState(false);

  const visualPages = useMemo(() => pages.filter((p) => p.kind === "visual"), [pages]);
  const current = useMemo(() => biz.find((b) => b.organization.id === orgId) ?? null, [biz, orgId]);
  const canManage = current?.role === "owner" || current?.role === "admin";

  useEffect(() => {
    listMyOrganizations().then(({ data, error }) => {
      if (error) setError(error);
      setBiz(data);
      // Keep the last business if it's still ours, else default to the first.
      setOrgId((cur) => (cur && data.some((d) => d.organization.id === cur) ? cur : data[0]?.organization.id ?? ""));
      setLoadingBiz(false);
    });
  }, []);

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
    <div>
      <PageMeta title="Phoxta - Studio" />

      <div className="mb-4">
        <h2 className="fw-600 mb-1">Studio</h2>
        <p className="neutral-500 mb-0 fz-font-md">
          Design any business you own — set its brand and build pages from {SECTION_MANIFESTS.length} ready-made sections.
        </p>
      </div>

      {error && <div className="alert alert-warning py-2 px-3 fz-font-md">{error}</div>}

      {loadingBiz ? (
        <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading your businesses…</div>
      ) : biz.length === 0 ? (
        <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center">
          <h6 className="fw-600 mb-1">No businesses yet</h6>
          <p className="neutral-500 mb-3 mx-auto" style={{ maxWidth: 420 }}>
            Buy a business from the marketplace (or create one), then design it here.
          </p>
          <Link to="/dashboard/marketplace" className="btn btn-dark rounded-pill px-4">Browse the marketplace →</Link>
        </div>
      ) : (
        <>
          {/* Business switcher — every business you own */}
          <div className="d-flex align-items-center flex-wrap gap-2 mb-4">
            <span className="fz-font-sm fw-600 neutral-500 me-1">Business</span>
            {biz.map(({ role, organization }) => (
              <button
                key={organization.id}
                type="button"
                onClick={() => setOrgId(organization.id)}
                className={`btn btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-2 ${orgId === organization.id ? "btn-dark" : "btn-outline-secondary"}`}
              >
                {organization.name}
                <span className={`badge fw-500 text-capitalize ${orgId === organization.id ? "bg-white text-dark" : "bg-neutral-100 neutral-700"}`} style={{ fontSize: 10 }}>{role}</span>
              </button>
            ))}
          </div>

          {current && (
            <div className="d-flex flex-column gap-4">
              {/* Live site shortcut */}
              <div className="bg-neutral-0 rounded-4 p-3 px-4 border-100 d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div>
                  <div className="fw-600 neutral-900">{current.organization.name}</div>
                  <div className="fz-font-sm neutral-500 text-capitalize">{current.organization.vertical ?? "business"} · {current.organization.stage}</div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  {canManage && <Link to={`/studio/${current.organization.id}/site`} className="btn btn-dark btn-sm rounded-pill px-3">✎ Edit site content</Link>}
                  <Link to={`/dashboard/businesses/${current.organization.id}`} className="btn btn-outline-dark btn-sm rounded-pill px-3">Site &amp; domains →</Link>
                </div>
              </div>

              {/* Brand & theme — edits the live storefront's look (reused editor + AI rebrand) */}
              <BusinessBrandCard org={current.organization} canManage={canManage} />

              {/* Pages */}
              <div className="bg-neutral-0 rounded-4 p-4 border-100">
                <h6 className="fw-600 mb-3">Pages</h6>
                {canManage && (
                  <form onSubmit={create} className="bg-neutral-50 rounded-3 p-3 mb-3">
                    <div className="row g-2 align-items-end">
                      <div className="col-12 col-md">
                        <label className="fz-font-sm neutral-500 d-block mb-1">New page title</label>
                        <input className="form-control rounded-3" placeholder="e.g. Homepage, About, Landing…" value={title} onChange={(e) => setTitle(e.target.value)} required />
                      </div>
                      <div className="col-12 col-md-auto">
                        <label className="fz-font-sm neutral-500 d-block mb-1">Start from</label>
                        <select className="form-select rounded-3" style={{ minWidth: 200 }} value={templateSlug} onChange={(e) => { setTemplateSlug(e.target.value); const tpl = PAGE_TEMPLATES.find((t) => t.slug === e.target.value); if (tpl && !title.trim()) setTitle(tpl.name); }}>
                          <option value="">Blank page</option>
                          {PAGE_TEMPLATES.map((t) => (
                            <option key={t.slug} value={t.slug}>{t.name} ({t.document.content?.length ?? 0} sections)</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 col-md-auto">
                        <button type="submit" className="btn btn-dark rounded-3 px-4 w-100" disabled={creating || !orgId}>{creating ? "Creating…" : "Create & open editor"}</button>
                      </div>
                    </div>
                  </form>
                )}

                {loadingPages ? (
                  <div className="neutral-500 fz-font-md">Loading pages…</div>
                ) : visualPages.length === 0 ? (
                  <div className="text-center neutral-500 fz-font-md py-4">
                    No pages yet{canManage ? " — create your first one above." : "."}
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {visualPages.map((p) => (
                      <div
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/studio/${orgId}/${p.id}`)}
                        onKeyDown={(e) => { if (e.key === "Enter") navigate(`/studio/${orgId}/${p.id}`); }}
                        className="border-100 rounded-3 p-3 d-flex flex-wrap align-items-center justify-content-between gap-2 neutral-900"
                        style={{ cursor: "pointer" }}
                      >
                        <div>
                          <div className="fw-600">{p.title} <span className="fz-font-sm neutral-500">/{p.slug}</span></div>
                          <div className="fz-font-sm neutral-500">{(p.document?.content?.length ?? 0)} sections · updated {new Date(p.updated_at).toLocaleDateString()}</div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className={`badge fw-500 text-capitalize ${p.status === "published" ? "bg-success-subtle text-success" : "bg-neutral-100 neutral-700"}`}>{p.status}</span>
                          {p.status === "published" && (
                            <a href={`/site/${orgId}/${p.slug}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="btn btn-link btn-sm p-0 fw-500 text-decoration-none neutral-700">View live ↗</a>
                          )}
                          <span className="btn btn-outline-dark btn-sm rounded-pill px-3">Open editor →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
