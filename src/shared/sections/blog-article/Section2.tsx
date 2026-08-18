import { Link } from "react-router-dom";
import ArticleCard1 from "@/shared/cards/ArticleCard1";
import { ARTICLES_BY_DATE } from "@/data/articles";

// blog-article section 2 — "More articles" grid shown under a post.
// Prefers posts in the same category, then fills from the newest remaining.

const ARROW_SVG = (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z"
            fill="currentColor"
        />
    </svg>
);

const MAX_RELATED = 4;

export default function Section2({ currentSlug }: { currentSlug: string }) {
    const current = ARTICLES_BY_DATE.find((a) => a.slug === currentSlug);
    const others = ARTICLES_BY_DATE.filter((a) => a.slug !== currentSlug);
    const sameCategory = others.filter((a) => a.category === current?.category);
    const related = [...sameCategory, ...others.filter((a) => !sameCategory.includes(a))].slice(0, MAX_RELATED);

    if (related.length === 0) return null;

    return (
        <section className="sec-2-blog-details overflow-hidden pb-120">
            <div className="container">
                <div className="row align-items-end mb-50">
                    <div className="col-lg-8">
                        <h3 className="alt-section-title lh-1 neutral-900 fw-700 mb-0">More articles</h3>
                    </div>
                    <div className="col-lg-3 ms-auto text-lg-end">
                        <div className="at-service-btn pt-30">
                            <Link className="at-btn" to="/blog">
                                <span>
                                    <span className="text-1">ALL ARTICLES</span>
                                    <span className="text-2">ALL ARTICLES</span>
                                </span>
                                <i>
                                    {ARROW_SVG}
                                    {ARROW_SVG}
                                </i>
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="row">
                    {related.map((post) => (
                        <ArticleCard1
                            key={post.slug}
                            classList="col-lg-3 col-md-6 col-12"
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
            </div>
        </section>
    );
}
