import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { billingQuery } from "@/lib/cache/dashboardQueries";
import { type Subscription, type Purchase } from "@/lib/db/billing";
import { formatPrice } from "@/lib/db/marketplace";
import { listMyOrganizations } from "@/lib/db/organizations";
import { startSubscriptionCheckout, cancelSubscription, changePlan } from "@/lib/db/payments";
import { clearCachedData } from "@/lib/hooks/useCachedData";

const STATUS_STYLE: Record<Subscription["status"], string> = {
  trialing: "bg-neutral-100 neutral-700",
  active: "bg-success-subtle text-success",
  past_due: "bg-warning-subtle text-warning",
  canceled: "bg-neutral-100 neutral-500",
};

const PLANS: Array<{ key: "starter" | "growth" | "scale"; plan: string; price: string; note: string }> = [
  { key: "starter", plan: "Starter", price: "$75/mo", note: "New businesses, small operators" },
  { key: "growth", plan: "Growth", price: "$250/mo", note: "Established small businesses" },
  { key: "scale", plan: "Scale", price: "$1,500/mo", note: "Growth-stage businesses" },
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
  const { data, loading, error } = useCachedData(billingQuery.key, billingQuery.fetch);
  const subs = data?.subs ?? [];
  const purchases = data?.purchases ?? [];
  const aiUsage = data?.aiUsage ?? [];

  // Subscribe flow: pick which business the plan applies to, then Paystack.
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listMyOrganizations().then(({ data }) => {
      if (!active) return;
      const owned = data.filter((m) => m.role === "owner" || m.role === "admin").map((m) => m.organization);
      setOrgs(owned.map((o) => ({ id: o.id, name: o.name })));
      if (owned.length > 0) setSelectedOrg((prev) => prev || owned[0].id);
    });
    return () => {
      active = false;
    };
  }, []);

  async function onSubscribe(plan: "starter" | "growth" | "scale") {
    if (!selectedOrg) return;
    setSubscribeError(null);
    setSubscribing(plan);
    // If the business already runs on a live plan, this is a plan CHANGE —
    // the old Paystack subscription is disabled before the new checkout.
    const existing = subs.find((s) => s.organization_id === selectedOrg && s.status !== "canceled");
    const { url, error } = existing
      ? await changePlan(selectedOrg, plan)
      : await startSubscriptionCheckout(selectedOrg, plan);
    if (error || !url) {
      setSubscribing(null);
      setSubscribeError(error ?? "Could not start the checkout.");
      return;
    }
    window.location.assign(url);
  }

  const [cancelingId, setCancelingId] = useState<string | null>(null);
  async function onCancel(sub: Subscription) {
    const label = sub.organizations?.name ?? "this business";
    if (!window.confirm(`Cancel the ${sub.plan} plan for ${label}? The business keeps running until ${sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "the period ends"}, then billing stops.`)) return;
    setSubscribeError(null);
    setCancelingId(sub.id);
    const { ok, error } = await cancelSubscription(sub.organization_id);
    setCancelingId(null);
    if (!ok) {
      setSubscribeError(error ?? "Could not cancel — contact support.");
      return;
    }
    clearCachedData();
    window.location.reload();
  }

  return (
    <div>
      <PageMeta title="Phoxta - Billing" />
      <div className="dash-sticky-head pb-4">
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
          <p className="neutral-500 mb-3">No active subscriptions yet. Each business you own runs on a Phoxta plan.</p>
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
                <th className="fw-500 py-3 pe-4 text-end"><span className="visually-hidden">Actions</span></th>
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
                  <td className="py-3 pe-4 text-end">
                    {s.status !== "canceled" && (
                      <button
                        type="button"
                        className="btn btn-link p-0 fz-font-sm text-danger text-decoration-none"
                        disabled={cancelingId === s.id}
                        onClick={() => onCancel(s)}
                      >
                        {cancelingId === s.id ? "Canceling…" : "Cancel"}
                      </button>
                    )}
                  </td>
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

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h5 className="fw-600 mb-0">Plans</h5>
        {orgs.length > 1 && (
          <div className="d-flex align-items-center gap-2">
            <span className="fz-font-md neutral-500">For business:</span>
            <select
              className="form-select form-select-sm w-auto"
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              aria-label="Business to subscribe"
            >
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      {subscribeError && (
        <div className="alert alert-warning py-2 px-3 fz-font-md" role="alert">
          {subscribeError}
        </div>
      )}
      <div className="row g-3">
        {PLANS.map((p) => (
          <div key={p.plan} className="col-md-4">
            <div className="bg-neutral-0 rounded-4 p-4 h-100 border-100 d-flex flex-column">
              <h6 className="fw-600 mb-1">{p.plan}</h6>
              <div className="fz-24 fw-700 lh-1 mb-2">{p.price}</div>
              <p className="fz-font-md neutral-500 mb-3 flex-grow-1">{p.note}</p>
              {orgs.length > 0 ? (
                <button
                  type="button"
                  className="at-btn w-100 justify-content-center"
                  disabled={subscribing !== null}
                  onClick={() => onSubscribe(p.key)}
                >
                  <span>
                    <span className="text-1">{subscribing === p.key ? "Starting…" : `Choose ${p.plan}`}</span>
                    <span className="text-2">{subscribing === p.key ? "Starting…" : `Choose ${p.plan}`}</span>
                  </span>
                </button>
              ) : (
                <p className="fz-font-sm neutral-500 mb-0">Buy a business first — plans apply per business.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
