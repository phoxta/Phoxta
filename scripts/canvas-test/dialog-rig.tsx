/* The REAL ScheduleDialog, with only the network stubbed.
   The thing under test is whether the dialog fits the window once the
   Instagram panel is open, which is a question about the actual component and
   the actual stylesheet — a replica of the markup would answer it about the
   replica. */
import { createRoot } from "react-dom/client";
import { materialise } from "@/lib/designs/edit";
import { emptyDoc } from "@/lib/designs/types";
import type { Design } from "@/lib/db/designs";
import { ScheduleDialog } from "@/pages/dashboard/ops/designs/ScheduleDialog";

const design = {
  id: "d1",
  organization_id: "o1",
  title: "Autumn drop",
  template_id: "v1",
  doc: materialise(emptyDoc("v1")),
  status: "ready",
  brief: null,
  png_url: null,
  png_path: null,
  created_at: "",
  updated_at: "",
} as unknown as Design;

createRoot(document.getElementById("r")!).render(
  <ScheduleDialog orgId="o1" design={design} onClose={() => {}} />,
);
