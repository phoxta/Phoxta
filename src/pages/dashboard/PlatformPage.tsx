import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { organizationsQuery } from "@/lib/cache/dashboardQueries";
import { PageHeader, Empty } from "@/components/dash/Ui";

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

const CSS = `
.plx-wait{display:flex;align-items:center;gap:12px;background:var(--hrx-soft);border:1px solid var(--hrx-border);border-radius:16px;padding:22px 24px;}
.plx-wait p{margin:0;font-size:15px;color:var(--hrx-muted);}
.plx-spin{width:22px;height:22px;border-radius:999px;border:2px solid var(--hrx-border);border-top-color:var(--hrx-blue);flex-shrink:0;animation:plx-rotate .8s linear infinite;}
@keyframes plx-rotate{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion: reduce){.plx-spin{animation:none;border-top-color:var(--hrx-border);}}
`;

const ICON_BUILDING = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 9h.01M9 12h.01M9 15h.01M15 9h.01M15 12h.01M15 15h.01" />
  </svg>
);

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
        <style>{CSS}</style>
        <div className="d-flex flex-column" style={{ gap: 8 }}>
          <PageHeader crumb="Portal" title="Platform" note="Cross-tenant numbers live in the Phoxta business console — taking you there." />
          <div className="plx-wait" role="status" aria-live="polite">
            <span className="plx-spin" aria-hidden="true" />
            <p>Opening the platform console…</p>
          </div>
        </div>
      </>
    );
  }

  // No platform organization on this account — say so plainly rather than
  // rendering an empty console that looks broken.
  return (
    <>
      <PageMeta title="Phoxta - Platform" />
      <style>{CSS}</style>
      <div className="d-flex flex-column" style={{ gap: 8 }}>
        <PageHeader
          crumb="Portal"
          title="Platform"
          note="The platform console lives inside the Phoxta business, alongside every other console."
          stat={{ label: "Your businesses", value: orgs.length }}
        />
        <Empty
          icon={ICON_BUILDING}
          title="Platform console"
          action={<Link className="hrx-pill dark" to="/dashboard/businesses">Your businesses</Link>}
        >
          This account isn&rsquo;t a member of the Phoxta platform business, so there&rsquo;s nothing to open here.
        </Empty>
      </div>
    </>
  );
}
