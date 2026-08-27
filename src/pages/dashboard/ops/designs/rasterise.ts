import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { DesignSvg } from "@/lib/designs/render";
import { exportPng } from "@/lib/designs/export";
import { slidesOf } from "@/lib/designs/types";
import { uploadAsset } from "@/lib/db/ops/designAssets";
import type { Design } from "@/lib/db/designs";

/**
 * A design, as a file in the asset library.
 *
 * Shared by the picker (importing one) and the refresh button (re-importing
 * the same one after it changed), because those must produce identical files —
 * a refresh that rasterised differently from the import would move the cut
 * lines and silently break the links attached to them.
 *
 * The design is mounted off-screen rather than hidden: exportPng measures text
 * against real layout, and a `display:none` subtree has none, so a hidden
 * render bakes the wrong line breaks into the file.
 */
export async function rasterise(orgId: string, design: Design): Promise<string> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:-99999px;top:0;opacity:0;pointer-events:none";
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    const doc = slidesOf(design.doc, design.template_id)[0];
    root.render(createElement(DesignSvg, { doc, width: 1080 }));
    // One frame for React to commit, one for the browser to lay the text out.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try { await document.fonts?.ready; } catch { /* no font API */ }

    const svg = host.querySelector("svg");
    if (!svg) throw new Error("The design did not render.");
    const { blob } = await exportPng(svg as SVGSVGElement, doc, 2);
    const name = `${design.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "design"}.png`;
    const { data, error } = await uploadAsset(orgId, new File([blob], name, { type: "image/png" }));
    if (error || !data) throw new Error(error ?? "The upload failed.");
    return data.url;
  } finally {
    root.unmount();
    host.remove();
  }
}
