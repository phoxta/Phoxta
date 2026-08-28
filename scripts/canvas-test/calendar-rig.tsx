/* The real CalendarPage, with only the data stubbed. */
import { createRoot } from "react-dom/client";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import CalendarPage from "@/pages/dashboard/ops/CalendarPage";

const Shell = () => <Outlet context={{ orgId: "o1", org: { id: "o1", name: "Aurelia" }, console: {} }} />;

createRoot(document.getElementById("r")!).render(
  <MemoryRouter initialEntries={["/ops/calendar"]}>
    <Routes>
      <Route path="/ops" element={<Shell />}>
        <Route path="calendar" element={<CalendarPage />} />
      </Route>
    </Routes>
  </MemoryRouter>,
);
