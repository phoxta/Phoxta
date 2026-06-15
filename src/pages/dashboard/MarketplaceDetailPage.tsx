import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useAuth } from "@/auth/AuthProvider";
import { getBlueprint, formatPrice, type Blueprint } from "@/lib/db/marketplace";
import { buyBlueprint } from "@/lib/db/organizations";

const INCLUDED = [
  "A live storefront and mobile-ready experience",
  "Pre-configured AI assistants and automations",
  "Your own brand, domain and payment account",
  "A 30-day hands-on onboarding to your first sale",
];

export default function MarketplaceDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bp, setBp] = useState<Blueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    getBlueprint(slug).then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error);
      setBp(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [slug]);

  async function onBuy() {
    if (!user || !bp) return;
    setBuying(true);
    setError(null);
    const { id, error } = await buyBlueprint(user.id, bp);
    setBuying(false);
    if (error && !id) {
      setError(error);
      return;
    }
    navigate("/dashboard/businesses");
  }

  if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;
  if (!bp)
    return (
      <div>
        <p className="neutral-500">Business not found.</p>
        <Link to="/dashboard/marketplace" className="fw-600 text-decoration-none">
          ← Back to marketplace
        </Link>
      </div>
    );

  return (
    <div style={{ maxWidth: 900 }}>
      <PageMeta title={`Phoxta - ${bp.name}`} />
      <Link to="/dashboard/marketplace" className="fz-font-md neutral-500 text-decoration-none">
        ← Marketplace
      </Link>

      {error && <div className="alert alert-warning py-2 px-3 fz-font-md mt-3">{error}</div>}

      <div className="row g-4 mt-1">
        <div className="col-lg-7">
          <div className="d-flex align-items-center gap-2 mb-2">
            <span className="badge bg-neutral-100 neutral-700 fw-500">{bp.vertical}</span>
            {bp.verified && <span className="badge bg-success-subtle text-success fw-500">Verified</span>}
            {bp.ai_included && <span className="badge bg-neutral-100 neutral-700 fw-500">AI inside</span>}
          </div>
          <h2 className="fw-600 mb-2">{bp.name}</h2>
          <p className="neutral-700 mb-4">{bp.description || bp.tagline}</p>

          <h6 className="fw-600 mb-2">What&apos;s included</h6>
          <ul className="list-unstyled d-flex flex-column gap-2">
            {INCLUDED.map((line) => (
              <li key={line} className="d-flex align-items-start gap-2 fz-font-md neutral-700">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-1 text-success">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="col-lg-5">
          <div className="bg-neutral-0 rounded-4 p-4 border-100 position-sticky" style={{ top: 88 }}>
            <div className="fw-700 fz-60 lh-1 mb-1">{formatPrice(bp.price_cents, bp.currency)}</div>
            <div className="fz-font-md neutral-500 text-capitalize mb-3">{bp.tier} business · one-time</div>
            <button type="button" className="at-btn w-100 justify-content-center mb-2" disabled={buying} onClick={onBuy}>
              <span>
                <span className="text-1">{buying ? "Setting up…" : "Make it yours"}</span>
                <span className="text-2">{buying ? "Setting up…" : "Make it yours"}</span>
              </span>
            </button>
            {bp.demo_url && (
              <a className="at-btn at-btn-border-dark w-100 justify-content-center" href={bp.demo_url} target="_blank" rel="noreferrer">
                <span>
                  <span className="text-1">View live demo</span>
                  <span className="text-2">View live demo</span>
                </span>
              </a>
            )}
            <p className="fz-font-sm neutral-500 mb-0 mt-3">
              Includes a 14-day free trial of the platform plan. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
