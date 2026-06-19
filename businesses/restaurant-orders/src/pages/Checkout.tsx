import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useCart } from "@/util/cart";
import { useMenu } from "@/util/menu";
import { placeOrder, validatePromo } from "@/lib/phoxta";
import { money } from "@/data/menu";

export default function Checkout() {
    const { lines, subtotal, clear } = useCart();
    const { orgId, live } = useMenu();
    const [mode, setMode] = useState<"pickup" | "delivery">("pickup");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [orderNote, setOrderNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [promoInput, setPromoInput] = useState("");
    const [promo, setPromo] = useState<{ code: string; discount_cents: number } | null>(null);
    const [promoMsg, setPromoMsg] = useState<string | null>(null);
    const [applying, setApplying] = useState(false);
    const nav = useNavigate();
    const fee = mode === "delivery" ? 5 : 0;
    const tax = Math.round(subtotal * 0.08);
    const discount = promo ? promo.discount_cents / 100 : 0;
    const total = Math.max(0, subtotal + fee + tax - discount);

    async function applyPromo() {
        if (!promoInput.trim()) return;
        if (!live || !orgId) { setPromoMsg("Promo codes apply on the live store."); return; }
        setApplying(true);
        setPromoMsg(null);
        const r = await validatePromo(orgId, promoInput.trim(), Math.round(subtotal * 100));
        setApplying(false);
        if (r.valid) { setPromo({ code: r.code, discount_cents: r.discount_cents }); setPromoMsg(null); }
        else { setPromo(null); setPromoMsg(r.message || "Invalid code"); }
    }

    async function place(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        let id = "SVR-" + Math.floor(1000 + Math.random() * 9000);
        try {
            // Live tenant → record a real order (priced server-side, shows in the
            // operating console). Demo/dev falls back to a local confirmation id.
            if (live && orgId) {
                const items = lines.map((l) => ({ product_id: l.dish.id, quantity: l.qty, options: l.options.map((o) => ({ group: o.group, label: o.label })), notes: l.note }));
                const oid = await placeOrder(orgId, name || "Guest", email, items, orderNote.trim(), promo?.code);
                if (oid) id = oid;
            }
        } catch { /* keep the local id */ }
        clear();
        setSubmitting(false);
        nav(`/track?order=${encodeURIComponent(id)}`);
    }

    return (
        <Layout>
            <header className="page-header">
                <div className="container inner"><h1 className="serif">Checkout</h1><p>Complete your order for pickup or delivery.</p></div>
            </header>
            <section className="menu-section">
                <div className="container">
                    {lines.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "60px 0" }}>
                            <p style={{ color: "var(--text-light)", marginBottom: 20 }}>Your order is empty.</p>
                            <a href="/menu" className="btn-accent" style={{ borderRadius: 8 }}>Browse the menu</a>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 32, alignItems: "start" }} className="contact-grid">
                            <form className="card-box" onSubmit={place}>
                                <h2 className="serif" style={{ fontSize: 26, marginBottom: 16 }}>Details</h2>
                                <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                                    {(["pickup", "delivery"] as const).map((m) => (
                                        <button type="button" key={m} className={`menu-cat${mode === m ? " active" : ""}`} onClick={() => setMode(m)} style={{ flex: 1 }}>
                                            <i className={`fas ${m === "pickup" ? "fa-store" : "fa-motorcycle"}`} style={{ marginRight: 6 }} />{m}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                    <div className="field"><label>Name</label><input required value={name} onChange={(e) => setName(e.target.value)} /></div>
                                    <div className="field"><label>Email</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                                </div>
                                {mode === "delivery" && <div className="field"><label>Delivery address</label><input required /></div>}
                                {mode === "pickup" && <div className="field"><label>Pickup time</label><select><option>As soon as possible</option><option>In 30 minutes</option><option>In 1 hour</option><option>Tonight, 7:00 PM</option></select></div>}
                                <div className="field"><label>Order notes <span style={{ opacity: 0.6 }}>(optional)</span></label><input value={orderNote} onChange={(e) => setOrderNote(e.target.value)} placeholder="Allergies, kitchen or driver instructions…" /></div>
                                <h3 className="serif" style={{ fontSize: 20, margin: "12px 0" }}>Payment</h3>
                                <div className="field"><label>Card number</label><input placeholder="1234 5678 9012 3456" required /></div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                    <div className="field"><label>Expiry</label><input placeholder="MM / YY" required /></div>
                                    <div className="field"><label>CVC</label><input placeholder="123" required /></div>
                                </div>
                                <button className="btn-accent" style={{ width: "100%", justifyContent: "center", borderRadius: 8, marginTop: 8 }} disabled={submitting}>
                                    {submitting ? "Placing…" : `Place Order · ${money(total)}`}
                                </button>
                            </form>
                            <div className="card-box">
                                <h3 className="serif" style={{ fontSize: 22, marginBottom: 14 }}>Your Order</h3>
                                {lines.map((l) => (
                                    <div key={l.lineId} style={{ marginBottom: 10, fontSize: 14 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}><span>{l.qty}× {l.dish.name}</span><span>{money(l.unitPrice * l.qty)}</span></div>
                                        {(l.options.length > 0 || l.note) && <div style={{ fontSize: 12, color: "var(--text-light)" }}>{[l.options.map((o) => o.label).join(", "), l.note].filter(Boolean).join(" · ")}</div>}
                                    </div>
                                ))}
                                {/* Promo code */}
                                <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12 }}>
                                    {promo ? (
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
                                            <span><i className="fas fa-tag" style={{ color: "var(--accent)", marginRight: 6 }} />{promo.code} applied</span>
                                            <button type="button" onClick={() => { setPromo(null); setPromoInput(""); }} style={{ background: "none", border: "none", color: "var(--text-light)", cursor: "pointer" }}>Remove</button>
                                        </div>
                                    ) : (
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <input value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="Promo code" style={{ flex: 1, textTransform: "uppercase" }} />
                                            <button type="button" className="btn-accent" style={{ borderRadius: 8, padding: "0 16px" }} onClick={applyPromo} disabled={applying}>{applying ? "…" : "Apply"}</button>
                                        </div>
                                    )}
                                    {promoMsg && <div style={{ fontSize: 12, color: "#c0392b", marginTop: 6 }}>{promoMsg}</div>}
                                </div>
                                <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12, fontSize: 14, color: "var(--text-light)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span>Subtotal</span><span>{money(subtotal)}</span></div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span>{mode === "delivery" ? "Delivery" : "Pickup"}</span><span>{fee ? money(fee) : "Free"}</span></div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span>Tax</span><span>{money(tax)}</span></div>
                                    {discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "var(--accent)" }}><span>Discount ({promo?.code})</span><span>−{money(discount)}</span></div>}
                                </div>
                                <div className="cart-total" style={{ marginTop: 12 }}><span>Total</span><span>{money(total)}</span></div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </Layout>
    );
}
