import { Link } from "react-router-dom";
import { Block } from "@/shared/sections/blog-article/Section1";
import { publicHelpPath, type HelpArticle, type PublicHelpOrg } from "@/lib/db/ops/helpCenter";
import { estimateReadMinutes } from "@/lib/articleText";

// help section 2 — one public help article.
// The same visual structure as blog-article/Section1, reusing its exported
// Block renderer so an ArticleBlock[] body renders identically to the blog —
// plus the help-specific footer: "Was this helpful?" and a contact hand-off.

const CHEVRON_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="6" height="11" viewBox="0 0 6 11" fill="none">
        <path
            d="M0.666992 0.666672L5.33366 5.33334L0.666992 10"
            stroke="#585959"
            strokeWidth="1.33333"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export default function Section2({
    org,
    orgRef,
    article,
}: {
    org: PublicHelpOrg;
    /** The URL segment the page was reached by (slug or id) — links reuse it. */
    orgRef: string;
    article: HelpArticle;
}) {
    const published = article.published_at
        ? new Date(article.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : null;

    return (
        <section className="sec-1-blog-details overflow-hidden pt-150 pb-100">
            <div className="container">
                <div className="row align-items-center">
                    <div className="col-lg-8 mx-auto">
                        <div className="nav-menu d-flex align-items-center gap-2 pb-2">
                            <Link to={publicHelpPath(orgRef)} className="nav-menu__item neutral-900">
                                Help Center
                            </Link>
                            <span className="nav-menu__item-separator">{CHEVRON_SVG}</span>
                            <span className="nav-menu__item neutral-500">{article.category}</span>
                        </div>
                        <h2 className="fw-600 lh-1 mb-0">{article.title}</h2>
                        <div className="d-flex flex-column flex-md-row align-items-md-end gap-2 justify-content-between pt-30">
                            <div>
                                <h6 className="mb-0">{org.name}</h6>
                                <span className="nav-menu__item fz-font-sm neutral-500">
                                    {published ? `${published} · ` : ""}
                                    {estimateReadMinutes(article.body)} min read
                                </span>
                            </div>
                        </div>
                    </div>

                    {article.hero ? (
                        <div className="col-12 py-5 text-center">
                            <img
                                src={article.hero}
                                className="img-fluid"
                                alt={article.title}
                                width={1720}
                                height={789}
                                style={{ width: "auto", height: "auto" }}
                                loading="lazy"
                            />
                        </div>
                    ) : (
                        <div className="col-12 pt-4" />
                    )}

                    <div className="col-lg-8 mx-auto">
                        <div className="content">
                            {article.body.map((block, i) => (
                                <Block key={`${block.kind}-${i}`} block={block} />
                            ))}

                            {/* Was this helpful? */}
                            <div className="border-top-100 py-5 mt-50">
                                <div className="d-flex flex-wrap align-items-center justify-content-center gap-2">
                                    <span className="nav-menu__item fz-font-label fw-600 neutral-500 me-2">
                                        WAS THIS HELPFUL?
                                    </span>
                                    <Link to={publicHelpPath(orgRef)} className="at-btn filter-btn btn-sm">
                                        Yes — back to all articles
                                    </Link>
                                    <Link to="/contact" className="at-btn filter-btn btn-sm">
                                        No — I need more help
                                    </Link>
                                </div>
                            </div>

                            {/* Still stuck */}
                            <div className="text-center">
                                <h6 className="fw-600 mb-2">Still stuck?</h6>
                                <p className="fz-font-lg neutral-700 mb-3">
                                    The {org.name} team is happy to help with anything this article
                                    didn’t answer.
                                </p>
                                <Link to="/contact" className="at-btn filter-btn btn-sm">
                                    Contact us
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
