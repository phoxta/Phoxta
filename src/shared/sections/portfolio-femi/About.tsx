const PRINCIPLES = [
    { title: "Team leadership", body: "At Artstanding, I led design and engineering teams, aligned delivery with client goals, and established review processes and quality standards." },
    { title: "Research into decisions", body: "At Healthtracka, I worked with product and marketing on interviews, surveys and competitor analysis, then prototyped and tested the resulting flows." },
];

export default function About() {
    return (
        <section id="about" className="pf-about bg-neutral-0 overflow-hidden pt-120 pb-120">
            <div className="container-2200 px-3 px-lg-4">
                <div className="row g-4 g-lg-5">
                    <div className="col-lg-5">
                        <span className="pf-eyebrow"><span className="pf-eyebrow__dot" aria-hidden="true" />About</span>
                        <h2 className="pf-section-title fz-60 fw-600 lh-1 mt-20 mb-0 at_fade_anim" data-fade-from="bottom">
                            A designer who connects people, systems and delivery.
                        </h2>
                    </div>
                    <div className="col-lg-7">
                        <p className="pf-about__lead fz-font-lg mb-30 at_fade_anim" data-fade-from="bottom">
                            I'm Femi, a UK-based product designer with 7+ years across enterprise, healthcare and SaaS.
                            At Phoxta, I own product design from direction to delivery. At Artstanding, I led multidisciplinary
                            teams and established review processes and quality standards. My background in mathematics,
                            business analytics and front-end development helps me connect user needs with business and technical constraints.
                        </p>
                        <a className="pf2-text-link" href="/assets/docs/femi-adeyemi-resume.pdf" download>Download résumé (PDF) ↓</a>
                        <p className="pf2-about-training">MSc International Business with Data Analytics, Ulster University · BSc Mathematics, University of Ibadan. Training in design thinking, human–computer interaction and applied AI.</p>
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
