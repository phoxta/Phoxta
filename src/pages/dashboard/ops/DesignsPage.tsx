import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast, toastError, confirmDanger } from "@/lib/ops/feedback";
import { Card, Empty, PageHeader } from "@/components/dash/Ui";
import type { OpsContext } from "@/layouts/OperatingLayout";
import {
  listDesigns, createDesign, saveDesign, archiveDesign, generateDesign, type Design,
} from "@/lib/db/designs";
import { DesignSvg, textTopOffset } from "@/lib/designs/render";
import { exportPng, downloadPng } from "@/lib/designs/export";
import { getTemplate, layersOf } from "@/lib/designs/templates";
import {
  History, addImage, addRect, addText, alignMany, bringForward, bringToFront, reorder,
  canPaste, copyLayers, cutLayers, distribute, duplicateLayer, moveMany, nudge,
  pasteLayers, removeMany, renameLayer, scaleMany, sendBackward, sendToBack, toggle, updateLayer,
} from "@/lib/designs/edit";
import { centred, fitTo, zoomAt, type Viewport } from "@/lib/designs/snap";
import { FloatingBar } from "./designs/FloatingBar";
import { Inspector } from "./designs/Inspector";
import { CanvasText } from "./designs/CanvasText";
import { ImageLibrary } from "./designs/ImageLibrary";
import { ImageBackgroundAction } from "./designs/RemoveBackground";
import { LayersPanel } from "./designs/LayersPanel";
import { SlideStrip } from "./designs/SlideStrip";
import { TemplatePicker } from "./designs/TemplatePicker";
import type { LibraryImage } from "@/lib/db/designs";
import {
  CANVAS_H, CANVAS_W, DEFAULT_PALETTE, asDeck, emptyDoc, slidesOf,
  type Deck, type DesignDoc, type ImageSlot, type TextSlot,
} from "@/lib/designs/types";
import "./designs.css";

/**
 * Graphics — social posts from the Digital Agency template pack.
 *
 * Two ways to make one, both writing to the same document: type into it, or
 * describe it and let the agent write it. There is no separate "AI mode" — the
 * generator fills the same content map the fields edit, which is what lets a
 * generated post be hand-corrected immediately instead of regenerated until it
 * happens to come out right.
 *
 * The canvas is the real artwork at 1080×1350, scaled by one transform. Every
 * layer can be selected, dragged, resized, reordered, hidden, locked, duplicated
 * and deleted; new text, shapes and photo frames can be added. The fields and
 * the canvas are two views of one object, not a form that builds a picture.
 *
 * A design starts as content over a shared template. The first structural edit
 * materialises the layers into the document — see designs/edit.ts — after which
 * it owns its arrangement and stops inheriting template changes. That trade is
 * the price of a real canvas and it is made deliberately.
 */

const ln = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const I_BACK = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>;
const I_DOWN = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" /></svg>;
const I_SPARK = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
const I_PLUS = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;


export default function DesignsPage() {
  const { orgId, org } = useOutletContext<OpsContext>();

  const [rows, setRows] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Design | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await listDesigns(orgId);
    if (error) toastError(error);
    setRows(data);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { void load(); }, [load]);

  if (open) {
    return (
      <Editor
        design={open}
        orgName={org?.name ?? "your business"}
        onClose={async () => { setOpen(null); await load(); }}
      />
    );
  }

  return (
    <div className="d-flex flex-column" style={{ gap: 8 }}>
      <PageHeader
        crumb="Console"
        title="Graphics"
        note="Social posts from the agency template pack. Edit them by hand, or describe one and let the agent write it."
        stat={{ label: "Posts", value: rows.length }}
      />

      <NewDesign orgId={orgId} onMade={(d) => setOpen(d)} />

      <Card title="Your posts">
        {loading ? (
          <p className="dsn-note">Loading…</p>
        ) : rows.length === 0 ? (
          <Empty title="Nothing here yet">
            Start from a template above, or describe the post you want and the agent will draft it.
          </Empty>
        ) : (
          <div className="dsn-grid">
            {rows.map((d) => (
              <article key={d.id} className="dsn-tile">
                <button type="button" className="dsn-tile__art" onClick={() => setOpen(d)}
                        aria-label={`Open ${d.title}`}>
                  <DesignSvg doc={slidesOf(d.doc, d.template_id)[0]} width={260} />
                  {slidesOf(d.doc, d.template_id).length > 1 && (
                    <span className="dsn-tile__count">
                      {slidesOf(d.doc, d.template_id).length} slides
                    </span>
                  )}
                </button>
                <div className="dsn-tile__foot">
                  <div style={{ minWidth: 0 }}>
                    <span className="dsn-tile__name">{d.title}</span>
                    <span className="dsn-tile__meta">
                      {getTemplate(d.template_id)?.name ?? d.template_id}
                    </span>
                  </div>
                  <button
                    type="button" className="dsn-x"
                    onClick={async () => {
                      if (!(await confirmDanger(`Archive "${d.title}"?`))) return;
                      const { error } = await archiveDesign(d.id);
                      if (error) return toastError(error);
                      toast("Archived.");
                      await load();
                    }}
                    aria-label={`Archive ${d.title}`}
                  >×</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── Starting a post ─────────────────────────────────────────────────────── */

function NewDesign({ orgId, onMade }: { orgId: string; onMade: (d: Design) => void }) {
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  /** The layout picker. Behind a button because eighteen layouts open on the
   *  page pushed the library of saved work off the bottom of the screen. */
  const [picking, setPicking] = useState(false);

  async function fromTemplate(templateId: string) {
    const t = getTemplate(templateId);
    const { data, error } = await createDesign(orgId, {
      title: t ? `${t.name} post` : "New post",
      templateId,
      doc: emptyDoc(templateId),
    });
    if (error || !data) return toastError(error ?? "Could not create that post.");
    onMade(data);
  }

  async function fromBrief() {
    const text = brief.trim();
    if (!text) return toastError("Say what the post should be about.");
    setBusy(true);
    const { data, error } = await generateDesign(orgId, text);
    if (error || !data) { setBusy(false); return toastError(error ?? "The agent could not write that."); }

    const doc: DesignDoc = {
      templateId: data.templateId,
      content: data.content as Partial<Record<TextSlot, string>>,
      images: data.images as DesignDoc["images"],
      palette: data.palette as DesignDoc["palette"],
    };
    const { data: row, error: err2 } = await createDesign(orgId, {
      title: data.title, templateId: data.templateId, doc, brief: text,
    });
    setBusy(false);
    if (err2 || !row) return toastError(err2 ?? "Could not save that post.");
    setBrief("");
    onMade(row);
  }

  return (
    <Card title="New post">
      <div className="dsn-brief">
        <input
          className="hrx-input dsn-input"
          placeholder="Describe the post — e.g. “we cut delivery times to 15 minutes, aimed at busy parents”"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void fromBrief(); }}
          disabled={busy}
        />
        <button type="button" className="dsn-btn dsn-btn--solid" onClick={() => void fromBrief()} disabled={busy}>
          {I_SPARK}{busy ? "Writing…" : "Write it for me"}
        </button>
      </div>
      <p className="dsn-note mb-0">
        Or start from a layout and fill it in yourself — the agent can still rewrite it later.
      </p>
      <button type="button" className="dsn-btn" onClick={() => setPicking(true)} disabled={busy}>
        {I_PLUS}Templates
      </button>

      {picking && (
        <TemplatePicker
          onPick={(id) => { setPicking(false); void fromTemplate(id); }}
          onClose={() => setPicking(false)}
        />
      )}
    </Card>
  );
}

/* ── The editor ──────────────────────────────────────────────────────────── */

function Editor({ design, orgName, onClose }: { design: Design; orgName: string; onClose: () => void }) {
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
  const [view, setView] = useState<Viewport | null>(null);
  /** The text layer with the caret in it, if any. */
  const [editing, setEditing] = useState<string | null>(null);
  /** The image slot the library was opened for. Every route to a photograph
   *  goes through it — the toolbar's "+ Photo", double-clicking a frame, the
   *  quick bar and the Inspector — so an uploaded picture is always stored in
   *  the business's library rather than inlined into this one design. */
  const [picking, setPicking] = useState<ImageSlot | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  // The undo stack holds whole DECKS, not slides. Storing a slide would let
  // an undo restore one slide's old content into whichever slide happened to
  // be open, which is worse than not having undo at all.
  const history = useRef(new History<Deck>());
  const [, force] = useState(0);

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
     Fitted to the stage on mount, so opening an editor never starts scrolled
     into a corner of the artboard.

     The stage's SIZE is state rather than a rectangle read off the ref during
     render. It has to be: the canvas is now docked beside a 272px Inspector,
     so it changes width whenever the window does, and the quick bar positions
     itself against that size. Reading the ref mid-render gave the previous
     frame's number, which is invisible until the window is resized and then
     leaves the bar hanging a panel's width away from its selection. */
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      if (r.width <= 40 || r.height <= 40) return;
      setSize((s) => (s && Math.abs(s.width - r.width) < 0.5 && Math.abs(s.height - r.height) < 0.5 ? s : { width: r.width, height: r.height }));
      setView((v) => v ?? fitTo(r.width, r.height));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stageBox = () => size ?? { width: 800, height: 600 };

  const zoomBy = (f: number) => setView((v) => {
    if (!v) return v;
    const r = stageBox();
    return zoomAt(v, f, v.x + r.width / v.zoom / 2, v.y + r.height / v.zoom / 2);
  });

  const fitView = () => { const r = stageBox(); setView(fitTo(r.width, r.height)); };
  const actualSize = () => { const r = stageBox(); setView(centred(1, r.width, r.height)); };

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

      if (meta && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (typing) return;

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
      const svg = el.querySelector("svg");
      const r = (svg ?? el).getBoundingClientRect();
      setView((v) => {
        if (!v) return v;
        const cx = v.x + (e.clientX - r.left) / v.zoom;
        const cy = v.y + (e.clientY - r.top) / v.zoom;
        return zoomAt(v, e.deltaY < 0 ? 1.1 : 1 / 1.1, cx, cy);
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  async function save() {
    setBusy("saving");
    const { error } = await saveDesign(design.id, { title, doc: deck, template_id: deck.slides[0].templateId });
    setBusy("");
    if (error) return toastError(error);
    setDirty(false);
    toast("Saved.");
  }

  async function download() {
    const svg = stage.current?.querySelector("svg");
    if (!svg) return toastError("The canvas is not ready yet.");
    setBusy("exporting");
    try {
      // Exported from a clone with the whole artboard in view, so what lands in
      // the file never depends on where the editor happens to be scrolled.
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("viewBox", `0 0 ${CANVAS_W} ${CANVAS_H}`);
      const { blob } = await exportPng(clone, doc);
      downloadPng(blob, deck.slides.length > 1 ? `${title || "post"}-${index + 1}` : (title || "post"));
      toast("Downloaded.");
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
        clone.setAttribute("viewBox", `0 0 ${CANVAS_W} ${CANVAS_H}`);
        const { blob } = await exportPng(clone, deck.slides[i]);
        downloadPng(blob, `${title || "post"}-${i + 1}`);
        await new Promise((r) => setTimeout(r, 350));
      }
      toast(`Downloaded ${deck.slides.length} slides.`);
    } catch (e) {
      toastError((e as Error).message);
    } finally {
      setSlide(was);
      setBusy("");
    }
  }

  async function rewrite() {
    const brief = window.prompt("What should this post say?", design.brief ?? "");
    if (brief === null || !brief.trim()) return;
    setBusy("writing");
    const { data, error } = await generateDesign(design.organization_id, brief.trim(), doc.templateId);
    setBusy("");
    if (error || !data) return toastError(error ?? "The agent could not rewrite that.");
    apply((d) => ({
      ...d,
      content: data.content as Partial<Record<TextSlot, string>>,
      images: { ...(data.images as DesignDoc["images"]), ...d.images },
      palette: (data.palette as DesignDoc["palette"]) ?? d.palette,
    }));
    toast("Rewritten — your photos and layout were kept.");
  }

  if (!template) return <p className="dsn-note">That template no longer exists.</p>;

  const palette = { ...DEFAULT_PALETTE, ...(template.palette ?? {}), ...(doc.palette ?? {}) };

  /** Open a layer for editing. Text gets a caret; a photo slot opens the
   *  library, because "edit this photograph" means "choose a different one". */
  const openLayer = (id: string) => {
    const l = layers.find((x) => x.id === id);
    if (!l || l.locked) return;
    setSel([id]);
    if (l.type === "text") setEditing(id);
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

        <div className="dsn-bar__right">
          <button type="button" className="dsn-btn" onClick={undo} disabled={!history.current.canUndo} title="Undo (Ctrl+Z)">↺</button>
          <button type="button" className="dsn-btn" onClick={redo} disabled={!history.current.canRedo} title="Redo (Ctrl+Shift+Z)">↻</button>
          <button type="button" className="dsn-btn" onClick={() => void rewrite()} disabled={busy !== ""}>
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
          <button type="button" className="dsn-btn dsn-btn--solid" onClick={() => void save()} disabled={busy !== "" || !dirty}>
            {busy === "saving" ? "Saving…" : dirty ? "Save" : "Saved"}
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
          <button type="button" className="dsn-btn dsn-btn--sm" onClick={() => apply((d) => { const r = addRect(d); setSel([r.id]); return r.doc; })}>+ Shape</button>
          {/* Adding a photo frame opens the library straight away: an empty
              frame that has to be double-clicked is a second step nobody
              guesses, and routing it here is what keeps every picture in the
              editor coming from — and going back into — the business's own
              asset library. */}
          <button type="button" className="dsn-btn dsn-btn--sm" onClick={() => {
            const r = addImage(doc);
            if (!r) return toastError("All three photo slots are already on the canvas.");
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
        {/* The stage is a column: the canvas viewport, then the slide strip.
            The VIEWPORT is the measured element, not the whole stage — the
            strip is chrome under the artboard, and measuring past it handed
            DesignSvg a height that included it, so the artboard was drawn
            behind the strip and the quick bar placed itself against a
            rectangle taller than the one on screen. */}
        <div className="dsn-stage dsn-stage--canvas">
          <div className="dsn-stage__view" ref={stage}>
            {view && size && (
              <DesignSvg
                doc={doc}
                width={size.width}
                height={size.height}
                viewport={view}
                selectedIds={sel}
                onSelect={select}
                onMarquee={(ids, additive) => setSel((s) => (additive ? [...new Set([...s, ...ids])] : ids))}
                onPan={(dx, dy) => setView((v) => (v ? { ...v, x: v.x + dx, y: v.y + dy } : v))}
                onGeometry={onGeometry}
                onTransform={onTransform}
                onOpen={openLayer}
                editingId={editing}
              />
            )}
            {/* Three or four verbs beside the selection — the rest is in the
                Inspector. It is outside the SVG because it is chrome, not
                artwork: putting it inside would put it in the export. */}
            {view && size && !editing && (
              <FloatingBar
                layers={layers}
                sel={sel}
                view={view}
                stage={size}
                onCommand={runCommand}
                onEditText={() => one && setEditing(one.id)}
                onPickImage={() => one?.type === "image" && setPicking(one.slot)}
              />
            )}

            {/* Editing happens on the artboard, in place. The box is offset by
                the layer's vertical alignment, so the caret lands on the glyphs
                rather than where they would sit if the copy were top-aligned. */}
            {view && editing && one?.type === "text" && (
              <CanvasText
                layer={{ ...one, y: one.y + textTopOffset(one, content[one.slot]) }}
                value={content[one.slot]}
                palette={palette}
                view={view}
                onChange={(next) => apply((d) => ({ ...d, content: { ...d.content, [one.slot]: next } }), false)}
                onDone={() => { setEditing(null); force((n) => n + 1); }}
              />
            )}

            <span className="dsn-hint">
              Double-click text to write in it · Space + drag pans · Ctrl + scroll zooms ·
              Ctrl + drag marquees over artwork · Shift keeps a corner proportional
            </span>
          </div>

          <SlideStrip
            slides={deck.slides}
            current={index}
            onSelect={slideOps.select}
            onAdd={slideOps.add}
            onBlank={slideOps.blank}
            onRemove={slideOps.remove}
            onMove={slideOps.move}
          />
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
            onEditText={() => one && setEditing(one.id)}
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
          <p className="dsn-note dsn-rail__foot">Exports at 2160×2700 for {orgName}.</p>
        </aside>
      </div>
    </div>
  );
}

