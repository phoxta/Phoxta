import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useCachedData } from "@/lib/hooks/useCachedData";
import {
  profileQuery, organizationsQuery, aiUsageMonthQuery,
  revenue30Query, revenue7DailyQuery, invitationsQuery, marketplaceBlueprintsQuery,
} from "@/lib/cache/dashboardQueries";
import { type UserProfile } from "@/lib/db/profile";
import { type Organization } from "@/lib/db/organizations";
import { type Blueprint } from "@/lib/db/marketplace";
import OperatorChat from "@/pages/dashboard/ops/OperatorChat";
import { LAST_ORG_KEY } from "@/pages/dashboard/ConsolePage";

/**
 * Dashboard home — one screen, never scrolls.
 *
 * The page is sized to the gap between where its content starts and the bottom
 * of the viewport, which is exactly where the sidebar ends. The three cards on
 * the left share that height as one group and the Operator fills it on the
 * right, so both columns finish on the same line on a laptop and on a desktop
 * alike. Nothing carries a fixed pixel height and every box may shrink — a
 * single min-height in this tree is all it takes to grow a scrollbar on a short
 * screen, which is the one thing this layout must not do.
 *
 * The NUMBERS are real. The comp is a template mock ($27,500 of sales, a Spanish
 * class, a mentor named Kristin); shipping those into a live dashboard would
 * mean an owner reading a confident figure that is not theirs. Every value is
 * bound to data, and where there is none the card says so.
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

/**
 * Which marketplace listing a business came from.
 *
 * blueprint_id is the truth when it is set, but it is null for anything not
 * bought through the marketplace — the Phoxta platform org among them — which is
 * why the preview came up blank. app_path ("businesses/carento") names the
 * storefront app and matches a blueprint slug, so it is the dependable fallback;
 * vertical is the last resort.
 */
function blueprintFor(org: Organization | null, blueprints: Blueprint[]): Blueprint | null {
  if (!org || blueprints.length === 0) return null;
  if (org.blueprint_id) {
    const byId = blueprints.find((b) => b.id === org.blueprint_id);
    if (byId) return byId;
  }
  const appSlug = String(org.app_path ?? "").split("/").filter(Boolean).pop();
  if (appSlug) {
    const byApp = blueprints.find((b) => b.slug === appSlug);
    if (byApp) return byApp;
  }
  // 0090 backfills app_path from the org slug, so the slug matches the listing
  // too — and unlike app_path it is set on every org.
  if (org.slug) {
    const bySlug = blueprints.find((b) => b.slug === org.slug);
    if (bySlug) return bySlug;
  }
  const v = String(org.vertical ?? "").toLowerCase().trim();
  if (v) return blueprints.find((b) => b.slug === v || String(b.vertical ?? "").toLowerCase() === v) ?? null;
  return null;
}

/** One of the three counters under the progress bar. */
function Counter({ tint, icon, value, label }: { tint: string; icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="text-center flex-fill" style={{ minWidth: 0 }}>
      <span className="d-inline-flex align-items-center justify-content-center mb-1"
            style={{ width: 34, height: 34, borderRadius: 999, background: tint, color: "#fff" }} aria-hidden="true">
        {icon}
      </span>
      <div className="fw-700 lh-1" style={{ fontSize: 22 }}>{value}</div>
      <div className="neutral-500" style={{ fontSize: 11 }}>{label}</div>
    </div>
  );
}

const I_PROGRESS = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h10M4 18h7" /></svg>;
const I_DONE = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12l5 5L14 7M12 17l5-5" /></svg>;
const I_SOON = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" /></svg>;

export default function DashboardHomePage() {
  const { data: profile = null, loading: pLoading, error } = useCachedData(profileQuery.key, profileQuery.fetch);
  const { data: orgs = [], loading: oLoading } = useCachedData(organizationsQuery.key, organizationsQuery.fetch);
  const { data: aiUsage = [], loading: aLoading } = useCachedData(aiUsageMonthQuery.key, aiUsageMonthQuery.fetch);
  const { data: revenue30 = 0 } = useCachedData(revenue30Query.key, revenue30Query.fetch);
  const { data: daily = [] } = useCachedData(revenue7DailyQuery.key, revenue7DailyQuery.fetch);
  const { data: invites = [] } = useCachedData(invitationsQuery.key, invitationsQuery.fetch);
  const { data: blueprints = [] } = useCachedData(marketplaceBlueprintsQuery.key, marketplaceBlueprintsQuery.fetch);

  const loading = pLoading || oLoading || aLoading;
  const pct = completion(profile);
  const aiTokens = aiUsage.reduce((sum, u) => sum + u.tokens, 0);

  const live = orgs.filter((o) => o.organization.stage === "active").length;
  const building = orgs.length - live;
  const upcoming = invites.length;

  const totalParts = Math.max(live + building + upcoming, 1);
  const seg = [
    { pct: Math.round((building / totalParts) * 100), color: "#7c3aed" },
    { pct: Math.round((live / totalParts) * 100), color: "#2563eb" },
    { pct: Math.round((upcoming / totalParts) * 100), color: "#f97316" },
  ];

  const week7 = daily;
  const peak = Math.max(...week7.map((d) => d.cents), 1);
  const bestIdx = week7.reduce((b, d, i) => (d.cents > (week7[b]?.cents ?? -1) ? i : b), 0);
  const week7Total = week7.reduce((s, d) => s + d.cents, 0);

  const [orgId, setOrgId] = useState<string>("");
  const selected = orgs.find((o) => o.organization.id === orgId)?.organization ?? orgs[0]?.organization ?? null;
  const selectedBlueprint = blueprintFor(selected, blueprints);

  let lastOrg: string | null = null;
  try { lastOrg = localStorage.getItem(LAST_ORG_KEY); } catch { /* storage unavailable */ }
  const operatorOrg =
    (lastOrg && orgs.find((o) => o.organization.id === lastOrg)?.organization) ?? orgs[0]?.organization ?? null;

  // One screen: measure the real gap between where this content starts and the
  // bottom of the shell's scroll pane, minus that pane's own bottom padding.
  //
  // Subtracting a guessed offset from window.innerHeight is what leaves a 20px
  // stub scrollbar — the shell pads with clamp() and the <main> adds py-4, so
  // the numbers move with the window. Reading them makes the fit exact at every
  // size, which is what lets a laptop and a desktop show the same layout.
  const rootRef = useRef<HTMLDivElement>(null);
  const [fitH, setFitH] = useState<number>(600);
  useEffect(() => {
    const scrollParent = (node: HTMLElement | null): HTMLElement | null => {
      for (let n = node?.parentElement ?? null; n; n = n.parentElement) {
        const oy = getComputedStyle(n).overflowY;
        if (oy === "auto" || oy === "scroll") return n;
      }
      return null;
    };

    const measure = () => {
      const el = rootRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const pane = scrollParent(el);
      let bottom = window.innerHeight;
      if (pane) {
        bottom = pane.getBoundingClientRect().bottom;
        // Padding on the boxes between us and the pane still takes up room
        // below this element, so it has to come off the budget.
        for (let n = el.parentElement; n && n !== pane; n = n.parentElement) {
          bottom -= parseFloat(getComputedStyle(n).paddingBottom) || 0;
        }
      }
      // Floor, not clip. At laptop and desktop heights the exact fit always wins,
      // so nothing scrolls. Below the floor the block simply grows taller than
      // the shell's pane and that pane scrolls — which beats overflow:hidden
      // quietly eating the bottom of a card on a small window.
      setFitH(Math.max(560, Math.floor(bottom - top)));
    };

    measure();
    window.addEventListener("resize", measure);
    const settle = setTimeout(measure, 150); // after webfonts and the shell settle
    return () => { window.removeEventListener("resize", measure); clearTimeout(settle); };
  }, []);

  return (
    <div ref={rootRef} className="dash-home d-flex flex-column" style={{ height: fitH, overflow: "hidden" }}>
      <PageMeta title="Phoxta - Dashboard" />
      <style>{`
        /* Every box in this tree must be allowed to shrink. One min-height and
           the page grows a scrollbar on a laptop, which is the whole thing we
           are avoiding. */
        .dash-home, .dash-home .row, .dash-home [class*="col-"] { min-height: 0; }
        .dash-home .dash-card { min-height: 0; overflow: hidden; border-radius: 20px; }
        /* The Operator ships appearance only. It is a flex child of its column, so
           stretch already gives it the full height — and it must be free to
           shrink with everything else. */
        .dash-home .opc { width: 100%; min-height: 0; }
        .dash-home .dash-hi { font-size: clamp(22px, 2.6vw, 40px); }
        .dash-home .dash-figure { font-size: clamp(22px, 2.1vw, 36px); }
        /* The comp's "View": a white pill with purple type, not a dark button. */
        .dash-home .dash-view { background: #fff; color: #7c3aed; box-shadow: 0 1px 3px rgba(0,0,0,.10); }
        .dash-home .dash-view:hover { background: #fff; color: #5b21b6; }
      `}</style>

      <h1 className="dash-hi fw-700 mb-3 flex-shrink-0" style={{ letterSpacing: "-0.02em" }}>
        Good, {greeting()}!
      </h1>

      {error && <div className="alert alert-warning py-2 px-3 fz-font-md flex-shrink-0" role="alert">{error}</div>}

      {/* 7 / 5 — the comp's split between the grouped cards and the Operator. */}
      <div className="row g-3 flex-grow-1" style={{ minHeight: 0 }}>
        <div className="col-xl-7 d-flex flex-column gap-3" style={{ minHeight: 0 }}>

          {/* Progress + Sales take one share of the column and Your Business the
              other, so the group resizes evenly and ends level with the sidebar. */}
          <div className="row g-3" style={{ flex: "1 1 0", minHeight: 0 }}>
            <div className="col-md-6 d-flex" style={{ minHeight: 0 }}>
              <div className="dash-card bg-neutral-0 p-3 p-xxl-4 w-100 d-flex flex-column">
                <h2 className="fw-600 mb-2" style={{ fontSize: 17 }}>Progress statistics</h2>

                <div className="d-flex align-items-end gap-2 mb-2">
                  <span className="dash-figure fw-700 lh-1" style={{ letterSpacing: "-0.02em" }}>
                    {loading ? "—" : `${pct}%`}
                  </span>
                  <span className="neutral-500 pb-1" style={{ fontSize: 11, lineHeight: 1.2 }}>Profile<br />complete</span>
                </div>

                <div className="d-flex gap-2 mb-1" aria-hidden="true">
                  {seg.map((s, i) => (
                    <div key={i} style={{ width: `${Math.max(s.pct, 4)}%`, height: 4, borderRadius: 4, background: s.color }} />
                  ))}
                </div>
                <div className="d-flex gap-2 neutral-500" style={{ fontSize: 11 }}>
                  {seg.map((s, i) => <div key={i} style={{ width: `${Math.max(s.pct, 4)}%` }}>{s.pct}%</div>)}
                </div>

                <div className="d-flex bg-neutral-50 rounded-4 py-2 mt-auto">
                  <Counter tint="#7c3aed" icon={I_PROGRESS} value={building} label="In progress" />
                  <div style={{ width: 1, background: "var(--neutral-200, #e9e9ec)" }} />
                  <Counter tint="#2563eb" icon={I_DONE} value={live} label="Live" />
                  <div style={{ width: 1, background: "var(--neutral-200, #e9e9ec)" }} />
                  <Counter tint="#f97316" icon={I_SOON} value={upcoming} label="Up coming" />
                </div>
              </div>
            </div>

            <div className="col-md-6 d-flex" style={{ minHeight: 0 }}>
              <div className="dash-card bg-neutral-0 p-3 p-xxl-4 w-100 d-flex flex-column">
                <div className="d-flex align-items-start justify-content-between gap-2 mb-1">
                  <h2 className="fw-600 mb-0" style={{ fontSize: 17 }}>Sales</h2>
                  <span className="badge bg-neutral-100 neutral-700 fw-500 rounded-pill px-3 py-2 flex-shrink-0" style={{ fontSize: 11 }}>
                    last 7 days
                  </span>
                </div>

                <div className="dash-figure fw-700 lh-1 mb-2" style={{ letterSpacing: "-0.02em" }}>{money(week7Total)}</div>

                {week7Total === 0 ? (
                  <p className="neutral-500 mb-0" style={{ fontSize: 12 }}>
                    No paid orders or confirmed reservations in the last 7 days.
                    {revenue30 > 0 && <> Last 30 days: <b>{money(revenue30)}</b>.</>}
                  </p>
                ) : (
                  <div className="d-flex align-items-end gap-2 flex-grow-1" style={{ minHeight: 0 }}
                       role="img" aria-label={`Revenue by day, last 7 days. Total ${money(week7Total)}.`}>
                    {week7.map((d, i) => (
                      <div key={d.iso} className="flex-fill d-flex flex-column align-items-center gap-1 h-100" style={{ minWidth: 0 }}>
                        <div className="w-100 d-flex flex-column justify-content-end align-items-center" style={{ flex: 1, minHeight: 0 }}>
                          {i === bestIdx && d.cents > 0 && (
                            <span className="badge bg-neutral-100 neutral-700 fw-500 rounded-pill mb-1" style={{ fontSize: 10 }}>
                              {money(d.cents)}
                            </span>
                          )}
                          <div className="w-100" style={{
                            height: `${Math.max((d.cents / peak) * 100, 3)}%`,
                            borderRadius: 8,
                            background: i === bestIdx ? "#1d4ed8" : "#c7d7fb",
                          }} />
                        </div>
                        <span className="neutral-500" style={{ fontSize: 11 }}>{d.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="dash-card bg-neutral-0 p-3 p-xxl-4 d-flex flex-column"
               style={{ flex: "1 1 0", minHeight: 0 }}>
            <div className="d-flex align-items-center justify-content-between gap-2 mb-2 flex-shrink-0">
              <h2 className="fw-600 mb-0" style={{ fontSize: 17 }}>Your Business</h2>
              {orgs.length > 0 && (
                <>
                  <label className="visually-hidden" htmlFor="dash-business">Choose a business</label>
                  <select
                    id="dash-business"
                    className="form-select form-select-sm rounded-pill"
                    style={{ maxWidth: 220, width: "auto", fontSize: 13 }}
                    value={selected?.id ?? ""}
                    onChange={(e) => setOrgId(e.target.value)}
                  >
                    {orgs.map((o) => (
                      <option key={o.organization.id} value={o.organization.id}>{o.organization.name}</option>
                    ))}
                  </select>
                </>
              )}
            </div>

            {!selected ? (
              <div className="bg-neutral-50 rounded-4 d-flex flex-column align-items-center justify-content-center text-center flex-grow-1 p-3">
                <p className="neutral-500 mb-3" style={{ fontSize: 13 }}>You haven&apos;t launched a business yet.</p>
                <Link className="btn btn-dark btn-sm rounded-pill px-3" to="/dashboard/marketplace">Browse the marketplace</Link>
              </div>
            ) : (
              <div className="row g-3 flex-grow-1" style={{ minHeight: 0 }}>
                <div className="col-lg-5 d-flex" style={{ minHeight: 0 }}>
                  <div className="bg-neutral-50 rounded-4 p-3 w-100 d-flex flex-column" style={{ minHeight: 0 }}>
                    <div className="neutral-500 text-capitalize" style={{ fontSize: 11 }}>{selected.vertical || "Business"}</div>
                    <div className="fw-600 mb-2 text-truncate" style={{ fontSize: 16, lineHeight: 1.25 }}>{selected.name}</div>
                    <Link className="dash-view btn btn-sm rounded-pill px-3 align-self-start fw-600"
                          to={`/dashboard/businesses/${selected.id}/ops`}>Open console</Link>
                    <div className="mt-auto d-flex align-items-center gap-2 pt-2" style={{ minWidth: 0 }}>
                      <span className="d-inline-flex align-items-center justify-content-center bg-neutral-200 flex-shrink-0"
                            style={{ width: 28, height: 28, borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                        {(selected.name || "?").slice(0, 2).toUpperCase()}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div className="fw-500 text-truncate" style={{ fontSize: 12 }}>{selected.slug ?? selected.name}</div>
                        <div className="neutral-500 text-capitalize" style={{ fontSize: 11 }}>{selected.stage}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-lg-7 d-flex" style={{ minHeight: 0 }}>
                  <div className="rounded-4 overflow-hidden position-relative bg-neutral-50 w-100" style={{ minHeight: 0 }}>
                    {selectedBlueprint?.cover_url ? (
                      <img src={selectedBlueprint.cover_url} alt={`${selected.name} storefront preview`} loading="lazy"
                           style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div className="h-100 d-flex align-items-center justify-content-center p-3 text-center">
                        <p className="neutral-500 mb-0" style={{ fontSize: 12 }}>No preview image on this listing yet.</p>
                      </div>
                    )}
                    <div className="position-absolute bottom-0 start-0 w-100 p-3"
                         style={{ background: "linear-gradient(to top, rgba(0,0,0,.78), rgba(0,0,0,0))", color: "#fff" }}>
                      <span className="d-inline-block text-uppercase fw-600 mb-1"
                            style={{ fontSize: 9.5, letterSpacing: ".09em", padding: "4px 9px", borderRadius: 999,
                                     background: "rgba(255,255,255,.92)", color: "#111" }}>
                        {selectedBlueprint?.vertical ?? selected.vertical ?? "Business"}
                      </span>
                      <div className="fw-700 text-truncate" style={{ fontSize: 22, lineHeight: 1.15, letterSpacing: "-0.01em" }}>
                        {selected.name}
                      </div>
                      <div className="text-truncate" style={{ fontSize: 12, opacity: .85 }}>
                        {live > 0 ? `${money(revenue30)} · last 30 days` : "Not live yet"}
                        {aiTokens > 0 && ` · ${new Intl.NumberFormat().format(aiTokens)} AI tokens`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Operator — the same component and the same stylesheet as the console;
            only the height differs, and it comes from this column. */}
        <div className="col-xl-5 d-flex" style={{ minHeight: 0 }}>
          {operatorOrg ? (
            <OperatorChat orgId={operatorOrg.id} opsBase={`/dashboard/businesses/${operatorOrg.id}/ops`} />
          ) : (
            <div className="dash-card bg-neutral-0 p-3 p-xxl-4 w-100">
              <h2 className="fw-600 mb-2" style={{ fontSize: 17 }}>AI Operator</h2>
              <p className="neutral-500 mb-0" style={{ fontSize: 13 }}>
                Launch a business and your operator appears here — ask it to change a price, chase an order or draft a campaign.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
