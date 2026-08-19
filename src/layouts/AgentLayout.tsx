import { Suspense } from "react";
import { NavLink, Outlet, useOutletContext } from "react-router-dom";
import { OpsSubNav } from "@/layouts/OpsSubNav";
import type { OpsContext } from "@/layouts/OperatingLayout";
import { preloadAgentTab } from "@/pages/dashboard/preload";

const SUBTABS = [
  { seg: "", label: "Overview", end: true },
  { seg: "operator", label: "Operator" },
  { seg: "configure", label: "Train" },
];

export default function AgentLayout() {
  const ctx = useOutletContext<OpsContext>();
  const base = `/dashboard/businesses/${ctx.orgId}/ops/agent`;

  return (
    <div>
      {/* Rendered into the console header's pinned block (see OpsSubNav), so the
          Operator/Inbox/Configure tabs stay reachable while content scrolls. */}
      <OpsSubNav>
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <h4 className="fw-600 mb-0 me-2">AI Agent</h4>
        </div>

        <nav className="mb-0">
          <ul className="list-unstyled m-0 d-flex flex-wrap gap-1">
            {SUBTABS.map((t) => (
              <li key={t.seg}>
                <NavLink
                  to={t.seg ? `${base}/${t.seg}` : base}
                  end={t.end}
                  onMouseEnter={() => preloadAgentTab(t.seg)}
                  className={({ isActive }) =>
                    `d-inline-block px-3 py-2 fz-font-md rounded-3 text-decoration-none ${isActive ? "bg-neutral-900 text-white fw-600" : "bg-neutral-0 neutral-500 border-100"}`
                  }
                >
                  {t.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </OpsSubNav>

      <Suspense fallback={<div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>}>
        <Outlet context={ctx} />
      </Suspense>
    </div>
  );
}
