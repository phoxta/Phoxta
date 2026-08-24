import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useAuth } from "@/auth/AuthProvider";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { getBlueprint, formatPrice, getBlueprintScorecards, type BlueprintScorecard } from "@/lib/db/marketplace";
import { PROMO, promoPriceCents } from "@/lib/promo";
import { startBlueprintCheckout } from "@/lib/db/payments";
import { blueprintCover } from "@/lib/blueprintCover";
import { PLATFORM_PLANS } from "@/lib/plans";
import Section12Pricing from "@/shared/sections/index-2/Section12Pricing";
import { PageHeader, Card, Chip, Empty } from "@/components/dash/Ui";

const GROWTH_PRICE = PLATFORM_PLANS.find((p) => p.key === "growth")?.priceMonthly ?? 250;

const INCLUDED = [
  "A live storefront and mobile-ready experience",
  "Pre-configured AI assistants and automations",
  "Your own brand, domain and payment account",
  "A 30-day hands-on onboarding to your first sale",
  "Your first month of the Growth plan — free",
  "The Phoxta Launch Guarantee (below)",
];

// Page-local styles only — everything else comes from the .hrx kit.
const CSS = `
.mpx-hero { aspect-ratio: 16 / 9; }
.mpx-sticky { position: static; }
.mpx-price-big { font-size: clamp(38px, 4vw, 54px); font-weight: 700; letter-spacing: -0.03em; line-height: 1; }
.mpx-price-was { font-size: 20px; font-weight: 500; color: var(--hrx-muted); margin-right: 8px; }
.mpx-tier { font-size: 14px; color: var(--hrx-muted); }
.mpx-buy:disabled { opacity: 0.55; pointer-events: none; }
.mpx-full { width: 100%; justify-content: center; }
.mpx-note { font-size: 13px; color: var(--hrx-muted); margin: 12px 0 0; }
.mpx-desc { font-size: 15px; color: var(--hrx-ink); margin: 0; }
.mpx-check li { font-size: 14px; }
.mpx-facts { display: flex; flex-wrap: wrap; gap: 16px; font-size: 14px; }
`;

export default function MarketplaceDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { data: bp = null, loading, error: loadError } = useCachedData(
    slug ? `blueprint:${slug}` : "blueprint:none",
    async () => {
      if (!slug) return null;
      const { data, error } = await getBlueprint(slug);
      if (error) throw new Error(error);
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [scorecard, setScorecard] = useState<BlueprintScorecard | null>(null);
  useEffect(() => {
    if (!bp?.id) return;
    let on = true;
    getBlueprintScorecards().then(({ data }) => {
      if (on) setScorecard(data.find((s) => s.blueprint_id === bp.id) ?? null);
    });
    return () => { on = false; };
  }, [bp?.id]);

  // Buying goes through Paystack — the webhook provisions the business after
  // the charge succeeds, so this only starts the hosted checkout.
  async function onBuy() {
    if (!user || !bp) return;
    setBuying(true);
    setError(null);
    const { url, error } = await startBlueprintCheckout(bp.id);
    if (error || !url) {
      setBuying(false);
      setError(error ?? "Could not start the checkout.");
      return;
    }
    window.location.assign(url);
  }

  if (loading)
    return (
      <Card>
        <p className="text-center mb-0 py-4" style={{ color: "var(--hrx-muted)" }} role="status">Loading…</p>
      </Card>
    );
  if (!bp)
    return (
      <Empty
        title="Business not found"
        action={
          <Link to="/dashboard/marketplace" className="hrx-pill">
            ← Back to marketplace
          </Link>
        }
      >
        This listing may have been removed or the link is wrong.
      </Empty>
    );

  return (
    <div className="d-flex flex-column gap-2">
      <PageMeta title={`Phoxta - ${bp.name}`} />
      <style>{CSS}</style>

      <PageHeader
        crumb="Marketplace"
        title={bp.name}
        note={bp.tagline}
        actions={
          <Link to="/dashboard/marketplace" className="hrx-pill">
            ← Marketplace
          </Link>
        }
      />

      {(error || loadError) && (
        <div className="alert alert-warning py-2 px-3 fz-font-md mb-0" role="alert">
          {error || loadError}
        </div>
      )}

      <div className="row g-2">
        <div className="col-lg-7 d-flex flex-column gap-2">
          <div className="hrx-imgcard mpx-hero">
            <img
              src={blueprintCover(bp.slug, bp.cover_url)}
              alt={bp.name}
              width={800}
              height={450}
              loading="lazy"
            />
            <span className="shade">
              <span className="cat text-capitalize">{bp.vertical}</span>
              <span className="name">{bp.name}</span>
            </span>
            <span className="corner-r">
              {bp.verified && <Chip tone="ok">Verified</Chip>}
              {bp.ai_included && <Chip tone="blue">AI inside</Chip>}
              {PROMO.active && <Chip tone="orange">{PROMO.label}</Chip>}
            </span>
          </div>

          <Card title="About this business">
            <div className="d-flex flex-wrap gap-1 mb-3">
              <Chip tone="line">{bp.vertical}</Chip>
              {bp.verified && <Chip tone="ok">Verified</Chip>}
              {bp.ai_included && <Chip tone="blue">AI inside</Chip>}
            </div>
            <p className="mpx-desc">{bp.description || bp.tagline}</p>
          </Card>

          {scorecard && (scorecard.orders_90d > 0 || scorecard.reservations_90d > 0 || scorecard.conversations_90d > 0) && (
            <Card title="Verified platform activity — last 90 days">
              <p className="mpx-note mt-0 mb-3">
                Live, anonymized data from businesses running this blueprint on Phoxta — not projections.
              </p>
              <div className="mpx-facts">
                <span><b>{scorecard.businesses}</b> running business{scorecard.businesses === 1 ? "" : "es"}</span>
                {scorecard.orders_90d > 0 && <span><b>{scorecard.orders_90d}</b> orders</span>}
                {scorecard.reservations_90d > 0 && <span><b>{scorecard.reservations_90d}</b> reservations</span>}
                {scorecard.conversations_90d > 0 && <span><b>{scorecard.conversations_90d}</b> customer conversations handled</span>}
                {scorecard.avg_qa_score != null && <span><b>{scorecard.avg_qa_score}/5</b> AI quality score</span>}
              </div>
            </Card>
          )}

          <Card title="What's included">
            <ul className="list-unstyled d-flex flex-column gap-2 mb-0 mpx-check">
              {INCLUDED.map((line) => (
                <li key={line} className="d-flex align-items-start gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-1 text-success" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  {line}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="col-lg-5">
          <div className="mpx-sticky">
            <Card>
              {PROMO.active && (
                <div className="mb-2 d-flex align-items-center gap-2 flex-wrap">
                  <del className="mpx-price-was">{formatPrice(bp.price_cents, bp.currency)}</del>
                  <Chip tone="orange">{PROMO.label}</Chip>
                </div>
              )}
              <div className="mpx-price-big mb-1">
                {formatPrice(PROMO.active ? promoPriceCents(bp.price_cents) : bp.price_cents, bp.currency)}
              </div>
              <div className="mpx-tier text-capitalize mb-3">{bp.tier} business · one-time</div>
              <div className="d-flex flex-column gap-2">
                <button type="button" className="hrx-pill primary mpx-buy mpx-full" disabled={buying} onClick={onBuy}>
                  {buying ? "Setting up…" : "Make it yours"}
                </button>
                {bp.demo_url && (
                  <a className="hrx-pill mpx-full" href={bp.demo_url} target="_blank" rel="noreferrer">
                    View live demo
                  </a>
                )}
              </div>
              <p className="mpx-note">
                One-time business price — your first month of the Growth plan is included free.
                After that it&apos;s ${GROWTH_PRICE}/mo (change or cancel anytime in Billing).
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* The named outcome guarantee no acquisition marketplace offers. */}
      <Card title="The Phoxta Launch Guarantee">
        <p className="mpx-desc" style={{ maxWidth: 640 }}>
          Your business is live on its own address with every channel connected — web chat, SMS,
          WhatsApp, email and phone — and your AI agent handling real customer conversations within
          30 days of purchase, or we refund the purchase price in full.
        </p>
      </Card>

      {/* Monthly plan after purchase — the ongoing platform subscription. */}
      <Card title="Your first month of Growth is on us">
        <p className="mpx-note mt-0 mb-3" style={{ maxWidth: 620, fontSize: 14 }}>
          The price above is a one-time fee to make this business yours — and it includes a free
          month of the Growth plan. After that, Growth (${GROWTH_PRICE}/mo) continues automatically;
          switch plans or cancel anytime in <Link to="/dashboard/billing" className="text-decoration-underline">Billing</Link>.
        </p>
        {/* Same plan cards + Monthly/Annual toggle as the Pricing page. */}
        <Section12Pricing />
        <p className="mpx-note">
          Need more? <Link to="/pricing" className="text-decoration-underline">See the full plan comparison</Link> — including Enterprise.
        </p>
      </Card>
    </div>
  );
}
