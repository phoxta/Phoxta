import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast, toastError, confirmDanger } from "@/lib/ops/feedback";
import { Card, Chip, Empty } from "@/components/dash/Ui";
import type { OpsContext } from "@/layouts/OperatingLayout";
import {
  listHelpArticles, saveHelpArticle, deleteHelpArticle, uploadHelpImage, publicHelpPath,
  type HelpArticle, type HelpDraft,
} from "@/lib/db/ops/helpCenter";
import { estimateReadMinutes } from "@/lib/articleText";
import { type ArticleBlock } from "@/data/articles";
import { type PostDraft } from "@/lib/db/platformPosts";
// The composer IS the article page: the editor renders the article template's
// exact markup, edited in place with drag-and-drop blocks — same treatment as
// the Platform console's Blog tab.
import ArticleEditor from "@/components/dash/ArticleEditor";

/**
 * Help Center — the business's public knowledge base.
 *
 * Articles written here publish on the marketing SPA at /help/:org (index) and
 * /help/:org/:slug (article), readable by anyone. Publishing also feeds the
 * article's text into the org's AI-agent knowledge (best-effort, server-side),
 * so the agent answers with what the help center says.
 *
 * Management mirrors the Platform Blog tab: category tabs, a visual card grid
 * on .hrx-imgcard, and the same in-place ArticleEditor.
 */

/** Page-local styles on top of the shared .hrx kit — the opx-* classes the
 *  in-place ArticleEditor and the card grid rely on (same as PlatformPage). */
const CSS = `
.opx-note { font-size: 14px; color: var(--hrx-muted); margin: 0 0 14px; }
.opx-btn:disabled { opacity: 0.55; cursor: default; }
.opx-item { border: 1px solid var(--hrx-border-soft); border-radius: 16px; padding: 14px 16px; background: var(--hrx-card); }
.opx-solid { background: var(--hrx-ink); color: #fff; border-color: var(--hrx-ink); }
.opx-solid:hover { background: var(--hrx-ink); border-color: var(--hrx-ink); color: #fff; opacity: 0.85; }
.opx-danger { border-color: #f3c1c1; color: #dc2626; }
.opx-danger:hover { background: #dc2626; border-color: #dc2626; color: #fff; }
.opx-grid .hrx-field { margin-bottom: 0; }
.opx-sharebar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.opx-details { border: 1px solid var(--hrx-border-soft); border-radius: 12px; padding: 10px 14px; margin-bottom: 14px; background: var(--hrx-soft); }
.opx-details summary { cursor: pointer; font-size: 13px; font-weight: 600; color: var(--hrx-muted); }
.opx-details[open] summary { margin-bottom: 10px; }
.opx-secret-x { border: 0; background: transparent; color: var(--hrx-muted); font-size: 14px; cursor: pointer; }
.opx-secret-x:hover { opacity: 1; }
/* The in-place article editor: white page, blocks light up on hover. */
.opx-editorwrap { background: #fff; border: 1px solid var(--hrx-border-soft); border-radius: 16px; overflow: hidden; }
.opx-canvas { padding-top: 36px !important; padding-bottom: 48px !important; }
.opx-canvas [contenteditable] { outline: none; border-radius: 6px; transition: box-shadow 0.15s; cursor: text; }
.opx-canvas [contenteditable]:hover { box-shadow: 0 0 0 1px var(--hrx-border-soft); }
.opx-canvas [contenteditable]:focus { box-shadow: 0 0 0 2px var(--hrx-blue); background: #fff; }
.opx-canvas [contenteditable]:empty::before { content: attr(data-placeholder); color: #9ca3af; cursor: text; }
.opx-canvas span[contenteditable], .opx-canvas cite[contenteditable] { display: inline-block; min-width: 40px; }
.opx-block { position: relative; border-radius: 8px; }
.opx-block.is-over { box-shadow: 0 -3px 0 0 var(--hrx-blue); }
.opx-block-tools { position: absolute; top: -14px; right: 0; display: none; gap: 2px; z-index: 6; background: var(--hrx-ink); border-radius: 999px; padding: 4px 10px; align-items: center; }
.opx-block:hover > .opx-block-tools { display: flex; }
.opx-block-tools button, .opx-drag { border: 0; background: transparent; color: #fff; font-size: 12px; cursor: pointer; line-height: 1; padding: 2px 5px; }
.opx-block-tools button:disabled { opacity: 0.35; }
.opx-drag { cursor: grab; font-size: 14px; }
.opx-block-tools .opx-del:hover { color: #ff8d7a; }
.opx-addbar { position: relative; height: 16px; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s; }
.opx-addbar:hover, .opx-addbar[data-open], .opx-block:hover .opx-addbar, .content > .opx-addbar:only-child { opacity: 1; }
.content > .opx-addbar:first-child { opacity: 0.55; }
.opx-addbtn { width: 22px; height: 22px; border-radius: 999px; border: 1px solid var(--hrx-blue); background: #fff; color: var(--hrx-blue); font-size: 14px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
.opx-palette { position: absolute; top: 24px; left: 50%; transform: translateX(-50%); z-index: 30; background: #fff; border: 1px solid var(--hrx-border-soft); border-radius: 12px; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12); padding: 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; width: 280px; }
.opx-palette button { border: 0; background: transparent; text-align: left; font-size: 13px; padding: 8px 10px; border-radius: 8px; cursor: pointer; }
.opx-palette button:hover { background: var(--hrx-soft); }
.opx-imgwrap { position: relative; }
.opx-imgswap { position: absolute; bottom: 12px; right: 12px; z-index: 4; border: 0; border-radius: 999px; padding: 8px 14px; background: rgba(17, 17, 17, 0.78); color: #fff; font-size: 13px; cursor: pointer; }
.opx-imgswap:hover { background: #000; }
.opx-li-add { list-style: none; }
.opx-li-add button, .opx-tabletools button { border: 1px dashed var(--hrx-border-soft); background: #fff; border-radius: 8px; font-size: 12px; color: var(--hrx-muted); padding: 2px 8px; cursor: pointer; }
.opx-li-add button:hover, .opx-tabletools button:hover { color: var(--hrx-ink); border-color: var(--hrx-muted); }
.opx-tabletools { display: flex; gap: 6px; margin-top: 6px; }
/* Article list — visual cards on the kit's imgcard */
.opx-helpgrid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }
.opx-helpcard { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.opx-helpcover { aspect-ratio: 16 / 10; }
.opx-helpcover .shade .name { font-size: 16px; font-weight: 600; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.opx-helpcover.no-img { background: linear-gradient(135deg, var(--hrx-soft), #dfe6f3); }
.opx-helpmeta { font-size: 12px; color: var(--hrx-muted); display: flex; justify-content: space-between; gap: 8px; }
.opx-helpacts { display: flex; flex-wrap: wrap; gap: 6px; }
`;

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

const emptyDraft = (): HelpDraft => ({
  slug: "", title: "", excerpt: "", category: "General", hero: "", body: [], status: "draft",
});

export default function HelpCenterPage() {
  const { orgId, org } = useOutletContext<OpsContext>();
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cat, setCat] = useState<string>("all");
  const [draft, setDraft] = useState<HelpDraft | null>(null);
  const [draftBlocks, setDraftBlocks] = useState<ArticleBlock[]>([]);
  /** After a publish: the article to offer the public link for. */
  const [live, setLive] = useState<{ slug: string; title: string } | null>(null);

  // The public URL routes by the business's public slug; a slug-less org still
  // resolves by its raw id (app_help_org accepts both).
  const orgRef = org.slug || orgId;
  const publicUrl = useCallback(
    (slug?: string) => `${window.location.origin}${publicHelpPath(orgRef, slug)}`,
    [orgRef],
  );

  const load = useCallback(async () => {
    const r = await listHelpArticles(orgId);
    setLoading(false);
    if (r.error) { toastError(r.error); return; }
    setArticles(r.articles);
  }, [orgId]);

  useEffect(() => {
    setLoading(true);
    setArticles([]);
    setDraft(null);
    setDraftBlocks([]);
    setLive(null);
    setCat("all");
    load();
  }, [load]);

  const categories = Array.from(new Set(articles.map((a) => a.category))).sort();

  function openArticle(a?: HelpArticle) {
    setLive(null);
    if (a) {
      setDraft({
        id: a.id, slug: a.slug, title: a.title, excerpt: a.excerpt,
        category: a.category, hero: a.hero, body: a.body, status: a.status,
      });
      setDraftBlocks(a.body);
    } else {
      setDraft(emptyDraft());
      // Start with an empty standfirst so the page invites writing.
      setDraftBlocks([{ kind: "lead", text: "" }]);
    }
  }

  /** Save the composer. true → publish; false → draft; undefined → keep status. */
  async function onSave(publish?: boolean) {
    if (!draft || busy) return;
    // Empty text blocks are editing scaffolding, not content.
    const body = draftBlocks.filter(
      (b) => !((b.kind === "p" || b.kind === "lead" || b.kind === "h" || b.kind === "quote") && !b.text.trim()),
    );
    if (!draft.title.trim()) { toastError("The article needs a title."); return; }
    if (body.length === 0) { toastError("Write something first — the article has no body."); return; }
    setBusy(true);
    const r = await saveHelpArticle(orgId, {
      ...draft,
      body,
      status: publish === undefined ? draft.status : publish ? "published" : "draft",
    });
    setBusy(false);
    if (r.error || !r.article) { toastError(r.error ?? "Could not save the article."); return; }
    toast(r.article.status === "published" ? `Published — live at ${publicUrl(r.article.slug)}` : "Draft saved.");
    setDraft(null);
    setDraftBlocks([]);
    if (r.article.status === "published") setLive({ slug: r.article.slug, title: r.article.title });
    load();
  }

  async function onTogglePublish(a: HelpArticle) {
    if (busy) return;
    setBusy(true);
    const r = await saveHelpArticle(orgId, {
      id: a.id, slug: a.slug, title: a.title, excerpt: a.excerpt, category: a.category,
      hero: a.hero, body: a.body,
      status: a.status === "published" ? "draft" : "published",
    });
    setBusy(false);
    if (r.error || !r.article) { toastError(r.error ?? "That didn't work."); return; }
    if (r.article.status === "published") {
      toast(`Published — live at ${publicUrl(r.article.slug)}`);
      setLive({ slug: r.article.slug, title: r.article.title });
    } else {
      toast("Unpublished — back to draft.");
      setLive(null);
    }
    load();
  }

  async function onDelete(a: HelpArticle) {
    if (busy) return;
    const msg = `Delete "${a.title}"? ${a.status === "published" ? "It is live in your help center right now. " : ""}This cannot be undone.`;
    if (!confirmDanger(msg)) return;
    setBusy(true);
    const r = await deleteHelpArticle(orgId, a.id);
    setBusy(false);
    if (!r.ok) { toastError(r.error ?? "That didn't work."); return; }
    toast("Article deleted.");
    load();
  }

  /** Upload plumbing for the in-place editor: hero and body figures. */
  async function onEditorUpload(f: File): Promise<string | null> {
    const r = await uploadHelpImage(orgId, f);
    if (r.error || !r.url) { toastError(r.error ?? "Upload failed."); return null; }
    toast("Image uploaded.");
    return r.url;
  }

  // The in-place editor speaks PostDraft (the blog composer's shape); a help
  // article maps onto it with the fields it doesn't have left inert.
  const editorDraft: PostDraft | null = draft
    ? {
        slug: draft.slug, title: draft.title, excerpt: draft.excerpt,
        category: "playbooks", img: "", hero: draft.hero,
        author: org.name, read_minutes: estimateReadMinutes(draftBlocks),
        body: draftBlocks, status: draft.status,
      }
    : null;

  /** Only the fields a help article owns flow back from the editor. */
  function onEditorDraft(patch: Partial<PostDraft>) {
    setDraft((d) => {
      if (!d) return d;
      const next = { ...d };
      if (patch.title !== undefined) next.title = patch.title;
      if (patch.hero !== undefined) next.hero = patch.hero;
      if (patch.excerpt !== undefined) next.excerpt = patch.excerpt;
      return next;
    });
  }

  const shown = articles.filter((a) => cat === "all" || a.category === cat);

  // ── List view ─────────────────────────────────────────────────────────────
  if (!draft) {
    return (
      <div>
        <style>{CSS}</style>

        {live && (
          <div className="opx-item mb-3">
            <div className="opx-sharebar">
              <strong style={{ fontSize: 14 }}>“{live.title}” is live:</strong>
              <button
                type="button" className="hrx-seeall"
                onClick={() => { navigator.clipboard?.writeText(publicUrl(live.slug)); toast("Link copied."); }}
              >
                Copy link
              </button>
              <a className="hrx-seeall" href={publicUrl(live.slug)} target="_blank" rel="noreferrer">View article ↗</a>
              <a className="hrx-seeall" href={publicUrl()} target="_blank" rel="noreferrer">Help center ↗</a>
              <button type="button" className="opx-secret-x ms-auto" aria-label="Dismiss" onClick={() => setLive(null)}>✕</button>
            </div>
          </div>
        )}

        <Card
          title="Help Center"
          right={
            <div className="d-flex align-items-center gap-2">
              {articles.some((a) => a.status === "published") && (
                <a className="hrx-seeall" href={publicUrl()} target="_blank" rel="noreferrer">View help center ↗</a>
              )}
              <button type="button" className="hrx-pill primary opx-btn" onClick={() => openArticle()}>Write an article</button>
            </div>
          }
        >
          <p className="opx-note">
            Your public knowledge base. Published articles appear at{" "}
            <a href={publicUrl()} target="_blank" rel="noreferrer">{publicUrl().replace(/^https?:\/\//, "")}</a>{" "}
            for customers to read — and your AI agent learns each article the moment it publishes,
            so it answers with the same words.
          </p>

          {categories.length > 0 && (
            <div className="hrx-tabbar mb-3" role="tablist" aria-label="Filter by category">
              {["all", ...categories].map((c) => {
                const count = c === "all" ? articles.length : articles.filter((a) => a.category === c).length;
                return (
                  <button
                    key={c} type="button" role="tab" aria-selected={cat === c}
                    onClick={() => setCat(c)}
                    className={`hrx-tab${cat === c ? " active" : ""}`}
                  >
                    {c === "all" ? "All" : c} <span className="hrx-tab-badge">{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {loading && articles.length === 0 && <p className="opx-note" role="status">Loading your articles…</p>}

          {!loading && articles.length === 0 && (
            <Empty
              title="No help articles yet"
              action={
                <button type="button" className="hrx-pill dark" onClick={() => openArticle()}>
                  Write your first article
                </button>
              }
            >
              Answer the questions customers ask most — how ordering works, delivery, returns,
              opening hours. Each published article is a page your customers (and your AI agent) can use.
            </Empty>
          )}

          <div className="opx-helpgrid">
            {shown.map((a) => {
              const published = a.status === "published";
              return (
                <article key={a.id} className="opx-helpcard">
                  <div className={`hrx-imgcard opx-helpcover${a.hero ? "" : " no-img"}`}>
                    {a.hero && <img src={a.hero} alt="" width={400} height={250} loading="lazy" />}
                    <div className="corner-r">
                      {published ? <Chip tone="ok">Published</Chip> : <Chip tone="warn">Draft</Chip>}
                    </div>
                    <div className="shade">
                      <span className="cat">{a.category}</span>
                      <span className="name">{a.title}</span>
                    </div>
                  </div>
                  <div className="opx-helpmeta">
                    <span>{a.published_at ? day(a.published_at) : "Not published"}</span>
                    <span>{estimateReadMinutes(a.body)} min read</span>
                  </div>
                  <div className="opx-helpacts">
                    <button type="button" className="hrx-seeall opx-btn" disabled={busy} onClick={() => openArticle(a)}>Edit</button>
                    <button
                      type="button"
                      className={`hrx-seeall opx-btn${published ? "" : " opx-solid"}`}
                      disabled={busy}
                      onClick={() => onTogglePublish(a)}
                    >
                      {published ? "Unpublish" : "Publish"}
                    </button>
                    {published && (
                      <a className="hrx-seeall opx-btn" href={publicUrl(a.slug)} target="_blank" rel="noreferrer">View ↗</a>
                    )}
                    <button type="button" className="hrx-seeall opx-btn opx-danger" disabled={busy} onClick={() => onDelete(a)}>
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  // ── Composer view ─────────────────────────────────────────────────────────
  return (
    <div>
      <style>{CSS}</style>
      <Card
        title={draft.id ? "Edit article" : "Write an article"}
        right={<button type="button" className="hrx-seeall" onClick={() => { setDraft(null); setDraftBlocks([]); }}>← All articles</button>}
      >
        {/* Everything that isn't ON the page itself lives in this drawer. */}
        <details className="opx-details">
          <summary>Article details — link, category, excerpt</summary>
          <div className="row g-3 opx-grid">
            <div className="col-md-4">
              <label className="hrx-field">
                <span>Category — groups articles on your help center</span>
                <input
                  className="form-control" list="hc-cats" value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  placeholder="General"
                />
                <datalist id="hc-cats">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </label>
            </div>
            <div className="col-md-8">
              <label className="hrx-field">
                <span>Link (leave empty to make one from the title)</span>
                <input className="form-control" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="auto" />
              </label>
            </div>
            <div className="col-12">
              <label className="hrx-field">
                <span>Excerpt — shows on the help-center index and in link previews</span>
                <textarea className="form-control" rows={2} value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} />
              </label>
            </div>
          </div>
        </details>

        {/* The page itself. Click any text to edit it in place, click an image
            to replace it, hover between blocks for "+", drag ⠿ to reorder. */}
        <div className="opx-editorwrap">
          {editorDraft && (
            <ArticleEditor
              draft={editorDraft}
              blocks={draftBlocks}
              onDraft={onEditorDraft}
              onBlocks={setDraftBlocks}
              onUpload={onEditorUpload}
              crumbRoot="Help Center"
              categoryLabel={draft.category || "General"}
            />
          )}
        </div>

        <div className="d-flex gap-2 flex-wrap" style={{ marginTop: 16 }}>
          <button type="button" className="hrx-pill primary opx-btn" disabled={busy} onClick={() => onSave(true)}>
            {draft.status === "published" ? "Save & publish" : "Publish"}
          </button>
          <button type="button" className="hrx-pill opx-btn" disabled={busy} onClick={() => onSave(draft.status === "published" ? undefined : false)}>
            {draft.status === "published" ? "Save changes" : "Save draft"}
          </button>
          {draft.status === "published" && draft.id && (
            <button type="button" className="hrx-pill opx-btn" disabled={busy} onClick={() => onSave(false)}>
              Unpublish
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
