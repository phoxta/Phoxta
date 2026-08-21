import { Link, Navigate, useNavigate } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { organizationsQuery } from "@/lib/cache/dashboardQueries";

export const LAST_ORG_KEY = "phoxta:lastOrg";

/**
 * /dashboard/console — one-click entry into the operating console (the same
 * pick-a-business pattern as the Assistant page). Remembers the last business
 * you worked in and jumps straight there; shows a picker only when it has to.
 */
export default function ConsolePage() {
  const navigate = useNavigate();
  const { data: orgs = [], loading } = useCachedData(organizationsQuery.key, organizationsQuery.fetch);

  // Where to send you, if that is knowable: the business you last worked in, or
  // the only one you own.
  let last: string | null = null;
  try {
    last = localStorage.getItem(LAST_ORG_KEY);
  } catch {
    /* storage unavailable */
  }
  const target =
    (last && orgs.find((o) => o.organization.id === last)?.organization.id) ||
    (orgs.length === 1 ? orgs[0].organization.id : null);

  // Declarative, deliberately. This was an effect that set a `redirecting` flag
  // and never cleared it — and this page is kept alive, so <Activity mode=
  // "hidden"> preserved that flag between visits. Every visit after the first
  // found the flag still true, bailed out of the effect, and rendered "Opening
  // your console…" forever. A <Navigate> holds no state, so there is nothing to
  // get stuck: it recomputes and redirects on every showing.
  //
  // It also removes the flash. useCachedData returns warm data synchronously,
  // so on any visit after the cache fills, the first render IS the redirect and
  // the message is never painted at all.
  if (target) return <Navigate to={`/dashboard/businesses/${target}/ops`} replace />;

  if (loading) {
    return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Opening your console…</div>;
  }

  if (orgs.length === 0) {
    return (
      <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center">
        <PageMeta title="Phoxta - Console" />
        <p className="neutral-500 mb-3">The operating console runs a business — and you don&apos;t own one yet.</p>
        <Link to="/dashboard/marketplace" className="at-btn">
          <span>
            <span className="text-1">Browse the marketplace</span>
            <span className="text-2">Browse the marketplace</span>
          </span>
        </Link>
      </div>
    );
  }

  // Several businesses, no remembered one — pick.
  return (
    <div style={{ maxWidth: 560 }}>
      <PageMeta title="Phoxta - Console" />
      <h2 className="fw-600 mb-1">Operating console</h2>
      <p className="neutral-500 mb-4">Which business do you want to run?</p>
      <div className="d-flex flex-column gap-2">
        {orgs.map(({ organization: o, role }) => (
          <button
            key={o.id}
            type="button"
            className="bg-neutral-0 rounded-4 p-4 border-100 d-flex align-items-center justify-content-between text-start w-100"
            style={{ cursor: "pointer" }}
            onClick={() => {
              try {
                localStorage.setItem(LAST_ORG_KEY, o.id);
              } catch { /* fine */ }
              navigate(`/dashboard/businesses/${o.id}/ops`);
            }}
          >
            <span>
              <span className="fw-600 d-block">{o.name}</span>
              <span className="fz-font-sm neutral-500 text-capitalize">{o.vertical || "business"} · {role}</span>
            </span>
            <span aria-hidden="true">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
