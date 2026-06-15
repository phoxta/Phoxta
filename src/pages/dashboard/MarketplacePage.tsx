import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useAuth } from "@/auth/AuthProvider";
import { listBlueprints, formatPrice, type Blueprint } from "@/lib/db/marketplace";
import { buyBlueprint } from "@/lib/db/organizations";

export default function MarketplacePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vertical, setVertical] = useState<string>("All");
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listBlueprints().then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error);
      setItems(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const verticals = useMemo(() => ["All", ...Array.from(new Set(items.map((i) => i.vertical))).sort()], [items]);
  const shown = vertical === "All" ? items : items.filter((i) => i.vertical === vertical);

  async function onBuy(bp: Blueprint) {
    if (!user) return;
    setError(null);
    setBuyingId(bp.id);
    const { id, error } = await buyBlueprint(user.id, bp);
    setBuyingId(null);
    if (error && !id) {
      setError(error);
      return;
    }
    navigate("/dashboard/businesses");
  }

  return (
    <div>
      <PageMeta title="Phoxta - Marketplace" />
      <div className="mb-4">
        <h2 className="fw-600 mb-1">Marketplace</h2>
        <p className="neutral-500 mb-0">Validated, AI-powered businesses — make one your own and launch in days.</p>
      </div>

      {error && (
        <div className="alert alert-warning py-2 px-3 fz-font-md" role="alert">
          {error}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-4">
          {verticals.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVertical(v)}
              className={`btn btn-sm rounded-pill px-3 ${vertical === v ? "btn-dark" : "btn-outline-secondary"}`}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading marketplace…</div>
      ) : shown.length === 0 ? (
        <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">
          No businesses listed yet.
        </div>
      ) : (
        <div className="row g-3">
          {shown.map((bp) => (
            <div key={bp.id} className="col-xl-4 col-md-6">
              <div className="bg-neutral-0 rounded-4 p-4 h-100 border-100 d-flex flex-column">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-neutral-100 neutral-700 fw-500">{bp.vertical}</span>
                  {bp.verified && <span className="badge bg-success-subtle text-success fw-500">Verified</span>}
                  {bp.ai_included && <span className="badge bg-neutral-100 neutral-700 fw-500">AI inside</span>}
                </div>
                <h5 className="fw-600 mb-1">
                  <Link to={`/dashboard/marketplace/${bp.slug}`} className="neutral-900 text-decoration-none">
                    {bp.name}
                  </Link>
                </h5>
                <p className="fz-font-md neutral-500 flex-grow-1">{bp.tagline}</p>
                <div className="d-flex align-items-center justify-content-between mt-3">
                  <div>
                    <div className="fw-700 fz-24 lh-1">{formatPrice(bp.price_cents, bp.currency)}</div>
                    <div className="fz-font-sm neutral-500 text-capitalize">{bp.tier} · one-time</div>
                  </div>
                  <button type="button" className="at-btn" disabled={buyingId === bp.id} onClick={() => onBuy(bp)}>
                    <span>
                      <span className="text-1">{buyingId === bp.id ? "Setting up…" : "Make it yours"}</span>
                      <span className="text-2">{buyingId === bp.id ? "Setting up…" : "Make it yours"}</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
