import { snapMove, rotatedAabb, boundsOf, hitTest } from "./snap.bundle.mjs";
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
// ── Rotation ──────────────────────────────────────────────────────────────
// A layer turned 90° occupies a different box from the one its x/y/w/h
// describe. These pin the AABB arithmetic and the three readers that must
// agree with the eye: snap candidates, the marquee, and union bounds.
const ROT = { id: "rot", type: "rect", x: 400, y: 400, w: 200, h: 100, rotation: 90, fill: "ink" };

{
  const b = rotatedAabb(ROT);
  t("rotatedAabb keeps the centre and swaps the extents",
    Math.round(b.x) === 450 && Math.round(b.y) === 350 && Math.round(b.w) === 100 && Math.round(b.h) === 200,
    `got ${JSON.stringify(b)}`);
}
// Snapping is against the OCCUPIED box: y=345 is 5px from the rotated top
// edge (350) and 55px from the unrotated one (400) — only the first should pull.
{
  const r = snapMove({ x: 100, y: 345, w: 80, h: 80 }, [ROT], 1);
  t("a box snaps to a rotated neighbour's occupied edge", r.x === 100 && r.y === 350,
    `x=${r.x} y=${r.y} (expected 100, 350)`);
}
// Equal spacing must not fire off a rotated neighbour: its AABB corners are
// empty space, so the "gap" is not one the eye can see.
{
  const others = [R("a", 100, 0, 100, 100), { ...R("c", 400, 0, 200, 100), rotation: 45 }];
  const r = snapMove({ x: 253, y: 0, w: 100, h: 100 }, others, 1);
  t("a rotated neighbour is not a spacing neighbour", r.x === 253, `x=${r.x} (expected 253)`);
}
// A multi-selection's union contains what its layers occupy, not what they
// occupied before they turned.
{
  const b = boundsOf([ROT]);
  t("boundsOf uses the occupied box",
    b && Math.round(b.x) === 450 && Math.round(b.y) === 350 && Math.round(b.w) === 100 && Math.round(b.h) === 200,
    `got ${JSON.stringify(b)}`);
}
// The marquee agrees with the eye in both directions: no hit on the corner
// the rotation vacated, a hit on ground the rotation newly covers.
{
  const miss = hitTest([ROT], { x: 405, y: 400, w: 40, h: 40 });
  const hit = hitTest([ROT], { x: 460, y: 355, w: 20, h: 20 });
  t("marquee misses where the rotated layer is not", miss.length === 0, `hit ${JSON.stringify(miss)}`);
  t("marquee hits where the rotated layer is", hit.length === 1 && hit[0] === "rot", `hit ${JSON.stringify(hit)}`);
}

for (const [ok, n, d] of out) console.log(`${ok ? "PASS" : "FAIL"} ${n}  —  ${d}`);
console.log(`\n${out.filter(([o]) => o).length}/${out.length} passing`);
