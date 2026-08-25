import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import RevealText from "@/shared/effects/RevealText";
import ArticleCard1 from "@/shared/cards/ArticleCard1";
import { CATEGORY_LABELS, type ArticleCategory } from "@/data/articles";
import { useLiveArticles } from "@/lib/hooks/useLiveArticles";

// blog-index section 1 — the actual blog listing: intro, category filter and the
// full article grid. Individual posts live at /blog/:slug (blog-article group).

const ARROW_SVG = (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z"
            fill="currentColor"
        />
    </svg>
);

type Filter = "all" | ArticleCategory;

export default function Section1() {
    const [filter, setFilter] = useState<Filter>("all");
    // Built-in editorial plus everything published from the platform console.
    const articles = useLiveArticles();

    /** Only offer filters that actually have posts behind them. */
    const filters = useMemo<Filter[]>(
        () => [
            "all",
            ...(Object.keys(CATEGORY_LABELS) as ArticleCategory[]).filter((c) =>
                articles.some((a) => a.category === c),
            ),
        ],
        [articles],
    );

    const posts = useMemo(
        () => (filter === "all" ? articles : articles.filter((a) => a.category === filter)),
        [filter, articles],
    );

    const [lead, ...rest] = posts;

    return (
        <section className="sec-1-blog-index overflow-hidden pt-150 pb-120">
            <div className="container">
                {/* Intro */}
                <div className="row align-items-end mb-50">
                    <div className="col-lg-8 col-xxl-6">
                        <span className="at-btn common-black bg-transparent mb-10 rounded-0 p-0">
                            <span className="text-uppercase">
                                <span className="text-1">THE BLOG</span>
                                <span className="text-2">THE BLOG</span>
                            </span>
                            <i>
                                {ARROW_SVG}
                                {ARROW_SVG}
                            </i>
                        </span>
                        <h2 className="alt-section-title lh-1 neutral-900 fw-700 mb-30 reveal-text mb-0">
                            <RevealText>Articles and startup guides.</RevealText>
                        </h2>
                    </div>
                    <div className="col-lg-4 ms-auto">
                        <p className="fz-font-lg neutral-700 pt-30 mb-0">
                            Playbooks, tear-downs and case studies on owning and operating an
                            AI-powered business.
                        </p>
                    </div>
                </div>

                {/* Category filter */}
                <div className="d-flex flex-wrap align-items-center gap-2 mb-50">
                    {filters.map((f) => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => setFilter(f)}
                            aria-pressed={filter === f}
                            className={`at-btn filter-btn btn-sm ${filter === f ? "active" : ""}`}
                        >
                            {f === "all" ? "All articles" : CATEGORY_LABELS[f]}
                        </button>
                    ))}
                </div>

                {/* Lead article */}
                {lead ? (
                    <div className="row align-items-center mb-60 at_fade_anim" data-fade-from="bottom" data-delay=".2">
                        <div className="col-lg-7 mb-4 mb-lg-0">
                            <div className="hover-effect-1">
                                <Link to={`/blog/${lead.slug}`}>
                                    <img
                                        src={lead.img}
                                        className="img-fluid w-100"
                                        alt={lead.title}
                                        width={900}
                                        height={560}
                                        loading="lazy"
                                    />
                                </Link>
                            </div>
                        </div>
                        <div className="col-lg-5">
                            <span className="nav-menu__item fz-font-label fw-600 neutral-500 text-uppercase">
                                {CATEGORY_LABELS[lead.category]}
                            </span>
                            <h3 className="fw-600 lh-1 mt-2 mb-20">
                                <Link to={`/blog/${lead.slug}`}>{lead.title}</Link>
                            </h3>
                            <p className="fz-font-lg neutral-700 mb-20">{lead.excerpt}</p>
                            <p className="blog-card__meta mb-30">
                                <span className="blog-card__meta-text">By {lead.author}</span>
                                <span className="blog-card__meta-text">
                                    {" "}
                                    – {lead.date} · {lead.readMinutes} min read
                                </span>
                            </p>
                            <Link className="at-btn" to={`/blog/${lead.slug}`}>
                                <span>
                                    <span className="text-1">READ ARTICLE</span>
                                    <span className="text-2">READ ARTICLE</span>
                                </span>
                                <i>
                                    {ARROW_SVG}
                                    {ARROW_SVG}
                                </i>
                            </Link>
                        </div>
                    </div>
                ) : null}

                {/* Remaining articles */}
                <div className="row">
                    {rest.map((post) => (
                        <ArticleCard1
                            key={post.slug}
                            classList="col-lg-4 col-md-6 col-12"
                            category={post.category}
                            linkPost={`/blog/${post.slug}`}
                            linkAuthor="/blog"
                            img={post.img}
                            title={post.title}
                            author={post.author}
                            date={post.date}
                        />
                    ))}
                </div>

                {posts.length === 0 ? (
                    <p className="fz-font-lg neutral-700 text-center py-5 mb-0">
                        No articles in this category yet.
                    </p>
                ) : null}
            </div>
        </section>
    );
}
