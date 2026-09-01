import { PROFILE } from "@/shared/portfolio/portfolioData";

const PRINCIPLES = [
    { title: "Start with the user", body: "Research and behaviour data lead the decision, not opinion. I map the journey before I open Figma." },
    { title: "Design for feasibility", body: "I design knowing how it gets built. Front-end skills mean fewer surprises and a tighter design-to-code loop." },
    { title: "Systems over screens", body: "Reusable components and clear tokens keep a product coherent as it grows — and speed everyone up." },
    { title: "Ship, then measure", body: "A design isn't done at handoff. Analytics tell me what worked, and that feeds the next iteration." },
];

export default function About() {
    return (
        <section id="about" className="pf-about bg-neutral-0 overflow-hidden pt-120 pb-120">
            <div className="container-2200 px-3 px-lg-4">
                <div className="row g-5">
                    <div className="col-lg-5">
                        <span className="pf-eyebrow"><span className="pf-eyebrow__dot" aria-hidden="true" />About</span>
                        <h2 className="pf-section-title fz-60 fw-600 lh-1 mt-20 mb-0 at_fade_anim" data-fade-from="bottom">
                            A designer who thinks in products, not just pixels.
                        </h2>
                        <div className="pf-about__card mt-40">
                            <span className="pf-about__mono" aria-hidden="true">{PROFILE.monogram}</span>
                            <div>
                                <p className="pf-about__name mb-0">{PROFILE.name}</p>
                                <p className="pf-about__meta mb-0">{PROFILE.role} · {PROFILE.location}</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-7">
                        <p className="pf-about__lead fz-font-lg mb-30 at_fade_anim" data-fade-from="bottom">
                            I've led design for SaaS platforms, enterprise internal tools and consumer health products — using
                            analytics and user behaviour to inform decisions and measure their impact. I'm happiest turning
                            complex workflows into simple, accessible experiences that serve both the user and the business.
                        </p>
                        <div className="row g-4">
                            {PRINCIPLES.map((p, i) => (
                                <div key={p.title} className="col-sm-6">
                                    <div className="pf-principle at_fade_anim" data-fade-from="bottom" data-delay={`${0.1 + i * 0.06}`}>
                                        <span className="pf-principle__no">{String(i + 1).padStart(2, "0")}</span>
                                        <h3 className="pf-principle__title">{p.title}</h3>
                                        <p className="pf-principle__body mb-0">{p.body}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
