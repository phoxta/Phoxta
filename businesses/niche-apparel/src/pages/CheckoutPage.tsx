import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "@/util/cart";
import { useCatalog } from "@/util/catalog";
import { placeOrder, lookupOrder, supabase, type OrderLookup } from "@/lib/phoxta";
import { openPaystackPopup } from "@/lib/paystackPopup";

// Online payment (Paystack popup) state for a just-placed order. The order is
// only "reserved" until the guest lookup confirms it as paid server-side.
type Payment = { accessCode: string | null; url: string; amount: number; email: string };

const PAID_STATUSES = ["paid", "fulfilled", "shipped", "delivered", "completed"];
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_MS = 120000;

function orderIsPaid(r: OrderLookup | null): boolean {
    if (!r || !r.found) return false;
    const raw = r as OrderLookup & { paid_at?: string | null };
    return PAID_STATUSES.includes(r.status) || Boolean(raw.paid_at);
}

export default function CheckoutPage() {
    const { lines, subtotal, clear } = useCart();
    const { orgId } = useCatalog();
    const [done, setDone] = useState<{ code: string; ref: string | null } | null>(null);
    const [payment, setPayment] = useState<Payment | null>(null);
    const [paid, setPaid] = useState(false);
    const [payNote, setPayNote] = useState<string | null>(null);
    const [first, setFirst] = useState("");
    const [last, setLast] = useState("");
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const checkNowRef = useRef<(() => void) | null>(null);
    const autoOpenedRef = useRef(false);
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
                if (id) {
                    // Best-effort online payment: if the tenant has Paystack configured
                    // we get an access_code/url and show the awaiting-payment screen
                    // (popup checkout); otherwise the pay-later confirmation stands.
                    try {
                        const returnUrl = `${location.origin}/track-order?ref=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}`;
                        const { data } = await supabase.functions.invoke("paystack-storefront-checkout", {
                            body: { orgId, kind: "order", id, returnUrl },
                        });
                        const res = data as { url?: string; access_code?: string; reference?: string } | null;
                        if (res && (res.access_code || res.url)) {
                            setPayment({ accessCode: res.access_code ?? null, url: res.url ?? "", amount: total, email });
                        }
                    } catch { /* payments unavailable — keep pay-later confirmation */ }
                }
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

    // Open (or re-open, after a cancel) the Paystack overlay popup; falls back
    // to the hosted payment page if the inline script can't load.
    const openPayment = useCallback(() => {
        if (!payment) return;
        if (payment.accessCode) {
            void openPaystackPopup(payment.accessCode, payment.url, {
                // Popup callbacks are best-effort: trigger an immediate server-side
                // check instead of waiting for the next poll tick. Never mark paid
                // from the callback alone.
                onSuccess: () => checkNowRef.current?.(),
                onCancel: () => { /* buyer stays on the awaiting-payment screen; Pay Now re-opens */ },
            });
        } else if (payment.url) {
            window.location.assign(payment.url);
        }
    }, [payment]);

    // Auto-open the popup once as soon as the payment state appears.
    useEffect(() => {
        if (payment && !paid && !autoOpenedRef.current) {
            autoOpenedRef.current = true;
            openPayment();
        }
    }, [payment, paid, openPayment]);

    // Poll the guest order lookup (app_lookup_order — same helper the tracking
    // page uses) every 3s for up to 2 minutes. Payment is only ever confirmed
    // from this server-side record, regardless of whether popup callbacks fire.
    useEffect(() => {
        if (!payment || paid || !orgId || !done?.ref) return;
        const ref = done.ref;
        let stopped = false;
        const startedAt = Date.now();
        const check = async (): Promise<boolean> => {
            const r = await lookupOrder(orgId, ref, payment.email);
            if (!stopped && orderIsPaid(r)) { setPaid(true); return true; }
            return false;
        };
        checkNowRef.current = () => { void check(); };
        const timer = window.setInterval(() => {
            if (Date.now() - startedAt > POLL_MAX_MS) {
                window.clearInterval(timer);
                setPayNote("We haven't seen your payment yet. If you already paid, it can take a moment to reflect — check Track Order, or press Pay Now to try again.");
                return;
            }
            void check().then((ok) => { if (ok) window.clearInterval(timer); });
        }, POLL_INTERVAL_MS);
        return () => { stopped = true; window.clearInterval(timer); checkNowRef.current = null; };
    }, [payment, paid, orgId, done]);

    return (
        <section className="pt-150 pb-80">
            <div className="container">
                {done && payment && paid ? (
                    <div className="text-center py-5">
                        <h2 className="fw-600 mb-2">Payment received — thank you!</h2>
                        <p className="neutral-500 mb-1">Your order <strong>{done.code}</strong> is confirmed and on its way.</p>
                        {done.ref && <p className="neutral-500 mb-1 fz-14">Tracking reference: <strong>{done.ref}</strong> — keep this to track your order.</p>}
                        <div className="d-flex gap-2 justify-content-center mt-3 flex-wrap">
                            <Link to="/" className="at-btn bg-dark text-white"><span><span className="text-1">Continue Shopping</span><span className="text-2">Continue Shopping</span></span></Link>
                            {done.ref && <Link to="/track-order" className="at-btn bg-white text-dark"><span><span className="text-1">Track Order</span><span className="text-2">Track Order</span></span></Link>}
                        </div>
                    </div>
                ) : done && payment ? (
                    <div className="text-center py-5">
                        <h2 className="fw-600 mb-2">Complete your payment</h2>
                        <p className="neutral-500 mb-1">Your order <strong>{done.code}</strong> is reserved — complete payment to confirm it.</p>
                        {done.ref && <p className="neutral-500 mb-1 fz-14">Order reference: <strong>{done.ref}</strong></p>}
                        <p className="fw-600 fz-18 mb-1">Amount due: ${payment.amount.toFixed(2)}</p>
                        <p className="neutral-500 mb-1 fz-14">Checking for your payment… this page updates automatically once it's received.</p>
                        {payNote && <p className="neutral-500 mb-1 fz-14">{payNote}</p>}
                        <div className="d-flex gap-2 justify-content-center mt-3 flex-wrap">
                            <button type="button" onClick={openPayment} className="at-btn bg-dark text-white"><span><span className="text-1">Pay Now</span><span className="text-2">Pay Now</span></span></button>
                            {done.ref && <Link to="/track-order" className="at-btn bg-white text-dark"><span><span className="text-1">Track Order</span><span className="text-2">Track Order</span></span></Link>}
                        </div>
                    </div>
                ) : done ? (
                    <div className="text-center py-5">
                        <h2 className="fw-600 mb-2">Order confirmed</h2>
                        <p className="neutral-500 mb-1">Thank you — your order <strong>{done.code}</strong> is on its way.</p>
                        {done.ref && <p className="neutral-500 mb-1 fz-14">Tracking reference: <strong>{done.ref}</strong> — keep this to track your order.</p>}
                        <div className="d-flex gap-2 justify-content-center mt-3 flex-wrap">
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
