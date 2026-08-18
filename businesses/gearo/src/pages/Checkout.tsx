import { useEffect, useRef, useState, type CSSProperties } from "react";
import Layout from "@/components/layout/Layout";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { useCart } from "@/util/cart";
import { useCatalog } from "@/util/catalog";
import { placeOrder, startOrderPayment, lookupOrder, isOrderPaid, type OrderPayment } from "@/lib/phoxta";
import { openPaystackPopup } from "@/lib/paystackPopup";
import { money } from "@/util/products";
import RLink from "@/components/common/RLink";

const POLL_EVERY_MS = 3000;
const POLL_MAX_MS = 120_000;

type Placed = { id: string | null; email: string; total: number; payment: OrderPayment | null };

const cardStyle: CSSProperties = { maxWidth: 520, margin: "0 auto", textAlign: "center", border: "1px solid #eee", borderRadius: 12, padding: 32 };

export default function Checkout() {
    const { lines, subtotal, clear } = useCart();
    const { orgId, live } = useCatalog();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [placed, setPlaced] = useState<Placed | null>(null);
    const [paid, setPaid] = useState(false);
    // Lets the popup's onSuccess (when it fires) trigger an immediate lookup
    // check instead of waiting for the next poll tick.
    const checkNowRef = useRef<() => void>(() => {});

    // Verify payment out-of-band: the popup callbacks can't be relied on, so we
    // poll the same guest order lookup the tracking page uses (every 3s, up to
    // 2 min) until the order shows paid, then switch to the real success state.
    useEffect(() => {
        if (!placed?.payment || !placed.id || !orgId || paid) return;
        let stopped = false;
        const started = Date.now();
        const check = async () => {
            if (stopped) return;
            const r = await lookupOrder(orgId, placed.id as string, placed.email);
            if (stopped || !r || !r.found) return;
            if (isOrderPaid(r)) setPaid(true);
        };
        checkNowRef.current = () => { void check(); };
        const interval = window.setInterval(() => {
            if (Date.now() - started > POLL_MAX_MS) { window.clearInterval(interval); return; }
            void check();
        }, POLL_EVERY_MS);
        return () => { stopped = true; window.clearInterval(interval); checkNowRef.current = () => {}; };
    }, [placed, orgId, paid]);

    // In-page Paystack overlay; falls back to the hosted-checkout redirect when
    // inline.js can't load. Re-invoked by the "Pay now" button after a cancel.
    function openPopup(payment: OrderPayment) {
        if (payment.accessCode) {
            void openPaystackPopup(payment.accessCode, payment.url ?? "", {
                onSuccess: () => checkNowRef.current(),
                onCancel: () => { /* stay on the pending screen; "Pay now" re-opens */ },
            });
        } else if (payment.url) {
            window.location.assign(payment.url);
        }
    }

    async function place() {
        setSubmitting(true);
        let id: string | null = null;
        let payment: OrderPayment | null = null;
        try {
            // Live tenant → record a real order (priced server-side, shows in the
            // operating console). Demo/dev just confirms locally.
            if (live && orgId) {
                const items = lines.filter((l) => l.product.dbId).map((l) => ({ product_id: l.product.dbId as string, quantity: l.qty }));
                if (items.length) id = await placeOrder(orgId, `${firstName} ${lastName}`.trim() || "Guest", email, items);
                // Best-effort online payment: when the tenant has payments set up we
                // get a popup access_code + hosted URL; otherwise pay-later.
                if (id) {
                    const returnUrl = `${location.origin}/order?ref=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}`;
                    payment = await startOrderPayment(orgId, id, returnUrl);
                }
            }
        } catch { /* keep demo confirmation */ }
        const total = subtotal; // capture before the cart clears
        clear();
        setSubmitting(false);
        setPlaced({ id, email, total, payment });
        // Payment-enabled path: open the in-page Paystack popup right away. The
        // order is only "reserved" until the lookup confirms it as paid.
        if (payment) openPopup(payment);
    }

    return (
        <Layout>
            <Breadcrumb title="Checkout" />
            <section className="flat-spacing-4">
                <div className="container">
                    {placed && placed.payment && !paid ? (
                        /* Pending payment — the order exists but is NOT paid yet.
                           No thank-you copy here until the lookup verifies it. */
                        <div style={cardStyle}>
                            <h4 className="mb-2">Complete your payment</h4>
                            <p className="text_secondary mb-3">
                                Your order is reserved — complete payment to confirm it.
                                {placed.id && <> Order reference <strong>{placed.id}</strong>.</>}
                            </p>
                            <div className="d-flex justify-content-between mb-3 pb-3" style={{ borderBottom: "1px solid #eee", fontWeight: 600 }}>
                                <span>Amount due</span><span>{money(placed.total)}</span>
                            </div>
                            <button className="tf-btn btn-fill w-100 mb-2" style={{ height: 48 }} onClick={() => openPopup(placed.payment as OrderPayment)}>
                                Pay now
                            </button>
                            <p className="text_secondary mb-0" style={{ fontSize: 13 }}>
                                The secure Paystack window opens on this page. This screen updates automatically once your payment is received.
                            </p>
                        </div>
                    ) : placed && placed.payment && paid ? (
                        /* Verified success — the guest lookup showed the order paid. */
                        <div style={cardStyle}>
                            <h4 className="mb-2">Payment received — thank you!</h4>
                            <p className="text_secondary mb-3">
                                {placed.id && <>Order reference <strong>{placed.id}</strong>. </>}
                                Your order is confirmed and we&#39;ve emailed your receipt.
                            </p>
                            <RLink to="order.html" className="tf-btn btn-fill" style={{ height: 46, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 22px" }}>Track your order</RLink>
                        </div>
                    ) : placed ? (
                        /* Pay-later path (payments not configured) — unchanged. */
                        <div style={cardStyle}>
                            <h4 className="mb-2">Thank you — your order is in!</h4>
                            <p className="text_secondary mb-3">
                                {placed.id ? <>Order reference <strong>{placed.id}</strong>. We&#39;ve emailed your confirmation.</> : "We've received your order and will be in touch shortly."}
                            </p>
                            {placed.id && (
                                <RLink to="order.html" className="tf-btn btn-fill" style={{ height: 46, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 22px" }}>Track your order</RLink>
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
