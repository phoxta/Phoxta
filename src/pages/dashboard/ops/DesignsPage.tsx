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
import { TEMPLATES, getTemplate, layerName, layersOf, textSlotsOf } from "@/lib/designs/templates";
import {
  History, addImage, addRect, addText, align, bringForward, bringToFront,
  duplicateLayer, nudge, removeLayer, sendBackward, sendToBack, toggle, updateLayer,
} from "@/lib/designs/edit";
import { DEFAULT_PALETTE, emptyDoc, type DesignDoc, type Layer, type TextSlot } from "@/lib/designs/types";
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

/** Field labels — slot names are storage, not language. */
const LABELS: Record<string, string> = {
  title: "Headline",
  subtitle: "Sub-heading",
  description: "Body",
  statistic: "Big number",
  testimonial: "Quote",
  quote: "Attribution",
  cta: "Button",
  score: "Badge",
  point1: "Tag 1",
  point2: "Tag 2",
  point3: "Tag 3",
  phone: "Phone",
  website: "Website",
};

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
  const [sel, setSel] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"" | "saving" | "exporting" | "writing">("");
  const stage = useRef<HTMLDivElement>(null);
  const history = useRef(new History());
  const [, force] = useState(0);

  const template = getTemplate(doc.templateId);
  const layers = layersOf(doc);
  const selected = layers.find((l) => l.id === sel) ?? null;
  const content = useMemo(() => ({ ...(template?.content ?? {}), ...doc.content }), [template, doc.content]);

  /**
   * Every edit goes through here.
   *
   * One place that records history and marks the document dirty, so no new
   * action can be added that forgets to be undoable — the commonest way an
   * editor ends up with an undo stack that has holes in it.
   */
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

  const undo = useCallback(() => {
    setDoc((d) => history.current.undo(d) ?? d);
    setDirty(true);
    force((n) => n + 1);
  }, []);

  const redo = useCallback(() => {
    setDoc((d) => history.current.redo(d) ?? d);
    setDirty(true);
    force((n) => n + 1);
  }, []);

  /**
   * Geometry from the canvas.
   *
   * Live drags do not record history — only the release does. Otherwise
   * dragging a headline across the canvas would bury the previous state under
   * four hundred intermediate ones and undo would move it back a pixel.
   */
  const onGeometry = useCallback((id: string, box: { x: number; y: number; w: number; h: number }, commit: boolean) => {
    if (commit) {
      // The pre-drag document was pushed on the first move, so the commit only
      // has to write the final box.
      apply((d) => updateLayer(d, id, box), false);
      setDirty(true);
      return;
    }
    setDoc((d) => {
      if (!dragging.current) { history.current.push(d); dragging.current = true; }
      return updateLayer(d, id, box);
    });
  }, [apply]);

  const dragging = useRef(false);
  useEffect(() => {
    const stop = () => { dragging.current = false; };
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, []);

  /* ── Keyboard ─────────────────────────────────────────────────────────
     The shortcuts a designer reaches for without thinking. Ignored while a
     field has focus, or arrow keys would nudge a layer instead of moving the
     caret through the word someone is typing. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if (typing || !sel) return;

      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowLeft") { e.preventDefault(); apply((d) => nudge(d, sel, -step, 0)); }
      else if (e.key === "ArrowRight") { e.preventDefault(); apply((d) => nudge(d, sel, step, 0)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); apply((d) => nudge(d, sel, 0, -step)); }
      else if (e.key === "ArrowDown") { e.preventDefault(); apply((d) => nudge(d, sel, 0, step)); }
      else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); apply((d) => removeLayer(d, sel)); setSel(null); }
      else if (meta && e.key.toLowerCase() === "d") {
        e.preventDefault();
        apply((d) => { const r = duplicateLayer(d, sel); setSel(r.id); return r.doc; });
      }
      else if (e.key === "]") { e.preventDefault(); apply((d) => bringForward(d, sel)); }
      else if (e.key === "[") { e.preventDefault(); apply((d) => sendBackward(d, sel)); }
      else if (e.key === "Escape") setSel(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, apply, undo, redo]);

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
      const { blob } = await exportPng(svg as SVGSVGElement, doc);
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
      // Photos already chosen are kept: rewriting the words should not throw
      // away a picture someone picked on purpose.
      images: { ...(data.images as DesignDoc["images"]), ...d.images },
      palette: (data.palette as DesignDoc["palette"]) ?? d.palette,
    }));
    toast("Rewritten — your photos and layout were kept.");
  }

  if (!template) return <p className="dsn-note">That template no longer exists.</p>;

  const palette = { ...DEFAULT_PALETTE, ...(doc.palette ?? {}) };
  const textSlot = selected && (selected.type === "text" || selected.type === "chip") ? selected.slot : null;

  return (
    <div className="d-flex flex-column" style={{ gap: 8 }}>
      <div className="dsn-bar">
        <button type="button" className="dsn-btn" onClick={() => {
          if (dirty && !window.confirm("Close without saving?")) return;
          onClose();
        }}>{I_BACK}Back</button>

        <input
          className="hrx-input dsn-title" value={title}
          onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
          aria-label="Post name"
        />

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

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="dsn-tools">
        <span className="dsn-tools__g">
          <button type="button" className="dsn-btn dsn-btn--sm" onClick={() => apply((d) => { const r = addText(d); setSel(r.id); return r.doc; })}>+ Text</button>
          <button type="button" className="dsn-btn dsn-btn--sm" onClick={() => apply((d) => { const r = addRect(d); setSel(r.id); return r.doc; })}>+ Shape</button>
          <button type="button" className="dsn-btn dsn-btn--sm" onClick={() => apply((d) => {
            const r = addImage(d);
            if (!r) { toastError("All three photo slots are already on the canvas."); return d; }
            setSel(r.id);
            return r.doc;
          })}>+ Photo</button>
        </span>

        <span className="dsn-tools__g">
          <button type="button" className="dsn-btn dsn-btn--sm" disabled={!sel} onClick={() => sel && apply((d) => bringToFront(d, sel))} title="Bring to front">⤒</button>
          <button type="button" className="dsn-btn dsn-btn--sm" disabled={!sel} onClick={() => sel && apply((d) => bringForward(d, sel))} title="Bring forward ( ] )">↑</button>
          <button type="button" className="dsn-btn dsn-btn--sm" disabled={!sel} onClick={() => sel && apply((d) => sendBackward(d, sel))} title="Send backward ( [ )">↓</button>
          <button type="button" className="dsn-btn dsn-btn--sm" disabled={!sel} onClick={() => sel && apply((d) => sendToBack(d, sel))} title="Send to back">⤓</button>
        </span>

        <span className="dsn-tools__g">
          {([["left", "⇤"], ["hcentre", "⇔"], ["right", "⇥"], ["top", "⇡"], ["vcentre", "⇕"], ["bottom", "⇣"]] as const).map(([how, glyph]) => (
            <button key={how} type="button" className="dsn-btn dsn-btn--sm" disabled={!sel}
                    onClick={() => sel && apply((d) => align(d, sel, how))} title={`Align ${how}`}>{glyph}</button>
          ))}
        </span>

        <span className="dsn-tools__g">
          <button type="button" className="dsn-btn dsn-btn--sm" disabled={!sel}
                  onClick={() => sel && apply((d) => { const r = duplicateLayer(d, sel); setSel(r.id); return r.doc; })}
                  title="Duplicate (Ctrl+D)">Duplicate</button>
          <button type="button" className="dsn-btn dsn-btn--sm" disabled={!sel}
                  onClick={() => { if (!sel) return; apply((d) => removeLayer(d, sel)); setSel(null); }}
                  title="Delete">Delete</button>
        </span>
      </div>

      <div className="dsn-editor">
        <div className="dsn-stage" ref={stage}>
          <DesignSvg
            doc={doc}
            width={520}
            selectedId={sel}
            onSelect={setSel}
            onGeometry={onGeometry}
          />
        </div>

        <aside className="dsn-panel">
          {/* ── Layers ──────────────────────────────────────────────────── */}
          <section className="dsn-sec">
            <h4 className="dsn-sec__h">Layers</h4>
            <ul className="dsn-layers">
              {[...layers].reverse().map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    className={`dsn-layer${l.id === sel ? " is-on" : ""}${l.hidden ? " is-off" : ""}`}
                    onClick={() => setSel(l.id)}
                  >
                    <span className="dsn-layer__k">{l.type}</span>
                    <span className="dsn-layer__n">{layerName(l)}</span>
                  </button>
                  <button type="button" className="dsn-layer__i" title={l.hidden ? "Show" : "Hide"}
                          onClick={() => apply((d) => toggle(d, l.id, "hidden"))}>{l.hidden ? "○" : "●"}</button>
                  <button type="button" className="dsn-layer__i" title={l.locked ? "Unlock" : "Lock"}
                          onClick={() => apply((d) => toggle(d, l.id, "locked"))}>{l.locked ? "🔒" : "🔓"}</button>
                </li>
              ))}
            </ul>
            <p className="dsn-note">Top of this list is the front of the design.</p>
          </section>

          {/* ── The selected layer ──────────────────────────────────────── */}
          {selected && (
            <section className="dsn-sec">
              <h4 className="dsn-sec__h">{layerName(selected)}</h4>

              <div className="dsn-xy">
                {(["x", "y", "w", "h"] as const).map((k) => (
                  <label key={k} className="dsn-xy__f">
                    <span className="dsn-field__k">{k.toUpperCase()}</span>
                    <input
                      className="hrx-input" type="number" value={Math.round(selected[k])}
                      onChange={(e) => apply((d) => updateLayer(d, selected.id, { [k]: Number(e.target.value) } as Partial<Layer>))}
                    />
                  </label>
                ))}
              </div>

              {textSlot && (
                <label className="dsn-field">
                  <span className="dsn-field__k">{LABELS[textSlot] ?? textSlot}</span>
                  <textarea
                    className="hrx-input" rows={3}
                    value={content[textSlot as TextSlot] ?? ""}
                    onChange={(e) => apply((d) => ({ ...d, content: { ...d.content, [textSlot]: e.target.value } }), false)}
                  />
                </label>
              )}

              {selected.type === "text" && (
                <div className="dsn-xy">
                  <label className="dsn-xy__f">
                    <span className="dsn-field__k">Size</span>
                    <input className="hrx-input" type="number" value={selected.size}
                           onChange={(e) => apply((d) => updateLayer(d, selected.id, { size: Number(e.target.value) } as Partial<Layer>))} />
                  </label>
                  <label className="dsn-xy__f">
                    <span className="dsn-field__k">Weight</span>
                    <select className="hrx-input" value={selected.weight}
                            onChange={(e) => apply((d) => updateLayer(d, selected.id, { weight: Number(e.target.value) } as Partial<Layer>))}>
                      <option value={500}>Medium</option>
                      <option value={600}>Semibold</option>
                      <option value={700}>Bold</option>
                    </select>
                  </label>
                </div>
              )}

              {selected.type === "image" && (
                <ImageField
                  label="Photograph"
                  value={doc.images[selected.slot]?.url ?? ""}
                  credit={doc.images[selected.slot]?.photographer}
                  onChange={(url) => apply((d) => ({
                    ...d,
                    images: url
                      ? { ...d.images, [selected.slot]: { url, source: "upload" as const } }
                      : Object.fromEntries(Object.entries(d.images).filter(([k]) => k !== selected.slot)),
                  }))}
                />
              )}
            </section>
          )}

          {/* ── Words ───────────────────────────────────────────────────── */}
          <section className="dsn-sec">
            <h4 className="dsn-sec__h">All words</h4>
            {textSlotsOf(template).map(({ slot, id, multiline }) => (
              <label key={slot} className={`dsn-field${sel === id ? " is-on" : ""}`}>
                <span className="dsn-field__k">{LABELS[slot] ?? slot}</span>
                {multiline ? (
                  <textarea className="hrx-input" rows={2} value={content[slot as TextSlot] ?? ""}
                            onFocus={() => setSel(id)}
                            onChange={(e) => apply((d) => ({ ...d, content: { ...d.content, [slot]: e.target.value } }), false)} />
                ) : (
                  <input className="hrx-input" value={content[slot as TextSlot] ?? ""}
                         onFocus={() => setSel(id)}
                         onChange={(e) => apply((d) => ({ ...d, content: { ...d.content, [slot]: e.target.value } }), false)} />
                )}
              </label>
            ))}
            <p className="dsn-note">Wrap words in *asterisks* to paint them in the accent colour.</p>
          </section>

          {/* ── Colours ─────────────────────────────────────────────────── */}
          <section className="dsn-sec">
            <h4 className="dsn-sec__h">Colours</h4>
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
          </section>

          {/* ── Layout ──────────────────────────────────────────────────── */}
          <section className="dsn-sec">
            <h4 className="dsn-sec__h">Start over from a layout</h4>
            <div className="dsn-swatches">
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button"
                        className={`dsn-layout${t.id === doc.templateId ? " is-on" : ""}`}
                        title={t.purpose}
                        onClick={() => {
                          // Swapping layouts discards hand placement, because the
                          // new template's layers ARE the new arrangement. Said
                          // out loud rather than silently thrown away.
                          if (doc.layers?.length && !window.confirm("This replaces your arrangement with that layout. Your words and photos are kept.")) return;
                          apply((d) => ({ ...d, templateId: t.id, layers: undefined }));
                          setSel(null);
                        }}>{t.name}</button>
              ))}
            </div>
            <p className="dsn-note">{template.purpose}</p>
          </section>

          <p className="dsn-note">
            Exports at 2160×2700 for {orgName}. Drag to move, drag a handle to resize, arrows to nudge,
            <code> [ </code> and <code> ] </code> to send backward and forward.
          </p>
        </aside>
      </div>
    </div>
  );
}

/**
 * A photo field.
 *
 * A URL box and a file picker. The file is read to a data URI rather than
 * uploaded: it lands in the doc, which means it exports and it survives without
 * a storage bucket, at the cost of size — so it is capped, loudly, rather than
 * silently producing a row too big to save.
 */
function ImageField({ label, value, credit, onChange }: {
  label: string; value: string; credit?: string; onChange: (url: string) => void;
}) {
  const MAX = 1_500_000;
  return (
    <div className="dsn-field">
      <span className="dsn-field__k">{label}</span>
      <div className="dsn-img">
        {value ? <img src={value} alt="" className="dsn-img__thumb" /> : <span className="dsn-img__empty">none</span>}
        <div className="dsn-img__acts">
          <label className="dsn-btn dsn-btn--sm">
            Upload
            <input
              type="file" accept="image/*" hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > MAX) {
                  toastError("That image is over 1.5 MB — please use a smaller one.");
                  return;
                }
                const fr = new FileReader();
                fr.onload = () => onChange(String(fr.result));
                fr.readAsDataURL(f);
              }}
            />
          </label>
          {value && (
            <button type="button" className="dsn-btn dsn-btn--sm" onClick={() => onChange("")}>Clear</button>
          )}
        </div>
      </div>
      {credit && <span className="dsn-note">{credit} / Pexels</span>}
    </div>
  );
}
