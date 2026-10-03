import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Search, SlidersHorizontal, X } from "lucide-react";
import { Link } from "react-router-dom";
import { blueprintCover } from "@/lib/blueprintCover";
import { listBlueprints, formatPrice, type Blueprint } from "@/lib/db/marketplace";
import { PROMO, promoPriceCents } from "@/lib/promo";
import { HOMEPAGE_BLUEPRINTS } from "./homeBlueprints";
import "@/styles/phoxta-landing.css";

type SortMode = "new" | "rating";

const HOMEPAGE_BUSINESS_COVERS: Record<string, string> = {
  "niche-apparel": "/assets/imgs/pages/business-covers/niche-apparel.webp",
  "restaurant-orders": "/assets/imgs/pages/business-covers/restaurant-orders.webp",
  gearo: "/assets/imgs/pages/business-covers/gearo.webp",
  "coir-six": "/assets/imgs/pages/business-covers/coir-six.webp",
  ferne: "/assets/imgs/pages/business-covers/ferne.webp",
  wamwam: "/assets/imgs/pages/business-covers/wamwam.webp",
};

function displayPrice(blueprint: Blueprint) {
  const cents = PROMO.active ? promoPriceCents(blueprint.price_cents) : blueprint.price_cents;
  return formatPrice(cents, blueprint.currency);
}

function homepageCover(blueprint: Blueprint) {
  return HOMEPAGE_BUSINESS_COVERS[blueprint.slug] || blueprintCover(blueprint.slug, blueprint.cover_url);
}

export default function BusinessListing({ context = "home" }: { context?: "home" | "app" }) {
  const [blueprints, setBlueprints] = useState<Blueprint[]>(HOMEPAGE_BLUEPRINTS);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("new");
  const [industries, setIndustries] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const absoluteMin = 250000;
  const absoluteMax = useMemo(() => Math.max(...blueprints.map((item) => item.price_cents), 1000000), [blueprints]);
  const [minPrice, setMinPrice] = useState(absoluteMin);
  const [maxPrice, setMaxPrice] = useState(absoluteMax);

  useEffect(() => {
    let active = true;
    void listBlueprints().then(({ data }) => {
      if (active && data.length) setBlueprints(data);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!filtersOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [filtersOpen]);

  const industryOptions = useMemo(
    () => [...new Set(blueprints.map((item) => item.vertical || "Business"))].sort(),
    [blueprints],
  );
  const effectiveMax = Math.min(maxPrice, absoluteMax);
  const effectiveMin = Math.min(minPrice, effectiveMax);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = blueprints.filter((item) => {
      const matchesQuery = !needle || `${item.name} ${item.tagline} ${item.description} ${item.vertical}`.toLowerCase().includes(needle);
      const matchesIndustry = industries.length === 0 || industries.includes(item.vertical || "Business");
      return matchesQuery && matchesIndustry && item.price_cents >= effectiveMin && item.price_cents <= effectiveMax;
    });
    if (sort === "rating") return [...filtered].sort((a, b) => Number(b.verified) - Number(a.verified));
    return filtered;
  }, [blueprints, effectiveMax, effectiveMin, industries, query, sort]);

  function toggleIndustry(industry: string) {
    setIndustries((current) => current.includes(industry) ? current.filter((item) => item !== industry) : [...current, industry]);
  }

  const priceFilterActive = effectiveMin !== absoluteMin || effectiveMax !== absoluteMax;
  const activeFilterCount = industries.length + Number(priceFilterActive);

  function clearFilters() {
    setIndustries([]);
    setMinPrice(absoluteMin);
    setMaxPrice(absoluteMax);
  }

  return (
    <>
    <section className={`phoxta-businesses${context === "app" ? " phoxta-businesses--app" : ""}`} aria-labelledby="phoxta-businesses-heading">
      <div className="phoxta-businesses__inner">
        <div className="phoxta-businesses__heading">
          <h2 id="phoxta-businesses-heading"><strong>Ready-to-launch</strong><br />businesses.</h2>
          <p>
            Explore businesses with the product, brand, workflows, automation, AI systems, and launch assets already developed. Review the opportunities, choose the business that best fits you, and launch right away.
          </p>
        </div>
        <div className="phoxta-businesses__catalogue">
          <div className="phoxta-businesses__filter-column">
            <aside className="phoxta-businesses__filters phoxta-businesses__filters--desktop" aria-label="Filter businesses">
              <div className="phoxta-businesses__filter-header">
                <div>
                  <strong>Filters</strong>
                  <span>{visible.length} businesses</span>
                </div>
                <button type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)}>
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
              <div className="phoxta-businesses__price">
                <div>
                  <span>Price</span>
                  <output>{formatPrice(effectiveMin, "GBP")}–{formatPrice(effectiveMax, "GBP")}</output>
                </div>
                <div className="phoxta-businesses__range">
                  <input
                    type="range"
                    min={absoluteMin}
                    max={absoluteMax}
                    step={50000}
                    value={effectiveMin}
                    onChange={(event) => setMinPrice(Math.min(Number(event.target.value), effectiveMax))}
                    aria-label="Minimum business price"
                  />
                  <input
                    type="range"
                    min={absoluteMin}
                    max={absoluteMax}
                    step={50000}
                    value={effectiveMax}
                    onChange={(event) => setMaxPrice(Math.max(Number(event.target.value), effectiveMin))}
                    aria-label="Maximum business price"
                  />
                </div>
              </div>

              <fieldset>
                <legend>Industry</legend>
                {industryOptions.map((industry) => (
                  <label key={industry}>
                    <input type="checkbox" checked={industries.includes(industry)} onChange={() => toggleIndustry(industry)} />
                    <span>{industry}</span>
                  </label>
                ))}
              </fieldset>

              <div className="phoxta-businesses__filter-actions">
                <button type="button" onClick={clearFilters} disabled={!activeFilterCount}>Reset</button>
                <button type="button" onClick={() => setFiltersOpen(false)}>Show {visible.length}</button>
              </div>
            </aside>
            {context === "home" && <Link to="/marketplace" className="phoxta-businesses__view-all phoxta-businesses__view-all--desktop">
              View all <span aria-hidden="true">→</span>
            </Link>}
          </div>

          <div className="phoxta-businesses__results">
            <div className="phoxta-businesses__toolbar">
              <label className="phoxta-businesses__search">
                <span className="visually-hidden">Search businesses</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
                <Search size={16} aria-hidden="true" />
              </label>
              <button
                type="button"
                className="phoxta-businesses__filter-toggle"
                aria-controls="phoxta-business-filters-mobile"
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal size={17} aria-hidden="true" />
                <span>Filters</span>
                {activeFilterCount > 0 && <strong>{activeFilterCount}</strong>}
              </button>
              <div className="phoxta-businesses__sort" aria-label="Sort businesses">
                <button type="button" data-active={sort === "new"} onClick={() => setSort("new")}>
                  {sort === "new" && <Check size={14} aria-hidden="true" />} New
                </button>
                <button type="button" data-active={sort === "rating"} onClick={() => setSort("rating")}>Rating</button>
              </div>
            </div>

            {visible.length ? (
              <div className="phoxta-businesses__grid">
                {(context === "home" ? visible.slice(0, 6) : visible).map((item) => (
                  <article className="phoxta-businesses__card" key={item.id}>
                    <Link to={context === "app" ? `/app/businesses/${encodeURIComponent(item.slug)}` : `/auth?mode=signup&business=${encodeURIComponent(item.slug)}&redirect=${encodeURIComponent(`/onboarding?business=${encodeURIComponent(item.slug)}`)}`}>
                      <img src={homepageCover(item)} alt="" width={526} height={494} loading="lazy" />
                      <div className="phoxta-businesses__card-copy">
                        <p>{item.name}</p>
                        <strong>{displayPrice(item)}</strong>
                        <span>{item.vertical}{item.ai_included ? " · AI included" : ""}</span>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="phoxta-businesses__empty" role="status">
                <p>No businesses match those filters.</p>
                <button type="button" onClick={() => { setQuery(""); clearFilters(); }}>Clear filters</button>
              </div>
            )}
            {context === "home" && <Link to="/marketplace" className="phoxta-businesses__view-all phoxta-businesses__view-all--mobile">
              View all businesses <span aria-hidden="true">→</span>
            </Link>}
          </div>
        </div>
      </div>
    </section>
    {filtersOpen && createPortal(
      <div className="phoxta-businesses__filter-modal" role="presentation">
        <button
          type="button"
          className="phoxta-businesses__filter-backdrop"
          aria-label="Close business filters"
          onClick={() => setFiltersOpen(false)}
        />
        <aside
          id="phoxta-business-filters-mobile"
          className="phoxta-businesses__filters phoxta-businesses__filters--mobile"
          role="dialog"
          aria-modal="true"
          aria-label="Filter businesses"
        >
          <div className="phoxta-businesses__filter-header">
            <div>
              <strong>Filters</strong>
              <span>{visible.length} businesses</span>
            </div>
            <button type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="phoxta-businesses__price">
            <div>
              <span>Price</span>
              <output>{formatPrice(effectiveMin, "GBP")}–{formatPrice(effectiveMax, "GBP")}</output>
            </div>
            <div className="phoxta-businesses__range">
              <input
                type="range"
                min={absoluteMin}
                max={absoluteMax}
                step={50000}
                value={effectiveMin}
                onChange={(event) => setMinPrice(Math.min(Number(event.target.value), effectiveMax))}
                aria-label="Minimum business price"
              />
              <input
                type="range"
                min={absoluteMin}
                max={absoluteMax}
                step={50000}
                value={effectiveMax}
                onChange={(event) => setMaxPrice(Math.max(Number(event.target.value), effectiveMin))}
                aria-label="Maximum business price"
              />
            </div>
          </div>

          <fieldset>
            <legend>Industry</legend>
            {industryOptions.map((industry) => (
              <label key={industry}>
                <input type="checkbox" checked={industries.includes(industry)} onChange={() => toggleIndustry(industry)} />
                <span>{industry}</span>
              </label>
            ))}
          </fieldset>

          <div className="phoxta-businesses__filter-actions">
            <button type="button" onClick={clearFilters} disabled={!activeFilterCount}>Reset</button>
            <button type="button" onClick={() => setFiltersOpen(false)}>Show {visible.length}</button>
          </div>
        </aside>
      </div>,
      document.body,
    )}
    </>
  );
}
