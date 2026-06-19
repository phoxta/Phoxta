import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  listPages,
  createPage,
  publishPage,
  unpublishPage,
  revalidatePage,
  type CmsPage,
} from "@/lib/db/ops/cms";
import { invokeAction, drainEmbeddings } from "@/lib/db/ops/ai";
import type { OpsContext } from "@/layouts/OperatingLayout";

type Draft = { title: string; slug: string; body: string; seo_title: string; seo_description: string };
type Scaffold = { pages: { title: string; slug: string; body: string }[] };

export default function ContentPage() {
  const { orgId } = useOutletContext<OpsContext>();
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", body: "" });
  const [brief, setBrief] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [scaffoldLoading, setScaffoldLoading] = useState(false);

  async function load() {
    const { data, error } = await listPages(orgId);
    if (error) setError(error);
    setPages(data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const { error } = await createPage(orgId, form);
    if (error) setError(error);
    else {
      setForm({ title: "", body: "" });
      load();
    }
  }

  async function generateDraft() {
    if (!brief.trim()) return;
    setGenLoading(true);
    setError(null);
    const { data, error } = await invokeAction<Draft>(orgId, "content_draft", { brief });
    setGenLoading(false);
    if (error) setError(error);
    else if (data) setForm({ title: data.title, body: data.body });
  }

  async function scaffoldSite() {
    if (!brief.trim()) return;
    setScaffoldLoading(true);
    setError(null);
    const { data, error } = await invokeAction<Scaffold>(orgId, "scaffold_site", { brief });
    if (error) {
      setScaffoldLoading(false);
      setError(error);
      return;
    }
    for (const p of data?.pages ?? []) {
      await createPage(orgId, { title: p.title, slug: p.slug, body: p.body });
    }
    setScaffoldLoading(false);
    setBrief("");
    load();
  }

  return (
    <div>
      <h5 className="fw-600 mb-3">Pages</h5>
      {error && <div className="alert alert-warning py-2 px-3 fz-font-md">{error}</div>}

      <div className="bg-neutral-0 rounded-4 p-4 border-100 mb-4">
        <h6 className="fw-600 mb-3">✨ AI content</h6>
        <textarea className="form-control rounded-3 mb-2" rows={2} placeholder="Describe the page or site you want (a brief)…" value={brief} onChange={(e) => setBrief(e.target.value)} />
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-dark rounded-3 px-4" onClick={generateDraft} disabled={genLoading}>{genLoading ? "Generating…" : "Generate page"}</button>
          <button type="button" className="btn btn-outline-dark rounded-3 px-4" onClick={scaffoldSite} disabled={scaffoldLoading}>{scaffoldLoading ? "Scaffolding…" : "Scaffold full site"}</button>
        </div>
        <p className="fz-font-sm neutral-500 mb-0 mt-2">“Generate page” fills the draft below; “Scaffold full site” creates several draft pages for this business.</p>
      </div>

      <form onSubmit={add} className="bg-neutral-0 rounded-4 p-3 border-100 mb-4">
        <div className="row g-2">
          <div className="col-12"><input className="form-control rounded-3" placeholder="Page title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="col-12"><textarea className="form-control rounded-3" rows={3} placeholder="Body / content" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
          <div className="col-12"><button type="submit" className="btn btn-dark rounded-3 px-4">Create draft</button></div>
        </div>
      </form>

      {loading ? (
        <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>
      ) : pages.length === 0 ? (
        <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">No pages yet.</div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {pages.map((p) => (
            <div key={p.id} className="bg-neutral-0 rounded-4 p-3 border-100 d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div>
                <div className="fw-600">{p.title} <span className="fz-font-sm neutral-500">/{p.slug}</span></div>
                <div className="fz-font-sm neutral-500">
                  {p.status === "published"
                    ? `Published${p.revalidated_at ? ` · revalidated ${new Date(p.revalidated_at).toLocaleString()}` : ""}`
                    : "Draft"}
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className={`badge fw-500 text-capitalize ${p.status === "published" ? "bg-success-subtle text-success" : "bg-neutral-100 neutral-700"}`}>{p.status}</span>
                {p.status === "draft" ? (
                  <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={async () => { await publishPage(p.id); drainEmbeddings(); load(); }}>Publish</button>
                ) : (
                  <>
                    <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={async () => { await revalidatePage(p.id); load(); }}>Revalidate</button>
                    <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={async () => { await unpublishPage(p.id); load(); }}>Unpublish</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
