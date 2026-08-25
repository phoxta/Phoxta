import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { publicHelpPath, type HelpArticle, type PublicHelpOrg } from "@/lib/db/ops/helpCenter";
import { estimateReadMinutes } from "@/lib/articleText";

// help section 1 — a business's public Help Center index.
// Same visual language as the blog index (intro label + big title, filter
// buttons), driven by the tenant's published help_articles: a search box and
// the articles grouped by category.

const ARROW_SVG = (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z"
            fill="currentColor"
        />
    </svg>
);

export default function Section1({
    org,
    orgRef,
    articles,
}: {
    org: PublicHelpOrg;
    /** The URL segment the page was reached by (slug or id) — links reuse it. */
    orgRef: string;
    articles: HelpArticle[];
}) {
    const [query, setQuery] = useState("");

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return articles;
        return articles.filter(
            (a) =>
                a.title.toLowerCase().includes(q) ||
                a.excerpt.toLowerCase().includes(q) ||
                a.category.toLowerCase().includes(q),
        );
    }, [articles, query]);

    /** Category → its articles, in the order the categories first appear. */
    const groups = useMemo(() => {
        const map = new Map<string, HelpArticle[]>();
        for (const a of filtered) {
            const list = map.get(a.category) ?? [];
            list.push(a);
            map.set(a.category, list);
        }
        return Array.from(map.entries());
    }, [filtered]);

    return (
        <section className="sec-1-blog-index overflow-hidden pt-150 pb-120">
            <div className="container">
                {/* Intro */}
                <div className="row align-items-end mb-50">
                    <div className="col-lg-8 col-xxl-6">
                        <span className="at-btn common-black bg-transparent mb-10 rounded-0 p-0">
                            <span className="text-uppercase">
                                <span className="text-1">HELP CENTER</span>
                                <span className="text-2">HELP CENTER</span>
                            </span>
                            <i>
                                {ARROW_SVG}
                                {ARROW_SVG}
                            </i>
                        </span>
                        <h2 className="alt-section-title lh-1 neutral-900 fw-700 mb-0">
                            {org.name}
                        </h2>
                    </div>
                    <div className="col-lg-4 ms-auto">
                        <p className="fz-font-lg neutral-700 pt-30 mb-0">
                            Guides and answers from the {org.name} team — search below or browse by
                            topic.
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="row mb-60">
                    <div className="col-lg-6">
                        <input
                            type="search"
                            className="form-control form-control-lg"
                            placeholder="Search the help center…"
                            aria-label="Search help articles"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Articles, grouped by category */}
                {groups.map(([category, list]) => (
                    <div key={category} className="mb-60">
                        <h5 className="fw-600 mb-20 border-bottom pb-2">{category}</h5>
                        <div className="row">
                            {list.map((a) => (
                                <div key={a.id} className="col-lg-6 mb-30">
                                    <article className="h-100 pe-lg-5">
                                        <h6 className="fw-600 mb-2">
                                            <Link to={publicHelpPath(orgRef, a.slug)}>{a.title}</Link>
                                        </h6>
                                        {a.excerpt ? (
                                            <p className="fz-font-lg neutral-700 mb-2">{a.excerpt}</p>
                                        ) : null}
                                        <span className="nav-menu__item fz-font-sm neutral-500">
                                            {estimateReadMinutes(a.body)} min read
                                        </span>
                                    </article>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {filtered.length === 0 ? (
                    <p className="fz-font-lg neutral-700 text-center py-5 mb-0">
                        {query
                            ? `Nothing matches "${query}" — try a different word, or browse everything by clearing the search.`
                            : "No articles here yet — check back soon."}
                    </p>
                ) : null}

                {/* Still stuck */}
                <div className="border-top-100 pt-5 mt-30 text-center">
                    <p className="fz-font-lg neutral-700 mb-20">
                        Can’t find what you’re looking for?
                    </p>
                    <Link className="at-btn" to="/contact">
                        <span>
                            <span className="text-1">CONTACT US</span>
                            <span className="text-2">CONTACT US</span>
                        </span>
                        <i>
                            {ARROW_SVG}
                            {ARROW_SVG}
                        </i>
                    </Link>
                </div>
            </div>
        </section>
    );
}
