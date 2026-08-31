import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast, toastError, confirmDanger } from "@/lib/ops/feedback";
import { AccessDialog } from "./platform/AccessDialog";
import { EmailStudio } from "./platform/EmailStudio";
import { Card, Chip, Empty, InitialAvatar, stageTone } from "@/components/dash/Ui";
import {
  fetchPlatformOverview, fetchPlatformTenants, fetchPlatformRevenue,
  fetchPlatformAdmins, addPlatformAdmin, removePlatformAdmin,
  fetchPlatformLeads, savePlatformLead, LEAD_STATUSES,
  fetchPlatformBlueprints, savePlatformBlueprint,
  setTenantStage, setTenantSubscription, setSupportAccess,
  fetchPlatformMargin, fetchPlatformAudit,
  type PlatformOverview, type PlatformTenant, type PlatformPurchase, type PlatformAdmin,
  listPaymentTests, startPaymentTest,
  listPlatformUsers, createPlatformUser, generateRecoveryLink, setUserBanned,
  listHeartbeats, type Heartbeat,
  type PlatformLead, type PlatformBlueprint, type PlatformMargin, type PlatformAuditRow,
  type PaymentTest, type PlatformUser,
} from "@/lib/db/platform";
import {
  listPlatformPosts, savePlatformPost, deletePlatformPost, shareLinks, postUrl, articleToDraft, uploadBlogImage,
  type PlatformPost, type PostDraft,
} from "@/lib/db/platformPosts";
import { estimateReadMinutes } from "@/lib/articleText";
import { ALL_ARTICLES, CATEGORY_LABELS, type Article, type ArticleBlock, type ArticleCategory } from "@/data/articles";
// The composer IS the article page: the editor renders the blog template's
// exact markup, edited in place with drag-and-drop blocks, Studio-style.
import ArticleEditor from "@/components/dash/ArticleEditor";

/** Slugs of the code-shipped editorial set — a DB row with one of these slugs
 *  is an OVERRIDE of that article, not a separate post. */
const BUILTIN_SLUGS = new Set(ALL_ARTICLES.map((a) => a.slug));

/** One row of the console's blog list, whichever side it lives on. */
type BlogItem =
  | { kind: "console" | "override"; post: PlatformPost }
  | { kind: "builtin"; article: Article };

/**
 * The Platform module — running Phoxta itself.
 *
 * The sibling tabs (Inbox, CRM, Marketing, Invoicing, AI Agent, Settings) already
 * serve Phoxta now that it is a real organization. What no tenant console can
 * answer is the cross-tenant question, so that lives here: who the customers
 * are, what they pay, what they cost, what is for sale, and who is allowed to
 * see any of it.
 *
 * Every read and write is gated on app_is_platform_admin() server-side, and every
 * write is appended to platform_audit. Hiding the tab is presentation; the RPCs
 * are the control.
 */

const money = (cents: number, ccy = "GBP") => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(cents / 100);
  } catch { return `${(cents / 100).toFixed(0)}`; }
};
const num = (n: number) => new Intl.NumberFormat().format(n);
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

const SECTIONS = ["Overview", "Customers", "Users", "Scheduler", "Email", "Blog", "Blueprints", "Leads", "Margin", "Payments", "Access"] as const;

/**
 * How stale a worker's heartbeat has to be before it counts as a problem.
 *
 * The loop ticks every five minutes, so twelve is two missed ticks plus room
 * for a slow one. Anything tighter cries wolf on an ordinary hiccup, and
 * anything looser means an hour of silence looks healthy.
 */
const STALE_MINUTES = 12;
type Section = (typeof SECTIONS)[number];

/** Page-local styles on top of the shared .hrx kit. */
const CSS = `
.opx-sub { display: block; font-size: 12px; color: var(--hrx-muted); margin-top: 6px; }
.hrx-stat.tint-blue .opx-sub { color: rgba(255, 255, 255, 0.7); }
.opx-note { font-size: 14px; color: var(--hrx-muted); margin: 0 0 14px; }
.opx-btn:disabled { opacity: 0.55; cursor: default; }
.opx-grid .hrx-field { margin-bottom: 0; }
.opx-item { border: 1px solid var(--hrx-border-soft); border-radius: 16px; padding: 14px 16px; background: var(--hrx-card); }
.opx-solid { background: var(--hrx-ink); color: #fff; border-color: var(--hrx-ink); }
.opx-solid:hover { background: var(--hrx-ink); border-color: var(--hrx-ink); color: #fff; opacity: 0.85; }
.opx-danger { border-color: #f3c1c1; color: #dc2626; }
.opx-danger:hover { background: #dc2626; border-color: #dc2626; color: #fff; }
.opx-msg { font-size: 14px; margin: 0 0 10px; white-space: pre-wrap; }
/* One-time credentials panel — deliberately loud so it isn't left on screen. */
/* Business access — a dialog rather than an inline row, because the roster is
   a table and a searchable picker does not belong inside a table cell. */
.opx-modal { position: fixed; inset: 0; z-index: 1200; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgb(10 12 30 / 55%); }
.opx-modal__box { width: min(620px, 94vw); max-height: 86vh; overflow: auto; background: var(--hrx-card, #fff); border: 1px solid var(--hrx-border); border-radius: 18px; padding: 20px; box-shadow: 0 24px 60px rgb(10 12 30 / 35%); }
.opx-modal__t { font-size: 17px; font-weight: 700; margin: 0 0 2px; color: var(--hrx-ink); }
.opx-modal__h { font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--hrx-muted); margin: 16px 0 8px; }
.opx-modal__box .opx-secret-x { color: var(--hrx-muted); }

.opx-access { list-style: none; margin: 0; padding: 0; border: 1px solid var(--hrx-border); border-radius: 12px; overflow: hidden; }
.opx-access--pick { max-height: 240px; overflow-y: auto; }
.opx-access li { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-bottom: 1px solid var(--hrx-border-soft, var(--hrx-border)); }
.opx-access li:last-child { border-bottom: 0; }
.opx-access__n { flex: 1 1 auto; min-width: 0; font-size: 14px; font-weight: 600; color: var(--hrx-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.opx-access__r { flex: 0 0 auto; font-size: 12px; color: var(--hrx-muted); text-transform: capitalize; }

.opx-secret { background: var(--hrx-ink); color: #fff; border-radius: 16px; padding: 16px 18px; }
.opx-secret-title { font-size: 14px; font-weight: 600; margin: 0 0 10px; }
.opx-secret-x { border: 0; background: transparent; color: #fff; opacity: 0.7; font-size: 14px; cursor: pointer; }
.opx-secret-x:hover { opacity: 1; }
.opx-secret-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; min-width: 0; flex-wrap: wrap; }
.opx-secret-l { font-size: 12px; color: rgba(255,255,255,0.65); min-width: 130px; }
.opx-secret-v { font-size: 13px; color: #ffd9c8; word-break: break-all; flex: 1 1 240px; }
.opx-copy { border-color: rgba(255,255,255,0.4); color: #fff; }
.opx-copy:hover { background: #fff; color: var(--hrx-ink); border-color: #fff; }
.opx-linkbtn { border: 0; background: transparent; padding: 0; color: var(--hrx-blue); font-weight: 600; cursor: pointer; }
.opx-linkbtn:hover { color: var(--hrx-blue-deep); text-decoration: underline; }
/* Blog composer */
.opx-sharebar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.opx-details { border: 1px solid var(--hrx-border-soft); border-radius: 12px; padding: 10px 14px; margin-bottom: 14px; background: var(--hrx-soft); }
.opx-details summary { cursor: pointer; font-size: 13px; font-weight: 600; color: var(--hrx-muted); }
.opx-details[open] summary { margin-bottom: 10px; }
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
/* Blog list — visual cards on the kit's imgcard */
.opx-bloggrid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }
.opx-blogcard { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.opx-blogcover { aspect-ratio: 16 / 10; }
.opx-blogcover .shade .name { font-size: 16px; font-weight: 600; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.opx-blogcard.is-off .opx-blogcover img { filter: grayscale(1); opacity: 0.65; }
.opx-blogmeta { font-size: 12px; color: var(--hrx-muted); display: flex; justify-content: space-between; gap: 8px; }
.opx-blogacts { display: flex; flex-wrap: wrap; gap: 6px; }
/* Live preview — the real blog template, with the marketing page's huge
   section padding trimmed for the console. Links stay visible but inert. */
.opx-preview { background: #fff; border: 1px solid var(--hrx-border-soft); border-radius: 16px; overflow: hidden; }
.opx-preview .sec-1-blog-details { padding-top: 40px !important; padding-bottom: 40px !important; }
/* Small thumbnails beside the image fields */
.opx-thumb { width: 64px; height: 44px; object-fit: cover; border-radius: 8px; border: 1px solid var(--hrx-border-soft); flex-shrink: 0; }
`;

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "dark" | "blue" | "soft" }) {
  return (
    <div className={`hrx-stat${tone ? ` tint-${tone}` : ""}`}>
      <span className="l">{label}</span>
      <div className="v">{value}</div>
      {sub && <span className="opx-sub">{sub}</span>}
    </div>
  );
}

export default function OpsPlatformPage() {
  const [section, setSection] = useState<Section>(
    // Stripe returns here after a test, so land on the section that shows it.
    () => (new URLSearchParams(window.location.search).get("section") as Section) || "Overview",
  );
  const [tests, setTests] = useState<PaymentTest[]>([]);
  const [testAmount, setTestAmount] = useState("1.00");
  const [testNote, setTestNote] = useState("");
  const [testing, setTesting] = useState(false);
  const [ov, setOv] = useState<PlatformOverview | null>(null);
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [revenue, setRevenue] = useState<PlatformPurchase[]>([]);
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [leads, setLeads] = useState<PlatformLead[]>([]);
  const [blueprints, setBlueprints] = useState<PlatformBlueprint[]>([]);
  const [margin, setMargin] = useState<PlatformMargin[]>([]);
  const [audit, setAudit] = useState<PlatformAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [edit, setEdit] = useState<Record<string, Partial<PlatformBlueprint>>>({});

  // ── Users tab state — loaded lazily, the roster can be large. ────────────
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersQ, setUsersQ] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  /** The account whose business access is being edited. */
  const [access, setAccess] = useState<PlatformUser | null>(null);

  // ── Scheduler tab ────────────────────────────────────────────────────────
  const [beats, setBeats] = useState<Heartbeat[]>([]);
  const [beatsLoading, setBeatsLoading] = useState(false);
  const [nEmail, setNEmail] = useState("");
  const [nName, setNName] = useState("");
  /** One-time credentials / recovery output. Shown once, never persisted. */
  const [secret, setSecret] = useState<{ title: string; rows: { label: string; value: string }[] } | null>(null);

  const loadUsers = useCallback(async (page: number, q: string) => {
    setUsersLoading(true);
    const r = await listPlatformUsers(page, q);
    setUsersLoading(false);
    if (r.error) { toastError(r.error); return; }
    setUsers(r.users);
    setUsersTotal(r.total);
  }, []);

  useEffect(() => {
    if (section === "Users") loadUsers(usersPage, usersQ);
    if (section === "Scheduler") {
      setBeatsLoading(true);
      void listHeartbeats().then(({ data, error }) => {
        setBeatsLoading(false);
        if (error) return toastError(error);
        setBeats(data);
      });
    }
    // usersQ intentionally not a dep — searching re-runs via the form submit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, usersPage, loadUsers]);

  async function onCreateUser(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const r = await createPlatformUser(nEmail.trim(), nName.trim());
    setBusy(false);
    if (r.error || !r.email) { toastError(r.error ?? "Could not create the account."); return; }
    toast(`Account created for ${r.email}.`);
    setSecret({
      title: `New account — hand these to ${r.email} now, they are shown once`,
      rows: [
        { label: "Email", value: r.email },
        { label: "Password", value: r.password ?? "" },
      ],
    });
    setNEmail(""); setNName("");
    loadUsers(usersPage, usersQ);
  }

  async function onRecovery(u: PlatformUser) {
    if (busy) return;
    setBusy(true);
    const r = await generateRecoveryLink(u.email);
    setBusy(false);
    if (r.error) { toastError(r.error); return; }
    toast(`Reset credentials minted for ${u.email}.`);
    setSecret({
      title: `Password reset for ${u.email} — relay over your support channel, shown once`,
      rows: [
        ...(r.link ? [{ label: "Reset link", value: r.link }] : []),
        ...(r.otp ? [{ label: "One-time code (OTP)", value: r.otp }] : []),
      ],
    });
  }

  async function onBan(u: PlatformUser) {
    if (busy) return;
    if (u.banned) {
      await act(async () => setUserBanned(u.id, false), `${u.email} can sign in again.`);
    } else {
      if (!confirmDanger(`Ban ${u.email}? They will not be able to sign in until unbanned.`)) return;
      await act(async () => setUserBanned(u.id, true), `${u.email} is banned.`);
    }
    loadUsers(usersPage, usersQ);
  }

  // ── Blog tab state — the composer edits plain text, saved as blocks. ─────
  const [posts, setPosts] = useState<PlatformPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [draft, setDraft] = useState<PostDraft | null>(null);
  const [draftBlocks, setDraftBlocks] = useState<ArticleBlock[]>([]);
  const [share, setShare] = useState<{ slug: string; title: string } | null>(null);
  const [blogCat, setBlogCat] = useState<"all" | ArticleCategory>("all");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  /** Card-image upload (the editor handles hero + body images itself). */
  async function onImageFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setUploading(true);
    const r = await uploadBlogImage(f);
    setUploading(false);
    if (r.error || !r.url) { toastError(r.error ?? "Upload failed."); return; }
    const url = r.url;
    setDraft((d) => (d ? { ...d, img: url } : d));
    toast("Image uploaded.");
  }

  /** Upload plumbing for the in-place editor: hero and body figures. */
  async function onEditorUpload(f: File): Promise<string | null> {
    const r = await uploadBlogImage(f);
    if (r.error || !r.url) { toastError(r.error ?? "Upload failed."); return null; }
    toast("Image uploaded.");
    return r.url;
  }

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    const r = await listPlatformPosts();
    setPostsLoading(false);
    if (r.error) { toastError(r.error); return; }
    setPosts(r.posts);
  }, []);

  useEffect(() => {
    if (section === "Blog") loadPosts();
  }, [section, loadPosts]);

  /** Everything on the blog, one list: console posts and overrides from the
   *  DB, plus every code-shipped article that has no override row yet. */
  const blogItems: BlogItem[] = [
    ...posts.map((p): BlogItem => ({ kind: BUILTIN_SLUGS.has(p.slug) ? "override" : "console", post: p })),
    ...ALL_ARTICLES.filter((a) => !posts.some((p) => p.slug === a.slug)).map((a): BlogItem => ({ kind: "builtin", article: a })),
  ].sort((x, y) => {
    const key = (i: BlogItem) => (i.kind === "builtin" ? i.article.iso : (i.post.published_at ?? i.post.created_at).slice(0, 10));
    return key(y).localeCompare(key(x));
  });

  function openPost(p?: PlatformPost) {
    setShare(null);
    if (p) {
      setDraft({
        id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, category: p.category,
        img: p.img, hero: p.hero, author: p.author, read_minutes: p.read_minutes,
        body: p.body, status: p.status,
      });
      setDraftBlocks(p.body);
    } else {
      setDraft({
        slug: "", title: "", excerpt: "", category: "playbooks",
        img: "/assets/imgs/pages/img-72.webp", hero: "/assets/imgs/pages/img-168.webp",
        author: "Phoxta", read_minutes: 6, body: [], status: "draft",
      });
      // Start with an empty standfirst so the page invites writing.
      setDraftBlocks([{ kind: "lead", text: "" }]);
    }
  }

  /** Open a code-shipped article — saving publishes a live override of it. */
  function openArticle(a: Article) {
    setShare(null);
    setDraft(articleToDraft(a));
    setDraftBlocks(a.body);
  }

  const editingBuiltin = draft ? BUILTIN_SLUGS.has(draft.slug) : false;

  /** Save the composer. true → publish; false → draft (or hidden, for a
   *  built-in's override); undefined → keep the current status. */
  async function onSavePost(publish?: boolean) {
    if (!draft || busy) return;
    // Empty text blocks are editing scaffolding, not content.
    const body = draftBlocks.filter(
      (b) => !((b.kind === "p" || b.kind === "lead" || b.kind === "h" || b.kind === "quote") && !b.text.trim()),
    );
    if (!draft.title.trim()) { toastError("The post needs a title."); return; }
    if (body.length === 0) { toastError("Write something first — the post has no body."); return; }
    const isBuiltin = BUILTIN_SLUGS.has(draft.slug);
    setBusy(true);
    const r = await savePlatformPost({
      ...draft,
      body,
      read_minutes: estimateReadMinutes(body),
      status: publish === undefined ? draft.status : publish ? "published" : isBuiltin ? "hidden" : "draft",
    });
    setBusy(false);
    if (r.error || !r.post) { toastError(r.error ?? "Could not save the post."); return; }
    toast(
      r.post.status === "published" ? `Published — live at ${postUrl(r.post.slug)}`
        : r.post.status === "hidden" ? "Hidden — the article is off the site."
          : "Draft saved.",
    );
    setDraft(null);
    setDraftBlocks([]);
    if (r.post.status === "published") setShare({ slug: r.post.slug, title: r.post.title });
    loadPosts();
  }

  /** Delete a console post — or, for an override, restore the built-in. */
  async function onDeletePost(p: PlatformPost, isOverride: boolean) {
    if (busy) return;
    const msg = isOverride
      ? `Revert "${p.title}" to the original built-in version? Your console edits to it will be lost.`
      : `Delete "${p.title}"? ${p.status === "published" ? "It is live on the blog right now. " : ""}This cannot be undone.`;
    if (!confirmDanger(msg)) return;
    setBusy(true);
    const r = await deletePlatformPost(p.id);
    setBusy(false);
    if (!r.ok) { toastError(r.error ?? "That didn't work."); return; }
    toast(isOverride ? "Reverted — the original article is back." : "Post deleted.");
    loadPosts();
  }

  /** Take a built-in article off the site without editing it. */
  async function onHideBuiltin(a: Article) {
    if (busy) return;
    if (!confirmDanger(`Hide "${a.title}" from the blog? Readers will no longer see it; you can restore it any time.`)) return;
    setBusy(true);
    const r = await savePlatformPost({ ...articleToDraft(a), status: "hidden" });
    setBusy(false);
    if (r.error || !r.post) { toastError(r.error ?? "That didn't work."); return; }
    toast("Hidden — the article is off the site.");
    loadPosts();
  }

  async function onTogglePublish(p: PlatformPost, isOverride: boolean) {
    if (busy) return;
    setBusy(true);
    const r = await savePlatformPost({
      id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, category: p.category,
      img: p.img, hero: p.hero, author: p.author, read_minutes: p.read_minutes, body: p.body,
      // A console post rests as a private draft; a built-in's override can't —
      // "off" for a built-in means hidden from the site.
      status: p.status === "published" ? (isOverride ? "hidden" : "draft") : "published",
    });
    setBusy(false);
    if (r.error || !r.post) { toastError(r.error ?? "That didn't work."); return; }
    if (r.post.status === "published") {
      toast(`Published — live at ${postUrl(r.post.slug)}`);
      setShare({ slug: r.post.slug, title: r.post.title });
    } else {
      toast(r.post.status === "hidden" ? "Hidden — the article is off the site." : "Unpublished — back to draft.");
      setShare(null);
    }
    loadPosts();
  }

  const reload = useCallback(async () => {
    const [t, r, a, l, b, m, au, pt] = await Promise.all([
      fetchPlatformTenants(), fetchPlatformRevenue(), fetchPlatformAdmins(),
      fetchPlatformLeads(), fetchPlatformBlueprints(), fetchPlatformMargin(), fetchPlatformAudit(),
      listPaymentTests(),
    ]);
    setTenants(t.data); setRevenue(r.data); setAdmins(a.data);
    setLeads(l.data); setBlueprints(b.data); setMargin(m.data); setAudit(au.data);
    setTests(pt.data);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const o = await fetchPlatformOverview();
      if (!active) return;
      if (!o.data) { setDenied(true); setLoading(false); return; }
      setOv(o.data);
      await reload();
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [reload]);

  /** Every mutation goes through here so the audit trail and the UI stay in step. */
  async function act(fn: () => Promise<{ ok: boolean; error: string | null }>, okMsg: string) {
    if (busy) return;
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (!r.ok) { toastError(r.error ?? "That didn't work."); return; }
    toast(okMsg);
    reload();
  }

  if (loading) {
    return (
      <div className="hrx-card hrx-pad text-center" style={{ color: "var(--hrx-muted)" }} role="status">
        Loading platform data…
      </div>
    );
  }

  if (denied) {
    return (
      <div className="hrx-card hrx-pad">
        <Empty title="Platform">
          This module is for Phoxta platform administrators. Your account isn't on that list.
        </Empty>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      <style>{CSS}</style>

      <nav className="hrx-tabbar" aria-label="Platform sections">
        {SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={section === s}
            onClick={() => setSection(s)}
            className={`hrx-tab${section === s ? " active" : ""}`}
          >
            {s}
          </button>
        ))}
      </nav>

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      {section === "Overview" && ov && (
        <>
          <div className="hrx-statrow">
            <Stat tone="dark" label="Customers" value={num(ov.tenants_total)} sub={`${num(ov.tenants_active)} active · ${num(ov.tenants_new_30d)} new in 30d`} />
            <Stat tone="blue" label="Revenue (all time)" value={money(ov.revenue_cents)} sub={`${money(ov.revenue_30d_cents)} in the last 30 days`} />
            <Stat label="Active subscriptions" value={num(ov.subs_active)} sub={`${num(ov.purchases_total)} purchases total`} />
            <Stat label="Leads" value={num(ov.leads_total)} sub={`${num(ov.leads_new_30d)} in the last 30 days`} />
            <Stat label="Blueprints live" value={num(ov.blueprints_live)} sub="buyable right now" />
            <Stat label="Custom domains live" value={num(ov.domains_live)} />
            <Stat label="AI tokens (30d)" value={num(ov.ai_tokens_30d)} sub="across all tenants" />
          </div>

          <Card title="Purchases" right={<Chip tone="line">{revenue.length}</Chip>}>
            {revenue.length === 0 ? <Empty title="No purchases yet">Marketplace sales land here the moment they happen.</Empty> : (
              <div className="hrx-tablewrap">
                <table className="hrx-table">
                  <thead><tr><th>Blueprint</th><th>Customer</th><th>Status</th><th className="text-end">Amount</th><th>When</th></tr></thead>
                  <tbody>
                    {revenue.map((p) => (
                      <tr key={p.id}>
                        <td className="fw-semibold">{p.blueprint_name || "—"}</td>
                        <td style={{ color: "var(--hrx-muted)" }}>{p.org_name || "—"}</td>
                        <td><Chip tone={stageTone(p.status)}>{p.status}</Chip></td>
                        <td className="text-end">{money(p.amount_cents, p.currency)}</td>
                        <td style={{ color: "var(--hrx-muted)" }}>{day(p.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ── Customers ────────────────────────────────────────────────────── */}
      {section === "Customers" && (
        <Card title="Customers" right={<Chip tone="line">{tenants.length}</Chip>}>
          {tenants.length === 0 ? <Empty title="No customers yet">New businesses appear here as soon as they sign up.</Empty> : (
            <div className="hrx-tablewrap">
              <table className="hrx-table">
                <thead>
                  <tr>
                    <th>Business</th><th>Stage</th><th>Plan</th><th>Subscription</th>
                    <th className="text-end">Tokens 30d</th><th>Joined</th><th />
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="fw-semibold">{t.name}</div>
                        <div className="text-capitalize" style={{ color: "var(--hrx-muted)", fontSize: 13 }}>{t.vertical || "—"}</div>
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm" style={{ minWidth: 110 }}
                          value={t.stage} disabled={busy}
                          aria-label={`Stage for ${t.name}`}
                          onChange={(e) => act(() => setTenantStage(t.id, e.target.value), `${t.name} is now ${e.target.value}.`)}
                        >
                          {["active", "trial", "archived"].map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm" style={{ minWidth: 120 }}
                          value={t.plan ?? "starter"} disabled={busy}
                          aria-label={`Plan for ${t.name}`}
                          onChange={(e) => act(() => setTenantSubscription(t.id, e.target.value, null), `${t.name} moved to ${e.target.value}.`)}
                        >
                          {["starter", "growth", "scale", "enterprise"].map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm" style={{ minWidth: 120 }}
                          value={t.sub_status ?? "active"} disabled={busy}
                          aria-label={`Subscription status for ${t.name}`}
                          onChange={(e) => act(() => setTenantSubscription(t.id, null, e.target.value), `${t.name} subscription ${e.target.value}.`)}
                        >
                          {["trialing", "active", "past_due", "canceled"].map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="text-end">{num(t.tokens_30d)}</td>
                      <td style={{ color: "var(--hrx-muted)" }}>{day(t.created_at)}</td>
                      <td className="text-end">
                        <div className="d-flex gap-2 justify-content-end">
                          <button
                            type="button" className="hrx-seeall opx-btn" disabled={busy}
                            title="Adds you as a member of this business so you can open their console. Revocable, and recorded in the audit log."
                            onClick={() => act(() => setSupportAccess(t.id, true), `Support access granted on ${t.name}.`)}
                          >
                            Support access
                          </button>
                          <Link className="hrx-seeall opx-solid" to={`/dashboard/businesses/${t.id}/ops`}>Open</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Users — every account on the platform ────────────────────────── */}
      {section === "Email" && <EmailStudio />}

      {section === "Scheduler" && (
        <>
          <Card title="The background loop">
            <p className="opx-note">
              Every scheduled worker records that it ran. This page exists because the loop moved hosts and
              nothing in the product would have said so if it had simply stopped — the only signal was a
              dashboard on the old host going quiet. A worker that has not reported for {STALE_MINUTES} minutes
              is flagged here.
            </p>
            {beatsLoading ? (
              <p className="opx-note mb-0" role="status">Loading…</p>
            ) : beats.length === 0 ? (
              <Empty title="No heartbeats yet">
                Workers record one the first time they run after this was added. If this stays empty for more
                than a few minutes, the loop is not running at all.
              </Empty>
            ) : (
              <div className="hrx-tablewrap">
                <table className="hrx-table">
                  <thead>
                    <tr><th>Worker</th><th>Last run</th><th>Status</th><th>Detail</th><th className="text-end">Runs</th></tr>
                  </thead>
                  <tbody>
                    {beats.map((b) => {
                      const mins = Math.round((Date.now() - new Date(b.last_run_at).getTime()) / 60000);
                      const stale = mins > STALE_MINUTES;
                      const bad = b.last_status !== "ok" || b.consecutive_failures > 0;
                      return (
                        <tr key={b.worker}>
                          <td className="fw-semibold">{b.worker}</td>
                          <td style={{ color: "var(--hrx-muted)" }}>
                            {mins < 1 ? "just now" : mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`}
                          </td>
                          <td>
                            {stale
                              ? <Chip tone="danger">Silent {mins}m</Chip>
                              : bad
                                ? <Chip tone="warn">Failing ×{b.consecutive_failures}</Chip>
                                : <Chip tone="ok">Healthy</Chip>}
                          </td>
                          <td style={{ color: "var(--hrx-muted)", fontSize: 13 }}>{b.last_detail || "—"}</td>
                          <td className="text-end" style={{ color: "var(--hrx-muted)" }}>{num(b.runs)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="What runs, and how often">
            <p className="opx-note mb-0">
              Driven by cron on the Oracle host (<code>/etc/cron.d/phoxta-worker-cron</code>), which calls each
              Supabase worker with the shared cron secret. Every five minutes: the embedding queue, the agent
              task queue, Gmail sync, scheduled automations, housekeeping, and the autopilot tick. Daily:
              renewal and trial-ending alerts. The autopilot tick is what writes the heartbeat above, so if it
              is silent the whole loop is.
            </p>
          </Card>
        </>
      )}

      {section === "Users" && (
        <>
          <div className="hrx-statrow">
            <Stat tone="dark" label="Accounts on the platform" value={usersLoading && usersTotal === 0 ? "…" : num(usersTotal)} />
            <Stat label="On this page" value={num(users.length)} />
            <Stat label="Banned (this page)" value={num(users.filter((u) => u.banned).length)} />
          </div>

          {/* One-time credentials/recovery output. SMTP is not dependable, so
              nothing is emailed — the admin relays these over the support channel. */}
          {secret && (
            <div className="opx-secret" role="status">
              <div className="d-flex align-items-start justify-content-between gap-2">
                <p className="opx-secret-title">{secret.title}</p>
                <button type="button" className="opx-secret-x" aria-label="Dismiss" onClick={() => setSecret(null)}>✕</button>
              </div>
              {secret.rows.map((r) => (
                <div key={r.label} className="opx-secret-row">
                  <span className="opx-secret-l">{r.label}</span>
                  <code className="opx-secret-v">{r.value}</code>
                  <button
                    type="button"
                    className="hrx-seeall opx-copy"
                    onClick={() => { navigator.clipboard?.writeText(r.value); toast(`${r.label} copied.`); }}
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
          )}

          <Card title="Create an account">
            <p className="opx-note">
              For onboarding a customer by hand. The account is confirmed immediately; the generated password is shown once above.
              Creating it is only half the job — a new account belongs to no business, so give it one with
              <strong> Access</strong> below or they will sign in to “No business to run yet”.
            </p>
            <form className="d-flex flex-wrap align-items-end gap-2" onSubmit={onCreateUser}>
              <label className="hrx-field mb-0" style={{ minWidth: 240 }}>
                <span>Email</span>
                <input className="form-control" type="email" required value={nEmail} onChange={(e) => setNEmail(e.target.value)} placeholder="customer@company.com" />
              </label>
              <label className="hrx-field mb-0" style={{ minWidth: 200 }}>
                <span>Full name (optional)</span>
                <input className="form-control" value={nName} onChange={(e) => setNName(e.target.value)} placeholder="Ada Lovelace" />
              </label>
              <button type="submit" className="hrx-pill primary opx-btn" disabled={busy}>Create account</button>
            </form>
          </Card>

          <Card
            title="Accounts"
            right={
              <form
                className="d-flex gap-2"
                onSubmit={(e) => { e.preventDefault(); setUsersPage(1); loadUsers(1, usersQ); }}
              >
                <label className="visually-hidden" htmlFor="opx-user-q">Search accounts</label>
                <input
                  id="opx-user-q" className="form-control form-control-sm" style={{ width: 220 }}
                  placeholder="Search email, name, business…" value={usersQ} onChange={(e) => setUsersQ(e.target.value)}
                />
                <button type="submit" className="hrx-seeall">Search</button>
              </form>
            }
          >
            {usersLoading ? (
              <p className="opx-note mb-0" role="status">Loading accounts…</p>
            ) : users.length === 0 ? (
              <Empty title="No accounts found">{usersQ ? "Nothing on this page matches that search." : "Sign-ups appear here."}</Empty>
            ) : (
              <div className="hrx-tablewrap">
                <table className="hrx-table">
                  <thead>
                    <tr>
                      <th>User</th><th>Businesses</th><th>Status</th><th>Joined</th><th>Last sign-in</th><th />
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                            <InitialAvatar name={u.full_name || u.email} size={32} />
                            <div style={{ minWidth: 0 }}>
                              <div className="fw-semibold text-truncate">{u.full_name || "—"}</div>
                              <div className="text-truncate" style={{ color: "var(--hrx-muted)", fontSize: 13 }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {/* "No businesses" is the state that sends someone to
                              "No business to run yet", so it says so rather than
                              printing a dash and leaving the admin to infer it. */}
                          {u.access.length === 0
                            ? <Chip tone="warn">No access</Chip>
                            : <div className="d-flex flex-wrap gap-1">
                                {u.access.slice(0, 3).map((a) => (
                                  <Chip key={a.orgId} tone="line">{a.name} · {a.role}</Chip>
                                ))}
                                {u.access.length > 3 && <Chip tone="plain">+{u.access.length - 3}</Chip>}
                              </div>}
                        </td>
                        <td>
                          {u.banned
                            ? <Chip tone="danger">Banned</Chip>
                            : u.confirmed ? <Chip tone="ok">Active</Chip> : <Chip tone="warn">Unconfirmed</Chip>}
                        </td>
                        <td style={{ color: "var(--hrx-muted)" }}>{day(u.created_at)}</td>
                        <td style={{ color: "var(--hrx-muted)" }}>{u.last_sign_in_at ? day(u.last_sign_in_at) : "Never"}</td>
                        <td className="text-end">
                          <div className="d-flex gap-2 justify-content-end">
                            <button
                              type="button" className="hrx-seeall opx-btn" disabled={busy}
                              title="Choose which businesses this account can open."
                              onClick={() => setAccess(u)}
                            >
                              Access
                            </button>
                            <button
                              type="button" className="hrx-seeall opx-btn" disabled={busy}
                              title="Mints a password-reset link and one-time code to relay to this user."
                              onClick={() => onRecovery(u)}
                            >
                              Reset password
                            </button>
                            <button
                              type="button" className={`hrx-seeall opx-btn ${u.banned ? "opx-solid" : "opx-danger"}`}
                              disabled={busy} onClick={() => onBan(u)}
                            >
                              {u.banned ? "Unban" : "Ban"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {usersTotal > 50 && (
              <div className="d-flex align-items-center justify-content-between mt-3">
                <button type="button" className="hrx-seeall opx-btn" disabled={usersPage <= 1 || usersLoading} onClick={() => setUsersPage((p) => Math.max(1, p - 1))}>
                  ← Previous
                </button>
                <span style={{ color: "var(--hrx-muted)", fontSize: 13 }}>Page {usersPage} of {Math.max(1, Math.ceil(usersTotal / 50))}</span>
                <button type="button" className="hrx-seeall opx-btn" disabled={usersPage >= Math.ceil(usersTotal / 50) || usersLoading} onClick={() => setUsersPage((p) => p + 1)}>
                  Next →
                </button>
              </div>
            )}
          </Card>

          {access && (
            <AccessDialog
              user={access}
              onClose={() => setAccess(null)}
              onChanged={() => loadUsers(usersPage, usersQ)}
            />
          )}

          <Card title="Supporting a user">
            <p className="opx-note mb-0">
              To work inside a customer's business (fix a product, answer their inbox, adjust settings), find the business
              on the <button type="button" className="opx-linkbtn" onClick={() => setSection("Customers")}>Customers</button> tab
              and grant yourself <strong>Support access</strong> — a real, revocable membership their team can see, recorded in the audit log.
              Their support conversations also land in this console's own Inbox tab.
            </p>
          </Card>
        </>
      )}

      {/* ── Blog — write, publish and share posts on phoxta.com/blog ─────── */}
      {section === "Blog" && !draft && (
        <>
          {share && (
            <div className="opx-item">
              <div className="opx-sharebar">
                <strong style={{ fontSize: 14 }}>Share “{share.title}”:</strong>
                {shareLinks(share.slug, share.title).map((s) => (
                  <a key={s.name} className="hrx-seeall" href={s.href} target="_blank" rel="noreferrer">{s.name}</a>
                ))}
                <button
                  type="button" className="hrx-seeall"
                  onClick={() => { navigator.clipboard?.writeText(postUrl(share.slug)); toast("Link copied."); }}
                >
                  Copy link
                </button>
                <a className="hrx-seeall" href={postUrl(share.slug)} target="_blank" rel="noreferrer">View post ↗</a>
                <button type="button" className="opx-secret-x" style={{ marginLeft: "auto", color: "var(--hrx-muted)" }} aria-label="Dismiss" onClick={() => setShare(null)}>✕</button>
              </div>
            </div>
          )}

          <Card
            title="Blog posts"
            right={<button type="button" className="hrx-pill primary opx-btn" onClick={() => openPost()}>Write a post</button>}
          >
            <p className="opx-note">
              Every article on <a href="https://www.phoxta.com/blog" target="_blank" rel="noreferrer">phoxta.com/blog</a> is managed here.
              The built-in editorial set ships in code: editing one publishes your version in its place, Hide takes it off
              the site, and Revert restores the original. Console posts are yours outright.
            </p>
            <div className="hrx-tabbar mb-3" role="tablist" aria-label="Filter by category">
              {(["all", ...Object.keys(CATEGORY_LABELS)] as ("all" | ArticleCategory)[]).map((c) => {
                const count = c === "all"
                  ? blogItems.length
                  : blogItems.filter((i) => (i.kind === "builtin" ? i.article.category : i.post.category) === c).length;
                return (
                  <button
                    key={c} type="button" role="tab" aria-selected={blogCat === c}
                    onClick={() => setBlogCat(c)}
                    className={`hrx-tab${blogCat === c ? " active" : ""}`}
                  >
                    {c === "all" ? "All" : CATEGORY_LABELS[c]} <span className="hrx-tab-badge">{count}</span>
                  </button>
                );
              })}
            </div>

            {postsLoading && posts.length === 0 && <p className="opx-note" role="status">Checking for console edits…</p>}

            <div className="opx-bloggrid">
              {blogItems
                .filter((i) => blogCat === "all" || (i.kind === "builtin" ? i.article.category : i.post.category) === blogCat)
                .map((item) => {
                  const a = item.kind === "builtin" ? item.article : null;
                  const p = item.kind === "builtin" ? null : item.post;
                  const slug = a ? a.slug : p!.slug;
                  const title = a ? a.title : p!.title;
                  const category = (a ? a.category : p!.category) as ArticleCategory;
                  const cover = a ? a.img : p!.img;
                  const mins = a ? a.readMinutes : p!.read_minutes;
                  const live = a ? true : p!.status === "published";
                  const off = !!p && p.status === "hidden";
                  return (
                    <article key={slug} className={`opx-blogcard${off ? " is-off" : ""}`}>
                      <div className="hrx-imgcard opx-blogcover">
                        <img src={cover} alt="" width={400} height={250} loading="lazy" />
                        <div className="corner-r">
                          {a && <Chip tone="solid">Built-in</Chip>}
                          {p && item.kind === "override" && (p.status === "published" ? <Chip tone="blue">Edited</Chip> : <Chip tone="danger">Hidden</Chip>)}
                          {p && item.kind === "console" && (p.status === "published" ? <Chip tone="ok">Published</Chip> : <Chip tone="warn">Draft</Chip>)}
                        </div>
                        <div className="shade">
                          <span className="cat">{CATEGORY_LABELS[category] ?? category}</span>
                          <span className="name">{title}</span>
                        </div>
                      </div>
                      <div className="opx-blogmeta">
                        <span>{a ? day(a.iso) : p!.published_at ? day(p!.published_at) : "Not published"}</span>
                        <span>{mins} min read</span>
                      </div>
                      <div className="opx-blogacts">
                        <button type="button" className="hrx-seeall opx-btn" disabled={busy} onClick={() => (a ? openArticle(a) : openPost(p!))}>Edit</button>
                        {a && (
                          <button type="button" className="hrx-seeall opx-btn" disabled={busy} onClick={() => onHideBuiltin(a)}>Hide</button>
                        )}
                        {p && (
                          <button type="button" className={`hrx-seeall opx-btn${live ? "" : " opx-solid"}`} disabled={busy} onClick={() => onTogglePublish(p, item.kind === "override")}>
                            {live ? (item.kind === "override" ? "Hide" : "Unpublish") : "Publish"}
                          </button>
                        )}
                        {live && (
                          <button type="button" className="hrx-seeall opx-btn" onClick={() => setShare({ slug, title })}>Share</button>
                        )}
                        {p && live && (
                          <Link className="hrx-seeall opx-btn" to={`/dashboard/ops/designs?email=post&slug=${slug}`}>
                            Send as email
                          </Link>
                        )}
                        {live && (
                          <a className="hrx-seeall opx-btn" href={postUrl(slug)} target="_blank" rel="noreferrer">View</a>
                        )}
                        {p && (
                          <button type="button" className="hrx-seeall opx-btn opx-danger" disabled={busy} onClick={() => onDeletePost(p, item.kind === "override")}>
                            {item.kind === "override" ? "Revert" : "Delete"}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
            </div>
          </Card>
        </>
      )}

      {section === "Blog" && draft && (
        <Card
          title={editingBuiltin ? "Edit article" : draft.id ? "Edit post" : "Write a post"}
          right={<button type="button" className="hrx-seeall" onClick={() => { setDraft(null); setDraftBlocks([]); }}>← All posts</button>}
        >
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={onImageFile} />

          {/* Everything that isn't ON the page itself lives in this drawer. */}
          <details className="opx-details">
            <summary>Post details — link, category, excerpt, card image</summary>
            <div className="row g-3 opx-grid">
              <div className="col-md-4">
                <label className="hrx-field">
                  <span>Category</span>
                  <select className="form-select" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as ArticleCategory })}>
                    {(Object.keys(CATEGORY_LABELS) as ArticleCategory[]).map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="col-md-8">
                <label className="hrx-field">
                  <span>{editingBuiltin ? "Link (fixed — this edits the built-in article)" : "Link (leave empty to make one from the title)"}</span>
                  <input className="form-control" value={draft.slug} disabled={editingBuiltin} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="auto" />
                </label>
              </div>
              <div className="col-md-6">
                <label className="hrx-field">
                  <span>Excerpt — shows on the blog index and in link previews</span>
                  <textarea className="form-control" rows={2} value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} />
                </label>
              </div>
              <div className="col-md-6">
                <div className="d-flex align-items-end gap-2">
                  <label className="hrx-field flex-grow-1 mb-0">
                    <span>Card image (the blog-index tile)</span>
                    <input className="form-control" value={draft.img} onChange={(e) => setDraft({ ...draft, img: e.target.value })} />
                  </label>
                  <img className="opx-thumb" src={draft.img} alt="" width={64} height={44} loading="lazy" />
                  <button type="button" className="hrx-seeall opx-btn" disabled={uploading} onClick={() => fileInput.current?.click()}>
                    {uploading ? "…" : "Upload"}
                  </button>
                </div>
              </div>
            </div>
          </details>

          {/* The page itself. Click any text to edit it in place, click an
              image to replace it, hover between blocks for “+”, drag ⠿ to
              reorder — the Studio treatment on the real article template. */}
          <div className="opx-editorwrap">
            <ArticleEditor
              draft={draft}
              blocks={draftBlocks}
              onDraft={(p) => setDraft((d) => (d ? { ...d, ...p } : d))}
              onBlocks={setDraftBlocks}
              onUpload={onEditorUpload}
            />
          </div>

          <div className="d-flex gap-2 flex-wrap" style={{ marginTop: 16 }}>
            <button type="button" className="hrx-pill primary opx-btn" disabled={busy} onClick={() => onSavePost(true)}>
              {draft.status === "published" || editingBuiltin ? "Save & publish" : "Publish"}
            </button>
            {!editingBuiltin && (
              <button type="button" className="hrx-pill opx-btn" disabled={busy} onClick={() => onSavePost(draft.status === "published" ? undefined : false)}>
                {draft.status === "published" ? "Save changes" : "Save draft"}
              </button>
            )}
            {(draft.status === "published" || draft.status === "hidden") && (editingBuiltin || draft.id) && (
              <button type="button" className="hrx-pill opx-btn" disabled={busy} onClick={() => onSavePost(false)}>
                {editingBuiltin ? "Save & hide from site" : "Unpublish"}
              </button>
            )}
          </div>
        </Card>
      )}

      {/* ── Blueprints ───────────────────────────────────────────────────── */}
      {section === "Blueprints" && (
        <Card title="Blueprints" right={<Chip tone="line">{blueprints.length}</Chip>}>
          <p className="opx-note">
            What the marketplace sells, and what the platform agent quotes — it reads this table live.
          </p>
          {blueprints.length === 0 && <Empty title="No blueprints yet">Blueprints added to the catalog appear here for pricing and publishing.</Empty>}
          <div className="d-flex flex-column gap-3">
            {blueprints.map((b) => {
              const e = edit[b.id] ?? {};
              const val = <K extends keyof PlatformBlueprint>(k: K) => (e[k] ?? b[k]) as PlatformBlueprint[K];
              const dirty = Object.keys(e).length > 0;
              return (
                <div key={b.id} className="opx-item">
                  <div className="row g-2 align-items-end opx-grid">
                    <div className="col-md-3">
                      <label className="hrx-field">
                        <span>Name</span>
                        <input className="form-control form-control-sm" value={String(val("name"))}
                               onChange={(ev) => setEdit((s) => ({ ...s, [b.id]: { ...e, name: ev.target.value } }))} />
                      </label>
                    </div>
                    <div className="col-md-5">
                      <label className="hrx-field">
                        <span>Tagline</span>
                        <input className="form-control form-control-sm" value={String(val("tagline"))}
                               onChange={(ev) => setEdit((s) => ({ ...s, [b.id]: { ...e, tagline: ev.target.value } }))} />
                      </label>
                    </div>
                    <div className="col-md-2">
                      <label className="hrx-field">
                        <span>Price ({b.currency})</span>
                        <input type="number" min={0} className="form-control form-control-sm"
                               value={Number(val("price_cents")) / 100}
                               onChange={(ev) => setEdit((s) => ({ ...s, [b.id]: { ...e, price_cents: Math.round(Number(ev.target.value) * 100) } }))} />
                      </label>
                    </div>
                    <div className="col-md-2">
                      <label className="hrx-field">
                        <span>Status</span>
                        <select className="form-select form-select-sm" value={String(val("status"))}
                                onChange={(ev) => setEdit((s) => ({ ...s, [b.id]: { ...e, status: ev.target.value } }))}>
                          {["draft", "live", "archived"].map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </label>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3 mt-3">
                    <Chip tone={stageTone(String(val("status")))}>{String(val("status"))}</Chip>
                    {b.demo_url && <a className="hrx-seeall" href={b.demo_url} target="_blank" rel="noreferrer">Demo ↗</a>}
                    <button
                      type="button" className="hrx-pill dark opx-btn ms-auto" disabled={busy || !dirty}
                      onClick={() => act(
                        () => savePlatformBlueprint(b.id, e.name ?? null, e.tagline ?? null, e.price_cents ?? null, e.status ?? null),
                        `${b.name} saved.`,
                      ).then(() => setEdit((s) => { const n = { ...s }; delete n[b.id]; return n; }))}
                    >
                      {dirty ? "Save" : "Saved"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Leads ────────────────────────────────────────────────────────── */}
      {section === "Leads" && (
        <Card title="Leads" right={<Chip tone="line">{leads.length}</Chip>}>
          <p className="opx-note">
            From the contact form, Startup School, careers and the demo gate. Counted on the Overview; worked here.
          </p>
          {leads.length === 0 ? <Empty title="No leads yet">Contact-form, Startup School, careers and demo-unlock submissions land here.</Empty> : (
            <div className="d-flex flex-column gap-3">
              {leads.map((l) => (
                <div key={l.id} className="opx-item">
                  <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                    <InitialAvatar name={l.name || l.email} size={32} />
                    <span className="fw-semibold">{l.name || "Someone"}</span>
                    <span style={{ color: "var(--hrx-muted)", fontSize: 13 }}>{l.email}{l.phone ? ` · ${l.phone}` : ""}</span>
                    <Chip tone="line">{l.source}</Chip>
                    <span className="ms-auto" style={{ color: "var(--hrx-muted)", fontSize: 13 }}>{day(l.created_at)}</span>
                  </div>
                  {l.message && <p className="opx-msg">{l.message}</p>}
                  <div className="d-flex gap-2 align-items-center flex-wrap">
                    <select
                      className="form-select form-select-sm" style={{ maxWidth: 150 }}
                      value={l.status} disabled={busy}
                      aria-label={`Status of lead from ${l.email}`}
                      onChange={(ev) => act(() => savePlatformLead(l.id, ev.target.value, null), "Lead updated.")}
                    >
                      {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input
                      className="form-control form-control-sm" style={{ maxWidth: 380 }}
                      placeholder="Note…" defaultValue={l.notes}
                      aria-label={`Note on lead from ${l.email}`}
                      onBlur={(ev) => { if (ev.target.value !== l.notes) act(() => savePlatformLead(l.id, null, ev.target.value), "Note saved."); }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Margin ───────────────────────────────────────────────────────── */}
      {section === "Margin" && (
        <Card title="AI margin (30 days)" right={<Chip tone="line">{margin.length}</Chip>}>
          <p className="opx-note">
            What each customer paid against what their AI usage cost. A proxy, not accounting — infrastructure
            isn't attributed per tenant, so read it as AI margin rather than profit.
          </p>
          {margin.length === 0 ? <Empty title="Nothing to show yet">Revenue and AI usage per customer appear here once there is activity.</Empty> : (
          <div className="hrx-tablewrap">
            <table className="hrx-table">
              <thead><tr><th>Business</th><th className="text-end">Revenue</th><th className="text-end">AI cost</th><th className="text-end">Margin</th><th className="text-end">Tokens</th></tr></thead>
              <tbody>
                {margin.map((m) => {
                  const net = m.revenue_cents - m.ai_cost_cents;
                  return (
                    <tr key={m.organization_id}>
                      <td className="fw-semibold">{m.name}</td>
                      <td className="text-end">{money(m.revenue_cents)}</td>
                      <td className="text-end">{money(m.ai_cost_cents)}</td>
                      <td className={`text-end fw-semibold ${net < 0 ? "text-danger" : ""}`}>{money(net)}</td>
                      <td className="text-end" style={{ color: "var(--hrx-muted)" }}>{num(m.tokens)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </Card>
      )}

      {/* ── Payments ─────────────────────────────────────────────────────── */}
      {section === "Payments" && (
        <>
          <Card title="Test a payment">
            <p className="opx-note">
              Puts a real charge through Stripe and then waits to see whether{" "}
              <b>stripe-webhook</b> ran. Those are different things: a card can be charged while the
              webhook never fires — which is what a live key wired to a test-mode signing secret
              looks like — and the webhook is the half that provisions businesses.
            </p>
            <form
              className="row g-2 align-items-end opx-grid"
              onSubmit={async (e: FormEvent) => {
                e.preventDefault();
                const pence = Math.round(parseFloat(testAmount || "0") * 100);
                if (!Number.isFinite(pence) || pence < 50) {
                  toastError("Enter at least £0.50 — Stripe refuses anything smaller.");
                  return;
                }
                setTesting(true);
                const { url, error } = await startPaymentTest(pence, testNote.trim());
                setTesting(false);
                if (error || !url) {
                  toastError(error ?? "Could not start the test.");
                  return;
                }
                window.location.assign(url);
              }}
            >
              <div className="col-sm-3">
                <label className="hrx-field">
                  <span>Amount (£)</span>
                  <input
                    className="form-control" inputMode="decimal"
                    value={testAmount} onChange={(e) => setTestAmount(e.target.value)}
                  />
                </label>
              </div>
              <div className="col-sm-6">
                <label className="hrx-field">
                  <span>Note (optional)</span>
                  <input
                    className="form-control" placeholder="What are you checking?"
                    value={testNote} onChange={(e) => setTestNote(e.target.value)}
                  />
                </label>
              </div>
              <div className="col-sm-3">
                <button className="hrx-pill dark opx-btn w-100 justify-content-center" disabled={testing}>
                  {testing ? "Starting…" : "Pay with Stripe"}
                </button>
              </div>
            </form>
            <p className="opx-note mb-0 mt-3">
              Capped at £100. With a live key this charges a real card — use test card
              <code className="ms-1">4242 4242 4242 4242</code> while your key is <code>sk_test_…</code>.
            </p>
          </Card>

          <Card
            title="Recent tests"
            right={
              <button type="button" className="hrx-seeall"
                      onClick={async () => { const { data } = await listPaymentTests(); setTests(data); toast("Refreshed."); }}>
                Refresh
              </button>
            }
          >
            {tests.length === 0 ? (
              <Empty title="No tests yet">Run a payment test above and it appears here with its webhook result.</Empty>
            ) : (
              <div className="hrx-tablewrap">
                <table className="hrx-table">
                  <thead>
                    <tr>
                      <th>When</th><th>Amount</th><th>Note</th><th>Charged</th><th>Webhook ran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map((t) => (
                      <tr key={t.id}>
                        <td style={{ color: "var(--hrx-muted)" }}>{new Date(t.created_at).toLocaleString()}</td>
                        <td>{money(t.amount_cents, t.currency)}</td>
                        <td style={{ color: "var(--hrx-muted)" }}>{t.note || "—"}</td>
                        <td><Chip tone={t.status === "paid" ? "ok" : "plain"}>{t.status}</Chip></td>
                        <td>
                          {t.webhook_seen_at ? (
                            <Chip tone="ok">{new Date(t.webhook_seen_at).toLocaleTimeString()}</Chip>
                          ) : t.status === "paid" ? (
                            // Paid but never stamped: the money moved and the code
                            // that fulfils orders did not run.
                            <Chip tone="danger">never arrived</Chip>
                          ) : (
                            <span style={{ color: "var(--hrx-muted)" }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ── Access ───────────────────────────────────────────────────────── */}
      {section === "Access" && (
        <>
          <Card title="Platform access" right={<Chip tone="line">{admins.length}</Chip>}>
            <p className="opx-note">
              These accounts can see every customer's revenue, usage and domains, and can change what a
              customer pays. Add sparingly.
            </p>
            <form
              className="d-flex gap-2 flex-wrap mb-2"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                const email = adminEmail.trim();
                if (!email) return;
                act(() => addPlatformAdmin(email), `${email} can now open the platform console.`).then(() => setAdminEmail(""));
              }}
            >
              <input className="form-control" style={{ maxWidth: 320 }} type="email"
                     placeholder="teammate@phoxta.com" aria-label="Email of the admin to add"
                     value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
              <button className="hrx-pill dark opx-btn" disabled={busy || !adminEmail.trim()}>Add admin</button>
            </form>
            <ul className="list-unstyled m-0">
              {admins.map((a) => (
                <li key={a.user_id} className="hrx-listrow">
                  <InitialAvatar name={a.email} />
                  <div className="main">
                    <p className="t">{a.email} <Chip tone="line">{a.note || "admin"}</Chip></p>
                    <p className="s">since {day(a.created_at)}</p>
                  </div>
                  <button type="button" className="hrx-seeall opx-danger opx-btn" disabled={busy}
                          onClick={() => act(() => removePlatformAdmin(a.user_id), `${a.email} no longer has platform access.`)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Audit" right={<Chip tone="line">{audit.length}</Chip>}>
            <p className="opx-note">
              Every platform write — who did it, to what, and when.
            </p>
            {audit.length === 0 ? <Empty title="Nothing yet">Platform writes are appended here as they happen.</Empty> : (
              <div className="hrx-tablewrap">
                <table className="hrx-table">
                  <thead><tr><th>Action</th><th>Target</th><th>By</th><th>When</th></tr></thead>
                  <tbody>
                    {audit.map((a) => (
                      <tr key={a.id}>
                        <td className="fw-semibold">{a.action}</td>
                        <td style={{ maxWidth: 260, overflowWrap: "anywhere", color: "var(--hrx-muted)" }}>{a.target}</td>
                        <td style={{ color: "var(--hrx-muted)" }}>{a.actor_email || "—"}</td>
                        <td style={{ color: "var(--hrx-muted)" }}>{day(a.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
