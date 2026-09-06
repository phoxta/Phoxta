import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { STORE } from "@/config/brand";
import { IconArrow } from "@/lib/icons";
import PageMeta from "@/components/PageMeta";
import ProductCard from "@/components/ProductCard";
import { useCatalog, useMoney } from "@/state/catalog";
import { shippingFor, useCart } from "@/state/cart";
import { useUi } from "@/state/ui";
import { useWishlist } from "@/state/wishlist";

export default function CartPage() {
    const { lines, count, subtotalCents, discountCents, promo, setQty, remove, applyPromo, clearPromo } = useCart();
    const { products } = useCatalog();
    const money = useMoney();
    const { toast } = useUi();
    const { toggle } = useWishlist();

    const [code, setCode] = useState(promo?.code ?? "");
    const [promoMsg, setPromoMsg] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);

    const payable = Math.max(0, subtotalCents - discountCents);
    const shipping = shippingFor("standard", payable);
    const remaining = Math.max(0, STORE.freeShippingThresholdCents - subtotalCents);
    const progress = Math.min(100, (subtotalCents / STORE.freeShippingThresholdCents) * 100);

    const upsell = useMemo(() => {
        const inBag = new Set(lines.map((l) => l.productId));
        return products.filter((p) => !inBag.has(p.id) && p.stock > 0).slice(0, 4);
    }, [products, lines]);

    async function submitPromo(e: React.FormEvent) {
        e.preventDefault();
        if (checking) return;
        if (!code.trim()) {
            clearPromo();
            setPromoMsg(null);
            return;
        }
        setChecking(true);
        const message = await applyPromo(code);
        setChecking(false);
        setPromoMsg(message ?? "Code applied.");
    }

    return (
        <div className="page">
            <PageMeta title="Your bag" />
            <div className="wrap">
                <div className="page-head">
                    <div className="crumbs">
                        <Link to="/">Home</Link> / <b>Bag</b>
                    </div>
                    <h1 className="serif">
                        Your bag <span className="muted">{count ? `(${count})` : ""}</span>
                    </h1>
                </div>

                <div className="cart-layout">
                    <div>
                        {lines.length > 0 && (
                            <div className="ship-bar">
                                {remaining > 0 ? (
                                    <>
                                        Add <b>{money(remaining)}</b> for free UK delivery
                                    </>
                                ) : (
                                    <b>You&rsquo;ve unlocked free UK delivery</b>
                                )}
                                <div className="bar">
                                    <i style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        )}

                        <div className="cart-lines">
                            {lines.length === 0 ? (
                                <div className="empty">
                                    <b>Your bag is empty</b>
                                    Add a ritual or two.
                                    <br />
                                    <br />
                                    <Link className="btn sm" to="/shop">
                                        Shop best-sellers
                                        <span className="arr">
                                            <IconArrow />
                                        </span>
                                    </Link>
                                </div>
                            ) : (
                                lines.map((l) => (
                                    <div className="line" key={`${l.productId}__${l.size}`}>
                                        <div className="ph">
                                            <Link to={`/product/${l.slug}`}>
                                                <img src={l.img} alt="" width={96} height={116} loading="lazy" />
                                            </Link>
                                        </div>
                                        <div>
                                            <b>
                                                <Link to={`/product/${l.slug}`}>{l.name}</Link>
                                            </b>
                                            <small>
                                                {l.tagline ? `${l.tagline} · ` : ""}
                                                {l.sizeLabel}
                                            </small>
                                            <div style={{ marginTop: 10, display: "flex", gap: 14, alignItems: "center" }}>
                                                <div className="qty sm">
                                                    <button
                                                        type="button"
                                                        onClick={() => setQty(l.productId, l.size, l.qty - 1)}
                                                        aria-label={`Reduce quantity of ${l.name}`}
                                                    >
                                                        &minus;
                                                    </button>
                                                    <span>{l.qty}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setQty(l.productId, l.size, l.qty + 1)}
                                                        aria-label={`Increase quantity of ${l.name}`}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="rm"
                                                    onClick={() => remove(l.productId, l.size)}
                                                >
                                                    Remove
                                                </button>
                                                <button
                                                    type="button"
                                                    className="rm"
                                                    onClick={() => {
                                                        toggle(l.slug);
                                                        remove(l.productId, l.size);
                                                        toast("Saved for later");
                                                    }}
                                                >
                                                    Save for later
                                                </button>
                                            </div>
                                        </div>
                                        <div className="amt">
                                            {money(l.unitPriceCents * l.qty)}
                                            <div className="small muted" style={{ fontWeight: 400 }}>
                                                {money(l.unitPriceCents)} each
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <Link className="link" to="/shop" style={{ display: "inline-block", marginTop: 18 }}>
                            ← Continue shopping
                        </Link>
                    </div>

                    <aside className="summary-box">
                        <h3>Summary</h3>
                        <div className="sum">
                            <span>Subtotal</span>
                            <span>{money(subtotalCents)}</span>
                        </div>
                        {discountCents > 0 && (
                            <div className="sum">
                                <span>Discount ({promo?.code})</span>
                                <span className="free">−{money(discountCents)}</span>
                            </div>
                        )}
                        <div className="sum">
                            <span>Estimated shipping</span>
                            <span className={shipping ? undefined : "free"}>
                                {shipping ? money(shipping) : "Free"}
                            </span>
                        </div>
                        <div className="sum total">
                            <span>Total</span>
                            <span>{money(payable + shipping)}</span>
                        </div>

                        <form className="promo" onSubmit={submitPromo}>
                            <input
                                placeholder="Promo code"
                                value={code}
                                aria-label="Promo code"
                                onChange={(e) => setCode(e.target.value)}
                            />
                            <button className="btn sm plain ghost" disabled={checking}>
                                {checking ? "…" : "Apply"}
                            </button>
                        </form>
                        {promoMsg && (
                            <div
                                className="small muted"
                                style={{ marginTop: 6, color: promo ? "var(--sage)" : "#C0392B" }}
                            >
                                {promoMsg}
                            </div>
                        )}

                        {lines.length > 0 && (
                            <Link className="btn block" to="/checkout" style={{ marginTop: 18 }}>
                                Checkout
                                <span className="arr">
                                    <IconArrow />
                                </span>
                            </Link>
                        )}

                        <div className="pay-icons">
                            {["VISA", "MASTERCARD", "AMEX", "APPLE PAY", "G PAY"].map((p) => (
                                <span key={p}>{p}</span>
                            ))}
                        </div>
                        <div className="secure">🔒 Secure checkout · 30-day returns</div>
                    </aside>
                </div>

                {upsell.length > 0 && (
                    <section className="related">
                        <h2 className="serif">
                            Complete the <em>ritual</em>
                        </h2>
                        <div className="grid4">
                            {upsell.map((p) => (
                                <ProductCard product={p} key={p.id} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
