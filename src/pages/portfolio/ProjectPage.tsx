import { Link, useParams, Navigate } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { findCaseStudy, type CaseStudy, type Highlight } from "@/shared/portfolio/caseStudies";
import { PROFILE, PORTFOLIO_URL, PROJECTS, responsiveSrcSet, type Project } from "@/shared/portfolio/portfolioData";
import { PORTFOLIO_HOME, workPath } from "@/shared/portfolio/nav";

/** Absolute URL on the portfolio host for social cards (the default helper points at www.phoxta.com). */
const absoluteOnPortfolio = (path: string) => `${PORTFOLIO_URL}${path.replace(/^\//, "")}`;

/**
 * Text colour for a palette swatch, chosen by the swatch's relative luminance so the
 * hex label always clears WCAG AA (mid-tones such as sky blue or copper fail with
 * white text; the manual `ink` flag couldn't know that).
 */
function swatchInk(hex: string): string {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return "#fff";
    const [r, g, b] = [0, 2, 4].map((i) => {
        const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.18 ? "#1B1B23" : "#fff";
}

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

type HighlightBlock =
    | { kind: "shot"; item: Highlight; flip: boolean }
    | { kind: "wide"; item: Highlight }
    | { kind: "notes"; items: Highlight[] };

/**
 * Image-led decisions alternate left/right; consecutive text-only ones are grouped
 * into a two-up grid. Without this a cover-only study (Phoxta, Saveur) renders a
 * column of half-empty rows, because the alternating layout reserves space for an
 * image that is not there.
 */
function groupHighlights(highlights: Highlight[]): HighlightBlock[] {
    const blocks: HighlightBlock[] = [];
    let shots = 0;
    for (const item of highlights) {
        if (item.wide) {
            blocks.push({ kind: "wide", item });
        } else if (item.image) {
            blocks.push({ kind: "shot", item, flip: shots++ % 2 === 1 });
        } else {
            const last = blocks[blocks.length - 1];
            if (last && last.kind === "notes") last.items.push(item);
            else blocks.push({ kind: "notes", items: [item] });
        }
    }
    return blocks;
}

/** /work/:slug — a full case study when one exists, otherwise a brief built from the project data. */
export default function ProjectPage() {
    const { slug } = useParams();
    const cs = findCaseStudy(slug);
    if (cs) return <CaseStudyPage cs={cs} />;
    const project = PROJECTS.find((p) => p.slug === slug);
    if (project) return <ProjectBrief p={project} />;
    return <Navigate to="/" replace />;
}

function BackLink() {
    return (
        <div className="mb-40">
            <Link to={PORTFOLIO_HOME} className="pf-cs__back d-inline-flex align-items-center gap-2 fw-500 text-decoration-none">
                {BACK} Back to work
            </Link>
        </div>
    );
}

/** The next project in the running order, wrapping around — so a study ends in the work, not a dead end. */
function NextProject({ slug }: { slug: string }) {
    const i = PROJECTS.findIndex((p) => p.slug === slug);
    if (i < 0 || PROJECTS.length < 2) return null;
    const next = PROJECTS[(i + 1) % PROJECTS.length];
    return (
        <section className="pf-cs__sec pf-cs__next pt-60 pb-80">
            <div className="container-2200 px-3 px-lg-4">
                <span className="pf-cs__label d-block mb-25">Next project</span>
                <Link to={workPath(next.slug)} className="pf-cs__next-card d-block text-decoration-none">
                    <div className="row g-4 g-lg-5 align-items-center">
                        <div className="col-lg-7">
                            <div className="pf-cs__shot">
                                <img
                                    src={next.image}
                                    srcSet={responsiveSrcSet(next.image)}
                                    sizes="(max-width: 991px) 100vw, 58vw"
                                    alt={`${next.name} — ${next.kicker}`}
                                    width={1600}
                                    height={1000}
                                    loading="lazy"
                                />
                            </div>
                        </div>
                        <div className="col-lg-5">
                            <span className="pf-badge">{next.badge}</span>
                            <h2 className="pf-cs__next-title fz-60 fw-600 lh-1 mt-20 mb-2">{next.name}</h2>
                            <p className="pf-cs__body fz-font-lg mb-20">{next.blurb}</p>
                            <span className="pf-cs__next-cta d-inline-flex align-items-center gap-2 fw-600">
                                View case study {ARROW}
                            </span>
                        </div>
                    </div>
                </Link>
            </div>
        </section>
    );
}

function CtaBand() {
    return (
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
                    <Link to={PORTFOLIO_HOME} className="pf-cs__btn pf-cs__btn--outline d-inline-flex align-items-center gap-2 fw-600 text-decoration-none">
                        See all work
                    </Link>
                </div>
            </div>
        </section>
    );
}

/* ── Project brief: projects without a long-form study ─────────────── */
function ProjectBrief({ p }: { p: Project }) {
    const external = p.link && !p.link.startsWith("/") ? p.link : undefined;
    return (
        <div className="pf-cs" style={{ "--cs-accent": "#F0460E" } as React.CSSProperties}>
            <PageMeta
                title={`${p.name} — ${p.kicker} · ${PROFILE.shortName}`}
                description={p.summary}
                canonicalUrl={`${PORTFOLIO_URL}work/${p.slug}`}
                image={absoluteOnPortfolio(p.image)}
                siteName={PROFILE.shortName}
                twitterHandle={null}
            />

            <section className="pf-cs__hero pt-150 pb-60">
                <div className="container-2200 px-3 px-lg-4">
                    <BackLink />
                    <span className="pf-cs__eyebrow d-inline-flex align-items-center gap-2 mb-20">
                        <span className="pf-cs__dot" aria-hidden="true" />{p.kicker}
                    </span>
                    <h1 className="pf-cs__title fz-120 fw-600 lh-1 mb-20">{p.name}</h1>
                    <p className="pf-cs__tagline fz-font-xl mb-35">{p.summary}</p>
                    <div className="d-flex flex-wrap align-items-center gap-3">
                        {external && (
                            <a href={external} target="_blank" rel="noopener noreferrer" className="pf-cs__btn pf-cs__btn--solid d-inline-flex align-items-center gap-2 fw-600 text-decoration-none">
                                Visit live site {ARROW}
                            </a>
                        )}
                        <a href={`mailto:${PROFILE.email}`} className="pf-cs__btn pf-cs__btn--ghost d-inline-flex align-items-center gap-2 fw-600 text-decoration-none">
                            Work with me
                        </a>
                    </div>
                </div>
                <div className="container-2200 px-3 px-lg-4 mt-60">
                    <div className="pf-cs__shot pf-cs__shot--hero">
                        <img src={p.image} srcSet={responsiveSrcSet(p.image)} sizes="(max-width: 1440px) 100vw, 1400px" alt={`${p.name} — ${p.kicker}`} width={1600} height={1000} loading="eager" fetchPriority="high" className="w-100" />
                    </div>
                </div>
            </section>

            <section className="pf-cs__sec pt-80 pb-80">
                <div className="container-2200 px-3 px-lg-4">
                    <div className="row g-4 g-lg-5">
                        <div className="col-lg-4">
                            <span className="pf-cs__label">Role</span>
                        </div>
                        <div className="col-lg-8">
                            <p className="pf-cs__lead fz-font-2xl fw-400 lh-1 mb-2">{p.role}</p>
                            <p className="pf-cs__body fz-font-lg mb-0">{p.period}</p>
                        </div>
                    </div>
                    <div className="row g-4 g-lg-5 mt-40 pt-20 pf-cs__divider">
                        <div className="col-lg-4">
                            <span className="pf-cs__label">What I did</span>
                        </div>
                        <div className="col-lg-8">
                            <ul className="pf-cs__brief-list list-unstyled m-0">
                                {p.contributions.map((c) => (
                                    <li key={c} className="pf-cs__brief-item d-flex gap-3">
                                        <span className="pf-cs__outcome-dot" aria-hidden="true" />
                                        <p className="pf-cs__body fz-font-lg mb-0">{c}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="row g-4 g-lg-5 mt-40 pt-20 pf-cs__divider">
                        <div className="col-lg-4">
                            <span className="pf-cs__label">Focus</span>
                        </div>
                        <div className="col-lg-8">
                            <div className="pf-cs__chips d-flex flex-wrap">
                                {p.tags.map((t) => (
                                    <span key={t} className="pf-cs__chip">{t}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <NextProject slug={p.slug} />
            <CtaBand />
        </div>
    );
}

/* ── Full case study ───────────────────────────────────────────────── */
function CaseStudyPage({ cs }: { cs: CaseStudy }) {
    const project = PROJECTS.find((p) => p.slug === cs.slug);
    return (
        <div className="pf-cs" style={{ "--cs-accent": cs.accent } as React.CSSProperties}>
            <PageMeta
                title={`${cs.name} — ${cs.kicker.split(" · ")[0]} · ${PROFILE.shortName}`}
                description={cs.tagline}
                canonicalUrl={`${PORTFOLIO_URL}work/${cs.slug}`}
                image={absoluteOnPortfolio(cs.hero)}
                siteName={PROFILE.shortName}
                twitterHandle={null}
            />

            {/* ── Hero ── */}
            <section className="pf-cs__hero pt-150 pb-60">
                <div className="container-2200 px-3 px-lg-4">
                    {/* The hero is image-led on purpose; the document still needs its heading. */}
                    <h1 className="visually-hidden">{cs.name} — {cs.kicker}</h1>
                    <BackLink />
                    {project && (
                        <div className="mb-20">
                            <span className="pf-badge pf-badge--light">{project.badge}</span>
                        </div>
                    )}
                    <div className="d-flex flex-wrap align-items-center gap-3">
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
                    </div>
                </div>

                <div className="container-2200 px-3 px-lg-4 mt-60">
                    <div className="pf-cs__shot pf-cs__shot--hero">
                        <img src={cs.hero} srcSet={responsiveSrcSet(cs.hero)} sizes="(max-width: 1440px) 100vw, 1400px" alt={cs.heroAlt} width={1600} height={1120} loading="eager" fetchPriority="high" className="w-100" />
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
                            <h2 className="pf-cs__h2 fz-60 fw-600 lh-1 mt-20 mb-0">{cs.processTitle ?? "From problem to shipped product."}</h2>
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
                        {groupHighlights(cs.highlights).map((block, bi) =>
                            block.kind === "wide" ? (
                                <div key={block.item.title} className="pf-cs__wide">
                                    <div className="pf-cs__wide-copy">
                                        <h3 className="pf-cs__h3 fz-font-2xl fw-500 mb-3">{block.item.title}</h3>
                                        <p className="pf-cs__body fz-font-lg mb-0">{block.item.body}</p>
                                    </div>
                                    {block.item.image && (
                                        <div className="pf-cs__shot pf-cs__shot--phone mt-40 mx-auto">
                                            <img src={block.item.image} alt={block.item.imageAlt || block.item.title} width={480} height={860} loading="lazy" className="w-100" />
                                        </div>
                                    )}
                                </div>
                            ) : block.kind === "shot" ? (
                                <div key={block.item.title} className={`row g-4 g-lg-5 align-items-center ${block.flip ? "flex-lg-row-reverse" : ""}`}>
                                    <div className="col-lg-5">
                                        <h3 className="pf-cs__h3 fz-font-2xl fw-500 mb-3">{block.item.title}</h3>
                                        <p className="pf-cs__body fz-font-lg mb-0">{block.item.body}</p>
                                    </div>
                                    <div className="col-lg-7">
                                        <div className="pf-cs__shot">
                                            <img src={block.item.image} srcSet={responsiveSrcSet(block.item.image ?? "")} sizes="(max-width: 991px) 100vw, 58vw" alt={block.item.imageAlt || block.item.title} width={1600} height={1120} loading="lazy" className="w-100" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div key={`notes-${bi}`} className="row g-4">
                                    {block.items.map((n) => (
                                        <div key={n.title} className="col-md-6">
                                            <div className="pf-cs__note h-100">
                                                <h3 className="pf-cs__h3 fz-font-xl fw-500 mb-3">{n.title}</h3>
                                                <p className="pf-cs__body mb-0">{n.body}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </div>
                </div>
            </section>

            {/* ── Visual system ── */}
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
                                        <span className="pf-cs__swatch-chip" style={{ background: s.hex, color: swatchInk(s.hex) }}>{s.hex}</span>
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
                        <span className="pf-cs__label d-block mb-25">{cs.designSystemLabel ?? "Design system"}</span>
                        <div className="row g-3 g-lg-5 align-items-end mb-30">
                            <div className="col-lg-8">
                                <h2 className="pf-cs__h2 fz-60 fw-600 lh-1 mb-0">One source of truth, fully documented.</h2>
                            </div>
                            <div className="col-lg-4 text-lg-end">
                                <a href={cs.designSystemUrl} target="_blank" rel="noopener noreferrer" className="pf-cs__btn pf-cs__btn--dark d-inline-flex align-items-center gap-2 fw-600 text-decoration-none">
                                    {cs.designSystemLabel ? `Open the ${cs.designSystemLabel.toLowerCase()}` : "Explore the full system"} {ARROW}
                                </a>
                            </div>
                        </div>
                        {cs.designSystemBlurb && (
                            <p className="pf-cs__body fz-font-lg mb-40" style={{ maxWidth: "74ch" }}>{cs.designSystemBlurb}</p>
                        )}
                        {cs.designSystemImage && (
                            <a href={cs.designSystemUrl} target="_blank" rel="noopener noreferrer" className="pf-cs__ds-shot d-block">
                                <div className="pf-cs__shot">
                                    <img src={cs.designSystemImage} srcSet={responsiveSrcSet(cs.designSystemImage)} sizes="(max-width: 1440px) 100vw, 1400px" alt={`${cs.name} design system documentation`} width={1600} height={1138} loading="lazy" className="w-100" />
                                </div>
                            </a>
                        )}
                    </div>
                </section>
            )}

            <NextProject slug={cs.slug} />
            <CtaBand />
        </div>
    );
}
