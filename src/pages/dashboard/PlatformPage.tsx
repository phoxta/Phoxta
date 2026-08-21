import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { organizationsQuery } from "@/lib/cache/dashboardQueries";

/**
 * /dashboard/platform — a shortcut, not a second console.
 *
 * Phoxta is a business like any other now (0092 promoted the org that already
 * owned the website agent key, rather than creating a second one and splitting
 * its inbox and CRM). So everything for running the platform lives where every
 * other business is run: /dashboard/businesses/<phoxta>/ops, with a Platform tab
 * for the cross-tenant numbers no tenant console can answer.
 *
 * This page existed first and rendered those same numbers standalone, which left
 * two doors into one room — two places to fix a bug, two places to drift. It now
 * forwards, the same way /dashboard/console does.
 */
export default function PlatformPage() {
  const navigate = useNavigate();
  const { data: orgs = [], loading } = useCachedData(organizationsQuery.key, organizationsQuery.fetch);

  const platform = orgs.find((o) => (o.organization.vertical || "").toLowerCase() === "platform");

  useEffect(() => {
    if (loading || !platform) return;
    navigate(`/dashboard/businesses/${platform.organization.id}/ops/platform`, { replace: true });
  }, [loading, platform, navigate]);

  if (loading) {
    return (
      <>
        <PageMeta title="Phoxta - Platform" />
        <div className="container py-5"><p className="neutral-500">Opening the platform console…</p></div>
      </>
    );
  }

  // No platform organization on this account — say so plainly rather than
  // rendering an empty console that looks broken.
  return (
    <>
      <PageMeta title="Phoxta - Platform" />
      <div className="container py-5">
        <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center">
          <h1 className="fw-600 mb-2" style={{ fontSize: 22 }}>Platform console</h1>
          <p className="neutral-500 mb-3">
            This account isn't a member of the Phoxta platform business, so there's nothing to open here.
          </p>
          <Link className="btn btn-dark btn-sm rounded-pill px-3" to="/dashboard/businesses">Your businesses</Link>
        </div>
      </div>
    </>
  );
}
