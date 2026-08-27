/* The editing surface: the real canvas, the real floating properties bar and
   the real on-canvas text editor, wired the way DesignsPage wires them. State
   is pushed onto window so a test can assert on the document rather than on
   pixels. */
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { DesignSvg } from "@/lib/designs/render";
import { materialise, updateLayer, removeMany, duplicateLayer, toggle, bringToFront, sendToBack, reorder, renameLayer } from "@/lib/designs/edit";
import { layersOf, getTemplate } from "@/lib/designs/templates";
import { emptyDoc, resolvePalette, type DesignDoc, type Layer } from "@/lib/designs/types";
import { plain } from "@/lib/designs/rich";
import { fitTo, type Viewport } from "@/lib/designs/snap";
import { FloatingBar } from "@/pages/dashboard/ops/designs/FloatingBar";
import { CanvasText } from "@/pages/dashboard/ops/designs/CanvasText";
import { LayersPanel } from "@/pages/dashboard/ops/designs/LayersPanel";
import { Inspector } from "@/pages/dashboard/ops/designs/Inspector";

declare global {
  interface Window { rig: Record<string, unknown> }
}

const W = 900, H = 640;

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

  useEffect(() => { setView(fitTo(W, H)); }, []);

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

  const patch = useCallback((p: Partial<Layer>) => {
    setDoc((d) => (one ? updateLayer(d, one.id, p) : d));
  }, [one]);

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
  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
    {/* flexShrink:0 matters: as a flex item the stage would otherwise be
        squeezed narrower than the width handed to DesignSvg, the SVG's
        max-width:100% would scale it down, and every canvas coordinate in the
        tests would be measured against a viewport that is not the one the
        component was told about. */}
    <div ref={stage} style={{ width: W, height: H, flex: "0 0 auto", position: "relative", overflow: "hidden", background: "#1b1b1f" }}>
      <DesignSvg
        doc={doc} width={W} height={H} viewport={view}
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
          layers={layers} sel={sel} content={content} palette={palette} view={view}
          stage={{ width: W, height: H }} editing={false}
          onPatch={patch}
          onContent={(next) => one?.type === "text" && setDoc((d) => ({ ...d, content: { ...d.content, [one.slot]: next } }))}
          onCommand={command}
          onEditText={() => one && setEditing(one.id)}
          onPickImage={() => setPicked((n) => n + 1)}
        />
      )}

      {editing && one?.type === "text" && (
        <CanvasText
          layer={one} value={content[one.slot]} palette={palette} view={view}
          onChange={(next) => setDoc((d) => ({ ...d, content: { ...d.content, [one.slot]: next } }))}
          onDone={() => { trail.current.push("done"); setEditing(null); }}
        />
      )}
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
