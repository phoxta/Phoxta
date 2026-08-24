import { useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useCachedData } from "@/lib/hooks/useCachedData";
import {
  profileQuery, organizationsQuery, aiUsageMonthQuery,
  marketplaceBlueprintsQuery,
  orders30Query, unreadConvos30Query, notificationsQuery,
} from "@/lib/cache/dashboardQueries";
import { StatTile } from "@/components/dash/Ui";
import OperatorChat from "@/pages/dashboard/ops/OperatorChat";
import { LAST_ORG_KEY } from "@/pages/dashboard/ConsolePage";
import { type UserProfile } from "@/lib/db/profile";
import { type Organization } from "@/lib/db/organizations";
import { type Blueprint } from "@/lib/db/marketplace";
import { blueprintCover } from "@/lib/blueprintCover";

/**
 * Dashboard home — the HR-dashboard comp rebuilt around Phoxta's real data.
 *
 * The comp's content is someone else's business (timesheets, leave, "38hrs");
 * shipping those numbers would mean an owner reading a confident figure that is
 * not theirs. Every card keeps the comp's look but binds to live data, and
 * where there is none the card says so:
 *
 *   profile photo card   → the selected business's storefront cover
 *   "Current Placement"  → the user's businesses with their stage
 *   Overview chart       → revenue by period (stems + day caps, peak tagged)
 *   Progress             → profile completion + portfolio counters
 *   Expense bar          → this month's AI usage split per business
 *   "My Requests"        → the real setup checklist, ticked off by data
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

const compact = (n: number) => new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);

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

/* ── Icons (module-level, per house style) ─────────────────────────────── */

const ln = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const I_PLUS = <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M9.2 3.5h1.6v5.7h5.7v1.6h-5.7v5.7H9.2v-5.7H3.5V9.2h5.7z" /></svg>;
const I_CAL = <svg width="18" height="18" viewBox="0 0 20 20" {...ln} aria-hidden="true"><rect x="3.3" y="4" width="13.4" height="13.3" rx="2" /><path d="M6.7 2.7v2.7M13.3 2.7v2.7M3.8 8.1h12.4" /></svg>;
const I_DOC = <svg width="18" height="18" viewBox="0 0 20 20" {...ln} aria-hidden="true"><rect x="3.3" y="2.5" width="13.4" height="15" rx="2" /><path d="M6.7 10.4h6.6M6.7 13.3h4.2" /></svg>;
const I_BOLT = <svg width="22" height="22" viewBox="0 0 24 24" {...ln} aria-hidden="true" color="#f79009"><path d="M13.2 3.6 6.7 12.6h5l-1 7.8 6.6-9H12.3z" /></svg>;
const I_ARROW = <svg width="18" height="18" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>;
const I_CLOCK = <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1.3a6.7 6.7 0 1 0 0 13.4A6.7 6.7 0 0 0 8 1.3Zm.7 7.2c0 .3-.2.5-.4.6l-2.4 1.4a.7.7 0 0 1-.7-1.2l2.1-1.2V4.7a.7.7 0 0 1 1.4 0v3.8Z" /></svg>;
const I_GLOBE = <svg width="18" height="18" viewBox="0 0 24 24" {...ln} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.7 5.6 3.7 9S14.5 18.5 12 21c-2.5-2.5-3.7-5.6-3.7-9S9.5 5.5 12 3Z" /></svg>;
const I_USER = <svg width="22" height="22" viewBox="0 0 24 24" {...ln} aria-hidden="true"><circle cx="12" cy="8" r="3.6" /><path d="M4.8 20c.9-3.4 3.8-5.3 7.2-5.3s6.3 1.9 7.2 5.3" /></svg>;
const I_BAG = <svg width="22" height="22" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M4.5 8h15l-1.2 12.5H5.7z" /><path d="M8.5 10.5V6.6a3.5 3.5 0 0 1 7 0v3.9" /></svg>;
const I_ZAP = <svg width="22" height="22" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M13.2 3.6 6.7 12.6h5l-1 7.8 6.6-9H12.3z" /></svg>;
const I_CHAT = <svg width="22" height="22" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-7l-5 4v-4H6a3 3 0 0 1-3-3z" /><path d="M8 9h8M8 12.5h6" /></svg>;
const I_PEN = <svg width="22" height="22" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="m14.5 4.5 5 5L8 21H3v-5z" /><path d="m12.5 6.5 5 5" /></svg>;
const I_CHECK = (
  <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path fillRule="evenodd" clipRule="evenodd" d="M9 18A9 9 0 1 0 9 0a9 9 0 0 0 0 18Zm4.3-11.2a.75.75 0 1 0-1.1-1L7.8 10.6 5.8 8.4a.75.75 0 0 0-1.1 1l2.3 2.7c.4.4 1 .4 1.4 0l4.9-5.3Z" fill="#f5b800" />
  </svg>
);

const CSS = `
.hrx-home { display: flex; flex-direction: column; gap: 8px; }

.hrx-home-grid { display: grid; gap: 8px; grid-template-columns: minmax(0, 1fr); align-items: stretch; }
.hrx-hcol { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
@media (min-width: 768px) and (max-width: 1249.98px) {
  .hrx-home-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .hrx-hcol.c3 { grid-column: 1 / -1; }
}
@media (min-width: 1250px) {
  .hrx-home-grid { grid-template-columns: minmax(280px, 330px) minmax(0, 1fr) minmax(320px, 386px); }
}

/* ── Business hero (the comp's profile photo card) ─────────────────────── */
.hrx-hero { min-height: 352px; border-radius: 16px; background: #afafaf; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.hrx-hero img.cover { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hrx-hero .stagepill { position: absolute; left: 50%; transform: translateX(-50%); top: 14px; height: 28px; padding: 0 10px;
  border-radius: 40px; background: rgba(255,255,255,.35); backdrop-filter: blur(22px); display: inline-flex; align-items: center;
  gap: 5px; color: #fff; font-size: 13px; font-weight: 500; white-space: nowrap; text-transform: capitalize; }
.hrx-hero .idcard { position: absolute; left: 10px; right: 10px; bottom: 10px; border-radius: 20px; background: rgba(249,251,252,.94);
  backdrop-filter: blur(22px); padding: 16px 18px; display: flex; align-items: center; gap: 12px; }
.hrx-hero .idcard .info { min-width: 0; flex: 1 1 auto; }
.hrx-hero .idcard .name { font-size: 19px; font-weight: 500; letter-spacing: -0.03em; color: #000; margin: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hrx-hero .idcard .sub { font-size: 13px; font-weight: 500; color: var(--hrx-muted); margin: 5px 0 0; text-transform: capitalize;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── Placements list (the comp's "Current Work Placement") ─────────────── */
.hrx-place { padding: 18px; display: flex; flex-direction: column; flex: 1 1 auto; }
.hrx-place .rule { height: 1px; background: var(--hrx-muted); margin: 16px 0 0; opacity: .6; }
.hrx-place .row1 { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; padding-top: 18px; min-width: 0; }
.hrx-place .lbl12 { font-size: 12px; color: var(--hrx-muted); font-weight: 500; margin: 0 0 8px; }
.hrx-place .biz { display: flex; align-items: center; gap: 7px; min-width: 0; }
.hrx-place .biz .dot { width: 22px; height: 22px; border-radius: 999px; background: #fff0e9; color: var(--hrx-orange);
  display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0;
  border: 1px solid #ffd9c8; }
.hrx-place .biz p { font-size: 16px; font-weight: 500; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── The Operator, wearing the old Sales-card frame in black & white ───── */
.hrx-sales { padding: 20px; }
.hrx-opchat { flex: 1 1 auto; min-height: 420px; display: flex; margin-top: 14px; }
.hrx-opchat .opc { width: 100%; height: 100%; min-height: 0;
  background: #fff; border: 1px solid var(--hrx-border-soft); border-radius: 12px; }
.hrx-opchat .opc-veil { backdrop-filter: none; -webkit-backdrop-filter: none;
  background: linear-gradient(#fff, rgba(255,255,255,0)); mask-image: none; -webkit-mask-image: none; height: 18px; }
.hrx-opchat .opc-day span { color: var(--hrx-muted); }
.hrx-opchat .opc-bubble { backdrop-filter: none; -webkit-backdrop-filter: none; }
.hrx-opchat .opc-group.theirs .opc-bubble { background: #f1f2f4; border: 1px solid #e7e7e7; color: var(--hrx-ink); }
.hrx-opchat .opc-group.mine .opc-bubble { background: var(--hrx-ink); border: 0; color: #fff; }
.hrx-opchat .opc-meta b { color: var(--hrx-ink); }
.hrx-opchat .opc-meta i { color: var(--hrx-muted); }
.hrx-opchat .opc-group.theirs .opc-av { background: var(--hrx-ink); background-image: none; box-shadow: none;
  font-size: 8.5px; width: 22px; height: 22px; flex-basis: 22px; color: #fff; }
.hrx-opchat .opc-tick { color: var(--hrx-ink); }
.hrx-opchat .opc-say { color: var(--hrx-muted); }
.hrx-opchat .opc-say:hover { color: var(--hrx-ink); background: #f1f2f4; }
.hrx-opchat .opc-say.on { color: #fff; background: var(--hrx-ink); }
.hrx-opchat .opc-empty { color: var(--hrx-muted); }
.hrx-opchat .opc-starters button { background: #fff; border: 1px solid #dcdcdc; color: var(--hrx-ink); }
.hrx-opchat .opc-starters button:hover { border-color: var(--hrx-ink); color: var(--hrx-ink); }
.hrx-opchat .opc-tools span { background: #f1f2f4; color: var(--hrx-ink); }
.hrx-opchat .opc-err { color: var(--hrx-ink); background: #f1f2f4; border: 1px solid #dcdcdc; }
.hrx-opchat .opc-input { background: #fff; border: 1px solid #dcdcdc; backdrop-filter: none; -webkit-backdrop-filter: none; }
.hrx-opchat .opc-text { color: var(--hrx-ink); }
.hrx-opchat .opc-text::placeholder { color: var(--hrx-muted); }
.hrx-opchat .opc-clip, .hrx-opchat .opc-send { color: var(--hrx-muted); }
.hrx-opchat .opc-clip:hover, .hrx-opchat .opc-send:hover { color: var(--hrx-ink); }
.hrx-opchat .opc-mic { background: var(--hrx-ink); }
.hrx-opchat .opc-mic:hover { background: #000; }
.hrx-opchat .opc-mic.on { background: #6b7280; }
.hrx-opchat .opc-pending span { background: #f1f2f4; color: var(--hrx-ink); }

/* The comp's period chip: a bordered dropdown with the native <select> doing
   the real work, transparent on top. */
.hrx-range { position: relative; display: inline-flex; align-items: center; gap: 8px; height: 40px;
  padding: 0 30px 0 16px; border: 1px solid #eaecf0; border-radius: 12px; font-size: 14px; font-weight: 500; color: #1f293a; }
.hrx-range select { position: absolute; inset: 0; width: 100%; opacity: 0; cursor: pointer; }
.hrx-range .caret { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; opacity: .7; display: flex; }

/* ── Operator card fills its column so the grid finishes level ──────────── */
.hrx-sales { display: flex; flex-direction: column; flex: 1 1 auto; }

/* ── Checklist / updates column: the dark panel IS the card ─────────────── */
.hrx-side { padding: 10px; display: flex; flex-direction: column; flex: 1 1 auto; }
.hrx-side .hrx-requests { flex: 1 1 auto; }

`;

const I_CARET = <svg width="14" height="14" viewBox="0 0 16 16" {...ln} strokeWidth={2} aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>;

/** The chat's history window — the same chip UI the Sales dropdown used. */
const HIST_RANGES = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "all", label: "All history" },
] as const;
type HistRange = (typeof HIST_RANGES)[number]["id"];
const I_BELL = <svg width="20" height="20" viewBox="0 0 20 20" {...ln} aria-hidden="true"><path d="M5.6 8.3a4.4 4.4 0 0 1 8.8 0v2.6c0 .6.2 1.2.6 1.7l.7 1c.4.6 0 1.4-.7 1.4H5a.9.9 0 0 1-.7-1.4l.7-1c.4-.5.6-1.1.6-1.7V8.3Z" /><path d="M8.2 15.8a1.9 1.9 0 0 0 3.6 0" /></svg>;

export default function DashboardHomePage() {
  const { data: profile = null, loading: pLoading, error } = useCachedData(profileQuery.key, profileQuery.fetch);
  const { data: orgs = [], loading: oLoading } = useCachedData(organizationsQuery.key, organizationsQuery.fetch);
  const { data: aiUsage = [] } = useCachedData(aiUsageMonthQuery.key, aiUsageMonthQuery.fetch);
  const { data: blueprints = [] } = useCachedData(marketplaceBlueprintsQuery.key, marketplaceBlueprintsQuery.fetch);
  const { data: orders30 = 0 } = useCachedData(orders30Query.key, orders30Query.fetch);
  const { data: unread = 0 } = useCachedData(unreadConvos30Query.key, unreadConvos30Query.fetch);
  const { data: notes = [] } = useCachedData(notificationsQuery.key, notificationsQuery.fetch);

  const loading = pLoading || oLoading;
  const pct = completion(profile);
  const aiTokens = aiUsage.reduce((sum, u) => sum + u.tokens, 0);

  const live = orgs.filter((o) => o.organization.stage === "active").length;

  const [orgId, setOrgId] = useState<string>("");
  const selected = orgs.find((o) => o.organization.id === orgId)?.organization ?? orgs[0]?.organization ?? null;
  const selectedBlueprint = blueprintFor(selected, blueprints);

  // The Operator answers for the business you last worked in.
  let lastOrg: string | null = null;
  try { lastOrg = localStorage.getItem(LAST_ORG_KEY); } catch { /* storage unavailable */ }
  const operatorOrg =
    (lastOrg && orgs.find((o) => o.organization.id === lastOrg)?.organization) ?? orgs[0]?.organization ?? null;

  // How far back the visible chat history goes — display only; the agent
  // always keeps the full thread as context.
  const [hist, setHist] = useState<HistRange>("7d");
  const histSince = ((): string | null => {
    if (hist === "all") return null;
    if (hist === "today") { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); }
    const days = hist === "7d" ? 7 : 30;
    return new Date(Date.now() - days * 86_400_000).toISOString();
  })();

  const firstName = (profile?.full_name ?? "").trim().split(/\s+/)[0] || "there";
  const now = new Date();
  const monthSpan = `01–${String(now.getDate()).padStart(2, "0")} ${now.toLocaleDateString(undefined, { month: "long" })}`;

  // The comp's "My Requests", ticked off by what the account has actually done.
  const tasks = [
    { icon: I_USER, a: "Complete your profile", b: `${pct}% complete`, done: pct >= 100, to: "/dashboard/settings" },
    { icon: I_BAG, a: "Own a business", b: orgs.length > 0 ? `${orgs.length} owned` : "Browse the marketplace", done: orgs.length > 0, to: "/dashboard/marketplace" },
    { icon: I_ZAP, a: "Go live", b: live > 0 ? `${live} live` : "Launch your storefront", done: live > 0, to: "/dashboard/businesses" },
    { icon: I_CHAT, a: "Meet your Operator", b: orgs.length > 0 ? "Ready in your console" : "Needs a business first", done: aiTokens > 0, to: "/dashboard/console" },
    { icon: I_PEN, a: "Build with Studio", b: "Design pages visually", done: false, to: "/dashboard/studio" },
  ];

  // Once the account is genuinely set up, the checklist has done its job — the
  // panel switches to what actually changed since the owner last looked.
  const allDone = pct >= 100 && orgs.length > 0 && live > 0 && aiTokens > 0;
  const latest = notes.slice(0, 5);

  return (
    <div className="hrx-home">
      <PageMeta title="Phoxta - Dashboard" />
      <style>{CSS}</style>

      {/* ── Header band ─────────────────────────────────────────────────── */}
      <header className="hrx-header">
        <div>
          <p className="hrx-crumb">Portal&nbsp; <span>/&nbsp; Dashboard</span></p>
          <h1 className="hrx-greet">Good {greeting()} {firstName}!</h1>
        </div>
        <div className="hrx-header-right">
          <div className="hrx-actions">
            <Link className="hrx-pill" to="/dashboard/marketplace">{I_PLUS} New Business</Link>
            <span className="hrx-pill d-none d-md-inline-flex">{I_CAL} {monthSpan}</span>
            <Link className="hrx-pill primary" to="/dashboard/console">{I_DOC} Open Console</Link>
          </div>
        </div>
      </header>

      {error && <div className="alert alert-warning py-2 px-3 fz-font-md" role="alert">{error}</div>}

      {/* ── The four numbers an owner actually checks in on ──────────────── */}
      <div className="hrx-statrow">
        <StatTile tone="dark" label="Orders · last 30 days" value={new Intl.NumberFormat().format(orders30)} />
        <StatTile tone={unread > 0 ? "blue" : undefined} label="Unread messages" value={new Intl.NumberFormat().format(unread)} />
        <StatTile label="Businesses live" value={orgs.length > 0 ? `${live} of ${orgs.length}` : "—"} />
        <StatTile label="Operator activity" value={aiTokens > 0 ? `${compact(aiTokens)} tokens` : "Quiet"} />
      </div>

      <div className="hrx-home-grid">
        {/* ── Column 1: business hero + placements ──────────────────────── */}
        <div className="hrx-hcol">
          {selected ? (
            <div className="hrx-hero">
              <img
                className="cover"
                src={blueprintCover(selectedBlueprint?.slug ?? selected.slug, selectedBlueprint?.cover_url)}
                alt={`${selected.name} storefront preview`}
                width={330} height={352} loading="lazy"
              />
              <span className="stagepill">{I_CLOCK} {selected.stage}</span>
              <div className="idcard">
                <div className="info">
                  <p className="name">{selected.name}</p>
                  <p className="sub">{selectedBlueprint?.vertical ?? selected.vertical ?? "Business"}</p>
                </div>
                <Link className="hrx-rbtn" to={`/dashboard/businesses/${selected.id}`} aria-label={`Manage ${selected.name}`}>{I_GLOBE}</Link>
                <Link className="hrx-rbtn dark" to={`/dashboard/businesses/${selected.id}/ops`} aria-label={`Open ${selected.name} console`}>{I_ARROW}</Link>
              </div>
            </div>
          ) : (
            <div className="hrx-card d-flex flex-column align-items-center justify-content-center text-center p-4" style={{ minHeight: 352 }}>
              <p className="neutral-500 mb-3" style={{ fontSize: 14 }}>
                {loading ? "Loading…" : "You haven't launched a business yet."}
              </p>
              {!loading && <Link className="hrx-pill dark" to="/dashboard/marketplace">Browse the marketplace</Link>}
            </div>
          )}

          <section className="hrx-card hrx-place">
            <div className="d-flex align-items-center justify-content-between gap-2">
              <h2 className="hrx-card-title">{I_BOLT} Your Businesses</h2>
              <Link className="hrx-seeall" to="/dashboard/businesses">See All</Link>
            </div>
            <div className="rule" />
            {orgs.length === 0 ? (
              <p className="neutral-500 mb-0 pt-3" style={{ fontSize: 13 }}>Nothing here yet — your businesses appear the moment you own one.</p>
            ) : (
              orgs.slice(0, 3).map(({ organization: o }) => (
                <button
                  key={o.id}
                  type="button"
                  className="row1 w-100 border-0 bg-transparent text-start p-0"
                  onClick={() => setOrgId(o.id)}
                  aria-pressed={selected?.id === o.id}
                  title={`Preview ${o.name}`}
                >
                  <div style={{ minWidth: 0 }}>
                    <p className="lbl12">Business name</p>
                    <div className="biz">
                      <span className="dot">{(o.name || "?").slice(0, 1).toUpperCase()}</span>
                      <p>{o.name}</p>
                    </div>
                  </div>
                  <span className="hrx-status flex-shrink-0">{I_CLOCK} {o.stage === "active" ? "Live" : o.stage}</span>
                </button>
              ))
            )}
          </section>
        </div>

        {/* ── Column 2: the AI Operator, in the old Sales-card frame ─────── */}
        <div className="hrx-hcol">
          <section className="hrx-card hrx-sales">
            <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
              <h2 className="hrx-card-title">{I_CHAT} AI Operator</h2>
              <span className="hrx-range">
                {HIST_RANGES.find((r) => r.id === hist)?.label}
                <span className="caret">{I_CARET}</span>
                <label className="visually-hidden" htmlFor="hrx-op-hist">Chat history</label>
                <select id="hrx-op-hist" value={hist} onChange={(e) => setHist(e.target.value as HistRange)}>
                  {HIST_RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </span>
            </div>

            {operatorOrg ? (
              <div className="hrx-opchat">
                <OperatorChat
                  orgId={operatorOrg.id}
                  opsBase={`/dashboard/businesses/${operatorOrg.id}/ops`}
                  bare
                  since={histSince}
                />
              </div>
            ) : (
              <p className="neutral-500 mb-0 mt-3" style={{ fontSize: 14 }}>
                Launch a business and your operator appears here — ask it to change a price, chase an order or draft a campaign.
              </p>
            )}
          </section>
        </div>

        {/* ── Column 3: setup checklist, or the latest updates once done ── */}
        <div className="hrx-hcol c3">
          <section className="hrx-card hrx-side">
            <div className="hrx-requests">
              {allDone ? (
                <>
                  <h3>Latest updates</h3>
                  {latest.length === 0 ? (
                    <p className="text-center mb-0" style={{ color: "rgba(255,255,255,.7)", fontSize: 14 }}>
                      All caught up — nothing new since your last visit.
                    </p>
                  ) : (
                    latest.map((n) =>
                      n.link ? (
                        <Link key={n.id} to={n.link} className="hrx-rq text-decoration-none text-white">
                          <span className="l">
                            <span className="circ">{I_BELL}</span>
                            <span className="txt"><span className="a">{n.title}</span><span className="b">{n.body || new Date(n.created_at).toLocaleDateString()}</span></span>
                          </span>
                        </Link>
                      ) : (
                        <div key={n.id} className="hrx-rq text-white">
                          <span className="l">
                            <span className="circ">{I_BELL}</span>
                            <span className="txt"><span className="a">{n.title}</span><span className="b">{n.body || new Date(n.created_at).toLocaleDateString()}</span></span>
                          </span>
                        </div>
                      ),
                    )
                  )}
                </>
              ) : (
                <>
                  <h3>My Setup</h3>
                  {tasks.map((t) => (
                    <Link key={t.a} to={t.to} className={`hrx-rq text-decoration-none text-white${t.done ? " done" : ""}`}>
                      <span className="l">
                        <span className="circ">{t.icon}</span>
                        <span className="txt"><span className="a">{t.a}</span><span className="b">{t.b}</span></span>
                      </span>
                      {t.done ? I_CHECK : <span className="pend" />}
                    </Link>
                  ))}
                </>
              )}
            </div>
          </section>
        </div>
      </div>

    </div>
  );
}
