/* The imported-design editor: click the picture to cut it, one link per part. */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { DesignLinks } from "@/pages/dashboard/ops/designs/DesignLinks";
import type { Block } from "@email";

type Img = Extract<Block, { type: "image" }>;

// A stand-in for a rasterised design: three obvious horizontal regions, so a
// cut in the wrong place is visible rather than plausible.
const SRC =
  "data:image/svg+xml;base64," +
  btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="540" height="405">
    <rect width="540" height="135" fill="#1D1D1D"/>
    <rect y="135" width="540" height="135" fill="#F0460E"/>
    <rect y="270" width="540" height="135" fill="#DFDFDF"/>
    <text x="24" y="76" fill="#fff" font-family="sans-serif" font-size="26">Headline</text>
    <text x="24" y="211" fill="#fff" font-family="sans-serif" font-size="22">A button</text>
    <text x="24" y="346" fill="#1D1D1D" font-family="sans-serif" font-size="18">Small print</text>
  </svg>`);

function Rig() {
  const [b, setB] = useState<Img>({ type: "image", src: SRC, alt: "A design", designId: "d1" } as Img);
  (window as unknown as { block: Img }).block = b;
  return (
    <div className="hrx" style={{ padding: 24, width: 460 }}>
      <DesignLinks block={b} orgId="rig" onChange={setB} />
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Rig />);
