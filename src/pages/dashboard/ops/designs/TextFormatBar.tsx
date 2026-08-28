import { useCallback, useEffect, useState } from "react";
import { paint, type Palette, type PaintRole } from "@/lib/designs/types";

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

/** The roles a word can be painted in, in the order they are worth reaching for. */
const ROLES: PaintRole[] = ["accent", "ink", "white", "muted", "bg"];

export function TextFormatBar({ host, palette, onChanged }: {
  /** The contenteditable being edited. */
  host: HTMLElement | null;
  palette: Palette;
  /** Called after the DOM was changed, so the editor can re-read it. */
  onChanged: () => void;
}) {
  const [box, setBox] = useState<{ left: number; top: number } | null>(null);

  /** Where the selection is, in the page, or null when nothing is selected. */
  const place = useCallback(() => {
    const sel = window.getSelection();
    if (!host || !sel || sel.rangeCount === 0 || sel.isCollapsed) { setBox(null); return; }
    const range = sel.getRangeAt(0);
    // Only when the selection is inside OUR editor: another text box, or the
    // sidebar, must not raise this bar.
    if (!host.contains(range.commonAncestorContainer)) { setBox(null); return; }
    const r = range.getBoundingClientRect();
    if (!r.width && !r.height) { setBox(null); return; }
    setBox({ left: r.left + r.width / 2, top: r.top });
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

  const colour = (role: PaintRole) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    // data-role is what survives the trip exactly — a literal colour would be
    // kept as a hex and stop following the palette when the design is
    // recoloured.
    span.dataset.role = String(role);
    span.style.color = paint(role, palette);
    // extract + insert rather than surroundContents, which throws whenever the
    // selection starts and ends in different elements — which is most of the
    // time once anything else has been styled.
    span.appendChild(range.extractContents());
    range.insertNode(span);
    // Leave the newly coloured words selected, so a second choice replaces the
    // first rather than the selection vanishing after every click.
    sel.removeAllRanges();
    const after = document.createRange();
    after.selectNodeContents(span);
    sel.addRange(after);
    onChanged();
    place();
  };

  const resize = (factor: number) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    const parent = range.commonAncestorContainer instanceof HTMLElement
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
    const current = Number(parent?.closest<HTMLElement>("[data-scale]")?.dataset.scale) || 1;
    // Relative to whatever the selection already carries, so pressing bigger
    // twice compounds instead of snapping back to one step.
    const next = Math.min(4, Math.max(0.4, Math.round(current * factor * 100) / 100));
    span.dataset.scale = String(next);
    span.style.fontSize = `${next}em`;
    span.appendChild(range.extractContents());
    range.insertNode(span);
    sel.removeAllRanges();
    const after = document.createRange();
    after.selectNodeContents(span);
    sel.addRange(after);
    onChanged();
    place();
  };

  return (
    <div
      className="txb"
      style={{ left: box.left, top: box.top }}
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
      {ROLES.map((r) => (
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
      <button type="button" title="Smaller" onClick={() => resize(1 / 1.25)}>A−</button>
      <button type="button" title="Bigger" onClick={() => resize(1.25)}>A+</button>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.txb{position:fixed;z-index:1400;transform:translate(-50%,calc(-100% - 10px));display:flex;align-items:center;gap:2px;
     padding:4px 6px;border-radius:10px;background:#1D1D1D;box-shadow:0 6px 20px rgb(0 0 0 / 30%)}
.txb button{min-width:26px;height:26px;padding:0 5px;border:0;border-radius:6px;background:transparent;color:#fff;
            font-size:13px;line-height:1;cursor:pointer}
.txb button:hover{background:#F0460E}
.txb__swatch{width:20px;height:20px;min-width:20px;padding:0;border-radius:50%;box-shadow:inset 0 0 0 1px rgb(255 255 255 / 35%)}
.txb__swatch:hover{outline:2px solid #fff;outline-offset:1px}
.txb__sep{width:1px;height:18px;background:rgb(255 255 255 / 22%);margin:0 4px}
`;
