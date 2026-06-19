import { useState } from "react";
import { useCatalog } from "@/util/catalog";
import { lookupOrder, type OrderLookup as TOrderLookup } from "@/lib/phoxta";
import { money } from "@/util/products";

// Guest order tracking. Storefronts are anonymous (no customer login), so a
// shopper looks up their own order with the reference (order id) shown at
// checkout + the email they used — both must match server-side, keeping it
// private. Shared by the /order page and the My Account "orders" panel.

const STATUS_COLOR: Record<string, string> = {
    pending: "#92400e", paid: "#166534", fulfilled: "#166534", shipped: "#1d4ed8",
    delivered: "#166534", completed: "#475569", cancelled: "#b91c1c", refunded: "#b91c1c",
};

export default function OrderLookup({ compact = false }: { compact?: boolean }) {
    const { orgId } = useCatalog();
    const [ref, setRef] = useState("");
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<TOrderLookup | null>(null);
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
        <div style={{ maxWidth: compact ? "100%" : 560, margin: compact ? 0 : "0 auto" }}>
            <form className="row g-3" onSubmit={lookup}>
                <div className="col-md-6"><input className="form-control" placeholder="Order reference" value={ref} onChange={(e) => setRef(e.target.value)} /></div>
                <div className="col-md-6"><input className="form-control" type="email" placeholder="Email used at checkout" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                {err && <div className="col-12"><p className="text-body-default mb-0" style={{ color: "#c0392b" }}>{err}</p></div>}
                <div className="col-12"><button className="tf-btn btn-fill" style={{ height: 48 }} disabled={busy}>{busy ? "Looking up…" : "Track order"}</button></div>
            </form>

            {result && (
                <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 24, marginTop: 24 }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h5 className="mb-0">Order {created && <span className="text_secondary" style={{ fontWeight: 400, fontSize: 14 }}>· {created}</span>}</h5>
                        <span style={{ textTransform: "capitalize", fontWeight: 600, color: STATUS_COLOR[status] || "#475569" }}>{status}</span>
                    </div>
                    <p className="text-body-default text_secondary mb-3">{result.customer_name}</p>
                    {result.items.map((it, i) => (
                        <div key={i} className="d-flex justify-content-between mb-1">
                            <span>{it.name} × {it.quantity}</span>
                            <span>{money((it.unit_price_cents * it.quantity) / 100)}</span>
                        </div>
                    ))}
                    <div className="d-flex justify-content-between mt-3 pt-3" style={{ borderTop: "1px solid #eee", fontWeight: 600 }}>
                        <span>Total</span><span>{money(result.total_cents / 100)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
