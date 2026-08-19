import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { getAgentSummary, getAgentConfig, type AgentSummary } from "@/lib/db/ops/agent";
import { supabase } from "@/lib/supabaseClient";
import type { OpsContext } from "@/layouts/OperatingLayout";

/**
 * One stat-tile treatment for the whole console — identical to the copy in
 * ops/OverviewPage.tsx so both pages read as the same product:
 * - a tile that navigates or expands gets the white card, a trailing marker and a hover lift
 * - a tile that only reports a number is recessed (bg-neutral-50) with no marker
 * - numerals shrink one step on phones so nothing overflows a two-up grid at 390px.
 */
const TILE_CSS = `
.ops-tile{transition:border-color .15s ease,box-shadow .15s ease}
.ops-tile-value,.ops-attn-value{overflow-wrap:anywhere}
@media (max-width:575.98px){.ops-tile-value{font-size:24px}.ops-attn-value{font-size:32px}}
.ops-tile-link{display:block;width:100%;height:100%;padding:0;border:0;background:transparent;text-align:left;text-decoration:none}
.ops-tile-link:hover .ops-tile,.ops-tile-link:focus-visible .ops-tile{border-color:var(--at-neutral-300)!important;box-shadow:0 6px 20px rgba(0,0,0,.07)}
.ops-tile-link:hover .ops-tile-arrow{transform:translateX(3px)}
.ops-tile-arrow{display:inline-block;transition:transform .15s ease}
.ops-attn-card{box-shadow:0 2px 10px rgba(0,0,0,.05)}
`;

/** Row affordance for the QA drill-down list (whole row is one link). */
const ROW_CSS = `
.ops-row-link{display:flex;text-decoration:none;transition:background-color .15s ease}
.ops-row-link:hover,.ops-row-link:focus-visible{background-color:var(--at-neutral-100)!important}
.ops-row-link:hover .ops-tile-arrow{transform:translateX(3px)}
`;

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

type Tile = {
  label: string;
  value: string | number;
  sub?: string;
  /** Present = the tile navigates. */
  to?: string;
  /** Present = the tile expands a panel in place. */
  qa?: boolean;
};

/** The shared stat tile: navigating (arrow), expanding (chevron) or inert (flat). */
function StatTile({
  label,
  value,
  sub,
  to,
  onToggle,
  expanded,
  controls,
}: Tile & { onToggle?: () => void; expanded?: boolean; controls?: string }) {
  const interactive = Boolean(to || onToggle);
  const body = (
    <div className={`ops-tile rounded-4 p-3 p-md-4 h-100 border-100 ${interactive ? "bg-neutral-0" : "bg-neutral-50"}`}>
      <div className="d-flex align-items-start gap-2 mb-2">
        <span className="fz-font-sm neutral-500">{label}</span>
        {to && (
          <span className="ms-auto neutral-400 ops-tile-arrow" aria-hidden="true">
            →
          </span>
        )}
        {onToggle && (
          <span className="ms-auto neutral-400" aria-hidden="true">
            {expanded ? "▴" : "▾"}
          </span>
        )}
      </div>
      <div className="fz-32 ops-tile-value fw-700 lh-1 neutral-900">{value}</div>
      {sub && <div className="fz-font-sm neutral-400 mt-1">{sub}</div>}
    </div>
  );
  return (
    <div className="col-6 col-md-4 col-xl-3">
      {to ? (
        <Link to={to} className="ops-tile-link text-decoration-none">
          {body}
        </Link>
      ) : onToggle ? (
        <button type="button" className="ops-tile-link" aria-expanded={expanded} aria-controls={controls} onClick={onToggle}>
          {body}
        </button>
      ) : (
        body
      )}
    </div>
  );
}

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

  // `to` is only set where a page actually shows that number's detail:
  // conversations live in the console inbox, outbound tasks in marketing.
  const stats: Tile[] = [
    { label: "Conversations", value: conv.total, sub: `${conv.open} open · ${conv.escalated} escalated`, to: "../inbox" },
    { label: "Qualified leads", value: conv.qualified },
    { label: "After-hours calls captured", value: n("after_hours_calls") },
    { label: "Appointments booked", value: n("bookings") },
    { label: "Outbound done", value: n("outbound_done"), sub: `${n("outbound_queued")} queued`, to: "../marketing" },
    {
      label: "AI quality (mo.)",
      value: data?.qaAvg != null ? `${data.qaAvg}/5` : "—",
      sub: data?.qaCount
        ? `${data.qaCapped ? `first ${SCAN_CAP}` : data.qaCount} graded · see the lowest`
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

  if (loading) {
    return (
      <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500" role="status">
        Loading…
      </div>
    );
  }

  return (
    <div>
      <style>{TILE_CSS + ROW_CSS}</style>

      <section className="mb-5" aria-labelledby="agent-activity-h">
        <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
          <h2 id="agent-activity-h" className="fz-font-lg fw-600 neutral-900 m-0">
            Agent activity
          </h2>
          <Link to="operator" className="btn btn-link neutral-500 text-decoration-none fz-font-sm ops-tap ms-auto p-0">
            Approvals &amp; actions →
          </Link>
        </div>
        <div className="row g-3">
          {stats.map((st) =>
            st.qa ? (
              <StatTile
                key={st.label}
                {...st}
                expanded={showQa}
                controls="agent-qa-panel"
                onToggle={() => setShowQa((v) => !v)}
              />
            ) : (
              <StatTile key={st.label} {...st} />
            ),
          )}
        </div>

        {showQa && (
          <div id="agent-qa-panel" className="bg-neutral-0 rounded-4 p-3 p-md-4 border-100 mt-3">
            <h3 className="fz-font-md fw-600 neutral-900 mb-3">Lowest-scoring conversations this month</h3>
            {(data?.worst ?? []).length === 0 ? (
              <p className="neutral-500 fz-font-md mb-0">No graded conversations yet this month.</p>
            ) : (
              <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                {(data?.worst ?? []).map((w) => (
                  <li key={w.id}>
                    <Link
                      to="../inbox"
                      className="ops-row-link text-decoration-none ops-tap d-flex align-items-center flex-wrap gap-2 gap-md-3 p-2 rounded-3 bg-neutral-50"
                    >
                      <span className="fw-600 fz-font-md neutral-900">#{w.id.slice(0, 8)}</span>
                      <span
                        className={`badge fw-500 ${w.qa_score <= 2 ? "bg-danger-subtle text-danger" : "bg-neutral-100 neutral-700"}`}
                      >
                        {w.qa_score}/5
                      </span>
                      {w.qa_verdict && <span className="neutral-500 fz-font-sm">{w.qa_verdict}</span>}
                      <span className="ms-auto fz-font-sm neutral-400 ops-tile-arrow">Open inbox →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="bg-neutral-0 rounded-4 p-3 p-md-4 border-100 h-100">
            <h2 className="fz-font-lg fw-600 neutral-900 mb-1">What the agent handles</h2>
            <p className="fz-font-sm neutral-500 mb-3">Change these in Configure.</p>
            <div className="d-flex flex-wrap gap-2">
              {REAL_CAPABILITIES.map((c) => {
                const on = config?.capabilities?.[c.key] !== false;
                return (
                  <span key={c.key} className={`badge fw-500 ${on ? "bg-success-subtle text-success" : "bg-neutral-100 neutral-500"}`}>
                    <span aria-hidden="true">{on ? "● " : "○ "}</span>
                    {c.label}
                    {/* State is spoken, not carried by colour alone. */}
                    <span className="visually-hidden">{on ? " — on" : " — off"}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="bg-neutral-0 rounded-4 p-3 p-md-4 border-100 h-100">
            <h2 className="fz-font-lg fw-600 neutral-900 mb-3">Calls by location</h2>
            {Object.keys(byLocation).length === 0 ? (
              <p className="neutral-500 fz-font-md mb-0">No calls logged yet.</p>
            ) : (
              <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                {Object.entries(byLocation).map(([name, count]) => (
                  <li key={name} className="d-flex justify-content-between gap-3 fz-font-md">
                    <span className="neutral-700">{name}</span>
                    <span className="fw-600 neutral-900">{count}</span>
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
