// Phoxta — the geometry behind a shape layer.
//
// Kept apart from the renderer because it is arithmetic, not markup: it is the
// one place that decides what a "hexagon" means inside a box, and both the
// canvas and the exporter paint from these numbers so the download cannot
// disagree with what was on screen. Everything returns plain SVG geometry —
// a path `d`, or a point list — so a shape survives export the same way the
// rectangles always did, as vector rather than as a screenshot of one.
//
// Every shape is inscribed in the layer's own box. That is what makes the
// handles honest: dragging the bottom-right corner resizes a pentagon the same
// way it resizes a photograph, and rotation stays the layer's business.
import type { Corners, ShapeKind } from "./types";

/** The box a shape is drawn inside. */
export type Box = { x: number; y: number; w: number; h: number };

/** Shapes that carry their outline in a stroke and have nothing to fill. */
export const STROKE_ONLY: ReadonlySet<ShapeKind> = new Set<ShapeKind>(["line"]);

/** Shapes whose corners can be rounded. A rounder pentagon is a different shape. */
export const ROUNDABLE: ReadonlySet<ShapeKind> = new Set<ShapeKind>(["rect"]);

/** What the picker offers, in the order it offers them. */
export const SHAPE_KINDS: { kind: ShapeKind; label: string }[] = [
  { kind: "rect", label: "Rectangle" },
  { kind: "ellipse", label: "Ellipse" },
  { kind: "triangle", label: "Triangle" },
  { kind: "diamond", label: "Diamond" },
  { kind: "pentagon", label: "Pentagon" },
  { kind: "hexagon", label: "Hexagon" },
  { kind: "star", label: "Star" },
  { kind: "arrow", label: "Arrow" },
  { kind: "line", label: "Line" },
];

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * The corners of a regular polygon inscribed in the box.
 *
 * Inscribed in the box rather than in a circle inside it: a hexagon in a wide
 * frame should fill the frame, and forcing it circular would leave the sides
 * empty and make the resize handles lie about what they were resizing.
 *
 * Starts at the top (−90°) so odd-sided polygons point upwards, which is the
 * only orientation anybody means by "triangle" or "pentagon".
 */
function polygon(b: Box, sides: number): string {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const rx = b.w / 2;
  const ry = b.h / 2;
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (-90 + (360 / sides) * i) * (Math.PI / 180);
    pts.push(`${round(cx + rx * Math.cos(a))},${round(cy + ry * Math.sin(a))}`);
  }
  return pts.join(" ");
}

/**
 * A star's points, alternating outer and inner radius.
 *
 * `points` and `innerRatio` come off a layer a user can type into, so both are
 * clamped here rather than trusted: three points is the fewest that reads as a
 * star at all, and a ratio at either extreme collapses it to a polygon or to a
 * scribble through its own centre.
 */
function star(b: Box, points: number, innerRatio: number): string {
  const n = Math.max(3, Math.min(20, Math.round(points || 5)));
  const ratio = Math.max(0.1, Math.min(0.9, innerRatio || 0.42));
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const rx = b.w / 2;
  const ry = b.h / 2;
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (-90 + (180 / n) * i) * (Math.PI / 180);
    const k = i % 2 === 0 ? 1 : ratio;
    pts.push(`${round(cx + rx * k * Math.cos(a))},${round(cy + ry * k * Math.sin(a))}`);
  }
  return pts.join(" ");
}

/** A block arrow pointing right; rotate the layer to point it anywhere else. */
function arrow(b: Box): string {
  const head = Math.min(b.w * 0.42, b.h * 0.72);
  const hx = b.x + b.w - head;
  const shaft = b.h * 0.42;
  const top = b.y + (b.h - shaft) / 2;
  const bot = top + shaft;
  const mid = b.y + b.h / 2;
  return [
    `${round(b.x)},${round(top)}`,
    `${round(hx)},${round(top)}`,
    `${round(hx)},${round(b.y)}`,
    `${round(b.x + b.w)},${round(mid)}`,
    `${round(hx)},${round(b.y + b.h)}`,
    `${round(hx)},${round(bot)}`,
    `${round(b.x)},${round(bot)}`,
  ].join(" ");
}

/**
 * A rectangle with four independent corner radii.
 *
 * Radii are clamped the way the CSS box model clamps them: if two corners on
 * the same side ask for more room than the side has, every radius is scaled by
 * the same factor. Clamping each corner on its own instead would change the
 * ratio between them and quietly redraw a shape the user had already arranged.
 */
export function roundedRectPath(b: Box, c: Corners): string {
  let [tl, tr, br, bl] = c.map((n) => Math.max(0, n || 0)) as Corners;
  const scale = Math.min(
    1,
    b.w / Math.max(1e-6, tl + tr),
    b.w / Math.max(1e-6, bl + br),
    b.h / Math.max(1e-6, tl + bl),
    b.h / Math.max(1e-6, tr + br),
  );
  if (scale < 1) [tl, tr, br, bl] = [tl, tr, br, bl].map((n) => n * scale) as Corners;
  const { x, y, w, h } = b;
  const r = (n: number) => round(n);
  return [
    `M${r(x + tl)},${r(y)}`,
    `H${r(x + w - tr)}`, tr ? `A${r(tr)},${r(tr)} 0 0 1 ${r(x + w)},${r(y + tr)}` : "",
    `V${r(y + h - br)}`, br ? `A${r(br)},${r(br)} 0 0 1 ${r(x + w - br)},${r(y + h)}` : "",
    `H${r(x + bl)}`, bl ? `A${r(bl)},${r(bl)} 0 0 1 ${r(x)},${r(y + h - bl)}` : "",
    `V${r(y + tl)}`, tl ? `A${r(tl)},${r(tl)} 0 0 1 ${r(x + tl)},${r(y)}` : "",
    "Z",
  ].filter(Boolean).join(" ");
}

/**
 * The geometry for one shape, as the attributes an SVG element needs.
 *
 * Returns a discriminated shape rather than a finished element so the renderer
 * keeps ownership of fills, strokes, shadows and the data attributes the
 * exporter looks for — this file decides where the outline goes and nothing
 * about how it is painted.
 */
export type Geometry =
  | { el: "rect"; rx: number }
  | { el: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { el: "polygon"; points: string }
  | { el: "path"; d: string }
  | { el: "line"; x1: number; y1: number; x2: number; y2: number };

export function geometryOf(
  b: Box,
  kind: ShapeKind | undefined,
  opts: { radius?: number; radii?: Corners; points?: number; innerRatio?: number } = {},
): Geometry {
  switch (kind ?? "rect") {
    case "ellipse":
      return { el: "ellipse", cx: round(b.x + b.w / 2), cy: round(b.y + b.h / 2), rx: round(b.w / 2), ry: round(b.h / 2) };
    case "triangle":
      return { el: "polygon", points: polygon(b, 3) };
    case "diamond":
      return { el: "polygon", points: polygon(b, 4) };
    case "pentagon":
      return { el: "polygon", points: polygon(b, 5) };
    case "hexagon":
      return { el: "polygon", points: polygon(b, 6) };
    case "star":
      return { el: "polygon", points: star(b, opts.points ?? 5, opts.innerRatio ?? 0.42) };
    case "arrow":
      return { el: "polygon", points: arrow(b) };
    case "line":
      return { el: "line", x1: round(b.x), y1: round(b.y + b.h / 2), x2: round(b.x + b.w), y2: round(b.y + b.h / 2) };
    default: {
      // Four equal corners stay a plain <rect rx>, which is what every design
      // already saved renders as. Only an actually-uneven set is worth the path.
      const c = opts.radii;
      if (c && (c[0] !== c[1] || c[1] !== c[2] || c[2] !== c[3])) return { el: "path", d: roundedRectPath(b, c) };
      return { el: "rect", rx: c ? Math.max(0, c[0] || 0) : Math.max(0, opts.radius ?? 0) };
    }
  }
}
