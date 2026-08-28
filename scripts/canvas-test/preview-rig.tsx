/* The real DesignPreview from the operator chat, with only the fetch stubbed. */
import { createRoot } from "react-dom/client";
import { DesignPreview } from "@/pages/dashboard/ops/OperatorChat";

createRoot(document.getElementById("r")!).render(
  <div style={{ padding: 16, maxWidth: 520 }}>
    <p style={{ fontSize: 13.5, marginBottom: 8 }}>Here is the autumn post — it goes out on Tuesday.</p>
    <DesignPreview id="d1" title="Autumn drop" />
  </div>,
);
