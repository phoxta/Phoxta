import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast, toastError } from "@/lib/ops/feedback";
import {
  fetchPlatformOverview,
  fetchPlatformTenants,
  fetchPlatformRevenue,
  fetchPlatformAdmins,
  addPlatformAdmin,
  removePlatformAdmin,
  type PlatformOverview,
  type PlatformTenant,
  type PlatformPurchase,
  type PlatformAdmin,
} from "@/lib/db/platform";

/**
 * The Platform module — Phoxta's own business, inside the same console every
 * tenant uses.
 *
 * The other tabs here (Inbox, CRM, Marketing, Invoicing, AI Agent, Settings)
 * already work for Phoxta now that it is a real organization: prospects land in
 * the Inbox, customers in the CRM, the website assistant is its agent. What no
 * tenant console can answer is the cross-tenant question — how many customers,
 * what sold, who is burning tokens — so that lives here.
 *
 * Every read is gated server-side on app_is_platform_admin(). Hiding the tab is
 * presentation; the RPCs are the control.
 */

const money = (cents: number, ccy = "USD") => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(0)}`;
  }
};
const num = (n: number) => new Intl.NumberFormat().format(n);
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

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

export default function OpsPlatformPage() {
  const [ov, setOv] = useState<PlatformOverview | null>(null);
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [revenue, setRevenue] = useState<PlatformPurchase[]>([]);
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadAdmins() {
    const a = await fetchPlatformAdmins();
    setAdmins(a.data);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const o = await fetchPlatformOverview();
      if (!active) return;
      if (!o.data) { setDenied(true); setLoading(false); return; }
      setOv(o.data);
      const [t, r, a] = await Promise.all([fetchPlatformTenants(), fetchPlatformRevenue(), fetchPlatformAdmins()]);
      if (!active) return;
      setTenants(t.data);
      setRevenue(r.data);
      setAdmins(a.data);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  async function submitAdmin(e: FormEvent) {
    e.preventDefault();
    const email = adminEmail.trim();
    if (!email || busy) return;
    setBusy(true);
    const r = await addPlatformAdmin(email);
    setBusy(false);
    if (!r.ok) { toastError(r.error ?? "Could not add that admin."); return; }
    setAdminEmail("");
    toast(`${email} can now open the platform console.`);
    loadAdmins();
  }

  async function drop(a: PlatformAdmin) {
    if (busy) return;
    setBusy(true);
    const r = await removePlatformAdmin(a.user_id);
    setBusy(false);
    if (!r.ok) { toastError(r.error ?? "Could not remove that admin."); return; }
    toast(`${a.email} no longer has platform access.`);
    loadAdmins();
  }

  if (loading) return <p className="neutral-500">Loading platform data…</p>;

  if (denied) {
    return (
      <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center">
        <h2 className="fw-600 mb-2" style={{ fontSize: 20 }}>Platform</h2>
        <p className="neutral-500 mb-0">
          This module is for Phoxta platform administrators. Your account isn't on that list.
        </p>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-4">
      {ov && (
        <div className="row g-3">
          <Stat label="Customers" value={num(ov.tenants_total)} sub={`${num(ov.tenants_active)} active · ${num(ov.tenants_new_30d)} new in 30d`} />
          <Stat label="Revenue (all time)" value={money(ov.revenue_cents)} sub={`${money(ov.revenue_30d_cents)} in the last 30 days`} />
          <Stat label="Active subscriptions" value={num(ov.subs_active)} sub={`${num(ov.purchases_total)} purchases total`} />
          <Stat label="Leads" value={num(ov.leads_total)} sub={`${num(ov.leads_new_30d)} in the last 30 days`} />
          <Stat label="Blueprints live" value={num(ov.blueprints_live)} sub="buyable right now" />
          <Stat label="Custom domains live" value={num(ov.domains_live)} />
          <Stat label="AI tokens (30d)" value={num(ov.ai_tokens_30d)} sub="across all tenants" />
        </div>
      )}

      {/* ── Customers ───────────────────────────────────────────────────── */}
      <div className="bg-neutral-0 rounded-4 p-4 border-100">
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

      {/* ── Purchases ───────────────────────────────────────────────────── */}
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

      {/* ── Who can open this ───────────────────────────────────────────── */}
      <div className="bg-neutral-0 rounded-4 p-4 border-100">
        <h2 className="fw-600 mb-1" style={{ fontSize: 18 }}>Platform access</h2>
        <p className="neutral-500 fz-font-md mb-3">
          These accounts can see every customer's revenue, usage and domains. Add sparingly.
        </p>

        <form onSubmit={submitAdmin} className="d-flex gap-2 flex-wrap mb-3">
          <input
            className="form-control rounded-3"
            style={{ maxWidth: 320 }}
            type="email"
            placeholder="teammate@phoxta.com"
            aria-label="Email of the admin to add"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
          />
          <button className="btn btn-dark btn-sm rounded-pill px-3" disabled={busy || !adminEmail.trim()}>
            {busy ? "…" : "Add admin"}
          </button>
        </form>

        <ul className="list-unstyled m-0 d-flex flex-column gap-2">
          {admins.map((a) => (
            <li key={a.user_id} className="d-flex align-items-center gap-3 flex-wrap">
              <span className="fw-600 fz-font-md">{a.email}</span>
              <span className="badge bg-neutral-100 neutral-700 fw-500">{a.note || "admin"}</span>
              <span className="neutral-500 fz-font-sm">since {day(a.created_at)}</span>
              <button
                type="button"
                className="btn btn-sm btn-outline-dark rounded-pill px-3 ms-auto"
                disabled={busy}
                onClick={() => drop(a)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
