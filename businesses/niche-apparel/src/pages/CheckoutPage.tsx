import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "@/util/cart";
import { useCatalog } from "@/util/catalog";
import { placeOrder } from "@/lib/phoxta";

export default function CheckoutPage() {
    const { lines, subtotal, clear } = useCart();
    const { orgId } = useCatalog();
    const [done, setDone] = useState<{ code: string; ref: string | null } | null>(null);
    const [first, setFirst] = useState("");
    const [last, setLast] = useState("");
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const shipping = subtotal >= 100 || subtotal === 0 ? 0 : 8;
    const total = subtotal + shipping;

    async function place(e: React.FormEvent) {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
            // Send the order to the Phoxta backend so it lands in the owner's
            // operating console (Commerce → Orders) as a pending web order.
            if (orgId) {
                const items = lines.map((l) => ({ product_id: l.id, quantity: l.qty, size: l.size, color: l.color }));
                const id = await placeOrder(orgId, `${first} ${last}`.trim(), email, items);
                setDone({ code: id ? `AUR-${id.slice(0, 8).toUpperCase()}` : "AUR-" + Math.floor(10000 + Math.random() * 89999), ref: id });
            } else {
                // Unconfigured/local fallback — confirm without a backend write.
                setDone({ code: "AUR-" + Math.floor(10000 + Math.random() * 89999), ref: null });
            }
            clear();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not place your order. Please try again.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="pt-150 pb-80">
            <div className="container">
                {done ? (
                    <div className="text-center py-5">
                        <h2 className="fw-600 mb-2">Order confirmed</h2>
                        <p className="neutral-500 mb-1">Thank you — your order <strong>{done.code}</strong> is on its way.</p>
                        {done.ref && <p className="neutral-500 mb-1 fz-14">Tracking reference: <strong>{done.ref}</strong> — keep this to track your order.</p>}
                        <div className="d-flex gap-2 justify-content-center mt-3">
                            <Link to="/" className="at-btn bg-dark text-white"><span><span className="text-1">Continue Shopping</span><span className="text-2">Continue Shopping</span></span></Link>
                            {done.ref && <Link to="/track-order" className="at-btn bg-white text-dark"><span><span className="text-1">Track Order</span><span className="text-2">Track Order</span></span></Link>}
                        </div>
                    </div>
                ) : lines.length === 0 ? (
                    <div className="text-center py-5">
                        <p className="neutral-500 mb-3">Your bag is empty.</p>
                        <Link to="/" className="at-btn bg-dark text-white"><span><span className="text-1">Shop Now</span><span className="text-2">Shop Now</span></span></Link>
                    </div>
                ) : (
                    <div className="row g-5">
                        <div className="col-lg-7">
                            <h3 className="fw-600 mb-4">Checkout</h3>
                            <form className="row g-3" onSubmit={place}>
                                <div className="col-md-6"><input className="form-control" placeholder="First name" value={first} onChange={(e) => setFirst(e.target.value)} required /></div>
                                <div className="col-md-6"><input className="form-control" placeholder="Last name" value={last} onChange={(e) => setLast(e.target.value)} required /></div>
                                <div className="col-12"><input className="form-control" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                                <div className="col-12"><input className="form-control" placeholder="Address" required /></div>
                                <div className="col-md-6"><input className="form-control" placeholder="City" required /></div>
                                <div className="col-md-6"><input className="form-control" placeholder="Postcode" required /></div>
                                <div className="col-12 pt-2"><h6 className="fw-600">Payment</h6></div>
                                <div className="col-12"><input className="form-control" placeholder="Card number" required /></div>
                                <div className="col-md-6"><input className="form-control" placeholder="MM / YY" required /></div>
                                <div className="col-md-6"><input className="form-control" placeholder="CVC" required /></div>
                                {error && <div className="col-12"><div className="alert alert-warning py-2 px-3 fz-14 mb-0">{error}</div></div>}
                                <div className="col-12"><button disabled={busy} className="at-btn bg-dark text-white w-100" style={{ justifyContent: "center" }}><span><span className="text-1">{busy ? "Placing…" : `Place Order — $${total.toFixed(2)}`}</span><span className="text-2">{busy ? "Placing…" : `Place Order — $${total.toFixed(2)}`}</span></span></button></div>
                            </form>
                        </div>
                        <div className="col-lg-5">
                            <div className="bg-neutral-50 rounded-4 p-4">
                                <h5 className="fw-600 mb-3">Your Order</h5>
                                {lines.map((l) => (
                                    <div key={l.id + l.size + l.color} className="d-flex justify-content-between mb-2 fz-14"><span>{l.qty}× {l.title} ({l.size}{l.color ? ` / ${l.color}` : ""})</span><span>${(l.price * l.qty).toFixed(2)}</span></div>
                                ))}
                                <hr className="border-100" />
                                <div className="d-flex justify-content-between mb-2 fz-14"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                                <div className="d-flex justify-content-between mb-2 fz-14"><span>Shipping</span><span>{shipping ? `$${shipping.toFixed(2)}` : "Free"}</span></div>
                                <div className="d-flex justify-content-between fw-600 fz-18 pt-2"><span>Total</span><span>${total.toFixed(2)}</span></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
