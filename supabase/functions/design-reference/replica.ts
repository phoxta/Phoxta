// Phoxta — turning what a vision model saw into a document the canvas can draw.
//
// WHY THIS IS THE HARD HALF. Asking a model for copy is forgiving: bad copy is
// still a string, and the worst case is a sentence somebody rewrites. Asking a
// model for LAYOUT is not. It returns absolute geometry, and a single layer
// with `w: -40`, a font size of 0, a slot nobody has heard of or a fill of
// "primaryBlue" does not degrade the design — it throws in the renderer, or
// paints nothing, or covers the artboard in one black rectangle. The editor
// then opens on a blank page with no way back.
//
// So nothing the model says about geometry is trusted. Every number is clamped
// into the artboard, every enum is checked against the real vocabulary, and
// anything that survives none of that is DROPPED and reported rather than
// silently repaired into something plausible — the owner is told "3 layers I
// could not read were left out", which is a thing they can act on.
//
// The vocabulary here is src/lib/designs/types.ts. It is duplicated rather than
// imported because that file is browser TypeScript and this is Deno; the test
// (scripts/replica-test) pins the two together by asserting on the same names.

// deno-lint-ignore no-explicit-any
type Json = any;

/** Artboard sizes. Mirrors formatDims in src/lib/designs/types.ts. */
export const DIMS: Record<string, { w: number; h: number }> = {
  portrait: { w: 1080, h: 1350 },
  square: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
  landscape: { w: 1200, h: 628 },
};

export const TEXT_SLOTS = [
  "title", "subtitle", "description", "statistic",
  "testimonial", "quote", "cta", "phone", "website",
  "point1", "point2", "point3", "score",
];

export const IMAGE_SLOTS = ["image1", "image2", "image3", "image4", "image5", "image6"];

const SHAPES = ["rect", "ellipse", "triangle", "diamond", "pentagon", "hexagon", "star", "line", "arrow"];

/** Palette roles a fill may name, plus the three literals the painter accepts. */
export const PAINT_ROLES = [
  "canvas", "ink", "accent", "accentSoft", "gradientFrom", "gradientTo",
  "white", "black", "transparent",
];

/** The six families the template pack ships. A face outside this list would
 *  silently fall back to a system font and the design would not look like the
 *  reference at all — which is worse than being told it was substituted. */
export const FONTS = [
  "Plus Jakarta Sans", "DM Sans", "Mona Sans", "PT Serif", "Poppins", "Inter",
];

/** A model asked for "the layers" will occasionally return a thousand. */
const MAX_LAYERS = 60;

const hex = (v: unknown): string => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : "");
const num = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(String(v)) ? String(v) as T : fallback;

export type Dropped = { what: string; why: string };

/**
 * A fill the painter will understand.
 *
 * A model describing a reference names colours as it sees them — "#F4F1EA",
 * "cream", "primary". A hex is kept as a hex (the painter takes one); a known
 * role is kept as a role, which is what makes the result re-themeable by the
 * tenant's brand; anything else becomes `ink`, because an unknown fill paints
 * nothing and an invisible layer reads as a missing one.
 */
function fillOf(v: unknown): string {
  const h = hex(v);
  if (h) return h;
  const s = String(v ?? "").trim();
  if (PAINT_ROLES.includes(s)) return s;
  return "ink";
}

/**
 * Everything the model said about one layer, made safe.
 *
 * Returns null when there is nothing recoverable — an unknown `type` is not
 * repairable, because guessing between a photograph and a headline produces a
 * design that is wrong in a way nobody can see the cause of.
 */
function layerOf(raw: Json, i: number, board: { w: number; h: number }): Json | null {
  const type = String(raw?.type ?? "");
  if (!["rect", "gradient", "image", "text", "chip"].includes(type)) return null;

  // Geometry first: everything below assumes a box that exists on the page.
  const w = clamp(Math.round(num(raw?.w, 100)), 4, board.w);
  const h = clamp(Math.round(num(raw?.h, 100)), 4, board.h);
  const base: Json = {
    id: String(raw?.id ?? "").trim() || `l${i}`,
    name: String(raw?.name ?? "").slice(0, 60) || undefined,
    x: clamp(Math.round(num(raw?.x, 0)), 0, Math.max(0, board.w - w)),
    y: clamp(Math.round(num(raw?.y, 0)), 0, Math.max(0, board.h - h)),
    w, h,
  };
  const rot = num(raw?.rotation, 0);
  if (rot) base.rotation = clamp(rot, -360, 360);
  const alpha = num(raw?.alpha, 1);
  if (alpha !== 1) base.alpha = clamp(alpha, 0, 1);

  if (type === "text" || type === "chip") {
    const slot = pick(raw?.slot, TEXT_SLOTS, "description");
    const t: Json = {
      ...base,
      type,
      slot,
      // A size of 0 paints nothing; a size of 900 covers the page. Both are
      // things a model has actually returned.
      size: clamp(Math.round(num(raw?.size, 32)), 8, Math.round(board.h / 3)),
      fill: fillOf(raw?.fill),
    };
    if (type === "text") {
      t.weight = clamp(Math.round(num(raw?.weight, 500) / 100) * 100, 100, 900);
      // LINE HEIGHT IS CAPPED WELL BELOW WHAT CSS ALLOWS, and that is
      // deliberate. It was [0.8, 3] and a real rebuild came back with 3 on a
      // 72px headline: each line then claims 216px, only one line fits the
      // 300px box, and the copy budget derived from that box drops to 24
      // characters — so every headline in the month was written and then cut
      // to "Explore AI-Powered Busi…". Nothing looked broken anywhere; the
      // layer was simply wrong, and the truncation was downstream.
      //
      // Above roughly 2.2 is not a line height a designer sets on a text
      // layer — it is the model misreading vertical space as leading. Real
      // designs live between 0.9 and 1.8.
      t.lineHeight = clamp(num(raw?.lineHeight, 1.2), 0.8, 2.2);
      t.tracking = clamp(num(raw?.tracking, 0), -20, 20);
      // And a last consistency check between two numbers the model gave: a
      // layer whose leading exceeds its own box cannot fit even one line, so
      // whatever it meant, it did not mean this.
      if (t.size * t.lineHeight > h) t.lineHeight = clamp(h / t.size, 0.8, 2.2);
      t.align = pick(raw?.align, ["left", "center", "right"], "left");
      if (FONTS.includes(String(raw?.font))) t.font = String(raw.font);
      if (raw?.italic === true) t.italic = true;
    }
    return t;
  }

  if (type === "image") {
    return { ...base, type, slot: pick(raw?.slot, IMAGE_SLOTS, "image1"), radius: clamp(Math.round(num(raw?.radius, 0)), 0, 400) };
  }

  if (type === "gradient") {
    return {
      ...base, type,
      from: fillOf(raw?.from ?? "gradientFrom"),
      to: fillOf(raw?.to ?? "gradientTo"),
      angle: clamp(Math.round(num(raw?.angle, 180)), 0, 360),
      radius: clamp(Math.round(num(raw?.radius, 0)), 0, 400),
    };
  }

  // rect
  const r: Json = { ...base, type: "rect", fill: fillOf(raw?.fill), radius: clamp(Math.round(num(raw?.radius, 0)), 0, 400) };
  const shape = String(raw?.shape ?? "");
  if (shape && shape !== "rect") r.shape = pick(shape, SHAPES, "rect");
  if (r.shape === "star") {
    r.points = clamp(Math.round(num(raw?.points, 5)), 3, 20);
    r.innerRatio = clamp(num(raw?.innerRatio, 0.5), 0.1, 0.9);
  }
  return r;
}

/**
 * The whole document, checked.
 *
 * `templateId` still matters even when the document owns every layer: it is
 * where the palette falls back to, so a reference-derived layout that names a
 * role rather than a hex still paints something sensible. The caller passes one
 * that really exists.
 */
export function validateDoc(
  raw: Json,
  opts: { templateId: string; format?: string },
): { doc: Json; dropped: Dropped[] } {
  const dropped: Dropped[] = [];
  const format = pick(raw?.format ?? opts.format, ["portrait", "square", "story", "landscape"], "portrait");
  const board = DIMS[format];

  const rawLayers: Json[] = Array.isArray(raw?.layers) ? raw.layers : [];
  if (rawLayers.length > MAX_LAYERS) {
    dropped.push({
      what: `${rawLayers.length - MAX_LAYERS} extra layers`,
      why: `A design this reference-heavy is past what the canvas stays editable at, so the first ${MAX_LAYERS} were kept.`,
    });
  }

  const layers: Json[] = [];
  const seen = new Set<string>();
  let unreadable = 0;
  for (const [i, l] of rawLayers.slice(0, MAX_LAYERS).entries()) {
    const made = layerOf(l, i, board);
    if (!made) { unreadable++; continue; }
    // Duplicate ids make the editor select and move the wrong layer.
    while (seen.has(made.id)) made.id = `${made.id}_${i}`;
    seen.add(made.id);
    layers.push(made);
  }
  if (unreadable) {
    dropped.push({
      what: `${unreadable} layer${unreadable === 1 ? "" : "s"}`,
      why: "Not a kind this canvas draws — left out rather than guessed at.",
    });
  }

  // A document with no layers is a blank page. Better to say so than to open
  // the editor on nothing and let the owner wonder what went wrong.
  if (!layers.length) {
    dropped.push({ what: "The whole layout", why: "Nothing in it could be read as a layer." });
  }

  // Palette: only the six real roles, only real hexes. A named colour that is
  // not a hex is dropped rather than approximated — the tenant's own brand is
  // the fallback, and an invented near-match is worse than their real one.
  const palette: Record<string, string> = {};
  for (const role of ["canvas", "ink", "accent", "accentSoft", "gradientFrom", "gradientTo"]) {
    const h = hex(raw?.palette?.[role]);
    if (h) palette[role] = h;
  }

  const content: Record<string, string> = {};
  for (const slot of TEXT_SLOTS) {
    const v = raw?.content?.[slot];
    if (typeof v === "string" && v.trim()) content[slot] = v.trim().slice(0, 400);
  }

  return {
    doc: {
      templateId: opts.templateId,
      v: 1,
      format,
      layers,
      content,
      images: {},
      ...(Object.keys(palette).length ? { palette } : {}),
    },
    dropped,
  };
}
