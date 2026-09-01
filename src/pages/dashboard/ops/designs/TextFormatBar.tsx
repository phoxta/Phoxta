import { useCallback, useEffect, useRef, useState } from "react";

/** Space between the bar and the words it is formatting. */
const GAP = 10;
import { DEFAULT_FONT, DESIGN_FONTS, fontNamed, paint, type Palette, type PaintRole } from "@/lib/designs/types";
import { fontStack } from "@/lib/designs/layout";

/**
 * Formatting part of a sentence, rather than all of it.
 *
 * The run model always supported this — a `TextRun` carries bold, italic,
 * underline, strike, fill and scale, `setStyle` can apply any of them to a
 * range, and the HTML bridge round-trips every one. What was missing was
 * anywhere to press. The Inspector's B/I/U applied to the WHOLE layer
 * (`toggleMark(runs, 0, len, m)`), so you could not bold a keyword or colour
 * one word of a headline.
 *
 * This bar appears over a selection inside the on-canvas editor and works on
 * that selection.
 *
 * WHY IT MANIPULATES THE DOM RATHER THAN THE RUNS. The editor is a
 * contenteditable, and its content is read back by `htmlToRuns` on every
 * input. Mapping a DOM selection onto run offsets, editing the runs, then
 * rewriting the HTML would move the caret and fight the browser's own
 * undo stack. Styling the selection in place and letting the existing
 * serialiser notice is both less code and less to go wrong.
 *
 * execCommand is deprecated and still the only thing that applies a mark
 * across a partial selection correctly — the parser is written to read intent
 * from whatever markup it produces, which is exactly why.
 */

type Mark = "bold" | "italic" | "underline" | "strikeThrough";

const MARKS: Array<{ cmd: Mark; label: string; title: string; style?: React.CSSProperties }> = [
  { cmd: "bold", label: "B", title: "Bold", style: { fontWeight: 800 } },
  { cmd: "italic", label: "I", title: "Italic", style: { fontStyle: "italic" } },
  { cmd: "underline", label: "U", title: "Underline", style: { textDecoration: "underline" } },
  { cmd: "strikeThrough", label: "S", title: "Strikethrough", style: { textDecoration: "line-through" } },
];

/**
 * The roles a word can be painted in, in the order they are worth reaching for.
 *
 * TYPED AGAINST THE REAL PALETTE, deliberately narrow. This list once carried
 * "muted" and "bg" — roles from an older palette that `Palette` never had —
 * and paint() falls through to the literal string for anything it does not
 * recognise, so both swatches painted every word BLACK while looking perfectly
 * plausible in the toolbar. `PaintRole` accepts any string (it has to, for
 * literal hexes), so it could not catch this; the narrow element type turns
 * the whole drift class into a compile error, and the format suite asserts the
 * same thing at runtime against the shipped palette.
 *
 * Exported for that suite; the toolbar below is the only other consumer.
 */
export const SWATCH_ROLES: ReadonlyArray<keyof Palette | "white" | "black"> = [
  "accent", "accentSoft", "ink", "canvas", "white", "black",
];

export function TextFormatBar({ host, palette, onChanged }: {
  /** The contenteditable being edited. */
  host: HTMLElement | null;
  palette: Palette;
  /** Called after the DOM was changed, so the editor can re-read it. */
  onChanged: () => void;
}) {
  const [box, setBox] = useState<{ left: number; top: number; below: boolean } | null>(null);
  const bar = useRef<HTMLDivElement | null>(null);

  /**
   * Where the selection is, clamped to stay on screen.
   *
   * The bar is centred on the selection and sits above it, and both of those
   * fail at an edge: a selection near the side of the canvas pushes half the
   * bar out of the window, and one near the top leaves no room above it. So
   * the left is clamped to the viewport and the bar drops below the selection
   * when it will not fit above — the same rule the layer toolbar follows.
   */
  const place = useCallback(() => {
    const sel = window.getSelection();
    if (!host || !sel || sel.rangeCount === 0 || sel.isCollapsed) { setBox(null); return; }
    const range = sel.getRangeAt(0);
    // Only when the selection is inside OUR editor: another text box, or the
    // sidebar, must not raise this bar.
    if (!host.contains(range.commonAncestorContainer)) { setBox(null); return; }
    const r = range.getBoundingClientRect();
    if (!r.width && !r.height) { setBox(null); return; }

    // Measured once it exists; the fallback is roughly this bar's own size and
    // only matters for the single frame before the first render.
    const w = bar.current?.offsetWidth || 470;
    const h = bar.current?.offsetHeight || 48;
    const half = w / 2;
    const pad = 10;
    const left = Math.min(Math.max(r.left + r.width / 2, half + pad), window.innerWidth - half - pad);
    const below = r.top - h - GAP < pad;
    setBox({ left, top: below ? r.bottom + GAP : r.top - GAP, below });
  }, [host]);

  useEffect(() => {
    document.addEventListener("selectionchange", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("selectionchange", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [place]);

  if (!box) return null;

  /** Keep the selection: a press on the bar would otherwise blur the editor
   *  and collapse it before the command runs. */
  const hold = (e: React.MouseEvent) => e.preventDefault();

  const mark = (cmd: Mark) => {
    document.execCommand(cmd);
    onChanged();
    place();
  };

  /**
   * Wrap the selection in a styled span.
   *
   * extract + insert rather than surroundContents, which throws whenever the
   * selection starts and ends in different elements — which is most of the
   * time once anything else has been styled. The words stay selected
   * afterwards, so a second choice replaces the first instead of the selection
   * vanishing after every click.
   */
  const wrap = (decorate: (span: HTMLSpanElement, current: HTMLElement | null) => void) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const node = range.commonAncestorContainer;
    const current = node instanceof HTMLElement ? node : node.parentElement;
    const span = document.createElement("span");
    decorate(span, current);
    span.appendChild(range.extractContents());
    range.insertNode(span);
    sel.removeAllRanges();
    const after = document.createRange();
    after.selectNodeContents(span);
    sel.addRange(after);
    onChanged();
    place();
  };

  // data-role, not a literal colour: a hex would freeze the word to whatever
  // the accent happened to be and stop it following a palette change.
  const colour = (role: PaintRole) => wrap((span) => {
    span.dataset.role = String(role);
    span.style.color = paint(role, palette);
  });

  const setFont = (name: string) => wrap((span) => {
    span.dataset.font = name;
    span.style.fontFamily = fontStack(name);
  });

  const setWeight = (w: number) => wrap((span) => {
    span.dataset.weight = String(w);
    span.style.fontWeight = String(w);
  });

  const resize = (factor: number) => wrap((span, current) => {
    // Relative to whatever the selection already carries, so pressing bigger
    // twice compounds instead of snapping back to one step.
    const now = Number(current?.closest<HTMLElement>("[data-scale]")?.dataset.scale) || 1;
    const next = Math.min(4, Math.max(0.4, Math.round(now * factor * 100) / 100));
    span.dataset.scale = String(next);
    span.style.fontSize = `${next}em`;
  });

  return (
    <div
      ref={bar}
      className="txb"
      style={{
        left: box.left,
        top: box.top,
        // Above the selection by default; below it when there is no room.
        transform: box.below ? "translate(-50%, 0)" : "translate(-50%, -100%)",
      }}
      onMouseDown={hold}
      role="toolbar"
      aria-label="Format the selected text"
    >
      {MARKS.map((m) => (
        <button key={m.cmd} type="button" title={m.title} style={m.style} onClick={() => mark(m.cmd)}>
          {m.label}
        </button>
      ))}
      <span className="txb__sep" />
      {SWATCH_ROLES.map((r) => (
        <button
          key={String(r)}
          type="button"
          className="txb__swatch"
          title={`Colour: ${r}`}
          style={{ background: paint(r, palette) }}
          onClick={() => colour(r)}
        />
      ))}
      <span className="txb__sep" />
      <select
        className="txb__sel" title="Typeface for the selection" aria-label="Typeface"
        defaultValue=""
        onChange={(e) => { if (e.target.value) setFont(e.target.value); e.target.value = ""; }}
      >
        <option value="">Font</option>
        {DESIGN_FONTS.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
      </select>
      <select
        className="txb__sel" title="Weight for the selection" aria-label="Weight"
        defaultValue=""
        onChange={(e) => { if (e.target.value) setWeight(Number(e.target.value)); e.target.value = ""; }}
      >
        <option value="">Weight</option>
        {(fontNamed(DEFAULT_FONT)?.weights ?? [400, 700]).map((w) => (
          <option key={w} value={w}>{w}</option>
        ))}
      </select>
      <span className="txb__sep" />
      <button type="button" title="Smaller" onClick={() => resize(1 / 1.25)}>A−</button>
      <button type="button" title="Bigger" onClick={() => resize(1.25)}>A+</button>
      <style>{CSS}</style>
    </div>
  );
}

/* Sized like a toolbar people use, not a tooltip they have to aim at. 34px
   targets clear the 24px accessibility minimum with room to spare and match
   what Docs and Figma ship; the 26px buttons and 20px swatches this replaces
   were smaller than either. */
const CSS = `
.txb{position:fixed;z-index:1400;display:flex;align-items:center;gap:3px;
     padding:7px 9px;border-radius:14px;background:#1D1D1D;
     box-shadow:0 10px 30px rgb(0 0 0 / 34%), 0 0 0 1px rgb(255 255 255 / 8%)}
.txb button{min-width:34px;height:34px;padding:0 9px;border:0;border-radius:9px;background:transparent;color:#fff;
            font-size:15px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
.txb button:hover{background:#F0460E}
.txb__swatch{width:26px;height:26px;min-width:26px;padding:0;border-radius:50%;
             box-shadow:inset 0 0 0 1px rgb(255 255 255 / 40%)}
.txb__swatch:hover{outline:2px solid #fff;outline-offset:2px;background:none}
.txb__sep{width:1px;height:24px;background:rgb(255 255 255 / 22%);margin:0 6px}
.txb__sel{height:34px;border:0;border-radius:9px;background:rgb(255 255 255 / 12%);color:#fff;
          font-size:13.5px;padding:0 8px;cursor:pointer}
.txb__sel:hover{background:rgb(255 255 255 / 20%)}
.txb__sel option{color:#1D1D1D}
`;
