import Layout from "@/components/Layout";
import ReservationWidget from "@/components/ReservationWidget";

const FAQ = [
    ["How far ahead can I book?", "Reservations open 60 days in advance. Same-day tables are often available — just ask the concierge."],
    ["Large parties & events", "For 8+ guests or private dining, call us or use the contact form and we'll tailor the evening."],
    ["Cancellations", "Plans change — amend or cancel free of charge up to 24 hours before your booking."],
];

export default function Reservations() {
    return (
        <Layout>
            <header className="page-header">
                <div className="container inner">
                    <h1 className="serif">Reservations</h1>
                    <p>Secure your table in seconds. Our AI concierge can also book for you any time, day or night.</p>
                </div>
            </header>
            <ReservationWidget />
            <section className="menu-section">
                <div className="container" style={{ maxWidth: 760 }}>
                    <div className="section-header"><h2 className="section-title">Good to Know</h2></div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {FAQ.map(([q, a]) => (
                            <div className="card-box" key={q}>
                                <h3 className="serif" style={{ fontSize: 22, color: "var(--dark)", marginBottom: 8 }}>{q}</h3>
                                <p style={{ color: "var(--text-light)", fontWeight: 300 }}>{a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </Layout>
    );
}
