/* The two ways to start a graphic, and the dialog behind Create New. */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { NewDesign } from "@/pages/dashboard/ops/designs/NewDesign";

function Rig() {
  const [n, setN] = useState(0);
  return (
    <div className="hrx" style={{ padding: 24, minHeight: "100vh" }}>
      <NewDesign key={n} orgId="rig" onMade={() => setN((x) => x + 1)} />
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Rig />);
