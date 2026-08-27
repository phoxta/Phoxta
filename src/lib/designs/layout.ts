import { toRuns } from "./rich";
import type { Copy, PaintRole, TextLayer, TextRun } from "./types";

/**
 * Where every word goes.
 *
 * Text is the only thing on this canvas whose size the document does not
 * state — a headline's height depends on how its words happen to break, which
 * depends on the font, which depends on whether the font has finished loading.
 * So layout is computed, and computed in ONE place, because the editor, the
 * thumbnails, the inline text editor and the PNG export all have to agree
 * about it down to the pixel. Two implementations of this would diverge, and
 * would diverge invisibly: the caret would sit a few pixels off the glyph it
 * belongs to, and only in the export.
 *
 * The measurement is done with a 2D canvas rather than by asking the SVG,
 * because the SVG cannot be measured until it is in the document, and by then
 * it has already painted in the wrong place.
 */

const FALLBACK = '"Plus Jakarta Sans", sans-serif';

/** The stack a layer paints with. The pack uses six families, so the face is
 *  part of the measurement, not a constant. */
export const fontStack = (font?: string) => (font ? `"${font}", ${FALLBACK}` : FALLBACK);

/**
 * Where the first baseline sits.
 *
 * Figma positions a text box by its top edge, then centres the line box inside
 * it and puts the glyphs on the baseline. Reproducing that is (leading / 2) plus
 * the ascender — without it every heading in the pack sits a few pixels high,
 * which is invisible on one layer and obvious once six of them stack up.
 */
const ASCENDER = 0.74;

let ctx: CanvasRenderingContext2D | null = null;

/**
 * How far a line may exceed its box before it breaks.
 *
 * Our measurement of the pack's own copy agrees with the boxes Figma drew to
 * within a tenth of a percent on nearly every layer -- but on five of them it
 * comes out between 0.3% and 1.3% wide, and a greedy wrapper with no slack
 * turns that fraction of a pixel into an entire extra line. "Live on Zoom"
 * became "Live on" / "Zoom", printed over the layer beneath it, and read as a
 * layout bug rather than a rounding one.
 *
 * 2% is taken from the measurements, not from feel: the worst spurious
 * overflow in the pack is 1.013 and the narrowest genuine wrap is 1.818, so
 * there is a wide gap to sit in. A line that really needs breaking is nowhere
 * near this threshold.
 */
const SLACK = 1.02;

/* ── A run's effective style, once the layer is taken into account ───────── */

export type Style = {
  size: number;
  weight: number;
  italic: boolean;
  font?: string;
  fill: PaintRole;
  underline: boolean;
  strike: boolean;
};

/**
 * Bold is relative, not absolute.
 *
 * The pack's layers already run from 400 to 800, so "bold" cannot mean 700 —
 * on an 800 headline that would make the bold text lighter than the text
 * around it. It means "heavier than this layer", which is what someone
 * pressing the button is asking for.
 */
const boldened = (weight: number) => (weight >= 700 ? 900 : 700);

export function styleOf(l: TextLayer, r: TextRun): Style {
  return {
    size: l.size * (r.scale ?? 1),
    weight: r.weight ?? (r.bold ? boldened(l.weight) : l.weight),
    italic: r.italic ?? Boolean(l.italic),
    font: r.font ?? l.font,
    fill: r.fill ?? l.fill,
    underline: Boolean(r.underline),
    strike: Boolean(r.strike),
  };
}

/**
 * The layer's own case transform, applied before anything is measured.
 *
 * It has to happen here because the transform is CSS — `text-transform` on the
 * rendered element — and CSS changes the glyphs AFTER we have decided where the
 * lines break. Measure "modern kitchen worktops" and paint "Modern Kitchen
 * Worktops" and every capital is wider than the lowercase letter it replaced,
 * so a line the wrapper thought fit does not. Both transforms are reproduced
 * here so the string we measure is the string that gets painted.
 *
 * `capitalize` follows the CSS rule rather than a title-case style guide: it
 * uppercases the first letter of each word and leaves the rest of the word
 * alone, so "iPhone" stays "iPhone". Word boundaries match the browser's —
 * hyphens and punctuation start a new word ("built-in" → "Built-In") but an
 * apostrophe does not ("don't" → "Don't", never "Don'T").
 */
const FIRST_LETTER = /(^|[^\p{L}\p{N}'’])(\p{L})/gu;

export function cased(l: TextLayer, s: string, prev = "") {
  if (l.uppercase) return s.toUpperCase();
  if (!l.capitalize) return s;
  // Styled runs split words apart — "Find**ing**" is two of them — but CSS
  // transforms the whole element, so a run starting mid-word must not be read
  // as a new word or it paints "FindIng". Prefixing the character that came
  // before lets the boundary rule see the truth; it is sliced back off after.
  return (prev + s).replace(FIRST_LETTER, (_m, sep: string, c: string) => sep + c.toUpperCase()).slice(prev.length);
}

export function measure(text: string, s: Style, tracking: number): number {
  if (!text) return 0;
  if (typeof document === "undefined") {
    // Server render (the prerender pass). No canvas — approximate, because a
    // rough width here only affects markup that is replaced on hydration.
    return text.length * s.size * 0.52 + text.length * tracking;
  }
  if (!ctx) ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * s.size * 0.52;
  ctx.font = `${s.italic ? "italic " : ""}${s.weight} ${s.size}px ${fontStack(s.font)}`;
  // measureText knows nothing about letter-spacing, so it is added back per
  // character — the same arithmetic the renderer then applies.
  return ctx.measureText(text).width + text.length * tracking;
}

/* ── Lines ───────────────────────────────────────────────────────────────── */

/** A styled fragment on one line, with the character range it came from. */
export type Piece = {
  text: string;
  run: TextRun;
  style: Style;
  w: number;
  /** Offset of this fragment's first character in the whole string. */
  at: number;
};

export type Line = {
  pieces: Piece[];
  /** Painted width, for placing a caret and for hit-testing a click. */
  w: number;
  /** Line advance: driven by the tallest run on the line, not the layer, so a
   *  line containing one oversized word does not print on top of the next. */
  advance: number;
  /** Baseline, in canvas units. */
  baseline: number;
  /** Character range covered by this line, end-exclusive. */
  from: number;
  to: number;
};

type Token = { text: string; run: TextRun; style: Style; w: number; at: number; space: boolean; br: boolean };

/**
 * Break the runs into words and spaces, each carrying its own style.
 *
 * Splitting per run rather than per string is the whole point: a word that
 * straddles a style boundary ("Find**ing**") is two tokens that must not be
 * separated, and a greedy wrapper that measured the joined string with one
 * font would get its width wrong.
 */
function tokenise(l: TextLayer, runs: TextRun[]): Token[] {
  const out: Token[] = [];
  let at = 0;
  let prev = "";
  for (const run of runs) {
    const style = styleOf(l, run);
    const text = cased(l, run.text, prev);
    prev = run.text.slice(-1) || prev;
    let i = 0;
    // Newlines are split out before spaces. A run of " \n " is one whitespace
    // match, so splitting on \s+ alone would swallow a deliberate line break
    // into an ordinary space and quietly reflow the copy.
    for (const chunk of text.split(/(\n)/)) {
      if (chunk === "") continue;
      if (chunk === "\n") {
        out.push({ text: "\n", run, style, w: 0, at: at + i, space: true, br: true });
        i += 1;
        continue;
      }
      for (const part of chunk.split(/(\s+)/)) {
        if (part === "") continue;
        out.push({
          text: part, run, style,
          w: measure(part, style, l.tracking),
          at: at + i,
          space: /^\s+$/.test(part),
          br: false,
        });
        i += part.length;
      }
    }
    at += run.text.length;
  }
  return out;
}

/**
 * Greedy wrap.
 *
 * `fontsReady` is not read — it is a cache key. The same text measures
 * differently once the webfont lands, and without re-running then, a headline
 * keeps the line breaks it computed against the fallback face. That looked
 * fine until someone typed one more character and the whole block silently
 * re-flowed.
 */
export function layoutText(
  l: TextLayer,
  value: Copy | undefined,
  _fontsReady?: boolean,
): Line[] {
  const runs = toRuns(value, l.accent);
  const tokens = tokenise(l, runs);

  const lines: Line[] = [];
  let cur: Token[] = [];
  let width = 0;

  const flush = () => {
    // Trailing spaces are painted nowhere and must not count toward the line
    // width, or a centred line drifts left by however many the wrap left on.
    while (cur.length && cur[cur.length - 1].space) { width -= cur[cur.length - 1].w; cur.pop(); }
    if (!cur.length) { lines.push(emptyLine(l, lines.length)); return; }
    const size = Math.max(...cur.map((t) => t.style.size));
    lines.push({
      pieces: cur.map(({ text, run, style, w, at }) => ({ text, run, style, w, at })),
      w: width,
      advance: size * l.lineHeight,
      baseline: 0,
      from: cur[0].at,
      to: cur[cur.length - 1].at + cur[cur.length - 1].text.length,
    });
    cur = [];
    width = 0;
  };

  for (const t of tokens) {
    if (t.br) { flush(); continue; }
    if (t.space && !cur.length) continue; // no line starts with a space
    if (!t.space && cur.length && width + t.w > l.w * SLACK) flush();
    cur.push(t);
    width += t.w;
  }
  flush();

  const out = lines.length ? lines : [emptyLine(l, 0)];

  // Baselines are accumulated rather than multiplied, because with mixed sizes
  // the lines are not all the same height.
  let y = l.y + (out[0].advance - out[0].advance / l.lineHeight) / 2;
  for (const line of out) {
    line.baseline = y + (line.advance / l.lineHeight) * ASCENDER;
    y += line.advance;
  }
  return out;
}

function emptyLine(l: TextLayer, i: number): Line {
  return { pieces: [], w: 0, advance: l.size * l.lineHeight, baseline: 0, from: i, to: i };
}

/** Total painted height, for growing a box to fit its copy. */
export const heightOf = (lines: Line[]) => lines.reduce((h, l) => h + l.advance, 0);

/**
 * Where the line starts horizontally, given the layer's alignment.
 *
 * Returned as a left edge rather than an anchor, because the inline editor and
 * the caret need a real coordinate — `text-anchor` only helps the SVG.
 */
export function lineLeft(l: TextLayer, line: Line): number {
  if (l.align === "center") return l.x + (l.w - line.w) / 2;
  if (l.align === "right") return l.x + l.w - line.w;
  return l.x;
}
