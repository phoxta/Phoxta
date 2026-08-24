import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { getAgentSummary, getAgentConfig, type AgentSummary } from "@/lib/db/ops/agent";
import { supabase } from "@/lib/supabaseClient";
import { Card, Chip } from "@/components/dash/Ui";
import type { OpsContext } from "@/layouts/OperatingLayout";

/**
 * hrx-kit treatment for the agent overview: metering as .hrx-stat tiles (a
 * tile that navigates or expands is interactive — hover lift + trailing
 * marker; an inert tile stays flat), drill-downs as .hrx-listrow rows.
 */
const AGX_CSS = `
.agx-tile{cursor:pointer;display:block;width:100%;height:100%;text-align:left;text-decoration:none;font:inherit;transition:border-color .15s ease,box-shadow .15s ease}
.agx-tile:hover,.agx-tile:focus-visible{border-color:var(--hrx-blue);box-shadow:0 12px 30px -18px rgba(25,92,229,.5);color:inherit;text-decoration:none}
.agx-tile.tint-dark:hover,.agx-tile.tint-dark:focus-visible{border-color:var(--hrx-ink);box-shadow:0 12px 30px -18px rgba(0,0,0,.55);color:#fff}
.agx-tile:hover .agx-mark{transform:translateX(3px)}
.agx-mark{display:inline-block;margin-left:auto;color:var(--hrx-muted);transition:transform .15s ease}
.tint-dark .agx-mark,.tint-blue .agx-mark{color:rgba(255,255,255,.65)}
.agx-sub{display:block;font-size:12px;font-weight:500;color:var(--hrx-muted);margin-top:6px}
.tint-dark .agx-sub{color:rgba(255,255,255,.6)}
.tint-blue .agx-sub{color:rgba(255,255,255,.7)}
.agx-alert{background:#fdf3d7;border:1px solid #f2dfa6;border-radius:16px;color:#a16207;padding:12px 16px;font-size:14px;display:flex;align-items:flex-start;flex-wrap:wrap;gap:8px}
.agx-link{background:none;border:0;padding:0;font-size:13px;font-weight:500;color:var(--hrx-muted);text-decoration:none;cursor:pointer}
.agx-link:hover{color:var(--hrx-ink)}
.agx-sechead{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px}
.agx-loc{display:flex;justify-content:space-between;gap:12px;font-size:14px;padding:10px 0;border-top:1px solid var(--hrx-border-soft)}
.agx-loc:first-child{border-top:0;padding-top:0}
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

/** Brand casing — the drill-down rows name the channel, not a UUID fragment. */
const CHANNEL_LABEL: Record<string, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  web: "Web",
  voice: "Voice",
  email: "Email",
};
const channelLabel = (c: string | null) => (c ? CHANNEL_LABEL[c] ?? c : "Conversation");
const shortDay = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";

type WorstConv = {
  id: string;
  qa_score: number;
  qa_verdict: string | null;
  channel_type: string | null;
  created_at: string | null;
};

/** A number that couldn't be loaded renders as an em dash, never as a confident 0. */
const num = (v: number | null | undefined) => (v == null ? "—" : String(v));

type Tile = {
  label: string;
  value: string | number;
  sub?: string;
  /** Present = the tile navigates. */
  to?: string;
  /** Present = the tile expands a panel in place. */
  qa?: boolean;
  /** Optional hrx tint. */
  tone?: "dark" | "blue";
};

/** The shared stat tile: navigating (arrow), expanding (chevron) or inert (flat). */
function StatTile({
  label,
  value,
  sub,
  to,
  tone,
  onToggle,
  expanded,
  controls,
}: Tile & { onToggle?: () => void; expanded?: boolean; controls?: string }) {
  const interactive = Boolean(to || onToggle);
  const cls = `hrx-stat${tone ? ` tint-${tone}` : ""}${interactive ? " agx-tile" : ""}`;
  const body = (
    <>
      <span className="l">
        {label}
        {to && (
          <span className="agx-mark" aria-hidden="true">
            →
          </span>
        )}
        {onToggle && (
          <span className="agx-mark" aria-hidden="true">
            {expanded ? "▴" : "▾"}
          </span>
        )}
      </span>
      <div className="v">{value}</div>
      {sub && <span className="agx-sub">{sub}</span>}
    </>
  );
  if (to)
    return (
      <Link to={to} className={cls}>
        {body}
      </Link>
    );
  if (onToggle)
    return (
      <button type="button" className={cls} aria-expanded={expanded} aria-controls={controls} onClick={onToggle}>
        {body}
      </button>
    );
  return <div className={cls}>{body}</div>;
}

export default function AgentOverviewPage() {
  const { orgId } = useOutletContext<OpsContext>();
  const [showQa, setShowQa] = useState(false);
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const { data, loading, error, reload } = useCachedData(
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
          .select("id, qa_score, qa_verdict, channel_type, created_at")
          .eq("organization_id", orgId)
          .eq("is_test", false)
          .not("qa_score", "is", null)
          .gte("created_at", since)
          .order("qa_score", { ascending: true })
          .limit(10),
        // Cost: the metering telemetry, month-to-date.
        supabase.from("ai_usage").select("cost_cents").eq("organization_id", orgId).gte("created_at", since).limit(SCAN_CAP),
      ]);
      // Nothing here throws, so a failed sub-query would otherwise render as a
      // confident 0. Collect every sub-error and let the page say so, and hand
      // back `null` for the numbers that couldn't be read.
      const errors: string[] = [];
      const note = (label: string, e: { message: string } | string | null) => {
        if (e) errors.push(`${label}: ${typeof e === "string" ? e : e.message}`);
      };
      note("Agent totals", sum.error);
      note("Agent settings", cfg.error);
      note("Conversations", convTotal.error);
      note("Open conversations", convOpen.error);
      note("Escalated conversations", convEscalated.error);
      note("Qualified leads", convQualified.error);
      note("Quality scores", qa.error);
      note("Lowest-scoring conversations", worst.error);
      note("AI usage", usage.error);

      const scores = (qa.data ?? []).map((r) => r.qa_score as number);
      const qaAvg = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
      const usageRows = usage.data ?? [];
      const costCents = usage.error ? null : usageRows.reduce((a, r) => a + (r.cost_cents || 0), 0);
      return {
        s: sum.error ? null : sum.data,
        sumFailed: Boolean(sum.error),
        config: cfg.data,
        conv: {
          total: convTotal.error ? null : convTotal.count ?? 0,
          open: convOpen.error ? null : convOpen.count ?? 0,
          escalated: convEscalated.error ? null : convEscalated.count ?? 0,
          qualified: convQualified.error ? null : convQualified.count ?? 0,
        },
        qaAvg,
        qaFailed: Boolean(qa.error),
        qaCount: scores.length,
        worst: (worst.data as WorstConv[] | null) ?? [],
        costCents,
        errors,
      };
    },
    { ttl: DASHBOARD_TTL },
  );
  const s = data?.s ?? ({} as AgentSummary);
  const config = data?.config ?? null;
  const conv = data?.conv ?? { total: null, open: null, escalated: null, qualified: null };

  // Null (not 0) whenever the summary itself failed to load.
  const n = (k: string): number | null => (!data || data.sumFailed ? null : typeof s[k] === "number" ? (s[k] as number) : 0);
  const byLocation = (s.calls_by_location as Record<string, number>) ?? {};
  const locations = n("locations") ?? 0;

  // One banner for every sub-query that failed, dismissible per distinct message.
  const problem = error ?? (data?.errors?.length ? data.errors.join(" · ") : null);
  const showProblem = Boolean(problem) && problem !== dismissedError;

  // `to` is only set where a page actually shows that number's detail:
  // conversations live in the console inbox, outbound tasks in marketing.
  const stats: Tile[] = [
    {
      label: "Conversations",
      value: num(conv.total),
      sub: `${num(conv.open)} open · ${num(conv.escalated)} escalated`,
      to: "../inbox",
      tone: "dark",
    },
    { label: "Qualified leads", value: num(conv.qualified) },
    { label: "After-hours calls captured", value: num(n("after_hours_calls")) },
    { label: "Appointments booked", value: num(n("bookings")) },
    { label: "Calls & messages completed", value: num(n("outbound_done")), sub: `${num(n("outbound_queued"))} queued`, to: "../marketing" },
    {
      label: "AI quality this month",
      value: data?.qaAvg != null ? `${data.qaAvg}/5` : "—",
      sub: data?.qaFailed
        ? "Couldn't load"
        : data?.qaCount
          ? `${data.qaCount} graded · see the lowest`
          : "Scored automatically through the day",
      qa: true,
      tone: "blue",
    },
    {
      // The provider bill is settled in US dollars, so this one figure is USD
      // even when the business trades in another currency — hence the label.
      label: "AI spend this month (USD)",
      value: data?.costCents == null ? "—" : `$${(data.costCents / 100).toFixed(2)}`,
      sub: "Across everything the AI did",
    },
    ...(locations > 1 ? [{ label: "Locations", value: locations }] : []),
  ];

  if (loading) {
    return (
      <div className="hrx-card hrx-pad text-center" style={{ color: "var(--hrx-muted)" }} role="status">
        Loading…
      </div>
    );
  }

  return (
    <div>
      <style>{AGX_CSS}</style>

      {showProblem && (
        <div className="agx-alert mb-4" role="alert">
          <span className="me-auto">
            Some numbers couldn't be loaded, so they show as a dash instead of a zero. {problem}
          </span>
          <button type="button" className="hrx-seeall ops-tap" onClick={() => void reload()}>
            Retry
          </button>
          <button type="button" className="agx-link ops-tap" onClick={() => setDismissedError(problem)}>
            Dismiss
          </button>
        </div>
      )}

      <section className="mb-4" aria-labelledby="agent-activity-h">
        <div className="agx-sechead">
          <h2 id="agent-activity-h" className="hrx-card-title">
            Agent activity
          </h2>
          <Link to="operator" className="hrx-seeall ms-auto">
            Approvals &amp; actions →
          </Link>
        </div>
        <div className="hrx-statrow">
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
          <div id="agent-qa-panel" className="mt-3">
            <Card title="Lowest-scoring conversations this month">
              {(data?.worst ?? []).length === 0 ? (
                <p className="m-0" style={{ fontSize: 14, color: "var(--hrx-muted)" }}>No graded conversations yet this month.</p>
              ) : (
                <div>
                  {(data?.worst ?? []).map((w) => (
                    <Link key={w.id} to="../inbox" className="hrx-listrow ops-tap">
                      <div className="main">
                        <p className="t">
                          {channelLabel(w.channel_type)}
                          {shortDay(w.created_at) && <span style={{ color: "var(--hrx-muted)", fontWeight: 400 }}> · {shortDay(w.created_at)}</span>}
                        </p>
                        {w.qa_verdict && <p className="s">{w.qa_verdict}</p>}
                      </div>
                      <Chip tone={w.qa_score <= 2 ? "danger" : "line"}>{w.qa_score}/5</Chip>
                      <span className="agx-mark" aria-hidden="true" style={{ fontSize: 13 }}>
                        Open inbox →
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </section>

      <div className="row g-3">
        <div className="col-lg-7">
          <Card title="What the agent handles" className="h-100">
            <p className="mb-3" style={{ fontSize: 13, color: "var(--hrx-muted)" }}>Change these in Configure.</p>
            <div className="d-flex flex-wrap gap-2">
              {REAL_CAPABILITIES.map((c) => {
                const on = config?.capabilities?.[c.key] !== false;
                return (
                  <Chip key={c.key} tone={on ? "ok" : "plain"}>
                    <span aria-hidden="true">{on ? "● " : "○ "}</span>
                    {c.label}
                    {/* State is spoken, not carried by colour alone. */}
                    <span className="visually-hidden">{on ? " — on" : " — off"}</span>
                  </Chip>
                );
              })}
            </div>
          </Card>
        </div>
        <div className="col-lg-5">
          <Card title="Calls by location" className="h-100">
            {Object.keys(byLocation).length === 0 ? (
              <p className="m-0" style={{ fontSize: 14, color: "var(--hrx-muted)" }}>No calls logged yet.</p>
            ) : (
              <ul className="list-unstyled m-0">
                {Object.entries(byLocation).map(([name, count]) => (
                  <li key={name} className="agx-loc">
                    <span>{name}</span>
                    <span style={{ fontWeight: 600 }}>{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
