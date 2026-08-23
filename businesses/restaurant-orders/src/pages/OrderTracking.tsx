import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { useMenu } from "@/util/menu";
import { lookupOrder, type StorefrontPayment } from "@/lib/phoxta";
import { openPaystackPopup } from "@/lib/paystackPopup";

const STEPS = [
    { icon: "fa-receipt", label: "Order received", note: "We've got your order" },
    { icon: "fa-fire-burner", label: "In the kitchen", note: "Our chefs are preparing it" },
    { icon: "fa-box", label: "Ready", note: "Packed and ready" },
    { icon: "fa-circle-check", label: "Completed", note: "Enjoy your meal" },
];

// How the /track page verifies payment: poll the guest order lookup (0060 —
// same RPC as manual tracking) every 3s for up to 2 min. The Paystack webhook
// flips orders.status to 'paid', so this works even when the popup's
// onSuccess/onCancel callbacks never fire.
const POLL_MS = 3000;
const POLL_MAX_MS = 120000;

const isPaidStatus = (s: string | undefined) => s === "paid" || s === "fulfilled";

function fmtCents(cents: number, currency: string): string {
    try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "GBP" }).format(cents / 100);
    } catch {
        return `${(cents / 100).toFixed(2)} ${currency}`.trim();
    }
}

type TrackState = { payment?: StorefrontPayment; amount?: string } | null;

export default function OrderTracking() {
    const [sp] = useSearchParams();
    const order = sp.get("order") ?? "SVR-0000";
    const email = sp.get("email") ?? "";
    const { orgId } = useMenu();
    // Handed over from Checkout when the tenant has payments configured: the
    // Paystack transaction (access_code for the popup, url as fallback).
    const state = useLocation().state as TrackState;
    const payment = state?.payment;
    const [amount, setAmount] = useState<string | null>(state?.amount ?? null);
    const [paid, setPaid] = useState(false);
    const [pollTimedOut, setPollTimedOut] = useState(false);
    const [step, setStep] = useState(0);
    const openedRef = useRef(false);

    // Payment is pending until the order lookup confirms it landed.
    const awaitingPayment = Boolean(payment) && !paid;

    /** One server-side check: the order is paid when the guest lookup (the same
     *  RPC the manual /track flow uses) reports status 'paid'/'fulfilled'. */
    const checkPaid = useCallback(async (): Promise<boolean> => {
        if (!orgId || !email) return false;
        const r = await lookupOrder(orgId, order, email);
        if (!r?.found) return false;
        if (typeof r.total_cents === "number" && r.total_cents > 0) setAmount(fmtCents(r.total_cents, r.currency));
        if (isPaidStatus(r.status)) { setPaid(true); return true; }
        return false;
    }, [orgId, email, order]);

    const openPopup = useCallback(() => {
        if (!payment) return;
        void openPaystackPopup(payment.access_code, payment.url, {
            // Best-effort: when the popup does report success, verify right away
            // instead of waiting for the next poll tick.
            onSuccess: () => { void checkPaid(); },
            onCancel: () => { /* stay on the pending state — Pay now re-opens */ },
        });
    }, [payment, checkPaid]);

    // Auto-open the payment popup once, as soon as we land here unpaid.
    useEffect(() => {
        if (!awaitingPayment || openedRef.current) return;
        openedRef.current = true;
        openPopup();
    }, [awaitingPayment, openPopup]);

    // Poll the lookup until the webhook marks the order paid (max 2 minutes).
    useEffect(() => {
        if (!payment || paid || !orgId || !email) return;
        let stopped = false;
        const startedAt = Date.now();
        const iv = setInterval(() => {
            if (stopped) return;
            if (Date.now() - startedAt > POLL_MAX_MS) { clearInterval(iv); setPollTimedOut(true); return; }
            void checkPaid().then((done) => { if (done) clearInterval(iv); });
        }, POLL_MS);
        void checkPaid().then((done) => { if (done) clearInterval(iv); });
        return () => { stopped = true; clearInterval(iv); };
    }, [payment, paid, orgId, email, checkPaid]);

    // The kitchen progress animation only makes sense once the order is
    // actually confirmed (paid, or a pay-later tenant with no payment step).
    useEffect(() => {
        if (awaitingPayment) return;
        const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 3500);
        return () => clearInterval(t);
    }, [awaitingPayment]);

    return (
        <Layout>
            <header className="page-header">
                <div className="container inner">
                    <h1 className="serif">{awaitingPayment ? "Complete Your Payment" : "Track Your Order"}</h1>
                    {awaitingPayment
                        ? <p>Order <strong>{order}</strong> · awaiting payment</p>
                        : <p>Order <strong>{order}</strong> · estimated ready in 20–25 minutes</p>}
                </div>
            </header>
            <section className="menu-section">
                <div className="container" style={{ maxWidth: 720 }}>
                    {awaitingPayment ? (
                        <div className="card-box" style={{ textAlign: "center" }}>
                            <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--cream-dark)", color: "var(--accent)" }}>
                                <i className="fas fa-lock" style={{ fontSize: 20 }} />
                            </div>
                            <h3 className="serif" style={{ fontSize: 24, marginBottom: 8 }}>Complete your payment</h3>
                            <p style={{ fontSize: 14, color: "var(--text-light)", marginBottom: 6 }}>
                                Your order is reserved — complete payment to confirm it with the kitchen.
                            </p>
                            <p style={{ fontSize: 14, marginBottom: 16 }}>
                                Order <strong>{order}</strong>{amount ? <> · Total <strong>{amount}</strong></> : null}
                            </p>
                            <button type="button" className="btn-accent" style={{ borderRadius: 8, justifyContent: "center", padding: "12px 28px" }} onClick={openPopup}>
                                <i className="fas fa-lock" style={{ marginRight: 8 }} />Pay now{amount ? ` · ${amount}` : ""}
                            </button>
                            <p style={{ fontSize: 12, color: "var(--text-light)", marginTop: 14, marginBottom: 0 }}>
                                <i className="fas fa-shield-halved" style={{ marginRight: 6 }} />
                                Secure payment by Paystack. {pollTimedOut
                                    ? "Already paid? Reopen this page from your confirmation email, or ask the concierge to check your order."
                                    : "This page updates automatically once your payment is received."}
                            </p>
                        </div>
                    ) : (
                        <>
                            {payment && paid && (
                                <div className="card-box" style={{ marginBottom: 20, textAlign: "center" }}>
                                    <h3 className="serif" style={{ fontSize: 22, marginBottom: 6 }}>
                                        <i className="fas fa-circle-check" style={{ color: "var(--success)", marginRight: 8 }} />Payment received — thank you!
                                    </h3>
                                    <p style={{ fontSize: 14, color: "var(--text-light)", margin: 0 }}>
                                        Your order is confirmed{amount ? <> · <strong>{amount}</strong> paid</> : null}. The kitchen has it now — follow its progress below.
                                    </p>
                                </div>
                            )}
                            <div className="card-box">
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {STEPS.map((s, i) => {
                                        const active = i <= step;
                                        return (
                                            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 18, padding: "16px 0", opacity: active ? 1 : 0.4 }}>
                                                <div style={{ width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: active ? "var(--accent)" : "var(--cream-dark)", color: active ? "#fff" : "var(--text-light)", flexShrink: 0 }}>
                                                    <i className={`fas ${s.icon}`} />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div className="serif" style={{ fontSize: 22, color: "var(--dark)" }}>{s.label}</div>
                                                    <div style={{ fontSize: 14, color: "var(--text-light)" }}>{s.note}</div>
                                                </div>
                                                {i === step && <span className="badge-pill">Now</span>}
                                                {i < step && <i className="fas fa-check" style={{ color: "var(--success)" }} />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <p style={{ textAlign: "center", color: "var(--text-light)", marginTop: 20, fontSize: 14 }}>
                                <i className="fas fa-robot" style={{ color: "var(--accent)", marginRight: 6 }} />
                                Questions about your order? Ask the concierge in the corner — it knows your order status.
                            </p>
                        </>
                    )}
                </div>
            </section>
        </Layout>
    );
}
