// Can a vision model's idea of a layout break the canvas?
//
// Copy is forgiving; geometry is not. A layer with a negative width, a font
// size of zero, a slot nobody has heard of or a fill of "primaryBlue" does not
// make a slightly worse design — it throws in the renderer, or paints nothing,
// or covers the artboard in one black rectangle, and the editor opens on a
// blank page with no way back.
//
// Run: npm run test:replica
import { validateDoc, DIMS, TEXT_SLOTS, IMAGE_SLOTS, PAINT_ROLES, FONTS } from "../../supabase/functions/design-reference/replica.ts";

let failures = 0;
const check = (name: string, cond: boolean, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : ` — ${detail}`}`);
  if (!cond) failures++;
};
const opts = { templateId: "v1" };

// ── the vocabulary must match src/lib/designs/types.ts ──────────────────
{
  check("text slots include the real ones", TEXT_SLOTS.includes("title") && TEXT_SLOTS.includes("cta") && TEXT_SLOTS.includes("score"));
  check("image slots are image1..image6", IMAGE_SLOTS.length === 6 && IMAGE_SLOTS[0] === "image1");
  check("paint roles include the palette and the literals", PAINT_ROLES.includes("accentSoft") && PAINT_ROLES.includes("transparent"));
  check("fonts are the pack's six", FONTS.length === 6 && FONTS.includes("PT Serif"));
  check("landscape is 1200x628", DIMS.landscape.w === 1200 && DIMS.landscape.h === 628);
}

// ── geometry is clamped into the artboard ───────────────────────────────
{
  const { doc } = validateDoc({
    format: "portrait",
    layers: [
      { id: "a", type: "rect", x: -500, y: -500, w: 200, h: 200, fill: "ink" },
      { id: "b", type: "rect", x: 99999, y: 99999, w: 200, h: 200, fill: "ink" },
      { id: "c", type: "rect", x: 0, y: 0, w: -40, h: 0, fill: "ink" },
      { id: "d", type: "rect", x: 0, y: 0, w: 99999, h: 99999, fill: "ink" },
    ],
  }, opts);
  const b = DIMS.portrait;
  const all = doc.layers as { x: number; y: number; w: number; h: number }[];
  check("negative position is pulled onto the page", all[0].x === 0 && all[0].y === 0, JSON.stringify(all[0]));
  check("off-page position is pulled back", all[1].x <= b.w && all[1].y <= b.h, JSON.stringify(all[1]));
  check("a zero/negative box gets a real size", all[2].w >= 4 && all[2].h >= 4, JSON.stringify(all[2]));
  check("an oversized box is capped at the artboard", all[3].w <= b.w && all[3].h <= b.h, JSON.stringify(all[3]));
  check("every layer sits inside the page", all.every((l) => l.x >= 0 && l.y >= 0 && l.x + l.w <= b.w && l.y + l.h <= b.h));
}

// ── unknown layer kinds are dropped, not guessed ────────────────────────
{
  const { doc, dropped } = validateDoc({
    layers: [
      { id: "ok", type: "text", slot: "title", x: 0, y: 0, w: 500, h: 100, size: 48 },
      { id: "no", type: "video", x: 0, y: 0, w: 100, h: 100 },
      { id: "no2", type: "lottie", x: 0, y: 0, w: 100, h: 100 },
    ],
  }, opts);
  check("an unknown kind is dropped", doc.layers.length === 1, JSON.stringify(doc.layers.map((l: {type: string}) => l.type)));
  check("the drop is reported", dropped.some((d) => d.what.includes("2 layers")), JSON.stringify(dropped));
}

// ── text is made drawable ───────────────────────────────────────────────
{
  const { doc } = validateDoc({
    layers: [
      { id: "t", type: "text", slot: "nonsense", x: 0, y: 0, w: 500, h: 100, size: 0, weight: 12345, lineHeight: 99, tracking: 9999, align: "justify", font: "Comic Sans", fill: "primaryBlue" },
    ],
  }, opts);
  const t = doc.layers[0];
  check("an unknown slot falls back to a real one", TEXT_SLOTS.includes(t.slot), t.slot);
  check("a zero font size becomes readable", t.size >= 8, String(t.size));
  check("weight is snapped into 100-900", t.weight >= 100 && t.weight <= 900 && t.weight % 100 === 0, String(t.weight));
  check("line height is sane", t.lineHeight >= 0.8 && t.lineHeight <= 2.2, String(t.lineHeight));
  check("tracking is bounded", Math.abs(t.tracking) <= 20, String(t.tracking));
  check("an unknown align falls back", ["left", "center", "right"].includes(t.align), t.align);
  check("a font outside the pack is not kept", !t.font, String(t.font));
  check("an unknown fill becomes a real one", PAINT_ROLES.includes(t.fill) || /^#[0-9a-f]{6}$/i.test(t.fill), t.fill);
}

// ── line height: the regression that truncated every headline ───────────
// A real rebuild returned lineHeight 3 on a 72px headline in a 300px box. Each
// line then claims 216px, one line fits, and the copy budget derived from that
// box collapses to 24 characters — so every headline in the month was written
// and then cut to "Explore AI-Powered Busi…". Nothing looked broken; the layer
// was wrong and the damage was downstream.
{
  const { doc } = validateDoc({
    layers: [
      { id: "h", type: "text", slot: "title", x: 0, y: 0, w: 960, h: 300, size: 72, lineHeight: 3 },
      { id: "b", type: "text", slot: "description", x: 0, y: 400, w: 900, h: 200, size: 28, lineHeight: 1.5 },
      { id: "t", type: "text", slot: "cta", x: 0, y: 700, w: 400, h: 40, size: 36, lineHeight: 1.4 },
    ],
  }, opts);
  const [h, b, t] = doc.layers;

  check("an implausible line height is pulled down", h.lineHeight <= 2.2, String(h.lineHeight));
  // The real point is not the number, it is how much copy the box can hold.
  const lines = (l: { h: number; size: number; lineHeight: number }) =>
    Math.round(l.h / (l.size * l.lineHeight));
  check("the headline box now holds more than one line", lines(h) >= 2, `${lines(h)} lines`);
  check("a sane body line height is left alone", b.lineHeight === 1.5, String(b.lineHeight));
  // A short box with big type: leading must not exceed the box it is in.
  check("leading never exceeds its own box", t.size * t.lineHeight <= t.h + 0.001, `${t.size}x${t.lineHeight} in ${t.h}`);
}

// ── real values survive untouched ───────────────────────────────────────
{
  const { doc, dropped } = validateDoc({
    format: "landscape",
    palette: { canvas: "#F4F1EA", ink: "#1A1A1A", accent: "#C2410C", bogus: "#fff" },
    layers: [
      { id: "bg", type: "rect", x: 0, y: 0, w: 1200, h: 628, fill: "canvas" },
      { id: "h", type: "text", slot: "title", x: 80, y: 90, w: 700, h: 180, size: 64, weight: 700, lineHeight: 1.1, tracking: -2, align: "left", font: "PT Serif", fill: "#1A1A1A" },
      { id: "p", type: "image", slot: "image2", x: 800, y: 0, w: 400, h: 628, radius: 24 },
    ],
    content: { title: "Three left in the oat linen", bogus: "dropped" },
  }, opts);

  check("a valid format is kept", doc.format === "landscape", doc.format);
  check("real hexes survive", doc.palette.canvas === "#F4F1EA" && doc.palette.accent === "#C2410C", JSON.stringify(doc.palette));
  check("a palette role that does not exist is dropped", !("bogus" in doc.palette), JSON.stringify(doc.palette));
  check("a full-bleed background keeps its size", doc.layers[0].w === 1200 && doc.layers[0].h === 628);
  check("a good headline is untouched", doc.layers[1].size === 64 && doc.layers[1].weight === 700 && doc.layers[1].font === "PT Serif");
  check("a real image slot is kept", doc.layers[2].slot === "image2");
  check("printed copy is kept", doc.content.title === "Three left in the oat linen");
  check("copy for an unknown slot is dropped", !("bogus" in doc.content), JSON.stringify(doc.content));
  check("a clean layout reports nothing dropped", dropped.length === 0, JSON.stringify(dropped));
}

// ── duplicate ids would move the wrong layer in the editor ──────────────
{
  const { doc } = validateDoc({
    layers: [
      { id: "same", type: "rect", x: 0, y: 0, w: 100, h: 100, fill: "ink" },
      { id: "same", type: "rect", x: 10, y: 10, w: 100, h: 100, fill: "ink" },
      { id: "same", type: "rect", x: 20, y: 20, w: 100, h: 100, fill: "ink" },
    ],
  }, opts);
  const ids = doc.layers.map((l: { id: string }) => l.id);
  check("ids are made unique", new Set(ids).size === 3, JSON.stringify(ids));
}

// ── a runaway layer count ───────────────────────────────────────────────
{
  const many = Array.from({ length: 400 }, (_, i) => ({ id: `l${i}`, type: "rect", x: 0, y: 0, w: 10, h: 10, fill: "ink" }));
  const { doc, dropped } = validateDoc({ layers: many }, opts);
  check("the layer count is capped", doc.layers.length <= 60, String(doc.layers.length));
  check("the cap is reported", dropped.some((d) => d.what.includes("extra layers")), JSON.stringify(dropped));
}

// ── nothing at all must not throw, and must say so ──────────────────────
{
  const { doc, dropped } = validateDoc({}, opts);
  check("an empty reply yields a document", typeof doc === "object" && Array.isArray(doc.layers));
  check("an empty layout is reported", dropped.some((d) => d.what === "The whole layout"), JSON.stringify(dropped));
  check("it still carries a template to fall back to", doc.templateId === "v1");
  const nulled = validateDoc(null, opts);
  check("a null reply does not throw", Array.isArray(nulled.doc.layers));
  const junk = validateDoc({ layers: "not an array", palette: 42, content: "no" }, opts);
  check("junk types do not throw", Array.isArray(junk.doc.layers) && junk.doc.layers.length === 0);
}

// ── gradients and shapes ────────────────────────────────────────────────
{
  const { doc } = validateDoc({
    layers: [
      { id: "g", type: "gradient", x: 0, y: 0, w: 1080, h: 400, from: "gradientFrom", to: "#123456", angle: 999 },
      { id: "s", type: "rect", shape: "star", points: 99, innerRatio: 5, x: 0, y: 0, w: 100, h: 100, fill: "accent" },
      { id: "u", type: "rect", shape: "blob", x: 0, y: 0, w: 100, h: 100, fill: "accent" },
    ],
  }, opts);
  check("gradient stops survive", doc.layers[0].from === "gradientFrom" && doc.layers[0].to === "#123456");
  check("a wild angle is bounded", doc.layers[0].angle >= 0 && doc.layers[0].angle <= 360, String(doc.layers[0].angle));
  check("star points are bounded", doc.layers[1].points >= 3 && doc.layers[1].points <= 20, String(doc.layers[1].points));
  check("inner ratio stays a ratio", doc.layers[1].innerRatio > 0 && doc.layers[1].innerRatio < 1, String(doc.layers[1].innerRatio));
  check("an unknown shape becomes a rectangle", doc.layers[2].shape === "rect" || !doc.layers[2].shape, String(doc.layers[2].shape));
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
