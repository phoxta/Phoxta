import { useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useCachedData } from "@/lib/hooks/useCachedData";
import {
  profileQuery, organizationsQuery, aiUsageMonthQuery,
  revenue30Query, revenue7DailyQuery, invitationsQuery,
} from "@/lib/cache/dashboardQueries";
import { type UserProfile } from "@/lib/db/profile";
import OperatorChat from "@/pages/dashboard/ops/OperatorChat";
import { LAST_ORG_KEY } from "@/pages/dashboard/ConsolePage";

/**
 * Dashboard home.
 *
 * Built to the supplied design: greeting, a progress card with a segmented bar
 * and three counters, a sales card with a seven-day chart, and a business report
 * beneath. The layout, proportions and card treatments follow the comp.
 *
 * The NUMBERS do not. The comp is a template mock — $27,500 of sales, a Spanish
 * class, a mentor named Kristin — and shipping those into a live dashboard would
 * mean an owner reading a confident figure that is not theirs. Every value here
 * is wired to real data, and where there is none the card says so rather than
 * showing a plausible number. Same reasoning as the platform console: a
 * confident 0 beats an invented 27,500.
 */

const PROFILE_FIELDS: (keyof UserProfile)[] = [
  "full_name", "job_title", "company_name", "company_size", "industry", "country", "primary_goal",
];

function completion(profile: UserProfile | null): number {
  if (!profile) return 0;
  const filled = PROFILE_FIELDS.filter((f) => String(profile[f] ?? "").trim() !== "").length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}

const money = (cents: number) => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
  } catch { return `$${Math.round(cents / 100)}`; }
};

/** One of the three counters under the progress bar. */
function Counter({ tint, icon, value, label }: { tint: string; icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="text-center flex-fill">
      <span
        className="d-inline-flex align-items-center justify-content-center mb-2"
        style={{ width: 40, height: 40, borderRadius: 999, background: tint, color: "#fff" }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="fw-700" style={{ fontSize: 26, lineHeight: 1.1 }}>{value}</div>
      <div className="neutral-500 fz-font-sm">{label}</div>
    </div>
  );
}

const I_PROGRESS = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h10M4 18h7" /></svg>;
const I_DONE = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12l5 5L14 7M12 17l5-5" /></svg>;
const I_SOON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" /></svg>;

export default function DashboardHomePage() {
  const { data: profile = null, loading: pLoading, error } = useCachedData(profileQuery.key, profileQuery.fetch);
  const { data: orgs = [], loading: oLoading } = useCachedData(organizationsQuery.key, organizationsQuery.fetch);
  const { data: aiUsage = [], loading: aLoading } = useCachedData(aiUsageMonthQuery.key, aiUsageMonthQuery.fetch);
  const { data: revenue30 = 0 } = useCachedData(revenue30Query.key, revenue30Query.fetch);
  const { data: daily = [] } = useCachedData(revenue7DailyQuery.key, revenue7DailyQuery.fetch);
  const { data: invites = [] } = useCachedData(invitationsQuery.key, invitationsQuery.fetch);

  const loading = pLoading || oLoading || aLoading;
  const pct = completion(profile);
  const aiTokens = aiUsage.reduce((sum, u) => sum + u.tokens, 0);

  // The three counters, mapped onto things that actually exist here rather than
  // the comp's course-platform vocabulary.
  const live = orgs.filter((o) => o.organization.stage === "active").length;
  const building = orgs.length - live;
  // domainsQuery is per-business, so it has no meaning at this level. Pending
  // invitations are the only real "coming soon" signal the home page owns.
  const upcoming = invites.length;

  // Segments of the progress bar: how the portfolio splits. Widths are shares of
  // a real total, so an empty account shows an empty bar instead of decoration.
  const totalParts = Math.max(live + building + upcoming, 1);
  const seg = [
    { pct: Math.round((live / totalParts) * 100), color: "#7c3aed" },
    { pct: Math.round((building / totalParts) * 100), color: "#2563eb" },
    { pct: Math.round((upcoming / totalParts) * 100), color: "#f97316" },
  ];

  const week7 = daily.length ? daily : [];
  const peak = Math.max(...week7.map((d) => d.cents), 1);
  const bestIdx = week7.reduce((b, d, i) => (d.cents > (week7[b]?.cents ?? -1) ? i : b), 0);
  const week7Total = week7.reduce((s, d) => s + d.cents, 0);

  const [reportIdx, setReportIdx] = useState(0);
  const report = orgs[reportIdx]?.organization ?? null;

  // The Operator answers for ONE business, so the home page has to choose. It
  // uses the same last-worked-in business the Console shortcut remembers, so the
  // panel here and the console you open are never a different company.
  let lastOrg: string | null = null;
  try { lastOrg = localStorage.getItem(LAST_ORG_KEY); } catch { /* storage unavailable */ }
  const operatorOrg =
    (lastOrg && orgs.find((o) => o.organization.id === lastOrg)?.organization) ?? orgs[0]?.organization ?? null;

  return (
    <div>
      <PageMeta title="Phoxta - Dashboard" />

      <div className="dash-sticky-head pb-4">
        <h1 className="fw-700 mb-0" style={{ fontSize: "clamp(30px, 4vw, 44px)", letterSpacing: "-0.02em" }}>
          Good, {greeting()}!
        </h1>
      </div>

      {error && <div className="alert alert-warning py-2 px-3 fz-font-md" role="alert">{error}</div>}

      <div className="row g-3">
        <div className="col-xxl-8">
        <div className="row g-3">
        {/* ── Progress ──────────────────────────────────────────────────── */}
        <div className="col-xl-6">
          <div className="bg-neutral-0 rounded-4 p-4 h-100 border-100">
            <h2 className="fw-600 mb-4" style={{ fontSize: 20 }}>Progress statistics</h2>

            <div className="d-flex align-items-end gap-2 mb-3">
              <span className="fw-700 lh-1" style={{ fontSize: 40, letterSpacing: "-0.02em" }}>
                {loading ? "—" : `${pct}%`}
              </span>
              <span className="neutral-500 fz-font-md pb-1">Profile<br />complete</span>
            </div>

            <div className="d-flex gap-2 mb-1" aria-hidden="true">
              {seg.map((s, i) => (
                <div key={i} style={{ width: `${Math.max(s.pct, 4)}%`, height: 4, borderRadius: 4, background: s.color }} />
              ))}
            </div>
            <div className="d-flex gap-2 neutral-500 fz-font-sm mb-4">
              {seg.map((s, i) => <div key={i} style={{ width: `${Math.max(s.pct, 4)}%` }}>{s.pct}%</div>)}
            </div>

            <div className="d-flex bg-neutral-50 rounded-4 py-3">
              <Counter tint="#7c3aed" icon={I_PROGRESS} value={building} label="In progress" />
              <div style={{ width: 1, background: "var(--neutral-200, #e9e9ec)" }} />
              <Counter tint="#2563eb" icon={I_DONE} value={live} label="Live" />
              <div style={{ width: 1, background: "var(--neutral-200, #e9e9ec)" }} />
              <Counter tint="#f97316" icon={I_SOON} value={upcoming} label="Up coming" />
            </div>
          </div>
        </div>

        {/* ── Sales ─────────────────────────────────────────────────────── */}
        <div className="col-xl-6">
          <div className="bg-neutral-0 rounded-4 p-4 h-100 border-100">
            <div className="d-flex align-items-start justify-content-between mb-2">
              <h2 className="fw-600 mb-0" style={{ fontSize: 20 }}>Sales</h2>
              <span className="badge bg-neutral-100 neutral-700 fw-500 rounded-pill px-3 py-2">last 7 days</span>
            </div>

            <div className="fw-700 lh-1 mb-4" style={{ fontSize: 40, letterSpacing: "-0.02em" }}>
              {money(week7Total)}
            </div>

            {week7Total === 0 ? (
              <p className="neutral-500 fz-font-md mb-0">
                No paid orders or confirmed reservations in the last 7 days.{" "}
                {revenue30 > 0 && <>Last 30 days: <b>{money(revenue30)}</b>.</>}
              </p>
            ) : (
              <div className="d-flex align-items-end gap-2" style={{ height: 170 }} role="img"
                   aria-label={`Revenue by day, last 7 days. Total ${money(week7Total)}.`}>
                {week7.map((d, i) => (
                  <div key={d.iso} className="flex-fill d-flex flex-column align-items-center gap-2" style={{ height: "100%" }}>
                    <div className="w-100 d-flex flex-column justify-content-end align-items-center" style={{ flex: 1 }}>
                      {i === bestIdx && d.cents > 0 && (
                        <span className="badge bg-neutral-100 neutral-700 fw-500 rounded-pill mb-1" style={{ fontSize: 11 }}>
                          {money(d.cents)}
                        </span>
                      )}
                      <div
                        className="w-100"
                        style={{
                          height: `${Math.max((d.cents / peak) * 100, 3)}%`,
                          borderRadius: 8,
                          background: i === bestIdx ? "#1d4ed8" : "#c7d7fb",
                        }}
                      />
                    </div>
                    <span className="neutral-500 fz-font-sm">{d.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Business report ───────────────────────────────────────────── */}
        <div className="col-12">
          <div className="bg-neutral-0 rounded-4 p-4 border-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h2 className="fw-600 mb-0" style={{ fontSize: 20 }}>Business report</h2>
              <div className="d-flex align-items-center gap-2">
                <button type="button" className="btn btn-sm rounded-circle border p-0"
                        style={{ width: 32, height: 32 }} aria-label="Previous business"
                        disabled={reportIdx === 0}
                        onClick={() => setReportIdx((i) => Math.max(0, i - 1))}>‹</button>
                <span className="fw-500 fz-font-md">{report?.name ?? "No businesses"}</span>
                <button type="button" className="btn btn-sm rounded-circle border p-0"
                        style={{ width: 32, height: 32 }} aria-label="Next business"
                        disabled={reportIdx >= orgs.length - 1}
                        onClick={() => setReportIdx((i) => Math.min(orgs.length - 1, i + 1))}>›</button>
              </div>
            </div>

            {!report ? (
              <div className="bg-neutral-50 rounded-4 p-5 text-center">
                <p className="neutral-500 mb-3">You haven&apos;t launched a business yet.</p>
                <Link className="btn btn-dark btn-sm rounded-pill px-3" to="/dashboard/marketplace">Browse the marketplace</Link>
              </div>
            ) : (
              <div className="row g-3 align-items-stretch">
                <div className="col-lg-4">
                  <div className="bg-neutral-50 rounded-4 p-4 h-100 d-flex flex-column">
                    <div className="neutral-500 fz-font-sm mb-1 text-capitalize">{report.vertical || "Business"}</div>
                    <div className="fw-600 mb-3" style={{ fontSize: 20, lineHeight: 1.25 }}>{report.name}</div>
                    <Link className="btn btn-dark btn-sm rounded-pill px-4 align-self-start mb-4"
                          to={`/dashboard/businesses/${report.id}/ops`}>
                      Open console
                    </Link>
                    <div className="mt-auto d-flex align-items-center gap-2">
                      <span className="d-inline-flex align-items-center justify-content-center bg-neutral-200"
                            style={{ width: 34, height: 34, borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                        {(report.name || "?").slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <div className="fw-500 fz-font-md">{report.slug ?? report.name}</div>
                        <div className="neutral-500 fz-font-sm text-capitalize">{report.stage}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-lg-8">
                  <div className="rounded-4 overflow-hidden h-100 bg-neutral-50 d-flex align-items-center justify-content-center"
                       style={{ minHeight: 240 }}>
                    <div className="text-center p-4">
                      <div className="fw-600 mb-1" style={{ fontSize: 18 }}>
                        {aiTokens > 0 ? `${new Intl.NumberFormat().format(aiTokens)} AI tokens this month` : "No AI activity yet this month"}
                      </div>
                      <p className="neutral-500 fz-font-md mb-3">
                        {live > 0 ? `${live} business${live === 1 ? "" : "es"} live · ${money(revenue30)} in the last 30 days` : "Finish setup to go live."}
                      </p>
                      <Link className="btn btn-sm rounded-pill px-3 border" to="/dashboard/businesses">All businesses</Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
        </div>

        {/* ── AI Operator ───────────────────────────────────────────────── */}
        <div className="col-xxl-4">
          {operatorOrg ? (
            <div className="h-100" style={{ minHeight: 520 }}>
              <OperatorChat orgId={operatorOrg.id} opsBase={`/dashboard/businesses/${operatorOrg.id}/ops`} />
            </div>
          ) : (
            <div className="bg-neutral-0 rounded-4 p-4 border-100 h-100">
              <h2 className="fw-600 mb-2" style={{ fontSize: 20 }}>AI Operator</h2>
              <p className="neutral-500 fz-font-md mb-0">
                Launch a business and your operator appears here — ask it to change a price, chase an order or draft a campaign.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
