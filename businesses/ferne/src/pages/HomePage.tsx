import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BRAND, STORE } from "@/config/brand";
import { JOURNAL, REVIEWS } from "@/data/catalogue";
import { IconArrow, IconCheck, IconLeaf, IconRefill, IconTruck } from "@/lib/icons";
import { fetchJournal, fetchReviews } from "@/lib/phoxta";
import PageMeta from "@/components/PageMeta";
import ProductCard from "@/components/ProductCard";
import Stars from "@/components/Stars";
import { CATEGORIES, useCatalog, useMoney } from "@/state/catalog";
import { useOrgContent } from "@/state/content";

const SHELF_FILTERS = [
    { label: "Best sellers", match: (p: { bestseller: boolean }) => p.bestseller },
    { label: "New in", match: (p: { isNew: boolean; rating: number }) => p.isNew || p.rating >= 4.8 },
    {
        label: "Barrier care",
        match: (p: { concerns: string[] }) => p.concerns.includes("Redness") || p.concerns.includes("Sensitivity"),
    },
    { label: "Sets", match: (p: { category: string }) => p.category === "sets" },
];

const ROUTINE_STEPS = [
    { title: "Cleanse — Cloud Cleanser", body: "Massage onto damp skin, rinse. Oat milk leaves nothing tight.", time: "60 sec" },
    { title: "Treat — Morning Oil", body: "Three drops pressed, not rubbed, into still-damp skin.", time: "30 sec" },
    { title: "Seal — Dew Cream", body: "A pea-sized amount to lock in moisture and buffer the day.", time: "30 sec" },
];

const ACTIVES = [
    { name: "Rosehip", role: "Repair", img: "/images/ing-rosehip.jpg", body: "Cold-pressed, vitamin A rich oil that softens texture and fades post-blemish marks." },
    { name: "Oat lipid", role: "Calm", img: "/images/ing-oat.jpg", body: "Ceramide-mimicking lipids that quiet redness and rebuild a stressed barrier." },
    { name: "Squalane", role: "Hydrate", img: "/images/ing-squalane.jpg", body: "Weightless olive-derived hydration that mirrors the skin's own sebum." },
    { name: "Sea buckthorn", role: "Glow", img: "/images/ing-seabuckthorn.jpg", body: "Omega-7 and carotenoids for tone and a warmth that reads as rested." },
];

const FARMS = [
    ["Rosehip seed oil", "Devon, UK"],
    ["Oat lipid complex", "Perthshire, UK"],
    ["Squalane (olive)", "Provence, FR"],
    ["Sea buckthorn", "Douro, PT"],
];

const MARQUEE = [
    "Fragrance-free",
    "Refillable glass",
    "Six partner farms",
    "Batch-numbered",
    "Cruelty-free",
    "Carbon-neutral shipping",
];

export default function HomePage() {
    const { products } = useCatalog();
    const money = useMoney();
    const [shelf, setShelf] = useState(0);
    const [step, setStep] = useState(0);

    const reviews = useOrgContent(fetchReviews, []);
    const posts = useOrgContent(fetchJournal, []);

    const shelfProducts = useMemo(() => {
        const filtered = products.filter((p) => SHELF_FILTERS[shelf].match(p));
        // A filter that matches nothing would leave a hole in the page; fall back
        // to the front of the catalogue rather than showing an empty shelf.
        return (filtered.length ? filtered : products).slice(0, 4);
    }, [products, shelf]);

    const hero = products.find((p) => p.bestseller) ?? products[0];

    const homeReviews = useMemo(() => {
        if (reviews.length) {
            return reviews.slice(0, 3).map((r) => ({
                id: r.id,
                rating: r.rating,
                body: r.body,
                author: r.author_name,
                avatar: r.author_avatar,
                note: r.title,
            }));
        }
        return REVIEWS.slice(0, 3).map((r) => ({
            id: r.id,
            rating: r.rating,
            body: r.body,
            author: r.author,
            avatar: r.avatar,
            note: r.title,
        }));
    }, [reviews]);

    const averageRating = useMemo(() => {
        if (!reviews.length) return 4.9;
        return reviews.reduce((n, r) => n + Number(r.rating), 0) / reviews.length;
    }, [reviews]);

    const journal = useMemo(() => {
        if (posts.length) {
            return posts.slice(0, 3).map((p) => ({
                slug: p.slug,
                title: p.title,
                tag: p.tags?.[0] ?? "Journal",
                author: p.author,
                cover: p.cover_url || "/images/routine.jpg",
            }));
        }
        return JOURNAL.slice(0, 3).map((p) => ({
            slug: p.slug,
            title: p.title,
            tag: p.tags[0] ?? "Journal",
            author: p.author,
            cover: p.coverUrl,
        }));
    }, [posts]);

    return (
        <>
            <PageMeta title="" description={BRAND.description} />

            <section className="hero">
                <div className="wrap grid">
                    <div className="copy">
                        <div className="eyebrow">Botanical skincare</div>
                        <h1 className="serif">
                            Skin that feels like <em>itself</em> again.
                        </h1>
                        <p className="sub">
                            Small-batch formulas built on traceable plant actives — no filler, no fragrance, nothing
                            your skin has to work around.
                        </p>
                        <div className="cta">
                            <Link className="btn" to="/shop">
                                Start shopping
                                <span className="arr">
                                    <IconArrow />
                                </span>
                            </Link>
                            <div className="meta">
                                <span className="avs">
                                    {["av1", "av2", "av3"].map((a) => (
                                        <img key={a} src={`/images/${a}.jpg`} alt="" width={30} height={30} loading="lazy" />
                                    ))}
                                </span>
                                Loved by 12k+ routines
                            </div>
                        </div>
                    </div>

                    <div className="visual">
                        <img src="/images/hero.jpg" alt="Hands holding a jar of moisturiser" width={900} height={1120} />
                        <div className="chips">
                            <span>
                                Moisturisers <sup>{products.filter((p) => p.category === "face").length}</sup>
                            </span>
                            <span>
                                Body <sup>{products.filter((p) => p.category === "body").length}</sup>
                            </span>
                        </div>
                        {hero && (
                            <Link className="float" to={`/product/${hero.slug}`}>
                                <div className="th">
                                    <img src={hero.img} alt="" width={56} height={56} loading="lazy" />
                                </div>
                                <div>
                                    <div className="t">
                                        {hero.name} · {hero.sizes[0].label}
                                    </div>
                                    <div className="d">{hero.tagline}</div>
                                </div>
                                <div className="p">{money(hero.priceCents)}</div>
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            <div className="strip">
                <div className="wrap">
                    <div className="v">
                        <i>
                            <IconCheck />
                        </i>
                        Dermatologist tested
                    </div>
                    <div className="v">
                        <i>
                            <IconLeaf color="currentColor" />
                        </i>
                        Traceable botanicals
                    </div>
                    <div className="v">
                        <i>
                            <IconRefill />
                        </i>
                        Refillable glass
                    </div>
                    <div className="v">
                        <i>
                            <IconTruck />
                        </i>
                        Free UK delivery over {money(STORE.freeShippingThresholdCents)}
                    </div>
                </div>
            </div>

            <div className="marquee" aria-hidden="true">
                <div className="track">
                    {[0, 1].map((n) => (
                        <span key={n}>
                            {MARQUEE.map((m) => (
                                <span key={m}>
                                    {m} <i />
                                </span>
                            ))}
                        </span>
                    ))}
                </div>
            </div>

            <section className="cats">
                <div className="wrap">
                    <div className="head">
                        <div>
                            <div className="eyebrow">Shop by ritual</div>
                            <h2 className="serif">
                                Start where your <em>skin</em> is today
                            </h2>
                        </div>
                        <Link to="/shop">View all products</Link>
                    </div>
                    <div className="cat-grid">
                        {CATEGORIES.map((c) => (
                            <Link className="cat" to={`/shop?cat=${c.id}`} key={c.id}>
                                <img src={c.img} alt="" width={640} height={480} loading="lazy" />
                                <div className="lbl">
                                    <div>
                                        <b>{c.name}</b>
                                        <small>
                                            {c.blurb} · {products.filter((p) => p.category === c.id).length}
                                        </small>
                                    </div>
                                    <span className="arr">
                                        <IconArrow />
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <section className="products" id="products">
                <div className="wrap">
                    <div className="sec-top">
                        <span className="crumb">/ Products</span>
                        <div className="filters">
                            {SHELF_FILTERS.map((f, i) => (
                                <button
                                    type="button"
                                    key={f.label}
                                    className={`chip${i === shelf ? " on" : ""}`}
                                    onClick={() => setShelf(i)}
                                >
                                    <sup>{String(i + 1).padStart(2, "0")}</sup>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="sec-title">
                        <div className="eyebrow">Shop our best-sellers</div>
                        <h2 className="serif">
                            Clinically tested, plant-led formulas that <em>calm, hydrate and rebuild</em> your skin
                            barrier
                        </h2>
                    </div>

                    <div className="sec-nav" style={{ justifyContent: "space-between", alignItems: "center" }}>
                        <Link className="link" to="/shop">
                            Shop all products →
                        </Link>
                    </div>

                    <div className="grid4">
                        {shelfProducts.map((p) => (
                            <ProductCard product={p} key={p.id} />
                        ))}
                    </div>
                </div>
            </section>

            <section className="ingr" id="ingredients">
                <div className="wrap grid">
                    <div>
                        <div className="eyebrow">Inside the bottle</div>
                        <h2 className="serif">
                            Four actives. Named, tested, <em>traceable.</em>
                        </h2>
                        <p>
                            We formulate around a short list of botanicals we can stand behind — each one grown by a
                            farm we visit, pressed within days of harvest, and third-party tested for purity before it
                            reaches a batch.
                        </p>
                        <div className="list">
                            {FARMS.map(([name, place]) => (
                                <div key={name}>
                                    {name}
                                    <span>{place}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="ingr-grid">
                        {ACTIVES.map((a) => (
                            <div className="ing" key={a.name}>
                                <div className="ph">
                                    <img src={a.img} alt="" width={320} height={320} loading="lazy" />
                                </div>
                                <div className="b">
                                    <b>
                                        {a.name} <span>{a.role}</span>
                                    </b>
                                    <p>{a.body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="routine">
                <div className="wrap">
                    <div className="box">
                        <div>
                            <div className="eyebrow">Three steps, morning and night</div>
                            <h2 className="serif">
                                A routine you&rsquo;ll actually <em>keep.</em>
                            </h2>
                            <div className="steps">
                                {ROUTINE_STEPS.map((s, i) => (
                                    <button
                                        type="button"
                                        className={`step${i === step ? " on" : ""}`}
                                        key={s.title}
                                        onMouseEnter={() => setStep(i)}
                                        onFocus={() => setStep(i)}
                                        onClick={() => setStep(i)}
                                    >
                                        <span className="n">{i + 1}</span>
                                        <div>
                                            <b>{s.title}</b>
                                            <small>{s.body}</small>
                                        </div>
                                        <span className="t">{s.time}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="ph">
                            <img src="/images/routine.jpg" alt="" width={800} height={800} loading="lazy" />
                            <span className="pill">
                                <i />
                                Step {step + 1} · {["Cleanse", "Treat", "Seal"][step]}
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="story" id="story">
                <div className="wrap grid">
                    <div className="panel">
                        <div className="eyebrow">From soil to serum</div>
                        <h3 className="serif">Every active on the label has a farm we can name.</h3>
                        <p>
                            We work with six growers across Devon, Provence and the Douro. Each batch is logged, tested
                            and numbered — scan the base of any bottle to see exactly where it came from and when it was
                            pressed.
                        </p>
                        <Link className="btn" to="/about">
                            Read our story
                            <span className="arr">
                                <IconArrow />
                            </span>
                        </Link>
                    </div>
                    <div className="photo">
                        <img src="/images/story.jpg" alt="" width={900} height={1100} loading="lazy" />
                        <div className="stats">
                            <div>
                                <b>6</b>
                                <span>Partner farms</span>
                            </div>
                            <div>
                                <b>0</b>
                                <span>Synthetic fragrance</span>
                            </div>
                            <div>
                                <b>92%</b>
                                <span>Refill rate</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="reviews">
                <div className="wrap">
                    <div className="head">
                        <div>
                            <div className="eyebrow">In their words</div>
                            <h2 className="serif">
                                Skin diaries from <em>real</em> routines
                            </h2>
                        </div>
                        <div className="score">
                            <b>{averageRating.toFixed(1)}</b>
                            <div>
                                <Stars rating={averageRating} />
                                <small>
                                    From {reviews.length || 2140} verified review{(reviews.length || 2140) === 1 ? "" : "s"}
                                </small>
                            </div>
                        </div>
                    </div>
                    <div className="rev-grid">
                        {homeReviews.map((r) => (
                            <div className="rev" key={r.id}>
                                <Stars rating={r.rating} />
                                <q>{r.body}</q>
                                <div className="who">
                                    {r.avatar ? (
                                        <img src={r.avatar} alt="" width={40} height={40} loading="lazy" />
                                    ) : (
                                        <span className="who-initial" aria-hidden="true">
                                            {r.author.slice(0, 1)}
                                        </span>
                                    )}
                                    <div>
                                        <b>{r.author}</b>
                                        <small>{r.note}</small>
                                    </div>
                                    <span className="v">
                                        <IconCheck />
                                        Verified
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="press">
                        <small>As seen in</small>
                        {["The Sunday Edit", "Stylist", "Monocle", "Vogue Beauty", "Dazed"].map((p) => (
                            <span key={p}>{p}</span>
                        ))}
                    </div>
                </div>
            </section>

            <section className="journal">
                <div className="wrap">
                    <div className="head">
                        <div>
                            <div className="eyebrow">The journal</div>
                            <h2 className="serif">
                                Notes on skin, soil and <em>slowness</em>
                            </h2>
                        </div>
                        <Link to="/journal">All articles</Link>
                    </div>
                    <div className="post-grid">
                        {journal.map((p) => (
                            <Link className="post" to={`/journal/${p.slug}`} key={p.slug}>
                                <div className="ph">
                                    <img src={p.cover} alt="" width={640} height={480} loading="lazy" />
                                    <span>{p.tag}</span>
                                </div>
                                <h4>{p.title}</h4>
                                <div className="meta">{p.author}</div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}
