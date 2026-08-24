import { Suspense, useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { Chip, Empty, stageTone } from "@/components/dash/Ui";
import { getBusiness, type Organization } from "@/lib/db/organizations";
import { resolveConsole, consoleTabs, type VerticalConsole } from "@/lib/ops/consoleConfig";
import { preloadOpsConsole, preloadOpsTab } from "@/pages/dashboard/preload";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL, domainsQuery, organizationsQuery, primaryLiveDomain } from "@/lib/cache/dashboardQueries";
import { LAST_ORG_KEY } from "@/pages/dashboard/ConsolePage";
import { OpsToasts } from "@/lib/ops/feedback";
import { supabase } from "@/lib/supabaseClient";
import { OpsSubNavSlotProvider } from "@/layouts/OpsSubNav";

export type OpsContext = { orgId: string; org: Organization; console: VerticalConsole };

/** Attention counts surfaced as pills on the Inbox / AI Agent tabs. */
type TabBadges = { unread: number; approvals: number };

/** Chrome-only styles for the console header (the shared kit covers the rest). */
const CSS = `
/* One line of chrome, NOT sticky: identity on the left, the section tabs on the
   right, wrapping only when the window truly cannot fit both. Content scrolls
   underneath nothing — the only pinned bar in the app is the shell's top nav. */
.ocx-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; margin-bottom: 14px; }
.ocx-back { width: 36px; height: 36px; flex-shrink: 0; }
.ocx-title { font-size: clamp(20px, 1.8vw, 26px); font-weight: 600; letter-spacing: -0.03em; line-height: 1.1; color: #000; margin: 0 2px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 32vw; }
.ocx-tabs { margin-left: auto; min-width: 0; max-width: 100%; }
.ocx-tabs .ocx-live { color: var(--hrx-blue); border-color: #d7e3fb; }
.ocx-tabs .ocx-live:hover { color: var(--hrx-blue-deep); background: #f0f5fe; }
@media (max-width: 767.98px) { .ocx-title { max-width: 100%; } .ocx-tabs { margin-left: 0; } }
`;

export default function OperatingLayout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // A console tab's own sub-nav is portalled into the header block below, so
  // there is one pinned element and no offset to measure. See OpsSubNav.
  const [subSlot, setSubSlot] = useState<HTMLDivElement | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [badges, setBadges] = useState<TabBadges>({ unread: 0, approvals: 0 });
  // All the user's businesses, for the in-console switcher (shared warmed cache).
  const { data: myOrgs = [] } = useCachedData(organizationsQuery.key, organizationsQuery.fetch);
  // This business's domains — the canonical live address lives here, not on
  // `org.site_url` (which is only the manual override). Same cache entry the
  // Business details "Site & domains" card reads, so it's usually already warm.
  const { data: domains } = useCachedData(
    domainsQuery(id ?? "").key,
    async () => (id ? await domainsQuery(id).fetch() : []),
    { ttl: DASHBOARD_TTL },
  );

  // Remember the business being worked in — the sidebar Console entry and
  // /dashboard/console jump straight back here next time.
  useEffect(() => {
    if (!id) return;
    try {
      localStorage.setItem(LAST_ORG_KEY, id);
    } catch { /* storage unavailable */ }
  }, [id]);

  // Warm every console tab's chunk on idle so switching tabs is instant, even
  // when a user deep-links straight into the console.
  useEffect(() => {
    preloadOpsConsole();
  }, []);

  useEffect(() => {
    if (!id) return;
    let active = true;
    // Reset stale state so switching business never renders the previous org's
    // tabs/config against the new orgId while the fetch is in flight.
    setOrg(null);
    setLoading(true);
    setLoadError(null);
    getBusiness(id).then(({ data, error }) => {
      if (!active) return;
      setOrg(data);
      setLoadError(error);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id, retryTick]);

  // Lightweight attention counts for the tab pills: pending agent approvals +
  // unread (non-test) conversations. Refreshed every 60s per business.
  useEffect(() => {
    if (!id) return;
    let active = true;
    const load = async () => {
      const [a, u] = await Promise.all([
        supabase
          .from("agent_actions")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", id)
          .eq("status", "pending"),
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", id)
          .eq("unread", true)
          .not("is_test", "is", true),
      ]);
      if (active) setBadges({ approvals: a.count ?? 0, unread: u.count ?? 0 });
    };
    setBadges({ unread: 0, approvals: 0 });
    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [id]);

  const badgeFor = useCallback(
    (seg: string): number => (seg === "inbox" ? badges.unread : seg === "agent" ? badges.approvals : 0),
    [badges],
  );

  if (loading)
    return (
      <div className="hrx-card hrx-pad text-center" style={{ color: "var(--hrx-muted)" }} role="status">
        Loading…
      </div>
    );
  if (loadError)
    return (
      <div className="hrx-card hrx-pad">
        <Empty
          title="Couldn't load this business"
          action={
            <div className="d-flex flex-column align-items-center gap-3">
              <button type="button" className="hrx-pill dark" onClick={() => setRetryTick((n) => n + 1)}>
                Retry
              </button>
              <Link to="/dashboard/businesses" className="hrx-seeall">
                ← Back to businesses
              </Link>
            </div>
          }
        >
          {loadError}
        </Empty>
      </div>
    );
  if (!org || !id)
    return (
      <div className="hrx-card hrx-pad">
        <Empty
          title="Business not found"
          action={
            <Link to="/dashboard/businesses" className="hrx-pill dark">
              ← Back to businesses
            </Link>
          }
        >
          It may have been removed, or the link is stale.
        </Empty>
      </div>
    );

  const base = `/dashboard/businesses/${id}/ops`;
  const cfg = resolveConsole(org.vertical);
  const tabs = consoleTabs(cfg);
  // Prefer the resolved primary live domain; fall back to the manual override.
  const liveDomain = primaryLiveDomain(domains);
  const liveUrl = liveDomain ? `https://${liveDomain.hostname}` : org.site_url || null;

  return (
    <div>
      <style>{CSS}</style>
      <PageMeta title={`Phoxta - ${org.name} operations`} />
      {/* Console chrome — ONE line, not sticky: back button, business name,
          switcher and stage on the left; the section tabs (plus the live-site
          link) right-aligned on the same line. Only the shell's top nav pins. */}
      <div className="pb-2">
        <div className="ocx-bar">
          <Link
            to={`/dashboard/businesses/${id}`}
            className="hrx-rbtn ocx-back"
            aria-label="Business details"
            title="Business details"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <h1 className="ocx-title">{org.name}</h1>
          {myOrgs.length > 1 && (
            <select
              className="form-select form-select-sm w-auto"
              value={id}
              aria-label="Switch business"
              onChange={(e) => {
                const next = e.target.value;
                if (!next || next === id) return;
                const nextBase = `/dashboard/businesses/${next}/ops`;
                // Keep the same console tab when hopping businesses — but only if
                // the target business's console actually has that tab; otherwise
                // land on its Overview instead of a dead route.
                const nextOrg = myOrgs.find((m) => m.organization.id === next)?.organization;
                const nextCfg = resolveConsole(nextOrg?.vertical);
                const seg = pathname.startsWith(`${base}/`) ? pathname.slice(base.length + 1).split("/")[0] : "";
                const hasTab = seg === "" || nextCfg.modules.includes(seg);
                navigate(hasTab ? pathname.replace(base, nextBase) : nextBase);
              }}
            >
              {myOrgs.map(({ organization: o }) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          )}
          <Chip tone={stageTone(org.stage)}>{org.stage}</Chip>

          <nav className="hrx-tabbar ocx-tabs" aria-label="Console sections">
            {tabs.map((t) => (
              <NavLink
                key={t.seg}
                to={t.seg ? `${base}/${t.seg}` : base}
                end={t.end}
                onMouseEnter={() => preloadOpsTab(t.seg)}
                className={({ isActive }) => `hrx-tab${isActive ? " active" : ""}`}
              >
                {t.label}
                {badgeFor(t.seg) > 0 && <span className="hrx-tab-badge">{badgeFor(t.seg)}</span>}
              </NavLink>
            ))}
            {liveUrl ? (
              <a href={liveUrl} target="_blank" rel="noreferrer" className="hrx-tab ocx-live">
                Live ↗
              </a>
            ) : (
              <Link to={`/dashboard/businesses/${id}`} className="hrx-tab ocx-live" title="Not live yet — set up your domain">
                Go live
              </Link>
            )}
          </nav>
        </div>
        {/* A tab's second-level nav lands here, directly under the chrome line. */}
        <div ref={setSubSlot} />
      </div>

      <div>
        <Suspense
          fallback={
            <div className="hrx-card hrx-pad text-center" style={{ color: "var(--hrx-muted)" }} role="status">
              Loading…
            </div>
          }
        >
          <OpsSubNavSlotProvider value={subSlot}>
            <Outlet context={{ orgId: id, org, console: cfg } satisfies OpsContext} />
          </OpsSubNavSlotProvider>
        </Suspense>
      </div>
      <OpsToasts />
    </div>
  );
}
