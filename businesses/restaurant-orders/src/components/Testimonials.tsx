import { useEffect, useMemo, useState } from "react";
import { useMenu } from "@/util/menu";
import { fetchReviews, submitReview, type Review } from "@/lib/phoxta";

const FALLBACK_AVATAR = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop";
const DEMO = [
    { stars: 5, text: "An unforgettable evening — every course arrived like a small work of art, and the concierge even paired our wines before we sat down.", author: "Marie Laurent", source: "Google Review", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" },
    { stars: 5, text: "Faultless from the welcome to the last bite. The truffle risotto alone is worth the trip, and ordering ahead for pickup was effortless.", author: "Thomas Bergmann", source: "TripAdvisor", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" },
    { stars: 5, text: "Warm, refined and genuinely special. We now book every anniversary here — and the AI assistant remembers our usual table.", author: "Elena Vasquez", source: "Yelp Review", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop" },
];

export default function Testimonials() {
    const { orgId } = useMenu();
    const [live, setLive] = useState<Review[]>([]);
    const [i, setI] = useState(0);
    const [form, setForm] = useState({ author: "", rating: 5, title: "", body: "" });
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    useEffect(() => { if (orgId) fetchReviews(orgId).then(setLive); }, [orgId]);

    const slides = useMemo(
        () => (live.length
            ? live.map((r) => ({ stars: Math.max(1, Math.round(r.rating)), text: r.body || r.title, author: r.author_name, source: "Guest Review", img: r.author_avatar || FALLBACK_AVATAR }))
            : DEMO),
        [live],
    );

    useEffect(() => {
        setI(0);
        const t = setInterval(() => setI((p) => (p + 1) % slides.length), 6000);
        return () => clearInterval(t);
    }, [slides.length]);

    async function send(e: React.FormEvent) {
        e.preventDefault();
        if (!orgId || !form.body.trim() || !form.author.trim()) return;
        setSending(true);
        const ok = await submitReview(orgId, form);
        setSending(false);
        if (ok) { setSent(true); setForm({ author: "", rating: 5, title: "", body: "" }); }
    }

    return (
        <section className="testimonials" id="reviews">
            <div className="container">
                <div className="section-header">
                    <div className="section-label">Guest Reviews</div>
                    <h2 className="section-title">What Our Guests Say</h2>
                </div>
                <div className="testimonial-slider">
                    <div className="testimonial-track" style={{ transform: `translateX(-${i * 100}%)` }}>
                        {slides.map((r, idx) => (
                            <div className="testimonial-slide" key={idx}>
                                <div className="stars">{Array.from({ length: r.stars }).map((_, s) => <i key={s} className="fas fa-star" />)}</div>
                                <blockquote>“{r.text}”</blockquote>
                                <div className="testimonial-author">
                                    <img src={r.img} alt={r.author} />
                                    <div className="testimonial-author-info">
                                        <div className="name">{r.author}</div>
                                        <div className="source">{r.source}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="testimonial-dots">
                        {slides.map((_, idx) => (
                            <button key={idx} className={`testimonial-dot${idx === i ? " active" : ""}`} onClick={() => setI(idx)} aria-label={`Review ${idx + 1}`} />
                        ))}
                    </div>
                </div>

                {/* Leave a review */}
                <div className="card-box" style={{ maxWidth: 640, margin: "40px auto 0" }}>
                    {sent ? (
                        <div style={{ textAlign: "center", padding: "12px 0" }}>
                            <i className="fas fa-check-circle" style={{ color: "var(--accent)", marginRight: 8 }} />
                            Thank you — your review has been submitted and will appear once approved.
                        </div>
                    ) : (
                        <form onSubmit={send}>
                            <h3 className="serif" style={{ fontSize: 22, marginBottom: 12 }}>Leave a review</h3>
                            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <button type="button" key={n} onClick={() => setForm({ ...form, rating: n })} aria-label={`${n} stars`} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: n <= form.rating ? "var(--accent)" : "var(--border)" }}>
                                        <i className="fas fa-star" />
                                    </button>
                                ))}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                                <div className="field"><label>Your name</label><input required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></div>
                                <div className="field"><label>Title (optional)</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                            </div>
                            <div className="field" style={{ marginBottom: 12 }}><label>Your review</label><textarea required rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
                            <button type="submit" className="btn-accent" style={{ borderRadius: 8 }} disabled={sending}>{sending ? "Submitting…" : "Submit review"}</button>
                        </form>
                    )}
                </div>
            </div>
        </section>
    );
}
