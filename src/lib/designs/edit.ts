import { CANVAS_H, CANVAS_W, type DesignDoc, type ImageSlot, type Layer, type TextSlot } from "./types";
import { layersOf } from "./templates";

/**
 * Document edits.
 *
 * Every one of these is a pure function from document to document — no state,
 * no mutation, no React. That is what makes undo a stack of documents rather
 * than a stack of inverse operations, and it is why the canvas, the layers
 * panel and the keyboard can all drive the same edits without three
 * implementations of "send backward".
 *
 * The first structural edit materialises the template's layers into the
 * document. Until then a design is content over a shared layout; afterwards it
 * owns its arrangement. `materialise` is called by every mutator here, so no
 * caller can forget and silently write a change into a list that is about to be
 * replaced by the template's.
 */

/** Give the document its own copy of the layers, if it has not got one. */
export function materialise(doc: DesignDoc): DesignDoc {
  if (doc.layers?.length) return doc;
  return { ...doc, layers: layersOf(doc).map((l) => ({ ...l })) };
}

const withLayers = (doc: DesignDoc, next: Layer[]): DesignDoc => ({ ...materialise(doc), layers: next });

const indexOf = (doc: DesignDoc, id: string) => layersOf(doc).findIndex((l) => l.id === id);

/* ── Geometry ────────────────────────────────────────────────────────────── */

/** Move or resize one layer. Sizes are floored so a layer cannot be dragged
 *  inside-out into a negative box that then refuses to be grabbed again. */
export function updateLayer(doc: DesignDoc, id: string, patch: Partial<Layer>): DesignDoc {
  const next = layersOf(materialise(doc)).map((l) => {
    if (l.id !== id) return l;
    const merged = { ...l, ...patch } as Layer;
    merged.w = Math.max(12, Math.round(merged.w));
    merged.h = Math.max(12, Math.round(merged.h));
    merged.x = Math.round(merged.x);
    merged.y = Math.round(merged.y);
    return merged;
  });
  return withLayers(doc, next);
}

export const nudge = (doc: DesignDoc, id: string, dx: number, dy: number): DesignDoc => {
  const l = layersOf(doc).find((x) => x.id === id);
  if (!l) return doc;
  return updateLayer(doc, id, { x: l.x + dx, y: l.y + dy });
};

/* ── Order ───────────────────────────────────────────────────────────────
   The array IS the z-order: index 0 paints first and therefore sits at the
   back. "Forward" is toward the end. Naming that once here stops the rest of
   the app from having to remember which way round it is. */

function move(doc: DesignDoc, id: string, to: number): DesignDoc {
  const layers = [...layersOf(materialise(doc))];
  const from = layers.findIndex((l) => l.id === id);
  if (from < 0) return doc;
  const target = Math.max(0, Math.min(layers.length - 1, to));
  if (target === from) return doc;
  const [l] = layers.splice(from, 1);
  layers.splice(target, 0, l);
  return withLayers(doc, layers);
}

export const bringForward = (doc: DesignDoc, id: string) => move(doc, id, indexOf(doc, id) + 1);
export const sendBackward = (doc: DesignDoc, id: string) => move(doc, id, indexOf(doc, id) - 1);
export const bringToFront = (doc: DesignDoc, id: string) => move(doc, id, layersOf(doc).length - 1);
export const sendToBack = (doc: DesignDoc, id: string) => move(doc, id, 0);

/** Reorder from the layers panel, which lists top-first. */
export function reorder(doc: DesignDoc, id: string, toDisplayIndex: number): DesignDoc {
  const n = layersOf(doc).length;
  return move(doc, id, n - 1 - toDisplayIndex);
}

/* ── Structure ───────────────────────────────────────────────────────────── */

export function removeLayer(doc: DesignDoc, id: string): DesignDoc {
  return withLayers(doc, layersOf(materialise(doc)).filter((l) => l.id !== id));
}

/** A fresh id that cannot collide with a template's hand-written ones. */
const freshId = (kind: string) => `${kind}-${Math.random().toString(36).slice(2, 9)}`;

export function duplicateLayer(doc: DesignDoc, id: string): { doc: DesignDoc; id: string } {
  const layers = [...layersOf(materialise(doc))];
  const i = layers.findIndex((l) => l.id === id);
  if (i < 0) return { doc, id };
  // Offset, so the copy is visibly a copy rather than hidden exactly behind
  // the original where it looks like nothing happened.
  const copy = { ...layers[i], id: freshId(layers[i].type), x: layers[i].x + 24, y: layers[i].y + 24 } as Layer;
  layers.splice(i + 1, 0, copy);
  return { doc: withLayers(doc, layers), id: copy.id };
}

export function toggle(doc: DesignDoc, id: string, key: "locked" | "hidden"): DesignDoc {
  const l = layersOf(doc).find((x) => x.id === id);
  if (!l) return doc;
  return updateLayer(doc, id, { [key]: !l[key] } as Partial<Layer>);
}

/* ── Adding ──────────────────────────────────────────────────────────────
   New layers land in the middle of the canvas and on top, because that is
   where the eye is and a new thing that appears behind the background reads
   as nothing having happened at all. */

const centred = (w: number, h: number) => ({
  x: Math.round((CANVAS_W - w) / 2),
  y: Math.round((CANVAS_H - h) / 2),
  w, h,
});

export function addText(doc: DesignDoc, slot: TextSlot = "description"): { doc: DesignDoc; id: string } {
  const id = freshId("text");
  const layer: Layer = {
    id, name: "Text", type: "text", slot, ...centred(560, 160),
    size: 48, weight: 600, fill: "ink", lineHeight: 1.2, tracking: -1.4, accent: "accent",
  };
  const layers = [...layersOf(materialise(doc)), layer];
  const next = withLayers(doc, layers);
  // A new text layer with no words is invisible, which looks like the button
  // did nothing — so it arrives with something to see and edit.
  return { doc: { ...next, content: { ...next.content, [slot]: next.content[slot] ?? "New text" } }, id };
}

export function addRect(doc: DesignDoc): { doc: DesignDoc; id: string } {
  const id = freshId("rect");
  const layer: Layer = { id, name: "Rectangle", type: "rect", ...centred(420, 300), fill: "accent", radius: 24 };
  return { doc: withLayers(doc, [...layersOf(materialise(doc)), layer]), id };
}

/**
 * Add a photo frame.
 *
 * There are only three image slots, and a slot is what carries the photograph,
 * so a fourth frame would share a slot with an existing one and the two would
 * always show the same picture. Returns null when they are used up rather than
 * adding a frame that quietly mirrors another.
 */
export function addImage(doc: DesignDoc): { doc: DesignDoc; id: string } | null {
  const used = new Set(layersOf(doc).filter((l) => l.type === "image").map((l) => l.slot));
  const slot = (["image1", "image2", "image3"] as ImageSlot[]).find((s) => !used.has(s));
  if (!slot) return null;
  const id = freshId("image");
  const layer: Layer = { id, name: "Photo", type: "image", slot, ...centred(480, 480), radius: 24 };
  return { doc: withLayers(doc, [...layersOf(materialise(doc)), layer]), id };
}

/* ── Alignment ───────────────────────────────────────────────────────────── */

export function align(doc: DesignDoc, id: string, how: "left" | "hcentre" | "right" | "top" | "vcentre" | "bottom"): DesignDoc {
  const l = layersOf(doc).find((x) => x.id === id);
  if (!l) return doc;
  switch (how) {
    case "left": return updateLayer(doc, id, { x: 0 });
    case "right": return updateLayer(doc, id, { x: CANVAS_W - l.w });
    case "hcentre": return updateLayer(doc, id, { x: (CANVAS_W - l.w) / 2 });
    case "top": return updateLayer(doc, id, { y: 0 });
    case "bottom": return updateLayer(doc, id, { y: CANVAS_H - l.h });
    case "vcentre": return updateLayer(doc, id, { y: (CANVAS_H - l.h) / 2 });
  }
}

/* ── Undo ────────────────────────────────────────────────────────────────
   A ring of whole documents. They are small — a few hundred bytes of content
   plus a layer list — so keeping fifty is cheaper than reasoning about how to
   invert "send to back" after the layer above it was deleted. */

export class History {
  private past: DesignDoc[] = [];
  private future: DesignDoc[] = [];
  private limit = 50;

  push(doc: DesignDoc) {
    this.past.push(doc);
    if (this.past.length > this.limit) this.past.shift();
    // Any new edit invalidates the redo branch, as in every editor.
    this.future = [];
  }

  undo(current: DesignDoc): DesignDoc | null {
    const prev = this.past.pop();
    if (!prev) return null;
    this.future.push(current);
    return prev;
  }

  redo(current: DesignDoc): DesignDoc | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(current);
    return next;
  }

  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
}
