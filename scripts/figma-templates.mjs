/**
 * Turn the Figma pack into template data.
 *
 *   node scripts/figma-templates.mjs          # all frames
 *   node scripts/figma-templates.mjs V7 A1    # just these
 *
 * WHY THIS IS A SCRIPT AND NOT A ONE-OFF TRANSCRIPTION
 *
 * The file has grown twice already — six frames, then twelve, now eighteen.
 * Hand-transcribing geometry is slow, silently wrong in ways that only show up
 * as a heading two pixels high, and has to be redone every time. This reads the
 * REST API and emits the layer data, so adding templates is running a command.
 *
 * It needs FIGMA_TOKEN in .env.local (a personal access token, file_content:read).
 *
 * HOW NODES ARE CLASSIFIED. Four rules, applied in order, walking each frame:
 *
 *   1. Anything named "Change Image Here" becomes a photo slot. Figma's own
 *      placeholder bitmap is discarded — it is a checkerboard, not a photograph.
 *   2. TEXT becomes a text layer, carrying Figma's real font, weight, size,
 *      line height, letter-spacing, alignment, case and colour.
 *   3. A subtree with no text anywhere in it is exported as one SVG. That is
 *      what makes the decoration exact: patterns, icons, logos, badges and card
 *      shapes are the pack's own vectors, never redrawn.
 *   4. A node that HAS text below it but also paints itself — a pill, a button,
 *      a card — contributes its own fill, stroke and corner radius as a rect,
 *      and then recursion continues into its children. Without this rule the
 *      pills would lose their backgrounds, because a frame's own fill is not
 *      one of its children.
 *
 * Rule 3 is why this produces near-pixel-accurate output with only three
 * primitives. Anything the script cannot model, it exports as artwork.
 */

import fs from "node:fs";
import path from "node:path";

const FILE_KEY = "U9BOOEbXYF9Ngk4NMB3mZD";
const OUT_ASSETS = "public/assets/designs";
const OUT_TS = "src/lib/designs/generated.ts";

/* ── Token ───────────────────────────────────────────────────────────────── */

function token() {
  const env = fs.readFileSync(".env.local", "utf8");
  const m = env.match(/^FIGMA_TOKEN=(.+)$/m);
  if (!m) {
    console.error("No FIGMA_TOKEN in .env.local. Add a personal access token with file_content:read.");
    process.exit(1);
  }
  return m[1].trim().replace(/^["']|["']$/g, "");
}

const TOK = token();
const api = async (url) => {
  const r = await fetch(url, { headers: { "X-Figma-Token": TOK } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
  const j = await r.json();
  if (j.err) throw new Error(j.err);
  return j;
};

/* ── Colour ──────────────────────────────────────────────────────────────── */

const hex = (c) =>
  "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");

const visible = (list) => (list ?? []).filter((p) => p.visible !== false && (p.opacity ?? 1) > 0.001);

/**
 * Figma's gradient handles → a CSS angle.
 *
 * Handles are two normalised points; the direction is p0→p1 with y pointing
 * down. CSS measures from "to top", clockwise. atan2(dx, -dy) is that
 * conversion — checked against the 232.33° the Figma plugin itself reports for
 * this pack's brand gradient.
 */
function gradientAngle(p) {
  const h = p.gradientHandlePositions;
  if (!h || h.length < 2) return 180;
  const dx = h[1].x - h[0].x;
  const dy = h[1].y - h[0].y;
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return Math.round(((deg % 360) + 360) % 360 * 100) / 100;
}

/* ── Node helpers ────────────────────────────────────────────────────────── */

const hasText = (n) =>
  n.type === "TEXT" || (n.children ?? []).some(hasText);

const isImageSlot = (n) => /change image here/i.test(n.name ?? "");

/** A frame that paints itself: a pill, a card, a button. */
function ownPaint(n) {
  const fills = visible(n.fills);
  const strokes = visible(n.strokes);
  if (!fills.length && !strokes.length) return null;
  return { fills, strokes };
}

function radiusOf(n) {
  if (typeof n.cornerRadius === "number") return n.cornerRadius;
  if (Array.isArray(n.rectangleCornerRadii)) return Math.max(...n.rectangleCornerRadii);
  return 0;
}

/* ── Extraction ──────────────────────────────────────────────────────────── */

let assetJobs = []; // { id, file }

function extract(frame) {
  const o = frame.absoluteBoundingBox;
  const layers = [];
  const content = {};
  const slug = frame.name.toLowerCase();
  let imageN = 0;
  let seq = 0;

  const box = (n) => {
    const b = n.absoluteBoundingBox;
    return {
      x: Math.round(b.x - o.x),
      y: Math.round(b.y - o.y),
      w: Math.round(b.width),
      h: Math.round(b.height),
    };
  };

  const id = (kind) => `${kind}${++seq}`;

  /**
   * A node's own paint, as layers.
   *
   * Returns one per visible fill rather than just the first: the webinar
   * family stacks a solid under a gradient on the frame itself, and reading
   * only fills[0] loses the gradient — which is the whole background.
   */
  function paintLayers(n) {
    const p = ownPaint(n);
    if (!p) return [];
    const b = box(n);
    const r = radiusOf(n);
    const out = [];

    for (const fill of p.fills) {
      if (fill.type === "SOLID") {
        out.push({ id: id("shape"), type: "rect", ...b, fillHex: hex(fill.color), opacity: fill.opacity ?? 1, radius: r });
      } else if (fill.type.startsWith("GRADIENT")) {
        const stops = fill.gradientStops ?? [];
        out.push({
          id: id("grad"), type: "gradient", ...b,
          fromHex: hex(stops[0]?.color ?? { r: 0, g: 0, b: 0 }),
          toHex: hex(stops[stops.length - 1]?.color ?? { r: 1, g: 1, b: 1 }),
          angle: gradientAngle(fill),
          radius: r,
        });
      }
    }

    // Figma aligns strokes INSIDE, OUTSIDE or CENTER; SVG only strokes on the
    // centre line. Half the weight is added or removed from the box so the
    // painted edge lands where the file puts it -- a 4px inside stroke drawn
    // centred sits 2px proud of the shape on every side.
    const inset = n.strokeAlign === "INSIDE" ? (n.strokeWeight ?? 1) / 2
      : n.strokeAlign === "OUTSIDE" ? -(n.strokeWeight ?? 1) / 2 : 0;
    if (inset && p.strokes.length) {
      for (const o of out) { o.x += inset; o.y += inset; o.w -= inset * 2; o.h -= inset * 2; }
    }

    // Stroke-only (the outlined pills). A transparent rect carrying the border,
    // which is exactly what those frames are.
    if (!out.length && p.strokes.length) {
      out.push({
        id: id("shape"), type: "rect",
        x: b.x + inset, y: b.y + inset, w: b.w - inset * 2, h: b.h - inset * 2,
        fillHex: "transparent", radius: r,
        strokeHex: hex(p.strokes[0].color), strokeWidth: n.strokeWeight ?? 1,
      });
    } else if (out.length && p.strokes.length) {
      const last = out[out.length - 1];
      last.strokeHex = hex(p.strokes[0].color);
      last.strokeWidth = n.strokeWeight ?? 1;
    }
    return out;
  }

  /**
   * A TEXT node's per-character styling, collapsed into runs.
   *
   * Figma stores this as one style id per character plus a lookup table. Two
   * of the pack's headlines use it for the accent-coloured phrase that is the
   * whole point of the layout, and reading only `node.style` flattened them to
   * a single colour -- a loss that renders perfectly happily and so went
   * unnoticed until the import was audited.
   *
   * Returns a plain string when nothing varies, because most copy does not
   * vary and a run list would be noise in the generated file.
   */
  function richOf(n, base) {
    const ov = n.characterStyleOverrides ?? [];
    const table = n.styleOverrideTable ?? {};
    const chars = n.characters ?? "";
    if (!chars || !ov.some((v) => v !== 0)) return chars;

    const runs = [];
    for (let i = 0; i < chars.length; i++) {
      const k = ov[i] ?? 0;
      if (runs.length && runs[runs.length - 1].k === k) runs[runs.length - 1].text += chars[i];
      else runs.push({ k, text: chars[i] });
    }

    const out = runs.map(({ k, text }) => {
      const o = k ? (table[k] ?? {}) : {};
      const run = { text };
      const fill = visible(o.fills)[0];
      if (fill?.type === "SOLID") run.fillHex = hex(fill.color);
      if (o.fontWeight && o.fontWeight !== base.weight) run.weight = o.fontWeight;
      if (o.fontSize && o.fontSize !== base.size) run.size = Math.round(o.fontSize * 100) / 100;
      if (o.fontFamily && o.fontFamily !== base.font) run.font = o.fontFamily;
      if (/italic/i.test(o.fontPostScriptName ?? "")) run.italic = true;
      return run;
    });
    // Every run identical to the base is the same as no runs at all.
    return out.every((r) => Object.keys(r).length === 1) ? chars : out;
  }

  function textLayer(n) {
    const s = n.style ?? {};
    const fill = visible(n.fills)[0];
    const b = box(n);
    const slot = slotFor(n, content);
    const base = {
      font: s.fontFamily ?? "Plus Jakarta Sans",
      size: Math.round((s.fontSize ?? 32) * 100) / 100,
      weight: s.fontWeight ?? 500,
    };
    content[slot] = richOf(n, base);
    return {
      id: id("text"), type: "text", ...b, slot,
      font: s.fontFamily ?? "Plus Jakarta Sans",
      size: Math.round((s.fontSize ?? 32) * 100) / 100,
      weight: s.fontWeight ?? 500,
      italic: /italic/i.test(s.fontPostScriptName ?? ""),
      lineHeight: s.lineHeightPercentFontSize ? Math.round(s.lineHeightPercentFontSize) / 100 : 1.2,
      tracking: Math.round((s.letterSpacing ?? 0) * 100) / 100,
      align: (s.textAlignHorizontal ?? "LEFT").toLowerCase(),
      textCase: s.textCase ?? null,
      fillHex: fill?.type === "SOLID" ? hex(fill.color) : "#000000",
    };
  }

  function walk(n, depth) {
    if (n.visible === false) return;

    if (isImageSlot(n)) {
      imageN++;
      if (imageN <= 3) layers.push({ id: id("image"), type: "image", ...box(n), slot: `image${imageN}`, radius: radiusOf(n) });
      return;
    }

    if (n.type === "TEXT") {
      layers.push(textLayer(n));
      return;
    }

    // A text-free subtree is artwork. Export it whole so the shapes stay the
    // pack's own rather than an approximation of them.
    if (depth > 0 && !hasText(n)) {
      const b = box(n);
      if (b.w < 1 || b.h < 1) return;
      const file = `${slug}-${n.id.replace(/[:;]/g, "_")}`;
      assetJobs.push({ id: n.id, file });
      layers.push({ id: id("art"), type: "asset", ...b, src: `/assets/designs/${file}.svg`, opacity: n.opacity ?? 1 });
      return;
    }

    // Paints itself AND contains text: a pill, a card, a button — or, at
    // depth 0, the frame's own background. V1-V12 use a child rectangle for
    // that; the webinar family paints the frame directly, and skipping depth 0
    // left those six with no background at all and white text on white.
    for (const l of paintLayers(n)) layers.push(l);

    for (const c of n.children ?? []) walk(c, depth + 1);
  }

  walk(frame, 0);
  return { layers, content };
}

/**
 * Which content slot a text node fills.
 *
 * Figma's own layer names carry the intent — Title, Subtitle, Description,
 * Statistic — so they are used where they exist. Where a designer named the
 * layer after its words instead ("What Say Us?"), the name is useless as a slot
 * and a positional fallback is used. Collisions get a numeric suffix rather
 * than silently overwriting: two headlines on one design are two slots.
 */
function slotFor(n, content) {
  const raw = (n.name ?? "").toLowerCase();
  const known = [
    ["title", /^title/], ["subtitle", /^sub|^subtitle/], ["description", /^desc/],
    ["statistic", /^stat|^\d/], ["testimonial", /^testimonial|^quote/],
    ["cta", /^button|^cta/], ["phone", /phone|number/], ["website", /website|www/],
    ["score", /^score/],
  ];
  let base = known.find(([, re]) => re.test(raw))?.[0];
  if (!base) {
    // Long copy reads as body, short copy as a label. Crude, and better than
    // inventing a slot name from the placeholder sentence.
    base = (n.characters ?? "").length > 60 ? "description" : "title";
  }
  if (!(base in content)) return base;
  let i = 2;
  while (`${base}${i}` in content) i++;
  return `${base}${i}`;
}

/* ── SVG export ──────────────────────────────────────────────────────────── */

async function exportAssets(jobs) {
  fs.mkdirSync(OUT_ASSETS, { recursive: true });
  const todo = jobs.filter((j) => !fs.existsSync(path.join(OUT_ASSETS, `${j.file}.svg`)));
  console.log(`assets: ${jobs.length} referenced, ${todo.length} to fetch`);

  // Figma caps the ids per request; batches also keep one failure from losing
  // the whole export.
  const BATCH = 40;
  let ok = 0;
  const failed = [];
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const ids = batch.map((b) => b.id).join(",");
    const j = await api(`https://api.figma.com/v1/images/${FILE_KEY}?ids=${encodeURIComponent(ids)}&format=svg`);
    for (const b of batch) {
      const url = j.images?.[b.id];
      if (!url) { failed.push(b.file); continue; }
      const r = await fetch(url);
      if (!r.ok) { failed.push(b.file); continue; }
      const svg = Buffer.from(await r.arrayBuffer());
      if (svg.length < 40) { failed.push(b.file); continue; }
      fs.writeFileSync(path.join(OUT_ASSETS, `${b.file}.svg`), svg);
      ok++;
    }
    process.stdout.write(`  ${Math.min(i + BATCH, todo.length)}/${todo.length}\r`);
  }
  console.log(`\nassets: ${ok} written, ${failed.length} failed`);
  // Loud, because a missing asset is a hole in a template and the template
  // still renders — which is exactly how it would go unnoticed.
  if (failed.length) console.error("FAILED:", failed.join(", "));
  return failed;
}

/* ── Main ────────────────────────────────────────────────────────────────── */

const only = process.argv.slice(2);

const file = await api(`https://api.figma.com/v1/files/${FILE_KEY}`);
const page = file.document.children[0];
const frames = page.children.filter((c) => c.type === "FRAME" && (!only.length || only.includes(c.name)));
console.log(`file "${file.name}" — ${frames.length} frame(s)\n`);

const out = {};
for (const f of frames) {
  const { layers, content } = extract(f);
  out[f.name] = { layers, content };
  const kinds = layers.reduce((a, l) => ((a[l.type] = (a[l.type] ?? 0) + 1), a), {});
  console.log(`${f.name.padEnd(4)} ${String(layers.length).padStart(3)} layers  ${JSON.stringify(kinds)}`);
}

const failed = await exportAssets(assetJobs);

// Drop layers whose artwork could not be fetched, rather than emitting a
// template that references a file which is not there.
if (failed.length) {
  const bad = new Set(failed.map((f) => `/assets/designs/${f}.svg`));
  for (const t of Object.values(out)) {
    t.layers = t.layers.filter((l) => l.type !== "asset" || !bad.has(l.src));
  }
}

fs.writeFileSync(
  OUT_TS,
  `// GENERATED by scripts/figma-templates.mjs — do not edit by hand.\n` +
  `// Source: Figma file ${FILE_KEY} ("${file.name}"), version ${file.version}.\n` +
  `// Re-run the script after changing the Figma file.\n\n` +
  `import type { RawTemplate } from "./raw";\n\n` +
  `export const RAW_TEMPLATES: Record<string, RawTemplate> = ${JSON.stringify(out, null, 2)};\n`,
  "utf8",
);
console.log(`\nwrote ${OUT_TS}`);
