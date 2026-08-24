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
import { PageHeader, Card, StatTile, Chip, stageTone, Empty } from "@/components/dash/Ui";

const PLANS: Array<{ key: "starter" | "growth" | "scale"; plan: string; price: string; note: string }> = [
  { key: "starter", plan: "Starter", price: "£75/mo", note: "New businesses, small operators" },
  { key: "growth", plan: "Growth", price: "£250/mo", note: "Established small businesses" },
  { key: "scale", plan: "Scale", price: "£1,500/mo", note: "Growth-stage businesses" },
];

// Assistant cost is small per call — show cents precision (not rounded to £0).
function formatPriceCents(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(
    cents / 100,
  );
}

/** Subscription statuses have two states stageTone doesn't cover. */
function subTone(status: Subscription["status"]): "ok" | "warn" | "blue" | "danger" | "plain" {
  if (status === "trialing") return "blue";
  if (status === "past_due") return "warn";
  return stageTone(status);
}

function purchaseTone(status: Purchase["status"]): "ok" | "warn" | "blue" | "danger" | "plain" {
  if (status === "pending") return "warn";
  return stageTone(status);
}

/** Segment colours for the per-business usage bar (theme palette, cycled). */
const SEG_COLORS = ["#195ce5", "#fe5f2b", "#1246b0", "#facb5c", "#272727", "#ff934f"];

const CSS = `
.blx-cancel{color:#dc2626;border-color:#f0c1c1;background:transparent}
.blx-cancel:hover{background:#dc2626;border-color:#dc2626;color:#fff}
.blx-cancel:disabled{opacity:.55;pointer-events:none}
.blx-cta:disabled{opacity:.55;cursor:not-allowed}
.blx-plan{border:1px solid var(--hrx-border-soft);border-radius:16px;background:var(--hrx-soft);padding:18px;height:100%;display:flex;flex-direction:column}
.blx-plan.current{border-color:var(--hrx-blue);background:#fff}
.blx-plan .nm{font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px;margin:0}
.blx-plan .pr{font-size:28px;font-weight:600;letter-spacing:-0.03em;line-height:1;margin:10px 0 8px}
.blx-plan .nt{font-size:13px;color:var(--hrx-muted);margin:0 0 16px;flex-grow:1}
.blx-legend{display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:10px}
.blx-legend .it{display:inline-flex;align-items:center;gap:7px;font-size:13px;color:var(--hrx-muted)}
.blx-dot{width:10px;height:10px;border-radius:999px;display:inline-block;flex-shrink:0}
.blx-note{font-size:13px;color:var(--hrx-muted);margin:0}
`;

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
    // A business already on a live plan is CHANGING plan. Stripe amends the
    // subscription in place and prorates, so there is nothing to pay now and no
    // checkout to send anyone to — treat "no URL" as success, not failure.
    const existing = subs.find((s) => s.organization_id === selectedOrg && s.status !== "canceled");
    if (existing) {
      const { url, changed, error } = await changePlan(selectedOrg, plan);
      if (error) {
        setSubscribing(null);
        setSubscribeError(error);
        return;
      }
      if (changed) {
        setSubscribing(null);
        // Stripe's webhook writes the new plan, so re-read rather than guess at
        // it — the same refresh cancelling already does.
        clearCachedData();
        window.location.reload();
        return;
      }
      if (url) window.location.assign(url);
      else {
        setSubscribing(null);
        setSubscribeError("Could not start the checkout.");
      }
      return;
    }

    const { url, error } = await startSubscriptionCheckout(selectedOrg, plan);
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

  // Presentation-only aggregates of the fetched rows.
  const activeSubs = subs.filter((s) => s.status !== "canceled");
  const monthlyCents = activeSubs.reduce((sum, s) => sum + s.amount_cents, 0);
  const planCurrency = activeSubs[0]?.currency ?? "GBP";
  const aiTokens = aiUsage.reduce((sum, u) => sum + u.tokens, 0);
  const aiCostCents = aiUsage.reduce((sum, u) => sum + u.costCents, 0);
  // Which plan the selected business is on, so the plan grid can flag it.
  const currentPlan = subs.find((s) => s.organization_id === selectedOrg && s.status !== "canceled")?.plan ?? null;

  return (
    <div>
      <style>{CSS}</style>
      <PageMeta title="Phoxta - Billing" />
      <PageHeader
        crumb="Portal"
        title="Billing"
        note="Plans and subscriptions across your businesses."
        actions={
          <Link to="/dashboard/marketplace" className="hrx-pill">
            Browse marketplace
          </Link>
        }
        stat={{ label: "Monthly plan spend", value: loading ? "—" : `${formatPrice(monthlyCents, planCurrency)}/mo` }}
      />

      <div className="d-flex flex-column gap-2 mt-2">
        {error && (
          <div className="alert alert-warning py-2 px-3 mb-0" role="alert">
            {error}
          </div>
        )}
        {subscribeError && (
          <div className="alert alert-warning py-2 px-3 mb-0" role="alert">
            {subscribeError}
          </div>
        )}

        {!loading && (
          <div className="hrx-statrow">
            <StatTile tone="dark" label="Monthly plan spend" value={`${formatPrice(monthlyCents, planCurrency)}/mo`} />
            <StatTile label="Active subscriptions" value={activeSubs.length} />
            <StatTile tone="blue" label="Assistant spend (month)" value={formatPriceCents(aiCostCents)} />
            <StatTile tone="soft" label="Assistant tokens (month)" value={aiTokens.toLocaleString()} />
          </div>
        )}

        <Card title="Subscriptions" pad>
          {loading ? (
            <p className="blx-note text-center py-4 mb-0" role="status">Loading…</p>
          ) : subs.length === 0 ? (
            <Empty
              title="No active subscriptions yet"
              action={
                <Link to="/dashboard/marketplace" className="hrx-pill primary">
                  Browse the marketplace
                </Link>
              }
            >
              Each business you own runs on a Phoxta plan.
            </Empty>
          ) : (
            <div className="hrx-tablewrap">
              <table className="hrx-table">
                <thead>
                  <tr>
                    <th scope="col">Business</th>
                    <th scope="col">Plan</th>
                    <th scope="col">Status</th>
                    <th scope="col">Renews</th>
                    <th scope="col" className="text-end">Amount</th>
                    <th scope="col" className="text-end"><span className="visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s) => (
                    <tr key={s.id}>
                      <td className="fw-semibold">{s.organizations?.name ?? "—"}</td>
                      <td className="text-capitalize">{s.plan}</td>
                      <td>
                        <Chip tone={subTone(s.status)}>{s.status.replace("_", " ")}</Chip>
                      </td>
                      <td style={{ color: "var(--hrx-muted)" }}>
                        {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "—"}
                      </td>
                      <td className="text-end fw-semibold">{formatPrice(s.amount_cents, s.currency)}/mo</td>
                      <td className="text-end">
                        {s.status !== "canceled" && (
                          <button
                            type="button"
                            className="hrx-seeall blx-cancel"
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
        </Card>

        {!loading && purchases.length > 0 && (
          <Card title="Purchases" pad>
            <div className="hrx-tablewrap">
              <table className="hrx-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Business</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-end">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p.id}>
                      <td style={{ color: "var(--hrx-muted)" }}>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="fw-semibold">{p.blueprints?.name ?? p.organizations?.name ?? "Business"}</td>
                      <td>
                        <Chip tone={purchaseTone(p.status)}>{p.status}</Chip>
                      </td>
                      <td className="text-end fw-semibold">{formatPrice(p.amount_cents, p.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {!loading && aiUsage.length > 0 && (
          <Card
            title="Assistant usage this month"
            right={<span className="blx-note">{aiTokens.toLocaleString()} tokens · {formatPriceCents(aiCostCents)}</span>}
            pad
          >
            {aiTokens > 0 && (
              <>
                <div className="hrx-segbar mb-1" aria-hidden="true">
                  {aiUsage.map((u, i) => (
                    <div
                      key={u.orgId}
                      className="hrx-seg"
                      style={{ flexGrow: Math.max(u.tokens, 1), backgroundColor: SEG_COLORS[i % SEG_COLORS.length] }}
                    />
                  ))}
                </div>
                <div className="blx-legend" aria-hidden="true">
                  {aiUsage.map((u, i) => (
                    <span key={u.orgId} className="it">
                      <span className="blx-dot" style={{ backgroundColor: SEG_COLORS[i % SEG_COLORS.length] }} />
                      {u.orgName}
                    </span>
                  ))}
                </div>
              </>
            )}
            <div className="hrx-tablewrap mt-3">
              <table className="hrx-table">
                <thead>
                  <tr>
                    <th scope="col">Business</th>
                    <th scope="col" className="text-end">Tokens</th>
                    <th scope="col" className="text-end">Est. cost</th>
                  </tr>
                </thead>
                <tbody>
                  {aiUsage.map((u) => (
                    <tr key={u.orgId}>
                      <td className="fw-semibold">{u.orgName}</td>
                      <td className="text-end" style={{ color: "var(--hrx-muted)" }}>{u.tokens.toLocaleString()}</td>
                      <td className="text-end fw-semibold">{formatPriceCents(u.costCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Card
          title="Plans"
          right={
            orgs.length > 1 ? (
              <div className="d-flex align-items-center gap-2">
                <span className="blx-note">For business:</span>
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
            ) : undefined
          }
          pad
        >
          <div className="row g-2">
            {PLANS.map((p) => (
              <div key={p.plan} className="col-md-4">
                <div className={`blx-plan${currentPlan === p.key ? " current" : ""}`}>
                  <h3 className="nm">
                    {p.plan}
                    {currentPlan === p.key && <Chip tone="blue">Current</Chip>}
                  </h3>
                  <div className="pr">{p.price}</div>
                  <p className="nt">{p.note}</p>
                  {orgs.length > 0 ? (
                    <button
                      type="button"
                      className={`hrx-pill blx-cta justify-content-center${currentPlan === p.key ? "" : " primary"}`}
                      disabled={subscribing !== null}
                      onClick={() => onSubscribe(p.key)}
                    >
                      {subscribing === p.key ? "Starting…" : `Choose ${p.plan}`}
                    </button>
                  ) : (
                    <p className="blx-note">Buy a business first — plans apply per business.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
