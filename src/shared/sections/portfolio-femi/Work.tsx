import { PROJECTS } from "@/shared/portfolio/portfolioData";

const CHECK = (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M11.5 3.5L5.25 9.75L2.5 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default function Work() {
    return (
        <section id="work" className="pf-work bg-neutral-50 overflow-hidden pt-120 pb-120">
            <div className="container-2200 px-3 px-lg-4">
                <div className="row align-items-end pb-60">
                    <div className="col-lg-8">
                        <span className="pf-eyebrow"><span className="pf-eyebrow__dot" aria-hidden="true" />Selected work</span>
                        <h2 className="pf-section-title fz-60 fw-600 lh-1 mt-20 mb-0">
                            A few things I've designed and shipped.
                        </h2>
                    </div>
                    <div className="col-lg-4 mt-3 mt-lg-0">
                        <p className="pf-work__note mb-0 text-lg-end">
                            Six roles, six industries — from a solo AI platform to enterprise tools used by thousands.
                        </p>
                    </div>
                </div>

                <div className="d-flex flex-column gap-5">
                    {PROJECTS.map((p, i) => (
                        <article key={p.slug} className="pf-case at_fade_anim" data-fade-from="bottom">
                            <div className={`row g-4 g-lg-5 align-items-center${i % 2 === 1 ? " flex-lg-row-reverse" : ""}`}>
                                <div className="col-lg-6">
                                    <div className={`pf-case__visual pf-case__visual--${p.tone}`}>
                                        <span className="pf-case__badge">{p.kicker}</span>
                                        <img
                                            src={p.image}
                                            alt={`${p.name} — ${p.kicker}`}
                                            width={720}
                                            height={520}
                                            className="img-cover w-100 h-100"
                                            loading="lazy"
                                        />
                                    </div>
                                </div>
                                <div className="col-lg-6">
                                    <div className="pf-case__body">
                                        <div className="pf-case__meta">
                                            <span className="pf-case__index">{String(i + 1).padStart(2, "0")}</span>
                                            <span className="pf-case__period">{p.period}</span>
                                        </div>
                                        <h3 className="pf-case__title">{p.name}</h3>
                                        <p className="pf-case__role">{p.role}</p>
                                        <p className="pf-case__summary">{p.summary}</p>
                                        <ul className="pf-case__list list-unstyled m-0">
                                            {p.contributions.slice(0, 3).map((c, j) => (
                                                <li key={j}><span className="pf-case__check" aria-hidden="true">{CHECK}</span>{c}</li>
                                            ))}
                                        </ul>
                                        <div className="pf-case__tags d-flex flex-wrap gap-2 mt-20">
                                            {p.tags.map((t) => <span key={t} className="pf-chip">{t}</span>)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
