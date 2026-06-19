import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { getBusiness, type Organization } from "@/lib/db/organizations";
import { resolveConsole, consoleTabs, type VerticalConsole } from "@/lib/ops/consoleConfig";
import { preloadOpsConsole, preloadOpsTab } from "@/pages/dashboard/preload";

export type OpsContext = { orgId: string; org: Organization; console: VerticalConsole };

export default function OperatingLayout() {
  const { id } = useParams();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  // Warm every console tab's chunk on idle so switching tabs is instant, even
  // when a user deep-links straight into the console.
  useEffect(() => {
    preloadOpsConsole();
  }, []);

  useEffect(() => {
    if (!id) return;
    let active = true;
    getBusiness(id).then(({ data }) => {
      if (active) {
        setOrg(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;
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
      <div className="mb-3">
        <Link to={`/dashboard/businesses/${id}`} className="fz-font-md neutral-500 text-decoration-none">
          ← {org.name}
        </Link>
      </div>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
        <h2 className="fw-600 mb-0 me-2">Operating console</h2>
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
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Outlet context={{ orgId: id, org, console: cfg } satisfies OpsContext} />
    </div>
  );
}
