import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useAuth } from "@/auth/AuthProvider";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { listBlueprints, formatPrice, type Blueprint } from "@/lib/db/marketplace";
import { buyBlueprint } from "@/lib/db/organizations";

export default function MarketplacePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error: loadError } = useCachedData("marketplace.blueprints", async () => {
    const { data, error } = await listBlueprints();
    if (error) throw new Error(error);
    return data;
  });
  const items = data ?? [];
  const [actionError, setActionError] = useState<string | null>(null);
  const error = loadError || actionError;
  const [vertical, setVertical] = useState<string>("All");
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const verticals = useMemo(() => ["All", ...Array.from(new Set(items.map((i) => i.vertical))).sort()], [items]);
  const shown = vertical === "All" ? items : items.filter((i) => i.vertical === vertical);

  async function onBuy(bp: Blueprint) {
    if (!user) return;
    setActionError(null);
    setBuyingId(bp.id);
    const { id, error } = await buyBlueprint(user.id, bp);
    setBuyingId(null);
    if (error && !id) {
      setActionError(error);
      return;
    }
    navigate("/dashboard/businesses");
  }

  return (
    <div>
      <PageMeta title="Phoxta - Marketplace" />
      <div className="mb-4">
        <h1 className="fw-600 mb-2 lh-1" style={{ fontSize: "clamp(2.5rem, 5vw, 3.75rem)" }}>Marketplace</h1>
        <p className="neutral-500 mb-0 fz-font-lg">Validated, AI-powered businesses — make one your own and launch in minutes.</p>
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
        <div className="row g-4">
          {shown.map((bp) => (
            <div key={bp.id} className="col-xl-4 col-md-6">
              <div className="bg-neutral-0 rounded-4 h-100 border-100 d-flex flex-column overflow-hidden">
                <Link
                  to={`/dashboard/marketplace/${bp.slug}`}
                  className="d-block"
                  style={{ aspectRatio: "16 / 9", overflow: "hidden", background: "#f1efea" }}
                >
                  {bp.cover_url && (
                    <img
                      src={bp.cover_url}
                      alt={bp.name}
                      loading="lazy"
                      style={{ width: "100%", aspectRatio: "16 / 9", height: "auto", objectFit: "cover", display: "block" }}
                    />
                  )}
                </Link>
                <div className="p-3 d-flex flex-column flex-grow-1">
                <div className="d-flex align-items-center gap-1 mb-2 flex-wrap">
                  <span className="badge bg-neutral-100 neutral-700 fw-500">{bp.vertical}</span>
                  {bp.verified && <span className="badge bg-success-subtle text-success fw-500">Verified</span>}
                  {bp.ai_included && <span className="badge bg-neutral-100 neutral-700 fw-500">AI inside</span>}
                </div>
                <h6 className="fw-600 mb-1">
                  <Link to={`/dashboard/marketplace/${bp.slug}`} className="neutral-900 text-decoration-none">
                    {bp.name}
                  </Link>
                </h6>
                <p className="fz-font-sm neutral-500 flex-grow-1 mb-0">{bp.tagline}</p>
                <div className="d-flex align-items-center justify-content-between mt-3">
                  <div>
                    <div className="fw-700 fz-20 lh-1">{formatPrice(bp.price_cents, bp.currency)}</div>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
