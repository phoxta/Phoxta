import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { formatDate } from "@/lib/format";
import { IconArrow, IconCheck } from "@/lib/icons";
import { lookupOrder, orderIsPaid, type OrderLookup } from "@/lib/phoxta";
import PageMeta from "@/components/PageMeta";
import { useCatalog, useMoney } from "@/state/catalog";

/**
 * Order confirmation and guest tracking — the same screen.
 *
 * The lookup needs BOTH the reference and the email that placed the order, so a
 * reference alone (in a shared link, a browser history, an over-the-shoulder
 * glance) reveals nothing.
 */

const STAGES = ["Confirmed", "Packed", "Shipped", "Delivered"];

/** How far along the timeline this order is, from the two status fields the
 *  console maintains. */
function stageIndex(order: OrderLookup): number {
    const fulfilment = (order.fulfillment_status ?? "").toLowerCase();
    if (fulfilment === "fulfilled" || order.status === "fulfilled") return 3;
    if (orderIsPaid(order)) return 1;
    return 0;
}

export default function OrderPage() {
    const { ref } = useParams();
    const [params, setParams] = useSearchParams();
    const { orgId } = useCatalog();
    const money = useMoney();

    const [reference, setReference] = useState(ref ?? params.get("ref") ?? "");
    const [email, setEmail] = useState(params.get("email") ?? "");
    const [order, setOrder] = useState<OrderLookup | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    const look = useCallback(
        async (r: string, e: string) => {
            if (!orgId || !r.trim() || !e.trim()) return;
            setBusy(true);
            setError(null);
            const found = await lookupOrder(orgId, r.trim(), e.trim());
            setBusy(false);
            setSearched(true);
            if (!found || !found.found) {
                setOrder(null);
                setError("We couldn't find an order with that reference and email.");
                return;
            }
            setOrder(found);
        },
        [orgId],
    );

    // Auto-look-up when the link already carries both halves — the confirmation
    // redirect from checkout, and the "track this order" link in the email.
    useEffect(() => {
        const r = ref ?? params.get("ref") ?? "";
        const e = params.get("email") ?? "";
        if (orgId && r && e) void look(r, e);
        // Re-running on every params change would re-query on each keystroke of
        // the manual form, which writes to the URL.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId, ref]);

    const paid = order ? orderIsPaid(order) : false;
    const stage = order ? stageIndex(order) : 0;

    return (
        <div className="page">
            <PageMeta title={order ? "Your order" : "Track your order"} />
            <div className="wrap">
                {order ? (
                    <>
                        <div className="confirm">
                            <div className="tick">
                                <IconCheck />
                            </div>
                            <div className="eyebrow">{paid ? "Thank you" : "Order received"}</div>
                            <h1 className="serif">
                                {paid ? (
                                    <>
                                        Your ritual is on its <em>way</em>
                                    </>
                                ) : (
                                    <>
                                        We have your <em>order</em>
                                    </>
                                )}
                            </h1>
                            <p className="muted" style={{ marginTop: 12 }}>
                                {paid
                                    ? "We've emailed a receipt and we'll be in touch when it ships."
                                    : "It's held for you while the payment clears — this page updates when it does."}
                            </p>
                            <div className="order-no">
                                Order <b>{reference.slice(0, 8).toUpperCase()}</b>
                            </div>
                        </div>

                        <div className="timeline">
                            {STAGES.map((s, i) => (
                                <div className={i <= stage ? undefined : "next"} key={s}>
                                    <b>
                                        {i <= stage ? "✓ " : ""}
                                        {s}
                                    </b>
                                    {i === 0 ? formatDate(order.created_at) : i <= stage ? "Done" : "Pending"}
                                </div>
                            ))}
                        </div>

                        <div className="card-box">
                            <h3 className="serif" style={{ fontSize: 24, fontWeight: 400, marginBottom: 12 }}>
                                Items
                            </h3>
                            {order.items.map((item, i) => (
                                <div
                                    className="line"
                                    key={`${item.name}-${i}`}
                                    style={{ gridTemplateColumns: "1fr auto", padding: "10px 0" }}
                                >
                                    <div>
                                        <b>{item.name}</b>
                                        <small>Quantity {item.quantity}</small>
                                    </div>
                                    <div className="amt">{money(item.unit_price_cents * item.quantity)}</div>
                                </div>
                            ))}
                            <div className="sum total" style={{ marginTop: 12 }}>
                                <span>{paid ? "Total paid" : "Total due"}</span>
                                <span>{money(order.total_cents)}</span>
                            </div>
                        </div>

                        <div className="about-grid">
                            <div className="info-tile">
                                <b>Order for</b>
                                {order.customer_name || "—"}
                            </div>
                            <div className="info-tile">
                                <b>What next</b>
                                Manage this order from your{" "}
                                <Link className="link" to="/account">
                                    account
                                </Link>
                                . Questions?{" "}
                                <Link className="link" to="/contact">
                                    Contact us
                                </Link>
                                .
                            </div>
                        </div>

                        <div style={{ textAlign: "center", marginTop: 32 }}>
                            <Link className="btn" to="/shop">
                                Continue shopping
                                <span className="arr">
                                    <IconArrow />
                                </span>
                            </Link>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="page-head">
                            <div className="crumbs">
                                <Link to="/">Home</Link> / <b>Track order</b>
                            </div>
                            <h1 className="serif">
                                Where&rsquo;s my <em>order?</em>
                            </h1>
                            <p>
                                Enter the reference from your confirmation email and the address you ordered with. We
                                ask for both so nobody else can look up your order.
                            </p>
                        </div>

                        <div className="card-box" style={{ maxWidth: 520 }}>
                            <form
                                className="form-grid"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    setParams({ ref: reference, email }, { replace: true });
                                    void look(reference, email);
                                }}
                                noValidate
                            >
                                <div className="field span">
                                    <label htmlFor="ref">Order reference</label>
                                    <input
                                        id="ref"
                                        value={reference}
                                        placeholder="The reference on your confirmation"
                                        onChange={(e) => setReference(e.target.value)}
                                    />
                                </div>
                                <div className="field span">
                                    <label htmlFor="track-email">Email</label>
                                    <input
                                        id="track-email"
                                        type="email"
                                        value={email}
                                        placeholder="you@email.com"
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <div className="span">
                                    <button className="btn sm plain" disabled={busy || !orgId}>
                                        {busy ? "Looking…" : "Find my order"}
                                    </button>
                                </div>
                            </form>

                            {!orgId && (
                                <p className="small muted" style={{ marginTop: 12 }}>
                                    Order tracking needs a live store — this preview isn&rsquo;t connected to one.
                                </p>
                            )}
                            {error && searched && (
                                <p className="small" style={{ color: "#C0392B", marginTop: 12 }}>
                                    {error}
                                </p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
