import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast, toastError, confirmDanger } from "@/lib/ops/feedback";
import { Card, Empty, PageHeader } from "@/components/dash/Ui";
import type { OpsContext } from "@/layouts/OperatingLayout";
import {
  listDesigns, createDesign, saveDesign, archiveDesign, generateDesign, type Design,
} from "@/lib/db/designs";
import { DesignSvg } from "@/lib/designs/render";
import { exportPng, downloadPng } from "@/lib/designs/export";
import { TEMPLATES, getTemplate, layerName, layersOf } from "@/lib/designs/templates";
import {
  History, addImage, addRect, addText, alignMany, bringForward, bringToFront,
  canPaste, copyLayers, cutLayers, distribute, duplicateLayer, moveMany, nudge,
  pasteLayers, removeMany, renameLayer, scaleMany, sendBackward, sendToBack, toggle, updateLayer,
} from "@/lib/designs/edit";
import { centred, fitTo, zoomAt, type Viewport } from "@/lib/designs/snap";
import { FloatingBar } from "./designs/FloatingBar";
import { CanvasText } from "./designs/CanvasText";
import { ImageLibrary } from "./designs/ImageLibrary";
import type { LibraryImage } from "@/lib/db/designs";
import {
  CANVAS_H, CANVAS_W, DEFAULT_PALETTE, emptyDoc, 
  type DesignDoc, type Layer, type TextSlot,
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
                  <DesignSvg doc={d.doc} width={260} />
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
      <p className="dsn-note">
        Or start from a layout and fill it in yourself — the agent can still rewrite it later.
      </p>
      <div className="dsn-templates">
        {TEMPLATES.map((t) => (
          <button key={t.id} type="button" className="dsn-template" onClick={() => void fromTemplate(t.id)}>
            <span className="dsn-template__art"><DesignSvg doc={emptyDoc(t.id)} width={150} /></span>
            <span className="dsn-template__name">{I_PLUS}{t.name}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

/* ── The editor ──────────────────────────────────────────────────────────── */

function Editor({ design, orgName, onClose }: { design: Design; orgName: string; onClose: () => void }) {
  const [doc, setDoc] = useState<DesignDoc>(() => ({ ...emptyDoc(design.template_id), ...design.doc }));
  const [title, setTitle] = useState(design.title);
  const [sel, setSel] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"" | "saving" | "exporting" | "writing">("");
  const [view, setView] = useState<Viewport | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  /** The text layer with the caret in it, if any. */
  const [editing, setEditing] = useState<string | null>(null);
  /** The image slot the library was opened for. */
  const [picking, setPicking] = useState<string | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const history = useRef(new History());
  const [, force] = useState(0);

  const template = getTemplate(doc.templateId);
  const layers = layersOf(doc);
  const chosen = layers.filter((l) => sel.includes(l.id));
  const one = chosen.length === 1 ? chosen[0] : null;
  const content = useMemo(() => ({ ...(template?.content ?? {}), ...doc.content }), [template, doc.content]);

  /* ── Viewport ──────────────────────────────────────────────────────────
     Fitted to the stage on mount and whenever the stage resizes, so opening
     an editor never starts scrolled into a corner of the artboard. */
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 40 && r.height > 40) setView(fitTo(r.width, r.height));
    };
    fit();
    const ro = new ResizeObserver(() => { if (!view) fit(); });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stageBox = () => stage.current?.getBoundingClientRect() ?? { width: 800, height: 600 } as DOMRect;

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
    setDoc((d) => {
      const value = typeof next === "function" ? next(d) : next;
      if (value === d) return d;
      if (record) history.current.push(d);
      return value;
    });
    setDirty(true);
    force((n) => n + 1);
  }, []);

  const undo = useCallback(() => { setDoc((d) => history.current.undo(d) ?? d); setDirty(true); force((n) => n + 1); }, []);
  const redo = useCallback(() => { setDoc((d) => history.current.redo(d) ?? d); setDirty(true); force((n) => n + 1); }, []);

  /* ── Dragging ──────────────────────────────────────────────────────────
     A multi-selection moves together. The positions every selected layer had
     when the gesture began are captured on the first move — deriving the delta
     from the previous frame instead would accumulate rounding, and a long drag
     would visibly shear the selection apart. */
  const dragBase = useRef<Record<string, { x: number; y: number }> | null>(null);

  const onGeometry = useCallback((id: string, b: { x: number; y: number; w: number; h: number; rotation?: number }, commit: boolean) => {
    setDoc((d) => {
      const current = layersOf(d);
      // A rotation is always one layer, even when several are selected: the
      // group frame offers no rotate grip. Routing it through the multi-move
      // path would read the angle as a position and shove the selection.
      const multi = b.rotation === undefined && sel.length > 1 && sel.includes(id);

      if (!dragBase.current) {
        history.current.push(d);
        dragBase.current = Object.fromEntries(current.filter((l) => sel.includes(l.id)).map((l) => [l.id, { x: l.x, y: l.y }]));
      }

      if (multi) {
        const base = dragBase.current[id];
        return base ? moveMany(d, sel, dragBase.current, b.x - base.x, b.y - base.y) : d;
      }
      return updateLayer(d, id, b);
    });
    setDirty(true);
    if (commit) { dragBase.current = null; force((n) => n + 1); }
  }, [sel]);

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
    setDoc((d) => {
      if (!scaleBase.current) { history.current.push(d); scaleBase.current = d; }
      return scaleMany(scaleBase.current, sel, from, to);
    });
    setDirty(true);
    if (commit) { scaleBase.current = null; force((n) => n + 1); }
  }, [sel]);

  const select = useCallback((id: string | null, additive?: boolean) => {
    if (!id) return setSel([]);
    setSel((s) => (additive ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : [id]));
  }, []);

  /* ── Keyboard ───────────────────────────────────────────────────────── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
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
    const { error } = await saveDesign(design.id, { title, doc, template_id: doc.templateId });
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
      downloadPng(blob, title || "post");
      toast("Downloaded.");
    } catch (e) {
      toastError((e as Error).message);
    } finally {
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
  const stageRect = stage.current?.getBoundingClientRect();
  const patch = (p: Partial<Layer>, record = true) => one && apply((d) => updateLayer(d, one.id, p), record);

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
            {I_DOWN}{busy === "exporting" ? "Rendering…" : "PNG"}
          </button>
          <button type="button" className="dsn-btn dsn-btn--solid" onClick={() => void save()} disabled={busy !== "" || !dirty}>
            {busy === "saving" ? "Saving…" : dirty ? "Save" : "Saved"}
          </button>
        </div>
      </div>

      {/* ── Tools ────────────────────────────────────────────────────── */}
      <div className="dsn-tools">
        <span className="dsn-tools__g">
          <button type="button" className="dsn-btn dsn-btn--sm" onClick={() => apply((d) => { const r = addText(d); setSel([r.id]); return r.doc; })}>+ Text</button>
          <button type="button" className="dsn-btn dsn-btn--sm" onClick={() => apply((d) => { const r = addRect(d); setSel([r.id]); return r.doc; })}>+ Shape</button>
          <button type="button" className="dsn-btn dsn-btn--sm" onClick={() => apply((d) => {
            const r = addImage(d);
            if (!r) { toastError("All three photo slots are already on the canvas."); return d; }
            setSel([r.id]);
            return r.doc;
          })}>+ Photo</button>
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
          hint={template?.imageHints?.[picking as keyof typeof template.imageHints]}
          onPick={placeImage}
          onClose={() => setPicking(null)}
        />
      )}

      <div className="dsn-editor">
        <div className="dsn-stage dsn-stage--canvas" ref={stage}>
          {view && stageRect && (
            <DesignSvg
              doc={doc}
              width={stageRect.width}
              height={stageRect.height}
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
          {/* The properties panel travels with the selection. It is outside
              the SVG because it is chrome, not artwork: putting it inside
              would put it in the export. */}
          {view && stageRect && !editing && (
            <FloatingBar
              layers={layers}
              sel={sel}
              content={content}
              palette={palette}
              view={view}
              stage={{ width: stageRect.width, height: stageRect.height }}
              editing={false}
              onPatch={(pt, commit) => patch(pt, commit)}
              onContent={(next) => one?.type === "text" && apply((d) => ({ ...d, content: { ...d.content, [one.slot]: next } }))}
              onCommand={runCommand}
              onEditText={() => one && setEditing(one.id)}
              onPickImage={() => one?.type === "image" && setPicking(one.slot)}
            />
          )}

          {/* Editing happens on the artboard, in place. */}
          {view && editing && one?.type === "text" && (
            <CanvasText
              layer={one}
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

        <aside className="dsn-panel">
          {/* ── Layers ─────────────────────────────────────────────── */}
          <Section title={`Layers (${layers.length})`}>
            <ul className="dsn-layers">
              {[...layers].reverse().map((l) => (
                <li key={l.id}>
                  {renaming === l.id ? (
                    <input
                      className="hrx-input dsn-rename" autoFocus defaultValue={layerName(l)}
                      onBlur={(e) => { apply((d) => renameLayer(d, l.id, e.target.value)); setRenaming(null); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setRenaming(null);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className={`dsn-layer${sel.includes(l.id) ? " is-on" : ""}${l.hidden ? " is-off" : ""}`}
                      onClick={(e) => select(l.id, e.shiftKey)}
                      onDoubleClick={() => setRenaming(l.id)}
                    >
                      <span className="dsn-layer__k">{l.type}</span>
                      <span className="dsn-layer__n">{layerName(l)}</span>
                    </button>
                  )}
                  <button type="button" className="dsn-layer__i" title={l.hidden ? "Show" : "Hide"}
                          onClick={() => apply((d) => toggle(d, l.id, "hidden"))}>{l.hidden ? "○" : "●"}</button>
                  <button type="button" className="dsn-layer__i" title={l.locked ? "Unlock" : "Lock"}
                          onClick={() => apply((d) => toggle(d, l.id, "locked"))}>{l.locked ? "🔒" : "🔓"}</button>
                </li>
              ))}
            </ul>
            <p className="dsn-note">Top of this list is the front. Double-click to rename.</p>
          </Section>

          {sel.length > 1 && (
            <Section title={`${sel.length} selected`}>
              <p className="dsn-note">
                Drag to move them together, or pull a corner to scale the whole
                group — type included. Shift frees the aspect ratio. Align and
                distribute work between them rather than to the canvas.
              </p>
            </Section>
          )}

          {one && (
            <Section title="Selected">
              <p className="dsn-note">
                {layerName(one)} — its properties are on the canvas, above the
                layer itself. Double-click any text to write in it.
              </p>
            </Section>
          )}

          {/* ── Document ─────────────────────────────────────────────── */}
          <Section title="Colours">
            {(["accent", "ink", "gradientFrom", "gradientTo", "canvas"] as const).map((role) => (
              <label key={role} className="dsn-colour">
                <input type="color" value={palette[role]} aria-label={role}
                       onChange={(e) => apply((d) => ({ ...d, palette: { ...(d.palette ?? {}), [role]: e.target.value } }), false)} />
                <span className="dsn-field__k">{role.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
                <code className="dsn-hex">{palette[role]}</code>
              </label>
            ))}
            <button type="button" className="dsn-btn dsn-btn--sm"
                    onClick={() => apply((d) => ({ ...d, palette: undefined }))}>Reset to the pack's colours</button>
          </Section>

          <Section title="Layout">
            <div className="dsn-swatches">
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button"
                        className={`dsn-layout${t.id === doc.templateId ? " is-on" : ""}`}
                        title={t.purpose}
                        onClick={() => {
                          if (doc.layers?.length && !window.confirm("This replaces your arrangement with that layout. Your words and photos are kept.")) return;
                          apply((d) => ({ ...d, templateId: t.id, layers: undefined }));
                          setSel([]);
                        }}>{t.name}</button>
              ))}
            </div>
            <p className="dsn-note">{template.purpose}</p>
          </Section>

          <p className="dsn-note">Exports at 2160×2700 for {orgName}.</p>
        </aside>
      </div>
    </div>
  );
}

/* ── Panel furniture ─────────────────────────────────────────────────────
   Named sections, the way a design tool's inspector is organised: position,
   appearance, fill, stroke, typography. A flat list of every control is what
   the previous version had, and it made finding one a scan of the whole panel. */

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="dsn-sec">
    <h4 className="dsn-sec__h">{title}</h4>
    {children}
  </section>
);

