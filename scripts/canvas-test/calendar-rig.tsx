/* The real CalendarDialog, with only the data stubbed. */
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { CalendarDialog } from "@/pages/dashboard/ops/designs/CalendarDialog";

createRoot(document.getElementById("r")!).render(
  <MemoryRouter>
    <CalendarDialog orgId="o1" open onClose={() => {}} />
  </MemoryRouter>,
);
