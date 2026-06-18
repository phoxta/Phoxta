import { NavLink, Outlet, useOutletContext } from "react-router-dom";
import type { OpsContext } from "@/layouts/OperatingLayout";

const SUBTABS = [
  { seg: "", label: "Overview", end: true },
  { seg: "operator", label: "Operator" },
  { seg: "proactive", label: "Proactive" },
  { seg: "configure", label: "Configure" },
  { seg: "knowledge", label: "Knowledge" },
  { seg: "inbox", label: "Inbox" },
  { seg: "snippets", label: "Snippets" },
  { seg: "outbound", label: "Outbound" },
  { seg: "call-center", label: "Call Center" },
  { seg: "test", label: "Test the agent" },
];

export default function AgentLayout() {
  const ctx = useOutletContext<OpsContext>();
  const base = `/dashboard/businesses/${ctx.orgId}/ops/agent`;

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h4 className="fw-600 mb-0 me-2">AI Agent</h4>
        <span className="badge bg-neutral-900 text-white fw-500">One brain · every touchpoint</span>
      </div>

      <nav className="mb-4">
        <ul className="list-unstyled m-0 d-flex flex-wrap gap-1">
          {SUBTABS.map((t) => (
            <li key={t.seg}>
              <NavLink
                to={t.seg ? `${base}/${t.seg}` : base}
                end={t.end}
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

      <Outlet context={ctx} />
    </div>
  );
}
