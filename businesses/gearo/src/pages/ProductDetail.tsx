import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ProductGrid from "@/components/sections/ProductGrid";
import RLink from "@/components/common/RLink";
import { money } from "@/util/products";
import { useCatalog } from "@/util/catalog";
import { useCart } from "@/util/cart";
import { fetchReviews, submitReview, type Review } from "@/lib/phoxta";

export default function ProductDetail() {
    const { products, orgId } = useCatalog();
    const product = products[0];
    const [qty, setQty] = useState(1);
    const [color, setColor] = useState(0);
    const { add } = useCart();
    const gallery = [product.img, product.imgHover, "/images/shop/product-1.2.jpg", "/images/shop/product-1.3.jpg"];

    const [reviews, setReviews] = useState<Review[]>([]);
    const [rev, setRev] = useState({ author: "", rating: 5, title: "", body: "" });
    const [revBusy, setRevBusy] = useState(false);
    const [revSent, setRevSent] = useState(false);
    useEffect(() => { if (orgId) fetchReviews(orgId).then(setReviews); }, [orgId]);

    async function sendReview(e: React.FormEvent) {
        e.preventDefault();
        if (!orgId || !rev.author.trim() || !rev.body.trim()) return;
        setRevBusy(true);
        const ok = await submitReview(orgId, { ...rev, productId: product.dbId ?? null });
        setRevBusy(false);
        if (ok) { setRevSent(true); setRev({ author: "", rating: 5, title: "", body: "" }); }
    }

    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

    return (
        <Layout>
            <Breadcrumb title={product.title} />
            <section className="flat-spacing-4">
                <div className="container">
                    <div className="row">
                        <div className="col-md-6">
                            <div className="d-flex flex-column" style={{ gap: 12 }}>
                                <div className="img-style" style={{ borderRadius: 12, overflow: "hidden" }}>
                                    <img src={gallery[0]} alt={product.title} width={600} height={600} style={{ width: "100%" }} />
                                </div>
                                <div className="d-flex" style={{ gap: 10 }}>
                                    {gallery.map((g, i) => (
                                        <img key={i} src={g} alt="" width={90} height={90} style={{ borderRadius: 8, objectFit: "cover", cursor: "pointer" }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="tf-product-info-inner" style={{ paddingLeft: 8 }}>
                                <h3 className="mb-2">{product.title}</h3>
                                <div className="price text-button mb-3" style={{ fontSize: 24 }}>
                                    {product.oldPrice && <span className="old-price text_secondary me-2" style={{ textDecoration: "line-through" }}>{money(product.oldPrice)}</span>}
                                    {money(product.price)}
                                </div>
                                <p className="text-body-default text_secondary mb-4">
                                    Superior support and better posture for long work hours. Premium materials, adjustable settings and a modern silhouette that elevates any workspace.
                                </p>

                                <div className="mb-3">
                                    <div className="text-title mb-2">Color: {product.colors[color]?.name}</div>
                                    <ul className="list-color-product d-flex" style={{ gap: 8, listStyle: "none", padding: 0 }}>
                                        {product.colors.map((c, i) => (
                                            <li key={i} onClick={() => setColor(i)} className={`list-color-item color-swatch${i === color ? " active" : ""}`} style={{ cursor: "pointer" }}>
                                                <span className={`swatch-value ${c.cls}`} />
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="d-flex align-items-center mb-4" style={{ gap: 12 }}>
                                    <div className="wg-quantity d-flex align-items-center" style={{ border: "1px solid #e5e5e5", borderRadius: 8 }}>
                                        <button className="btn-quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ width: 40, height: 44, border: 0, background: "none" }}>−</button>
                                        <input value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="quantity-product" style={{ width: 48, textAlign: "center", border: 0 }} />
                                        <button className="btn-quantity" onClick={() => setQty((q) => q + 1)} style={{ width: 40, height: 44, border: 0, background: "none" }}>+</button>
                                    </div>
                                    <button className="tf-btn btn-fill flex-grow-1" onClick={() => add(product, qty)} style={{ height: 48 }}>Add to cart — {money(product.price * qty)}</button>
                                </div>
                                <RLink to="checkout.html" className="tf-btn btn-dark w-100" style={{ height: 48 }}>Buy it now</RLink>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="flat-spacing-4 pt-0">
                <div className="container">
                    <div className="d-flex align-items-center justify-content-between flex-wrap mb-4" style={{ gap: 12 }}>
                        <h4 className="mb-0">Customer reviews</h4>
                        {reviews.length > 0 && (
                            <span className="text-body-default text_secondary">
                                <span style={{ color: "#f59e0b" }}>{"★".repeat(Math.max(1, Math.round(avg)))}</span> {avg.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? "" : "s"}
                            </span>
                        )}
                    </div>
                    <div className="row g-4">
                        <div className="col-lg-7">
                            {reviews.length === 0 && <p className="text-body-default text_secondary">No reviews yet — be the first to share your experience.</p>}
                            {reviews.map((r) => (
                                <div key={r.id} style={{ borderBottom: "1px solid #eee", paddingBottom: 16, marginBottom: 16 }}>
                                    <div style={{ color: "#f59e0b" }}>{"★".repeat(Math.max(1, Math.round(r.rating)))}</div>
                                    {r.title && <strong className="d-block">{r.title}</strong>}
                                    <p className="text-body-default text_secondary mb-1">{r.body}</p>
                                    <span className="text-body-small text_secondary">— {r.author_name}</span>
                                </div>
                            ))}
                        </div>
                        <div className="col-lg-5">
                            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 24 }}>
                                {revSent ? (
                                    <p className="text-body-default text_secondary mb-0">Thanks — your review will appear once approved.</p>
                                ) : (
                                    <form onSubmit={sendReview}>
                                        <h5 className="mb-3">Write a review</h5>
                                        <div className="mb-2">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} onClick={() => setRev({ ...rev, rating: n })} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: n <= rev.rating ? "#f59e0b" : "#cbd5e1" }}>★</button>)}</div>
                                        <div className="mb-2"><input className="form-control" placeholder="Your name" value={rev.author} onChange={(e) => setRev({ ...rev, author: e.target.value })} /></div>
                                        <div className="mb-2"><input className="form-control" placeholder="Title (optional)" value={rev.title} onChange={(e) => setRev({ ...rev, title: e.target.value })} /></div>
                                        <div className="mb-3"><textarea className="form-control" rows={3} placeholder="Your review" value={rev.body} onChange={(e) => setRev({ ...rev, body: e.target.value })} /></div>
                                        <button className="tf-btn btn-fill w-100" style={{ height: 46 }} disabled={revBusy}>{revBusy ? "Submitting…" : "Submit review"}</button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <ProductGrid title="You may also like" items={products.slice(1, 5)} />
        </Layout>
    );
}
