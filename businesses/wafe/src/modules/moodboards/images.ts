import type { CacheKind } from "./types";

/**
 * Caching a picture, so a board never depends on someone else's server.
 *
 * `cacheImage` is called by BOTH repos before a pin is stored: the demo keeps
 * the copy in localStorage as a data URL, the live repo keeps the same bytes
 * (the storage upload happens in `supabase.ts`). Either way the row that
 * reaches a screen already holds an image we serve.
 *
 * When the remote server refuses us — CORS, a 403, a page that is gone — we
 * do not silently hot-link and we do not fail the pin. We render a typographic
 * card from what we do know (the page's host and the pin's title) as an SVG
 * data URL, mark it `placeholder`, and the pin says so with a "Try again"
 * button. That is the same "say what you did" rule the companion follows.
 */

export interface CachedImage {
    dataUrl: string;
    kind: CacheKind;
}

/** Data URLs live in localStorage in the demo, so they must stay modest. */
const MAX_EDGE = 1100;
const MAX_BYTES = 420_000;

export function hostOf(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return url.replace(/^https?:\/\//, "").split("/")[0] || "the web";
    }
}

/** A stable hue from any string, so the same source always gets the same card. */
function hueOf(seed: string): number {
    let h = 0;
    for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h % 360;
}

const escapeXml = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Wrap a line into at most `max` rows of roughly `per` characters. */
function wrap(text: string, per = 18, max = 4): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const rows: string[] = [];
    let line = "";
    for (const w of words) {
        if ((line + " " + w).trim().length > per && line) {
            rows.push(line);
            line = w;
        } else {
            line = (line + " " + w).trim();
        }
        if (rows.length === max) break;
    }
    if (line && rows.length < max) rows.push(line);
    return rows.length ? rows : ["Pinned"];
}

/**
 * The typographic fallback: a warm card carrying the title and the source, in
 * the family's own palette. Deterministic, tiny, and honest about itself.
 */
export function placeholderCard(title: string, source: string): string {
    const hue = hueOf(source || title);
    const bg = `hsl(${hue} 32% 88%)`;
    const bg2 = `hsl(${(hue + 28) % 360} 30% 78%)`;
    const ink = `hsl(${hue} 45% 22%)`;
    const lines = wrap(title || "Saved for later");
    const rows = lines
        .map((l, i) => `<text x="60" y="${300 + i * 58}" font-family="Georgia, serif" font-size="46" fill="${ink}">${escapeXml(l)}</text>`)
        .join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000" role="img" aria-label="${escapeXml(title)}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs>
<rect width="800" height="1000" fill="url(#g)"/>
<circle cx="690" cy="150" r="120" fill="${ink}" opacity="0.07"/>
<text x="60" y="150" font-family="Helvetica, Arial, sans-serif" font-size="24" letter-spacing="3" fill="${ink}" opacity="0.7">PINNED</text>
${rows}
<text x="60" y="920" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="${ink}" opacity="0.75">${escapeXml(source || "typed in by hand")}</text>
</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Blob → data URL. */
function readAsDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(new Error("Could not read that file."));
        fr.readAsDataURL(blob);
    });
}

/** Draw to a canvas at a sane size so one pin cannot fill the whole store. */
function downscale(dataUrl: string): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
            if (scale >= 1 && dataUrl.length <= MAX_BYTES) return resolve(dataUrl);
            const w = Math.max(1, Math.round((img.naturalWidth || MAX_EDGE) * scale));
            const h = Math.max(1, Math.round((img.naturalHeight || MAX_EDGE) * scale));
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const cx = canvas.getContext("2d");
            if (!cx) return resolve(dataUrl);
            cx.drawImage(img, 0, 0, w, h);
            try {
                let out = canvas.toDataURL("image/jpeg", 0.82);
                if (out.length > MAX_BYTES) out = canvas.toDataURL("image/jpeg", 0.62);
                resolve(out.length < dataUrl.length ? out : dataUrl);
            } catch {
                resolve(dataUrl);
            }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

/** A file the person chose, as a stored copy. */
export async function cacheUpload(file: File): Promise<CachedImage> {
    if (!file.type.startsWith("image/")) throw new Error("That doesn't look like a picture.");
    const raw = await readAsDataUrl(file);
    return { dataUrl: await downscale(raw), kind: "upload" };
}

/**
 * Fetch a web image and keep the bytes (AC 1). Anything the network refuses
 * comes back as a placeholder card rather than as a broken pin or a hot-link.
 */
export async function cacheImage(url: string, title: string): Promise<CachedImage> {
    const source = hostOf(url);
    // Our own files are already ours; nothing to fetch.
    if (url.startsWith("/") || url.startsWith("data:")) return { dataUrl: url, kind: "library" };
    try {
        const res = await fetch(url, { mode: "cors", credentials: "omit" });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (!blob.type.startsWith("image/")) throw new Error("not an image");
        const raw = await readAsDataUrl(blob);
        return { dataUrl: await downscale(raw), kind: "fetched" };
    } catch {
        return { dataUrl: placeholderCard(title, source), kind: "placeholder" };
    }
}

/**
 * The dominant-ish colour of a cached image, as a hex swatch, used by the
 * palette. Same-origin and data URLs only — a tainted canvas throws, and we
 * simply return null rather than guessing a colour.
 */
export function swatchOf(src: string): Promise<string | null> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = 24;
                canvas.height = 24;
                const cx = canvas.getContext("2d", { willReadFrequently: true });
                if (!cx) return resolve(null);
                cx.drawImage(img, 0, 0, 24, 24);
                const { data } = cx.getImageData(0, 0, 24, 24);
                let r = 0;
                let g = 0;
                let b = 0;
                let n = 0;
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] < 128) continue;
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                    n += 1;
                }
                if (!n) return resolve(null);
                const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, "0");
                resolve(`#${hex(r)}${hex(g)}${hex(b)}`);
            } catch {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });
}
