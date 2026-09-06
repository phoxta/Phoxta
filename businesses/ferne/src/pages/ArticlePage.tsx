import { Link, useParams } from "react-router-dom";
import { formatDate, readingMinutes } from "@/lib/format";
import { IconArrow } from "@/lib/icons";
import PageMeta from "@/components/PageMeta";
import { useJournal } from "@/pages/JournalPage";

export default function ArticlePage() {
    const { slug } = useParams();
    const posts = useJournal();
    const post = posts.find((p) => p.slug === slug);

    if (!post) {
        return (
            <div className="page">
                <div className="wrap">
                    <div className="empty">
                        <b>That article has moved</b>
                        Try the journal index.
                        <br />
                        <br />
                        <Link className="btn sm" to="/journal">
                            All articles
                            <span className="arr">
                                <IconArrow />
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const more = posts.filter((p) => p.slug !== post.slug).slice(0, 3);
    const paragraphs = post.body
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);

    return (
        <div className="page">
            <PageMeta title={post.title} description={post.excerpt} />
            <div className="wrap">
                <div className="crumbs" style={{ marginBottom: 20 }}>
                    <Link to="/">Home</Link> / <Link to="/journal">Journal</Link> / <b>{post.tags[0] ?? "Article"}</b>
                </div>

                <div className="post-hero">
                    <img src={post.cover} alt="" width={1400} height={600} />
                </div>

                <article className="article">
                    {post.tags[0] && <div className="eyebrow">{post.tags[0]}</div>}
                    <h1
                        className="serif"
                        style={{ fontSize: 44, lineHeight: 1.1, color: "var(--ink)", fontWeight: 300, margin: "12px 0 18px" }}
                    >
                        {post.title}
                    </h1>
                    <div className="meta" style={{ marginBottom: 30, fontSize: 13, color: "var(--ink-2)" }}>
                        {post.author} · {readingMinutes(post.body)} min read · {formatDate(post.publishedAt)}
                    </div>
                    <p style={{ fontSize: 19, color: "var(--ink)" }}>{post.excerpt}</p>
                    {paragraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                    ))}

                    <div style={{ marginTop: 40, display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <Link className="btn sm" to="/shop">
                            Shop the range
                            <span className="arr">
                                <IconArrow />
                            </span>
                        </Link>
                        <Link className="btn sm plain ghost" to="/journal">
                            ← All articles
                        </Link>
                    </div>
                </article>

                {more.length > 0 && (
                    <section className="related">
                        <h2 className="serif">
                            More from the <em>journal</em>
                        </h2>
                        <div className="post-grid">
                            {more.map((p) => (
                                <Link className="post" to={`/journal/${p.slug}`} key={p.slug}>
                                    <div className="ph">
                                        <img src={p.cover} alt="" width={640} height={480} loading="lazy" />
                                        {p.tags[0] && <span>{p.tags[0]}</span>}
                                    </div>
                                    <h4>{p.title}</h4>
                                    <div className="meta">{p.author}</div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
