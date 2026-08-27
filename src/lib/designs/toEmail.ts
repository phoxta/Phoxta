import type { Block } from "@email";
import { plain } from "./rich";
import { CANVAS_H, CANVAS_W, paint, resolvePalette, type DesignDoc, type Layer, type Palette } from "./types";
import { layersOf } from "./templates";

/**
 * A design, converted into email blocks — real HTML, not a picture of one.
 *
 * WHY THIS IS POSSIBLE AT ALL, having said it was not. A canvas design is not
 * only a bitmap waiting to happen: every text layer carries a SLOT — title,
 * subtitle, description, quote, cta, point1..3 — so the document already says
 * what each piece of copy IS, not merely where it sits. That is a content
 * model, and a content model converts.
 *
 * WHAT CONVERTS, AND WHAT CANNOT.
 *
 *   Converts     the words and their roles, the reading order, the button and
 *                its link, the photographs, and whether the whole thing sits
 *                on a dark ground.
 *
 *   Cannot       exact positions, overlap, rotation, and the design's own
 *                typefaces. Outlook renders with Word: no position:absolute,
 *                no transform, no @font-face. And no client will load the
 *                canvas's six faces, so every line re-wraps to whatever face
 *                the reader has — which moves any text that was placed to fit
 *                a box exactly.
 *
 * So this is an INTERPRETATION, not a photocopy, and it is the better trade
 * for most designs: the result is readable at any width, readable with images
 * switched off, selectable, translatable, and every word of it still editable
 * afterwards. When the design's exact look is the point — a poster, a piece of
 * lettering, anything where the typography IS the message — import it as a
 * picture instead and slice it for links.
 *
 * Reading order is `y` then `x`, which is how these templates are built and
 * how anyone reads them. A design that deliberately fights that order is one
 * of the ones to import as a picture.
 */

/** Roughly the artboard, allowing for a layer bled a little past the edge. */
const isFullBleed = (l: Layer) =>
  l.x <= CANVAS_W * 0.02 && l.y <= CANVAS_H * 0.02 &&
  l.w >= CANVAS_W * 0.96 && l.h >= CANVAS_H * 0.96;

/** Perceived lightness, so a dark ground becomes a dark band rather than an
 *  unreadable one. Rec. 709 luma is close enough for a yes/no. */
function isDark(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const l = 0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255);
  return l < 128;
}

function backgroundOf(layers: Layer[], palette: Palette): string | null {
  for (const l of layers) {
    if (l.hidden || !isFullBleed(l)) continue;
    if (l.type === "rect") return paint(l.fill, palette);
    if (l.type === "gradient") return paint(l.from, palette);
  }
  return null;
}

export type ConvertResult = {
  blocks: Block[];
  /** What could not come across, in the words a person would use. Shown before
   *  the conversion is accepted, because a silent loss is the whole problem
   *  with this kind of feature. */
  lost: string[];
};

export function designToBlocks(doc: DesignDoc, opts?: { link?: string }): ConvertResult {
  const palette = resolvePalette(doc);
  const layers = layersOf(doc).filter((l) => !l.hidden);
  const lost: string[] = [];

  const bg = backgroundOf(layers, palette);
  const dark = bg ? isDark(bg) : false;

  if (layers.some((l) => (l.rotation ?? 0) !== 0)) {
    lost.push("Rotated layers are set straight — email cannot rotate anything in Outlook.");
  }
  if (layers.some((l) => l.type === "asset")) {
    lost.push("Decorative shapes and vector marks are dropped; they carry no words.");
  }
  const faces = new Set(layers.flatMap((l) => (l.type === "text" && l.font ? [l.font] : [])));
  if (faces.size > 0) {
    lost.push(`Set in the email's own face instead of ${[...faces].join(", ")} — no mail client loads a webfont reliably.`);
  }

  // Reading order. These templates lay out top to bottom, and so does an email.
  const ordered = layers.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x));

  const points: string[] = [];
  const body: Block[] = [];

  for (const l of ordered) {
    if (l.type === "rect" || l.type === "gradient") {
      // The full-bleed one became the band; the rest are decoration behind
      // words that are themselves coming across.
      if (!isFullBleed(l)) lost.push("Background panels behind text are dropped — the text itself comes across.");
      continue;
    }
    if (l.type === "asset") continue;

    if (l.type === "image") {
      const url = doc.images?.[l.slot]?.url;
      if (!url) continue;
      body.push({ type: "figure", img: url, alt: doc.images?.[l.slot]?.alt || "" } as Block);
      continue;
    }

    if (l.type === "chip") {
      const label = plain(doc.content?.[l.slot]).trim();
      if (!label) continue;
      // A chip is the design's button. In an email it becomes a real one, with
      // a real href — which is the thing a picture of a button can never be.
      body.push({ type: "button", label, href: opts?.link ?? "" } as Block);
      continue;
    }

    // text
    const text = plain(doc.content?.[l.slot]).trim();
    if (!text) continue;
    const cased = l.uppercase ? text.toUpperCase() : text;

    switch (l.slot) {
      case "title":
        body.push({ type: "section", label: "", title: cased } as Block);
        break;
      case "subtitle":
        body.push({ type: "lead", text: cased } as Block);
        break;
      case "quote":
      case "testimonial":
        body.push({ type: "quote", text: cased } as Block);
        break;
      case "statistic":
      case "score":
        body.push({ type: "panel", big: cased, small: "" } as Block);
        break;
      case "point1":
      case "point2":
      case "point3":
        points.push(cased);
        break;
      case "phone":
      case "website":
      case "cta":
      case "description":
      default:
        body.push({ type: "text", text: cased } as Block);
        break;
    }
  }

  // The three point slots are one list, not three paragraphs — that is what
  // they are on the canvas too, spaced evenly down a column.
  if (points.length) {
    const at = body.findIndex((b) => b.type === "button");
    const list = { type: "list", items: points } as Block;
    if (at >= 0) body.splice(at, 0, list); else body.push(list);
  }

  if (body.length === 0) {
    lost.push("This design has no words in it, so there is nothing to convert — import it as a picture.");
    return { blocks: [], lost };
  }

  // A dark design becomes a dark section rather than black-on-white, because
  // the ground is usually half of what the design is doing.
  const blocks: Block[] = dark ? [{ type: "band", blocks: body } as Block] : body;
  return { blocks, lost };
}
