import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ProductCard from "@/components/common/ProductCard";
import { useCatalog } from "@/util/catalog";

export default function Shop({ title = "Shop" }: { title?: string }) {
    const { products } = useCatalog();
    const [params] = useSearchParams();
    const q = (params.get("q") || "").trim().toLowerCase();
    const [cat, setCat] = useState("All");
    const [sort, setSort] = useState("featured");

    const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.category)))], [products]);

    const list = useMemo(() => {
        let l = cat === "All" ? products : products.filter((p) => p.category === cat);
        if (q) l = l.filter((p) => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
        if (sort === "low") l = [...l].sort((a, b) => a.price - b.price);
        if (sort === "high") l = [...l].sort((a, b) => b.price - a.price);
        return l;
    }, [products, cat, sort, q]);

    const heading = q ? `Search results for “${params.get("q")?.trim()}”` : title;

    return (
        <Layout>
            <Breadcrumb title={heading} />
            <section className="flat-spacing-5">
                <div className="container">
                    <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap" style={{ gap: 12 }}>
                        <div className="d-flex flex-wrap" style={{ gap: 8 }}>
                            {categories.map((c) => (
                                <button key={c} onClick={() => setCat(c)} className="tf-btn" style={{ padding: "6px 14px", borderRadius: 999, border: "1px solid #e5e5e5", background: cat === c ? "#111" : "#fff", color: cat === c ? "#fff" : "#111", fontSize: 14 }}>{c}</button>
                            ))}
                        </div>
                        <select className="form-select" style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value)}>
                            <option value="featured">Featured</option>
                            <option value="low">Price: Low to High</option>
                            <option value="high">Price: High to Low</option>
                        </select>
                    </div>
                    <p className="text-body-default text_secondary mb-3">{list.length} products</p>
                    {list.length === 0 ? (
                        <p className="text-body-default text_secondary py-5 text-center">No products match your search. Try another term or browse all categories.</p>
                    ) : (
                        <div className="tf-grid-layout tf-col-2 lg-col-4">
                            {list.map((p) => <ProductCard key={p.id} product={p} />)}
                        </div>
                    )}
                </div>
            </section>
        </Layout>
    );
}
