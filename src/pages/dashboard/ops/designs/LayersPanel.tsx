import { useCallback, useRef, useState } from "react";
import { layerName } from "@/lib/designs/templates";
import type { Layer } from "@/lib/designs/types";

/**
 * The layers list.
 *
 * Listed front-first, because that is the order they are looked at: the thing
 * on top of the design is the thing on top of the list. The document paints
 * back-first, so every drag crosses a reversal, and the reorder also crosses an
 * off-by-one — the row is lifted out before it is put back, so an index read on
 * a list that still contains it is one too many. Both are easy to get subtly
 * wrong in a way that lands a layer one place from where it was aimed, which
 * reads as a misjudged drop rather than a bug and so never gets reported.
 * `scripts/canvas-test/reorder.test.mjs` pins the arithmetic down.
 *
 * DRAGGING IS DONE WITH POINTER EVENTS, NOT HTML5 DRAG-AND-DROP. The native
 * API looked like the smaller change and was not: a `<button>` fills most of
 * each row and browsers treat form controls as their own drag sources, so the
 * row would only pick up from the few pixels of grip beside it. Pointer events
 * drag from anywhere on the row, work under touch, and are the same mechanism
 * the canvas itself uses — one way to move things in this editor, not two.
 */
export function LayersPanel({ layers, sel, onSelect, onReorder, onToggle, onRename }: {
  /** In paint order: first is furthest back. */
  layers: Layer[];
  sel: string[];
  onSelect: (id: string, additive: boolean) => void;
  /** `to` is an index into the FRONT-FIRST list, with the dragged row removed. */
  onReorder: (id: string, to: number) => void;
  onToggle: (id: string, key: "locked" | "hidden") => void;
  onRename: (id: string, name: string) => void;
}) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  // Where the row would land: the index it would take in the front-first list.
  const [slot, setSlot] = useState<number | null>(null);
  const list = useRef<HTMLUListElement>(null);
  // A press that has not yet travelled far enough to be a drag. Held in a ref
  // because the move handler needs it at event time, not at render time.
  const press = useRef<{ id: string; y: number; moved: boolean } | null>(null);

  const view = [...layers].reverse();

  /**
   * Which gap the pointer is nearest.
   *
   * Measured from the rows themselves rather than from an assumed row height,
   * because a row being renamed contains an input and is taller than its
   * neighbours — an arithmetic guess puts the indicator in the wrong gap for
   * every row below it.
   */
  const slotAt = useCallback((clientY: number): number => {
    const ul = list.current;
    if (!ul) return 0;
    const rows = [...ul.children] as HTMLElement[];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].getBoundingClientRect();
      if (clientY < r.top + r.height / 2) return i;
    }
    return rows.length;
  }, []);

  const begin = (e: React.PointerEvent, id: string) => {
    // The eye and padlock are buttons in their own right; pressing one must
    // not arm a drag of the row it sits on.
    if ((e.target as HTMLElement).closest(".dsn-layer__i")) return;
    if (renaming === id || e.button !== 0) return;
    // Deliberately NOT captured here. Capturing on the press retargets the
    // click that follows to the captured element, so the row's own button
    // never receives it and clicking a layer silently stops selecting it.
    // Capture is taken in `move`, once this is definitely a drag.
    press.current = { id, y: e.clientY, moved: false };
  };

  const move = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p) return;
    // A few pixels of slack, or every click on a row would be a one-pixel
    // drag and selecting a layer would quietly reorder the design.
    if (!p.moved && Math.abs(e.clientY - p.y) < 4) return;
    if (!p.moved) {
      p.moved = true;
      setDragId(p.id);
      // Now that it is a drag, capture: without it the gesture dies the moment
      // the pointer leaves the list, and the row is left half-moved.
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    setSlot(slotAt(e.clientY));

    // Keep the row under the pointer visible: the list scrolls, and a drag
    // that cannot reach past the fold cannot reorder a long design.
    const ul = list.current;
    if (!ul) return;
    const r = ul.getBoundingClientRect();
    if (e.clientY < r.top + 18) ul.scrollTop -= 12;
    else if (e.clientY > r.bottom - 18) ul.scrollTop += 12;
  };

  const end = () => {
    const p = press.current;
    press.current = null;
    const at = slot;
    setDragId(null);
    setSlot(null);
    // Not a drag: the row's own click handler will select it.
    if (!p?.moved || at == null) return;
    const from = view.findIndex((x) => x.id === p.id);
    if (from < 0) return;
    const to = at > from ? at - 1 : at;
    if (to === from) return;
    onReorder(p.id, to);
  };

  return (
    <>
      <ul
        className="dsn-layers"
        ref={list}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {view.map((l, i) => (
          <li
            key={l.id}
            data-id={l.id}
            className={`${dragId === l.id ? "is-dragging" : ""}${
              dragId && slot === i ? " drop-above" : ""}${
              dragId && slot === view.length && i === view.length - 1 ? " drop-below" : ""}`}
            onPointerDown={(e) => begin(e, l.id)}
          >
            <span className="dsn-layer__grip" aria-hidden="true">⠿</span>
            {renaming === l.id ? (
              <input
                className="hrx-input dsn-rename" autoFocus defaultValue={layerName(l)}
                onBlur={(e) => { onRename(l.id, e.target.value); setRenaming(null); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setRenaming(null);
                }}
              />
            ) : (
              <button
                type="button"
                className={`dsn-layer${sel.includes(l.id) ? " is-on" : ""}${l.hidden ? " is-off" : ""}`}
                onClick={(e) => onSelect(l.id, e.shiftKey)}
                onDoubleClick={() => setRenaming(l.id)}
              >
                <span className="dsn-layer__k">{l.type}</span>
                <span className="dsn-layer__n">{layerName(l)}</span>
              </button>
            )}
            <button type="button" className="dsn-layer__i" title={l.hidden ? "Show" : "Hide"}
                    onClick={() => onToggle(l.id, "hidden")}>{l.hidden ? "○" : "●"}</button>
            <button type="button" className="dsn-layer__i" title={l.locked ? "Unlock" : "Lock"}
                    onClick={() => onToggle(l.id, "locked")}>{l.locked ? "🔒" : "🔓"}</button>
          </li>
        ))}
      </ul>
      <p className="dsn-note">Drag to reorder — the top of this list is the front. Double-click to rename.</p>
    </>
  );
}
