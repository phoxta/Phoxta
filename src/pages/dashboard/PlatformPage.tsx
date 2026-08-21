import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import {
  fetchPlatformOverview,
  fetchPlatformTenants,
  fetchPlatformRevenue,
  type PlatformOverview,
  type PlatformTenant,
  type PlatformPurchase,
} from "@/lib/db/platform";

/**
 * /dashboard/platform — the operating console for Phoxta itself.
 *
 * The per-business console at /dashboard/businesses/:id/ops manages ONE tenant;
 * every table behind it is RLS-scoped to that organization. Running the platform
 * asks the opposite kind of question — how many customers, what sold, who is
 * churning, what is the AI costing — and nothing in the app could answer it.
 * /dashboard/console only picks a business and redirects into its console.
 *
 * Reads go through the platform RPCs (0090), which check admin membership
 * server-side. A non-admin sees the "not available" state rather than zeroes,
 * because a confident 0 is worse than an honest nothing.
 */

const money = (cents: number, ccy = "USD") => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(0)}`;
  }
};

const num = (n: number) => new Intl.NumberFormat().format(n);

const day = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/** Big number + label, matching the dashboard's card idiom. */
function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="col-lg-3 col-md-4 col-6">
      <div className="bg-neutral-0 rounded-4 p-4 h-100 border-100">
        <div className="neutral-500 fz-font-sm mb-1">{label}</div>
        <div className="fw-600" style={{ fontSize: 26, lineHeight: 1.15 }}>{value}</div>
        {sub && <div className="neutral-500 fz-font-sm mt-1">{sub}</div>}
      </div>
    </div>
  );
}

export default function PlatformPage() {
  const [ov, setOv] = useState<PlatformOverview | null>(null);
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [revenue, setRevenue] = useState<PlatformPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const o = await fetchPlatformOverview();
      if (!active) return;
      if (o.error) { setError(o.error); setLoading(false); return; }
      if (!o.data) { setDenied(true); setLoading(false); return; }
      setOv(o.data);
      const [t, r] = await Promise.all([fetchPlatformTenants(), fetchPlatformRevenue()]);
      if (!active) return;
      setTenants(t.data);
      setRevenue(r.data);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <>
        <PageMeta title="Phoxta - Platform console" />
        <div className="container py-5"><p className="neutral-500">Loading platform data…</p></div>
      </>
    );
  }

  if (denied) {
    return (
      <>
        <PageMeta title="Phoxta - Platform console" />
        <div className="container py-5">
          <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center">
            <h1 className="fw-600 mb-2" style={{ fontSize: 22 }}>Platform console</h1>
            <p className="neutral-500 mb-0">
              This console is for Phoxta platform administrators. Your account isn't on that list.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="Phoxta - Platform console" />
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
          <div>
            <h1 className="fw-600 mb-1" style={{ fontSize: 24 }}>Platform console</h1>
            <p className="neutral-500 mb-0 fz-font-md">Phoxta's own business — across every tenant.</p>
          </div>
          <Link className="btn btn-dark btn-sm rounded-pill px-3" to="/dashboard/businesses">Your businesses</Link>
        </div>

        {error && <div className="alert alert-warning py-2 px-3 fz-font-md">{error}</div>}

        {ov && (
          <div className="row g-3 mb-4">
            <Stat label="Customers" value={num(ov.tenants_total)} sub={`${num(ov.tenants_active)} active · ${num(ov.tenants_new_30d)} new in 30d`} />
            <Stat label="Revenue (all time)" value={money(ov.revenue_cents)} sub={`${money(ov.revenue_30d_cents)} in the last 30 days`} />
            <Stat label="Active subscriptions" value={num(ov.subs_active)} sub={`${num(ov.purchases_total)} purchases total`} />
            <Stat label="Leads" value={num(ov.leads_total)} sub={`${num(ov.leads_new_30d)} in the last 30 days`} />
            <Stat label="Blueprints live" value={num(ov.blueprints_live)} sub="buyable right now" />
            <Stat label="Custom domains live" value={num(ov.domains_live)} />
            <Stat label="AI tokens (30d)" value={num(ov.ai_tokens_30d)} sub="across all tenants" />
          </div>
        )}

        {/* ── Customers ─────────────────────────────────────────────────── */}
        <div className="bg-neutral-0 rounded-4 p-4 border-100 mb-4">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="fw-600 mb-0" style={{ fontSize: 18 }}>Customers</h2>
            <span className="badge bg-neutral-100 neutral-700 fw-500">{tenants.length}</span>
          </div>
          {tenants.length === 0 ? (
            <p className="neutral-500 mb-0 fz-font-md">No customers yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0 fz-font-md">
                <thead>
                  <tr className="neutral-500 fz-font-sm">
                    <th>Business</th><th>Vertical</th><th>Stage</th><th>Plan</th>
                    <th className="text-end">Domains</th><th className="text-end">AI tokens 30d</th><th>Joined</th><th />
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id}>
                      <td className="fw-600">{t.name}</td>
                      <td className="neutral-500 text-capitalize">{t.vertical || "—"}</td>
                      <td><span className="badge bg-neutral-100 neutral-700 text-capitalize fw-500">{t.stage}</span></td>
                      <td className="text-capitalize">{t.plan ? `${t.plan}${t.sub_status && t.sub_status !== "active" ? ` (${t.sub_status})` : ""}` : "—"}</td>
                      <td className="text-end">{t.domains_live}</td>
                      <td className="text-end">{num(t.tokens_30d)}</td>
                      <td className="neutral-500">{day(t.created_at)}</td>
                      <td className="text-end">
                        <Link className="btn btn-dark btn-sm rounded-pill px-3" to={`/dashboard/businesses/${t.id}/ops`}>Open</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Revenue ───────────────────────────────────────────────────── */}
        <div className="bg-neutral-0 rounded-4 p-4 border-100">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="fw-600 mb-0" style={{ fontSize: 18 }}>Purchases</h2>
            <span className="badge bg-neutral-100 neutral-700 fw-500">{revenue.length}</span>
          </div>
          {revenue.length === 0 ? (
            <p className="neutral-500 mb-0 fz-font-md">No purchases yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0 fz-font-md">
                <thead>
                  <tr className="neutral-500 fz-font-sm">
                    <th>Blueprint</th><th>Customer</th><th>Status</th><th className="text-end">Amount</th><th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.map((p) => (
                    <tr key={p.id}>
                      <td className="fw-600">{p.blueprint_name || "—"}</td>
                      <td className="neutral-500">{p.org_name || "—"}</td>
                      <td><span className="badge bg-neutral-100 neutral-700 text-capitalize fw-500">{p.status}</span></td>
                      <td className="text-end">{money(p.amount_cents, p.currency)}</td>
                      <td className="neutral-500">{day(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
