import { useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { getAgentSummary, getAgentConfig, CAPABILITY_LABELS, type AgentSummary } from "@/lib/db/ops/agent";
import type { OpsContext } from "@/layouts/OperatingLayout";

export default function AgentOverviewPage() {
  const { orgId } = useOutletContext<OpsContext>();
  const { data, loading } = useCachedData(
    `agent:overview:${orgId}`,
    async () => {
      const [sum, cfg] = await Promise.all([getAgentSummary(orgId), getAgentConfig(orgId)]);
      return { s: sum.data, config: cfg.data };
    },
    { ttl: DASHBOARD_TTL },
  );
  const s = data?.s ?? ({} as AgentSummary);
  const config = data?.config ?? null;

  const n = (k: string) => (typeof s[k] === "number" ? (s[k] as number) : 0);
  const byLocation = (s.calls_by_location as Record<string, number>) ?? {};

  const stats = [
    { label: "Conversations", value: n("conversations"), sub: `${n("open")} open · ${n("escalated")} escalated` },
    { label: "Qualified leads", value: n("qualified_leads") },
    { label: "After-hours calls captured", value: n("after_hours_calls") },
    { label: "Appointments booked", value: n("bookings") },
    { label: "Outbound done", value: n("outbound_done"), sub: `${n("outbound_queued")} queued` },
    { label: "Locations", value: n("locations") },
  ];

  if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;

  return (
    <div>
      <div className="row g-3 mb-4">
        {stats.map((st) => (
          <div key={st.label} className="col-xl-2 col-md-4 col-sm-6">
            <div className="bg-neutral-0 rounded-4 p-4 h-100 border-100">
              <div className="fz-font-sm neutral-500 mb-2">{st.label}</div>
              <div className="fz-32 fw-700 lh-1 neutral-900">{st.value}</div>
              {st.sub && <div className="fz-font-sm neutral-500 mt-1">{st.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="bg-neutral-0 rounded-4 p-4 border-100 h-100">
            <h6 className="fw-600 mb-3">Active capabilities</h6>
            <div className="d-flex flex-wrap gap-2">
              {CAPABILITY_LABELS.map((c) => {
                const on = config?.capabilities?.[c.key] !== false;
                return (
                  <span key={c.key} className={`badge fw-500 ${on ? "bg-success-subtle text-success" : "bg-neutral-100 neutral-500"}`}>
                    {on ? "● " : "○ "}{c.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="bg-neutral-0 rounded-4 p-4 border-100 h-100">
            <h6 className="fw-600 mb-3">Calls by location</h6>
            {Object.keys(byLocation).length === 0 ? (
              <p className="neutral-500 fz-font-md mb-0">No calls logged yet.</p>
            ) : (
              <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                {Object.entries(byLocation).map(([name, count]) => (
                  <li key={name} className="d-flex justify-content-between fz-font-md">
                    <span className="neutral-700">{name}</span>
                    <span className="fw-600">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
