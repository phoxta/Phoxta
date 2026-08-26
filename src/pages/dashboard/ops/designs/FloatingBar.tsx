import { useLayoutEffect, useState } from "react";
import type { Viewport } from "@/lib/designs/snap";
import type { Layer } from "@/lib/designs/types";

/**
 * The quick bar: three or four verbs, beside the selection, never on top of it.
 *
 * WHAT THIS USED TO BE, AND WHY IT ISN'T ANY MORE. This was the whole
 * properties panel, floating over the artboard. The idea was sound — a sidebar
 * makes you look away from the thing you are changing — but the execution has
 * one failure it cannot design its way out of: a panel large enough to hold a
 * font menu, four marks, a colour picker and an alignment popover is large
 * enough to cover the layer it is editing, and on a tall selection there is
 * nowhere on the artboard for it to go. Choosing a headline colour while
 * unable to see the headline is worse than walking your eyes to a rail.
 *
 * So the properties live in the docked Inspector, which shrinks the canvas
 * instead of covering it, and what is left here is only what is genuinely
 * faster with the cursor already on the layer: open it, duplicate it, delete
 * it.
 *
 * THE PLACEMENT RULE IS ABSOLUTE. The bar is tried above the selection, then
 * below, then left, then right — the first position that fits inside the stage
 * AND does not touch the selection's on-screen rectangle wins. If a selection
 * is large enough that no such position exists, the bar does not render. That
 * is deliberate: everything on it is in the Inspector and on the keyboard, so
 * hiding it costs nothing, and covering the artwork is the one outcome the
 * whole component exists to avoid.
 */

const ln = {
  fill: "none", stroke: "currentColor", strokeWidth: 1.6,
  strokeLinecap: "round", strokeLinejoin: "round",
} as const;

const I_TEXT = <svg viewBox="0 0 16 16" width="14" height="14" {...ln} aria-hidden="true"><path d="M3 4V3h10v1M8 3v10M6 13h4" /></svg>;
const I_PHOTO = <svg viewBox="0 0 16 16" width="14" height="14" {...ln} aria-hidden="true"><path d="M2 3h12v10H2zM2 10l3.5-3.5L9 10l2-2 3 3" /></svg>;
const I_DUP = <svg viewBox="0 0 16 16" width="14" height="14" {...ln} aria-hidden="true"><path d="M5.5 5.5h8v8h-8zM2.5 10.5v-8h8" /></svg>;
const I_BIN = <svg viewBox="0 0 16 16" width="14" height="14" {...ln} aria-hidden="true"><path d="M3 5h10M6 5V3h4v2M5 5l1 9h4l1-9" /></svg>;
const I_LOCK = <svg viewBox="0 0 16 16" width="14" height="14" {...ln} aria-hidden="true"><path d="M4 7h8v7H4zM6 7V5a2 2 0 0 1 4 0v2" /></svg>;

export type Cmd = "front" | "back" | "duplicate" | "delete" | "lock";

export type QuickBarProps = {
  layers: Layer[];
  sel: string[];
  view: Viewport;
  /** The stage's size in CSS pixels. The bar is absolutely positioned inside
   *  it, which is why page scroll needs no handling here: the bar and the
   *  artwork move together because they share a containing block. */
  stage: { width: number; height: number };
  onCommand: (c: Cmd) => void;
  onEditText: () => void;
  onPickImage: () => void;
};

/** Gap between the bar and the selection, and between the bar and the stage. */
const GAP = 12;
const PAD = 8;

type Rect = { x: number; y: number; w: number; h: number };

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/**
 * The selection's rectangle on screen, in stage pixels.
 *
 * A rotated layer covers more of the screen than its own box does, so the box
 * is turned and re-bounded. Placing the bar against the untransformed box is
 * how a toolbar ends up sitting on the corner of a tilted photograph.
 */
function screenRect(layers: Layer[], view: Viewport): Rect | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const l of layers) {
    const deg = l.rotation ?? 0;
    if (!deg) {
      x0 = Math.min(x0, l.x); y0 = Math.min(y0, l.y);
      x1 = Math.max(x1, l.x + l.w); y1 = Math.max(y1, l.y + l.h);
      continue;
    }
    const r = (deg * Math.PI) / 180;
    const c = Math.cos(r), s = Math.sin(r);
    const cx = l.x + l.w / 2, cy = l.y + l.h / 2;
    for (const [px, py] of [[l.x, l.y], [l.x + l.w, l.y], [l.x, l.y + l.h], [l.x + l.w, l.y + l.h]]) {
      const dx = px - cx, dy = py - cy;
      const rx = cx + dx * c - dy * s;
      const ry = cy + dx * s + dy * c;
      x0 = Math.min(x0, rx); y0 = Math.min(y0, ry);
      x1 = Math.max(x1, rx); y1 = Math.max(y1, ry);
    }
  }
  if (!Number.isFinite(x0)) return null;
  return {
    x: (x0 - view.x) * view.zoom,
    y: (y0 - view.y) * view.zoom,
    w: (x1 - x0) * view.zoom,
    h: (y1 - y0) * view.zoom,
  };
}

/** The first placement that is inside the stage and clear of the selection. */
function place(sel: Rect, bar: { w: number; h: number }, stage: { width: number; height: number }): { left: number; top: number } | null {
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  const midX = clamp(sel.x + sel.w / 2 - bar.w / 2, PAD, Math.max(PAD, stage.width - bar.w - PAD));
  const midY = clamp(sel.y + sel.h / 2 - bar.h / 2, PAD, Math.max(PAD, stage.height - bar.h - PAD));

  const tries: { left: number; top: number }[] = [
    { left: midX, top: sel.y - bar.h - GAP },           // above, the default
    { left: midX, top: sel.y + sel.h + GAP },           // below
    { left: sel.x - bar.w - GAP, top: midY },           // left
    { left: sel.x + sel.w + GAP, top: midY },           // right
  ];

  for (const t of tries) {
    if (t.left < PAD || t.top < PAD) continue;
    if (t.left + bar.w > stage.width - PAD) continue;
    if (t.top + bar.h > stage.height - PAD) continue;
    if (overlaps({ x: t.left, y: t.top, w: bar.w, h: bar.h }, sel)) continue;
    return t;
  }
  return null;
}

export function FloatingBar(p: QuickBarProps) {
  const chosen = p.layers.filter((l) => p.sel.includes(l.id));
  const one = chosen.length === 1 ? chosen[0] : null;
  // A callback ref rather than useRef, so the measurement re-attaches whenever
  // the node changes. The bar's width depends on which verbs this layer type
  // shows and on how long its labels are, neither of which is a value a
  // dependency list could watch — so the element watches itself.
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    if (!el) return;
    const read = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setSize((s) => (s && s.w === w && s.h === h ? s : { w, h }));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);

  const rect = chosen.length ? screenRect(chosen, p.view) : null;
  if (!rect) return null;

  // Two cases park the bar off-screen rather than unmounting it: the first
  // render, which has no measurement yet, and a selection so large that no
  // placement clears it. Kept mounted so it stays measurable — and hidden
  // rather than merely moved, so there is no frame in which it could flash
  // over the artboard.
  const at = size ? place(rect, size, p.stage) : null;
  const locked = chosen.every((l) => l.locked);

  return (
    <div
      ref={setEl}
      className="dsn-fb"
      style={at
        ? { left: at.left, top: at.top }
        : { left: -9999, top: -9999, visibility: "hidden", pointerEvents: "none" }}
      aria-hidden={at ? undefined : true}
      onPointerDown={(e) => e.stopPropagation()}
      role="toolbar"
      aria-label="Quick actions for the selection"
    >
      {chosen.length > 1 && <span className="dsn-fb__n">{chosen.length}</span>}

      {one?.type === "text" && (
        <button type="button" className="dsn-fb__b" onClick={p.onEditText} disabled={one.locked}
                title={one.locked ? "This layer is locked" : "Write in this text"}>
          {I_TEXT}<span>Edit text</span>
        </button>
      )}

      {one?.type === "image" && (
        <button type="button" className="dsn-fb__b" onClick={p.onPickImage} disabled={one.locked}
                title={one.locked ? "This layer is locked" : "Choose a different photograph"}>
          {I_PHOTO}<span>Photo</span>
        </button>
      )}

      <button type="button" className="dsn-fb__b" onClick={() => p.onCommand("duplicate")}
              title="Duplicate (Ctrl+D)" aria-label="Duplicate">{I_DUP}</button>

      <button type="button" className={`dsn-fb__b${locked ? " is-on" : ""}`} onClick={() => p.onCommand("lock")}
              title={locked ? "Unlock" : "Lock"} aria-label={locked ? "Unlock" : "Lock"}
              aria-pressed={locked}>{I_LOCK}</button>

      <button type="button" className="dsn-fb__b is-danger" onClick={() => p.onCommand("delete")}
              title="Delete" aria-label="Delete">{I_BIN}</button>
    </div>
  );
}
