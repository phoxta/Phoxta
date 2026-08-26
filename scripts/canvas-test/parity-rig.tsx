/* The same saved design, rendered every way the app renders it.
 *
 *   TILE   — the library grid:  <DesignSvg doc={row.doc} width={W} />
 *   CANVAS — the editor stage:  the emptyDoc spread, plus a viewport
 *   EXPORT — what exportPng serialises and rasterises
 *
 * These are three call sites of one renderer, which is the whole reason the
 * renderer is one. The point of this rig is to keep it that way: the document
 * goes through JSON.parse(JSON.stringify(...)) first, because that is what a
 * trip through Postgres jsonb does to it, and then the three are compared. */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { DesignSvg } from "@/lib/designs/render";
import { materialise, updateLayer, duplicateLayer, addText } from "@/lib/designs/edit";
import { emptyDoc, type DesignDoc, type TextLayer } from "@/lib/designs/types";
import { fitTo, zoomAt } from "@/lib/designs/snap";
import { exportPng } from "@/lib/designs/export";

const W = 520;
const H = (W * 1350) / 1080;

/** A design someone has actually worked on: moved, turned, faded, recoloured,
 *  retyped with runs, with a layer added and another duplicated. */
function saved(): DesignDoc {
  let d = materialise(emptyDoc("v2"));
  const layers = d.layers!;
  const t = layers.find((l) => l.type === "text") as TextLayer;
  d = updateLayer(d, t.id, { x: t.x + 40, y: t.y + 26, rotation: 8, alpha: 0.85 });
  const rect = layers.find((l) => l.type === "rect" && !l.locked)!;
  d = updateLayer(d, rect.id, { fill: "accent", radius: 40 });
  d = duplicateLayer(d, rect.id).doc;
  d = addText(d).doc;
  // A backdrop that is not opaque is the case that used to disagree: the
  // editor composited it over white, the tile over the page behind it.
  const back = layers.find((l) => l.locked);
  if (back) d = updateLayer(d, back.id, { alpha: 0.4 });
  d = {
    ...d,
    content: {
      ...d.content,
      [t.slot]: [
        { text: "Preview " },
        { text: "parity", bold: true, fill: "accent" },
        { text: " check" },
      ],
    },
    palette: { accent: "#e0432f", ink: "#101820" },
  };
  return JSON.parse(JSON.stringify(d));
}

/** A design with one layer dragged clean off the page. */
function spill(): DesignDoc {
  const d = materialise(emptyDoc("v2"));
  const l = d.layers!.find((x) => x.type === "rect" && !x.locked)!;
  return updateLayer(d, l.id, { x: -260, y: 40, w: 220, h: 220 });
}

function App() {
  const [row] = useState(saved);
  const [spilled] = useState(spill);
  // The editor's construction, verbatim.
  const editorDoc: DesignDoc = { ...emptyDoc("v2"), ...row };
  const view = fitTo(W, H, 0);
  // A second canvas, deliberately zoomed in and panned off-centre. The export
  // is taken from this one: it must ignore where the editor is looking.
  const zoomed = zoomAt(view, 2.4, 300, 900);
  const w = window as unknown as {
    doc: DesignDoc;
    exportView: () => Promise<{ w: number; h: number; url: string }>;
  };
  w.doc = editorDoc;
  w.exportView = async () => {
    const svg = document.querySelector("#zoomed svg") as SVGSVGElement;
    const { blob, width, height } = await exportPng(svg, editorDoc, 1);
    return { w: width, h: height, url: URL.createObjectURL(blob) };
  };
  return (
    <div style={{ display: "flex", background: "#7a7a7a" }}>
      <div id="tile" style={{ width: W, height: H, overflow: "hidden" }}>
        <DesignSvg doc={row} width={W} />
      </div>
      <div id="canvas" style={{ width: W, height: H, overflow: "hidden" }}>
        <DesignSvg doc={editorDoc} width={W} height={H} viewport={view} />
      </div>
      <div id="zoomed" style={{ width: W, height: H, overflow: "hidden" }}>
        <DesignSvg doc={editorDoc} width={W} height={H} viewport={zoomed} />
      </div>

      {/* Two designs from the SAME template, in different brand colours, on
          one page — the library grid's ordinary case. Their gradients, masks
          and clip paths are referenced by id, and an id is global to the
          document. */}
      <div id="twinA" style={{ width: 200 }}>
        <DesignSvg doc={{ ...emptyDoc("v6"), palette: { accent: "#e0432f", gradientFrom: "#e0432f", gradientTo: "#7a1d10" } }} width={200} />
      </div>
      <div id="twinB" style={{ width: 200 }}>
        <DesignSvg doc={{ ...emptyDoc("v6"), palette: { accent: "#12a150", gradientFrom: "#12a150", gradientTo: "#04431f" } }} width={200} />
      </div>

      {/* A layer dragged well outside the page. Nothing should paint there. */}
      <div id="spill" style={{ width: 200 }}>
        <DesignSvg doc={spilled} width={200} />
      </div>
    </div>
  );
}
createRoot(document.getElementById("r")!).render(<App />);
