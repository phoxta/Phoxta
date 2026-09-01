import { SKILL_GROUPS } from "@/shared/portfolio/portfolioData";

export default function Skills() {
    return (
        <section id="skills" className="pf-skills bg-neutral-0 overflow-hidden pt-120 pb-120">
            <div className="container-2200 px-3 px-lg-4">
                <div className="pb-60">
                    <span className="pf-eyebrow"><span className="pf-eyebrow__dot" aria-hidden="true" />Toolkit</span>
                    <h2 className="pf-section-title fz-60 fw-600 lh-1 mt-20 mb-0">
                        The tools and skills I work with.
                    </h2>
                </div>

                <div className="row g-4 g-lg-5">
                    {SKILL_GROUPS.map((g, i) => (
                        <div key={g.label} className="col-lg-4">
                            <div className="pf-skillcol at_fade_anim" data-fade-from="bottom" data-delay={`${i * 0.08}`}>
                                <p className="pf-skillcol__label">{g.label}</p>
                                <ul className="list-unstyled d-flex flex-wrap gap-2 m-0">
                                    {g.skills.map((s) => <li key={s} className="pf-chip pf-chip--lg">{s}</li>)}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
