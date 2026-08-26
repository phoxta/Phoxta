import { inlineFontCss, inlineImage, loadAssets } from "./assets";
import { CANVAS_H, CANVAS_W, resolvePalette, type DesignDoc } from "./types";

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

export type ExportResult = { blob: Blob; width: number; height: number };

/** 2× gives a 2160×2700 file — comfortably above what any social platform
 *  re-encodes down to, without producing something too large to upload. */
const DEFAULT_SCALE = 2;

export async function exportPng(
  svgEl: SVGSVGElement,
  doc: DesignDoc,
  scale = DEFAULT_SCALE,
): Promise<ExportResult> {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;

  // Editor-only chrome must not reach the file.
  clone.querySelectorAll("[data-editor-only]").forEach((n) => n.remove());
  clone.querySelectorAll("rect[stroke-dasharray]").forEach((n) => {
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
  const palette = resolvePalette(doc);
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

  // ── Inline the font ────────────────────────────────────────────────────
  const css = await inlineFontCss();
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

    return { blob, width: canvas.width, height: canvas.height };
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
