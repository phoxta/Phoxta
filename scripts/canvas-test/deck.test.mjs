/* Carousels, as data.
 *
 * A carousel is stored in the same column as a single design, so the one thing
 * that must never break is reading back what is already there: every design
 * saved before carousels existed holds a bare DesignDoc. */
import { asDeck, isDeck, slidesOf, emptyDoc } from "./types.bundle.mjs";

const out = [];
const t = (n, ok, d) => out.push([ok, n, d]);

// A design saved before carousels existed.
const legacy = { templateId: "v2", content: { title: "Hello" }, images: {}, palette: { accent: "#f00" } };
{
  const d = asDeck(legacy);
  t("a legacy design reads back as a one-slide deck", d.slides.length === 1, `${d.slides.length} slide(s)`);
  t("its content survives", d.slides[0].content.title === "Hello", JSON.stringify(d.slides[0].content));
  t("its palette survives", d.slides[0].palette?.accent === "#f00", JSON.stringify(d.slides[0].palette));
  t("its template survives", d.slides[0].templateId === "v2", d.slides[0].templateId);
}

// A deck round-trips through JSON, which is what the jsonb column does.
{
  const deck = { slides: [emptyDoc("v1"), emptyDoc("a2"), emptyDoc("v7")] };
  const back = asDeck(JSON.parse(JSON.stringify(deck)));
  t("a deck round-trips through the database", back.slides.length === 3,
    back.slides.map((s) => s.templateId).join(","));
  t("a deck is recognised as one", isDeck(back) && !isDeck(legacy), `${isDeck(back)} / ${isDeck(legacy)}`);
}

// Empty and missing are not renderable, and must not produce an empty editor.
{
  t("an empty deck still yields a slide", asDeck({ slides: [] }, "v3").slides.length === 1, "");
  t("a missing doc still yields a slide", asDeck(undefined, "v3").slides[0].templateId === "v3", "");
  t("a missing doc keeps the row's template", slidesOf(null, "a5")[0].templateId === "a5", "");
}

// A partial document — the shape design-generate returns — is completed.
{
  const partial = { templateId: "v4", content: { title: "x" } };
  const s = asDeck(partial).slides[0];
  t("a partial document is completed rather than left broken",
    s.images !== undefined && s.content.title === "x", JSON.stringify(s));
}

for (const [ok, n, d] of out) console.log(`${ok ? "PASS" : "FAIL"} ${n}  —  ${d}`);
console.log(`\n${out.filter(([o]) => o).length}/${out.length} passing`);
if (out.some(([o]) => !o)) process.exitCode = 1;
