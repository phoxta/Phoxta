import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";

const STEPS = [
    { icon: "fa-receipt", label: "Order received", note: "We've got your order" },
    { icon: "fa-fire-burner", label: "In the kitchen", note: "Our chefs are preparing it" },
    { icon: "fa-box", label: "Ready", note: "Packed and ready" },
    { icon: "fa-circle-check", label: "Completed", note: "Enjoy your meal" },
];

export default function OrderTracking() {
    const [sp] = useSearchParams();
    const order = sp.get("order") ?? "SVR-0000";
    const [step, setStep] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 3500);
        return () => clearInterval(t);
    }, []);

    return (
        <Layout>
            <header className="page-header">
                <div className="container inner"><h1 className="serif">Track Your Order</h1><p>Order <strong>{order}</strong> · estimated ready in 20–25 minutes</p></div>
            </header>
            <section className="menu-section">
                <div className="container" style={{ maxWidth: 720 }}>
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
                </div>
            </section>
        </Layout>
    );
}
