import { Link, useParams, Navigate } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { findCaseStudy } from "@/shared/portfolio/caseStudies";
import { PROFILE, PORTFOLIO_URL } from "@/shared/portfolio/portfolioData";

const ARROW = (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M12.1716 8.77806L8.55964e-06 8.77806L1.47897e-06 6.77807L12.1716 6.77807L6.80761 1.41412L8.22183 -9.53337e-05L16 7.77806L8.22181 15.5562L6.80759 14.142L12.1716 8.77806Z" fill="currentColor" />
    </svg>
);
const BACK = (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ transform: "scaleX(-1)" }}>
        <path d="M12.1716 8.77806L8.55964e-06 8.77806L1.47897e-06 6.77807L12.1716 6.77807L6.80761 1.41412L8.22183 -9.53337e-05L16 7.77806L8.22181 15.5562L6.80759 14.142L12.1716 8.77806Z" fill="currentColor" />
    </svg>
);

export default function ProjectPage() {
    const { slug } = useParams();
    const cs = findCaseStudy(slug);
    if (!cs) return <Navigate to="/" replace />;

    return (
        <div className="pf-cs" style={{ "--cs-accent": cs.accent } as React.CSSProperties}>
            <PageMeta
                title={`${cs.name} — ${cs.kicker.split(" · ")[0]} · ${PROFILE.shortName}`}
                description={cs.tagline}
                canonicalUrl={`${PORTFOLIO_URL}work/${cs.slug}`}
                image={cs.hero}
            />

            {/* ── Hero ── */}
            <section className="pf-cs__hero pt-150 pb-60">
                <div className="container-2200 px-3 px-lg-4">
                    <div className="mb-40">
                        <Link to="/" className="pf-cs__back d-inline-flex align-items-center gap-2 fw-500 text-decoration-none">
                            {BACK} Back to work
                        </Link>
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-3">
                        {cs.prototypeUrl && (
                            <a href={cs.prototypeUrl} target="_blank" rel="noopener noreferrer" className="pf-cs__btn pf-cs__btn--solid d-inline-flex align-items-center gap-2 fw-600 text-decoration-none">
                                View live prototype {ARROW}
                            </a>
                        )}
                        {cs.designSystemUrl && (
                            <a href={cs.designSystemUrl} target="_blank" rel="noopener noreferrer" className="pf-cs__btn pf-cs__btn--ghost d-inline-flex align-items-center gap-2 fw-600 text-decoration-none">
                                Design system {ARROW}
                            </a>
                        )}
                        <a href={`mailto:${PROFILE.email}`} className="pf-cs__btn pf-cs__btn--ghost d-inline-flex align-items-center gap-2 fw-600 text-decoration-none">
                            Work with me
                        </a>
                    </div>
                </div>

                <div className="container-2200 px-3 px-lg-4 mt-60">
                    <div className="pf-cs__shot pf-cs__shot--hero">
                        <img src={cs.hero} alt={cs.heroAlt} width={1600} height={1120} loading="eager" className="w-100" />
                    </div>
                </div>
            </section>

            {/* ── Overview + Challenge ── */}
            <section className="pf-cs__sec pt-80 pb-40">
                <div className="container-2200 px-3 px-lg-4">
                    <div className="row g-4 g-lg-5">
                        <div className="col-lg-4">
                            <span className="pf-cs__label">Overview</span>
                        </div>
                        <div className="col-lg-8">
                            <p className="pf-cs__lead fz-font-2xl fw-400 lh-1 mb-0">{cs.summary}</p>
                        </div>
                    </div>
                    <div className="row g-4 g-lg-5 mt-40 pt-20 pf-cs__divider">
                        <div className="col-lg-4">
                            <span className="pf-cs__label">The challenge</span>
                        </div>
                        <div className="col-lg-8">
                            <p className="pf-cs__body fz-font-lg mb-0">{cs.challenge}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Goals ── */}
            <section className="pf-cs__sec pt-60 pb-40">
                <div className="container-2200 px-3 px-lg-4">
                    <span className="pf-cs__label d-block mb-40">Design goals</span>
                    <div className="row g-4">
                        {cs.goals.map((g, i) => (
                            <div key={g.title} className="col-md-6 col-xl-3">
                                <div className="pf-cs__goal h-100">
                                    <span className="pf-cs__goal-no">{String(i + 1).padStart(2, "0")}</span>
                                    <h3 className="pf-cs__goal-title mt-20 mb-2">{g.title}</h3>
                                    <p className="pf-cs__goal-body mb-0">{g.body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Process ── */}
            <section className="pf-cs__sec pt-60 pb-40">
                <div className="container-2200 px-3 px-lg-4">
                    <div className="row g-4 g-lg-5">
                        <div className="col-lg-4">
                            <span className="pf-cs__label">Process</span>
                            <h2 className="pf-cs__h2 fz-60 fw-600 lh-1 mt-20 mb-0">From momentum problem to daily habit.</h2>
                        </div>
                        <div className="col-lg-8">
                            <ol className="pf-cs__process list-unstyled m-0">
                                {cs.process.map((p, i) => (
                                    <li key={p.phase} className="pf-cs__step">
                                        <span className="pf-cs__step-no">{String(i + 1).padStart(2, "0")}</span>
                                        <div>
                                            <h3 className="pf-cs__step-title mb-2">{p.phase}</h3>
                                            <p className="pf-cs__body mb-0">{p.body}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Highlights ── */}
            <section className="pf-cs__sec pt-60 pb-40">
                <div className="container-2200 px-3 px-lg-4">
                    <span className="pf-cs__label d-block mb-40">Design decisions</span>
                    <div className="d-flex flex-column gap-5">
                        {cs.highlights.map((h, i) =>
                            h.wide ? (
                                <div key={h.title} className="pf-cs__wide">
                                    <div className="pf-cs__wide-copy">
                                        <h3 className="pf-cs__h3 fz-font-2xl fw-500 mb-3">{h.title}</h3>
                                        <p className="pf-cs__body fz-font-lg mb-0">{h.body}</p>
                                    </div>
                                    {h.image && (
                                        <div className="pf-cs__shot pf-cs__shot--phone mt-40 mx-auto">
                                            <img src={h.image} alt={h.imageAlt || h.title} width={480} height={860} loading="lazy" className="w-100" />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div key={h.title} className={`row g-4 g-lg-5 align-items-center ${i % 2 ? "flex-lg-row-reverse" : ""}`}>
                                    <div className={h.image ? "col-lg-5" : "col-lg-8"}>
                                        <h3 className="pf-cs__h3 fz-font-2xl fw-500 mb-3">{h.title}</h3>
                                        <p className="pf-cs__body fz-font-lg mb-0">{h.body}</p>
                                    </div>
                                    {h.image && (
                                        <div className="col-lg-7">
                                            <div className="pf-cs__shot">
                                                <img src={h.image} alt={h.imageAlt || h.title} width={1600} height={1120} loading="lazy" className="w-100" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                </div>
            </section>

            {/* ── Design system ── */}
            <section className="pf-cs__sec pt-60 pb-40">
                <div className="container-2200 px-3 px-lg-4">
                    <div className="row g-4 g-lg-5">
                        <div className="col-lg-4">
                            <span className="pf-cs__label">Visual system</span>
                            <h2 className="pf-cs__h2 fz-60 fw-600 lh-1 mt-20 mb-0">One kit, quietly consistent.</h2>
                        </div>
                        <div className="col-lg-8">
                            <div className="pf-cs__palette d-flex flex-wrap mb-40">
                                {cs.palette.map((s) => (
                                    <div key={s.name} className="pf-cs__swatch">
                                        <span className="pf-cs__swatch-chip" style={{ background: s.hex, color: s.ink ? "#1B1B23" : "#fff" }}>{s.hex}</span>
                                        <span className="pf-cs__swatch-name">{s.name}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="pf-cs__body fz-font-lg">{cs.typeNote}</p>
                            <div className="pf-cs__chips d-flex flex-wrap mt-25">
                                {cs.components.map((c) => (
                                    <span key={c} className="pf-cs__chip">{c}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Design system ── */}
            {cs.designSystemUrl && (
                <section className="pf-cs__sec pt-40 pb-80">
                    <div className="container-2200 px-3 px-lg-4">
                        <span className="pf-cs__label d-block mb-25">Design system</span>
                        <div className="row g-3 g-lg-5 align-items-end mb-30">
                            <div className="col-lg-8">
                                <h2 className="pf-cs__h2 fz-60 fw-600 lh-1 mb-0">One source of truth, fully documented.</h2>
                            </div>
                            <div className="col-lg-4 text-lg-end">
                                <a href={cs.designSystemUrl} target="_blank" rel="noopener noreferrer" className="pf-cs__btn pf-cs__btn--dark d-inline-flex align-items-center gap-2 fw-600 text-decoration-none">
                                    Explore the full system {ARROW}
                                </a>
                            </div>
                        </div>
                        {cs.designSystemBlurb && (
                            <p className="pf-cs__body fz-font-lg mb-40" style={{ maxWidth: "74ch" }}>{cs.designSystemBlurb}</p>
                        )}
                        {cs.designSystemImage && (
                            <a href={cs.designSystemUrl} target="_blank" rel="noopener noreferrer" className="pf-cs__ds-shot d-block">
                                <div className="pf-cs__shot">
                                    <img src={cs.designSystemImage} alt={`${cs.name} design system documentation`} width={1600} height={1138} loading="lazy" className="w-100" />
                                </div>
                            </a>
                        )}
                    </div>
                </section>
            )}

            {/* ── Next / CTA ── */}
            <section className="pf-cs__cta bg-neutral-950 text-white pt-100 pb-100">
                <div className="container-2200 px-3 px-lg-4 text-center">
                    <span className="pf-cs__eyebrow pf-cs__eyebrow--light d-inline-flex align-items-center gap-2 mb-20 mx-auto">
                        <span className="pf-cs__dot" aria-hidden="true" />Next
                    </span>
                    <h2 className="pf-cs__cta-title fz-120 fw-600 lh-1 mb-0">Like how this thinks?</h2>
                    <p className="pf-cs__cta-lede fz-font-lg mx-auto mt-25 mb-40">
                        {PROFILE.availability}. Tell me what you're building and let's make it clear, usable and shipped.
                    </p>
                    <div className="d-flex flex-wrap justify-content-center gap-3">
                        <a href={`mailto:${PROFILE.email}`} className="pf-cs__btn pf-cs__btn--light d-inline-flex align-items-center gap-2 fw-600 text-decoration-none">
                            Get in touch {ARROW}
                        </a>
                        <Link to="/" className="pf-cs__btn pf-cs__btn--outline d-inline-flex align-items-center gap-2 fw-600 text-decoration-none">
                            See all work
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
