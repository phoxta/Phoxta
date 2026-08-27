import { geometryOf } from "@/lib/designs/shapes";
import type { ShapeKind } from "@/lib/designs/types";

/**
 * The thumbnail for one shape, in the toolbar picker and the inspector.
 *
 * Drawn from the same `geometryOf` the canvas paints with, so an icon cannot
 * drift from the shape it stands for — a hand-drawn set would be nine more
 * things to keep in step every time the geometry is tuned, and the first one to
 * fall behind would be a button that inserts something other than its picture.
 *
 * Inherits `color`, so hover and selected states are one CSS rule on the button
 * rather than a prop threaded through here.
 */
export function ShapeGlyph({ kind, size = 26 }: { kind: ShapeKind; size?: number }) {
  const g = geometryOf({ x: 5, y: 5, w: 30, h: 30 }, kind, { radius: 5, points: 5, innerRatio: 0.42 });
  const solid = { fill: "currentColor", stroke: "none" };
  // A line has no interior to fill, so it is the one glyph drawn as a stroke.
  const drawn = { fill: "none", stroke: "currentColor", strokeWidth: 4, strokeLinecap: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      {g.el === "ellipse" ? <ellipse {...solid} cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} />
        : g.el === "polygon" ? <polygon {...solid} points={g.points} />
        : g.el === "path" ? <path {...solid} d={g.d} />
        : g.el === "line" ? <line {...drawn} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} />
        : <rect {...solid} x={5} y={5} width={30} height={30} rx={g.rx} />}
    </svg>
  );
}
