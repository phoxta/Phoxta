import { useCallback, useEffect, useRef } from "react";
import { fontStack } from "@/lib/designs/layout";
import { htmlToRuns, plainPaste, runsToHtml } from "@/lib/designs/html";
import { toRuns } from "@/lib/designs/rich";
import { paint, type Copy, type Palette, type TextLayer } from "@/lib/designs/types";
import type { Viewport } from "@/lib/designs/snap";

/**
 * Editing text where it lives.
 *
 * A `contenteditable` is positioned exactly over the text layer and styled to
 * match it — same face, size, weight, tracking, leading, alignment, colour and
 * wrap width — and the SVG text underneath is hidden while it is open. So the
 * words do not move when editing starts, which is the whole trick: an editor
 * that reflows the moment you click into it makes you edit one thing while
 * looking at another.
 *
 * It is scaled by the viewport with a CSS transform rather than by multiplying
 * every measurement by the zoom. That way the browser lays the text out in
 * canvas units — the same units the SVG renderer wraps in — and zoom cannot
 * change where the lines break. Scaling the numbers instead would make the
 * wrap drift as you zoomed, and the copy would re-break under the cursor.
 */
export function CanvasText({ layer, value, palette, view, onChange, onDone }: {
  layer: TextLayer;
  value: Copy | undefined;
  palette: Palette;
  view: Viewport;
  onChange: (next: Copy) => void;
  onDone: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // The last HTML we wrote, so a re-render caused by our own change does not
  // reset the DOM and throw the caret back to the start of the line.
  const mine = useRef<string>("");
  /** When this editor appeared, for recognising the click that opened it. */
  const openedAt = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = runsToHtml(toRuns(value, layer.accent), palette);
    mine.current = el.innerHTML;
    openedAt.current = performance.now();
    selectAll();
    el.focus();
    // Only on open: re-running when `value` changes would fight the typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer.id]);

  /** Select everything. The overwhelmingly common reason to open placeholder
   *  copy is to replace all of it. */
  const selectAll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = document.createRange();
    r.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  }, []);

  const push = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    mine.current = el.innerHTML;
    onChange(htmlToRuns(el, palette));
  }, [onChange, palette]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Escape and Ctrl/Cmd+Enter finish; plain Enter inserts a line break,
    // because a headline that breaks where the designer wants it is the point.
    if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
      e.preventDefault();
      push();
      onDone();
      return;
    }
    // The canvas listens for these; while typing they belong to the text.
    e.stopPropagation();
  };

  const size = layer.size;
  const anchor = layer.align === "center" ? "center" : layer.align === "right" ? "right" : "left";

  return (
    <div
      className="dsn-textedit"
      style={{
        left: (layer.x - view.x) * view.zoom,
        top: (layer.y - view.y) * view.zoom,
        width: layer.w,
        transform: `scale(${view.zoom})`,
        transformOrigin: "0 0",
      }}
    >
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        role="textbox"
        aria-label={`Edit ${layer.slot}`}
        tabIndex={0}
        onInput={push}
        onClick={() => {
          // The second press of the double-press opens this editor, and the
          // click that completes that gesture then lands here -- on an element
          // that did not exist when the gesture began. The browser puts the
          // caret wherever the pointer happened to be, silently undoing the
          // select-all, so the next thing typed is inserted into the middle of
          // the placeholder instead of replacing it. Any click this soon after
          // opening belongs to the gesture, not to the person.
          if (performance.now() - openedAt.current < 400) selectAll();
        }}
        onBlur={() => { push(); onDone(); }}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => e.stopPropagation()}
        onPaste={(e) => {
          // Pasting from a document drags a whole stylesheet with it. The
          // words are what was wanted.
          e.preventDefault();
          document.execCommand("insertText", false, plainPaste(e.nativeEvent));
        }}
        style={{
          font: `${layer.italic ? "italic " : ""}${layer.weight} ${size}px/${layer.lineHeight} ${fontStack(layer.font)}`,
          letterSpacing: `${layer.tracking}px`,
          color: paint(layer.fill, palette),
          textAlign: anchor,
          textTransform: layer.uppercase ? "uppercase" : layer.capitalize ? "capitalize" : undefined,
          // The layer's box is a minimum, not a clip: copy longer than the
          // original placeholder has to be visible while it is being typed.
          minHeight: layer.h,
          width: "100%",
        }}
      />
    </div>
  );
}
