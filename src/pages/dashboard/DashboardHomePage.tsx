import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useCachedData } from "@/lib/hooks/useCachedData";
import {
  profileQuery, organizationsQuery, aiUsageMonthQuery,
  revenue30Query, revenueSeriesQuery, invitationsQuery, marketplaceBlueprintsQuery,
  SALES_RANGES, type SalesRange,
} from "@/lib/cache/dashboardQueries";
import { type UserProfile } from "@/lib/db/profile";
import { type Organization } from "@/lib/db/organizations";
import { type Blueprint } from "@/lib/db/marketplace";
import { blueprintCover } from "@/lib/blueprintCover";
import OperatorChat from "@/pages/dashboard/ops/OperatorChat";
import { LAST_ORG_KEY } from "@/pages/dashboard/ConsolePage";

/**
 * Dashboard home — one screen on a laptop and on a desktop alike.
 *
 * Laid out with CSS Grid rather than Bootstrap rows. Nested flex kept failing
 * the same way: `flex: 1 1 0` children still floor at min-content wherever a
 * `.row` reintroduces `min-height: auto`, so the top pair ate the whole column,
 * Your Business was pushed off the bottom and the Operator ran past the fold.
 * Grid tracks written as `minmax(0, …)` are genuinely shrinkable, so the two
 * rows always split evenly and both columns end level with the sidebar.
 *
 * Below 1200px the height cap is dropped and the page flows normally — a phone
 * is not the design being replicated, and pinning it there would only clip.
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
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(cents / 100);
  } catch { return `$${Math.round(cents / 100)}`; }
};

/**
 * Which marketplace listing a business came from.
 *
 * blueprint_id is the truth when it is set, but it is null for anything not
 * bought through the marketplace — which is why the preview came up blank.
 * Migration 0090 backfills app_path from the org slug precisely because such
 * orgs exist, so slug and app_path both point at the same listing and are the
 * dependable fallbacks. The image itself comes from blueprintCover, the single
 * source every marketplace surface shares.
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
    <div className="dash-counter">
      <span className="dash-counter-ic" style={{ background: tint }} aria-hidden="true">{icon}</span>
      <div className="dash-counter-n">{value}</div>
      <div className="dash-counter-l">{label}</div>
    </div>
  );
}

const I_PROGRESS = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h10M4 18h7" /></svg>;
const I_DONE = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12l5 5L14 7M12 17l5-5" /></svg>;
const I_SOON = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" /></svg>;

const I_CAL = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 11h18" /></svg>;
const I_CARET = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>;

/** The width at which the pinned one-screen layout turns on. */
const PIN_AT = 1200;

const CSS = `
.dash-home { display: flex; flex-direction: column; min-height: 0; }
.dash-home .dash-hi { font-size: clamp(24px, 2.7vw, 44px); letter-spacing: -0.02em; font-weight: 700; }

.dash-grid { display: grid; gap: 16px; min-height: 0; flex: 1 1 auto;
  grid-template-columns: minmax(0, 1fr); }
.dash-left { display: grid; gap: 16px; min-height: 0; }
.dash-top  { display: grid; gap: 16px; min-height: 0; grid-template-columns: minmax(0, 1fr); }
.dash-right { display: flex; min-height: 0; }

.dash-card { background: var(--at-neutral-0, #fff); border-radius: 20px; padding: clamp(16px, 1.4vw, 24px);
  display: flex; flex-direction: column; min-height: 0; overflow: hidden; }

/* The pinned layout. minmax(0, …) on every track is what makes the rows
   genuinely shrinkable — a bare 1fr is minmax(auto, 1fr) and floors at
   min-content, which is what pushed Your Business off the bottom. */
@media (min-width: ${PIN_AT}px) {
  .dash-grid { grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); }
  .dash-left { grid-template-rows: minmax(0, 1fr) minmax(0, 1fr); }
  .dash-top  { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
}

/* The Operator ships appearance only; its height comes from its grid track.
   height/min-height are reset explicitly because the console page injects a
   global .opc rule with a fixed height and a 460px floor, and stays mounted
   under keep-alive, so it would otherwise size the operator here too. */
.dash-right .opc { width: 100%; height: auto; min-height: 0; align-self: stretch; }

.dash-figure { font-size: clamp(24px, 2.2vw, 38px); font-weight: 700; line-height: 1; letter-spacing: -0.02em; }
.dash-title { font-size: 17px; font-weight: 600; margin: 0; }

.dash-counters { display: flex; background: var(--at-neutral-50, #f6f6f7); border-radius: 16px;
  padding: 10px 0; margin-top: auto; }
.dash-counter { flex: 1 1 0; min-width: 0; text-align: center; }
.dash-counter-ic { display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 999px; color: #fff; margin-bottom: 4px; }
.dash-counter-n { font-size: 22px; font-weight: 700; line-height: 1.1; }
.dash-counter-l { font-size: 11px; color: var(--at-neutral-500, #6b7280); }
.dash-sep { width: 1px; background: rgba(0,0,0,.07); }

/* The comp's period chip: calendar glyph, label, caret — one pill. The <select>
   sits transparent on top so the native dropdown (and its keyboard handling)
   still does the work. */
.dash-range { position: relative; display: inline-flex; align-items: center; gap: 6px;
  background: var(--at-neutral-100, #f1f2f4); color: var(--at-neutral-700, #374151);
  border-radius: 999px; padding: 7px 24px 7px 12px; }
.dash-range select { appearance: none; -webkit-appearance: none; border: 0; background: transparent;
  font-size: 11px; font-weight: 500; color: inherit; padding: 0; margin: 0; cursor: pointer;
  outline: none; line-height: 1.2; }
.dash-range .dash-caret { position: absolute; right: 9px; top: 50%; transform: translateY(-50%);
  pointer-events: none; opacity: .55; display: flex; }

/* Bars. Rounded on every corner, as in the comp, and the peak picked out in
   solid blue against the muted rest. */
.dash-bars { display: flex; align-items: flex-end; gap: 6px; flex: 1 1 auto; min-height: 0; }
.dash-bar-col { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center;
  gap: 6px; height: 100%; }
.dash-bar-slot { position: relative; width: 100%; flex: 1 1 auto; min-height: 0;
  display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
.dash-bar-wrap { position: relative; width: 100%; }
.dash-bar { width: 100%; height: 100%; border-radius: 8px; background: #C3D7FB; }
.dash-bar.peak { background: #1668FF; }
.dash-bars.dense { gap: 3px; }
.dash-bars.dense .dash-bar { border-radius: 5px; }
.dash-bars.dense .dash-bar-l { font-size: 9px; }
.dash-bar-l { font-size: 11px; color: var(--at-neutral-500, #6b7280); white-space: nowrap; }
.dash-peak-tag { position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%);
  background: var(--at-neutral-100, #f1f2f4); color: var(--at-neutral-700, #374151);
  font-size: 10px; font-weight: 500; padding: 3px 8px; border-radius: 999px; white-space: nowrap; z-index: 1; }

/* The comp's "View": a white pill with purple type, not a dark button. */
.dash-view { background: #fff; color: #7c3aed; box-shadow: 0 1px 3px rgba(0,0,0,.10); }
.dash-view:hover { background: #fff; color: #5b21b6; }
`;

export default function DashboardHomePage() {
  const { data: profile = null, loading: pLoading, error } = useCachedData(profileQuery.key, profileQuery.fetch);
  const { data: orgs = [], loading: oLoading } = useCachedData(organizationsQuery.key, organizationsQuery.fetch);
  const { data: aiUsage = [], loading: aLoading } = useCachedData(aiUsageMonthQuery.key, aiUsageMonthQuery.fetch);
  const { data: revenue30 = 0 } = useCachedData(revenue30Query.key, revenue30Query.fetch);
  const [range, setRange] = useState<SalesRange>("week");
  const series = revenueSeriesQuery(range);
  const { data: daily = [] } = useCachedData(series.key, series.fetch);
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
  const rangeLabel = SALES_RANGES.find((r) => r.id === range)?.label ?? "Last 7 days";

  const [orgId, setOrgId] = useState<string>("");
  const selected = orgs.find((o) => o.organization.id === orgId)?.organization ?? orgs[0]?.organization ?? null;
  const selectedBlueprint = blueprintFor(selected, blueprints);

  let lastOrg: string | null = null;
  try { lastOrg = localStorage.getItem(LAST_ORG_KEY); } catch { /* storage unavailable */ }
  const operatorOrg =
    (lastOrg && orgs.find((o) => o.organization.id === lastOrg)?.organization) ?? orgs[0]?.organization ?? null;

  // Measure the real gap between where this content starts and the bottom of the
  // shell's scroll pane, minus the padding of everything in between. Subtracting
  // a guessed offset from innerHeight leaves a stub scrollbar, because the shell
  // pads with clamp() and <main> adds py-4 — both move with the window.
  //
  // null means "don't pin": narrow or short screens flow normally, rather than
  // having overflow:hidden quietly eat the bottom of a card.
  const rootRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ h: number; pullUp: number } | null>(null);
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
      if (window.innerWidth < PIN_AT) { setFit(null); return; }

      const top = el.getBoundingClientRect().top;
      const pane = scrollParent(el);
      if (!pane) { setFit(null); return; }

      // Run all the way down to the pane's edge, which is where the sidebar
      // ends — the two are siblings in the shell's flex row.
      const h = Math.floor(pane.getBoundingClientRect().bottom - top);

      // <main> pads py-4 below us, which would push the pane into scrolling by
      // exactly that much. A matching negative margin absorbs it, so the cards
      // finish level with the sidebar and nothing scrolls.
      let pullUp = 0;
      for (let n = el.parentElement; n && n !== pane; n = n.parentElement) {
        pullUp += parseFloat(getComputedStyle(n).paddingBottom) || 0;
      }

      setFit(h > 520 ? { h, pullUp: Math.round(pullUp) } : null);
    };

    measure();
    window.addEventListener("resize", measure);
    const settle = setTimeout(measure, 150); // after webfonts and the shell settle
    return () => { window.removeEventListener("resize", measure); clearTimeout(settle); };
  }, []);

  return (
    <div
      ref={rootRef}
      className="dash-home"
      style={fit ? { height: fit.h, marginBottom: -fit.pullUp, overflow: "hidden" } : undefined}
    >
      <PageMeta title="Phoxta - Dashboard" />
      <style>{CSS}</style>

      <h1 className="dash-hi mb-3 flex-shrink-0">Good, {greeting()}!</h1>

      {error && <div className="alert alert-warning py-2 px-3 fz-font-md flex-shrink-0" role="alert">{error}</div>}

      <div className="dash-grid">
        <div className="dash-left">

          <div className="dash-top">
            <section className="dash-card">
              <h2 className="dash-title mb-2">Progress statistics</h2>

              <div className="d-flex align-items-end gap-2 mb-2">
                <span className="dash-figure">{loading ? "—" : `${pct}%`}</span>
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

              <div className="dash-counters">
                <Counter tint="#7c3aed" icon={I_PROGRESS} value={building} label="In progress" />
                <div className="dash-sep" />
                <Counter tint="#2563eb" icon={I_DONE} value={live} label="Live" />
                <div className="dash-sep" />
                <Counter tint="#f97316" icon={I_SOON} value={upcoming} label="Up coming" />
              </div>
            </section>

            <section className="dash-card">
              <div className="d-flex align-items-start justify-content-between gap-2 mb-1">
                <h2 className="dash-title">Sales</h2>
                <span className="dash-range flex-shrink-0">
                  {I_CAL}
                  <label className="visually-hidden" htmlFor="dash-range">Sales period</label>
                  <select id="dash-range" value={range} onChange={(e) => setRange(e.target.value as SalesRange)}>
                    {SALES_RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                  <span className="dash-caret">{I_CARET}</span>
                </span>
              </div>

              <div className="dash-figure mb-2">{money(week7Total)}</div>

              {/* The chart renders at every value, including all-zero — the comp has
                  a chart here, and a flat baseline under a $0 figure says "nothing
                  sold" perfectly well without swapping the layout for a sentence. */}
              <div className={`dash-bars${week7.length > 8 ? " dense" : ""}`} role="img"
                   aria-label={`Revenue by ${rangeLabel.toLowerCase()}. Total ${money(week7Total)}.`}>
                {week7.map((d, i) => {
                  const isPeak = i === bestIdx && d.cents > 0;
                  return (
                    <div key={d.iso} className="dash-bar-col">
                      <div className="dash-bar-slot">
                        <div className="dash-bar-wrap" style={{ height: `${Math.max((d.cents / peak) * 86, 2)}%` }}>
                          {isPeak && <span className="dash-peak-tag">{money(d.cents)}</span>}
                          <div className={`dash-bar${isPeak ? " peak" : ""}`} />
                        </div>
                      </div>
                      <span className="dash-bar-l">{d.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <section className="dash-card">
            <div className="d-flex align-items-center justify-content-between gap-2 mb-2 flex-shrink-0">
              <h2 className="dash-title">Your Business</h2>
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
              <div className="d-flex gap-3 flex-grow-1" style={{ minHeight: 0 }}>
                <div className="bg-neutral-50 rounded-4 p-3 d-flex flex-column"
                     style={{ flex: "0 0 40%", minWidth: 0, minHeight: 0 }}>
                  <div className="neutral-500 text-capitalize" style={{ fontSize: 11 }}>{selected.vertical || "Business"}</div>
                  <div className="fw-600 mb-2" style={{ fontSize: 16, lineHeight: 1.25 }}>{selected.name}</div>
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

                <div className="rounded-4 overflow-hidden position-relative bg-neutral-50"
                     style={{ flex: "1 1 0", minWidth: 0, minHeight: 0 }}>
                  <img
                    src={blueprintCover(selectedBlueprint?.slug ?? selected.slug, selectedBlueprint?.cover_url)}
                    alt={`${selected.name} storefront preview`}
                    loading="lazy"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  />
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
            )}
          </section>
        </div>

        {/* AI Operator — the same component and stylesheet as the console; only
            the height differs, and it comes from this grid track. */}
        <div className="dash-right">
          {operatorOrg ? (
            <OperatorChat orgId={operatorOrg.id} opsBase={`/dashboard/businesses/${operatorOrg.id}/ops`} />
          ) : (
            <section className="dash-card w-100">
              <h2 className="dash-title mb-2">AI Operator</h2>
              <p className="neutral-500 mb-0" style={{ fontSize: 13 }}>
                Launch a business and your operator appears here — ask it to change a price, chase an order or draft a campaign.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
