import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { getAgentSummary, getAgentConfig, type AgentSummary } from "@/lib/db/ops/agent";
import { supabase } from "@/lib/supabaseClient";
import type { OpsContext } from "@/layouts/OperatingLayout";

/** The four capability toggles that actually exist on the agent config. */
const REAL_CAPABILITIES: { key: string; label: string }[] = [
  { key: "after_hours", label: "After-hours answering" },
  { key: "leads", label: "Lead capture" },
  { key: "bookings", label: "Bookings" },
  { key: "tickets", label: "Support tickets" },
];

/** Row caps for the month-to-date QA / cost scans. */
const SCAN_CAP = 2000;

type WorstConv = { id: string; qa_score: number; qa_verdict: string | null };

export default function AgentOverviewPage() {
  const { orgId } = useOutletContext<OpsContext>();
  const [showQa, setShowQa] = useState(false);
  const { data, loading } = useCachedData(
    `agent:overview:v2:${orgId}`,
    async () => {
      // Both quality and cost are month-to-date so the two tiles describe the
      // same window.
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const since = monthStart.toISOString();
      // Sandbox conversations (is_test) are excluded from every stat.
      const convBase = () =>
        supabase.from("conversations").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("is_test", false);
      const [sum, cfg, convTotal, convOpen, convEscalated, convQualified, qa, worst, usage] = await Promise.all([
        getAgentSummary(orgId),
        getAgentConfig(orgId),
        convBase(),
        convBase().eq("status", "open"),
        convBase().eq("status", "escalated"),
        convBase().eq("qualified", true),
        // Quality: LLM-judge scores written by the qa-scorer cron, month-to-date.
        supabase
          .from("conversations")
          .select("qa_score")
          .eq("organization_id", orgId)
          .eq("is_test", false)
          .not("qa_score", "is", null)
          .gte("created_at", since)
          .limit(SCAN_CAP),
        // The 10 lowest-scoring conversations this month (QA tile drill-down).
        supabase
          .from("conversations")
          .select("id, qa_score, qa_verdict")
          .eq("organization_id", orgId)
          .eq("is_test", false)
          .not("qa_score", "is", null)
          .gte("created_at", since)
          .order("qa_score", { ascending: true })
          .limit(10),
        // Cost: the metering telemetry, month-to-date.
        supabase.from("ai_usage").select("cost_cents").eq("organization_id", orgId).gte("created_at", since).limit(SCAN_CAP),
      ]);
      const scores = (qa.data ?? []).map((r) => r.qa_score as number);
      const qaAvg = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
      const usageRows = usage.data ?? [];
      const costCents = usageRows.reduce((a, r) => a + (r.cost_cents || 0), 0);
      return {
        s: sum.data,
        config: cfg.data,
        conv: {
          total: convTotal.count ?? 0,
          open: convOpen.count ?? 0,
          escalated: convEscalated.count ?? 0,
          qualified: convQualified.count ?? 0,
        },
        qaAvg,
        qaCount: scores.length,
        qaCapped: scores.length >= SCAN_CAP,
        worst: (worst.data as WorstConv[] | null) ?? [],
        costCents,
        costCapped: usageRows.length >= SCAN_CAP,
      };
    },
    { ttl: DASHBOARD_TTL },
  );
  const s = data?.s ?? ({} as AgentSummary);
  const config = data?.config ?? null;
  const conv = data?.conv ?? { total: 0, open: 0, escalated: 0, qualified: 0 };

  const n = (k: string) => (typeof s[k] === "number" ? (s[k] as number) : 0);
  const byLocation = (s.calls_by_location as Record<string, number>) ?? {};
  const locations = n("locations");

  const stats: { label: string; value: string | number; sub?: string; qa?: boolean }[] = [
    { label: "Conversations", value: conv.total, sub: `${conv.open} open · ${conv.escalated} escalated` },
    { label: "Qualified leads", value: conv.qualified },
    { label: "After-hours calls captured", value: n("after_hours_calls") },
    { label: "Appointments booked", value: n("bookings") },
    { label: "Outbound done", value: n("outbound_done"), sub: `${n("outbound_queued")} queued` },
    {
      label: "AI quality (mo.)",
      value: data?.qaAvg != null ? `${data.qaAvg}/5` : "—",
      sub: data?.qaCount
        ? `${data.qaCapped ? `first ${SCAN_CAP}` : data.qaCount} graded · click for lowest`
        : "grading runs every 2h",
      qa: true,
    },
    {
      label: "AI cost (mo.)",
      value: `$${((data?.costCents ?? 0) / 100).toFixed(2)}`,
      sub: data?.costCapped ? `first ${SCAN_CAP} usage rows` : "all agent features",
    },
    ...(locations > 1 ? [{ label: "Locations", value: locations }] : []),
  ];

  if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;

  return (
    <div>
      <div className="row g-3 mb-4">
        {stats.map((st) => {
          const inner = (
            <div className="bg-neutral-0 rounded-4 p-4 h-100 border-100">
              <div className="fz-font-sm neutral-500 mb-2">{st.label}</div>
              <div className="fz-32 fw-700 lh-1 neutral-900">{st.value}</div>
              {st.sub && <div className="fz-font-sm neutral-500 mt-1">{st.sub}</div>}
            </div>
          );
          return (
            <div key={st.label} className="col-xl-2 col-md-4 col-sm-6">
              {st.qa ? (
                <button
                  type="button"
                  className="d-block w-100 h-100 p-0 border-0 bg-transparent text-start"
                  aria-expanded={showQa}
                  onClick={() => setShowQa((v) => !v)}
                >
                  {inner}
                </button>
              ) : (
                inner
              )}
            </div>
          );
        })}
      </div>

      {showQa && (
        <div className="bg-neutral-0 rounded-4 p-4 border-100 mb-4">
          <h6 className="fw-600 mb-3">Lowest-scoring conversations this month</h6>
          {(data?.worst ?? []).length === 0 ? (
            <p className="neutral-500 fz-font-md mb-0">No graded conversations yet this month.</p>
          ) : (
            <ul className="list-unstyled m-0 d-flex flex-column gap-2">
              {(data?.worst ?? []).map((w) => (
                <li key={w.id} className="d-flex align-items-center gap-3 fz-font-md">
                  <Link to="../inbox" className="fw-600 text-decoration-none">#{w.id.slice(0, 8)}</Link>
                  <span className={w.qa_score <= 2 ? "text-danger fw-600" : "neutral-700"}>{w.qa_score}/5</span>
                  {w.qa_verdict && <span className="neutral-500 fz-font-sm">{w.qa_verdict}</span>}
                  <Link to="../inbox" className="ms-auto fz-font-sm text-decoration-none">Open inbox →</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="bg-neutral-0 rounded-4 p-4 border-100 h-100">
            <h6 className="fw-600 mb-3">Active capabilities</h6>
            <div className="d-flex flex-wrap gap-2">
              {REAL_CAPABILITIES.map((c) => {
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
