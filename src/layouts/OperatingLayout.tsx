import { Suspense, useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { getBusiness, type Organization } from "@/lib/db/organizations";
import { resolveConsole, consoleTabs, type VerticalConsole } from "@/lib/ops/consoleConfig";
import { preloadOpsConsole, preloadOpsTab } from "@/pages/dashboard/preload";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL, domainsQuery, organizationsQuery, primaryLiveDomain } from "@/lib/cache/dashboardQueries";
import { LAST_ORG_KEY } from "@/pages/dashboard/ConsolePage";
import { OpsToasts } from "@/lib/ops/feedback";
import { supabase } from "@/lib/supabaseClient";
import { OpsSubNavSlotProvider } from "@/layouts/OpsSubNav";
import { useFillToPane } from "@/lib/hooks/useFillToPane";

export type OpsContext = { orgId: string; org: Organization; console: VerticalConsole };

/** Attention counts surfaced as pills on the Inbox / AI Agent tabs. */
type TabBadges = { unread: number; approvals: number };

export default function OperatingLayout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // A console tab's own sub-nav is portalled into the header block below, so
  // there is one pinned element and no offset to measure. See OpsSubNav.
  const [subSlot, setSubSlot] = useState<HTMLDivElement | null>(null);
  // The console fills the shell's pane so its chrome can sit still and only the
  // tab content scrolls. Must be called before the loading/error early returns
  // below — a hook that runs only on the loaded branch changes the hook count
  // between renders. Below the thresholds it returns null and the page falls
  // back to scrolling as a whole, which is right on a phone.
  const { ref: fillRef, fit } = useFillToPane({ minWidth: 992, minHeight: 480 });
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

  if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;
  if (loadError)
    return (
      <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center">
        <p className="neutral-700 mb-3">Couldn't load this business — {loadError}</p>
        <button type="button" className="btn btn-dark btn-sm rounded-3" onClick={() => setRetryTick((n) => n + 1)}>
          Retry
        </button>
        <div className="mt-3">
          <Link to="/dashboard/businesses" className="fz-font-md neutral-500 text-decoration-none">
            ← Back to businesses
          </Link>
        </div>
      </div>
    );
  if (!org || !id)
    return (
      <div>
        <p className="neutral-500">Business not found.</p>
        <Link to="/dashboard/businesses" className="fw-600 text-decoration-none">
          ← Back to businesses
        </Link>
      </div>
    );

  const base = `/dashboard/businesses/${id}/ops`;
  const cfg = resolveConsole(org.vertical);
  const tabs = consoleTabs(cfg);
  // Prefer the resolved primary live domain; fall back to the manual override.
  const liveDomain = primaryLiveDomain(domains);
  const liveUrl = liveDomain ? `https://${liveDomain.hostname}` : org.site_url || null;

  return (
    <div ref={fillRef} className={`ops-console${fit ? " pinned" : ""}`} style={fit ?? undefined}>
      <PageMeta title={`Phoxta - ${org.name} operations`} />
      {/* Console chrome — breadcrumb, business title and the tab bar. It sits
          OUTSIDE the scrolling region rather than sticking to the top of it, so
          the header and tabs simply do not move: only the active tab's content
          scrolls, in its own box below.

          .dash-sticky-head still carries the opaque background and spacing that
          every pinned block shares; .ops-console.pinned turns off the sticky
          offsets, which exist to hide content passing underneath and have
          nothing to hide once nothing passes. */}
      <div className="dash-sticky-head pb-4">
        <div className="mb-2 d-flex flex-wrap align-items-center gap-2">
          <Link to={`/dashboard/businesses/${id}`} className="fz-font-sm neutral-500 text-decoration-none">
            ← Business details
          </Link>
          {liveUrl ? (
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="fz-font-sm fw-600 text-decoration-none"
            >
              View live site ↗
            </a>
          ) : (
            <Link to={`/dashboard/businesses/${id}`} className="fz-font-sm neutral-500 text-decoration-none">
              Not live yet — set up your domain
            </Link>
          )}
        </div>
        {/* The business being operated is the headline — "Operating console" is a
            constant that carries no information once you are inside it, and on a
            phone it was costing most of the first screen. */}
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <h1 className="fw-600 mb-0 me-1 fz-font-2xl lh-1 neutral-900">{org.name}</h1>
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
          {org.vertical && <span className="badge bg-neutral-900 text-white text-capitalize fw-500">{org.vertical}</span>}
          <span className="badge bg-neutral-100 neutral-700 text-capitalize fw-500">{org.stage}</span>
        </div>

        {/* One scrollable line rather than four wrapped rows on a phone.
            mb-0 here (the gap below now comes from the sticky wrapper) so the tab
            bar's bottom border sits flush against the pinned block's edge. */}
        <nav className="mb-0 border-bottom ops-tabs" aria-label="Console sections">
          <ul className="list-unstyled m-0 d-flex gap-1">
            {tabs.map((t) => (
              <li key={t.seg}>
                <NavLink
                  to={t.seg ? `${base}/${t.seg}` : base}
                  end={t.end}
                  onMouseEnter={() => preloadOpsTab(t.seg)}
                  className={({ isActive }) =>
                    `d-inline-block px-3 py-2 fz-font-md text-decoration-none border-bottom border-2 ${
                      isActive ? "neutral-900 fw-600 border-dark" : "neutral-500 border-transparent"
                    }`
                  }
                >
                  {t.label}
                  {badgeFor(t.seg) > 0 && (
                    <span
                      className={`badge rounded-pill ms-1 fz-font-sm ${
                        t.seg === "inbox" ? "bg-danger text-white" : "bg-warning text-dark"
                      }`}
                    >
                      {badgeFor(t.seg)}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        {/* A tab's second-level nav lands here — inside the pinned block. */}
        <div ref={setSubSlot} />
      </div>

      {/* The only scrolling region on the console. */}
      <div className="ops-content">
        <Suspense fallback={<div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>}>
          <OpsSubNavSlotProvider value={subSlot}>
            <Outlet context={{ orgId: id, org, console: cfg } satisfies OpsContext} />
          </OpsSubNavSlotProvider>
        </Suspense>
      </div>
      <OpsToasts />
    </div>
  );
}
