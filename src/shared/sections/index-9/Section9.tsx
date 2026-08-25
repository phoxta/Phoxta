import { Link } from "react-router-dom";
import RevealText from "@/shared/effects/RevealText";
import { BRAND_ARTICLES } from "@/data/articles-brand";

export default function Section9() {
    return (
        <>
            {/* Home 9 Section 9 - Insights for Founders (blog grid) */}
            <div className="sec-10-home-7 bg-neutral-50 pt-120 pb-120">
                <div className="container-2200 px-lg-5 px-3">
                    <div className="row align-items-end mb-50">
                        <div className="col-xl-4 col-lg-4 col-12">
                            <Link to="/blog" className="sec-10-home-7__eyebrow d-inline-flex align-items-center gap-2 mb-4 text-uppercase">
                                <span className="text-scramble" data-scramble-text="Inside Branding">Inside Branding</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="13" viewBox="0 0 14 13" fill="none">
                                    <path d="M11.0037 3.41421L2.39712 12.0208L0.98291 10.6066L9.5895 2H2.00373V0H13.0037V11H11.0037V3.41421Z" fill="currentColor" />
                                </svg>
                            </Link>
                            <h2 className="sec-10-home-7__title mb-0 reveal-text"><RevealText>Insights for <br className="d-none d-sm-inline" />Founders</RevealText></h2>
                        </div>
                        <div className="col-xl-5 col-lg-6 col-12 mt-4 mt-xl-0">
                            <p className="sec-10-home-7__lead mb-0 reveal-text">
                                <RevealText>Perspectives on brand strategy, identity design, and building brands that lead their markets.</RevealText>
                            </p>
                        </div>
                        <div className="col-xl-3 col-lg-12 mt-4 mt-lg-4 mt-xl-0 ms-xl-auto text-xl-end">
                            <Link to="/blog" className="sec-10-home-7__btn-all d-inline-flex align-items-center gap-2 at_fade_anim">
                                <span>All insights</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="13" viewBox="0 0 14 13" fill="none" aria-hidden="true">
                                    <path d="M11.0037 3.41421L2.39712 12.0208L0.98291 10.6066L9.5895 2H2.00373V0H13.0037V11H11.0037V3.41421Z" fill="currentColor" />
                                </svg>
                            </Link>
                        </div>
                    </div>

                    <div className="row g-3 sec-10-home-7__grid">
                        {BRAND_ARTICLES.map((article) => (
                            <div key={article.slug} className="blog-card col-lg-3 col-md-6 col-12 mb-30" data-category="">
                                <div className="blog-card__thumb hover-effect-1">
                                    <Link to={`/blog/${article.slug}`} className="blog-card__img-link">
                                        <img
                                            src={article.img}
                                            className="blog-card__img22"
                                            alt="phoxta"
                                            width={400}
                                            height={280} loading="lazy" />
                                    </Link>
                                </div>
                                <div className="blog-card__content">
                                    <h2 className="h6 blog-card__title">
                                        <Link to={`/blog/${article.slug}`} className="blog-card__title-link">{article.title}</Link>
                                    </h2>
                                    <p className="blog-card__meta">
                                        <span className="blog-card__meta-text">By </span>
                                        <Link to="/about" className="blog-card__author">{article.author}</Link>
                                        <span className="blog-card__meta-text"> - {article.date}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
