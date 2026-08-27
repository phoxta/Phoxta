/* The email tab's two start buttons and the Templates dialog. */
import { createRoot } from "react-dom/client";
import { EmailIndex } from "@/pages/dashboard/ops/designs/EmailIndex";
import { MemoryRouter } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
  <MemoryRouter>
    <div className="hrx" style={{ padding: 24, minHeight: "100vh" }}>
      <EmailIndex orgId="rig" />
    </div>
  </MemoryRouter>,
);
