import { RAW_TEMPLATES } from "./generated";
import type { RawLayer, RawRun, RawTemplate } from "./raw";
import type { Copy, TextRun } from "./types";
import { DEFAULT_PALETTE, type Layer, type Palette, type PaintRole, type Template, type TextSlot } from "./types";

/**
 * Figma's vocabulary → the app's.
 *
 * The generated file is a faithful dump: literal hexes, real font names, real
 * text cases. This is the one place that decides what those mean to Phoxta, so
 * the mapping can be read and argued with rather than being buried in a script
 * nobody opens because it is generated.
 *
 * THE PROBLEM THIS SOLVES. The pack is three families with three different
 * brand colours — the blue agency set, the violet set, the webinar set. A
 * single global palette would render the violet templates blue, and mapping
 * nothing to roles at all would mean a tenant's brand colour reached none of
 * them. So each template gets its OWN default palette, derived from the colours
 * that template actually uses, and its hexes are mapped to roles against that.
 * Override `accent` and every family recolours correctly.
 */

/* ── Which hexes are brand colours ───────────────────────────────────────
   Twelve colours across eighteen templates, so this is a table rather than a
   heuristic. A colour not listed here stays a literal hex, which is the right
   default: a one-off lime highlight is not a brand role and should not move
   when someone changes their accent. */

const INKS = new Set(["#14194e", "#150532", "#141a4b", "#010101"]);
const ACCENTS = new Set(["#1c56fd", "#1a59fa", "#5128e6", "#1230e3", "#2b60ff"]);
const ACCENT_SOFTS = new Set(["#6297f9", "#e9ecff", "#edf3f1"]);

/** Count the brand colours a template uses, most-used first. */
function tally(layers: RawLayer[], set: Set<string>): string[] {
  const n = new Map<string, number>();
  for (const l of layers) {
    const hexes: string[] = [];
    if (l.type === "rect") { hexes.push(l.fillHex); if (l.strokeHex) hexes.push(l.strokeHex); }
    else if (l.type === "gradient") hexes.push(l.fromHex, l.toHex);
    else if (l.type === "text") hexes.push(l.fillHex);
    for (const h of hexes) {
      const k = h.toLowerCase();
      if (set.has(k)) n.set(k, (n.get(k) ?? 0) + 1);
    }
  }
  return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([h]) => h);
}

/** The palette a template defaults to: its own colours, not the pack's first family. */
function paletteFor(raw: RawTemplate): Palette {
  const ink = tally(raw.layers, INKS)[0];
  const accent = tally(raw.layers, ACCENTS)[0];
  const soft = tally(raw.layers, ACCENT_SOFTS)[0];
  const grad = raw.layers.find((l) => l.type === "gradient") as Extract<RawLayer, { type: "gradient" }> | undefined;

  // The page ground is whatever the full-bleed backmost layer paints.
  const bg = raw.layers.find((l) => l.type === "rect" && l.w >= 1000 && l.h >= 1200) as Extract<RawLayer, { type: "rect" }> | undefined;

  return {
    canvas: bg?.fillHex && bg.fillHex !== "transparent" ? bg.fillHex : DEFAULT_PALETTE.canvas,
    ink: ink ?? DEFAULT_PALETTE.ink,
    accent: accent ?? DEFAULT_PALETTE.accent,
    accentSoft: soft ?? accent ?? DEFAULT_PALETTE.accentSoft,
    gradientFrom: grad?.fromHex ?? accent ?? DEFAULT_PALETTE.gradientFrom,
    gradientTo: grad?.toHex ?? DEFAULT_PALETTE.gradientTo,
  };
}

/** A hex becomes a role when it is one of that template's brand colours. */
function role(hexRaw: string | undefined, p: Palette): PaintRole {
  if (!hexRaw) return "transparent";
  const h = hexRaw.toLowerCase();
  if (h === "transparent") return "transparent";
  if (h === "#ffffff") return "white";
  if (h === "#000000") return "black";
  if (h === p.ink.toLowerCase()) return "ink";
  if (h === p.accent.toLowerCase()) return "accent";
  if (h === p.accentSoft.toLowerCase()) return "accentSoft";
  if (h === p.canvas.toLowerCase()) return "canvas";
  return h as PaintRole; // a literal hex, which paint() passes straight through
}

/* ── Slots ───────────────────────────────────────────────────────────────
   The extractor invents slot names from Figma's layer names, which produces
   things like "title2" and "description3". They are kept: a template with two
   headlines genuinely has two, and forcing them into one vocabulary would make
   the second overwrite the first. */

const SLOT = (s: string) => s as TextSlot;

/* ── Layers ──────────────────────────────────────────────────────────────── */

/**
 * A layer that covers the whole artboard is the background.
 *
 * Locked by default, so pressing on it starts a marquee or clears the
 * selection the way it does in every design tool — rather than picking the
 * background up and dragging the entire design sideways, which is what happens
 * when the biggest layer on the canvas is also the easiest one to grab. It can
 * still be selected from the layers panel to change its colour.
 */
const isBackdrop = (l: RawLayer) => l.x <= 0 && l.y <= 0 && l.w >= 1080 && l.h >= 1350;

function toLayer(l: RawLayer, p: Palette): Layer {
  const base = { id: l.id, x: l.x, y: l.y, w: l.w, h: l.h, locked: isBackdrop(l) || undefined };

  switch (l.type) {
    case "rect":
      return {
        ...base, type: "rect", fill: role(l.fillHex, p), radius: l.radius || undefined,
        opacity: l.opacity != null && l.opacity < 1 ? l.opacity : undefined,
        strokeColor: l.strokeHex ? role(l.strokeHex, p) : undefined,
        strokeWidth: l.strokeWidth,
      };

    case "gradient":
      return {
        ...base, type: "gradient",
        from: role(l.fromHex, p), to: role(l.toHex, p), angle: l.angle,
        radius: l.radius || undefined,
      };

    case "asset":
      return { ...base, type: "asset", src: l.src, opacity: l.opacity != null && l.opacity < 1 ? l.opacity : undefined };

    case "image":
      return { ...base, type: "image", slot: l.slot as "image1" | "image2" | "image3", radius: l.radius || undefined };

    case "text":
      return {
        ...base, type: "text", slot: SLOT(l.slot),
        font: l.font, italic: l.italic || undefined,
        size: l.size, weight: l.weight, fill: role(l.fillHex, p),
        lineHeight: l.lineHeight, tracking: l.tracking,
        align: l.align === "center" ? "center" : l.align === "right" ? "right" : "left",
        uppercase: l.textCase === "UPPER" || undefined,
        capitalize: l.textCase === "TITLE" || undefined,
        // Every headline can carry the two-tone treatment; it only shows if
        // someone actually types asterisks.
        accent: "accent",
      };
  }
}

/**
 * A Figma character-style override becomes a run.
 *
 * Size is converted to a MULTIPLIER of the layer's own size rather than kept
 * absolute, so scaling a layer — or scaling a whole group — carries its
 * emphasised words along with it instead of leaving them behind at their
 * original point size.
 */
function toRun(r: RawRun, p: Palette, layerSize?: number): TextRun {
  const out: TextRun = { text: r.text };
  if (r.fillHex) out.fill = role(r.fillHex, p);
  if (r.weight) out.weight = r.weight;
  if (r.size && layerSize) out.scale = Math.round((r.size / layerSize) * 1000) / 1000;
  if (r.font) out.font = r.font;
  if (r.italic) out.italic = true;
  return out;
}

/* ── Names ───────────────────────────────────────────────────────────────
   Figma calls them V1…A6, which tells a founder nothing. These are written by
   hand because "what is this layout for" is a judgement, not something the
   file records — and the model is given the same sentence when it picks a
   layout, so a bad description produces a badly-chosen template. */

const META: Record<string, { name: string; purpose: string }> = {
  V1: { name: "Statement", purpose: "Light and typographic. One big two-tone headline, a supporting line in a navy card, two photographs. Say one thing." },
  V2: { name: "Proof", purpose: "Gradient, built around one number. Headline, trust line, oversized statistic, three chips, a score. Use when the point is evidence." },
  V3: { name: "Testimonial", purpose: "A centred customer quote over a wide photograph, in a navy card. Social proof in their words." },
  V4: { name: "Full bleed", purpose: "One photograph edge to edge with the headline read out of it, and a stat card. Use when the picture is the message." },
  V5: { name: "Audience", purpose: "Three circular portraits over three labelled pills. Name who the offer is for, or introduce a team." },
  V6: { name: "Offer", purpose: "Gradient ending in a button, with a tall photograph and a big success number. Use when you want a click." },
  V7: { name: "Quote card", purpose: "Violet. A client quote in a speech bubble beside a portrait, with a Join Now button. Warm and personal." },
  V8: { name: "Services", purpose: "Dark violet. A three-line headline in mixed serif and sans, over two described service cards. Use to explain what you do." },
  V9: { name: "Numbers", purpose: "Light. A headline, two topic pills, a short quote and three stat cards of different heights. Use for results." },
  V10: { name: "Process", purpose: "Cream and editorial. A very large headline with stage pills threaded through it. Use to explain how you work." },
  V11: { name: "Benefits", purpose: "Dark violet. Four staggered benefit pills with icons. Use to list what someone gets." },
  V12: { name: "Invitation", purpose: "Violet with a white card. A short question and one clear call to action. Use to ask for the click." },
  A1: { name: "Webinar", purpose: "Blue event post. Title, date card, time, registration line and a cut-out speaker. Use to announce a session." },
  A2: { name: "Agenda", purpose: "Dark. A headline, a highlighted strapline and four bulleted talking points. Use to list what a session covers." },
  A3: { name: "Speakers", purpose: "Three named speakers with portraits, date and time. Use to introduce who is presenting." },
  A4: { name: "Topic", purpose: "Split photographs with a big topic headline, date and time cards. Use for a single subject session." },
  A5: { name: "Strategy", purpose: "Blue with a large cut-out portrait and a date card. Use for a headline claim with a face behind it." },
  A6: { name: "Checklist", purpose: "Dark. Four ticked promises beside a speaker, with date and contact. Use to say what someone will walk away with." },
};

/* ── Two-tone headlines ──────────────────────────────────────────────────
   Figma stores per-character style overrides, and the extractor that produced
   `generated.ts` flattened them: it reads one style for a whole TEXT node. On
   sixteen of the eighteen templates that loses nothing, because the copy is
   uniform. On two it loses the accent-coloured phrase that is the entire point
   of the headline — "Finding **Jeans Hard** Enough in Person" rendered as one
   flat navy line.

   These two are restored here as runs, from the file's own
   characterStyleOverrides. They are applied only where the generated content
   is still a plain string, so once the extractor emits runs itself (it now
   does — see scripts/figma-templates.mjs) this table stops firing rather than
   fighting it.

   V1 also carries a second correction: its TEXT node reports weight 600 while
   every one of its runs is Bold, so the flattened import rendered the headline
   a step light. */

const TWO_TONE: Record<string, Partial<Record<string, Copy>>> = {
  V1: {
    title: [
      { text: "Finding ", weight: 700 },
      { text: "Jeans Hard", weight: 700, fill: "accent" },
      { text: " Enough in Person", weight: 700 },
    ],
  },
  V3: {
    title: [
      { text: "What They say " },
      { text: "about us", fill: "accent" },
    ],
  },
};

/* ── Build ───────────────────────────────────────────────────────────────── */

function build(key: string, raw: RawTemplate): Template {
  const palette = paletteFor(raw);
  const meta = META[key] ?? { name: key, purpose: "A social post layout." };

  const content: Partial<Record<TextSlot, Copy>> = {};
  for (const [slot, value] of Object.entries(raw.content)) {
    content[SLOT(slot)] = typeof value === "string" ? value : value.map((r) => toRun(r, palette));
  }
  for (const [slot, runs] of Object.entries(TWO_TONE[key] ?? {})) {
    if (typeof content[SLOT(slot)] === "string" && runs) content[SLOT(slot)] = runs;
  }

  const imageHints: Template["imageHints"] = {};
  for (const l of raw.layers) {
    if (l.type !== "image") continue;
    // Tall and narrow reads as a person; wide reads as a scene. Crude, and it
    // stops the model being asked for "a photograph" with no other guidance.
    imageHints[l.slot as "image1"] = l.h > l.w * 1.3 ? "a person, portrait orientation" : "a scene from the business";
  }

  return {
    id: key.toLowerCase(),
    name: meta.name,
    purpose: meta.purpose,
    palette,
    layers: raw.layers.map((l) => toLayer(l, palette)),
    content,
    imageHints,
  };
}

/** Figma's canvas order is arbitrary; this is the order a founder sees. */
const ORDER = ["V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10", "V11", "V12", "A1", "A2", "A3", "A4", "A5", "A6"];

export const TEMPLATES: Template[] = ORDER
  .filter((k) => RAW_TEMPLATES[k])
  .map((k) => build(k, RAW_TEMPLATES[k]));
