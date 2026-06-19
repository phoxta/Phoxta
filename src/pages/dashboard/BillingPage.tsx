import { Link } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { listMySubscriptions, listMyPurchases, type Subscription, type Purchase } from "@/lib/db/billing";
import { listAiUsageThisMonth } from "@/lib/db/ai";
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

// Assistant cost is small per call — show cents precision (not rounded to $0).
function formatPriceCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(
    cents / 100,
  );
}

const PURCHASE_STYLE: Record<Purchase["status"], string> = {
  paid: "bg-success-subtle text-success",
  pending: "bg-neutral-100 neutral-700",
  refunded: "bg-neutral-100 neutral-500",
  failed: "bg-warning-subtle text-warning",
};

export default function BillingPage() {
  const { data, loading, error } = useCachedData("billing", async () => {
    const [s, p, a] = await Promise.all([listMySubscriptions(), listMyPurchases(), listAiUsageThisMonth()]);
    if (s.error) throw new Error(s.error);
    return { subs: s.data, purchases: p.data, aiUsage: a.data };
  });
  const subs = data?.subs ?? [];
  const purchases = data?.purchases ?? [];
  const aiUsage = data?.aiUsage ?? [];

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

      {!loading && purchases.length > 0 && (
        <>
          <h5 className="fw-600 mb-3">Purchases</h5>
          <div className="bg-neutral-0 rounded-4 border-100 overflow-hidden mb-5">
            <table className="table mb-0 align-middle">
              <thead>
                <tr className="fz-font-sm neutral-500">
                  <th className="fw-500 py-3 ps-4">Date</th>
                  <th className="fw-500 py-3">Business</th>
                  <th className="fw-500 py-3">Status</th>
                  <th className="fw-500 py-3 pe-4 text-end">Amount</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 ps-4 fz-font-md neutral-500">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="py-3 fw-600">{p.blueprints?.name ?? p.organizations?.name ?? "Business"}</td>
                    <td className="py-3">
                      <span className={`badge fw-500 text-capitalize ${PURCHASE_STYLE[p.status]}`}>{p.status}</span>
                    </td>
                    <td className="py-3 pe-4 text-end fw-600">{formatPrice(p.amount_cents, p.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && aiUsage.length > 0 && (
        <>
          <h5 className="fw-600 mb-3">Assistant usage this month</h5>
          <div className="bg-neutral-0 rounded-4 border-100 overflow-hidden mb-5">
            <table className="table mb-0 align-middle">
              <thead>
                <tr className="fz-font-sm neutral-500">
                  <th className="fw-500 py-3 ps-4">Business</th>
                  <th className="fw-500 py-3 text-end">Tokens</th>
                  <th className="fw-500 py-3 pe-4 text-end">Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {aiUsage.map((u) => (
                  <tr key={u.orgId}>
                    <td className="py-3 ps-4 fw-600">{u.orgName}</td>
                    <td className="py-3 text-end fz-font-md neutral-700">{u.tokens.toLocaleString()}</td>
                    <td className="py-3 pe-4 text-end fw-600">{formatPriceCents(u.costCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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
