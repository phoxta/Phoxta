import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { listMySubscriptions, type Subscription } from "@/lib/db/billing";
import { formatPrice } from "@/lib/db/marketplace";

const STATUS_STYLE: Record<Subscription["status"], string> = {
  trialing: "bg-neutral-100 neutral-700",
  active: "bg-success-subtle text-success",
  past_due: "bg-warning-subtle text-warning",
  canceled: "bg-neutral-100 neutral-500",
};

const PLANS = [
  { plan: "Starter", price: "$32/mo", note: "New businesses, small operators" },
  { plan: "Growth", price: "$79/mo", note: "Established small businesses" },
  { plan: "Scale", price: "$179/mo", note: "Growth-stage businesses" },
];

export default function BillingPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listMySubscriptions().then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error);
      setSubs(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <PageMeta title="Phoxta - Billing" />
      <div className="mb-4">
        <h2 className="fw-600 mb-1">Billing</h2>
        <p className="neutral-500 mb-0">Plans and subscriptions across your businesses.</p>
      </div>

      {error && (
        <div className="alert alert-warning py-2 px-3 fz-font-md" role="alert">
          {error}
        </div>
      )}

      <h5 className="fw-600 mb-3">Your subscriptions</h5>
      {loading ? (
        <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>
      ) : subs.length === 0 ? (
        <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center">
          <p className="neutral-500 mb-3">No active subscriptions yet. Each business you start includes a free trial.</p>
          <Link to="/dashboard/marketplace" className="at-btn">
            <span>
              <span className="text-1">Browse the marketplace</span>
              <span className="text-2">Browse the marketplace</span>
            </span>
          </Link>
        </div>
      ) : (
        <div className="bg-neutral-0 rounded-4 border-100 overflow-hidden mb-5">
          <table className="table mb-0 align-middle">
            <thead>
              <tr className="fz-font-sm neutral-500">
                <th className="fw-500 py-3 ps-4">Business</th>
                <th className="fw-500 py-3 text-capitalize">Plan</th>
                <th className="fw-500 py-3">Status</th>
                <th className="fw-500 py-3">Renews</th>
                <th className="fw-500 py-3 pe-4 text-end">Amount</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td className="py-3 ps-4 fw-600">{s.organizations?.name ?? "—"}</td>
                  <td className="py-3 text-capitalize">{s.plan}</td>
                  <td className="py-3">
                    <span className={`badge fw-500 text-capitalize ${STATUS_STYLE[s.status]}`}>{s.status.replace("_", " ")}</span>
                  </td>
                  <td className="py-3 fz-font-md neutral-500">
                    {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-3 pe-4 text-end fw-600">{formatPrice(s.amount_cents, s.currency)}/mo</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h5 className="fw-600 mb-3">Plans</h5>
      <div className="row g-3">
        {PLANS.map((p) => (
          <div key={p.plan} className="col-md-4">
            <div className="bg-neutral-0 rounded-4 p-4 h-100 border-100">
              <h6 className="fw-600 mb-1">{p.plan}</h6>
              <div className="fz-24 fw-700 lh-1 mb-2">{p.price}</div>
              <p className="fz-font-md neutral-500 mb-0">{p.note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
