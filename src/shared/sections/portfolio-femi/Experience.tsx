import { EXPERIENCE } from "@/shared/portfolio/portfolioData";

export default function Experience() {
    return (
        <section id="experience" className="pf-exp bg-neutral-950 text-white overflow-hidden pt-120 pb-120">
            <div className="container-2200 px-3 px-lg-4">
                <div className="row align-items-end pb-60">
                    <div className="col-lg-8">
                        <span className="pf-eyebrow pf-eyebrow--light"><span className="pf-eyebrow__dot" aria-hidden="true" />Experience</span>
                        <h2 className="pf-section-title fz-60 fw-600 lh-1 mt-20 mb-0 text-white">
                            Seven years, from Lagos to the UK.
                        </h2>
                    </div>
                    <div className="col-lg-4 mt-3 mt-lg-0">
                        <p className="pf-work__note pf-work__note--light mb-0 text-lg-end">
                            Design and engineering across startups, agencies and enterprise.
                        </p>
                    </div>
                </div>

                <ol className="pf-timeline list-unstyled m-0">
                    {EXPERIENCE.map((r) => (
                        <li key={`${r.company}-${r.period}`} className="pf-timeline__item at_fade_anim" data-fade-from="bottom">
                            <span className="pf-timeline__node" aria-hidden="true" />
                            <div className="pf-timeline__head">
                                <h3 className="pf-timeline__title">{r.title}</h3>
                                <span className="pf-timeline__period">{r.period}</span>
                            </div>
                            <p className="pf-timeline__company">{r.company} · {r.location}</p>
                            <p className="pf-timeline__blurb mb-0">{r.blurb}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
