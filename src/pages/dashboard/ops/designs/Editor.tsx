import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast, toastError } from "@/lib/ops/feedback";
import { getDesign, saveDesign, generateDesign, type Design, type LibraryImage } from "@/lib/db/designs";
import { DesignSvg, textTopOffset } from "@/lib/designs/render";
import { exportPng, downloadPng } from "@/lib/designs/export";
import { getTemplate, layersOf } from "@/lib/designs/templates";
import {
  History, addImage, addRect, addText, alignMany, bringForward, bringToFront, convertFormat, reorder,
  canPaste, copyLayers, cutLayers, distribute, duplicateLayer, moveMany, nudge,
  pasteLayers, removeMany, renameLayer, scaleMany, sendBackward, sendToBack, toggle, updateLayer,
} from "@/lib/designs/edit";
import {
  CANVAS_BLEED, canvasBox, clampView, clampZoom, fitCanvas, fitZoomFor, zoomAt, type Viewport,
} from "@/lib/designs/snap";
import { FloatingBar } from "./FloatingBar";
import { Inspector } from "./Inspector";
import { CanvasText } from "./CanvasText";
import { ImageLibrary } from "./ImageLibrary";
import { ImageBackgroundAction } from "./RemoveBackground";
import { LayersPanel } from "./LayersPanel";
import { SlideStrip } from "./SlideStrip";
import { ScheduleDialog } from "./ScheduleDialog";
import {
  DEFAULT_PALETTE, asDeck, emptyDoc, formatDims,
  type Deck, type DesignDoc, type DesignFormat, type ImageSlot, type TextSlot,
} from "@/lib/designs/types";
import { SHAPE_KINDS } from "@/lib/designs/shapes";
import { ShapeGlyph } from "./ShapeGlyph";
import "../designs.css";

/**
 * The graphics editor, lifted out of DesignsPage.
 *
 * The canvas is the real artwork at 1080×1350, scaled by one transform. Every
 * layer can be selected, dragged, resized, reordered, hidden, locked, duplicated
 * and deleted; new text, shapes and photo frames can be added. The fields and
 * the canvas are two views of one object, not a form that builds a picture.
 *
 * A design starts as content over a shared template. The first structural edit
 * materialises the layers into the document — see @/lib/designs/edit.ts — after
 * which it owns its arrangement and stops inheriting template changes. That
 * trade is the price of a real canvas and it is made deliberately.
 *
 * Extracted from DesignsPage because an ~860-line component inlined into the
 * page that also owns the library grid, the tabs and four dialogs was two
 * screens of scrolling between a bug and its cause. The shell stays in
 * DesignsPage; everything from the Back button down lives here.
 */

// Copied rather than imported: DesignsPage imports this file, so reaching back
// into it for the icons would close a cycle. Same paths, same stroke.
const ln = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const I_BACK = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>;
const I_DOWN = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" /></svg>;
const I_SPARK = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
const I_CAL = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M7 3v3M17 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" /></svg>;

/** What the canvas does that no control on it says. Lives in the toolbar: the
 *  canvas is the artboard exactly now, so there is nowhere on it for a note to
 *  sit that is not on top of somebody's design. */
const HINT = "Double-click text to write in it · Ctrl + scroll zooms · Space + drag pans once you are zoomed in · Ctrl + drag marquees over artwork · Shift keeps a corner proportional";

export function Editor({ design, orgName, onClose, onConnectAccounts }: {
  design: Design;
  orgName: string;
  onClose: () => void;
  /** Opens the connected-accounts dialog the shell mounts alongside this
   *  editor — handed on to ScheduleDialog's onConnectAccounts seam, so
   *  "connect an account" works without leaving the design. */
  onConnectAccounts: () => void;
}) {
  /**
   * The whole post, and which slide is on the canvas.
   *
   * Everything below this line still works on ONE document — `doc` is the
   * current slide and `setDoc` writes back into it. That is deliberate: the
   * canvas, the floating bar, the layers panel and every edit operation are
   * unchanged by carousels, because a slide is an ordinary design.
   */
  const [deck, setDeck] = useState<Deck>(() => asDeck(design.doc, design.template_id));
  const [slide, setSlide] = useState(0);
  const [title, setTitle] = useState(design.title);
  const [sel, setSel] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"" | "saving" | "exporting" | "writing">("");
  /** The schedule dialog, opened from the top bar — see schedule(). */
  const [scheduling, setScheduling] = useState(false);
  /** The rewrite dialog (replaces a window.prompt nobody could style, escape
   *  cleanly, or watch progress in). */
  const [rewriting, setRewriting] = useState(false);
  /** A save found a NEWER version of this row on the server (U11). While set,
   *  the autosave stands down — retrying would just lose the same race again —
   *  until the person picks a side in the conflict dialog. */
  const [conflict, setConflict] = useState(false);
  /** The autosave indicator: quiet, then "Saving…", then "Saved · just now". */
  const [autoState, setAutoState] = useState<"" | "saving" | "saved">("");
  /** The document is persisted but the published PNG is older than it — the
   *  autosave writes the doc WITHOUT re-publishing the PNG (see autosave), so
   *  the explicit Save button must stay pressable until a full save runs. */
  const [pngStale, setPngStale] = useState(false);
  const [view, setView] = useState<Viewport | null>(null);
  /** The text layer with the caret in it, if any. */
  const [editing, setEditing] = useState<string | null>(null);
  /** The image slot the library was opened for. Every route to a photograph
   *  goes through it — the toolbar's "+ Photo", double-clicking a frame, the
   *  quick bar and the Inspector — so an uploaded picture is always stored in
   *  the business's library rather than inlined into this one design. */
  const [picking, setPicking] = useState<ImageSlot | null>(null);
  /** Whether the shape picker is open. */
  const [shapeMenu, setShapeMenu] = useState(false);
  // Dismissed by anything that is not a shape in it. Bound on pointerdown
  // rather than click so it closes on the same gesture that starts a drag on
  // the canvas, instead of staying open over the shape being dragged.
  useEffect(() => {
    if (!shapeMenu) return;
    const away = (e: PointerEvent) => {
      if (!(e.target as HTMLElement | null)?.closest?.(".dsn-shapemenu")) setShapeMenu(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setShapeMenu(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [shapeMenu]);
  /** Where this design's last published cover is stored, so the next save can
   *  replace it rather than leaving a near-identical file behind in the
   *  business's picture library on every single save. Seeded from the row and
   *  kept current in this session, because the row is not re-read between saves. */
  const publishedPng = useRef<string | null>(design.png_path ?? null);
  /** The OUTER element: the room the canvas has, and the only thing measured. */
  const stage = useRef<HTMLDivElement>(null);
  /** The INNER element: the artboard's own rectangle, sized from the viewport.
   *  Everything that positions itself in stage pixels lives inside it, because
   *  its top-left is the canvas point (view.x, view.y). */
  const canvas = useRef<HTMLDivElement>(null);
  // The undo stack holds whole DECKS, not slides. Storing a slide would let
  // an undo restore one slide's old content into whichever slide happened to
  // be open, which is worse than not having undo at all.
  const history = useRef(new History<Deck>());
  const [, force] = useState(0);

  /** The row's updated_at as this editor last read or wrote it — the
   *  optimistic-concurrency token saveDesign matches on (U11). */
  const loadedAt = useRef(design.updated_at);
  /** One write in flight at a time: two of our own saves racing would trip the
   *  concurrency guard against each other and report a phantom conflict. */
  const writing = useRef(false);
  // Live mirrors for the timer-driven autosave. A setTimeout closure holds
  // whatever render armed it, and saving a 2.5-second-old deck would be data
  // loss wearing a seatbelt.
  const deckRef = useRef(deck); deckRef.current = deck;
  const titleRef = useRef(title); titleRef.current = title;
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty;
  const busyRef = useRef(busy); busyRef.current = busy;
  const conflictRef = useRef(conflict); conflictRef.current = conflict;

  // Clamped rather than trusted: deleting the last slide leaves the index
  // past the end for one render, and reading undefined there takes the whole
  // editor down.
  const index = Math.min(slide, deck.slides.length - 1);
  const doc = deck.slides[index];

  /** Write back into the slide on the canvas. `record` pushes the WHOLE deck
   *  onto the undo stack, so undo cannot resurrect one slide's old content
   *  into a different slide. */
  const setDoc = useCallback((fn: (d: DesignDoc) => DesignDoc, record = false) => {
    setDeck((k) => {
      const at = Math.min(index, k.slides.length - 1);
      const cur = k.slides[at];
      const next = fn(cur);
      if (next === cur) return k;
      if (record) history.current.push(k);
      return { ...k, slides: k.slides.map((sl, i) => (i === at ? next : sl)) };
    });
  }, [index]);

  const template = getTemplate(doc.templateId);
  const layers = layersOf(doc);
  const chosen = layers.filter((l) => sel.includes(l.id));
  const one = chosen.length === 1 ? chosen[0] : null;
  const content = useMemo(() => ({ ...(template?.content ?? {}), ...doc.content }), [template, doc.content]);

  /* ── Viewport ──────────────────────────────────────────────────────────
     TWO RECTANGLES, NOT ONE.

     `avail` is the room the canvas has and is the only thing measured. The
     canvas element itself is sized from the viewport — `canvasBox` — to the
     artboard's rendered size, clamped to the room. At the fit zoom that is the
     artboard exactly, so its edge IS the canvas's edge and there is no ground
     to leave over; zoomed in, the box takes all the room and the artboard pans
     inside it. Measuring the element that is also being sized is the loop this
     splitting exists to break.

     `avail` is a ref as well as state. Every viewport command needs it at the
     moment it runs — the keyboard shortcuts capture their closures once per
     selection change, so a window resize with nothing selected used to leave
     Fit and 100% working on a stage size two resizes old. */
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const avail = useRef<{ width: number; height: number }>({ width: 800, height: 1000 });
  /** Whether the view is still the one Fit produced. The canvas box is derived
   *  from the zoom, so a window that grows while the zoom stays put would leave
   *  the box smaller than the room and the ground would come back. */
  const atFit = useRef(true);
  const measured = useRef(false);

  // BEFORE the browser paints, not after. Until the first measurement lands the
  // canvas cannot be rendered at all, so an ordinary effect would let one frame
  // of empty stage reach the screen every time a design is opened — a flash of
  // exactly the ground this whole layout exists to remove. `read` only measures
  // and sets state, which is what makes it safe to run in the layout phase.
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      if (r.width <= 40 || r.height <= 40) return;
      const prev = avail.current;
      // A half-pixel dead band. The canvas element is sized from this number,
      // so anything finer than that would be a state update per frame for a
      // rectangle nobody could see change.
      if (measured.current && Math.abs(prev.width - r.width) < 0.5 && Math.abs(prev.height - r.height) < 0.5) return;
      const next = { width: r.width, height: r.height };
      measured.current = true;
      avail.current = next;
      setSize(next);
      setView((v) => {
        if (!v) return fitCanvas(next);
        // Fit is the FLOOR, not just a starting point, and a window that grows
        // raises it. Clamping alone only moves the viewport — it cannot make the
        // artboard bigger — so a zoom the user set at a smaller window can end up
        // below the new fit, leaving the artboard smaller than the box it is
        // drawn in and the ground back on all four sides. Snapping to fit is the
        // right answer rather than merely raising the zoom, because a zoom that
        // has been overtaken by the fit is no longer a zoom the user chose.
        if (atFit.current || v.zoom <= fitZoomFor(next)) {
          atFit.current = true;
          return fitCanvas(next);
        }
        return clampView(v, next);
      });
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** Zoom about a canvas point, floored at the fit — below it the artboard
   *  would float inside its own canvas, which is the space this removes. */
  const zoomTo = (v: Viewport, factor: number, cx: number, cy: number): Viewport => {
    const room = avail.current;
    const want = Math.max(fitZoomFor(room), clampZoom(v.zoom * factor));
    atFit.current = want <= fitZoomFor(room) + 1e-9;
    return clampView(zoomAt(v, want / v.zoom, cx, cy), room);
  };

  /** The middle of what is on screen, in canvas units. */
  const centreOf = (v: Viewport) => {
    const b = canvasBox(v.zoom, avail.current);
    return { cx: v.x + b.width / v.zoom / 2, cy: v.y + b.height / v.zoom / 2 };
  };

  const zoomBy = (f: number) => setView((v) => {
    if (!v) return v;
    const { cx, cy } = centreOf(v);
    return zoomTo(v, f, cx, cy);
  });

  const fitView = () => { atFit.current = true; setView(fitCanvas(avail.current)); };
  const actualSize = () => setView((v) => {
    if (!v) return v;
    const { cx, cy } = centreOf(v);
    return zoomTo(v, 1 / v.zoom, cx, cy);
  });

  /** The artboard's rectangle on screen: what the canvas element is sized to,
   *  what DesignSvg draws into, and what the quick bar is placed inside. */
  const box = view && size ? canvasBox(view.zoom, size) : null;

  /* ── Edits ─────────────────────────────────────────────────────────────
     One place that records history and marks the document dirty, so no new
     action can be added that forgets to be undoable. */
  const apply = useCallback((next: DesignDoc | ((d: DesignDoc) => DesignDoc), record = true) => {
    setDoc((d) => (typeof next === "function" ? next(d) : next), record);
    setDirty(true);
    force((n) => n + 1);
  }, [setDoc]);

  const undo = useCallback(() => { setDeck((k) => history.current.undo(k) ?? k); setDirty(true); force((n) => n + 1); }, []);
  const redo = useCallback(() => { setDeck((k) => history.current.redo(k) ?? k); setDirty(true); force((n) => n + 1); }, []);

  /* ── Dragging ──────────────────────────────────────────────────────────
     A multi-selection moves together. The positions every selected layer had
     when the gesture began are captured on the first move — deriving the delta
     from the previous frame instead would accumulate rounding, and a long drag
     would visibly shear the selection apart. */
  const dragBase = useRef<Record<string, { x: number; y: number }> | null>(null);

  const onGeometry = useCallback((id: string, b: { x: number; y: number; w: number; h: number; rotation?: number }, commit: boolean) => {
    // The first frame of a gesture is the one that goes on the undo stack, so
    // a drag across the canvas is one step rather than four hundred.
    const first = !dragBase.current;
    setDoc((d) => {
      const current = layersOf(d);
      // A rotation is always one layer, even when several are selected: the
      // group frame offers no rotate grip. Routing it through the multi-move
      // path would read the angle as a position and shove the selection.
      const multi = b.rotation === undefined && sel.length > 1 && sel.includes(id);

      if (!dragBase.current) {
        dragBase.current = Object.fromEntries(current.filter((l) => sel.includes(l.id)).map((l) => [l.id, { x: l.x, y: l.y }]));
      }

      if (multi) {
        const base = dragBase.current[id];
        return base ? moveMany(d, sel, dragBase.current, b.x - base.x, b.y - base.y) : d;
      }
      return updateLayer(d, id, b);
    }, first);
    setDirty(true);
    if (commit) { dragBase.current = null; force((n) => n + 1); }
  }, [sel, setDoc]);

  /* A group resize is computed from the document as it was when the gesture
     started, not from the last frame. Re-scaling an already-scaled document
     sixty times a second compounds the factor and the selection races off the
     artboard within half a drag. */
  const scaleBase = useRef<DesignDoc | null>(null);

  const onTransform = useCallback((
    from: { x: number; y: number; w: number; h: number },
    to: { x: number; y: number; w: number; h: number },
    commit: boolean,
  ) => {
    const firstFrame = !scaleBase.current;
    setDoc((d) => {
      if (!scaleBase.current) scaleBase.current = d;
      return scaleMany(scaleBase.current, sel, from, to);
    }, firstFrame);
    setDirty(true);
    if (commit) { scaleBase.current = null; force((n) => n + 1); }
  }, [sel, setDoc]);

  const select = useCallback((id: string | null, additive?: boolean) => {
    if (!id) return setSel([]);
    setSel((s) => (additive ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : [id]));
  }, []);

  /* ── Keyboard ───────────────────────────────────────────────────────── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      // A <select> and a contenteditable count as typing too. The Inspector
      // put both on the page: without them, arrowing through the font menu
      // also nudged the layer by a pixel per keypress, and Delete inside the
      // inline text editor deleted the layer being edited.
      const typing = el instanceof HTMLInputElement
        || el instanceof HTMLTextAreaElement
        || el instanceof HTMLSelectElement
        || (el instanceof HTMLElement && el.isContentEditable);
      const meta = e.metaKey || e.ctrlKey;

      // Typing wins first (C5). With the undo branch ABOVE this guard, Ctrl+Z
      // in an Inspector input undid CANVAS steps instead of the field's own
      // text — native undo never fired because we preventDefault()ed it. The
      // on-canvas inline editor is unaffected either way: CanvasText stops
      // propagation of its keys itself, so they never reach this listener.
      if (typing) return;

      if (meta && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }

      if (meta && e.key === "0") { e.preventDefault(); return actualSize(); }
      if (meta && (e.key === "=" || e.key === "+")) { e.preventDefault(); return zoomBy(1.2); }
      if (meta && e.key === "-") { e.preventDefault(); return zoomBy(1 / 1.2); }
      if (e.key === "1" && !meta) { e.preventDefault(); return fitView(); }
      if (meta && e.key.toLowerCase() === "a") {
        e.preventDefault();
        return setSel(layersOf(doc).filter((l) => !l.locked).map((l) => l.id));
      }

      if (meta && e.key.toLowerCase() === "c") { e.preventDefault(); if (copyLayers(doc, sel)) toast(`${sel.length} copied.`); return; }
      if (meta && e.key.toLowerCase() === "x") { e.preventDefault(); if (sel.length) { apply((d) => cutLayers(d, sel)); setSel([]); } return; }
      if (meta && e.key.toLowerCase() === "v") {
        e.preventDefault();
        if (!canPaste()) return;
        apply((d) => { const r = pasteLayers(d); setSel(r.ids); return r.doc; });
        return;
      }

      if (!sel.length) return;
      const step = e.shiftKey ? 10 : 1;
      const nudgeAll = (dx: number, dy: number) => {
        e.preventDefault();
        apply((d) => sel.reduce((acc, id) => nudge(acc, id, dx, dy), d));
      };
      if (e.key === "ArrowLeft") return nudgeAll(-step, 0);
      if (e.key === "ArrowRight") return nudgeAll(step, 0);
      if (e.key === "ArrowUp") return nudgeAll(0, -step);
      if (e.key === "ArrowDown") return nudgeAll(0, step);
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); apply((d) => removeMany(d, sel)); setSel([]); return; }
      if (meta && e.key.toLowerCase() === "d") {
        e.preventDefault();
        apply((d) => { const r = duplicateLayer(d, sel[0]); setSel([r.id]); return r.doc; });
        return;
      }
      if (e.key === "]") { e.preventDefault(); apply((d) => sel.reduce((a, id) => bringForward(a, id), d)); }
      else if (e.key === "[") { e.preventDefault(); apply((d) => sel.reduce((a, id) => sendBackward(a, id), d)); }
      else if (e.key === "Escape") setSel([]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, doc, apply, undo, redo]);

  /* ── Wheel zoom ────────────────────────────────────────────────────────
     Non-passive, because preventDefault on a passive listener is ignored and
     the browser zooms the whole page instead of the canvas. React's onWheel is
     passive, so this is attached by hand. */
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      // Measured against the CANVAS element, not the SVG: the SVG is drawn a
      // bleed wider on every side so the selection handles are not clipped, so
      // its own top-left is a couple of dozen pixels outside the artboard's.
      const r = (canvas.current ?? el).getBoundingClientRect();
      setView((v) => {
        if (!v) return v;
        const cx = v.x + (e.clientX - r.left) / v.zoom;
        const cy = v.y + (e.clientY - r.top) / v.zoom;
        return zoomTo(v, e.deltaY < 0 ? 1.1 : 1 / 1.1, cx, cy);
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // Attached exactly once. `zoomTo` reads the available room from a ref and
    // is otherwise pure, so the copy captured here is never stale in a way
    // that matters.
  }, []);

  /**
   * Persist the DOCUMENT — and nothing else.
   *
   * The save both the autosave and the Save button share. It carries the
   * optimistic-concurrency token (U11): the update only lands if the row still
   * has the updated_at this editor read, so two tabs — or a tab and the
   * operator agent — can no longer silently overwrite each other. On a
   * conflict it raises the dialog and reports it; it never toasts, because
   * what "failed to save" should say differs between a pause-triggered
   * autosave and a pressed button, and the callers know which they are.
   */
  const persist = useCallback(async (): Promise<{ status: "saved" | "conflict" | "error"; error?: string | null }> => {
    // One write at a time — see `writing`. Waiting (rather than skipping)
    // matters for the manual Save racing an in-flight autosave: both must
    // land, in order, each against the token the previous one refreshed.
    while (writing.current) await new Promise((r) => setTimeout(r, 100));
    writing.current = true;
    try {
      const k = deckRef.current;
      const { error, conflict: stale, updatedAt } = await saveDesign(
        design.id,
        { title: titleRef.current, doc: k, template_id: k.slides[0].templateId },
        { updatedAt: loadedAt.current },
      );
      if (stale) { setConflict(true); return { status: "conflict" }; }
      if (error) return { status: "error", error };
      if (updatedAt) loadedAt.current = updatedAt;
      return { status: "saved" };
    } finally {
      writing.current = false;
    }
  }, [design.id]);

  /**
   * Autosave (U2). The Back button's confirm used to be the ONLY guard on
   * unsaved work — left-nav, browser Back and refresh all discarded it
   * silently. Now the document is written 2.5s after the last edit (and when
   * the tab goes hidden), so the loss window is seconds wide.
   *
   * DELIBERATELY WITHOUT the PNG publish: the autosave persists the doc only.
   * Rasterising and uploading a cover on every pause in typing would thrash
   * storage with pictures nobody asked for — the explicit Save button remains
   * the step that publishes the PNG and makes the design sendable by the agent.
   */
  const autosave = useCallback(async () => {
    // Stand down while a manual save/export/rewrite runs, and entirely after
    // a conflict — otherwise this becomes a dialog-spawning retry loop
    // against a version that will keep winning.
    if (!dirtyRef.current || conflictRef.current || busyRef.current !== "") return;
    setAutoState("saving");
    const r = await persist();
    if (r.status === "saved") {
      setDirty(false);
      setPngStale(true); // the doc moved on; the published PNG is now behind
      setAutoState("saved");
    } else {
      // Conflict raised its dialog inside persist; a transient error just
      // goes quiet and the next edit re-arms the timer. No toast — breaking
      // someone's typing to report a save nobody asked for is worse.
      setAutoState("");
    }
  }, [persist]);

  // Debounced from the last edit, not an interval: a metronome saves
  // mid-gesture, this saves at the pause.
  useEffect(() => {
    if (!dirty || conflict) return;
    const t = setTimeout(() => { void autosave(); }, 2500);
    return () => clearTimeout(t);
  }, [deck, title, dirty, conflict, autosave]);

  // The tab going hidden is the last moment this code is guaranteed a chance
  // to run — flush rather than gamble on the tab coming back.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") void autosave(); };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [autosave]);

  // Refresh and tab-close (U2a): the browser's own "leave site?" while dirty.
  // The autosave shrinks what this can lose, but a refresh two seconds after
  // a keystroke still lands inside the debounce window.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // "Saved · just now" is only true for so long.
  useEffect(() => {
    if (autoState !== "saved") return;
    const t = setTimeout(() => setAutoState(""), 60_000);
    return () => clearTimeout(t);
  }, [autoState]);

  /**
   * The FULL save: document, then publish the picture the SERVER can send.
   *
   * The second half is what lets a customer ask for the menu and get the menu.
   * A design is JSON plus a browser renderer, so until it has a stored PNG there
   * is literally nothing for the agent to attach to a WhatsApp reply — see
   * publishDesignPng. It runs after the save and never fails it: the document is
   * safe the moment saveDesign returns, and a picture that could not be rendered
   * is reported as exactly that rather than as a lost save.
   *
   * Returns whether the DOCUMENT was saved — schedule() gates on that and not
   * on the PNG, because ScheduleDialog rasterises for itself.
   */
  async function save(): Promise<boolean> {
    setBusy("saving");
    const r = await persist();
    if (r.status !== "saved") {
      setBusy("");
      if (r.status === "error") toastError(r.error ?? "Could not save.");
      return false; // on conflict the dialog is already up
    }
    setDirty(false);
    const { publishDesignPng } = await import("./rasterise");
    const published = await publishDesignPng(design.organization_id, {
      id: design.id,
      title,
      templateId: deck.slides[0].templateId,
      doc: deck,
      previousPath: publishedPng.current,
    });
    setBusy("");
    if (published.error) {
      setPngStale(true); // Save stays pressable: the publish is what failed
      toast("Saved. The sharable picture could not be refreshed, so your agent will still send the last one it has.");
      return true;
    }
    publishedPng.current = published.path;
    setPngStale(false);
    toast("Saved — and ready for your agent to send.");
    return true;
  }

  /**
   * Schedule, from the editor — the money path. It used to be Save → Back →
   * find the tile → Schedule; now it is one button. Saving (doc + PNG) first
   * means the dialog queues what is on the canvas, not the last save.
   */
  async function schedule() {
    if (dirty || pngStale) {
      const ok = await save();
      if (!ok) return; // the conflict dialog is up, or the error was toasted
    }
    setScheduling(true);
  }

  /** The conflict's first answer: take THEIRS. Re-read the row and rebuild
   *  the editor on it — undo history included, because steps recorded against
   *  a document that no longer exists would restore fragments of it. */
  async function reloadTheirs() {
    const { data, error } = await getDesign(design.id);
    if (error || !data) return toastError(error ?? "Could not reload this design.");
    history.current = new History<Deck>();
    setDeck(asDeck(data.doc, data.template_id));
    setTitle(data.title);
    setSel([]);
    setEditing(null);
    loadedAt.current = data.updated_at;
    publishedPng.current = data.png_path ?? null;
    setDirty(false);
    setPngStale(false);
    setAutoState("");
    setConflict(false);
    toast("Reloaded — this is the newer version.");
  }

  /** The conflict's second answer: keep MINE. One unconditional write — no
   *  token — because overwriting is exactly what was chosen. The returned
   *  updated_at re-arms the token, so the very next save is guarded again. */
  async function overwriteMine() {
    const k = deckRef.current;
    const { error, updatedAt } = await saveDesign(design.id, {
      title: titleRef.current, doc: k, template_id: k.slides[0].templateId,
    });
    if (error) return toastError(error);
    if (updatedAt) loadedAt.current = updatedAt;
    setConflict(false);
    setDirty(false);
    setPngStale(true); // the published PNG is still the other version's
    toast("Overwritten — yours is the saved version.");
  }

  async function download() {
    const svg = stage.current?.querySelector("svg");
    if (!svg) return toastError("The canvas is not ready yet.");
    setBusy("exporting");
    try {
      // Exported from a clone with the whole artboard in view, so what lands in
      // the file never depends on where the editor happens to be scrolled.
      const clone = svg.cloneNode(true) as SVGSVGElement;
      // The artboard's size is the FORMAT's, not a constant, since formats
      // shipped — a story exported at the portrait viewBox would letterbox.
      const dims = formatDims(doc.format);
      clone.setAttribute("viewBox", `0 0 ${dims.w} ${dims.h}`);
      const { blob, missing } = await exportPng(clone, doc);
      downloadPng(blob, deck.slides.length > 1 ? `${title || "post"}-${index + 1}` : (title || "post"));
      if (missing.length) {
        toastError(`Downloaded, but ${missing.length === 1 ? "a photo" : `${missing.length} photos`} could not be fetched and ${missing.length === 1 ? "is" : "are"} missing from the file.`);
      } else {
        toast("Downloaded.");
      }
    } catch (e) {
      toastError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  /**
   * Export every slide, numbered in posting order.
   *
   * Each slide is put on the canvas in turn and rasterised from what is
   * actually there, rather than from a second renderer built for export — the
   * whole point of one renderer is that the file is the thing that was
   * approved. A frame is yielded between slides so React has painted the new
   * one before it is read, and browsers drop downloads fired in the same tick,
   * so they are spaced.
   */
  async function downloadAll() {
    if (deck.slides.length === 1) return download();
    setBusy("exporting");
    const was = index;
    let dropped = 0;
    try {
      for (let i = 0; i < deck.slides.length; i++) {
        setSlide(i);
        setSel([]);
        // Two frames: one for React to commit the new slide, one for the
        // browser to paint it. Reading after a single frame catches the
        // previous slide about a third of the time.
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const svg = stage.current?.querySelector("svg");
        if (!svg) throw new Error("The canvas is not ready yet.");
        const clone = svg.cloneNode(true) as SVGSVGElement;
        // Per SLIDE, not per deck: apply() writes formats slide-by-slide, so
        // a carousel can (deliberately or not) carry mixed shapes.
        const dims = formatDims(deck.slides[i].format);
        clone.setAttribute("viewBox", `0 0 ${dims.w} ${dims.h}`);
        const { blob, missing } = await exportPng(clone, deck.slides[i]);
        dropped += missing.length;
        downloadPng(blob, `${title || "post"}-${i + 1}`);
        await new Promise((r) => setTimeout(r, 350));
      }
      if (dropped) {
        toastError(`Downloaded ${deck.slides.length} slides, but ${dropped === 1 ? "a photo" : `${dropped} photos`} could not be fetched and ${dropped === 1 ? "is" : "are"} missing.`);
      } else {
        toast(`Downloaded ${deck.slides.length} slides.`);
      }
    } catch (e) {
      toastError((e as Error).message);
    } finally {
      setSlide(was);
      setBusy("");
    }
  }

  /** Run the agent over this design, keeping photos and layout. The brief
   *  arrives from RewriteDialog — a window.prompt used to live here, which
   *  could not be styled, could not show progress, and made a long rewrite
   *  look like a hang. The dialog stays open while this runs so its clock is
   *  visible; it is closed here, on success, and stays for another try if not. */
  async function rewrite(brief: string) {
    const text = brief.trim();
    if (!text) return;
    setBusy("writing");
    const { data, error } = await generateDesign(design.organization_id, text, doc.templateId);
    setBusy("");
    if (error || !data) return toastError(error ?? "The agent could not rewrite that.");
    setRewriting(false);
    apply((d) => ({
      ...d,
      content: data.content as Partial<Record<TextSlot, string>>,
      images: { ...(data.images as DesignDoc["images"]), ...d.images },
      palette: (data.palette as DesignDoc["palette"]) ?? d.palette,
    }));
    toast("Rewritten — your photos and layout were kept.");
  }

  /** Change the post's shape (contract: convertFormat in @/lib/designs/edit).
   *  Through apply(), so it is ONE undoable step like any other edit — and
   *  behind a one-line confirm, because the conversion re-fits the layout and
   *  "everything jumped" must never be a surprise. */
  const switchFormat = (f: DesignFormat) => {
    if ((doc.format ?? "portrait") === f) return;
    if (!window.confirm("Re-fits your layout — check positions after")) return;
    apply((d) => convertFormat(d, f));
  };

  if (!template) return <p className="dsn-note">That template no longer exists.</p>;

  const palette = { ...DEFAULT_PALETTE, ...(template.palette ?? {}), ...(doc.palette ?? {}) };

  /** Begin editing text in place — and put ONE history entry down first (C4).
   *  CanvasText applies per keystroke WITHOUT recording (recording each key
   *  would make undo a backspace), so before this existed a committed inline
   *  edit either merged into the previous undo step or could not be undone at
   *  all. One entry at open, none per keystroke: undo after typing returns the
   *  copy to what it said when the caret landed. */
  const beginTextEdit = (id: string) => {
    history.current.push(deck);
    force((n) => n + 1); // canUndo just changed; a ref alone re-renders nothing
    setEditing(id);
  };

  /** Open a layer for editing. Text gets a caret; a photo slot opens the
   *  library, because "edit this photograph" means "choose a different one". */
  const openLayer = (id: string) => {
    const l = layers.find((x) => x.id === id);
    if (!l || l.locked) return;
    setSel([id]);
    if (l.type === "text") beginTextEdit(id);
    else if (l.type === "image") setPicking(l.slot);
  };

  /** The floating bar's verbs. Kept here rather than in the bar so the undo
   *  stack, the selection and the dirty flag stay owned by one component. */
  const runCommand = (c: "front" | "back" | "duplicate" | "delete" | "lock") => {
    if (!sel.length) return;
    if (c === "delete") { apply((d) => removeMany(d, sel)); setSel([]); return; }
    if (c === "duplicate") {
      const made: string[] = [];
      apply((d) => sel.reduce((acc, id) => {
        const r = duplicateLayer(acc, id);
        made.push(r.id);
        return r.doc;
      }, d));
      setSel(made);
      return;
    }
    if (c === "lock") { apply((d) => sel.reduce((acc, id) => toggle(acc, id, "locked"), d)); return; }
    const move = c === "front" ? bringToFront : sendToBack;
    apply((d) => sel.reduce((acc, id) => move(acc, id), d));
  };

  /* ── Slides ────────────────────────────────────────────────────────────
     A carousel is a post with more than one page. "Add" copies the current
     slide rather than starting blank: the slides of a carousel share a look,
     and copying then editing is far less work than rebuilding it. A deep copy,
     because slides must not share layer arrays — editing one would silently
     edit the other. */
  const slideOps = {
    select: (i: number) => { setSlide(i); setSel([]); setEditing(null); },
    add: () => {
      setDeck((k) => {
        history.current.push(k);
        const copy = JSON.parse(JSON.stringify(k.slides[index])) as DesignDoc;
        return { ...k, slides: [...k.slides.slice(0, index + 1), copy, ...k.slides.slice(index + 1)] };
      });
      setSlide(index + 1); setSel([]); setDirty(true); force((n) => n + 1);
    },
    blank: () => {
      setDeck((k) => {
        history.current.push(k);
        const fresh = emptyDoc(k.slides[index].templateId);
        return { ...k, slides: [...k.slides.slice(0, index + 1), fresh, ...k.slides.slice(index + 1)] };
      });
      setSlide(index + 1); setSel([]); setDirty(true); force((n) => n + 1);
    },
    remove: () => {
      if (deck.slides.length === 1) return toastError("A post needs at least one slide.");
      setDeck((k) => {
        history.current.push(k);
        return { ...k, slides: k.slides.filter((_, i) => i !== index) };
      });
      setSlide(Math.max(0, index - 1)); setSel([]); setDirty(true); force((n) => n + 1);
    },
    move: (to: number) => {
      if (to < 0 || to >= deck.slides.length || to === index) return;
      setDeck((k) => {
        history.current.push(k);
        const next = [...k.slides];
        const [moved] = next.splice(index, 1);
        next.splice(to, 0, moved);
        return { ...k, slides: next };
      });
      setSlide(to); setDirty(true); force((n) => n + 1);
    },
  };

  /** A chosen photograph lands in the slot the library was opened for. */
  const placeImage = (im: LibraryImage) => {
    if (!picking) return;
    apply((d) => ({
      ...d,
      images: {
        ...d.images,
        [picking]: {
          url: im.url,
          alt: im.alt,
          photographer: im.photographer,
          photographerUrl: im.photographerUrl,
          source: im.source,
        },
      },
    }));
    setPicking(null);
  };

  return (
    <div className="d-flex flex-column" style={{ gap: 8 }}>
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div className="dsn-bar">
        <button type="button" className="dsn-btn" onClick={() => {
          if (dirty && !window.confirm("Close without saving?")) return;
          onClose();
        }}>{I_BACK}Back</button>

        <input className="hrx-input dsn-title" value={title}
               onChange={(e) => { setTitle(e.target.value); setDirty(true); }} aria-label="Post name" />

        {/* The post's shape, switchable in place (contract: DesignFormat /
            formatDims in types, convertFormat in edit). Applies to the slide
            on the canvas — a slide is an ordinary design — and goes through
            apply(), so a mis-switch is one Ctrl+Z away from undone. */}
        <div className="dsn-seg" role="group" aria-label="Post format" style={{ flex: "0 0 auto" }}>
          {(["portrait", "square", "story"] as const).map((f) => {
            const d = formatDims(f);
            const label = f === "portrait" ? "Portrait" : f === "square" ? "Square" : "Story";
            return (
              <button
                key={f} type="button"
                className={`dsn-seg__b${(doc.format ?? "portrait") === f ? " is-on" : ""}`}
                title={`${label} · ${d.w}×${d.h}`}
                onClick={() => switchFormat(f)}
              >{label}</button>
            );
          })}
        </div>

        <div className="dsn-bar__right">
          <button type="button" className="dsn-btn" onClick={undo} disabled={!history.current.canUndo} title="Undo (Ctrl+Z)">↺</button>
          <button type="button" className="dsn-btn" onClick={redo} disabled={!history.current.canRedo} title="Redo (Ctrl+Shift+Z)">↻</button>
          <button type="button" className="dsn-btn" onClick={() => setRewriting(true)} disabled={busy !== ""}>
            {I_SPARK}{busy === "writing" ? "Writing…" : "Rewrite"}
          </button>
          <button type="button" className="dsn-btn" onClick={() => void download()} disabled={busy !== ""}>
            {I_DOWN}{busy === "exporting" ? "Rendering…" : deck.slides.length > 1 ? `PNG (slide ${index + 1})` : "PNG"}
          </button>
          {deck.slides.length > 1 && (
            <button type="button" className="dsn-btn" onClick={() => void downloadAll()} disabled={busy !== ""}
                    title="One PNG per slide, numbered in posting order">
              {I_DOWN}All {deck.slides.length}
            </button>
          )}
          {/* The autosave, admitting what it is doing. aria-live, so a screen
              reader hears "Saved" without the element ever taking focus. */}
          {autoState !== "" && (
            <span className="dsn-note mb-0" aria-live="polite" style={{ whiteSpace: "nowrap" }}>
              {autoState === "saving" ? "Saving…" : "Saved · just now"}
            </span>
          )}
          {/* Enabled while dirty OR while the published PNG lags the doc: the
              autosave persists the document without publishing, and this
              button is what closes that gap. */}
          <button type="button" className="dsn-btn dsn-btn--solid" onClick={() => void save()}
                  disabled={busy !== "" || (!dirty && !pngStale)}>
            {busy === "saving" ? "Saving…" : dirty || pngStale ? "Save" : "Saved"}
          </button>
          <button type="button" className="dsn-btn" onClick={() => void schedule()} disabled={busy !== ""}
                  title="Save this post and put it on the social queue">
            {I_CAL}Schedule
          </button>
        </div>
      </div>

      {/* ── Tools ────────────────────────────────────────────────────── */}
      <div className="dsn-tools">
        <span className="dsn-tools__g">
          <button type="button" className="dsn-btn dsn-btn--sm" onClick={() => {
            const r = addText(doc);
            if (!r) return toastError("Every text slot in this layout is already on the canvas — edit one, or duplicate it.");
            apply(r.doc);
            setSel([r.id]);
          }}>+ Text</button>
          {/* Nine shapes behind one button rather than nine buttons: the tools
              row is already the widest thing on the page, and a shape is chosen
              once and then edited for the rest of the session. */}
          <span className="dsn-shapemenu">
            <button
              type="button" className="dsn-btn dsn-btn--sm"
              aria-haspopup="menu" aria-expanded={shapeMenu}
              onClick={() => setShapeMenu((v) => !v)}
            >+ Shape</button>
            {shapeMenu && (
              <div className="dsn-shapemenu__pop" role="menu">
                {SHAPE_KINDS.map(({ kind, label }) => (
                  <button
                    key={kind} type="button" role="menuitem" className="dsn-shapemenu__item" title={label}
                    onClick={() => {
                      setShapeMenu(false);
                      apply((d) => { const r = addRect(d, kind); setSel([r.id]); return r.doc; });
                    }}
                  >
                    <ShapeGlyph kind={kind} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </span>
          {/* Adding a photo frame opens the library straight away: an empty
              frame that has to be double-clicked is a second step nobody
              guesses, and routing it here is what keeps every picture in the
              editor coming from — and going back into — the business's own
              asset library. */}
          <button type="button" className="dsn-btn dsn-btn--sm" onClick={() => {
            const r = addImage(doc);
            if (!r) return toastError("All six photo slots are already on the canvas.");
            apply(r.doc);
            setSel([r.id]);
            const made = layersOf(r.doc).find((l) => l.id === r.id);
            if (made?.type === "image") setPicking(made.slot);
          }}>+ Photo</button>
        </span>

        <span className="dsn-tools__g">
          {([["⤒", "Bring to front", bringToFront], ["↑", "Forward ( ] )", bringForward],
             ["↓", "Backward ( [ )", sendBackward], ["⤓", "Send to back", sendToBack]] as const).map(([g, t, fn]) => (
            <button key={t} type="button" className="dsn-btn dsn-btn--sm" disabled={!sel.length} title={t}
                    onClick={() => apply((d) => sel.reduce((a, id) => fn(a, id), d))}>{g}</button>
          ))}
        </span>

        <span className="dsn-tools__g">
          {([["left", "⇤"], ["hcentre", "⇔"], ["right", "⇥"], ["top", "⇡"], ["vcentre", "⇕"], ["bottom", "⇣"]] as const).map(([how, g]) => (
            <button key={how} type="button" className="dsn-btn dsn-btn--sm" disabled={!sel.length}
                    title={sel.length > 1 ? `Align ${how} to each other` : `Align ${how} to the canvas`}
                    onClick={() => apply((d) => alignMany(d, sel, how))}>{g}</button>
          ))}
          <button type="button" className="dsn-btn dsn-btn--sm" disabled={sel.length < 3} title="Distribute horizontally"
                  onClick={() => apply((d) => distribute(d, sel, "h"))}>⇹</button>
          <button type="button" className="dsn-btn dsn-btn--sm" disabled={sel.length < 3} title="Distribute vertically"
                  onClick={() => apply((d) => distribute(d, sel, "v"))}>⇳</button>
        </span>

        <span className="dsn-tools__g">
          <button type="button" className="dsn-btn dsn-btn--sm" disabled={!sel.length} title="Duplicate (Ctrl+D)"
                  onClick={() => apply((d) => { const r = duplicateLayer(d, sel[0]); setSel([r.id]); return r.doc; })}>Duplicate</button>
          <button type="button" className="dsn-btn dsn-btn--sm" disabled={!sel.length} title="Delete"
                  onClick={() => { apply((d) => removeMany(d, sel)); setSel([]); }}>Delete</button>
        </span>

        {/* The gestures, written down. Space-drag and Ctrl+scroll are invisible
            until you try them, and they used to be written on the artboard's
            bottom-left corner — over the artwork, which is the one place in
            this editor nothing is allowed to stand. Here it is above the
            canvas, on one line, with the whole sentence on the title for the
            widths where it does not fit. */}
        <span className="dsn-tools__hint" title={HINT}>{HINT}</span>

        <span className="dsn-tools__g dsn-tools__zoom">
          <button type="button" className="dsn-btn dsn-btn--sm" onClick={() => zoomBy(1 / 1.2)} title="Zoom out (Ctrl+−)">−</button>
          <button type="button" className="dsn-btn dsn-btn--sm" onClick={actualSize} title="100% (Ctrl+0)">
            {Math.round((view?.zoom ?? 1) * 100)}%
          </button>
          <button type="button" className="dsn-btn dsn-btn--sm" onClick={() => zoomBy(1.2)} title="Zoom in (Ctrl++)">+</button>
          <button type="button" className="dsn-btn dsn-btn--sm" onClick={fitView} title="Fit (1)">Fit</button>
        </span>
      </div>

      {picking && (
        <ImageLibrary
          orgId={design.organization_id}
          hint={template.imageHints?.[picking]}
          onPick={placeImage}
          onClose={() => setPicking(null)}
        />
      )}

      <div className="dsn-editor">
        {/* The pages, down the left. They used to sit under the canvas, which
            cost a portrait artboard the one dimension it is always short of
            and put chrome across the bottom of the design. */}
        <SlideStrip
          slides={deck.slides}
          current={index}
          onSelect={slideOps.select}
          onAdd={slideOps.add}
          onBlank={slideOps.blank}
          onRemove={slideOps.remove}
          onMove={slideOps.move}
        />

        {/* THE CANVAS IS THE ARTBOARD.
            Two elements, and the difference between them is the whole point.
            `.dsn-stage__view` is the room — it fills the column, and it is the
            only thing measured. `.dsn-stage__canvas` is the artboard's own
            rectangle, sized here in pixels from the viewport, so at the fit
            zoom its edge and the artboard's edge are the same line and there is
            no ground left over on either axis. Measuring the element that is
            also being sized would be a loop; measuring the one outside it is
            not.

            The SVG is drawn a bleed larger on all four sides and pulled back
            over the box's edges by a negative margin, because the resize
            handles sit ON the artboard's edge and the canvas has no margin
            left to keep for them. Everything else in here positions itself
            from the BOX's top-left, which is the canvas point (view.x, view.y)
            — so they all share one origin, which is why the box, not the SVG,
            is what they are given. */}
        <div className="dsn-stage dsn-stage--canvas">
          <div className="dsn-stage__view" ref={stage}>
            {view && box && (
              <div
                className="dsn-stage__canvas"
                ref={canvas}
                style={{ width: box.width, height: box.height }}
              >
                <DesignSvg
                  doc={doc}
                  width={box.width + CANVAS_BLEED * 2}
                  height={box.height + CANVAS_BLEED * 2}
                  viewport={{
                    zoom: view.zoom,
                    x: view.x - CANVAS_BLEED / view.zoom,
                    y: view.y - CANVAS_BLEED / view.zoom,
                  }}
                  selectedIds={sel}
                  onSelect={select}
                  onMarquee={(ids, additive) => setSel((s) => (additive ? [...new Set([...s, ...ids])] : ids))}
                  // At fit the artboard already fills its canvas, so there is
                  // nothing to pan to and the clamp pins it. Returning the SAME
                  // viewport object then matters: the clamp is handed an already
                  // offset copy, so it can only compare against that copy and
                  // hands back a fresh object every pointermove — which React
                  // commits, re-rendering every layer sixty times a second for a
                  // canvas that has not moved a pixel.
                  onPan={(dx, dy) => setView((v) => {
                    if (!v) return v;
                    const next = clampView({ ...v, x: v.x + dx, y: v.y + dy }, avail.current);
                    return next.x === v.x && next.y === v.y && next.zoom === v.zoom ? v : next;
                  })}
                  onGeometry={onGeometry}
                  onTransform={onTransform}
                  onOpen={openLayer}
                  editingId={editing}
                />

                {/* Three or four verbs beside the selection — the rest is in
                    the Inspector. It is outside the SVG because it is chrome,
                    not artwork: putting it inside would put it in the export. */}
                {!editing && (
                  <FloatingBar
                    layers={layers}
                    sel={sel}
                    view={view}
                    stage={box}
                    onCommand={runCommand}
                    onEditText={() => one && beginTextEdit(one.id)}
                    onPickImage={() => one?.type === "image" && setPicking(one.slot)}
                  />
                )}

                {/* Editing happens on the artboard, in place. The box is offset
                    by the layer's vertical alignment, so the caret lands on the
                    glyphs rather than where they would sit if the copy were
                    top-aligned. */}
                {editing && one?.type === "text" && (
                  <CanvasText
                    layer={{ ...one, y: one.y + textTopOffset(one, content[one.slot]) }}
                    value={content[one.slot]}
                    palette={palette}
                    view={view}
                    // Untouched means the copy is still the template's: the
                    // slot has nothing of its own in the document yet.
                    untouched={doc.content?.[one.slot] === undefined}
                    onChange={(next) => apply((d) => ({ ...d, content: { ...d.content, [one.slot]: next } }), false)}
                    onDone={() => { setEditing(null); force((n) => n + 1); }}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── The Inspector ───────────────────────────────────────────
            DOCKED, not floating. It is a column of the editor's grid, so the
            canvas beside it is narrower rather than partly hidden — which is
            the whole point: the properties of a thing must never be standing
            on the thing. Nothing in it is sticky; it scrolls on its own. */}
        <aside className="dsn-rail" aria-label="Properties">
          <Inspector
            doc={doc}
            layers={layers}
            sel={sel}
            content={content}
            palette={palette}
            templateName={template.name}
            slideCount={deck.slides.length}
            onEdit={apply}
            onContent={(next) => one?.type === "text" && apply((d) => ({ ...d, content: { ...d.content, [one.slot]: next } }))}
            onSelect={select}
            onCommand={runCommand}
            onEditText={() => one && beginTextEdit(one.id)}
            onPickImage={() => one?.type === "image" && setPicking(one.slot)}
            /* The Inspector's other seam, `assetActions`, is deliberately left
               empty: it was designed as the asset library's entry point, and
               the "Replace photo" button already beside it IS that entry point.
               A second button opening the same dialog is the duplicate picker
               this pass exists to remove.

               Background removal, in the Photo section. The cut-out is stored
               in the business's library and the slot is pointed at that stored
               URL — never at a blob: address, which would render today and be
               a broken picture the next time the design is opened. The
               photographer's credit is carried across untouched: a cut-out of
               a Pexels photograph is a derivative of it, and dropping the
               attribution on the way through would be a licence breach nobody
               would notice until it mattered. */
            imageActions={one?.type === "image" ? (
              <ImageBackgroundAction
                orgId={design.organization_id}
                url={doc.images[one.slot]?.url}
                name={doc.images[one.slot]?.alt || `${title || "post"} photo`}
                disabled={one.locked}
                onCutout={(asset) => {
                  apply((d) => ({
                    ...d,
                    images: {
                      ...d.images,
                      [one.slot]: { ...d.images[one.slot], url: asset.url, source: asset.source },
                    },
                  }));
                  toast("Background removed — the cut-out is saved in your library.");
                }}
              />
            ) : undefined}
            layersSlot={
              <LayersPanel
                layers={layers}
                sel={sel}
                onSelect={select}
                onReorder={(id, to) => apply((d) => reorder(d, id, to))}
                onToggle={(id, key) => apply((d) => toggle(d, id, key))}
                onRename={(id, name) => apply((d) => renameLayer(d, id, name))}
              />
            }
          />
          <p className="dsn-note dsn-rail__foot">
            {/* Twice the artboard, per format — the exporter renders at 2×. */}
            Exports at {formatDims(doc.format).w * 2}×{formatDims(doc.format).h * 2} for {orgName}.
          </p>
        </aside>
      </div>

      {rewriting && (
        <RewriteDialog
          initial={design.brief ?? ""}
          busy={busy === "writing"}
          onClose={() => setRewriting(false)}
          onGo={(brief) => void rewrite(brief)}
        />
      )}

      {scheduling && (
        <ScheduleDialog
          orgId={design.organization_id}
          /* The design AS IT IS NOW, not the row this editor was opened with:
             schedule() just saved deck and title, and handing the dialog the
             load-time doc would rasterise and queue the pre-edit version. */
          design={{ ...design, title, doc: deck, template_id: deck.slides[0].templateId }}
          onClose={() => setScheduling(false)}
          onConnectAccounts={onConnectAccounts}
        />
      )}

      {conflict && (
        <ConflictDialog onReload={() => void reloadTheirs()} onOverwrite={() => void overwriteMine()} />
      )}
    </div>
  );
}

/* ── Rewrite ─────────────────────────────────────────────────────────────── */

/** Describe what the post should say instead. Replaces a window.prompt: this
 *  one can be escaped, styled like the studio's other dialogs, submitted with
 *  Enter — and, because a rewrite takes most of a minute, it shows honest
 *  elapsed time while it runs, the same clock the image generator shows. */
function RewriteDialog({ initial, busy, onClose, onGo }: {
  initial: string;
  busy: boolean;
  onClose: () => void;
  onGo: (brief: string) => void;
}) {
  const [value, setValue] = useState(initial);
  /** Honest waiting — the pattern from ImageLibrary's Generate tab: a button
   *  that says "Writing…" with no clock reads as broken by second 30. */
  const [secs, setSecs] = useState(0);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    field.current?.focus();
    // Pre-selected because the seeded brief is the LAST rewrite's: the common
    // move is to say something new, not to append to the old instruction.
    field.current?.select();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose, busy]);

  useEffect(() => {
    if (!busy) { setSecs(0); return; }
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  return (
    <div className="dsn-modal" role="dialog" aria-modal="true" aria-label="Rewrite this post"
         onPointerDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="dsn-modal__box dsn-brief-dlg">
        <h3 className="dsn-picker__t">Rewrite this post</h3>
        <p className="dsn-note">
          Say what it should say instead. Your photographs and layout are kept — the agent only
          rewrites the words.
        </p>
        <textarea
          ref={field}
          className="hrx-input dsn-input dsn-brief-dlg__in"
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          // Enter submits, as in the create dialog; Shift+Enter breaks the line.
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!busy && value.trim()) onGo(value); } }}
          disabled={busy}
        />
        <div className="dsn-brief-dlg__acts">
          <button type="button" className="dsn-btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="dsn-btn dsn-btn--solid" onClick={() => onGo(value)}
                  disabled={busy || !value.trim()}>
            {I_SPARK}{busy ? `Writing… ${secs}s` : "Rewrite"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Conflict ────────────────────────────────────────────────────────────── */

/** Somebody else saved this design first (U11). No backdrop dismiss and no
 *  Escape, alone among the studio's dialogs: closing it would leave the
 *  editor holding a version it cannot save with the autosave stopped — this
 *  is the one dialog where walking away is not an answer. */
function ConflictDialog({ onReload, onOverwrite }: {
  onReload: () => void;
  onOverwrite: () => void;
}) {
  return (
    <div className="dsn-modal" role="alertdialog" aria-modal="true" aria-label="This design changed elsewhere">
      <div className="dsn-modal__box dsn-brief-dlg">
        <h3 className="dsn-picker__t">This design changed elsewhere</h3>
        <p className="dsn-note">
          Another tab — or your agent — saved a newer version while you were editing. Saving is
          paused so neither copy is silently lost. Which one wins?
        </p>
        <div className="dsn-brief-dlg__acts">
          <button type="button" className="dsn-btn" onClick={onReload}>Reload theirs (discard mine)</button>
          <button type="button" className="dsn-btn dsn-btn--solid" onClick={onOverwrite}>Overwrite with mine</button>
        </div>
      </div>
    </div>
  );
}
