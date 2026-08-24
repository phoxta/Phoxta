import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useAuth } from "@/auth/AuthProvider";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { marketplaceBlueprintsQuery } from "@/lib/cache/dashboardQueries";
import { formatPrice, type Blueprint } from "@/lib/db/marketplace";
import { PROMO, promoPriceCents } from "@/lib/promo";
import { blueprintCover } from "@/lib/blueprintCover";
import { startBlueprintCheckout } from "@/lib/db/payments";
import { PageHeader, Card, Chip, Empty } from "@/components/dash/Ui";

// Page-local styles only — everything else comes from the .hrx kit.
const CSS = `
.mpx-cover { aspect-ratio: 16 / 10; border-radius: 16px 16px 0 0; }
.mpx-tagline { font-size: 14px; color: var(--hrx-muted); margin: 0 0 14px; }
.mpx-price { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; line-height: 1; }
.mpx-price del { font-size: 14px; font-weight: 400; color: var(--hrx-muted); margin-right: 6px; }
.mpx-tier { font-size: 13px; color: var(--hrx-muted); margin-top: 5px; }
.mpx-buy:disabled { opacity: 0.55; pointer-events: none; }
`;

export default function MarketplacePage() {
  const { user } = useAuth();
  const { data, loading, error: loadError } = useCachedData(
    marketplaceBlueprintsQuery.key,
    marketplaceBlueprintsQuery.fetch,
  );
  const items = data ?? [];
  const [actionError, setActionError] = useState<string | null>(null);
  const error = loadError || actionError;
  const [vertical, setVertical] = useState<string>("All");
  const [buyingId, setBuyingId] = useState<string | null>(null);

  // ?q= comes from the shell's top-bar search.
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  const verticals = useMemo(() => ["All", ...Array.from(new Set(items.map((i) => i.vertical))).sort()], [items]);
  const byVertical = vertical === "All" ? items : items.filter((i) => i.vertical === vertical);
  const shown = q
    ? byVertical.filter((i) => `${i.name} ${i.tagline ?? ""} ${i.vertical ?? ""}`.toLowerCase().includes(q))
    : byVertical;

  // Buying goes through Paystack — the webhook provisions the business after
  // the charge succeeds, so this only starts the hosted checkout.
  async function onBuy(bp: Blueprint) {
    if (!user) return;
    setActionError(null);
    setBuyingId(bp.id);
    const { url, error } = await startBlueprintCheckout(bp.id);
    if (error || !url) {
      setBuyingId(null);
      setActionError(error ?? "Could not start the checkout.");
      return;
    }
    window.location.assign(url);
  }

  return (
    <div className="d-flex flex-column gap-2">
      <PageMeta title="Phoxta - Marketplace" />
      <style>{CSS}</style>

      <PageHeader
        crumb="Portal"
        title="Marketplace"
        note="Validated, AI-powered businesses — make one your own and launch in minutes."
        tabs={
          !loading && items.length > 0 ? (
            <div className="hrx-tabbar" role="tablist" aria-label="Filter by vertical">
              {verticals.map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={vertical === v}
                  onClick={() => setVertical(v)}
                  className={`hrx-tab text-capitalize${vertical === v ? " active" : ""}`}
                >
                  {v}
                </button>
              ))}
            </div>
          ) : undefined
        }
      />

      {error && (
        <div className="alert alert-warning py-2 px-3 fz-font-md mb-0" role="alert">
          {error}
        </div>
      )}

      {q && (
        <p className="mb-0" style={{ fontSize: 14, color: "var(--hrx-muted)" }} role="status">
          {shown.length} result{shown.length === 1 ? "" : "s"} for “{searchParams.get("q")}”
          <button
            type="button"
            className="btn btn-link p-0 ms-2 fz-font-md text-decoration-underline"
            onClick={() => setSearchParams({}, { replace: true })}
          >
            Clear
          </button>
        </p>
      )}

      {loading ? (
        <Card>
          <p className="text-center mb-0 py-4" style={{ color: "var(--hrx-muted)" }} role="status">
            Loading marketplace…
          </p>
        </Card>
      ) : shown.length === 0 ? (
        <Empty title="No businesses listed yet">
          {q ? "Nothing matches that search — try a different word or clear the filter." : "Check back soon — new businesses are added regularly."}
        </Empty>
      ) : (
        <div className="row g-2">
          {shown.map((bp) => (
            <div key={bp.id} className="col-xl-4 col-md-6">
              <div className="hrx-card h-100 d-flex flex-column">
                <Link to={`/dashboard/marketplace/${bp.slug}`} className="hrx-imgcard mpx-cover" aria-label={`${bp.name} — view details`}>
                  <img
                    src={blueprintCover(bp.slug, bp.cover_url)}
                    alt={bp.name}
                    width={600}
                    height={375}
                    loading="lazy"
                  />
                  <span className="shade">
                    <span className="cat text-capitalize">{bp.vertical}</span>
                    <span className="name">{bp.name}</span>
                  </span>
                  <span className="corner-r">
                    {bp.verified && <Chip tone="ok">Verified</Chip>}
                    {PROMO.active && <Chip tone="orange">{PROMO.label}</Chip>}
                  </span>
                </Link>
                <div className="hrx-pad d-flex flex-column flex-grow-1">
                  {bp.ai_included && (
                    <div className="mb-2">
                      <Chip tone="blue">AI inside</Chip>
                    </div>
                  )}
                  <p className="mpx-tagline flex-grow-1">{bp.tagline}</p>
                  <div className="d-flex align-items-end justify-content-between gap-2 flex-wrap">
                    <div>
                      {PROMO.active ? (
                        <div className="mpx-price">
                          <del>{formatPrice(bp.price_cents, bp.currency)}</del>
                          {formatPrice(promoPriceCents(bp.price_cents), bp.currency)}
                        </div>
                      ) : (
                        <div className="mpx-price">{formatPrice(bp.price_cents, bp.currency)}</div>
                      )}
                      <div className="mpx-tier text-capitalize">{bp.tier} · one-time</div>
                    </div>
                    <button
                      type="button"
                      className="hrx-pill primary mpx-buy"
                      disabled={buyingId === bp.id}
                      onClick={() => onBuy(bp)}
                    >
                      {buyingId === bp.id ? "Setting up…" : "Make it yours"}
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
