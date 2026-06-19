import { resolveTenant, supabase } from "@/lib/phoxta";

// In-context content editing for the storefront's REAL pages — rich text + images.
// Framework-agnostic (no React/router dep): call initLiveEdit() once at startup.
// VIEW mode: fetch this tenant's per-page overrides and apply them by document-order
// slot index. EDIT mode (only inside the Studio iframe, ?phoxta-edit=1): text slots
// become editable with a floating rich-text toolbar (bold/italic/underline, colour,
// size, weight, link); images are click-to-replace. Every change streams to Studio,
// which persists to tenant_page_content. Visitors never see edit mode. Slots are
// positional, so static chrome (headings, copy, hero/section images) edits reliably.

type Slots = { text?: Record<string, string>; img?: Record<string, string> };

const TS = "h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption";

function textEls(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll<HTMLElement>(TS)).filter((el) => {
    if (el.closest("[data-phoxta-ui]")) return false; // our own toolbar
    if (el.querySelector(TS)) return false; // container of other slots, not a leaf
    return (el.textContent ?? "").trim().length > 0;
  });
}
function imgEls(): HTMLImageElement[] {
  return Array.from(document.body.querySelectorAll("img")).filter((im) => !im.closest("[data-phoxta-ui]"));
}
function sanitize(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}
function applySlots(slots: Slots): void {
  if (slots.text) {
    const els = textEls();
    for (const [k, v] of Object.entries(slots.text)) { const el = els[Number(k)]; if (el && el.innerHTML !== v) el.innerHTML = sanitize(v); }
  }
  if (slots.img) {
    const imgs = imgEls();
    for (const [k, v] of Object.entries(slots.img)) { const im = imgs[Number(k)]; if (im && im.getAttribute("src") !== v) im.setAttribute("src", v); }
  }
}

const editMode =
  typeof window !== "undefined" &&
  window.self !== window.top &&
  new URLSearchParams(window.location.search).get("phoxta-edit") != null;

const PARENT_ORIGIN = (() => { try { return new URL(document.referrer).origin; } catch { return "*"; } })();
const post = (msg: Record<string, unknown>) => window.parent?.postMessage({ source: "phoxta-edit", ...msg }, PARENT_ORIGIN);

let orgId: string | null = null;

// ---- VIEW MODE -------------------------------------------------------------
async function applyForPath(path: string): Promise<void> {
  if (!orgId) return;
  const { data } = await supabase.from("tenant_page_content").select("slots").eq("organization_id", orgId).eq("page_path", path).maybeSingle();
  const slots = (data as { slots?: Slots } | null)?.slots;
  if (!slots) return;
  const run = () => applySlots(slots);
  run(); setTimeout(run, 400); setTimeout(run, 1200);
}

// Fire a callback whenever the SPA route changes (works for any history-API router).
function onRouteChange(cb: () => void): void {
  (["pushState", "replaceState"] as const).forEach((m) => {
    const orig = history[m];
    history[m] = function (this: History, ...args: Parameters<History["pushState"]>) { const r = orig.apply(this, args); cb(); return r; };
  });
  window.addEventListener("popstate", cb);
}

// ---- EDIT MODE: rich-text toolbar -----------------------------------------
function captureSlot(el: HTMLElement): void {
  const i = textEls().indexOf(el);
  if (i >= 0) post({ kind: "text", path: window.location.pathname, index: i, value: el.innerHTML });
}
function editableOf(node: Node | null): HTMLElement | null {
  let n: Node | null = node;
  while (n && n !== document.body) { if (n instanceof HTMLElement && n.getAttribute("contenteditable") === "true") return n; n = n.parentNode; }
  return null;
}
function wrapSelection(tag: string, style: Partial<CSSStyleDeclaration>, attrs?: Record<string, string>): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const host = editableOf(sel.anchorNode);
  const range = sel.getRangeAt(0);
  const wrap = document.createElement(tag);
  Object.assign(wrap.style, style);
  if (attrs) for (const [k, v] of Object.entries(attrs)) wrap.setAttribute(k, v);
  try { range.surroundContents(wrap); }
  catch { const frag = range.extractContents(); wrap.appendChild(frag); range.insertNode(wrap); }
  sel.removeAllRanges();
  if (host) captureSlot(host);
}

function buildToolbar(): HTMLElement {
  const bar = document.createElement("div");
  bar.setAttribute("data-phoxta-ui", "1");
  Object.assign(bar.style, {
    position: "fixed", zIndex: "2147483647", display: "none", gap: "2px", padding: "5px",
    background: "#111", borderRadius: "10px", boxShadow: "0 6px 24px rgba(0,0,0,.3)", alignItems: "center",
    font: "13px/1 system-ui, sans-serif",
  } as Partial<CSSStyleDeclaration>);

  const btn = (label: string, title: string, onClick: () => void, extra?: Partial<CSSStyleDeclaration>) => {
    const b = document.createElement("button");
    b.type = "button"; b.title = title; b.textContent = label;
    Object.assign(b.style, { background: "transparent", color: "#fff", border: "none", cursor: "pointer", padding: "5px 8px", borderRadius: "6px", fontSize: "13px", ...extra } as Partial<CSSStyleDeclaration>);
    b.onmousedown = (e) => { e.preventDefault(); }; // keep the selection
    b.onclick = (e) => { e.preventDefault(); onClick(); };
    return b;
  };

  bar.appendChild(btn("B", "Bold", () => wrapSelection("span", { fontWeight: "700" }), { fontWeight: "700" }));
  bar.appendChild(btn("I", "Italic", () => wrapSelection("span", { fontStyle: "italic" }), { fontStyle: "italic" }));
  bar.appendChild(btn("U", "Underline", () => wrapSelection("span", { textDecoration: "underline" }), { textDecoration: "underline" }));

  // Colour
  const color = document.createElement("input");
  color.type = "color"; color.title = "Text colour"; color.setAttribute("data-phoxta-ui", "1");
  Object.assign(color.style, { width: "26px", height: "26px", border: "none", background: "transparent", cursor: "pointer", padding: "0" } as Partial<CSSStyleDeclaration>);
  color.onmousedown = (e) => e.stopPropagation();
  color.onchange = () => wrapSelection("span", { color: color.value });
  bar.appendChild(color);

  // Size
  const size = document.createElement("select");
  size.title = "Size"; size.setAttribute("data-phoxta-ui", "1");
  Object.assign(size.style, { background: "#222", color: "#fff", border: "none", borderRadius: "6px", padding: "4px", cursor: "pointer" } as Partial<CSSStyleDeclaration>);
  [["Size", ""], ["S", "0.85em"], ["M", "1em"], ["L", "1.35em"], ["XL", "1.8em"]].forEach(([t, v]) => { const o = document.createElement("option"); o.textContent = t; o.value = v; size.appendChild(o); });
  size.onmousedown = (e) => e.stopPropagation();
  size.onchange = () => { if (size.value) wrapSelection("span", { fontSize: size.value }); size.selectedIndex = 0; };
  bar.appendChild(size);

  // Weight
  const weight = document.createElement("select");
  weight.title = "Weight"; weight.setAttribute("data-phoxta-ui", "1");
  Object.assign(weight.style, { background: "#222", color: "#fff", border: "none", borderRadius: "6px", padding: "4px", cursor: "pointer" } as Partial<CSSStyleDeclaration>);
  [["Weight", ""], ["Light", "300"], ["Normal", "400"], ["Medium", "500"], ["Bold", "700"], ["Black", "900"]].forEach(([t, v]) => { const o = document.createElement("option"); o.textContent = t; o.value = v; weight.appendChild(o); });
  weight.onmousedown = (e) => e.stopPropagation();
  weight.onchange = () => { if (weight.value) wrapSelection("span", { fontWeight: weight.value }); weight.selectedIndex = 0; };
  bar.appendChild(weight);

  bar.appendChild(btn("🔗", "Link", () => { const url = window.prompt("Link URL:", "https://"); if (url) wrapSelection("a", { color: "inherit" }, { href: url, target: "_blank", rel: "noreferrer" }); }));
  bar.appendChild(btn("⨯", "Clear formatting", () => {
    const sel = window.getSelection(); const host = sel && editableOf(sel.anchorNode);
    if (sel && !sel.isCollapsed) { const r = sel.getRangeAt(0); const text = r.toString(); r.deleteContents(); r.insertNode(document.createTextNode(text)); sel.removeAllRanges(); if (host) captureSlot(host); }
  }));
  return bar;
}

function setupEditMode(): void {
  const toolbar = buildToolbar();
  document.body.appendChild(toolbar);

  const arm = () => {
    textEls().forEach((el) => {
      if (el.getAttribute("contenteditable") === "true") return;
      el.setAttribute("contenteditable", "true");
      el.style.outline = "1px dashed rgba(99,102,241,.5)";
      el.addEventListener("input", () => captureSlot(el));
    });
    imgEls().forEach((im, i) => {
      if (im.dataset.phoxtaArmed) return;
      im.dataset.phoxtaArmed = "1";
      im.style.outline = "2px dashed rgba(99,102,241,.7)";
      im.style.cursor = "pointer";
      im.addEventListener("click", (e) => { e.preventDefault(); post({ kind: "img-select", path: window.location.pathname, index: imgEls().indexOf(im), current: im.getAttribute("src") }); });
    });
    post({ kind: "slots", path: window.location.pathname, texts: textEls().map((e) => e.innerHTML), imgs: imgEls().map((im) => im.getAttribute("src") ?? "") });
  };

  // Show the toolbar on a non-collapsed selection inside an editable slot.
  document.addEventListener("selectionchange", () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !editableOf(sel.anchorNode)) { toolbar.style.display = "none"; return; }
    const r = sel.getRangeAt(0).getBoundingClientRect();
    toolbar.style.display = "flex";
    toolbar.style.top = `${Math.max(8, r.top - 46)}px`;
    toolbar.style.left = `${Math.max(8, Math.min(window.innerWidth - 320, r.left))}px`;
  });

  window.addEventListener("message", (e: MessageEvent) => {
    if (PARENT_ORIGIN !== "*" && e.origin !== PARENT_ORIGIN) return;
    const d = e.data as { source?: string; kind?: string; index?: number; value?: string };
    if (d?.source !== "phoxta-studio") return;
    if (d.kind === "set-img" && typeof d.index === "number" && typeof d.value === "string") {
      const im = imgEls()[d.index];
      if (im) { im.setAttribute("src", d.value); post({ kind: "img", path: window.location.pathname, index: d.index, value: d.value }); }
    }
  });

  setTimeout(arm, 500); setTimeout(arm, 1500);
  onRouteChange(() => setTimeout(arm, 400));
}

// ---- BRAND CHROME: logo, name, favicon, title, meta description, OG ---------
type BrandChrome = {
  logo_url?: string; logo_light?: string; favicon_url?: string;
  name?: string; tagline?: string; description?: string;
  seo?: { title?: string; description?: string; keywords?: string };
};
function applyBrandChrome(brand: BrandChrome): void {
  if (!brand || typeof document === "undefined") return;
  const ttl = brand.seo?.title || brand.name;
  if (ttl) document.title = ttl;
  const dsc = brand.seo?.description || brand.description || brand.tagline;
  const meta = (key: string, attr: "name" | "property", val?: string) => {
    if (!val) return;
    let m = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
    if (!m) { m = document.createElement("meta"); m.setAttribute(attr, key); document.head.appendChild(m); }
    m.setAttribute("content", val);
  };
  meta("description", "name", dsc);
  if (brand.seo?.keywords) meta("keywords", "name", brand.seo.keywords);
  meta("og:title", "property", ttl);
  meta("og:description", "property", dsc);
  meta("og:image", "property", brand.logo_url);
  if (brand.favicon_url) {
    let link = document.head.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = brand.favicon_url;
  }
  // Visible logo + name — header elements marked data-brand-logo / data-brand-name.
  // Re-apply a few times since the header may mount after this runs.
  const swap = () => {
    if (brand.name) document.querySelectorAll<HTMLElement>("[data-brand-name]").forEach((el) => { el.textContent = brand.name as string; });
    document.querySelectorAll<HTMLImageElement>("img[data-brand-logo]").forEach((img) => {
      const v = img.getAttribute("data-brand-logo");
      const src = v === "light" ? (brand.logo_light || brand.logo_url) : (brand.logo_url || brand.logo_light);
      if (src) img.setAttribute("src", src);
    });
  };
  swap(); setTimeout(swap, 400); setTimeout(swap, 1200);
}

// ---- ENTRY ----------------------------------------------------------------
let started = false;
export function initLiveEdit(): void {
  if (typeof window === "undefined" || started) return;
  started = true;
  resolveTenant()
    .then((t) => {
      orgId = t?.id ?? null;
      if (t?.branding) applyBrandChrome(t.branding as unknown as BrandChrome);
      if (editMode) return; // edit mode arms below regardless of orgId
      applyForPath(window.location.pathname);
      onRouteChange(() => applyForPath(window.location.pathname));
    })
    .catch(() => { /* unconfigured/dev — no overrides */ });
  if (editMode) setupEditMode();
}
