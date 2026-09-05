import { supabase } from "@/integration/phoxta";
import { resolveTenant } from "@/integration/tenant";
import { ENV } from "@/config/env";

/**
 * In-context content editing for the storefront's real pages.
 *
 * Framework-agnostic; call initLiveEdit() once at startup.
 *
 * VIEW mode: fetch this tenant's per-page overrides and apply them by
 * document-order slot index. EDIT mode (only inside the Studio iframe with
 * ?phoxta-edit=1): text slots become editable with a floating rich-text
 * toolbar; images are click-to-replace. Every change streams to Studio, which
 * persists it. Visitors never see edit mode.
 *
 * Slots are positional, so the count, order and nesting of headings,
 * paragraphs, list items and images on each page is part of the contract.
 */

type Slots = { text?: Record<string, string>; img?: Record<string, string> };

const TEXT_SELECTOR = "h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption";
const UI_MARK = "[data-phoxta-ui]";

function textEls(): HTMLElement[] {
    return Array.from(document.body.querySelectorAll<HTMLElement>(TEXT_SELECTOR)).filter((el) => {
        if (el.closest(UI_MARK)) return false; // our own toolbar
        if (el.querySelector(TEXT_SELECTOR)) return false; // container of other slots, not a leaf
        return (el.textContent ?? "").trim().length > 0;
    });
}

function imgEls(): HTMLImageElement[] {
    return Array.from(document.body.querySelectorAll("img")).filter((im) => !im.closest(UI_MARK));
}

/* ------------------------------------------------------------------------ */
/* Sanitiser                                                                 */
/*                                                                           */
/* Allowlist parser for tenant-authored rich text. Regex stripping was       */
/* bypassable (unquoted handlers, nested tags); this parses into an inert    */
/* document and keeps only the inline formatting the toolbar can produce.    */
/* ------------------------------------------------------------------------ */

const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "S", "SPAN", "A", "BR", "SUB", "SUP", "SMALL", "MARK"]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
    "*": new Set(["style"]),
    A: new Set(["href", "target", "rel", "style"]),
};

/** url()/expression()/image-set() and any script-ish scheme inside inline styles. */
const UNSAFE_STYLE = /(^|[\s;:])(url|expression|image-set)\s*\(|(javascript|vbscript|data)\s*:/i;

/** Control characters and whitespace that browsers ignore when parsing a URL scheme. */
const SCHEME_NOISE = /[\x00-\x1f\x7f\s]/g;

function safeHref(value: string): boolean {
    const v = value.trim().replace(SCHEME_NOISE, "").toLowerCase();
    // Relative links and anchors are fine; otherwise require an http(s)/mail/tel scheme.
    if (!/^[a-z][a-z0-9+.-]*:/.test(v)) return true;
    return /^(https?|mailto|tel):/.test(v);
}

function scrub(node: Element): void {
    for (const child of Array.from(node.children)) {
        // Depth-first: unwrapping a disallowed element promotes its children
        // into the parent, and we iterate a snapshot — so clean them first.
        scrub(child);
        if (!ALLOWED_TAGS.has(child.tagName)) {
            child.replaceWith(...Array.from(child.childNodes));
            continue;
        }
        const allowed = ALLOWED_ATTRS[child.tagName] ?? ALLOWED_ATTRS["*"];
        for (const attr of Array.from(child.attributes)) {
            const name = attr.name.toLowerCase();
            if (!allowed.has(name)) {
                child.removeAttribute(attr.name);
                continue;
            }
            if (name === "style" && UNSAFE_STYLE.test(attr.value)) {
                child.removeAttribute(attr.name);
                continue;
            }
            if (name === "href" && !safeHref(attr.value)) {
                child.removeAttribute(attr.name);
                continue;
            }
        }
        if (child.tagName === "A" && child.getAttribute("target") === "_blank") {
            child.setAttribute("rel", "noopener noreferrer");
        }
    }
}

/** Sanitise untrusted rich text down to inline formatting. Safe for innerHTML. */
export function sanitizeRichText(html: string): string {
    if (typeof DOMParser === "undefined") return html.replace(/<[^>]*>/g, "");
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
    scrub(doc.body);
    return doc.body.innerHTML;
}

/* ------------------------------------------------------------------------ */
/* View mode                                                                 */
/* ------------------------------------------------------------------------ */

function applySlots(slots: Slots): void {
    if (slots.text) {
        const els = textEls();
        for (const [k, v] of Object.entries(slots.text)) {
            const el = els[Number(k)];
            if (!el) continue;
            const clean = sanitizeRichText(v);
            if (el.innerHTML !== clean) el.innerHTML = clean;
        }
    }
    if (slots.img) {
        const imgs = imgEls();
        for (const [k, v] of Object.entries(slots.img)) {
            const im = imgs[Number(k)];
            if (im && im.getAttribute("src") !== v) im.setAttribute("src", v);
        }
    }
}

let orgId: string | null = null;

async function applyForPath(path: string): Promise<void> {
    if (!orgId) return;
    const { data } = await supabase
        .from("tenant_page_content")
        .select("slots")
        .eq("organization_id", orgId)
        .eq("page_path", path)
        .maybeSingle();
    const slots = (data as { slots?: Slots } | null)?.slots;
    if (!slots) return;
    // Replays catch content that mounts after the first pass; applySlots is
    // idempotent so a settled page makes them no-ops.
    const run = () => applySlots(slots);
    run();
    setTimeout(run, 400);
    setTimeout(run, 1200);
}

/** Fire a callback whenever the SPA route changes (any history-API router). */
function onRouteChange(cb: () => void): void {
    (["pushState", "replaceState"] as const).forEach((m) => {
        const orig = history[m];
        history[m] = function (this: History, ...args: Parameters<History["pushState"]>) {
            const r = orig.apply(this, args);
            cb();
            return r;
        };
    });
    window.addEventListener("popstate", cb);
}

/* ------------------------------------------------------------------------ */
/* Edit mode                                                                 */
/* ------------------------------------------------------------------------ */

const editMode =
    typeof window !== "undefined" &&
    window.self !== window.top &&
    new URLSearchParams(window.location.search).get("phoxta-edit") != null;

/**
 * Studio's origin, derived from the referrer but validated against an explicit
 * allowlist so a missing referrer can never disable the origin checks.
 * These are the PLATFORM's origins, not the storefront's.
 */
const ALLOWED_PARENTS = [
    ENV.isDev ? "http://localhost:5173" : undefined,
    import.meta.env.VITE_STUDIO_ORIGIN,
    "https://phoxta.vercel.app",
    "https://www.phoxta.com",
    "https://phoxta.com",
].filter((x): x is string => Boolean(x));

const PARENT_ORIGIN = (() => {
    try {
        const origin = new URL(document.referrer).origin;
        return ALLOWED_PARENTS.includes(origin) ? origin : null;
    } catch {
        return null;
    }
})();

/** No known-good parent ⇒ never emit page content and never accept commands. */
const post = (msg: Record<string, unknown>) => {
    if (!PARENT_ORIGIN) return;
    window.parent?.postMessage({ source: "phoxta-edit", ...msg }, PARENT_ORIGIN);
};

/** Slot index per editable element, refreshed on each arm() pass. */
const slotIndex = new WeakMap<HTMLElement, number>();

function captureSlot(el: HTMLElement): void {
    let i = slotIndex.get(el);
    if (i === undefined) {
        i = textEls().indexOf(el);
        if (i >= 0) slotIndex.set(el, i);
    }
    if (i >= 0) post({ kind: "text", path: window.location.pathname, index: i, value: el.innerHTML });
}

function editableOf(node: Node | null): HTMLElement | null {
    let n: Node | null = node;
    while (n && n !== document.body) {
        if (n instanceof HTMLElement && n.getAttribute("contenteditable") === "true") return n;
        n = n.parentNode;
    }
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
    try {
        range.surroundContents(wrap);
    } catch {
        const frag = range.extractContents();
        wrap.appendChild(frag);
        range.insertNode(wrap);
    }
    sel.removeAllRanges();
    if (host) captureSlot(host);
}

const styled = <T extends HTMLElement>(el: T, style: Partial<CSSStyleDeclaration>): T => {
    Object.assign(el.style, style);
    return el;
};

function buildToolbar(): HTMLElement {
    const bar = styled(document.createElement("div"), {
        position: "fixed",
        zIndex: "2147483647",
        display: "none",
        gap: "2px",
        padding: "5px",
        background: "#111",
        borderRadius: "10px",
        boxShadow: "0 6px 24px rgba(0,0,0,.3)",
        alignItems: "center",
        font: "13px/1 system-ui, sans-serif",
    });
    bar.setAttribute("data-phoxta-ui", "1");

    const btn = (label: string, title: string, onClick: () => void, extra: Partial<CSSStyleDeclaration> = {}) => {
        const b = styled(document.createElement("button"), {
            background: "transparent",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            padding: "5px 8px",
            borderRadius: "6px",
            fontSize: "13px",
            ...extra,
        });
        b.type = "button";
        b.title = title;
        b.textContent = label;
        b.onmousedown = (e) => e.preventDefault(); // keep the selection
        b.onclick = (e) => {
            e.preventDefault();
            onClick();
        };
        return b;
    };

    const select = (title: string, options: [string, string][], onPick: (v: string) => void) => {
        const s = styled(document.createElement("select"), {
            background: "#222",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "4px",
            cursor: "pointer",
        });
        s.title = title;
        s.setAttribute("data-phoxta-ui", "1");
        for (const [t, v] of options) {
            const o = document.createElement("option");
            o.textContent = t;
            o.value = v;
            s.appendChild(o);
        }
        s.onmousedown = (e) => e.stopPropagation();
        s.onchange = () => {
            if (s.value) onPick(s.value);
            s.selectedIndex = 0;
        };
        return s;
    };

    bar.appendChild(btn("B", "Bold", () => wrapSelection("span", { fontWeight: "700" }), { fontWeight: "700" }));
    bar.appendChild(btn("I", "Italic", () => wrapSelection("span", { fontStyle: "italic" }), { fontStyle: "italic" }));
    bar.appendChild(
        btn("U", "Underline", () => wrapSelection("span", { textDecoration: "underline" }), { textDecoration: "underline" }),
    );

    const color = styled(document.createElement("input"), {
        width: "26px",
        height: "26px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: "0",
    });
    color.type = "color";
    color.title = "Text colour";
    color.setAttribute("data-phoxta-ui", "1");
    color.onmousedown = (e) => e.stopPropagation();
    color.onchange = () => wrapSelection("span", { color: color.value });
    bar.appendChild(color);

    bar.appendChild(
        select("Size", [["Size", ""], ["S", "0.85em"], ["M", "1em"], ["L", "1.35em"], ["XL", "1.8em"]], (v) =>
            wrapSelection("span", { fontSize: v }),
        ),
    );
    bar.appendChild(
        select(
            "Weight",
            [["Weight", ""], ["Light", "300"], ["Normal", "400"], ["Medium", "500"], ["Bold", "700"], ["Black", "900"]],
            (v) => wrapSelection("span", { fontWeight: v }),
        ),
    );

    bar.appendChild(
        btn("🔗", "Link", () => {
            const url = window.prompt("Link URL:", "https://");
            if (url) wrapSelection("a", { color: "inherit" }, { href: url, target: "_blank", rel: "noreferrer" });
        }),
    );
    bar.appendChild(
        btn("⨯", "Clear formatting", () => {
            const sel = window.getSelection();
            const host = sel && editableOf(sel.anchorNode);
            if (sel && !sel.isCollapsed) {
                const r = sel.getRangeAt(0);
                const text = r.toString();
                r.deleteContents();
                r.insertNode(document.createTextNode(text));
                sel.removeAllRanges();
                if (host) captureSlot(host);
            }
        }),
    );
    return bar;
}

function setupEditMode(): void {
    const toolbar = buildToolbar();
    document.body.appendChild(toolbar);

    const arm = () => {
        const els = textEls();
        els.forEach((el, i) => {
            slotIndex.set(el, i);
            if (el.getAttribute("contenteditable") === "true") return;
            el.setAttribute("contenteditable", "true");
            el.style.outline = "1px dashed rgba(99,102,241,.5)";
            el.addEventListener("input", () => captureSlot(el));
        });
        imgEls().forEach((im) => {
            if (im.dataset.phoxtaArmed) return;
            im.dataset.phoxtaArmed = "1";
            im.style.outline = "2px dashed rgba(99,102,241,.7)";
            im.style.cursor = "pointer";
            im.addEventListener("click", (e) => {
                e.preventDefault();
                post({
                    kind: "img-select",
                    path: window.location.pathname,
                    index: imgEls().indexOf(im),
                    current: im.getAttribute("src"),
                });
            });
        });
        post({
            kind: "slots",
            path: window.location.pathname,
            texts: els.map((e) => e.innerHTML),
            imgs: imgEls().map((im) => im.getAttribute("src") ?? ""),
        });
    };

    // Show the toolbar on a non-collapsed selection inside an editable slot.
    document.addEventListener("selectionchange", () => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !editableOf(sel.anchorNode)) {
            toolbar.style.display = "none";
            return;
        }
        const r = sel.getRangeAt(0).getBoundingClientRect();
        toolbar.style.display = "flex";
        toolbar.style.top = `${Math.max(8, r.top - 46)}px`;
        toolbar.style.left = `${Math.max(8, Math.min(window.innerWidth - 320, r.left))}px`;
    });

    window.addEventListener("message", (e: MessageEvent) => {
        // Fail closed: unknown or untrusted parent origin ⇒ reject.
        if (!PARENT_ORIGIN || e.origin !== PARENT_ORIGIN) return;
        const d = e.data as { source?: string; kind?: string; index?: number; value?: string };
        if (d?.source !== "phoxta-studio") return;
        if (d.kind === "set-img" && typeof d.index === "number" && typeof d.value === "string") {
            const im = imgEls()[d.index];
            if (im) {
                im.setAttribute("src", d.value);
                post({ kind: "img", path: window.location.pathname, index: d.index, value: d.value });
            }
        }
    });

    setTimeout(arm, 500);
    setTimeout(arm, 1500);
    onRouteChange(() => setTimeout(arm, 400));
}

/* ------------------------------------------------------------------------ */
/* Brand chrome: name, logo, favicon, title, meta, OG                         */
/* ------------------------------------------------------------------------ */

export interface BrandChrome {
    logo_url?: string;
    logo_light?: string;
    favicon_url?: string;
    name?: string;
    tagline?: string;
    description?: string;
    seo?: { title?: string; description?: string; keywords?: string };
}

function setMeta(key: string, attr: "name" | "property", val?: string): void {
    if (!val) return;
    let m = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
    if (!m) {
        m = document.createElement("meta");
        m.setAttribute(attr, key);
        document.head.appendChild(m);
    }
    m.setAttribute("content", val);
}

export function applyBrandChrome(brand: BrandChrome): void {
    if (!brand || typeof document === "undefined") return;
    const title = brand.seo?.title || brand.name;
    if (title) document.title = title;
    const description = brand.seo?.description || brand.description || brand.tagline;
    setMeta("description", "name", description);
    if (brand.seo?.keywords) setMeta("keywords", "name", brand.seo.keywords);
    setMeta("og:title", "property", title);
    setMeta("og:description", "property", description);
    setMeta("og:image", "property", brand.logo_url);
    if (brand.favicon_url) {
        let link = document.head.querySelector<HTMLLinkElement>("link[rel~='icon']");
        if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
        }
        link.href = brand.favicon_url;
    }
    // Visible wordmark + logo. Elements opt in with data-brand-name / data-brand-logo.
    // Re-applied a few times because the header may mount after this runs.
    const swap = () => {
        if (brand.name) {
            document.querySelectorAll<HTMLElement>("[data-brand-name]").forEach((el) => {
                if (el.textContent !== brand.name) el.textContent = brand.name as string;
            });
        }
        document.querySelectorAll<HTMLImageElement>("img[data-brand-logo]").forEach((img) => {
            const v = img.getAttribute("data-brand-logo");
            const src = v === "light" ? brand.logo_light || brand.logo_url : brand.logo_url || brand.logo_light;
            if (src && img.getAttribute("src") !== src) img.setAttribute("src", src);
        });
    };
    swap();
    setTimeout(swap, 400);
    setTimeout(swap, 1200);
}

/* ------------------------------------------------------------------------ */
/* Entry                                                                     */
/* ------------------------------------------------------------------------ */

let started = false;

export function initLiveEdit(): void {
    if (typeof window === "undefined" || started) return;
    started = true;
    resolveTenant()
        .then((t) => {
            orgId = t?.id ?? null;
            if (t?.branding) applyBrandChrome(t.branding as BrandChrome);
            if (editMode && PARENT_ORIGIN) return; // edit mode arms below regardless of orgId
            void applyForPath(window.location.pathname);
            onRouteChange(() => void applyForPath(window.location.pathname));
        })
        .catch(() => {
            /* unconfigured/dev — no overrides */
        });
    if (editMode && PARENT_ORIGIN) setupEditMode();
}
