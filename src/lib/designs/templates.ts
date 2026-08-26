import { TEMPLATES } from "./fromRaw";
import type { Layer, Template } from "./types";

/**
 * The template pack.
 *
 * Eighteen layouts across three families, extracted from the Figma file rather
 * than transcribed by hand — see scripts/figma-templates.mjs. Geometry, fonts,
 * weights, line heights, letter-spacing and colour all come from Figma's own
 * numbers; the decorative vectors are its own exported SVGs.
 *
 * This replaced about four hundred lines of hand-written coordinates. That was
 * accurate for the six frames it covered and would have been a day's careful
 * work per family after that, with a fresh chance of a two-pixel error every
 * time the file changed. It has changed twice already.
 */

export { TEMPLATES };

export const getTemplate = (id: string): Template | undefined => TEMPLATES.find((t) => t.id === id);

/**
 * The layers a document renders.
 *
 * Its own, once it has been edited structurally; the template's until then. One
 * function so nothing else in the app has to know which of the two it is
 * looking at.
 */
export function layersOf(doc: { templateId: string; layers?: Layer[] }): Layer[] {
  if (doc.layers?.length) return doc.layers;
  return getTemplate(doc.templateId)?.layers ?? [];
}

/** A readable name for the layers panel. */
export function layerName(l: Layer): string {
  if (l.name) return l.name;
  if (l.type === "text" || l.type === "chip" || l.type === "image") return l.slot;
  if (l.type === "asset") return "artwork";
  return l.type;
}

/** Every text slot a template uses, in paint order — the editor's field list,
 *  derived from the layout so the two cannot drift apart. */
export function textSlotsOf(t: Template): { slot: string; id: string; multiline: boolean }[] {
  const out: { slot: string; id: string; multiline: boolean }[] = [];
  for (const l of t.layers) {
    if (l.type !== "text" && l.type !== "chip") continue;
    if (out.some((o) => o.slot === l.slot)) continue;
    out.push({ slot: l.slot, id: l.id, multiline: l.type === "text" && l.h > l.size * 1.6 });
  }
  return out;
}

/** Every image slot a template uses. */
export function imageSlotsOf(t: Template): string[] {
  const out: string[] = [];
  for (const l of t.layers) {
    if (l.type === "image" && !out.includes(l.slot)) out.push(l.slot);
  }
  return out;
}

/**
 * What the writer needs to know about a layout.
 *
 * Derived from the real templates and sent with the brief, rather than kept as
 * a second hand-maintained list inside the edge function. That list existed and
 * had six entries in it while the pack had eighteen — so the agent could only
 * ever pick from a third of the layouts, and nothing anywhere said so. A
 * catalogue that is computed cannot fall behind.
 *
 * The character budget is estimated from the box and the type size: how many
 * glyphs of that size fit that area, at roughly 0.55 em average advance. It is
 * approximate on purpose — its job is to stop the model writing a paragraph
 * into a chip, not to hyphenate.
 */
export type SlotBudget = { slot: string; max: number };

export function catalogue(): {
  id: string; purpose: string; slots: SlotBudget[]; images: Record<string, string>;
}[] {
  return TEMPLATES.map((t) => {
    const slots: SlotBudget[] = [];
    for (const l of t.layers) {
      if (l.type !== "text" && l.type !== "chip") continue;
      if (slots.some((s) => s.slot === l.slot)) continue;
      const perLine = Math.max(1, Math.floor(l.w / (l.size * 0.55)));
      const lines = Math.max(1, Math.round(l.h / (l.size * (l.type === "text" ? l.lineHeight : 1.2))));
      slots.push({ slot: l.slot, max: Math.min(400, perLine * lines) });
    }
    return { id: t.id, purpose: t.purpose, slots, images: t.imageHints as Record<string, string> };
  });
}
