import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { JOURNAL } from "@/data/catalogue";
import { fetchJournal } from "@/lib/phoxta";
import PageMeta from "@/components/PageMeta";
import { useOrgContent } from "@/state/content";

export type JournalCard = {
    slug: string;
    title: string;
    excerpt: string;
    body: string;
    tags: string[];
    author: string;
    cover: string;
    publishedAt: string;
};

/** The tenant's posts where it has them, the bundled ones otherwise — shaped
 *  once here so the index, the article page and the home shelf agree. */
export function useJournal(): JournalCard[] {
    const posts = useOrgContent(fetchJournal, []);
    return useMemo(() => {
        if (posts.length) {
            return posts.map((p) => ({
                slug: p.slug,
                title: p.title,
                excerpt: p.excerpt,
                body: p.body,
                tags: p.tags ?? [],
                author: p.author,
                cover: p.cover_url || "/images/routine.jpg",
                publishedAt: p.published_at,
            }));
        }
        return JOURNAL.map((p) => ({
            slug: p.slug,
            title: p.title,
            excerpt: p.excerpt,
            body: p.body,
            tags: p.tags,
            author: p.author,
            cover: p.coverUrl,
            publishedAt: p.publishedAt,
        }));
    }, [posts]);
}

export default function JournalPage() {
    const posts = useJournal();
    const [tag, setTag] = useState("All");

    // Only offer the filter when posts actually carry tags — an owner writing
    // through the console leaves them empty, and a lone "All" button is noise.
    const tags = useMemo(() => {
        const found = [...new Set(posts.flatMap((p) => p.tags))].filter(Boolean);
        return found.length ? ["All", ...found] : [];
    }, [posts]);

    const shown = tag === "All" ? posts : posts.filter((p) => p.tags.includes(tag));

    return (
        <div className="page">
            <PageMeta
                title="Journal"
                description="Ingredient science, routines that survive real life, and mornings with the people who grow what we bottle."
            />
            <div className="wrap">
                <div className="page-head">
                    <div className="crumbs">
                        <Link to="/">Home</Link> / <b>Journal</b>
                    </div>
                    <h1 className="serif">
                        Notes on skin, soil and <em>slowness</em>
                    </h1>
                    <p>
                        Ingredient science, routines that survive real life, and mornings with the people who grow what
                        we bottle.
                    </p>
                </div>

                {tags.length > 0 && (
                    <div className="filters" style={{ marginBottom: 28, marginLeft: 0 }}>
                        {tags.map((t) => (
                            <button
                                type="button"
                                key={t}
                                className={`chip${t === tag ? " on" : ""}`}
                                onClick={() => setTag(t)}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                )}

                <div className="post-grid">
                    {shown.map((p) => (
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
            </div>
        </div>
    );
}
