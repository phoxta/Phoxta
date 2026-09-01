import { CAPABILITIES } from "@/shared/portfolio/portfolioData";

export default function Capabilities() {
    return (
        <section id="capabilities" className="pf-caps bg-neutral-0 overflow-hidden pt-120 pb-120">
            <div className="container-2200 px-3 px-lg-4">
                <div className="row align-items-end pb-60">
                    <div className="col-lg-8">
                        <span className="pf-eyebrow"><span className="pf-eyebrow__dot" aria-hidden="true" />Capabilities</span>
                        <h2 className="pf-section-title fz-60 fw-600 lh-1 mt-20 mb-0">
                            What I bring to a product team.
                        </h2>
                    </div>
                    <div className="col-lg-4 mt-3 mt-lg-0">
                        <p className="pf-work__note mb-0 text-lg-end">
                            The full arc — research, design, systems and the front-end to build it.
                        </p>
                    </div>
                </div>

                <div className="row g-4">
                    {CAPABILITIES.map((c, i) => (
                        <div key={c.title} className="col-md-6 col-xl-4">
                            <div className="pf-cap at_fade_anim" data-fade-from="bottom" data-delay={`${(i % 3) * 0.08}`}>
                                <span className="pf-cap__no">{String(i + 1).padStart(2, "0")}</span>
                                <h3 className="pf-cap__title">{c.title}</h3>
                                <p className="pf-cap__body">{c.body}</p>
                                <div className="pf-cap__points d-flex flex-wrap gap-2">
                                    {c.points.map((pt) => <span key={pt} className="pf-tagline">{pt}</span>)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
