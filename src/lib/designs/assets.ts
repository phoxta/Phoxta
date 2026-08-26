/**
 * Loading the pack's vector art.
 *
 * Two jobs, both of which need the SVG's source text rather than a URL:
 *
 * RECOLOURING. The exported art is flat navy and flat blue. An <image> pointing
 * at an SVG file cannot be restyled from outside — CSS does not cross that
 * boundary — so a tenant's brand colour would reach the type and the rectangles
 * and stop dead at every card and badge. Fetching the source and swapping the
 * two brand hexes is the only way the palette reaches all of it.
 *
 * EXPORT. An SVG serialised into an <img> for rasterising refuses to load
 * external references at all; it is a security boundary, not a bug. So every
 * asset has to be inlined as a data URI before the canvas ever sees it. Since
 * both jobs need the same fetch, they share one cache.
 */

import { DEFAULT_PALETTE, type Palette } from "./types";

/** The two brand hexes the Figma export bakes into its vectors. */
const FIGMA_INK = /#14194[eE]/g;
const FIGMA_ACCENT = /#1[cC]56[fF][dD]/g;
const FIGMA_INK_ALT = /#1[dD]1[bB]41/g;

const cache = new Map<string, string>();

/** Cache key: the same file recoloured two ways is two different assets. */
const keyFor = (src: string, palette: Palette) => `${src}|${palette.ink}|${palette.accent}`;

/**
 * Fetch an asset and return it as a data URI, recoloured to the palette.
 *
 * Returns the original path on failure rather than throwing. A missing
 * decoration should cost one decoration, not the whole design — and the caller
 * renders the path directly, which still works for everything except export.
 */
export async function loadAsset(src: string, palette: Palette = DEFAULT_PALETTE): Promise<string> {
  const key = keyFor(src, palette);
  const hit = cache.get(key);
  if (hit) return hit;

  try {
    const res = await fetch(src);
    if (!res.ok) return src;
    let svg = await res.text();

    if (palette.ink !== DEFAULT_PALETTE.ink) {
      svg = svg.replace(FIGMA_INK, palette.ink).replace(FIGMA_INK_ALT, palette.ink);
    }
    if (palette.accent !== DEFAULT_PALETTE.accent) {
      svg = svg.replace(FIGMA_ACCENT, palette.accent);
    }

    // encodeURIComponent rather than btoa: these files contain non-Latin-1
    // characters often enough that btoa throws on them, and a data URI that
    // throws at load time is worse than a slightly longer one.
    const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    cache.set(key, uri);
    return uri;
  } catch {
    return src;
  }
}

/** Fetch many at once, de-duplicated. */
export async function loadAssets(srcs: string[], palette: Palette): Promise<Record<string, string>> {
  const unique = [...new Set(srcs)];
  const out: Record<string, string> = {};
  await Promise.all(unique.map(async (s) => { out[s] = await loadAsset(s, palette); }));
  return out;
}

/**
 * Fetch a photograph and inline it.
 *
 * Pexels serves `Access-Control-Allow-Origin: *` — checked — so this does not
 * taint the canvas and the exported PNG actually contains the picture. A photo
 * that cannot be fetched returns null so the caller can draw the slot empty
 * rather than export a design with a silent hole where the image was.
 */
export async function inlineImage(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  const hit = cache.get(url);
  if (hit) return hit;

  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const uri = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
    cache.set(url, uri);
    return uri;
  } catch {
    return null;
  }
}

/* ── Fonts ───────────────────────────────────────────────────────────────
   Plus Jakarta Sans is the pack's typeface. The page loads it from Google
   Fonts for the on-screen editor; the export needs it a second time, inlined,
   because a serialised SVG has no access to the page's fonts and would
   silently rasterise the whole design in Times New Roman. */

let fontCss: string | null = null;

const FONT_CSS_URL =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700&display=swap";

/**
 * The @font-face rules with the woff2 files inlined, for embedding in an
 * exported SVG. Returns "" on failure — the export then falls back to whatever
 * the rasteriser has, which is wrong but still produces an image.
 */
export async function inlineFontCss(): Promise<string> {
  if (fontCss !== null) return fontCss;
  try {
    // A modern UA string is what makes Google serve woff2 rather than a format
    // the browser cannot inline.
    const cssRes = await fetch(FONT_CSS_URL);
    if (!cssRes.ok) { fontCss = ""; return fontCss; }
    let css = await cssRes.text();

    const urls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g)].map((m) => m[1]))];
    await Promise.all(urls.map(async (u) => {
      const r = await fetch(u);
      if (!r.ok) return;
      const b = await r.blob();
      const d = await new Promise<string>((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result));
        fr.onerror = () => rej(fr.error);
        fr.readAsDataURL(b);
      });
      css = css.split(u).join(d);
    }));

    fontCss = css;
    return css;
  } catch {
    fontCss = "";
    return fontCss;
  }
}
