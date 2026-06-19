import { useState } from "react";
import Layout from "@/components/Layout";
import { useMenu } from "@/util/menu";
import { submitContact } from "@/lib/phoxta";

const fmtTime = (t?: string) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM";
    return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${ap}`;
};

export default function Contact() {
    const { orgId, live, profile } = useMenu();
    const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
    const [sent, setSent] = useState(false);
    const [busy, setBusy] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        try { if (live && orgId) await submitContact(orgId, form.name, form.email, form.subject, form.message); } catch { /* still confirm */ }
        setBusy(false);
        setSent(true);
    }

    const address = profile?.address || "24 Gastronomy Lane, Downtown · City Centre";
    const phone = profile?.phone || "+1 (555) 123-4567";
    const email = profile?.email || "hello@saveur.com";
    const hours = profile?.hours ?? [];
    const mapQ = profile?.mapQuery || profile?.address;

    return (
        <Layout>
            <header className="page-header">
                <div className="container inner">
                    <h1 className="serif">Get in Touch</h1>
                    <p>Questions, private events or press — we'd love to hear from you.</p>
                </div>
            </header>
            <section className="menu-section">
                <div className="container">
                    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 40, alignItems: "start" }} className="contact-grid">
                        <div className="card-box">
                            <h2 className="serif" style={{ fontSize: 28, color: "var(--dark)", marginBottom: 20 }}>Send a message</h2>
                            {sent ? (
                                <div className="res-success" style={{ color: "var(--success)" }}><i className="fas fa-check-circle" /> Thank you — we'll be in touch shortly.</div>
                            ) : (
                                <form onSubmit={submit}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                        <div className="field"><label>Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                                        <div className="field"><label>Email</label><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                                    </div>
                                    <div className="field"><label>Subject</label><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
                                    <div className="field"><label>Message</label><textarea rows={5} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
                                    <button className="btn-accent" style={{ borderRadius: 8 }} disabled={busy}>{busy ? "Sending…" : "Send Message"}</button>
                                </form>
                            )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div className="card-box"><h3 className="serif" style={{ fontSize: 22, marginBottom: 10 }}><i className="fas fa-map-marker-alt" style={{ color: "var(--accent)", marginRight: 8 }} />Visit</h3><p style={{ color: "var(--text-light)" }}>{address}</p></div>
                            <div className="card-box"><h3 className="serif" style={{ fontSize: 22, marginBottom: 10 }}><i className="fas fa-phone" style={{ color: "var(--accent)", marginRight: 8 }} />Call</h3><p style={{ color: "var(--text-light)" }}>{phone}<br />{email}</p></div>
                            <div className="card-box">
                                <h3 className="serif" style={{ fontSize: 22, marginBottom: 10 }}><i className="fas fa-clock" style={{ color: "var(--accent)", marginRight: 8 }} />Hours</h3>
                                {hours.length > 0 ? (
                                    <div style={{ color: "var(--text-light)", fontSize: 14 }}>
                                        {hours.map((h) => (
                                            <div key={h.day} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                                                <span>{h.day}</span><span>{h.closed ? "Closed" : `${fmtTime(h.open)} – ${fmtTime(h.close)}`}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ color: "var(--text-light)" }}>Lunch · Tue–Sun 12–2:30pm<br />Dinner · Tue–Sat 6–10:30pm</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {mapQ && (
                        <div style={{ marginTop: 32, borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)" }}>
                            <iframe title="Map" width="100%" height="360" style={{ border: 0, display: "block" }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps?q=${encodeURIComponent(mapQ)}&output=embed`} />
                        </div>
                    )}
                </div>
            </section>
        </Layout>
    );
}
