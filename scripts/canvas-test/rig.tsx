/* A canvas harness: the real DesignSvg with the real gesture surface, and the
   resulting state pushed onto window so a test can assert on state rather than
   on pixels. */
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { DesignSvg } from "@/lib/designs/render";
import { materialise, moveMany, scaleMany, updateLayer } from "@/lib/designs/edit";
import { layersOf } from "@/lib/designs/templates";
import { emptyDoc, type DesignDoc } from "@/lib/designs/types";
import { fitTo, type Viewport } from "@/lib/designs/snap";

declare global {
  interface Window { rig: Record<string, unknown> }
}

type Box = { x: number; y: number; w: number; h: number };

function Rig() {
  const [doc, setDoc] = useState<DesignDoc>(() => materialise(emptyDoc("v2")));
  const [sel, setSel] = useState<string[]>([]);
  const [view, setView] = useState<Viewport | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const dragBase = useRef<Record<string, { x: number; y: number }> | null>(null);
  const scaleBase = useRef<DesignDoc | null>(null);

  useEffect(() => {
    const r = stage.current!.getBoundingClientRect();
    setView(fitTo(r.width, r.height));
  }, []);

  useEffect(() => {
    window.rig = {
      sel, view,
      layers: layersOf(doc).map((l) => ({
        id: l.id, x: l.x, y: l.y, w: l.w, h: l.h,
        locked: !!l.locked, type: l.type, rotation: l.rotation ?? 0,
        size: l.type === "text" ? l.size : undefined,
      })),
    };
  });

  const onGeometry = useCallback((id: string, b: Box & { rotation?: number }, commit: boolean) => {
    setDoc((d) => {
      const multi = b.rotation === undefined && sel.length > 1 && sel.includes(id);
      if (!dragBase.current) {
        dragBase.current = Object.fromEntries(
          layersOf(d).filter((l) => sel.includes(l.id)).map((l) => [l.id, { x: l.x, y: l.y }]),
        );
      }
      if (multi) {
        const base = dragBase.current[id];
        return base ? moveMany(d, sel, dragBase.current, b.x - base.x, b.y - base.y) : d;
      }
      return updateLayer(d, id, b);
    });
    if (commit) dragBase.current = null;
  }, [sel]);

  const onTransform = useCallback((from: Box, to: Box, commit: boolean) => {
    setDoc((d) => {
      if (!scaleBase.current) scaleBase.current = d;
      return scaleMany(scaleBase.current, sel, from, to);
    });
    if (commit) scaleBase.current = null;
  }, [sel]);

  if (!view) return <div ref={stage} style={{ width: 900, height: 640 }} />;
  return (
    <div ref={stage} style={{ width: 900, height: 640, background: "#1b1b1f" }}>
      <DesignSvg
        doc={doc} width={900} height={640} viewport={view}
        selectedIds={sel}
        onSelect={(id, add) => setSel((s) => (!id ? [] : add ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : [id]))}
        onMarquee={(ids, add) => setSel((s) => (add ? [...new Set([...s, ...ids])] : ids))}
        onPan={(dx, dy) => setView((v) => v && { ...v, x: v.x + dx, y: v.y + dy })}
        onGeometry={onGeometry}
        onTransform={onTransform}
      />
    </div>
  );
}
createRoot(document.getElementById("r")!).render(<Rig />);
