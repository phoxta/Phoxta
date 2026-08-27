import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { DesignSvg } from "@/lib/designs/render";
import { exportPng } from "@/lib/designs/export";
import { slidesOf, type Deck, type DesignDoc } from "@/lib/designs/types";
import { deleteAsset, uploadAsset, type DesignAsset } from "@/lib/db/ops/designAssets";
import { saveDesignPng, type Design } from "@/lib/db/designs";

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

/** Render one design document to a PNG File, off-screen, from the same renderer
 *  the editor uses. Every caller here goes through this, so the file the agent
 *  sends is byte-for-byte the file the owner would have downloaded. */
async function renderPng(doc: DesignDoc, title: string): Promise<File> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:-99999px;top:0;opacity:0;pointer-events:none";
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    root.render(createElement(DesignSvg, { doc, width: 1080 }));
    // One frame for React to commit, one for the browser to lay the text out.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try { await document.fonts?.ready; } catch { /* no font API */ }

    const svg = host.querySelector("svg");
    if (!svg) throw new Error("The design did not render.");
    const { blob } = await exportPng(svg as SVGSVGElement, doc, 2);
    const name = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "design"}.png`;
    return new File([blob], name, { type: "image/png" });
  } finally {
    root.unmount();
    host.remove();
  }
}

async function store(orgId: string, doc: DesignDoc, title: string): Promise<DesignAsset> {
  const file = await renderPng(doc, title);
  const { data, error } = await uploadAsset(orgId, file);
  if (error || !data) throw new Error(error ?? "The upload failed.");
  return data;
}

export async function rasterise(orgId: string, design: Design): Promise<string> {
  const doc = slidesOf(design.doc, design.template_id)[0];
  return (await store(orgId, doc, design.title)).url;
}

/**
 * Publish a design's cover so the SERVER can send it.
 *
 * A design is a JSON document painted in the browser. That is right for the
 * editor and useless to the agent: Twilio does not take bytes, it takes a URL
 * and fetches the file itself, so a design with no stored picture is one the
 * agent can never show a customer — "send me the menu" was unanswerable for a
 * menu the business had made itself.
 *
 * So the studio does on save what it already did on export: renders the cover
 * with the one renderer, puts it in the business's own public asset bucket, and
 * writes the URL onto the row. The previous render is deleted afterwards, so a
 * design keeps exactly one picture rather than leaving a trail of near-identical
 * files in the owner's library on every save.
 *
 * Never throws: the document is already saved by the time this runs, and a
 * failed upload must not read as a failed save. The caller is told, and the
 * design simply stays unsendable until the next save.
 */
export async function publishDesignPng(
  orgId: string,
  design: { id: string; title: string; templateId: string; doc: DesignDoc | Deck; previousPath?: string | null },
): Promise<{ url: string | null; path: string | null; error: string | null }> {
  try {
    // The COVER — slide one. A carousel is many pictures and a text message
    // carries one; the cover is the slide the post leads with, which is the one
    // a customer asking to see it means.
    const doc = slidesOf(design.doc, design.templateId)[0];
    const asset = await store(orgId, doc, design.title);
    const { error } = await saveDesignPng(design.id, { url: asset.url, path: asset.path });
    if (error) return { url: null, path: null, error };
    const previous = (design.previousPath ?? "").trim();
    if (previous && previous !== asset.path) {
      // Best effort, and deliberately after the row has been updated: an orphan
      // file in the library is untidy, a deleted file the row still points at is
      // a broken picture in front of a customer.
      await deleteAsset(orgId, previous);
    }
    return { url: asset.url, path: asset.path, error: null };
  } catch (e) {
    return { url: null, path: null, error: (e as Error)?.message || "The design's picture could not be published." };
  }
}
