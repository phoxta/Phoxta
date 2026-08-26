import type { Copy, PaintRole, Rich, TextRun } from "./types";

/**
 * Styled text, as runs.
 *
 * A slot's value used to be a plain string, with `*asterisks*` standing in for
 * "paint this phrase in the accent colour". That convention is the reason this
 * file exists rather than a richer model from the start: it is a single mark,
 * it cannot nest, and it puts editing syntax into the copy that a person then
 * has to read past.
 *
 * So a slot now holds EITHER a string or a list of runs, and every reader goes
 * through `toRuns`. That matters more than it looks:
 *
 *   - The AI generator writes plain strings, and should not have to learn a
 *     document format to fill in a headline.
 *   - Every design already saved holds strings, and must keep rendering
 *     exactly as it did — asterisks included.
 *   - The Figma extractor can now import per-character styles faithfully
 *     instead of flattening a two-tone headline to one colour.
 *
 * Runs are deliberately flat, not a tree. Social copy is a headline and a
 * sentence; a nested inline model would buy nothing and would need a real
 * document algebra to edit safely.
 */

export const isRich = (v: Copy | undefined): v is Rich => Array.isArray(v);

/** The words, with all styling dropped. For alt text, search and the AI. */
export function plain(v: Copy | undefined): string {
  if (v == null) return "";
  return isRich(v) ? v.map((r) => r.text).join("") : v;
}

/** Total character count, which is what selection offsets are measured in. */
export const lengthOf = (v: Copy | undefined) => plain(v).length;

/**
 * A slot's value as runs.
 *
 * `accent` is the role the old asterisk convention maps to, passed in rather
 * than hard-coded because it is the text layer's own accent, not a global one.
 */
export function toRuns(v: Copy | undefined, accent?: PaintRole): TextRun[] {
  if (v == null) return [];
  if (isRich(v)) return v.length ? v : [];
  return parseAsterisks(v, accent);
}

/**
 * `*like this*` becomes an accent-coloured run.
 *
 * Kept for the strings that already exist and for the generator, which is told
 * about the convention in its prompt. Anything a person edits on the canvas is
 * saved as runs and never round-trips through this.
 */
function parseAsterisks(s: string, accent?: PaintRole): TextRun[] {
  if (!accent || !s.includes("*")) return s ? [{ text: s }] : [];
  const out: TextRun[] = [];
  const re = /\*([^*]+)\*/g;
  let at = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > at) out.push({ text: s.slice(at, m.index) });
    out.push({ text: m[1], fill: accent });
    at = m.index + m[0].length;
  }
  if (at < s.length) out.push({ text: s.slice(at) });
  return out.length ? out : [{ text: s }];
}

/* ── The marks a run can carry ───────────────────────────────────────────── */

export type Mark = "bold" | "italic" | "underline" | "strike";
export const MARKS: Mark[] = ["bold", "italic", "underline", "strike"];

/** Two runs can merge when everything except their text agrees. */
function same(a: TextRun, b: TextRun) {
  return a.bold === b.bold && a.italic === b.italic && a.underline === b.underline
    && a.strike === b.strike && a.fill === b.fill && a.scale === b.scale
    && a.font === b.font && a.weight === b.weight;
}

/**
 * Merge neighbours and drop empties.
 *
 * Every edit runs through this. Without it, typing one character at a time
 * produces one run per keystroke: the document grows without bound, the
 * renderer measures hundreds of one-letter spans, and "is this whole selection
 * bold" stops being answerable in one pass.
 */
export function normalise(runs: TextRun[]): TextRun[] {
  const out: TextRun[] = [];
  for (const r of runs) {
    if (!r.text) continue;
    // A falsy mark is absence, not a value to store — keeping `bold: false`
    // around would make two identical runs compare unequal forever.
    const c: TextRun = { text: r.text };
    if (r.bold) c.bold = true;
    if (r.italic) c.italic = true;
    if (r.underline) c.underline = true;
    if (r.strike) c.strike = true;
    if (r.fill) c.fill = r.fill;
    if (r.scale && r.scale !== 1) c.scale = r.scale;
    if (r.font) c.font = r.font;
    if (r.weight) c.weight = r.weight;

    const last = out[out.length - 1];
    if (last && same(last, c)) last.text += c.text;
    else out.push(c);
  }
  return out;
}

/** Split the run list so that `at` falls on a boundary. */
function splitAt(runs: TextRun[], at: number): TextRun[] {
  const out: TextRun[] = [];
  let pos = 0;
  for (const r of runs) {
    const end = pos + r.text.length;
    if (at > pos && at < end) {
      out.push({ ...r, text: r.text.slice(0, at - pos) });
      out.push({ ...r, text: r.text.slice(at - pos) });
    } else {
      out.push(r);
    }
    pos = end;
  }
  return out;
}

/** The runs covering [from, to), each split cleanly at both ends. */
function sliceRuns(runs: TextRun[], from: number, to: number) {
  const split = splitAt(splitAt(runs, from), to);
  const inside: number[] = [];
  let pos = 0;
  split.forEach((r, i) => {
    const end = pos + r.text.length;
    if (pos >= from && end <= to && r.text) inside.push(i);
    pos = end;
  });
  return { split, inside };
}

/** Is every character in the range already carrying this mark? */
export function hasMark(runs: TextRun[], from: number, to: number, mark: Mark): boolean {
  if (from >= to) return false;
  const { split, inside } = sliceRuns(runs, from, to);
  return inside.length > 0 && inside.every((i) => Boolean(split[i][mark]));
}

/**
 * Toggle a mark over a range.
 *
 * Toggling means: if all of it already has the mark, take it off; otherwise
 * put it on. That is the behaviour every text editor has, and the reason it is
 * not "flip each run individually" is that a part-bold selection would come
 * out inverted rather than uniformly bold, which is never what was meant.
 */
export function toggleMark(runs: TextRun[], from: number, to: number, mark: Mark): TextRun[] {
  if (from >= to) return runs;
  const on = !hasMark(runs, from, to, mark);
  const { split, inside } = sliceRuns(runs, from, to);
  const set = new Set(inside);
  return normalise(split.map((r, i) => (set.has(i) ? { ...r, [mark]: on || undefined } : r)));
}

/** Set a property over a range. `undefined` clears it back to the layer's own. */
export function setStyle(
  runs: TextRun[], from: number, to: number,
  patch: Partial<Omit<TextRun, "text">>,
): TextRun[] {
  if (from >= to) return runs;
  const { split, inside } = sliceRuns(runs, from, to);
  const set = new Set(inside);
  return normalise(split.map((r, i) => (set.has(i) ? { ...r, ...patch } : r)));
}

/** What the whole range agrees on, for showing the toolbar's current state. */
export function styleAt(runs: TextRun[], from: number, to: number): Partial<TextRun> {
  const { split, inside } = sliceRuns(runs, from, Math.max(to, from + 1));
  // An empty selection reports the run to its left, which is what a caret
  // sitting after a bold word should say.
  const picked = inside.length ? inside : [Math.max(0, indexOfChar(split, from))];
  const first = split[picked[0]];
  if (!first) return {};
  const out: Partial<TextRun> = {};
  for (const k of ["bold", "italic", "underline", "strike", "fill", "scale", "font", "weight"] as const) {
    if (picked.every((i) => split[i]?.[k] === first[k])) (out as Record<string, unknown>)[k] = first[k];
  }
  return out;
}

function indexOfChar(runs: TextRun[], at: number) {
  let pos = 0;
  for (let i = 0; i < runs.length; i++) {
    pos += runs[i].text.length;
    if (pos >= at) return i;
  }
  return runs.length - 1;
}

/**
 * Replace a range with new text, keeping the styling at the seam.
 *
 * The inserted text takes the style of the character to its left, which is how
 * typing in the middle of a bold word stays bold.
 */
export function replaceRange(runs: TextRun[], from: number, to: number, text: string): TextRun[] {
  const style = styleAt(runs, Math.max(0, from - 1), from);
  const { split, inside } = sliceRuns(runs, from, to);
  const kill = new Set(inside);
  const out: TextRun[] = [];
  let pos = 0;
  let done = false;
  for (let i = 0; i < split.length; i++) {
    const r = split[i];
    if (kill.has(i)) {
      if (!done && text) { out.push({ ...style, text }); done = true; }
      pos += r.text.length;
      continue;
    }
    if (!done && pos === from && text) { out.push({ ...style, text }); done = true; }
    out.push(r);
    pos += r.text.length;
  }
  if (!done && text) out.push({ ...style, text });
  return normalise(out);
}
