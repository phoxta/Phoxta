/* Reordering, as pure arithmetic.
 *
 * The layers panel lists front-first while the document paints back-first, so
 * every drag crosses a reversal AND an off-by-one (the row is lifted out
 * before it is put back). Both are easy to get subtly wrong in a way that
 * lands a layer one place from where it was aimed — which looks like a
 * misjudged drop rather than a bug, so nobody reports it. */
import { reorder, materialise } from "./edit.bundle.mjs";

const doc = materialise({
  templateId: "v1", content: {}, images: {},
  layers: ["A", "B", "C", "D"].map((id, i) => ({ id, type: "rect", x: i, y: 0, w: 10, h: 10, fill: "ink" })),
});
// Paint order A,B,C,D (D in front) — so the panel shows D,C,B,A.
const view = (d) => [...d.layers].reverse().map((l) => l.id).join("");
const out = [];
const t = (n, ok, d) => out.push([ok, n, d]);

t("the panel lists front-first", view(doc) === "DCBA", view(doc));

/** What the drop handler computes, then the result. */
function drop(d, id, targetId, below) {
  const rows = [...d.layers].reverse().map((l) => l.id);
  const from = rows.indexOf(id);
  const insert = rows.indexOf(targetId) + (below ? 1 : 0);
  const to = insert > from ? insert - 1 : insert;
  return to === from ? d : reorder(d, id, to);
}

t("dragging the back layer to the top brings it to the front",
  view(drop(doc, "A", "D", false)) === "ADCB", view(drop(doc, "A", "D", false)));

t("dragging the front layer to the bottom sends it to the back",
  view(drop(doc, "D", "A", true)) === "CBAD", view(drop(doc, "D", "A", true)));

t("dropping below a row puts it directly beneath that row",
  view(drop(doc, "D", "B", true)) === "CBDA", view(drop(doc, "D", "B", true)));

t("dropping above a row puts it directly on top of that row",
  view(drop(doc, "A", "C", false)) === "DACB", view(drop(doc, "A", "C", false)));

// Moving down the list: the row is lifted out first, so an index read on the
// list that still contains it is one too many.
t("moving down by one actually moves by one",
  view(drop(doc, "D", "C", true)) === "CDBA", view(drop(doc, "D", "C", true)));

t("dropping a row back onto its own place changes nothing",
  view(drop(doc, "C", "C", false)) === "DCBA", view(drop(doc, "C", "C", false)));

t("a drop that resolves to no movement changes nothing",
  view(drop(doc, "C", "D", true)) === "DCBA", view(drop(doc, "C", "D", true)));

for (const [ok, n, d] of out) console.log(`${ok ? "PASS" : "FAIL"} ${n}  —  ${d}`);
console.log(`\n${out.filter(([o]) => o).length}/${out.length} passing`);
if (out.some(([o]) => !o)) process.exitCode = 1;
