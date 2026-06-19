const STEPS = [
    { num: "01", title: "Research", desc: "Audience mapping, mood boards, and competitive landscape — anchoring the brand voice in cultural context.", delay: ".1" },
    { num: "02", title: "Concept", desc: "Logotype experiments, palette exploration, and tone-of-voice principles that define how Nebula speaks.", delay: ".2" },
    { num: "03", title: "Design", desc: "Lookbook layouts, packaging system, and a responsive digital toolkit — every touchpoint dressed for the brand.", delay: ".3" },
    { num: "04", title: "Delivery", desc: "Brand guidelines, asset library, and a clean hand-off to internal teams ready to scale the system.", delay: ".4" },
];

export default function Section4() {
    return (
        <section className="sec-4-portfolio-details-3 overflow-hidden pt-100 pb-100 bg-neutral-950 changeless">
            <div className="container">
                <div className="row mb-30">
                    <div className="col-12">
                        <div className="sec-4-portfolio-details-3__eyebrow d-flex align-items-center gap-2 at_fade_anim" data-fade-from="left" data-delay=".05">
                            <span className="sec-4-portfolio-details-3__plus" aria-hidden="true"></span>
                            <h2 className="h6 fw-600 mb-0 text-white">Process</h2>
                        </div>
                    </div>
                </div>
                <div className="row mb-60">
                    <div className="col-lg-9">
                        <p className="sec-4-portfolio-details-3__title fz-font-3xl fw-500 text-white mb-0 at_fade_anim" data-fade-from="bottom" data-delay=".15">From research to refined identity</p>
                    </div>
                </div>
                <ol className="sec-4-portfolio-details-3__steps list-unstyled mb-0">
                    {STEPS.map((s) => (
                        <li key={s.num} className="sec-4-portfolio-details-3__step at_fade_anim" data-fade-from="bottom" data-delay={s.delay}>
                            <div className="sec-4-portfolio-details-3__marker"><span className="sec-4-portfolio-details-3__dot" aria-hidden="true"></span></div>
                            <span className="sec-4-portfolio-details-3__num d-block fz-font-md neutral-500">{s.num}</span>
                            <h3 className="sec-4-portfolio-details-3__heading h5 fw-600 text-white">{s.title}</h3>
                            <p className="sec-4-portfolio-details-3__desc fz-font-md mb-0">{s.desc}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
