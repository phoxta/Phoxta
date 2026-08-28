/*
 * The browser half of the render service.
 *
 * THIS IS NOT A SECOND RENDERER. It mounts the same DesignSvg the editor
 * mounts and calls the same exportPng the download button calls — the only
 * difference is that the browser running it is headless and on a server. A
 * server-side rasteriser written against resvg or sharp would have been a
 * second implementation of text layout, and text layout is exactly where two
 * implementations diverge: the editor measures wrapping against the real font,
 * so a renderer that measured differently would put the line breaks somewhere
 * else and every generated post would be subtly wrong in a way nobody would
 * think to check.
 *
 * It mirrors rasterise.ts in the console, deliberately, line for line where it
 * can: mounted off-screen rather than hidden (a display:none subtree has no
 * layout, so a hidden render bakes the wrong line breaks), two frames for
 * React and the browser, then the fonts.
 */
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { DesignSvg } from "@/lib/designs/render";
import { exportPng } from "@/lib/designs/export";
import { DESIGN_FONTS, slidesOf, type Deck, type DesignDoc } from "@/lib/designs/types";

declare global {
  interface Window {
    renderDesign: (doc: DesignDoc | Deck, templateId: string, scale?: number) => Promise<string>;
    fontsReady: () => Promise<boolean>;
  }
}

/**
 * The faces a design can be set in, taken from the registry rather than
 * written out here — a font added to DESIGN_FONTS must arrive in this page
 * too, or a design using it renders in the fallback and nobody finds out until
 * they look at a published post.
 */
const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "https://fonts.googleapis.com/css2?" +
  DESIGN_FONTS.map((f) => `family=${f.query}`).join("&") + "&display=block";
document.head.appendChild(link);

window.fontsReady = async () => {
  try { await document.fonts.ready; return true; } catch { return false; }
};

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("could not read the rendered blob"));
    r.readAsDataURL(blob);
  });
}

window.renderDesign = async (raw, templateId, scale = 2) => {
  // The COVER — slide one. A carousel is many pictures and a post carries one.
  const doc = slidesOf(raw, templateId)[0];

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:-99999px;top:0;opacity:0;pointer-events:none";
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    root.render(createElement(DesignSvg, { doc, width: 1080 }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try { await document.fonts?.ready; } catch { /* no font API */ }

    const svg = host.querySelector("svg");
    if (!svg) throw new Error("the design did not render");
    const { blob } = await exportPng(svg as SVGSVGElement, doc, scale);
    return await blobToDataUrl(blob);
  } finally {
    root.unmount();
    host.remove();
  }
};
