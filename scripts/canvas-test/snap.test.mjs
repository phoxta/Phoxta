import { snapMove } from "./snap.bundle.mjs";
const R = (id, x, y, w, h) => ({ id, type: "rect", x, y, w, h, fill: "ink" });
const out = [];
const t = (n, ok, d) => out.push([ok, n, d]);

// Three cards in a row: 100..200, and 400..500. A box dropped at 250 makes
// gaps of 50 and 150; at 270 they are 70 and 130 — still not equal. The even
// position is 250+... solve: gap = (400 - 200 - 100)/2 = 50 -> x = 250.
{
  const others = [R("a", 100, 0, 100, 100), R("c", 400, 0, 100, 100)];
  const r = snapMove({ x: 253, y: 0, w: 100, h: 100 }, others, 1);
  t("equal spacing snaps a middle box to an even gap", r.x === 250, `x=${r.x} (expected 250)`);
}
// Nothing on the right: there is no second gap, so nothing should move.
{
  const others = [R("a", 100, 0, 100, 100)];
  const r = snapMove({ x: 253, y: 0, w: 100, h: 100 }, others, 1);
  t("no neighbour on one side means no equalising", r.x === 253, `x=${r.x} (expected 253)`);
}
// Well outside the threshold: leave it alone.
{
  const others = [R("a", 100, 0, 100, 100), R("c", 400, 0, 100, 100)];
  const r = snapMove({ x: 290, y: 0, w: 100, h: 100 }, others, 1);
  t("a clearly uneven position is left alone", r.x === 290, `x=${r.x} (expected 290)`);
}
// Gaps are measured to the nearest neighbour on each side.
{
  const others = [R("a", 100, 0, 100, 100), R("c", 400, 0, 100, 100)];
  const r = snapMove({ x: 250, y: 0, w: 100, h: 100 }, others, 1);
  const px = r.gaps.filter((g) => g.axis === "x").map((g) => g.px).sort((m, n) => m - n);
  t("both gaps are reported", px.join(",") === "50,50", `gaps=${px.join(",")}`);
}
// A neighbour in a different row is not in the same rhythm.
{
  const others = [R("a", 100, 0, 100, 100), R("c", 400, 900, 100, 100)];
  const r = snapMove({ x: 253, y: 0, w: 100, h: 100 }, others, 1);
  t("a box in another row is not a spacing neighbour", r.x === 253, `x=${r.x} (expected 253)`);
}
for (const [ok, n, d] of out) console.log(`${ok ? "PASS" : "FAIL"} ${n}  —  ${d}`);
console.log(`\n${out.filter(([o]) => o).length}/${out.length} passing`);
