import { CANVAS_H, CANVAS_W, type DesignDoc, type ImageSlot, type Layer, type ShapeKind, type TextSlot } from "./types";
import { layersOf } from "./templates";
import { SHAPE_KINDS } from "./shapes";

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

/**
 * Copy a layer.
 *
 * A NEW LAYER ID IS NOT ENOUGH. Words and photographs do not live on the
 * layer — they live in `doc.content` and `doc.images`, keyed by SLOT — so a
 * copy that keeps the original's slot is not a copy at all: both layers read
 * the same key, and editing either one changes both. That is what duplicating
 * a headline and then rewriting it did, and it looked like the edit had leaked
 * rather than like the two boxes were always the same box.
 *
 * So a duplicate claims a free slot and takes the content with it, exactly as
 * `addText` and `addImage` already do. When every slot is taken there is
 * nowhere for the copy's own words to live, so it genuinely does share — and
 * says so, rather than pretending.
 */
export function duplicateLayer(
  doc: DesignDoc,
  id: string,
): { doc: DesignDoc; id: string; shared?: boolean } {
  const base = materialise(doc);
  const layers = [...layersOf(base)];
  const i = layers.findIndex((l) => l.id === id);
  if (i < 0) return { doc, id };
  const src = layers[i];

  // Offset, so the copy is visibly a copy rather than hidden exactly behind
  // the original where it looks like nothing happened.
  let copy = { ...src, id: freshId(src.type), x: src.x + 24, y: src.y + 24 } as Layer;
  let content = { ...(doc.content ?? {}) };
  let images = { ...(doc.images ?? {}) };
  let shared = false;

  if (src.type === "text" || src.type === "chip") {
    // Chips carry a TextSlot too, so both kinds count as occupying one.
    const used = new Set(
      layers.filter((l) => l.type === "text" || l.type === "chip").map((l) => l.slot),
    );
    const free = TEXT_SLOTS.find((sl) => !used.has(sl));
    if (free) {
      copy = { ...copy, slot: free } as Layer;
      content = { ...content, [free]: content[src.slot] ?? "" };
    } else {
      shared = true;
    }
  } else if (src.type === "image") {
    const used = new Set(layers.filter((l) => l.type === "image").map((l) => l.slot));
    const free = (["image1", "image2", "image3"] as ImageSlot[]).find((sl) => !used.has(sl));
    if (free) {
      copy = { ...copy, slot: free } as Layer;
      if (images[src.slot]) images = { ...images, [free]: images[src.slot] };
    } else {
      shared = true;
    }
  }

  layers.splice(i + 1, 0, copy);
  const next = withLayers(doc, layers);
  return { doc: { ...next, content, images }, id: copy.id, shared };
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

/** Every slot copy can live in, in the order a second text box should claim them. */
const TEXT_SLOTS: TextSlot[] = [
  "description", "subtitle", "title", "statistic", "quote", "testimonial",
  "cta", "point1", "point2", "point3", "phone", "website", "score",
];

export function addText(doc: DesignDoc, slot?: TextSlot): { doc: DesignDoc; id: string } | null {
  // Copy lives in doc.content KEYED BY SLOT, so two text layers on the same slot
  // are literally the same words rendered twice — pressing "+ Text" again used
  // to produce a box echoing the first one rather than a new empty one. A text
  // layer therefore claims a FREE slot, exactly as a photo claims a free image
  // slot, and the button says so when every slot is spoken for.
  const base = materialise(doc);
  const used = new Set(layersOf(base).filter((l) => l.type === "text").map((l) => l.slot));
  const chosen = slot && !used.has(slot) ? slot : TEXT_SLOTS.find((s) => !used.has(s));
  if (!chosen) return null;
  const id = freshId("text");
  const layer: Layer = {
    id, name: "Text", type: "text", slot: chosen, ...centred(560, 160),
    size: 48, weight: 600, fill: "ink", lineHeight: 1.2, tracking: -1.4, accent: "accent",
  };
  const layers = [...layersOf(base), layer];
  const next = withLayers(doc, layers);
  // A new text layer with no words is invisible, which looks like the button
  // did nothing — so it arrives with something to see and edit.
  return { doc: { ...next, content: { ...next.content, [chosen]: next.content[chosen] ?? "New text" } }, id };
}

export function addRect(doc: DesignDoc, kind: ShapeKind = "rect"): { doc: DesignDoc; id: string } {
  const id = freshId("rect");
  const label = SHAPE_KINDS.find((s) => s.kind === kind)?.label ?? "Shape";
  // A line and an arrow are read along their length, so they arrive wide and
  // short; a star or a polygon reads as itself only in a roughly square box, and
  // arriving stretched would look like a mistake the user then has to correct.
  const box = kind === "line" || kind === "arrow" ? centred(460, 120)
    : kind === "rect" ? centred(420, 300)
    : centred(360, 360);
  const layer: Layer = {
    id, name: label, type: "rect", ...box, fill: "accent",
    ...(kind === "rect" ? { radius: 24 } : { shape: kind }),
    // Stars need their two defining numbers present from the start: the
    // inspector edits what the layer carries, and spinners bound to an absent
    // value read as empty until they are touched.
    ...(kind === "star" ? { points: 5, innerRatio: 0.42 } : {}),
    // A line has no fill to see, so it needs a stroke to exist at all.
    ...(kind === "line" ? { strokeColor: "accent" as const, strokeWidth: 8 } : {}),
  };
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
  const slot = (["image1", "image2", "image3", "image4", "image5", "image6"] as ImageSlot[]).find((s) => !used.has(s));
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

export class History<T = DesignDoc> {
  private past: T[] = [];
  private future: T[] = [];
  private limit = 50;

  push(doc: T) {
    this.past.push(doc);
    if (this.past.length > this.limit) this.past.shift();
    // Any new edit invalidates the redo branch, as in every editor.
    this.future = [];
  }

  undo(current: T): T | null {
    const prev = this.past.pop();
    if (!prev) return null;
    this.future.push(current);
    return prev;
  }

  redo(current: T): T | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(current);
    return next;
  }

  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
}

/* ── Many at once ────────────────────────────────────────────────────────── */

/** Move a set of layers by the same delta — how a multi-selection drags. */
export function moveMany(doc: DesignDoc, ids: string[], base: Record<string, { x: number; y: number }>, dx: number, dy: number): DesignDoc {
  let next = materialise(doc);
  for (const id of ids) {
    const b = base[id];
    if (!b) continue;
    next = updateLayer(next, id, { x: b.x + dx, y: b.y + dy });
  }
  return next;
}

/**
 * Align a set to its own bounds, not to the canvas.
 *
 * With one layer selected, aligning to the canvas is what someone means. With
 * several, they mean align these to each other — aligning them all to the
 * canvas edge would stack them on top of one another, which is never the
 * intent and destroys the arrangement in one click.
 */
export function alignMany(doc: DesignDoc, ids: string[], how: "left" | "hcentre" | "right" | "top" | "vcentre" | "bottom"): DesignDoc {
  const all = layersOf(doc);
  const sel = all.filter((l) => ids.includes(l.id));
  if (sel.length < 2) return ids[0] ? align(doc, ids[0], how) : doc;

  const x0 = Math.min(...sel.map((l) => l.x));
  const x1 = Math.max(...sel.map((l) => l.x + l.w));
  const y0 = Math.min(...sel.map((l) => l.y));
  const y1 = Math.max(...sel.map((l) => l.y + l.h));

  let next = materialise(doc);
  for (const l of sel) {
    const patch =
      how === "left" ? { x: x0 }
        : how === "right" ? { x: x1 - l.w }
          : how === "hcentre" ? { x: (x0 + x1) / 2 - l.w / 2 }
            : how === "top" ? { y: y0 }
              : how === "bottom" ? { y: y1 - l.h }
                : { y: (y0 + y1) / 2 - l.h / 2 };
    next = updateLayer(next, l.id, patch);
  }
  return next;
}

/** Even gaps along an axis. Needs three: two are already evenly spaced. */
export function distribute(doc: DesignDoc, ids: string[], axis: "h" | "v"): DesignDoc {
  const sel = layersOf(doc).filter((l) => ids.includes(l.id));
  if (sel.length < 3) return doc;

  const key = axis === "h" ? "x" : "y";
  const size = axis === "h" ? "w" : "h";
  const sorted = [...sel].sort((a, b) => a[key] - b[key]);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = (last[key] + last[size]) - first[key];
  const used = sorted.reduce((n, l) => n + l[size], 0);
  const gap = (span - used) / (sorted.length - 1);

  let next = materialise(doc);
  let at = first[key];
  for (const l of sorted) {
    next = updateLayer(next, l.id, { [key]: Math.round(at) } as Partial<Layer>);
    at += l[size] + gap;
  }
  return next;
}

export function removeMany(doc: DesignDoc, ids: string[]): DesignDoc {
  return withLayers(doc, layersOf(materialise(doc)).filter((l) => !ids.includes(l.id)));
}

/* ── Clipboard ───────────────────────────────────────────────────────────
   Module-level rather than the system clipboard: these are layer objects, not
   text, and writing JSON into the OS clipboard would mean anything the user
   copied afterwards silently broke paste. It lives for the session, which is
   the length of time a copied layer is useful for. */

let clip: Layer[] = [];

export const copyLayers = (doc: DesignDoc, ids: string[]) => {
  clip = layersOf(doc).filter((l) => ids.includes(l.id)).map((l) => ({ ...l }));
  return clip.length;
};

export const cutLayers = (doc: DesignDoc, ids: string[]): DesignDoc => {
  copyLayers(doc, ids);
  return removeMany(doc, ids);
};

export const canPaste = () => clip.length > 0;

export function pasteLayers(doc: DesignDoc): { doc: DesignDoc; ids: string[] } {
  if (!clip.length) return { doc, ids: [] };
  const copies = clip.map((l) => ({ ...l, id: freshId(l.type), x: l.x + 24, y: l.y + 24 }));
  return { doc: withLayers(doc, [...layersOf(materialise(doc)), ...copies]), ids: copies.map((c) => c.id) };
}

/** Rename, for the layers panel. */
export const renameLayer = (doc: DesignDoc, id: string, name: string): DesignDoc =>
  updateLayer(doc, id, { name: name.trim() || undefined } as Partial<Layer>);

/**
 * Scale a set of layers as though they were one object.
 *
 * `from` is the union box the gesture started with and `to` is where it ended;
 * every layer's position and size is remapped between them. Type, corner radii
 * and stroke weights scale too — a group resize that moved the boxes but left
 * 96px headlines at 96px would produce something that has to be repaired by
 * hand afterwards, which is worse than not offering the handle.
 *
 * Type scales by the GEOMETRIC MEAN of the two axes rather than by either one.
 * A non-uniform stretch has no single correct answer for a font size; the mean
 * is the one that keeps the block's area right and, more usefully, is the one
 * that agrees with both axes when the drag was proportional — which is the
 * common case, and the case where being wrong would be obvious.
 */
export function scaleMany(
  doc: DesignDoc,
  ids: string[],
  from: { x: number; y: number; w: number; h: number },
  to: { x: number; y: number; w: number; h: number },
): DesignDoc {
  // A zero-width union would divide by zero and send every layer to NaN, which
  // renders as an empty canvas — a spectacular failure for a stray gesture.
  if (from.w < 1 || from.h < 1) return doc;
  const sx = to.w / from.w;
  const sy = to.h / from.h;
  const st = Math.sqrt(Math.abs(sx * sy));
  const set = new Set(ids);

  return {
    ...doc,
    layers: layersOf(doc).map((l) => {
      if (!set.has(l.id)) return l;
      const next: Layer = {
        ...l,
        x: to.x + (l.x - from.x) * sx,
        y: to.y + (l.y - from.y) * sy,
        w: Math.max(1, l.w * sx),
        h: Math.max(1, l.h * sy),
      };
      if ("radius" in next && next.radius) next.radius = next.radius * st;
      if ("strokeWidth" in next && next.strokeWidth) next.strokeWidth = next.strokeWidth * st;
      if (next.type === "text") {
        next.size = Math.max(4, next.size * st);
        if (next.tracking) next.tracking = next.tracking * st;
      }
      return next;
    }),
  };
}
