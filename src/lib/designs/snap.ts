import { CANVAS_H, CANVAS_W, type Layer } from "./types";

/**
 * Snapping, and the guides that explain it.
 *
 * This is the single feature that separates a canvas from a box you can drag
 * things around in. Without it every alignment is eyeballed and nothing ever
 * quite lines up; with it, edges and centres click into place and the guide
 * tells you what they clicked into.
 *
 * Two rules keep it from becoming annoying:
 *
 * It snaps in screen space, not canvas space. The threshold is converted
 * through the current zoom, so a snap feels like the same few pixels of cursor
 * travel whether you are at 25% or 400%. A fixed canvas-unit threshold would be
 * unusably sticky zoomed in and useless zoomed out.
 *
 * It only ever snaps to what is visible. Hidden layers are not candidates —
 * being pulled toward the edge of something you cannot see is indistinguishable
 * from a bug.
 */

export type Guide =
  | { axis: "x"; at: number; from: number; to: number }
  | { axis: "y"; at: number; from: number; to: number };

/** A measured gap, drawn as a bar with its size in pixels. */
export type Gap = { axis: "x" | "y"; from: number; to: number; at: number; px: number };

export type SnapResult = { x: number; y: number; guides: Guide[]; gaps: Gap[] };

/** Cursor pixels, converted through zoom at the call site. */
const THRESHOLD_PX = 6;

type Edge = { at: number; lo: number; hi: number };

/** The three interesting positions on an axis: both edges and the centre. */
const edgesX = (l: { x: number; w: number }) => [l.x, l.x + l.w / 2, l.x + l.w];
const edgesY = (l: { y: number; h: number }) => [l.y, l.y + l.h / 2, l.y + l.h];

/**
 * Where a moving box wants to sit.
 *
 * `box` is the position the pointer asks for; the result is the position it
 * should take, plus the guides to draw. Both axes are solved independently,
 * which is what lets a layer snap to one thing horizontally and a different
 * thing vertically — the usual case when aligning into a corner.
 */
export function snapMove(
  box: { x: number; y: number; w: number; h: number },
  others: Layer[],
  zoom: number,
): SnapResult {
  const t = THRESHOLD_PX / zoom;

  const candX: Edge[] = [
    { at: 0, lo: 0, hi: CANVAS_H },
    { at: CANVAS_W / 2, lo: 0, hi: CANVAS_H },
    { at: CANVAS_W, lo: 0, hi: CANVAS_H },
  ];
  const candY: Edge[] = [
    { at: 0, lo: 0, hi: CANVAS_W },
    { at: CANVAS_H / 2, lo: 0, hi: CANVAS_W },
    { at: CANVAS_H, lo: 0, hi: CANVAS_W },
  ];

  for (const o of others) {
    if (o.hidden) continue;
    for (const at of edgesX(o)) candX.push({ at, lo: Math.min(o.y, box.y), hi: Math.max(o.y + o.h, box.y + box.h) });
    for (const at of edgesY(o)) candY.push({ at, lo: Math.min(o.x, box.x), hi: Math.max(o.x + o.w, box.x + box.w) });
  }

  const guides: Guide[] = [];
  let { x, y } = box;

  // The moving box's own three positions are each tested against every
  // candidate; the closest wins, and only if it is inside the threshold.
  let bestX: { d: number; x: number; g: Guide } | null = null;
  for (const [i, mine] of edgesX(box).entries()) {
    for (const c of candX) {
      const d = Math.abs(c.at - mine);
      if (d > t || (bestX && d >= bestX.d)) continue;
      const offset = i === 0 ? 0 : i === 1 ? box.w / 2 : box.w;
      bestX = { d, x: c.at - offset, g: { axis: "x", at: c.at, from: c.lo, to: c.hi } };
    }
  }
  if (bestX) { x = bestX.x; guides.push(bestX.g); }

  let bestY: { d: number; y: number; g: Guide } | null = null;
  for (const [i, mine] of edgesY(box).entries()) {
    for (const c of candY) {
      const d = Math.abs(c.at - mine);
      if (d > t || (bestY && d >= bestY.d)) continue;
      const offset = i === 0 ? 0 : i === 1 ? box.h / 2 : box.h;
      bestY = { d, y: c.at - offset, g: { axis: "y", at: c.at, from: c.lo, to: c.hi } };
    }
  }
  if (bestY) { y = bestY.y; guides.push(bestY.g); }

  // ── Equal spacing ───────────────────────────────────────────────────
  // Three boxes in a row want equal gaps between them. Detecting that and
  // snapping to it is the one thing that makes a hand-built layout look
  // designed rather than nearly-aligned, and it is invisible unless the tool
  // finds it for you.
  const eq = equalise({ ...box, x, y }, others, t);
  if (eq.x != null) { x = eq.x; }
  if (eq.y != null) { y = eq.y; }

  return { x: Math.round(x), y: Math.round(y), guides, gaps: gapsFor({ ...box, x, y }, others) };
}

/**
 * Snap into an even rhythm.
 *
 * Looks for a neighbour on each side along an axis and, if the two gaps are
 * nearly equal, makes them exactly equal. Only fires when there is something on
 * both sides — otherwise "equal spacing" has no second gap to be equal to and
 * the layer would jump for no visible reason.
 */
function equalise(
  box: { x: number; y: number; w: number; h: number },
  others: Layer[],
  t: number,
): { x?: number; y?: number } {
  const out: { x?: number; y?: number } = {};

  for (const axis of ["x", "y"] as const) {
    const pos = axis === "x" ? box.x : box.y;
    const size = axis === "x" ? box.w : box.h;
    const oPos = (o: Layer) => (axis === "x" ? o.x : o.y);
    const oSize = (o: Layer) => (axis === "x" ? o.w : o.h);
    // Only neighbours that actually overlap on the other axis are in the same
    // row or column; anything else is elsewhere on the page.
    const inLine = others.filter((o) => {
      if (o.hidden) return false;
      const a0 = axis === "x" ? box.y : box.x;
      const a1 = a0 + (axis === "x" ? box.h : box.w);
      const b0 = axis === "x" ? o.y : o.x;
      const b1 = b0 + (axis === "x" ? o.h : o.w);
      return a0 < b1 && a1 > b0;
    });

    const before = inLine.filter((o) => oPos(o) + oSize(o) <= pos).sort((a, b) => (oPos(b) + oSize(b)) - (oPos(a) + oSize(a)))[0];
    const after = inLine.filter((o) => oPos(o) >= pos + size).sort((a, b) => oPos(a) - oPos(b))[0];
    if (!before || !after) continue;

    const gapBefore = pos - (oPos(before) + oSize(before));
    const gapAfter = oPos(after) - (pos + size);
    if (Math.abs(gapBefore - gapAfter) > t * 2) continue;

    const even = (oPos(after) - (oPos(before) + oSize(before)) - size) / 2;
    if (even < 0) continue;
    out[axis] = oPos(before) + oSize(before) + even;
  }
  return out;
}

/**
 * The gaps worth showing.
 *
 * The nearest neighbour on each side of each axis, measured edge to edge.
 * Rendering every gap on the canvas would be noise; the four that touch the
 * thing being dragged are the ones being judged.
 */
function gapsFor(box: { x: number; y: number; w: number; h: number }, others: Layer[]): Gap[] {
  const gaps: Gap[] = [];

  for (const axis of ["x", "y"] as const) {
    const pos = axis === "x" ? box.x : box.y;
    const size = axis === "x" ? box.w : box.h;
    const cross = axis === "x" ? box.y + box.h / 2 : box.x + box.w / 2;
    const oPos = (o: Layer) => (axis === "x" ? o.x : o.y);
    const oSize = (o: Layer) => (axis === "x" ? o.w : o.h);

    const inLine = others.filter((o) => {
      if (o.hidden) return false;
      const a0 = axis === "x" ? box.y : box.x;
      const a1 = a0 + (axis === "x" ? box.h : box.w);
      const b0 = axis === "x" ? o.y : o.x;
      const b1 = b0 + (axis === "x" ? o.h : o.w);
      return a0 < b1 && a1 > b0;
    });

    const before = inLine.filter((o) => oPos(o) + oSize(o) <= pos).sort((a, b) => (oPos(b) + oSize(b)) - (oPos(a) + oSize(a)))[0];
    const after = inLine.filter((o) => oPos(o) >= pos + size).sort((a, b) => oPos(a) - oPos(b))[0];

    if (before) {
      const edge = oPos(before) + oSize(before);
      if (pos - edge > 1) gaps.push({ axis, from: edge, to: pos, at: cross, px: Math.round(pos - edge) });
    }
    if (after) {
      const edge = oPos(after);
      if (edge - (pos + size) > 1) gaps.push({ axis, from: pos + size, to: edge, at: cross, px: Math.round(edge - pos - size) });
    }
  }
  return gaps;
}

/**
 * The viewport.
 *
 * `zoom` is a scale and `x`/`y` are the canvas coordinates at the top-left of
 * the visible area — which is exactly what an SVG viewBox wants, so the
 * viewport needs no transform of its own and getScreenCTM keeps working for
 * pointer conversion. Doing this with a CSS transform instead would have meant
 * unpicking the scale by hand in every pointer handler.
 */
export type Viewport = { zoom: number; x: number; y: number };

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;

export const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

/** Fit the whole artboard into a viewport of this pixel size, with a margin. */
/**
 * Fit the artboard into the stage.
 *
 * The margin is breathing room the artwork is deliberately NOT drawn into: the
 * resize handles sit on the artboard's own edge, so with none of it the corner
 * handles would be half off the stage and unusable. 20px is enough for that at
 * every zoom, and no more — the stage now takes the artboard's own proportions,
 * so anything left over reads as the design being small rather than as space.
 */
export function fitTo(width: number, height: number, margin = 20): Viewport {
  const zoom = clampZoom(Math.min((width - margin * 2) / CANVAS_W, (height - margin * 2) / CANVAS_H));
  return centred(zoom, width, height);
}

/** Keep the artboard centred at a given zoom. */
export function centred(zoom: number, width: number, height: number): Viewport {
  return {
    zoom,
    x: (CANVAS_W - width / zoom) / 2,
    y: (CANVAS_H - height / zoom) / 2,
  };
}

/**
 * Zoom about a point, so the canvas position under the cursor stays under the
 * cursor. Zooming about the centre instead makes the thing you are looking at
 * drift off screen, which is the difference between zooming and hunting.
 */
export function zoomAt(v: Viewport, factor: number, cx: number, cy: number): Viewport {
  const zoom = clampZoom(v.zoom * factor);
  if (zoom === v.zoom) return v;
  return {
    zoom,
    x: cx - (cx - v.x) * (v.zoom / zoom),
    y: cy - (cy - v.y) * (v.zoom / zoom),
  };
}

/** The union box of several layers — what a multi-selection is dragged by. */
export function boundsOf(layers: Layer[]): { x: number; y: number; w: number; h: number } | null {
  if (!layers.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const l of layers) {
    x0 = Math.min(x0, l.x); y0 = Math.min(y0, l.y);
    x1 = Math.max(x1, l.x + l.w); y1 = Math.max(y1, l.y + l.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Layers whose box intersects a marquee. */
export function hitTest(layers: Layer[], box: { x: number; y: number; w: number; h: number }): string[] {
  return layers
    .filter((l) => !l.hidden && !l.locked)
    .filter((l) => l.x < box.x + box.w && l.x + l.w > box.x && l.y < box.y + box.h && l.y + l.h > box.y)
    .map((l) => l.id);
}
