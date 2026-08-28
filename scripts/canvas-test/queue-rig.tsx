/* The real SocialQueue, with only the network stubbed. */
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { SocialQueue } from "@/pages/dashboard/ops/designs/SocialQueue";

createRoot(document.getElementById("r")!).render(
  <MemoryRouter><SocialQueue orgId="o1" /></MemoryRouter>,
);
