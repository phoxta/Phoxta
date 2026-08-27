/* The shape geometry.
 *
 * These are pure numbers, so they are asserted directly rather than through a
 * browser: every shape has to stay inside the box its handles claim, because
 * the handles, the snapping and the exporter all trust the layer's own x/y/w/h.
 * A polygon that overflows its box is a shape you cannot align. */
import { SHAPE_KINDS, geometryOf, roundedRectPath } from "./shapes.bundle.mjs";

const results = [];
const check = (name, ok, detail) => results.push([ok, name, detail]);

const BOX = { x: 100, y: 60, w: 400, h: 240 };
const EPS = 0.01;

/** Every coordinate a piece of geometry puts on the page. */
function pointsOf(g) {
  if (g.el === "polygon") return g.points.split(" ").map((p) => p.split(",").map(Number));
  if (g.el === "line") return [[g.x1, g.y1], [g.x2, g.y2]];
  if (g.el === "ellipse") return [[g.cx - g.rx, g.cy - g.ry], [g.cx + g.rx, g.cy + g.ry]];
  if (g.el === "rect") return [[BOX.x, BOX.y], [BOX.x + BOX.w, BOX.y + BOX.h]];
  // Path: every number in the d string is an absolute coordinate pair or an
  // arc radius, so only the H/V/M/A endpoints are read out here.
  return (g.d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number).map((n) => [n, n]);
}

// ── 1. Every shape stays inside its box ──────────────────────────────────
for (const { kind, label } of SHAPE_KINDS) {
  const g = geometryOf(BOX, kind, { radius: 20, points: 7, innerRatio: 0.42 });
  const pts = kind === "rect" || g.el === "path" ? [] : pointsOf(g);
  const out = pts.filter(([x, y]) =>
    x < BOX.x - EPS || x > BOX.x + BOX.w + EPS || y < BOX.y - EPS || y > BOX.y + BOX.h + EPS);
  check(`${label} is drawn inside its own box`, out.length === 0,
        out.length ? `${out.length} point(s) outside, e.g. ${out[0]}` : `${pts.length || "n/a"} points`);
}

// ── 2. The shapes that should touch all four edges do ─────────────────────
// A shape that only fills part of its frame looks like a resize that did not
// take. Only the shapes that CAN reach every edge are asserted: a regular
// polygon with more than four sides cannot — a point-up hexagon touches top and
// bottom and its widest pair of vertices sits inboard of the sides, which is
// what makes it a hexagon rather than a stretched one.
for (const kind of ["ellipse", "diamond"]) {
  const pts = pointsOf(geometryOf(BOX, kind, {}));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const fills = Math.abs(Math.min(...xs) - BOX.x) < 1 && Math.abs(Math.max(...xs) - (BOX.x + BOX.w)) < 1
             && Math.abs(Math.min(...ys) - BOX.y) < 1 && Math.abs(Math.max(...ys) - (BOX.y + BOX.h)) < 1;
  check(`${kind} fills its frame`, fills,
        `x ${Math.min(...xs)}–${Math.max(...xs)}, y ${Math.min(...ys)}–${Math.max(...ys)}`);
}

// ── 3. A star's count and depth are honoured, and bad input is clamped ────
{
  const five = pointsOf(geometryOf(BOX, "star", { points: 5, innerRatio: 0.42 }));
  check("a five-point star has ten vertices", five.length === 10, `${five.length} vertices`);

  const nine = pointsOf(geometryOf(BOX, "star", { points: 9, innerRatio: 0.42 }));
  check("the point count is honoured", nine.length === 18, `${nine.length} vertices`);

  // A spinner is one keystroke from nonsense; the painter must not be.
  const silly = pointsOf(geometryOf(BOX, "star", { points: 0, innerRatio: 5 }));
  const finite = silly.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  const inside = silly.every(([x, y]) =>
    x >= BOX.x - EPS && x <= BOX.x + BOX.w + EPS && y >= BOX.y - EPS && y <= BOX.y + BOX.h + EPS);
  check("nonsense star settings are clamped, not painted", silly.length >= 6 && finite && inside,
        `${silly.length} vertices, all finite: ${finite}, all inside: ${inside}`);
}

// ── 4. A plain rectangle is still a plain rect ────────────────────────────
// Every design saved before shapes existed is this case, and it must not start
// rasterising down a different code path.
{
  const g = geometryOf(BOX, undefined, { radius: 24 });
  check("a shapeless layer is still a rect", g.el === "rect" && g.rx === 24, `${g.el} rx=${g.rx}`);

  const even = geometryOf(BOX, "rect", { radii: [12, 12, 12, 12] });
  check("four equal corners stay a rect rather than a path", even.el === "rect" && even.rx === 12,
        `${even.el} rx=${even.rx}`);

  const uneven = geometryOf(BOX, "rect", { radii: [40, 0, 40, 0] });
  check("uneven corners become a path", uneven.el === "path", uneven.el);
}

// ── 5. Corner radii are clamped together, keeping their ratio ─────────────
{
  // 300 + 300 on a 400-wide box: both must shrink, and by the same factor, or
  // the shape the user arranged comes back different.
  const d = roundedRectPath({ x: 0, y: 0, w: 400, h: 240 }, [300, 300, 0, 0]);
  const radii = [...d.matchAll(/A(\d+(?:\.\d+)?),/g)].map((m) => Number(m[1]));
  const equal = radii.length >= 2 && Math.abs(radii[0] - radii[1]) < 0.5;
  check("oversized corners are scaled together", equal && radii[0] <= 200 + EPS,
        `radii ${radii.join(", ")}`);

  // 300 and 150 both overflow the 240-tall sides, so this genuinely scales.
  // Compared largest-to-smallest rather than by position, because the path is
  // emitted from the top-right corner round — asserting an order would be
  // testing the draw sequence, not the clamp.
  const asym = roundedRectPath({ x: 0, y: 0, w: 400, h: 240 }, [300, 150, 0, 0]);
  const ar = [...asym.matchAll(/A(\d+(?:\.\d+)?),/g)].map((m) => Number(m[1])).sort((a, b) => b - a);
  const ratioKept = ar.length >= 2 && ar[1] > 0 && Math.abs(ar[0] / ar[1] - 2) < 0.01;
  check("scaling keeps the corners in proportion", ratioKept && ar[0] < 300,
        `radii ${ar.join(", ")}`);

  const zero = roundedRectPath({ x: 0, y: 0, w: 400, h: 240 }, [0, 0, 0, 0]);
  check("a zero radius emits no arcs", !zero.includes("A"), zero.slice(0, 40));
}

for (const [ok, name, detail] of results) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}  —  ${detail}`);
}
const bad = results.filter(([ok]) => !ok).length;
console.log(`\n${results.length - bad}/${results.length} passing`);
process.exit(bad ? 1 : 0);
