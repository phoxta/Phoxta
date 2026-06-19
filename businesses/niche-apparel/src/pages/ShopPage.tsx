import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import FashionCard from "@/components/FashionCard";
import PageHero from "@/components/PageHero";
import { useCatalog } from "@/util/catalog";

const FILTERS = [
    { v: "all", label: "All" },
    { v: "woman", label: "Women" },
    { v: "man", label: "Men" },
    { v: "new", label: "New In" },
    { v: "sale", label: "Sale" },
];
const SORTS = [["featured", "Featured"], ["low", "Price: Low to High"], ["high", "Price: High to Low"]];

const TITLES: Record<string, string> = { all: "Shop All", woman: "Women", man: "Men", new: "New Arrivals", sale: "Sale" };

export default function ShopPage() {
    const [sp, setSp] = useSearchParams();
    const cat = sp.get("c") ?? "all";
    const q = (sp.get("q") ?? "").trim().toLowerCase();
    const [sort, setSort] = useState("featured");
    const { products, loading } = useCatalog();

    const list = useMemo(() => {
        let l = products.filter((p) => {
            if (cat === "woman" || cat === "man") return p.category === cat;
            if (cat === "new") return p.isNew;
            if (cat === "sale") return p.sale;
            return true;
        });
        if (q) l = l.filter((p) => p.title.toLowerCase().includes(q) || (p.type ?? "").toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q));
        if (sort === "low") l = [...l].sort((a, b) => a.price - b.price);
        if (sort === "high") l = [...l].sort((a, b) => b.price - a.price);
        return l;
    }, [cat, sort, products, q]);

    return (
        <>
            {/* Store hero */}
            <PageHero
                eyebrow="The Collection"
                title={q ? `Search: “${sp.get("q")?.trim()}”` : (TITLES[cat] ?? "Shop")}
                subtitle="Considered, modern essentials — filter by category and add your favourites to the bag."
                img="/assets/imgs/pages/product/img-shop-7.webp"
            />

            {/* Filter + sort */}
            <section className="bg-neutral-50 py-4">
                <div className="container">
                    <div className="d-flex flex-wrap gap-3 justify-content-between align-items-center">
                        <div className="d-flex flex-wrap gap-2">
                            {FILTERS.map((f) => (
                                <button key={f.v} onClick={() => setSp(f.v === "all" ? {} : { c: f.v })} className={`at-btn ${cat === f.v ? "bg-dark text-white" : "bg-white text-dark"}`}>
                                    <span><span className="text-1">{f.label}</span><span className="text-2">{f.label}</span></span>
                                </button>
                            ))}
                        </div>
                        <select className="form-select w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
                            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </div>
                </div>
            </section>

            {/* Grid */}
            <section className="py-60">
                <div className="container">
                    <p className="neutral-500 mb-4">{loading ? "Loading the collection…" : `${list.length} products`}</p>
                    <div className="row g-3">
                        {list.map((p) => <div className="col-xxl-3 col-lg-4 col-md-6 col-12" key={p.id}><FashionCard product={p} /></div>)}
                        {list.length === 0 && <p className="text-center neutral-500 py-5">No products in this category yet.</p>}
                    </div>
                </div>
            </section>

            {/* Promo cards */}
            <section className="overflow-hidden pb-80">
                <div className="container">
                    <div className="row g-3">
                        <div className="col-md-6">
                            <div className="p-relative rounded-4 fix">
                                <img className="img-cover" src="/assets/imgs/pages/product/img-shop-8.webp" alt="New season" width={800} height={600} loading="lazy" />
                                <div className="p-absolute bottom-0 start-0 m-lg-5 m-4">
                                    <h4 className="fw-600 text-white">New Season<br />Arrivals</h4>
                                    <Link to="/shop?c=new" className="at-btn bg-white text-dark mt-2"><span><span className="text-1">Explore All</span><span className="text-2">Explore All</span></span></Link>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="p-relative rounded-4 fix">
                                <img className="img-cover" src="/assets/imgs/pages/product/img-shop-9.webp" alt="The brand" width={800} height={600} loading="lazy" />
                                <div className="p-absolute bottom-0 start-0 m-lg-5 m-4">
                                    <h4 className="fw-600 text-white">The Brand<br />Behind the Clothes</h4>
                                    <Link to="/about" className="at-btn bg-white text-dark mt-2"><span><span className="text-1">Our Story</span><span className="text-2">Our Story</span></span></Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
