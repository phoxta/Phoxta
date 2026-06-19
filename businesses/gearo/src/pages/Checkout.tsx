import { useState } from "react";
import Layout from "@/components/layout/Layout";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { useCart } from "@/util/cart";
import { useCatalog } from "@/util/catalog";
import { placeOrder } from "@/lib/phoxta";
import { money } from "@/util/products";
import RLink from "@/components/common/RLink";

export default function Checkout() {
    const { lines, subtotal, clear } = useCart();
    const { orgId, live } = useCatalog();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [placed, setPlaced] = useState<{ id: string | null } | null>(null);

    async function place() {
        setSubmitting(true);
        let id: string | null = null;
        try {
            // Live tenant → record a real order (priced server-side, shows in the
            // operating console). Demo/dev just confirms locally.
            if (live && orgId) {
                const items = lines.filter((l) => l.product.dbId).map((l) => ({ product_id: l.product.dbId as string, quantity: l.qty }));
                if (items.length) id = await placeOrder(orgId, `${firstName} ${lastName}`.trim() || "Guest", email, items);
            }
        } catch { /* keep demo confirmation */ }
        clear();
        setSubmitting(false);
        setPlaced({ id });
    }

    return (
        <Layout>
            <Breadcrumb title="Checkout" />
            <section className="flat-spacing-4">
                <div className="container">
                    {placed ? (
                        <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", border: "1px solid #eee", borderRadius: 12, padding: 32 }}>
                            <h4 className="mb-2">Thank you — your order is in!</h4>
                            <p className="text_secondary mb-3">
                                {placed.id ? <>Order reference <strong>{placed.id}</strong>. We've emailed your confirmation.</> : "We've received your order and will be in touch shortly."}
                            </p>
                            {placed.id && (
                                <RLink to="order.html" className="tf-btn btn-fill" style={{ height: 46, display: "inline-flex", alignItems: "center", padding: "0 22px" }}>Track your order</RLink>
                            )}
                        </div>
                    ) : (
                        <div className="row">
                            <div className="col-lg-7">
                                <h5 className="mb-3">Billing details</h5>
                                <form className="row g-3" onSubmit={(e) => e.preventDefault()}>
                                    <div className="col-md-6"><input className="form-control" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
                                    <div className="col-md-6"><input className="form-control" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
                                    <div className="col-12"><input className="form-control" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                                    <div className="col-12"><input className="form-control" placeholder="Address" /></div>
                                    <div className="col-md-6"><input className="form-control" placeholder="City" /></div>
                                    <div className="col-md-6"><input className="form-control" placeholder="Postcode" /></div>
                                    <div className="col-12"><input className="form-control" placeholder="Phone" /></div>
                                </form>
                            </div>
                            <div className="col-lg-5">
                                <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 20 }}>
                                    <h5 className="mb-3">Your order</h5>
                                    {lines.length === 0 && <p className="text_secondary">Your cart is empty.</p>}
                                    {lines.map((l) => (
                                        <div key={l.product.id} className="d-flex justify-content-between mb-2">
                                            <span>{l.product.title} × {l.qty}</span>
                                            <span>{money(l.product.price * l.qty)}</span>
                                        </div>
                                    ))}
                                    <div className="d-flex justify-content-between mt-3 pt-3" style={{ borderTop: "1px solid #eee", fontWeight: 600 }}>
                                        <span>Total</span><span>{money(subtotal)}</span>
                                    </div>
                                    <button className="tf-btn btn-fill w-100 mt-3" style={{ height: 48 }} disabled={lines.length === 0 || submitting} onClick={place}>
                                        {submitting ? "Placing…" : "Place order"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </Layout>
    );
}
