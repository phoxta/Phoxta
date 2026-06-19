import Layout from "@/components/Layout";

const STATS = [
    ["Today's Orders", "47", "+12% vs yesterday"],
    ["Covers Tonight", "118", "92% of capacity"],
    ["Revenue (Today)", "$6,240", "+8% vs avg"],
    ["Avg. Order", "$54", "+$3 vs last week"],
];

const ORDERS = [
    ["#SVR-4821", "Online · Pickup", "Duck Breast +2", "$96", "new"],
    ["#SVR-4820", "Online · Delivery", "Truffle Risotto +1", "$58", "preparing"],
    ["#SVR-4819", "Dine-in · Table 7", "Tasting Menu ×2", "$184", "preparing"],
    ["#SVR-4818", "Online · Pickup", "Salmon, Brûlée", "$54", "ready"],
    ["#SVR-4817", "Dine-in · Table 3", "Bisque, Scallops", "$62", "ready"],
];

const RES = [
    ["7:00 PM", "Laurent · 2", "Window booth"],
    ["7:30 PM", "Bergmann · 4", "Anniversary"],
    ["8:00 PM", "Vasquez · 6", "Chef's table"],
    ["8:30 PM", "Okafor · 2", "First visit"],
];

export default function Dashboard() {
    return (
        <Layout>
            <section className="dash">
                <div className="container">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
                        <div>
                            <h1 className="serif" style={{ fontSize: 40, color: "var(--dark)" }}>Service Dashboard</h1>
                            <p style={{ color: "var(--text-light)" }}>Live view of orders, covers and reservations.</p>
                        </div>
                        <span className="badge-pill"><i className="fas fa-circle" style={{ fontSize: 8, marginRight: 6 }} />Live</span>
                    </div>

                    <div className="dash-grid">
                        {STATS.map(([label, num, delta]) => (
                            <div className="dash-stat" key={label}>
                                <div className="label">{label}</div>
                                <div className="num">{num}</div>
                                <div className="delta">{delta}</div>
                            </div>
                        ))}
                    </div>

                    <div className="dash-cols">
                        <div className="card-box" style={{ padding: 0, overflow: "hidden" }}>
                            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <h3 className="serif" style={{ fontSize: 22 }}>Live Orders</h3>
                                <span style={{ fontSize: 12, color: "var(--text-light)" }}><i className="fas fa-robot" style={{ color: "var(--accent)", marginRight: 6 }} />AI routes &amp; times each order</span>
                            </div>
                            <table className="dash-table">
                                <thead><tr><th>Order</th><th>Channel</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
                                <tbody>
                                    {ORDERS.map((o) => (
                                        <tr key={o[0]}>
                                            <td style={{ fontWeight: 600 }}>{o[0]}</td>
                                            <td style={{ color: "var(--text-light)" }}>{o[1]}</td>
                                            <td>{o[2]}</td>
                                            <td>{o[3]}</td>
                                            <td><span className={`status-tag ${o[4]}`}>{o[4]}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="card-box">
                            <h3 className="serif" style={{ fontSize: 22, marginBottom: 14 }}>Tonight's Reservations</h3>
                            {RES.map(([time, party, note]) => (
                                <div key={time + party} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                                    <div className="serif" style={{ fontSize: 18, color: "var(--accent)", minWidth: 70 }}>{time}</div>
                                    <div><div style={{ fontWeight: 600, color: "var(--dark)" }}>{party}</div><div style={{ fontSize: 13, color: "var(--text-light)" }}>{note}</div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    );
}
