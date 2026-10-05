import type { CSSProperties } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { findCaseStudy } from "@/shared/portfolio/caseStudies";
import { CASE_STORIES } from "@/shared/portfolio/caseStories";
import { PROFILE, PORTFOLIO_URL, PROJECTS, responsiveSrcSet } from "@/shared/portfolio/portfolioData";
import { PORTFOLIO_HOME, workPath } from "@/shared/portfolio/nav";

const ARROW = <span aria-hidden="true">↗</span>;
function BackLink() {
    return <div className="mb-40"><Link to={PORTFOLIO_HOME} className="pf-cs__back d-inline-flex align-items-center gap-2 fw-500 text-decoration-none"><span aria-hidden="true">←</span> Back to work</Link></div>;
}

export default function ProjectPage() {
    const { slug } = useParams();
    const cs = findCaseStudy(slug);
    const story = cs && CASE_STORIES[cs.slug];
    if (!cs || !story) return <Navigate to={PORTFOLIO_HOME} replace />;
    const index = PROJECTS.findIndex(project => project.slug === cs.slug);
    const next = PROJECTS[(index + 1) % PROJECTS.length];

    return (
        <div className="pf-cs" style={{ "--cs-accent": cs.accent } as CSSProperties}>
            <PageMeta title={cs.name + " — " + PROFILE.shortName} description={cs.tagline} canonicalUrl={PORTFOLIO_URL + "work/" + cs.slug} image={PORTFOLIO_URL + cs.hero.replace(/^\//, "")} siteName={PROFILE.shortName} twitterHandle={null} />
            <section className="pf-cs__hero">
                <div className="container-2200 px-3 px-lg-4">
                    <BackLink />
                    <p className="pf2-study-kicker">{cs.kicker}</p>
                    <h1 className="pf2-study-title">{cs.name}</h1>
                    <p className="pf2-study-lede">{cs.tagline}</p>
                </div>

                <div className="container-2200 px-3 px-lg-4 mt-25">
                    <div className="pf-cs__shot pf-cs__shot--hero">
                        <img src={cs.hero} srcSet={responsiveSrcSet(cs.hero)} sizes="(max-width: 1440px) 100vw, 1400px" alt={cs.heroAlt} width={1600} height={1120} loading="eager" fetchPriority="high" className="w-100" />
                    </div>
                </div>

                {/* Role, timeline, platform and tools — the first thing a recruiter
                    checks. Under the cover rather than above it: the work makes the
                    case, this answers "and what exactly did you do on it?". The
                    controls sit with it, so they read as the cover's footer. */}
                <div className="container-2200 px-3 px-lg-4 mt-30">
                    <div className="pf-cs__meta d-flex flex-wrap">
                        {cs.meta.map((m) => (
                            <div key={m.label} className="pf-cs__meta-item">
                                <span className="pf-cs__meta-label">{m.label}</span>
                                <span className="pf-cs__meta-value">{m.value}</span>
                            </div>
                        ))}
                    </div>

                    <div className="d-flex flex-wrap align-items-center gap-3 mt-25">
                        {cs.prototypeUrl && (
                            <a href={cs.prototypeUrl} target="_blank" rel="noopener noreferrer" className="pf-cs__btn pf-cs__btn--solid d-inline-flex align-items-center gap-2 fw-600 text-decoration-none">
                                {cs.prototypeLabel ?? "View live prototype"} {ARROW}
                            </a>
                        )}
                        {cs.designSystemUrl && (
                            <a href={cs.designSystemUrl} target="_blank" rel="noopener noreferrer" className="pf-cs__btn pf-cs__btn--ghost d-inline-flex align-items-center gap-2 fw-600 text-decoration-none">
                                {cs.designSystemLabel ?? "Design system"} {ARROW}
                            </a>
                        )}
                        <a href={`mailto:${PROFILE.email}`} className="pf-cs__btn pf-cs__btn--ghost d-inline-flex align-items-center gap-2 fw-600 text-decoration-none">
                            Work with me
                        </a>
                        <div className="pf-cs__chips d-flex flex-wrap align-items-center">
                            {cs.tags.map((t) => (
                                <span key={t} className="pf-badge pf-badge--light">{t}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
            <div className="pf-story">
                <section className="pf-story__overview pf-story__wrap" aria-labelledby="case-overview">
                    <div>
                        <p className="pf-story__eyebrow">The brief</p>
                        <h2 id="case-overview">{story.problem}</h2>
                    </div>
                    <div className="pf-story__context">
                        <div><h3>My contribution</h3><p>{story.ownership}</p></div>
                        <div><h3>The constraint</h3><p>{story.constraint}</p></div>
                    </div>
                </section>

                <section className="pf-story__decisions pf-story__wrap" aria-labelledby="case-decisions">
                    <div className="pf-story__section-heading"><p className="pf-story__eyebrow">Design judgement</p><h2 id="case-decisions">Three decisions that shaped the experience.</h2></div>
                    <ol className="pf-story__decision-grid">
                        {story.decisions.map((decision, i) => <li key={decision.title}>
                            <span className="pf-story__number">0{i + 1}</span>
                            <h3>{decision.title}</h3>
                            <p>{decision.rationale}</p>
                            <div className="pf-story__tradeoff"><h4>The trade-off</h4><p>{decision.tradeoff}</p></div>
                        </li>)}
                    </ol>
                    {story.figures.map(figure => <figure className="pf-story__figure" key={figure.src}>
                        <div className="pf-story__image"><img src={figure.src} alt={figure.alt} loading="lazy" decoding="async" /></div>
                        <figcaption>{figure.caption}</figcaption>
                    </figure>)}
                    {story.figures.length === 0 && <div className="pf-story__journeys" aria-label="Three restaurant guest journeys">{["Order a meal", "Reserve a table", "Plan an event"].map((intent, i) => <div key={intent}><span>0{i + 1}</span><h3>{intent}</h3><p>{["Menu → bag → order tracking", "Date → party size → reservation", "Requirements → request → quote"][i]}</p></div>)}</div>}
                </section>

                <section className="pf-story__delivery" aria-labelledby="case-delivery">
                    <div className="pf-story__wrap pf-story__delivery-grid">
                        <div><p className="pf-story__eyebrow">Delivery</p><h2 id="case-delivery">What I delivered</h2><p>{story.delivered}</p></div>
                        <div><p className="pf-story__eyebrow">Reflection</p><h2>What I’d validate next</h2><p>{story.next}</p></div>
                    </div>
                </section>
                <nav className="pf-story__next pf-story__wrap" aria-label="More portfolio work">
                    <Link to={PORTFOLIO_HOME}>All work <span aria-hidden="true">←</span></Link>
                    <Link to={workPath(next.slug)}><span>Next project</span><strong>{next.name} {ARROW}</strong></Link>
                </nav>
            </div>
        </div>
    );
}
