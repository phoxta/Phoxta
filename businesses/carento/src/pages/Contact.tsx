import Layout from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import { useFleet } from "@/util/fleet";
import { submitContact, fetchReviews, submitReview, type Review } from "@/lib/phoxta";

const fmtTime = (t?: string) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export default function Contact() {
    const { orgId, profile } = useFleet();
    const [f, setF] = useState({ name: "", email: "", subject: "", message: "" });
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);
    const [err, setErr] = useState("");
    const set = (k: string) => (e: any) => setF((s) => ({ ...s, [k]: e.target.value }));

    const [reviews, setReviews] = useState<Review[]>([]);
    const [rev, setRev] = useState({ author: "", rating: 5, title: "", body: "" });
    const [revSent, setRevSent] = useState(false);
    const [revBusy, setRevBusy] = useState(false);
    useEffect(() => { if (orgId) fetchReviews(orgId).then(setReviews); }, [orgId]);

    async function submit(e: any) {
        e.preventDefault();
        setErr("");
        if (!f.name.trim() || !f.email.trim()) { setErr("Please enter your name and email."); return; }
        setBusy(true);
        try {
            if (orgId) await submitContact(orgId, f.name, f.email, f.subject, f.message);
            setSent(true);
        } catch {
            setErr("Sorry, that didn't go through. Please try again.");
        } finally {
            setBusy(false);
        }
    }

    async function sendReview(e: any) {
        e.preventDefault();
        if (!orgId || !rev.author.trim() || !rev.body.trim()) return;
        setRevBusy(true);
        const ok = await submitReview(orgId, rev);
        setRevBusy(false);
        if (ok) { setRevSent(true); setRev({ author: "", rating: 5, title: "", body: "" }); }
    }

    const address = profile?.address;
    const phone = profile?.phone;
    const email = profile?.email;
    const hours = profile?.hours ?? [];
    const mapQ = profile?.mapQuery || profile?.address;

    return (
        <Layout footerStyle={1}>
            <section className="section-box pt-80 pb-80 background-body">
                <div className="container">
                    <div className="text-center mb-40">
                        <h3 className="neutral-1000">Get in touch</h3>
                        <p className="text-xl-medium neutral-500">Questions about a rental? Send us a message.</p>
                    </div>

                    <div className="row g-4">
                        <div className="col-lg-7">
                            {sent ? (
                                <div className="card border rounded-3 p-5 text-center background-card">
                                    <h5 className="neutral-1000">Thanks, {f.name || "there"}!</h5>
                                    <p className="text-md-medium neutral-500 mb-0">We've received your message and will reply to {f.email} shortly.</p>
                                </div>
                            ) : (
                                <form className="card border rounded-3 p-4 background-card" onSubmit={submit}>
                                    <div className="row">
                                        <div className="col-md-6 mb-3"><input className="form-control" placeholder="Your name" value={f.name} onChange={set("name")} /></div>
                                        <div className="col-md-6 mb-3"><input className="form-control" type="email" placeholder="Email" value={f.email} onChange={set("email")} /></div>
                                    </div>
                                    <div className="mb-3"><input className="form-control" placeholder="Subject" value={f.subject} onChange={set("subject")} /></div>
                                    <div className="mb-3"><textarea className="form-control" rows={5} placeholder="How can we help?" value={f.message} onChange={set("message")} /></div>
                                    {err && <p className="text-md-medium mb-3" style={{ color: "#c0392b" }}>{err}</p>}
                                    <button className="btn btn-brand-2" disabled={busy}>{busy ? "Sending…" : "Send message"}</button>
                                </form>
                            )}
                        </div>

                        <div className="col-lg-5">
                            {(address || phone || hours.length > 0) && (
                                <div className="card border rounded-3 p-4 background-card">
                                    <h6 className="neutral-1000 mb-3">Visit us</h6>
                                    {address && <p className="text-md-medium neutral-700 mb-2"><i className="fas fa-map-marker-alt me-2" />{address}</p>}
                                    {phone && <p className="text-md-medium neutral-700 mb-2"><i className="fas fa-phone me-2" />{phone}</p>}
                                    {email && <p className="text-md-medium neutral-700 mb-3"><i className="fas fa-envelope me-2" />{email}</p>}
                                    {hours.length > 0 && (
                                        <div className="text-sm-medium neutral-600">
                                            {hours.map((h) => (
                                                <div key={h.day} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                                                    <span>{h.day}</span><span>{h.closed ? "Closed" : `${fmtTime(h.open)} – ${fmtTime(h.close)}`}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {mapQ && (
                        <div className="rounded-3 overflow-hidden border mt-4">
                            <iframe title="Map" width="100%" height="340" style={{ border: 0, display: "block" }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps?q=${encodeURIComponent(mapQ)}&output=embed`} />
                        </div>
                    )}

                    {/* Reviews */}
                    <div className="mt-5">
                        <h4 className="neutral-1000 mb-3">Customer reviews</h4>
                        <div className="row g-3 mb-4">
                            {reviews.slice(0, 4).map((r) => (
                                <div key={r.id} className="col-md-6">
                                    <div className="card border rounded-3 p-3 background-card h-100">
                                        <div style={{ color: "#f59e0b" }}>{"★".repeat(Math.max(1, Math.round(r.rating)))}</div>
                                        {r.title && <strong className="neutral-1000 d-block">{r.title}</strong>}
                                        <p className="text-md-medium neutral-700 mb-1">{r.body}</p>
                                        <span className="text-sm-medium neutral-500">— {r.author_name}</span>
                                    </div>
                                </div>
                            ))}
                            {reviews.length === 0 && <div className="col-12 neutral-500 text-md-medium">No reviews yet — be the first.</div>}
                        </div>
                        <div className="card border rounded-3 p-4 background-card" style={{ maxWidth: 560 }}>
                            {revSent ? (
                                <p className="text-md-medium neutral-700 mb-0">Thanks — your review will appear once approved.</p>
                            ) : (
                                <form onSubmit={sendReview}>
                                    <h6 className="neutral-1000 mb-3">Leave a review</h6>
                                    <div className="mb-2">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} onClick={() => setRev({ ...rev, rating: n })} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: n <= rev.rating ? "#f59e0b" : "#cbd5e1" }}>★</button>)}</div>
                                    <div className="row">
                                        <div className="col-md-6 mb-2"><input className="form-control" placeholder="Your name" value={rev.author} onChange={(e) => setRev({ ...rev, author: e.target.value })} /></div>
                                        <div className="col-md-6 mb-2"><input className="form-control" placeholder="Title (optional)" value={rev.title} onChange={(e) => setRev({ ...rev, title: e.target.value })} /></div>
                                    </div>
                                    <div className="mb-3"><textarea className="form-control" rows={3} placeholder="Your review" value={rev.body} onChange={(e) => setRev({ ...rev, body: e.target.value })} /></div>
                                    <button className="btn btn-brand-2" disabled={revBusy}>{revBusy ? "Submitting…" : "Submit review"}</button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    );
}
