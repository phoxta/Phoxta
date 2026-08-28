/**
 * Duplicating a layer must produce something you can edit on its own.
 *
 * The bug this pins: words and photographs live in `doc.content` and
 * `doc.images` keyed by SLOT, not on the layer. A duplicate that kept the
 * original's slot was not a copy — both layers read the same key, so rewriting
 * the copy rewrote the original. On screen it looked like an edit leaking
 * between two boxes rather than like one box drawn twice.
 */
import { materialise, addText, duplicateLayer, updateLayer } from "./edit.bundle.mjs";
import { emptyDoc } from "./types.bundle.mjs";
import { layersOf } from "./templates.bundle.mjs";

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; return; }
  fail++;
  console.log("  FAIL  " + name + (detail ? "  — " + detail : ""));
};

const textLayers = (doc) => layersOf(doc).filter((l) => l.type === "text");

// ── the reported bug, reproduced ───────────────────────────────────────────
{
  let doc = materialise(emptyDoc("v1"));
  const first = textLayers(doc)[0];
  ok("a template has text to duplicate", Boolean(first));

  doc = { ...doc, content: { ...doc.content, [first.slot]: "Original words" } };

  const dup = duplicateLayer(doc, first.id);
  doc = dup.doc;
  const copy = layersOf(doc).find((l) => l.id === dup.id);

  ok("the copy exists", Boolean(copy));
  ok("the copy has its own layer id", copy.id !== first.id);
  ok("the copy has its OWN slot", copy.slot !== first.slot,
     `both are "${copy.slot}" — this is the bug`);
  ok("the copy carries the words across", doc.content[copy.slot] === "Original words");

  // Rewrite the copy. The original must not move.
  doc = { ...doc, content: { ...doc.content, [copy.slot]: "Changed on the copy" } };
  ok("editing the copy leaves the original alone",
     doc.content[first.slot] === "Original words",
     `original became "${doc.content[first.slot]}"`);

  // And the other way round.
  doc = { ...doc, content: { ...doc.content, [first.slot]: "Changed on the original" } };
  ok("editing the original leaves the copy alone",
     doc.content[copy.slot] === "Changed on the copy");
}

// ── geometry and stacking, which the fix must not have disturbed ───────────
{
  let doc = materialise(emptyDoc("v1"));
  const first = textLayers(doc)[0];
  const dup = duplicateLayer(doc, first.id);
  const copy = layersOf(dup.doc).find((l) => l.id === dup.id);
  ok("the copy is offset so it is visible", copy.x === first.x + 24 && copy.y === first.y + 24);

  const ids = layersOf(dup.doc).map((l) => l.id);
  ok("the copy sits directly above its original",
     ids.indexOf(copy.id) === ids.indexOf(first.id) + 1);
  ok("nothing else was lost", ids.length === layersOf(doc).length + 1);
}

// ── when the slots run out, say so rather than silently sharing ────────────
{
  // Fill every text slot, then duplicate one more.
  let doc = materialise(emptyDoc("v1"));
  for (;;) {
    const r = addText(doc);
    if (!r) break;
    doc = r.doc;
  }
  const victim = textLayers(doc)[0];
  const dup = duplicateLayer(doc, victim.id);
  const copy = layersOf(dup.doc).find((l) => l.id === dup.id);
  ok("with no slot left the copy still appears", Boolean(copy));
  ok("and it is reported as sharing rather than pretending", dup.shared === true);
}

// ── a shape has no slot at all and must still duplicate cleanly ────────────
{
  let doc = materialise(emptyDoc("v1"));
  const rect = layersOf(doc).find((l) => l.type === "rect");
  if (rect) {
    const dup = duplicateLayer(doc, rect.id);
    const copy = layersOf(dup.doc).find((l) => l.id === dup.id);
    ok("a shape duplicates", Boolean(copy) && copy.id !== rect.id);
    ok("a shape reports no sharing", !dup.shared);
    // Recolour the copy; the original keeps its own fill.
    const before = rect.fill;
    const after = updateLayer(dup.doc, copy.id, { fill: "white" });
    const orig = layersOf(after).find((l) => l.id === rect.id);
    ok("recolouring the copy leaves the original", orig.fill === before);
  }
}

console.log(`\nduplicate: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
