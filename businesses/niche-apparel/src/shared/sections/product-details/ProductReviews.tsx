import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useCatalog } from "@/util/catalog";
import { fetchReviews, submitReview, type Review } from "@/lib/phoxta";

// Live customer reviews for this product (subject_type='product', subject_ref=id),
// plus a submit form so buyers can leave their own (lands pending for approval).
export default function ProductReviews() {
    const { id } = useParams();
    const { orgId } = useCatalog();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [rev, setRev] = useState({ author: "", rating: 5, title: "", body: "" });
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);

    useEffect(() => {
        if (!orgId || !id) return;
        fetchReviews(orgId, "product", id).then(setReviews).catch(() => {});
    }, [orgId, id]);

    async function send(e: React.FormEvent) {
        e.preventDefault();
        if (!orgId || !rev.author.trim() || !rev.body.trim()) return;
        setBusy(true);
        const ok = await submitReview(orgId, { ...rev, productId: id ?? null });
        setBusy(false);
        if (ok) { setSent(true); setRev({ author: "", rating: 5, title: "", body: "" }); }
    }

    const avg = reviews.length ? (reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length).toFixed(1) : null;

    return (
        <section className="pb-80">
            <div className="container">
                <h3 className="fw-600 mb-1">Reviews</h3>
                <p className="neutral-500 mb-4">{avg ? <>★ {avg} · {reviews.length} review{reviews.length === 1 ? "" : "s"}</> : "No reviews yet — be the first."}</p>
                <div className="row g-4">
                    <div className="col-lg-7">
                        <div className="row g-3">
                            {reviews.map((r) => (
                                <div className="col-md-6" key={r.id}>
                                    <div className="bg-neutral-50 rounded-4 p-4 h-100">
                                        <p className="fw-600 mb-1">{r.author_name} · ★ {Number(r.rating)}</p>
                                        {r.title && <p className="fw-600 mb-1">{r.title}</p>}
                                        <p className="neutral-500 mb-0">{r.body}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="col-lg-5">
                        <div className="bg-neutral-50 rounded-4 p-4">
                            {sent ? (
                                <p className="neutral-500 mb-0">Thanks — your review will appear once approved.</p>
                            ) : (
                                <form onSubmit={send}>
                                    <p className="fw-600 mb-2">Write a review</p>
                                    <div className="mb-2">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} onClick={() => setRev({ ...rev, rating: n })} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: n <= rev.rating ? "#f59e0b" : "#cbd5e1" }}>★</button>)}</div>
                                    <div className="mb-2"><input className="form-control" placeholder="Your name" value={rev.author} onChange={(e) => setRev({ ...rev, author: e.target.value })} /></div>
                                    <div className="mb-2"><input className="form-control" placeholder="Title (optional)" value={rev.title} onChange={(e) => setRev({ ...rev, title: e.target.value })} /></div>
                                    <div className="mb-3"><textarea className="form-control" rows={3} placeholder="Your review" value={rev.body} onChange={(e) => setRev({ ...rev, body: e.target.value })} /></div>
                                    <button className="btn btn-dark rounded-pill" disabled={busy}>{busy ? "Submitting…" : "Submit review"}</button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
