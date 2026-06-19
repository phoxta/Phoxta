import { useState } from "react";
import PageHero from "@/components/PageHero";
import { useCatalog } from "@/util/catalog";
import { lookupOrder, type OrderLookup } from "@/lib/phoxta";

// Guest order tracking. Storefronts are anonymous, so a buyer looks up their own
// order with the reference (order id) from checkout + the email they used — both
// must match server-side (app_lookup_order), keeping it private.
const STATUS_COLOR: Record<string, string> = {
    pending: "#92400e", paid: "#166534", fulfilled: "#166534", shipped: "#1d4ed8",
    delivered: "#166534", completed: "#475569", cancelled: "#b91c1c", refunded: "#b91c1c",
};

export default function OrderTrackingPage() {
    const { orgId } = useCatalog();
    const [ref, setRef] = useState("");
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<OrderLookup | null>(null);
    const [err, setErr] = useState("");

    async function lookup(e: React.FormEvent) {
        e.preventDefault();
        setErr("");
        setResult(null);
        if (!ref.trim() || !email.trim()) { setErr("Enter your order reference and the email you used."); return; }
        if (!orgId) { setErr("Order tracking works on the live store."); return; }
        setBusy(true);
        const r = await lookupOrder(orgId, ref.trim(), email.trim());
        setBusy(false);
        if (r && r.found) setResult(r);
        else setErr("No order found with that reference and email.");
    }

    const created = result?.created_at ? new Date(result.created_at).toLocaleDateString() : "";
    const status = result ? (result.fulfillment_status || result.status) : "";

    return (
        <>
            <PageHero eyebrow="Order Tracking" title="Track your order" subtitle="Enter the order reference from your confirmation email and the email you checked out with." />
            <section className="pb-80">
                <div className="container" style={{ maxWidth: 640 }}>
                    <form className="bg-neutral-50 rounded-4 p-4 p-lg-5 mb-4" onSubmit={lookup}>
                        <div className="row g-3">
                            <div className="col-md-6"><input className="form-control" placeholder="Order reference" value={ref} onChange={(e) => setRef(e.target.value)} /></div>
                            <div className="col-md-6"><input className="form-control" type="email" placeholder="Email used at checkout" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                            {err && <div className="col-12"><p className="text-danger mb-0">{err}</p></div>}
                            <div className="col-12"><button className="btn btn-dark rounded-pill" disabled={busy}>{busy ? "Looking up…" : "Track order"}</button></div>
                        </div>
                    </form>

                    {result && (
                        <div className="bg-neutral-0 border border-100 rounded-4 p-4 p-lg-5">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h5 className="fw-600 mb-0">Order {created && <span className="neutral-500" style={{ fontWeight: 400, fontSize: 14 }}>· {created}</span>}</h5>
                                <span style={{ textTransform: "capitalize", fontWeight: 600, color: STATUS_COLOR[status] || "#475569" }}>{status}</span>
                            </div>
                            <p className="neutral-500 mb-3">{result.customer_name}</p>
                            {result.items.map((it, i) => (
                                <div key={i} className="d-flex justify-content-between mb-1">
                                    <span>{it.name} × {it.quantity}</span>
                                    <span>{result.currency === "usd" || !result.currency ? "$" : ""}{((it.unit_price_cents * it.quantity) / 100).toFixed(2)}</span>
                                </div>
                            ))}
                            <div className="d-flex justify-content-between mt-3 pt-3 fw-600" style={{ borderTop: "1px solid #eee" }}>
                                <span>Total</span><span>${(result.total_cents / 100).toFixed(2)}</span>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}
