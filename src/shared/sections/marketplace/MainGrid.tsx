import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listBlueprints, formatPrice, type Blueprint } from "@/lib/db/marketplace";

// The marketplace's main UI — the "Selected work" grid design from the
// brand-design page (sec-4-home-9), populated with the REAL businesses for sale
// (anon-readable blueprints). Entrance-animation classes are intentionally left
// off so the dynamically-loaded cards are always visible.

const CaseArrow = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="11" viewBox="0 0 12 11" fill="none" aria-hidden="true">
    <path d="M4.512 10.8V0H6.984V10.8H4.512ZM0 6.6V4.2H11.52V6.6H0Z" fill="currentColor" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z" fill="currentColor" />
  </svg>
);

const FALLBACK_IMG = "/assets/imgs/pages/home-9/sec-4-img-1.webp";
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function Card({ b }: { b: Blueprint }) {
  const href = b.demo_url || "/auth";
  const external = Boolean(b.demo_url);
  const linkProps = external ? { href, target: "_blank", rel: "noreferrer" } : { href };
  return (
    <article className="sec-4-home-9__card" data-category={slugify(b.vertical || "other")}>
      <div className="sec-4-home-9__visual">
        <a {...linkProps} className="sec-4-home-9__visual-link cursor-hide">
          <div className="fix anim-zoomin">
            <img src={b.cover_url || FALLBACK_IMG} alt={b.name} width={600} height={450} loading="lazy" />
          </div>
          <div className="sec-4-home-9__overlay">
            <span className="sec-4-home-9__tag text-capitalize">{b.vertical}</span>
            <p className="sec-4-home-9__metric text-white">{formatPrice(b.price_cents, b.currency)} · one-time</p>
            {b.tagline && <p className="sec-4-home-9__excerpt text-white">{b.tagline}</p>}
          </div>
        </a>
        {b.verified && <span className="sec-4-home-9__badge">Verified</span>}
      </div>
      <div className="sec-4-home-9__bar">
        <h3 className="sec-4-home-9__project">{b.name}</h3>
        <a {...linkProps} className="sec-4-home-9__case">
          <span>{external ? "View demo" : "View business"}</span>
          <CaseArrow />
        </a>
      </div>
    </article>
  );
}

export default function MarketplaceMainGrid() {
  const [items, setItems] = useState<Blueprint[]>([]);
  const [active, setActive] = useState("all");

  useEffect(() => {
    let on = true;
    listBlueprints().then(({ data }) => {
      if (on) setItems(data);
    });
    return () => {
      on = false;
    };
  }, []);

  const filters = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((b) => map.set(slugify(b.vertical || "other"), b.vertical || "Other"));
    return [{ slug: "all", label: "All businesses" }, ...[...map].map(([slug, label]) => ({ slug, label }))];
  }, [items]);

  const visible = active === "all" ? items : items.filter((b) => slugify(b.vertical || "other") === active);
  const col1 = visible.filter((_, i) => i % 2 === 0);
  const col2 = visible.filter((_, i) => i % 2 === 1);

  return (
    <section className="sec-4-home-9 overflow-hidden bg-neutral-50">
      <div className="sec-4-home-9__container">
        <h2 className="sec-4-home-9__title">The marketplace</h2>

        {filters.length > 2 && (
          <div className="sec-4-home-9__filters d-flex flex-wrap justify-content-center align-items-center gap-2">
            {filters.map((f) => (
              <button
                key={f.slug}
                type="button"
                onClick={() => setActive(f.slug)}
                className={`at-btn filter-btn btn-sm text-capitalize${active === f.slug ? " active" : ""}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        <div className="sec-4-home-9__grid">
          <div className="sec-4-home-9__col">
            {col1.map((b) => <Card key={b.id} b={b} />)}
          </div>
          <div className="sec-4-home-9__col sec-4-home-9__col--offset">
            {col2.map((b) => <Card key={b.id} b={b} />)}
          </div>
        </div>

        <div className="sec-4-home-9__cta">
          <p className="sec-4-home-9__cta-text">
            Validated, AI-powered businesses you can own and run from day one. Pick one, make it your own, and launch in minutes.
          </p>
          <Link className="at-btn" to="/auth?mode=signup">
            <span>
              <span className="text-1">GET STARTED</span>
              <span className="text-2">GET STARTED</span>
            </span>
            <i>
              <ArrowIcon />
              <ArrowIcon />
            </i>
          </Link>
        </div>
      </div>
    </section>
  );
}
