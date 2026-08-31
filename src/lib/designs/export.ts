import { inlineFontCss, inlineImage, loadAssets } from "./assets";
import { getTemplate, layersOf } from "./templates";
import { plain, toRuns } from "./rich";
import {
  CANVAS_H, CANVAS_W, DEFAULT_FONT, DESIGN_FONTS, fontNamed, resolvePalette,
  type DesignDoc,
} from "./types";

/**
 * Export a design to PNG.
 *
 * The input is the very SVG element the editor is showing, cloned — not a
 * re-render. Anything else reintroduces the two-renderers problem in the one
 * place it matters most: the file the customer actually posts.
 *
 * Three things have to be inlined before it will rasterise, and all three fail
 * silently if they are not:
 *
 *   ASSETS — an SVG serialised into an <img> is not allowed to fetch anything.
 *   External references do not error, they simply do not paint, so the export
 *   would come back missing every pattern and icon with no warning at all.
 *
 *   PHOTOGRAPHS — same rule, plus the canvas taints if a cross-origin image
 *   sneaks in another way, and a tainted canvas throws only at toBlob, after
 *   the work is done. Pexels sends Access-Control-Allow-Origin: * (checked), so
 *   they can be fetched and turned into data URIs.
 *
 *   THE FONT — a serialised SVG has no access to the page's fonts. Without the
 *   @font-face inlined, a design set in Plus Jakarta Sans rasterises in the
 *   rasteriser's default serif, which looks like a bug in the template rather
 *   than a missing font.
 */

export type ExportResult = {
  blob: Blob;
  width: number;
  height: number;
  /** hrefs that could not be inlined and were left out of the file. */
  missing: string[];
};

/* ── Fonts ───────────────────────────────────────────────────────────────
   The one place a typeface control can silently break.

   assets.ts inlines Plus Jakarta Sans and nothing else, which was right when
   the pack was the only thing on the canvas. The moment the Inspector offers a
   font menu it stops being right: a headline set in PT Serif paints correctly
   in the editor — the page has the face — and rasterises in the exporter's
   default, because a serialised SVG cannot reach the page's fonts. Measured:
   3,091 of 48,000 pixels change on one word. It is invisible until the file is
   opened.

   So the export inlines the families the DOCUMENT uses, not a fixed one, from
   the same `query` strings designs.css loads for the editor.

   Two economies keep this from putting half a megabyte of Cyrillic into every
   PNG. Families are fetched one at a time, so a family Google refuses costs
   that family rather than all of them; and each @font-face block is kept only
   if the design actually contains a character in its unicode-range, which is
   the same decision a browser makes and turns sixteen faces into two. */

const cssCache = new Map<string, string>();
const woffCache = new Map<string, string>();

/** Every family the document paints with. Chips are always drawn in the
 *  default face by the renderer, so it is always needed. */
function familiesUsed(doc: DesignDoc): string[] {
  const out = new Set<string>([DEFAULT_FONT]);
  const template = getTemplate(doc.templateId);
  const content = { ...(template?.content ?? {}), ...doc.content };
  for (const l of layersOf(doc)) {
    if (l.type !== "text") continue;
    if (l.font) out.add(l.font);
    // A run can break from the layer's face, and that run is exactly the one a
    // reader notices when it comes back wrong.
    for (const r of toRuns(content[l.slot], l.accent)) if (r.font) out.add(r.font);
  }
  return [...out];
}

/** Every character the document will paint, as code points. */
function charsUsed(doc: DesignDoc): Set<number> {
  const template = getTemplate(doc.templateId);
  const content = { ...(template?.content ?? {}), ...doc.content };
  const chars = new Set<number>();
  for (const l of layersOf(doc)) {
    if (l.type !== "text" && l.type !== "chip") continue;
    const text = plain(content[l.slot]);
    for (const ch of text) {
      const c = ch.codePointAt(0);
      if (c != null) { chars.add(c); if (c >= 97 && c <= 122) chars.add(c - 32); }
    }
  }
  // Empty copy still has to produce a valid stylesheet, and a design is nearly
  // always about to have Latin typed into it.
  chars.add(65);
  return chars;
}

/** Does this @font-face block cover anything the design actually says? */
function blockIsNeeded(block: string, chars: Set<number>): boolean {
  const m = /unicode-range:\s*([^;}]+)/i.exec(block);
  if (!m) return true;
  return m[1].split(",").some((part) => {
    const t = part.trim().replace(/^u\+/i, "");
    if (!t) return false;
    const [a, b] = t.split("-");
    const lo = parseInt(a.replace(/\?/g, "0"), 16);
    const hi = b ? parseInt(b, 16) : parseInt(a.replace(/\?/g, "f"), 16);
    if (Number.isNaN(lo) || Number.isNaN(hi)) return true;
    for (const c of chars) if (c >= lo && c <= hi) return true;
    return false;
  });
}

async function dataUri(url: string): Promise<string | null> {
  const hit = woffCache.get(url);
  if (hit) return hit;
  const r = await fetch(url);
  if (!r.ok) return null;
  const blob = await r.blob();
  const uri = await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(blob);
  });
  woffCache.set(url, uri);
  return uri;
}

/**
 * @font-face rules with the woff2 files inlined, for every family this design
 * uses. Returns "" when nothing could be fetched, so the caller can fall back.
 */
async function inlineFontsFor(doc: DesignDoc): Promise<string> {
  const wanted = familiesUsed(doc)
    .map((name) => fontNamed(name))
    .filter((f): f is (typeof DESIGN_FONTS)[number] => Boolean(f));
  if (!wanted.length) return "";
  const chars = charsUsed(doc);

  const sheets = await Promise.all(wanted.map(async (font) => {
    try {
      let css = cssCache.get(font.query);
      if (css === undefined) {
        const res = await fetch(`https://fonts.googleapis.com/css2?family=${font.query}&display=swap`);
        css = res.ok ? await res.text() : "";
        cssCache.set(font.query, css);
      }
      if (!css) return "";

      const kept = (css.match(/@font-face\s*\{[^}]*\}/g) ?? []).filter((b) => blockIsNeeded(b, chars));
      const inlined = await Promise.all(kept.map(async (block) => {
        const urls = [...new Set([...block.matchAll(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g)].map((m) => m[1]))];
        let out = block;
        for (const u of urls) {
          const d = await dataUri(u);
          if (!d) return "";
          out = out.split(u).join(d);
        }
        return out;
      }));
      // A face whose woff2 would not fetch is dropped, not left pointing at
      // gstatic: the rasteriser refuses external references, so the reference
      // buys nothing and the block would only mask the working fallback.
      return inlined.filter(Boolean).join("\n");
    } catch {
      return "";
    }
  }));

  return sheets.filter(Boolean).join("\n");
}

/** 2× gives a 2160×2700 file — comfortably above what any social platform
 *  re-encodes down to, without producing something too large to upload. */
const DEFAULT_SCALE = 2;

export async function exportPng(
  svgEl: SVGSVGElement,
  doc: DesignDoc,
  scale = DEFAULT_SCALE,
): Promise<ExportResult> {
  // Wrapping is measured against whatever face the canvas has right now, and
  // the export inlines the real one. Rasterising before the webfont has landed
  // therefore bakes the fallback's line breaks into a file set in the real
  // font — the one difference this whole module exists to prevent.
  try { await document.fonts?.ready; } catch { /* no font API: nothing to wait for */ }

  const clone = svgEl.cloneNode(true) as SVGSVGElement;

  // Editor-only chrome must not reach the file.
  clone.querySelectorAll("[data-editor-only]").forEach((n) => n.remove());
  clone.querySelectorAll("rect[stroke-dasharray]").forEach((n) => {
    // This rule is here for the dashed outline an empty photo slot draws. Now
    // that a shape can carry a dashed border on purpose, "dashed and unfilled"
    // is no longer enough to identify chrome — so the renderer marks what
    // belongs to the design and only the unmarked is dropped.
    if ((n as SVGRectElement).getAttribute("data-design")) return;
    if ((n as SVGRectElement).getAttribute("fill") === "none") n.remove();
  });

  // THE WHOLE PAGE, NOT WHAT THE EDITOR HAPPENS TO BE LOOKING AT.
  //
  // The clone carries the editor's live viewBox, which is a window onto the
  // artboard: pan and zoom live in it. Left alone, the exported file is
  // whatever was on screen when Export was pressed -- the design shrunk into
  // the middle of a 1080x1350 frame when fitted, or a crop of it when zoomed
  // in. It looks right in the editor, and wrong only in the file, which is the
  // worst place for a difference to appear.
  clone.setAttribute("viewBox", `0 0 ${CANVAS_W} ${CANVAS_H}`);
  clone.setAttribute("width", String(CANVAS_W));
  clone.setAttribute("height", String(CANVAS_H));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  // ── Inline every href ──────────────────────────────────────────────────
  // The template's own colours belong in here. The renderer resolves
  // DEFAULT ← template ← doc; resolving only DEFAULT ← doc here meant a
  // template family with its own palette recoloured its vector art to the pack
  // default on the way out, so the download came back in the wrong brand.
  const palette = resolvePalette(doc, getTemplate(doc.templateId)?.palette);
  const nodes = [...clone.querySelectorAll("image")];
  const hrefs = [...new Set(nodes.map((n) => n.getAttribute("href") ?? "").filter(Boolean))];

  const localPaths = hrefs.filter((h) => h.startsWith("/assets/"));
  const remote = hrefs.filter((h) => !h.startsWith("/assets/") && !h.startsWith("data:"));

  const [assetMap, remoteMap] = await Promise.all([
    loadAssets(localPaths, palette),
    Promise.all(remote.map(async (u) => [u, await inlineImage(u)] as const))
      .then((pairs) => Object.fromEntries(pairs)),
  ]);

  const missing: string[] = [];
  for (const n of nodes) {
    const href = n.getAttribute("href") ?? "";
    if (!href || href.startsWith("data:")) continue;
    const next = assetMap[href] ?? remoteMap[href];
    if (next) {
      n.setAttribute("href", next);
    } else {
      // Drop it rather than leave a reference that will not paint — and record
      // it, so the caller can say what is missing instead of shipping a hole.
      missing.push(href);
      n.remove();
    }
  }

  // ── Inline the fonts ───────────────────────────────────────────────────
  // The document's own families first; the original single-family path is kept
  // as the floor, so a network that refuses the per-family requests still
  // produces the file it always did rather than one set in Times.
  const css = (await inlineFontsFor(doc)) || (await inlineFontCss());
  if (css) {
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = css;
    clone.insertBefore(style, clone.firstChild);
  }

  const svgText = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }));

  try {
    const img = new Image();
    img.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("The design could not be rasterised."));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W * scale;
    canvas.height = CANVAS_H * scale;
    const c = canvas.getContext("2d");
    if (!c) throw new Error("This browser would not give us a canvas to draw on.");

    // Without this the transparent corners of a rounded template come out
    // black in some encoders rather than white.
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("The image could not be encoded.");

    if (missing.length) {
      // Not thrown: the export succeeded and is usable. But the caller is told,
      // because "your post is missing its photo" must not be something the
      // customer discovers after posting it.
      console.warn("[design export] could not inline", missing.length, "asset(s):", missing);
    }

    return { blob, width: canvas.width, height: canvas.height, missing };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Save the PNG, with a filename that survives a downloads folder. */
export function downloadPng(blob: Blob, name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug || "design"}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safari has not read the blob by the time click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
