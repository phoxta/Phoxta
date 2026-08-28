/* The editing surface: the real canvas, the real floating properties bar and
   the real on-canvas text editor, wired the way DesignsPage wires them. State
   is pushed onto window so a test can assert on the document rather than on
   pixels. */
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { DesignSvg } from "@/lib/designs/render";
import { materialise, updateLayer, removeMany, duplicateLayer, toggle, bringToFront, sendToBack, reorder, renameLayer } from "@/lib/designs/edit";
import { layersOf, getTemplate } from "@/lib/designs/templates";
import { CANVAS_H, CANVAS_W, emptyDoc, resolvePalette, type DesignDoc } from "@/lib/designs/types";
import { plain } from "@/lib/designs/rich";
import { CANVAS_BLEED, canvasBox, fitCanvas, type Viewport } from "@/lib/designs/snap";
import { FloatingBar } from "@/pages/dashboard/ops/designs/FloatingBar";
import { CanvasText } from "@/pages/dashboard/ops/designs/CanvasText";
import { LayersPanel } from "@/pages/dashboard/ops/designs/LayersPanel";
import { Inspector } from "@/pages/dashboard/ops/designs/Inspector";

declare global {
  interface Window { rig: Record<string, unknown> }
}

/* The room the canvas has, in the shape DesignsPage gives it: the stage takes
   the artboard's own proportions, so the fitted artboard fills it exactly and
   there is no ground. A square-ish stage here would test a layout that no
   longer ships. */
const H = 640;
const W = (H * CANVAS_W) / CANVAS_H;
const AVAIL = { width: W, height: H };

function Rig() {
  const [doc, setDoc] = useState<DesignDoc>(() => materialise(emptyDoc("v1")));
  const [sel, setSel] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [picked, setPicked] = useState(0);
  /** A log of what was opened and closed, so a test can tell "never opened"
   *  apart from "opened and then something closed it again". */
  const trail = useRef<string[]>([]);
  const [view, setView] = useState<Viewport | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => { setView(fitCanvas(AVAIL)); }, []);

  const template = getTemplate(doc.templateId);
  const palette = resolvePalette(doc, template?.palette);
  const layers = layersOf(doc);
  const content = { ...(template?.content ?? {}), ...doc.content };
  const one = sel.length === 1 ? layers.find((l) => l.id === sel[0]) ?? null : null;

  useEffect(() => {
    window.rig = {
      sel, editing, picked, trail: trail.current,
      layers: layers.map((l) => ({
        id: l.id, type: l.type, x: l.x, y: l.y, w: l.w, h: l.h,
        locked: !!l.locked, size: l.type === "text" ? l.size : undefined,
        slot: "slot" in l ? l.slot : undefined,
      })),
      content: Object.fromEntries(Object.entries(content).map(([k, v]) => [k, plain(v)])),
      raw: doc.content,
    };
  });

  /** One command handler, shared by the bar and the rail exactly as the page
   *  shares it — two copies would let the two surfaces drift apart. */
  const command = useCallback((c: "delete" | "duplicate" | "lock" | "front" | "back") => {
    if (!sel.length) return;
    if (c === "delete") { setDoc((d) => removeMany(d, sel)); setSel([]); return; }
    if (c === "duplicate") {
      const made: string[] = [];
      setDoc((d) => sel.reduce((acc, id) => { const r = duplicateLayer(acc, id); made.push(r.id); return r.doc; }, d));
      setSel(made);
      return;
    }
    if (c === "lock") { setDoc((d) => sel.reduce((acc, id) => toggle(acc, id, "locked"), d)); return; }
    const move = c === "front" ? bringToFront : sendToBack;
    setDoc((d) => sel.reduce((acc, id) => move(acc, id), d));
  }, [sel]);

  const openLayer = (id: string) => {
    const l = layers.find((x) => x.id === id);
    trail.current.push(`open ${id} ${l?.type ?? "?"}${l?.locked ? " LOCKED" : ""}`);
    if (!l || l.locked) return;
    setSel([id]);
    if (l.type === "text") setEditing(id);
    else if (l.type === "image") setPicked((n) => n + 1);
  };

  if (!view) return <div ref={stage} style={{ width: W, height: H }} />;
  /* The two rectangles the page keeps apart: the room, and the artboard's own
     size inside it. Everything that positions itself in stage pixels is given
     the BOX and lives inside it, because the box's top-left is the canvas
     point (view.x, view.y). */
  const box = canvasBox(view.zoom, AVAIL);
  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
    {/* flexShrink:0 matters: as a flex item the stage would otherwise be
        squeezed narrower than the room the viewport was fitted to, and every
        canvas coordinate in the tests would be measured against a viewport
        that is not the one the components were told about. The real class is
        used so the rig exercises the shipped stylesheet rather than a copy of
        it — designs.css is served to this page. */}
    <div ref={stage} className="dsn-stage__view"
         style={{ width: W, height: H, flex: "0 0 auto", background: "#1b1b1f" }}>
      <div className="dsn-stage__canvas" style={{ width: box.width, height: box.height }}>
        {/* Drawn a bleed larger on every side and pulled back over the box's
            edges by the stylesheet, so the handles that sit ON the artboard's
            edge are painted rather than clipped by the SVG's own viewport. */}
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
          onSelect={(id, add) => setSel((s) => (!id ? [] : add ? [...new Set([...s, id])] : [id]))}
          onMarquee={(ids) => setSel(ids)}
          onPan={(dx, dy) => setView((v) => v && { ...v, x: v.x + dx, y: v.y + dy })}
          onGeometry={(id, b) => setDoc((d) => updateLayer(d, id, b))}
          onOpen={openLayer}
          editingId={editing}
        />

        {!editing && (
          <FloatingBar
            layers={layers} sel={sel} view={view} stage={box}
            onCommand={command}
            onEditText={() => one && setEditing(one.id)}
            onPickImage={() => setPicked((n) => n + 1)}
          />
        )}

        {editing && one?.type === "text" && (
          <CanvasText
            layer={one} value={content[one.slot]} palette={palette} view={view}
            untouched={doc.content?.[one.slot] === undefined}
            onChange={(next) => setDoc((d) => ({ ...d, content: { ...d.content, [one.slot]: next } }))}
            onDone={() => { trail.current.push("done"); setEditing(null); }}
          />
        )}
      </div>
    </div>

    {/* The real properties rail, holding the real layers panel — the same
        nesting DesignsPage uses. Mounted here so the tests assert against the
        shipped components rather than copies of them: that every text control
        survived the move off the floating bar, and that the rail is beside the
        artwork rather than over it, which is the reason it was docked. */}
    <aside style={{ width: 272, flex: "0 0 auto", height: H, overflow: "auto" }}>
      <Inspector
        doc={doc}
        layers={layers}
        sel={sel}
        content={content}
        palette={palette}
        templateName={template?.name ?? "Test"}
        slideCount={1}
        onEdit={(next) => setDoc((d) => next(d))}
        onContent={(next) => one?.type === "text" && setDoc((d) => ({ ...d, content: { ...d.content, [one.slot]: next } }))}
        onSelect={(id, add) => setSel((s) => (!id ? [] : add ? [...new Set([...s, id])] : [id]))}
        onCommand={command}
        onEditText={() => one && setEditing(one.id)}
        onPickImage={() => setPicked((n) => n + 1)}
        layersSlot={
          <LayersPanel
            layers={layers}
            sel={sel}
            onSelect={(id, add) => setSel((s) => (add ? [...new Set([...s, id])] : [id]))}
            onReorder={(id, to) => { trail.current.push(`reorder ${id} -> ${to}`); setDoc((d) => reorder(d, id, to)); }}
            onToggle={(id, key) => setDoc((d) => toggle(d, id, key))}
            onRename={(id, name) => setDoc((d) => renameLayer(d, id, name))}
          />
        }
      />
    </aside>
    </div>
  );
}
createRoot(document.getElementById("r")!).render(<Rig />);
