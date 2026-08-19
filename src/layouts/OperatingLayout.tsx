import { Suspense, useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { getBusiness, type Organization } from "@/lib/db/organizations";
import { resolveConsole, consoleTabs, type VerticalConsole } from "@/lib/ops/consoleConfig";
import { preloadOpsConsole, preloadOpsTab } from "@/pages/dashboard/preload";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { organizationsQuery } from "@/lib/cache/dashboardQueries";
import { LAST_ORG_KEY } from "@/pages/dashboard/ConsolePage";
import { OpsToasts } from "@/lib/ops/feedback";
import { supabase } from "@/lib/supabaseClient";

export type OpsContext = { orgId: string; org: Organization; console: VerticalConsole };

/** Attention counts surfaced as pills on the Inbox / AI Agent tabs. */
type TabBadges = { unread: number; approvals: number };

export default function OperatingLayout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [badges, setBadges] = useState<TabBadges>({ unread: 0, approvals: 0 });
  // All the user's businesses, for the in-console switcher (shared warmed cache).
  const { data: myOrgs = [] } = useCachedData(organizationsQuery.key, organizationsQuery.fetch);

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

  return (
    <div>
      <PageMeta title={`Phoxta - ${org.name} operations`} />
      <div className="mb-3 d-flex flex-wrap align-items-center gap-2">
        <Link to={`/dashboard/businesses/${id}`} className="fz-font-md neutral-500 text-decoration-none">
          ← {org.name}
        </Link>
        {org.site_url && (
          <a
            href={org.site_url}
            target="_blank"
            rel="noreferrer"
            className="fz-font-md fw-600 text-decoration-none"
          >
            View live site ↗
          </a>
        )}
      </div>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
        <h2 className="fw-600 mb-0 me-2">Operating console</h2>
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

      <nav className="mb-4 border-bottom">
        <ul className="list-unstyled m-0 d-flex flex-wrap gap-1">
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

      <Suspense fallback={<div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>}>
        <Outlet context={{ orgId: id, org, console: cfg } satisfies OpsContext} />
      </Suspense>
      <OpsToasts />
    </div>
  );
}
