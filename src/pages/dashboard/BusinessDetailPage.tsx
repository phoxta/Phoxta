import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useAuth } from "@/auth/AuthProvider";
import { getBusiness, listMembers, type Organization, type Member } from "@/lib/db/organizations";
import { getSubscriptionForOrg, type Subscription } from "@/lib/db/billing";
import { formatPrice } from "@/lib/db/marketplace";

export default function BusinessDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    Promise.all([getBusiness(id), listMembers(id), getSubscriptionForOrg(id)]).then(([o, m, s]) => {
      if (!active) return;
      if (o.error) setError(o.error);
      setOrg(o.data);
      setMembers(m.data);
      setSub(s.data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;
  if (!org)
    return (
      <div>
        {error && <div className="alert alert-warning py-2 px-3 fz-font-md">{error}</div>}
        <p className="neutral-500">Business not found.</p>
        <Link to="/dashboard/businesses" className="fw-600 text-decoration-none">
          ← Back to businesses
        </Link>
      </div>
    );

  return (
    <div style={{ maxWidth: 880 }}>
      <PageMeta title={`Phoxta - ${org.name}`} />
      <Link to="/dashboard/businesses" className="fz-font-md neutral-500 text-decoration-none">
        ← Businesses
      </Link>

      <div className="d-flex flex-wrap align-items-center gap-2 mt-2 mb-4">
        <h2 className="fw-600 mb-0 me-2">{org.name}</h2>
        <span className="badge bg-neutral-100 neutral-700 text-capitalize fw-500">{org.stage}</span>
        {org.vertical && <span className="badge bg-neutral-100 neutral-700 fw-500">{org.vertical}</span>}
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <div className="bg-neutral-0 rounded-4 p-4 border-100 h-100">
            <h6 className="fw-600 mb-3">Plan</h6>
            {sub ? (
              <>
                <div className="d-flex align-items-baseline gap-2 mb-1">
                  <span className="fz-24 fw-700 text-capitalize">{sub.plan}</span>
                  <span className="badge bg-neutral-100 neutral-700 text-capitalize fw-500">{sub.status.replace("_", " ")}</span>
                </div>
                <div className="fz-font-md neutral-500">
                  {formatPrice(sub.amount_cents, sub.currency)}/mo
                  {sub.current_period_end ? ` · renews ${new Date(sub.current_period_end).toLocaleDateString()}` : ""}
                </div>
                <Link to="/dashboard/billing" className="fz-font-md fw-600 text-decoration-none d-inline-block mt-3">
                  Manage billing →
                </Link>
              </>
            ) : (
              <p className="neutral-500 mb-0">No plan on file yet.</p>
            )}
          </div>
        </div>

        <div className="col-md-6">
          <div className="bg-neutral-0 rounded-4 p-4 border-100 h-100">
            <h6 className="fw-600 mb-3">Team ({members.length})</h6>
            <ul className="list-unstyled m-0 d-flex flex-column gap-2">
              {members.map((m) => (
                <li key={m.user_id} className="d-flex align-items-center justify-content-between">
                  <span className="fz-font-md neutral-700">{m.user_id === user?.id ? "You" : "Member"}</span>
                  <span className="badge bg-neutral-100 neutral-700 text-capitalize fw-500">{m.role}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="col-12">
          <div className="bg-neutral-0 rounded-4 p-4 border-100">
            <h6 className="fw-600 mb-3">Operating console</h6>
            <p className="neutral-500 mb-0">
              This business runs on its own AI-powered backend — storefront, products, orders and customers.
              Its day-to-day console opens in a dedicated workspace (coming soon).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
