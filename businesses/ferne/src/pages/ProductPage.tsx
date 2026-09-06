import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { REVIEWS } from "@/data/catalogue";
import { formatDateShort, stars } from "@/lib/format";
import { IconArrow, IconHeart } from "@/lib/icons";
import { fetchReviews, submitReview } from "@/lib/phoxta";
import PageMeta from "@/components/PageMeta";
import ProductCard from "@/components/ProductCard";
import Stars from "@/components/Stars";
import { CATEGORIES, useCatalog, useMoney, useProduct } from "@/state/catalog";
import { useCart } from "@/state/cart";
import { useOrgContent } from "@/state/content";
import { useUi } from "@/state/ui";
import { useWishlist } from "@/state/wishlist";

type ReviewRow = {
    id: string;
    author: string;
    avatar: string | null;
    rating: number;
    title: string;
    body: string;
    createdAt: string;
};

export default function ProductPage() {
    const { slug } = useParams();
    const product = useProduct(slug);
    const { products, orgId } = useCatalog();
    const money = useMoney();
    const { add } = useCart();
    const { open, toast } = useUi();

    const [sizeId, setSizeId] = useState<string | null>(null);
    const [qty, setQty] = useState(1);
    const [shot, setShot] = useState(0);
    const [writing, setWriting] = useState(false);

    // A different product means a fresh selection — otherwise the size and photo
    // of the last product bleed into this one.
    useEffect(() => {
        setSizeId(null);
        setQty(1);
        setShot(0);
        setWriting(false);
    }, [product?.id]);

    const allReviews = useOrgContent(fetchReviews, []);

    const reviews = useMemo<ReviewRow[]>(() => {
        if (!product) return [];
        const live = allReviews
            .filter((r) => r.subject_type === "product" && r.subject_ref === product.id)
            .map((r) => ({
                id: r.id,
                author: r.author_name,
                avatar: r.author_avatar,
                rating: Number(r.rating),
                title: r.title,
                body: r.body,
                createdAt: r.created_at,
            }));
        if (live.length) return live;
        return REVIEWS.filter((r) => r.subjectRef === product.slug).map((r) => ({
            id: r.id,
            author: r.author,
            avatar: r.avatar,
            rating: r.rating,
            title: r.title,
            body: r.body,
            createdAt: r.createdAt,
        }));
    }, [allReviews, product]);

    // Star breakdown. Declared with the other hooks, ABOVE the not-found return —
    // a hook after an early return changes the hook order between renders.
    const distribution = useMemo(() => {
        if (!reviews.length) return [72, 20, 5, 2, 1];
        const buckets = [0, 0, 0, 0, 0];
        reviews.forEach((r) => {
            const i = 5 - Math.max(1, Math.min(5, Math.round(r.rating)));
            buckets[i] += 1;
        });
        return buckets.map((n) => Math.round((n / reviews.length) * 100));
    }, [reviews]);

    const related = useMemo(() => {
        if (!product) return [];
        return products
            .filter(
                (p) =>
                    p.id !== product.id &&
                    (p.category === product.category || p.concerns.some((c) => product.concerns.includes(c))),
            )
            .slice(0, 4);
    }, [products, product]);

    if (!product) {
        return (
            <div className="page">
                <div className="wrap">
                    <div className="empty">
                        <b>We can&rsquo;t find that product</b>
                        It may have sold out or been renamed.
                        <br />
                        <br />
                        <Link className="btn sm" to="/shop">
                            Back to the shop
                            <span className="arr">
                                <IconArrow />
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const size = product.sizes.find((s) => s.id === sizeId) ?? product.sizes[0];
    const category = CATEGORIES.find((c) => c.id === product.category);
    const soldOut = size.stock <= 0;
    const lowStock = !soldOut && size.stock < 20;

    // The badge rating leads with what customers have actually written; the
    // seeded figure stands in only until this shop has reviews of its own.
    const ratingCount = reviews.length || product.reviewCount;
    const rating = reviews.length
        ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length
        : product.rating;

    const addToBag = () => {
        if (soldOut) {
            toast("We'll email you when it's back");
            return;
        }
        add(product, size, qty);
        toast(`${product.name} added to bag`, { to: "/cart", label: "View bag" });
        open("cart");
    };

    return (
        <div className="page">
            <PageMeta title={product.name} description={product.tagline || product.description} />
            <div className="wrap">
                <div className="crumbs" style={{ marginBottom: 24 }}>
                    <Link to="/">Home</Link> / <Link to="/shop">Shop</Link> /{" "}
                    <Link to={`/shop?cat=${product.category}`}>{category?.name}</Link> / <b>{product.name}</b>
                </div>

                <div className="pdp">
                    <div className="gallery">
                        <div className="thumbs">
                            {product.gallery.map((g, i) => (
                                <button
                                    type="button"
                                    key={g + i}
                                    onClick={() => setShot(i)}
                                    aria-label={`Show image ${i + 1} of ${product.gallery.length}`}
                                    aria-pressed={i === shot}
                                >
                                    <img
                                        src={g}
                                        alt=""
                                        className={i === shot ? "on" : undefined}
                                        width={80}
                                        height={96}
                                        loading="lazy"
                                    />
                                </button>
                            ))}
                        </div>
                        <div className="main">
                            <img
                                src={product.gallery[shot] ?? product.img}
                                alt={product.name}
                                width={900}
                                height={1125}
                            />
                            {(product.bestseller || product.isNew) && (
                                <span className="tag">{product.bestseller ? "Best seller" : "New"}</span>
                            )}
                        </div>
                    </div>

                    <div className="buy-col">
                        <div className="eyebrow">{category?.name}</div>
                        <h1 className="serif">{product.name}</h1>
                        {product.tagline && <p className="tagline">{product.tagline}</p>}

                        <div className="rating-row">
                            <Stars rating={rating} />
                            <b>{rating.toFixed(1)}</b>
                            <a className="link" href="#reviews">
                                {ratingCount} review{ratingCount === 1 ? "" : "s"}
                            </a>
                        </div>

                        <div className="price">
                            <span>{money(size.priceCents)}</span>
                            {product.compareAtCents && (
                                <span className="price-old">{money(product.compareAtCents)}</span>
                            )}
                        </div>

                        {product.description && <p className="desc">{product.description}</p>}

                        {product.sizes.length > 1 && (
                            <div className="opt">
                                <label>
                                    Size <span>{size.label}</span>
                                </label>
                                <div className="select-pill">
                                    {product.sizes.map((s) => (
                                        <button
                                            type="button"
                                            key={s.id}
                                            className={s.id === size.id ? "on" : undefined}
                                            onClick={() => setSizeId(s.id)}
                                        >
                                            {s.label} · {money(s.priceCents)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="actions">
                            <div className="qty">
                                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Reduce quantity">
                                    &minus;
                                </button>
                                <span>{qty}</span>
                                <button type="button" onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Increase quantity">
                                    +
                                </button>
                            </div>
                            <button type="button" className="btn block" onClick={addToBag}>
                                {soldOut ? "Notify me" : "Add to bag"}
                                <span className="arr">{soldOut ? "" : money(size.priceCents * qty)}</span>
                            </button>
                            <WishButton slug={product.slug} name={product.name} />
                        </div>

                        <div className={`stock${soldOut ? " out" : lowStock ? " low" : ""}`}>
                            <i />
                            <span>
                                {soldOut
                                    ? "Sold out — we'll email you when it's back"
                                    : lowStock
                                      ? `Only ${size.stock} left in this batch`
                                      : "In stock · ships today before 2pm"}
                            </span>
                        </div>

                        <div className="perks">
                            <div>
                                <i>✓</i>Free UK delivery over £40
                            </div>
                            <div>
                                <i>↺</i>30-day returns, even opened
                            </div>
                            <div>
                                <i>♻</i>Refillable glass
                            </div>
                            <div>
                                <i>✿</i>Fragrance-free, vegan
                            </div>
                        </div>

                        <div className="acc">
                            {product.ingredients && (
                                <details open>
                                    <summary>Ingredients</summary>
                                    <div className="a">{product.ingredients}</div>
                                </details>
                            )}
                            {product.howTo && (
                                <details>
                                    <summary>How to use</summary>
                                    <div className="a">{product.howTo}</div>
                                </details>
                            )}
                            {product.skinType && (
                                <details>
                                    <summary>Skin type</summary>
                                    <div className="a">{product.skinType}</div>
                                </details>
                            )}
                            <details>
                                <summary>Shipping &amp; returns</summary>
                                <div className="a">
                                    Standard delivery £3.95 (free over £40), 3–5 working days. Express next-day £6.95.
                                    Returns accepted within 30 days, opened or not — start one from your account.
                                </div>
                            </details>
                        </div>
                    </div>
                </div>

                <section className="rev-sec" id="reviews">
                    <div className="rev-summary">
                        <div className="eyebrow">Reviews</div>
                        <div className="big">{rating.toFixed(1)}</div>
                        <Stars rating={rating} />
                        <div className="small muted">
                            Based on {ratingCount} verified review{ratingCount === 1 ? "" : "s"}
                        </div>
                        <div className="bars">
                            {distribution.map((v, i) => (
                                <div key={i}>
                                    <span>{5 - i}★</span>
                                    <i>
                                        <b style={{ width: `${v}%` }} />
                                    </i>
                                    <span>{v}%</span>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            className="btn sm block"
                            style={{ marginTop: 20 }}
                            onClick={() => setWriting(true)}
                        >
                            Write a review <span className="arr">✎</span>
                        </button>
                    </div>

                    <div>
                        {writing && (
                            <ReviewForm
                                orgId={orgId}
                                productId={product.id}
                                onDone={() => setWriting(false)}
                            />
                        )}
                        <div className="rev-list">
                            {reviews.length === 0 ? (
                                <div className="empty">
                                    <b>No written reviews yet</b>
                                    Be the first.
                                </div>
                            ) : (
                                reviews.map((r) => (
                                    <div className="rev-item" key={r.id}>
                                        <div className="top">
                                            {r.avatar ? (
                                                <img src={r.avatar} alt="" width={40} height={40} loading="lazy" />
                                            ) : (
                                                <span className="who-initial" aria-hidden="true">
                                                    {r.author.slice(0, 1)}
                                                </span>
                                            )}
                                            <div>
                                                <b>{r.author}</b>
                                                <small>Verified buyer</small>
                                            </div>
                                            <span className="d">{formatDateShort(r.createdAt)}</span>
                                        </div>
                                        <div className="stars" style={{ marginTop: 12 }} aria-hidden="true">
                                            {stars(r.rating)}
                                        </div>
                                        {r.title && <h5>{r.title}</h5>}
                                        <p>{r.body}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </section>

                {related.length > 0 && (
                    <section className="related">
                        <h2 className="serif">
                            You might also <em>like</em>
                        </h2>
                        <div className="grid4">
                            {related.map((p) => (
                                <ProductCard product={p} key={p.id} />
                            ))}
                        </div>
                    </section>
                )}
            </div>

            <div className="sticky-buy">
                <div>
                    <b>{product.name}</b>
                    <div className="small muted">
                        {money(size.priceCents)} · {size.label}
                    </div>
                </div>
                <button type="button" className="btn sm" onClick={addToBag}>
                    {soldOut ? "Notify me" : "Add to bag"}
                    <span className="arr">
                        <IconArrow />
                    </span>
                </button>
            </div>
        </div>
    );
}

function WishButton({ slug, name }: { slug: string; name: string }) {
    const { toast } = useUi();
    const { has, toggle } = useWishlist();
    const saved = has(slug);
    return (
        <button
            type="button"
            className="icon-btn"
            aria-label={saved ? `Remove ${name} from saved items` : `Save ${name}`}
            aria-pressed={saved}
            onClick={() => toast(toggle(slug) ? "Saved to wishlist" : "Removed from wishlist")}
        >
            <IconHeart filled={saved} />
        </button>
    );
}

function ReviewForm({
    orgId,
    productId,
    onDone,
}: {
    orgId: string | null;
    productId: string;
    onDone: () => void;
}) {
    const { toast } = useUi();
    const [author, setAuthor] = useState("");
    const [rating, setRating] = useState(5);
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (busy) return;
        if (!author.trim() || !body.trim()) {
            setError("Please add your name and a few words.");
            return;
        }
        setBusy(true);
        setError(null);
        if (!orgId) {
            // Nothing to write to. Say so rather than showing a thank-you for a
            // review that went nowhere.
            setBusy(false);
            setError("Reviews can't be submitted from this preview.");
            return;
        }
        const ok = await submitReview(orgId, { author, rating, title, body, productId });
        setBusy(false);
        if (!ok) {
            setError("That didn't send. Please try again.");
            return;
        }
        // Reviews land as pending for the shop to approve, so promising it is
        // "live" would be a lie the customer notices when it never appears.
        toast("Thank you — your review is with the team for approval");
        onDone();
    }

    return (
        <div className="card-box" style={{ marginBottom: 16 }}>
            <h3 className="serif" style={{ fontSize: 24, fontWeight: 400, marginBottom: 14 }}>
                Your review
            </h3>
            <form className="form-grid" onSubmit={submit} noValidate>
                <div className="field span">
                    <label htmlFor="rv-name">Name</label>
                    <input
                        id="rv-name"
                        value={author}
                        placeholder="Your name"
                        onChange={(e) => setAuthor(e.target.value)}
                    />
                </div>
                <div className="field span" role="group" aria-labelledby="rv-rating-label">
                    <span className="field-label" id="rv-rating-label">Rating</span>
                    <div className="select-pill">
                        {[5, 4, 3, 2, 1].map((n) => (
                            <button
                                type="button"
                                key={n}
                                className={n === rating ? "on" : undefined}
                                onClick={() => setRating(n)}
                            >
                                {n} ★
                            </button>
                        ))}
                    </div>
                </div>
                <div className="field span">
                    <label htmlFor="rv-title">Title</label>
                    <input
                        id="rv-title"
                        value={title}
                        placeholder="Sum it up"
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>
                <div className="field span">
                    <label htmlFor="rv-body">Review</label>
                    <textarea
                        id="rv-body"
                        value={body}
                        placeholder="How did it work for you?"
                        onChange={(e) => setBody(e.target.value)}
                    />
                </div>
                {error && (
                    <p className="span small" style={{ color: "#C0392B" }}>
                        {error}
                    </p>
                )}
                <div className="span" style={{ display: "flex", gap: 10 }}>
                    <button className="btn sm plain" disabled={busy}>
                        {busy ? "Sending…" : "Submit review"}
                    </button>
                    <button type="button" className="btn sm plain ghost" onClick={onDone}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
