import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Product } from "@/data/catalogue";
import { IconClose } from "@/lib/icons";
import PageMeta from "@/components/PageMeta";
import ProductCard from "@/components/ProductCard";
import { CATEGORIES, CONCERNS, useCatalog, useMoney } from "@/state/catalog";

type Sort = "featured" | "new" | "price-asc" | "price-desc" | "rating";

const SORTS: { id: Sort; label: string; compare: (a: Product, b: Product) => number }[] = [
    {
        id: "featured",
        label: "Featured",
        compare: (a, b) => Number(b.bestseller) - Number(a.bestseller) || b.reviewCount - a.reviewCount,
    },
    { id: "new", label: "Newest", compare: (a, b) => Number(b.isNew) - Number(a.isNew) },
    { id: "price-asc", label: "Price: low to high", compare: (a, b) => a.priceCents - b.priceCents },
    { id: "price-desc", label: "Price: high to low", compare: (a, b) => b.priceCents - a.priceCents },
    { id: "rating", label: "Top rated", compare: (a, b) => b.rating - a.rating },
];

/** The price slider's ceiling, rounded up to a tidy step above the dearest
 *  product — so a tenant selling a £300 set still gets a usable filter. */
function priceCeiling(products: Product[]): number {
    const max = products.reduce((n, p) => Math.max(n, p.priceCents), 0);
    return Math.max(1000, Math.ceil(max / 500) * 500);
}

export default function ShopPage() {
    const { products } = useCatalog();
    const money = useMoney();
    const [params, setParams] = useSearchParams();

    const ceiling = useMemo(() => priceCeiling(products), [products]);

    // Category, search, refill and sort live in the URL so a filtered shop is a
    // shareable link and the footer can deep-link into it.
    const cat = params.get("cat");
    const query = params.get("q") ?? "";
    const refillOnly = params.get("refill") === "1";
    const sort = (SORTS.find((s) => s.id === params.get("sort"))?.id ?? "featured") as Sort;

    const [concerns, setConcerns] = useState<string[]>([]);
    // null means "no ceiling". Storing the number instead would strand the slider
    // at the DEMO catalogue's ceiling when the live one loads with a different
    // top price — filtering out every product the shop just fetched.
    const [maxPrice, setMaxPrice] = useState<number | null>(null);
    const [inStock, setInStock] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const priceLimit = maxPrice ?? ceiling;

    const patch = (next: Record<string, string | null>) => {
        const p = new URLSearchParams(params);
        for (const [k, v] of Object.entries(next)) {
            if (v === null) p.delete(k);
            else p.set(k, v);
        }
        setParams(p, { replace: true });
    };

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = products.filter(
            (p) =>
                (!cat || p.category === cat) &&
                (!concerns.length || concerns.some((c) => p.concerns.includes(c))) &&
                p.priceCents <= priceLimit &&
                (!inStock || p.stock > 0) &&
                (!refillOnly || p.sizes.some((s) => s.refill)) &&
                (!q || [p.name, p.tagline, p.category, ...p.concerns].join(" ").toLowerCase().includes(q)),
        );
        return [...list].sort(SORTS.find((s) => s.id === sort)!.compare);
    }, [products, cat, concerns, priceLimit, inStock, refillOnly, query, sort]);

    const category = CATEGORIES.find((c) => c.id === cat);
    const heading = query ? `Results for “${query}”` : (category?.name ?? "All products");
    const sub = query ? "" : (category ? `${category.blurb}.` : "Every formula, traceable to the farm that grew it.");

    const chips: { key: string; label: string; clear: () => void }[] = [
        ...(category ? [{ key: "cat", label: category.name, clear: () => patch({ cat: null }) }] : []),
        ...concerns.map((c) => ({
            key: `concern-${c}`,
            label: c,
            clear: () => setConcerns((prev) => prev.filter((x) => x !== c)),
        })),
        ...(maxPrice !== null
            ? [{ key: "price", label: `Under ${money(maxPrice)}`, clear: () => setMaxPrice(null) }]
            : []),
        ...(inStock ? [{ key: "stock", label: "In stock", clear: () => setInStock(false) }] : []),
        ...(refillOnly ? [{ key: "refill", label: "Refillable", clear: () => patch({ refill: null }) }] : []),
        ...(query ? [{ key: "q", label: `“${query}”`, clear: () => patch({ q: null }) }] : []),
    ];

    const clearAll = () => {
        setConcerns([]);
        setMaxPrice(null);
        setInStock(false);
        setParams(new URLSearchParams(), { replace: true });
    };

    return (
        <div className="page">
            <PageMeta
                title={heading}
                description="Shop small-batch botanical formulas, filterable by category, skin concern, price and refillability."
            />
            <div className="wrap">
                <div className="page-head">
                    <div className="crumbs">
                        <Link to="/">Home</Link> / <b>{category?.name ?? "Shop"}</b>
                    </div>
                    <h1 className="serif">{heading}</h1>
                    {sub && <p>{sub}</p>}
                </div>

                <div className="shop">
                    <aside className={`filters-side${filtersOpen ? " open" : ""}`}>
                        <div className="filters-head">
                            <b style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 400 }}>Filters</b>
                            <button
                                type="button"
                                className="icon-btn"
                                onClick={() => setFiltersOpen(false)}
                                aria-label="Close filters"
                            >
                                <IconClose />
                            </button>
                        </div>

                        <div className="fgroup">
                            <h4>Category</h4>
                            <div className="opts">
                                {CATEGORIES.map((c) => (
                                    <label className="check" key={c.id}>
                                        <input
                                            type="checkbox"
                                            checked={cat === c.id}
                                            onChange={(e) => patch({ cat: e.target.checked ? c.id : null })}
                                        />
                                        {c.name}
                                        <span className="n">{products.filter((p) => p.category === c.id).length}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="fgroup">
                            <h4>Skin concern</h4>
                            <div className="opts">
                                {CONCERNS.map((c) => (
                                    <label className="check" key={c}>
                                        <input
                                            type="checkbox"
                                            checked={concerns.includes(c)}
                                            onChange={(e) =>
                                                setConcerns((prev) =>
                                                    e.target.checked ? [...prev, c] : prev.filter((x) => x !== c),
                                                )
                                            }
                                        />
                                        {c}
                                        <span className="n">{products.filter((p) => p.concerns.includes(c)).length}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="fgroup">
                            <h4>
                                Price <span>{maxPrice !== null ? `≤ ${money(maxPrice)}` : ""}</span>
                            </h4>
                            <div className="range">
                                <span>{money(0)}</span>
                                <input
                                    type="range"
                                    aria-label="Maximum price"
                                    min={0}
                                    max={ceiling}
                                    step={500}
                                    value={priceLimit}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        setMaxPrice(v >= ceiling ? null : v);
                                    }}
                                />
                                <span>{money(ceiling)}</span>
                            </div>
                        </div>

                        <div className="fgroup">
                            <h4>Availability</h4>
                            <div className="opts">
                                <label className="check">
                                    <input
                                        type="checkbox"
                                        checked={inStock}
                                        onChange={(e) => setInStock(e.target.checked)}
                                    />
                                    In stock only
                                </label>
                                <label className="check">
                                    <input
                                        type="checkbox"
                                        checked={refillOnly}
                                        onChange={(e) => patch({ refill: e.target.checked ? "1" : null })}
                                    />
                                    Refillable
                                </label>
                            </div>
                        </div>

                        <div className="fgroup" style={{ border: 0, display: "flex", gap: 14, alignItems: "center" }}>
                            <button type="button" className="link" onClick={clearAll}>
                                Clear all filters
                            </button>
                            <button
                                type="button"
                                className="btn sm plain filter-toggle"
                                style={{ marginLeft: "auto" }}
                                onClick={() => setFiltersOpen(false)}
                            >
                                Show results
                            </button>
                        </div>
                    </aside>

                    <section>
                        <div className="shop-top">
                            <button
                                type="button"
                                className="btn sm ghost filter-toggle"
                                onClick={() => setFiltersOpen(true)}
                            >
                                Filters
                            </button>
                            <span className="count">
                                {results.length} product{results.length === 1 ? "" : "s"}
                            </span>
                            <div className="sort">
                                <label htmlFor="sort">Sort by</label>
                                <select
                                    id="sort"
                                    value={sort}
                                    onChange={(e) => patch({ sort: e.target.value === "featured" ? null : e.target.value })}
                                >
                                    {SORTS.map((s) => (
                                        <option value={s.id} key={s.id}>
                                            {s.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {chips.length > 0 && (
                            <div className="active-chips">
                                {chips.map((c) => (
                                    <button type="button" className="chip on" key={c.key} onClick={c.clear}>
                                        {c.label} ✕
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="grid3">
                            {results.length === 0 ? (
                                <div className="empty" style={{ gridColumn: "1/-1" }}>
                                    <b>Nothing matches those filters</b>
                                    Try widening your search.
                                </div>
                            ) : (
                                results.map((p) => <ProductCard product={p} key={p.id} />)
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
