import { Link, useParams, Navigate } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { findCaseStudy, type CaseStudy, type Decision, type Measure } from "@/shared/portfolio/caseStudies";
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

/* ── The honesty mechanism, rendered ────────────────────────────────
   A target must LOOK different from something counted, without a legend and
   without colour: the chip's BORDER STYLE carries it (dashed = target, solid =
   counted) and the word is always inside the pill. Every number on the page —
   the at-a-glance band, the standards table, the decision-level pills — goes through
   this one component, so a target cannot appear anywhere unchipped. */
const PROV_LABEL = {
    target: "Target — what we designed to",
    "in-build": "Counted in the build",
    "in-repo": "Counted in the repo",
    "in-doc": "In the guideline",
    reported: "Reported",
} as const;

function ProvChip({ m }: { m: Measure }) {
    const isTarget = m.provenance === "target";
    const label = m.provenance === "reported" ? `Reported — ${m.source}` : PROV_LABEL[m.provenance];
    return <span className={`pf-cs__prov ${isTarget ? "pf-cs__prov--target" : "pf-cs__prov--fact"}`}>{label}</span>;
}

/** Verification path — a stranger can open it in under a minute. Targets have none by type. */
function CheckLine({ m }: { m: Measure }) {
    if (!m.check) return null;
    return (
        <p className="pf-cs__check mb-0">
            <b>Check</b> {m.check}
        </p>
    );
}

/** A numeral is the thing a recruiter scans for, so it is set as one; a sentence
 *  value stays a sentence. One class, two treatments — not two competing styles. */
const isNumeral = (value: string) => /^[\d.,]+\s*\S{0,8}$/.test(value.trim());
const measureValueClass = (value: string) =>
    `pf-cs__measure-value${isNumeral(value) ? " pf-cs__measure-value--num" : ""}`;

function MeasureRow({ m }: { m: Measure }) {
    return (
        <li className="pf-cs__measure">
            <div className="pf-cs__measure-main">
                <p className="pf-cs__metric">{m.metric}</p>
                {m.definition && <p className="pf-cs__measure-def">{m.definition}</p>}
            </div>
            <div className="pf-cs__measure-side">
                <p className={measureValueClass(m.value)}>{m.value}</p>
                <ProvChip m={m} />
                <CheckLine m={m} />
            </div>
        </li>
    );
}

/* ── Decision layout ────────────────────────────────────────────────
   Image-led decisions still alternate left/right, and consecutive PLAIN
   text-only ones still pair into a two-up grid, so a cover-only study never
   renders half-empty rows. A text-only decision that carries the moment triple
   — question, fork, touchpoints, measures — takes a full-width card instead:
   that block is never half-empty, and halving it would squeeze the fork strip
   and the measure pills into 300px. */
type DecisionBlock =
    | { kind: "shot"; item: Decision; flip: boolean }
    | { kind: "wide"; item: Decision }
    | { kind: "solo"; item: Decision }
    | { kind: "notes"; items: Decision[] };

const isRich = (d: Decision) =>
    Boolean(d.question || d.instead || d.cost || d.touchpoints?.length || d.bar?.length);

function groupDecisions(decisions: Decision[]): DecisionBlock[] {
    const blocks: DecisionBlock[] = [];
    let shots = 0;
    for (const item of decisions) {
        if (item.wide) {
            blocks.push({ kind: "wide", item });
        } else if (item.image) {
            blocks.push({ kind: "shot", item, flip: shots++ % 2 === 1 });
        } else if (isRich(item)) {
            blocks.push({ kind: "solo", item });
        } else {
            const last = blocks[blocks.length - 1];
            if (last && last.kind === "notes") last.items.push(item);
            else blocks.push({ kind: "notes", items: [item] });
        }
    }
    return blocks;
}

/** Moment eyebrow + optional journey-phase chip. Never a heading, never navigation. */
function DecisionEyebrow({ d }: { d: Decision }) {
    if (!d.moment && !d.phase) return null;
    return (
        <div className="d-flex flex-wrap align-items-start gap-2 mb-3">
            {d.moment && (
                <span className="pf-cs__eyebrow">
                    <span className="pf-cs__dot" aria-hidden="true" />
                    {d.moment}
                </span>
            )}
            {d.phase && <span className="pf-cs__phase">{d.phase}</span>}
        </div>
    );
}

/** The subject's own words, then who is asking. The scan path of the section.
 *  The attribution is sentence case: as letterspaced caps it was a second
 *  eyebrow sitting 100px under the first, and unreadable at 40 characters. */
function DecisionQuestion({ d }: { d: Decision }) {
    if (!d.question) return null;
    return (
        <div className="pf-cs__quote mb-4">
            <p className="pf-cs__lead fz-font-xl mb-0">“{d.question}”</p>
            {d.subject && <span className="pf-cs__attrib d-block mt-2">{d.subject}</span>}
        </div>
    );
}

/** Instead of / What it cost. With one of the two absent the strip runs full width.
 *  It always renders full width inside a decision, so it never shrinks to two
 *  ribbons of three-word lines the way it did inside a 250px column. */
function DecisionFork({ d }: { d: Decision }) {
    if (!d.instead && !d.cost) return null;
    return (
        <div className={`pf-cs__fork mt-4 ${d.instead && d.cost ? "" : "pf-cs__fork--one"}`}>
            {d.instead && (
                <div className="pf-cs__fork-cell">
                    <span className="pf-cs__label d-block mb-2">Instead of</span>
                    <p className="pf-cs__body mb-0">{d.instead}</p>
                </div>
            )}
            {d.cost && (
                <div className="pf-cs__fork-cell">
                    <span className="pf-cs__label d-block mb-2">What it cost</span>
                    <p className="pf-cs__body mb-0">{d.cost}</p>
                </div>
            )}
        </div>
    );
}

/** A chip means "one token". Once it holds a 65-character clause it is a
 *  wrapping lozenge that reads as broken, so long touchpoints become a line. */
const CHIP_MAX = 30;

function DecisionFoot({ d }: { d: Decision }) {
    const touchpoints = d.touchpoints ?? [];
    const asLine = touchpoints.some((t) => t.length > CHIP_MAX);
    return (
        <>
            <DecisionFork d={d} />
            {touchpoints.length > 0 &&
                (asLine ? (
                    <div className="mt-4">
                        <span className="pf-cs__label d-block mb-2">Touchpoints</span>
                        <p className="pf-cs__body pf-cs__touchline mb-0">{touchpoints.join(" · ")}</p>
                    </div>
                ) : (
                    <div className="pf-cs__chips d-flex flex-wrap mt-4">
                        {touchpoints.map((t) => (
                            <span key={t} className="pf-cs__chip">{t}</span>
                        ))}
                    </div>
                ))}
            {d.bar && d.bar.length > 0 && (
                <ul className="pf-cs__pills mt-4">
                    {d.bar.map((m) => (
                        <li key={m.metric} className="pf-cs__pill">
                            <span className="pf-cs__pill-metric">{m.metric}</span>
                            <span className="pf-cs__pill-value">{m.value}</span>
                            <ProvChip m={m} />
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}

/**
 * One decision, in the layout its content earns.
 *
 * Every kind shares the same shape: a header (moment, title, question), the
 * argument, then ONE full-width foot carrying the fork, the touchpoints and the
 * measures. Putting the foot in a 5- or 7-column well was what made a decision
 * 1,000–1,300px tall and set the fork at 23 characters a line; full width it is
 * a strip, both columns above it fill, and the fork reads at a real measure.
 */
function DecisionHead({ d }: { d: Decision }) {
    return (
        <>
            <DecisionEyebrow d={d} />
            <h3 className="pf-cs__h3 fw-500 mb-3">{d.title}</h3>
        </>
    );
}

function renderDecisionBlock(block: DecisionBlock, bi: number) {
    if (block.kind === "wide") {
        return (
            <div key={block.item.title} className="pf-cs__dblock pf-cs__wide">
                <div className="pf-cs__wide-copy">
                    <DecisionHead d={block.item} />
                    <DecisionQuestion d={block.item} />
                    <p className="pf-cs__body fz-font-lg mb-0">{block.item.body}</p>
                    <DecisionFoot d={block.item} />
                </div>
                {block.item.image && (
                    <div className="pf-cs__shot pf-cs__shot--phone">
                        <img src={block.item.image} alt={block.item.imageAlt || block.item.title} width={480} height={860} loading="lazy" className="w-100" />
                    </div>
                )}
            </div>
        );
    }
    if (block.kind === "shot") {
        return (
            <div key={block.item.title} className="pf-cs__dblock pf-cs__dblock--bare">
                <div className={`row g-4 g-lg-5 align-items-center ${block.flip ? "flex-lg-row-reverse" : ""}`}>
                    <div className="col-lg-5">
                        <DecisionHead d={block.item} />
                        <DecisionQuestion d={block.item} />
                        <p className="pf-cs__body fz-font-lg mb-0">{block.item.body}</p>
                    </div>
                    <div className="col-lg-7">
                        <div className="pf-cs__shot">
                            <img src={block.item.image} srcSet={responsiveSrcSet(block.item.image ?? "")} sizes="(max-width: 991px) 100vw, 58vw" alt={block.item.imageAlt || block.item.title} width={1600} height={1120} loading="lazy" className="w-100" />
                        </div>
                    </div>
                </div>
                <DecisionFoot d={block.item} />
            </div>
        );
    }
    if (block.kind === "solo") {
        return (
            <div key={block.item.title} className="pf-cs__dblock pf-cs__decision">
                <DecisionHead d={block.item} />
                <div className="row g-4 g-lg-5">
                    <div className="col-lg-5">
                        <DecisionQuestion d={block.item} />
                    </div>
                    <div className="col-lg-7">
                        <p className="pf-cs__body fz-font-lg mb-0">{block.item.body}</p>
                    </div>
                </div>
                <DecisionFoot d={block.item} />
            </div>
        );
    }
    return (
        <div key={`notes-${bi}`} className="pf-cs__dblock pf-cs__dblock--bare">
            <div className="row g-4">
                {block.items.map((n) => (
                    <div key={n.title} className="col-md-6">
                        <div className="pf-cs__note h-100">
                            <DecisionEyebrow d={n} />
                            <h3 className="pf-cs__h3 pf-cs__h3--sm fw-500 mb-3">{n.title}</h3>
                            <p className="pf-cs__body mb-0">{n.body}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Decisions shown before the fold. Enough to judge how the work thinks; the
 *  rest stay in the document, one control away, rather than 5,000px down. */
const FOLD_AFTER = 3;

/** How many decisions a group of blocks holds — the count on the "show more" control. */
const countDecisions = (blocks: DecisionBlock[]) =>
    blocks.reduce((n, b) => n + (b.kind === "notes" ? b.items.length : 1), 0);

/** /work/:slug — a full case study when one exists, otherwise a brief built from the project data. */
export default function ProjectPage() {
    const { slug } = useParams();
    const cs = findCaseStudy(slug);
    const project = PROJECTS.find((p) => p.slug === slug);
    if (cs) return <CaseStudyPage cs={cs} />;
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
        <section className="pf-cs__next">
            <div className="container-2200 px-3 px-lg-4">
                <h2 className="pf-cs__sec-title">Next project</h2>
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
                            <h3 className="pf-cs__next-title fw-600 lh-1 mt-20 mb-2">{next.name}</h3>
                            <p className="pf-cs__body mb-20">{next.blurb}</p>
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
        <section className="pf-cs__cta bg-neutral-950 text-white">
            <div className="container-2200 px-3 px-lg-4 text-center">
                <span className="pf-cs__eyebrow pf-cs__eyebrow--light mb-20 mx-auto">
                    <span className="pf-cs__dot" aria-hidden="true" />Next
                </span>
                <h2 className="pf-cs__cta-title fw-600 lh-1 mb-0">Like how this thinks?</h2>
                <p className="pf-cs__cta-lede fz-font-lg mx-auto mt-20 mb-30">
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

            <section className="pf-cs__hero">
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

            <section className="pf-cs__sec">
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

/* ── Full case study: a decision record ─────────────────────────────── */
function CaseStudyPage({ cs }: { cs: CaseStudy }) {
    const glanceBar = (cs.bar ?? []).slice(0, 2);
    /* Four decisions read; the remainder folded. The section was 33–42% of the
       page's height at one uniform weight, which is a marathon, not a record. */
    const blocks = groupDecisions(cs.decisions);
    const fold = blocks.length > FOLD_AFTER + 1;
    const head = fold ? blocks.slice(0, FOLD_AFTER) : blocks;
    const rest = fold ? blocks.slice(FOLD_AFTER) : [];
    const restCount = countDecisions(rest);
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
            <section className="pf-cs__hero">
                <div className="container-2200 px-3 px-lg-4">
                    <BackLink />
                    {/*
                     * No title block above the cover. The badge, kicker, name,
                     * tagline and the role/timeline/tools grid used to sit here
                     * and pushed the work itself below the fold — on a portfolio
                     * the cover IS the opening argument, so it leads.
                     *
                     * The <h1> stays in the document for assistive technology,
                     * search and the page outline; it is only visually removed.
                     * The meta moved into the body of the study (see below), so
                     * nothing a recruiter needs was lost.
                     */}
                    <h1
                        className="pf-cs__title--sr"
                        style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}
                    >
                        {cs.name} — {cs.kicker}
                    </h1>
                </div>

                {/* The cover comes first. With the title block gone, anything else
                    here is 164px of chrome standing where an entry point used to be. */}
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

            {/* ── At a glance — the ninety-second read ── */}
            <section className="pf-cs__sec">
                <div className="container-2200 px-3 px-lg-4">
                    <h2 className="pf-cs__sec-title">At a glance</h2>
                    <div className="pf-cs__glance">
                        <div className="pf-cs__glance-col">
                            <span className="pf-cs__label">The problem</span>
                            <p className="pf-cs__glance-body">{cs.atAGlance.problem}</p>
                        </div>
                        <div className="pf-cs__glance-col">
                            <span className="pf-cs__label">The approach</span>
                            <p className="pf-cs__glance-body">{cs.atAGlance.move}</p>
                        </div>
                        <div className="pf-cs__glance-col">
                            <span className="pf-cs__label">The standard</span>
                            {glanceBar.length > 0 ? (
                                <ul className="list-unstyled m-0 mt-3">
                                    {glanceBar.map((m) => (
                                        <li key={m.metric} className="pf-cs__outcome-item">
                                            <p className="pf-cs__metric">{m.metric}</p>
                                            <p className={`${measureValueClass(m.value)} mb-2`}>{m.value}</p>
                                            <ProvChip m={m} />
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="pf-cs__glance-body">No numbered bar was set on this engagement.</p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Overview, before, constraint, challenge ──
                 One column, not a label rail. The rail put a 19px label beside
                 a paragraph and stranded 70–320px of dead space under it in
                 every row, while pushing the prose out to 87 characters. */}
            <section className="pf-cs__sec">
                <div className="container-2200 px-3 px-lg-4">
                    <h2 className="pf-cs__sec-title">Overview</h2>
                    <p className="pf-cs__lead fz-font-xl fw-400 lh-1 mb-0 pf-cs__overview-lead">{cs.summary}</p>
                    {cs.before && (
                        <div className="mt-30 pt-25 pf-cs__divider">
                            <span className="pf-cs__label d-block mb-2">What it replaced</span>
                            <p className="pf-cs__body fz-font-lg mb-0">{cs.before}</p>
                        </div>
                    )}
                    <div className="mt-30 pt-25 pf-cs__divider">
                        <span className="pf-cs__label d-block mb-2">The challenge</span>
                        <p className="pf-cs__body fz-font-lg mb-0">{cs.challenge}</p>
                    </div>
                    {cs.constraint && (
                        <div className="mt-30 pt-25 pf-cs__divider">
                            <span className="pf-cs__label d-block mb-2">The hardest constraint</span>
                            <p className="pf-cs__lead fz-font-xl fw-400 mb-0 pf-cs__overview-lead">{cs.constraint}</p>
                        </div>
                    )}
                </div>
            </section>

            {/* ── Goals ── */}
            <section className="pf-cs__sec">
                <div className="container-2200 px-3 px-lg-4">
                    <h2 className="pf-cs__sec-title">Design goals</h2>
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

            {/* ── Who it was for ── */}
            {cs.subjects && cs.subjects.length > 0 && (
                <section className="pf-cs__sec">
                    <div className="container-2200 px-3 px-lg-4">
                        <h2 className="pf-cs__sec-title">Who it was for</h2>
                        <div className="row g-4">
                            {cs.subjects.map((s) => (
                                <div key={s.label} className="col-md-6 col-xl-4">
                                    <div className="pf-cs__note h-100">
                                        {s.name && <span className="pf-cs__label d-block mb-2">{s.name}</span>}
                                        <h3 className="pf-cs__h3 fz-font-xl fw-500 mb-3">{s.label}</h3>
                                        <p className="pf-cs__body mb-0">{s.context}</p>
                                        <div className="pf-cs__divider mt-25 pt-25">
                                            <span className="pf-cs__label d-block mb-2">Judges it by</span>
                                            <p className="pf-cs__lead fz-font-lg fw-400 mb-0">{s.judges}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ── The standard. Deliberately BEFORE the decisions: a definition of
                 "working" that appears after the work is a rationalisation. ── */}
            {cs.bar && cs.bar.length > 0 && (
                <section className="pf-cs__sec">
                    <div className="container-2200 px-3 px-lg-4">
                        <div className="row g-4 g-lg-5">
                            <div className="col-lg-4">
                                {/* Sticky, so the definition tracks the rows it defines
                                    instead of stranding 900px of empty column. */}
                                <div className="pf-cs__rail">
                                    <h2 className="pf-cs__sec-title">The standard we designed to</h2>
                                    {cs.definitionOfDone && <p className="pf-cs__body">{cs.definitionOfDone}</p>}
                                    <p className="pf-cs__legend">
                                        <ProvChip m={{ metric: "", value: "", provenance: "target" }} />
                                        <span>a standard the design was held to, not a result.</span>
                                        <ProvChip m={{ metric: "", value: "", provenance: "in-repo" }} />
                                        <span>something you can open and count, with the place to look.</span>
                                    </p>
                                </div>
                            </div>
                            <div className="col-lg-8">
                                <ul className="list-unstyled m-0">
                                    {cs.bar.map((m) => (
                                        <MeasureRow key={m.metric} m={m} />
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* ── How the work ran ── */}
            <section className="pf-cs__sec">
                <div className="container-2200 px-3 px-lg-4">
                    <div className="row g-4 g-lg-5">
                        <div className="col-lg-4">
                            <div className="pf-cs__rail">
                                {/* The section NAME is the heading; the authored line is a
                                    subtitle under it, not a competing 44px display h2. */}
                                <h2 className="pf-cs__sec-title mb-0">How the work ran</h2>
                                <p className="pf-cs__h2 mb-0">{cs.processTitle ?? "From problem to shipped product."}</p>
                            </div>
                        </div>
                        <div className="col-lg-8">
                            <ol className="pf-cs__process list-unstyled m-0">
                                {cs.process.map((p, i) => (
                                    <li key={p.phase} className="pf-cs__step">
                                        <span className="pf-cs__step-no">{String(i + 1).padStart(2, "0")}</span>
                                        <div>
                                            <h3 className="pf-cs__step-title mb-2">{p.phase}</h3>
                                            <p className="pf-cs__body mb-0">{p.body}</p>
                                            {p.changed && (
                                                <p className="pf-cs__changed">
                                                    <span className="pf-cs__label">Changed:</span> <em>{p.changed}</em>
                                                </p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Design decisions ── */}
            <section className="pf-cs__sec">
                <div className="container-2200 px-3 px-lg-4">
                    <h2 className="pf-cs__sec-title mb-3">Design decisions</h2>
                    <div className="mb-40">
                        <p className="pf-cs__evidence mb-2">{cs.evidenceNote}</p>
                        {cs.phaseNote && <p className="pf-cs__evidence pf-cs__evidence--note mb-0">{cs.phaseNote}</p>}
                    </div>
                    <div className="pf-cs__decisions">{head.map(renderDecisionBlock)}</div>
                    {rest.length > 0 && (
                        /* Folded, not deleted: the rest stay in the document — indexable,
                           printable, and one click away — so the ninety-second reader is
                           not asked to scroll past 8,000px to reach the next section. */
                        <details className="pf-cs__more">
                            <summary>Show {restCount} more decision{restCount === 1 ? "" : "s"}</summary>
                            <div className="pf-cs__decisions">{rest.map(renderDecisionBlock)}</div>
                        </details>
                    )}
                </div>
            </section>

            {/* ── Deliberately not designed ── */}
            {((cs.notDesigned && cs.notDesigned.length > 0) || (cs.constraints && cs.constraints.length > 0)) && (
                <section className="pf-cs__sec pf-cs__band">
                    <div className="container-2200 px-3 px-lg-4">
                        <h2 className="pf-cs__sec-title">Deliberately not designed</h2>
                        {cs.notDesigned && cs.notDesigned.length > 0 && (
                            <div className="row g-4">
                                {cs.notDesigned.map((t) => (
                                    <div key={t.title} className="col-md-6">
                                        <div className="pf-cs__note h-100">
                                            <h3 className="pf-cs__h3 fz-font-xl fw-500 mb-3">{t.title}</h3>
                                            <p className="pf-cs__body mb-0">{t.body}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {cs.constraints && cs.constraints.length > 0 && (
                            <div className="mt-40">
                                <h3 className="pf-cs__sub-title">What forced the hand</h3>
                                <ul className="list-unstyled m-0">
                                    {cs.constraints.map((c) => (
                                        <li key={c} className="pf-cs__outcome-item d-flex gap-3">
                                            <span className="pf-cs__outcome-dot" aria-hidden="true" />
                                            <p className="pf-cs__body mb-0">{c}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* ── Visual system ── */}
            <section className="pf-cs__sec">
                <div className="container-2200 px-3 px-lg-4">
                    <div className="row g-4 g-lg-5">
                        <div className="col-lg-4">
                            <div className="pf-cs__rail">
                                <h2 className="pf-cs__sec-title mb-0">Visual system</h2>
                                <p className="pf-cs__h2 mb-0">One kit, quietly consistent.</p>
                            </div>
                        </div>
                        <div className="col-lg-8">
                            <div className="pf-cs__palette d-flex flex-wrap mb-30">
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
                <section className="pf-cs__sec">
                    <div className="container-2200 px-3 px-lg-4">
                        <div className="row g-3 g-lg-5 align-items-end mb-30">
                            <div className="col-lg-8">
                                <h2 className="pf-cs__sec-title mb-0">{cs.designSystemLabel ?? "Design system"}</h2>
                                <p className="pf-cs__h2 mb-0">One source of truth, fully documented.</p>
                            </div>
                            <div className="col-lg-4 text-lg-end">
                                <a href={cs.designSystemUrl} target="_blank" rel="noopener noreferrer" className="pf-cs__btn pf-cs__btn--dark d-inline-flex align-items-center gap-2 fw-600 text-decoration-none">
                                    {cs.designSystemLabel ? `Open the ${cs.designSystemLabel.toLowerCase()}` : "Explore the full system"} {ARROW}
                                </a>
                            </div>
                        </div>
                        {cs.designSystemBlurb && (
                            <p className="pf-cs__body fz-font-lg mb-30">{cs.designSystemBlurb}</p>
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

            {/* ── What I'd test next ── */}
            {cs.unknowns && cs.unknowns.length > 0 && (
                <section className="pf-cs__sec">
                    <div className="container-2200 px-3 px-lg-4">
                        <h2 className="pf-cs__sec-title mb-3">What I&apos;d test next</h2>
                        <p className="pf-cs__body mb-30">Nothing here was measured in a session. These are the questions the work has no answer to yet, and the order I would take them in.</p>
                        <ul className="list-unstyled m-0">
                            {cs.unknowns.map((u) => (
                                <li key={u} className="pf-cs__outcome-item d-flex gap-3">
                                    <span className="pf-cs__outcome-dot" aria-hidden="true" />
                                    <p className="pf-cs__body mb-0">{u}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            )}

            <NextProject slug={cs.slug} />
            <CtaBand />
        </div>
    );
}
