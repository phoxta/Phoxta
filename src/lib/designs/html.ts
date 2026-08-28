import { fontStack } from "./layout";
import { normalise } from "./rich";
import type { PaintRole, Palette, Rich, TextRun } from "./types";
import { paint } from "./types";

/**
 * Runs ↔ HTML, for the on-canvas text editor.
 *
 * WHY HTML AT ALL. Editing text is not a rendering problem, it is a caret
 * problem: selection across wrapped lines, double-click to select a word,
 * shift-arrow, undo, dead keys, IME composition for anyone typing a language
 * that needs one, screen-reader announcement. A browser already does all of
 * that, correctly, in `contenteditable`, and reimplementing it on top of an
 * SVG would be a large pile of code that is worse.
 *
 * So the canvas hands editing to a `contenteditable` positioned exactly over
 * the layer, and this file is the border between the two worlds. It is
 * deliberately narrow: only the marks the run model has survive the trip.
 * Anything else a paste drags in — a font, a background, a nested table — is
 * discarded rather than half-supported, because a design that renders in the
 * editor and not in the export is worse than one that never accepted the
 * paste.
 */

/* ── Runs → HTML ─────────────────────────────────────────────────────────── */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function runsToHtml(runs: TextRun[], palette: Palette): string {
  if (!runs.length) return "";
  return runs.map((r) => {
    // A newline has to become a <br>: a literal newline in HTML is whitespace
    // and the line break would simply vanish on the first keystroke.
    let html = esc(r.text).replace(/\n/g, "<br>");
    if (r.strike) html = `<s>${html}</s>`;
    if (r.underline) html = `<u>${html}</u>`;
    if (r.italic) html = `<i>${html}</i>`;
    if (r.bold) html = `<b>${html}</b>`;
    // font and weight belong here too. A TextRun has carried them since runs
    // existed and this bridge never wrote them, so a run styled with either
    // lost it the moment the editor read itself back — a control for them
    // would have appeared to work and quietly done nothing.
    if (r.fill || r.scale || r.font || r.weight) {
      const style = [
        r.fill ? `color:${paint(r.fill, palette)}` : "",
        r.scale ? `font-size:${r.scale}em` : "",
        r.font ? `font-family:${fontStack(r.font)}` : "",
        // Written as a number, not "bold": htmlToRuns reads a computed weight
        // of 600 or more as bold, and a 500 run must not become one.
        r.weight ? `font-weight:${r.weight}` : "",
      ].filter(Boolean).join(";");
      // The role travels in a data attribute so a palette change still moves
      // the run: reading the colour back out of `style` would freeze it to
      // whatever hex the accent happened to be when it was typed.
      html = `<span data-role="${r.fill ?? ""}" data-scale="${r.scale ?? ""}"`
        + ` data-font="${r.font ? esc(r.font) : ""}" data-weight="${r.weight ?? ""}"`
        + ` style="${style}">${html}</span>`;
    }
    return html;
  }).join("");
}

/* ── HTML → runs ─────────────────────────────────────────────────────────── */

type Acc = { bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean; fill?: PaintRole; scale?: number; font?: string; weight?: number };

const TAG_MARK: Record<string, keyof Acc> = {
  B: "bold", STRONG: "bold",
  I: "italic", EM: "italic",
  U: "underline",
  S: "strike", STRIKE: "strike", DEL: "strike",
};

/**
 * Read a contenteditable back into runs.
 *
 * `execCommand` and paste both produce markup this did not write — `<font>`,
 * inline `font-weight`, nested spans — so the walk reads INTENT from whatever
 * it finds rather than trusting the tags: a computed weight of 600 or more is
 * bold however it was expressed.
 */
export function htmlToRuns(root: Node, palette: Palette): Rich {
  const out: TextRun[] = [];

  const walk = (node: Node, acc: Acc) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text) out.push({ ...acc, text });
      return;
    }
    if (!(node instanceof HTMLElement)) return;

    if (node.tagName === "BR") { out.push({ ...acc, text: "\n" }); return; }

    const next: Acc = { ...acc };
    const mark = TAG_MARK[node.tagName];
    if (mark) (next as Record<string, unknown>)[mark] = true;

    // Styles the browser applied instead of a tag.
    const style = node.style;
    const weight = style.fontWeight || (node.tagName === "B" || node.tagName === "STRONG" ? "700" : "");
    if (weight && (weight === "bold" || Number(weight) >= 600)) next.bold = true;
    if (style.fontStyle === "italic") next.italic = true;
    if (style.textDecorationLine || style.textDecoration) {
      const d = `${style.textDecorationLine} ${style.textDecoration}`;
      if (d.includes("underline")) next.underline = true;
      if (d.includes("line-through")) next.strike = true;
    }

    // A role we wrote ourselves survives exactly; a colour the browser
    // invented is kept as a literal hex, which the palette will not move but
    // which is at least what the person chose.
    const role = node.dataset?.role;
    if (role) next.fill = role as PaintRole;
    else if (style.color) next.fill = toHex(style.color, palette) as PaintRole;

    const scale = Number(node.dataset?.scale);
    if (scale > 0) next.scale = scale;

    // Only what WE wrote. A font-family the browser or a paste invented is not
    // one of the pack's six faces, and keeping it would render in the editor
    // and fall back to something else in the exported file.
    const font = node.dataset?.font;
    if (font) next.font = font;
    const w = Number(node.dataset?.weight);
    if (w > 0) next.weight = w;

    for (const child of Array.from(node.childNodes)) walk(child, next);
  };

  for (const child of Array.from(root.childNodes)) walk(child, {});
  return normalise(out);
}

/**
 * `rgb(28, 86, 253)` → `#1c56fd`, and back to a role when it is one.
 *
 * Recognising the palette on the way in is what keeps a colour picked from the
 * swatches attached to its role, so recolouring the design still moves it.
 */
function toHex(css: string, palette: Palette): string {
  const m = css.match(/^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  const hex = m
    ? "#" + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, "0")).join("")
    : css.trim().toLowerCase();
  for (const [role, value] of Object.entries(palette)) {
    if (value.toLowerCase() === hex) return role;
  }
  if (hex === "#ffffff") return "white";
  if (hex === "#000000") return "black";
  return hex;
}

/** Strip a pasted fragment down to text, which is what a design wants. */
export function plainPaste(e: ClipboardEvent): string {
  return (e.clipboardData?.getData("text/plain") ?? "").replace(/\r\n?/g, "\n");
}
