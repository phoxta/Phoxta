const STATS = [
    { num: "+240%", label: "Brand engagement", delay: ".15" },
    { num: "12", label: "Collections launched", delay: ".25" },
    { num: "4", label: "International markets", delay: ".35" },
];

export default function Section2() {
    return (
        <section className="sec-2-portfolio-details-3 overflow-hidden pt-100 pb-100">
            <div className="container">
                <div className="row mb-50">
                    <div className="col-12">
                        <div className="sec-2-portfolio-details-3__eyebrow d-flex align-items-center gap-2 at_fade_anim" data-fade-from="left" data-delay=".05">
                            <span className="sec-2-portfolio-details-3__plus" aria-hidden="true"></span>
                            <h2 className="h6 fw-600 mb-0">Introduction</h2>
                        </div>
                    </div>
                </div>
                <div className="row g-4 g-lg-5 align-items-start">
                    <div className="col-lg-4">
                        <h3 className="sec-2-portfolio-details-3__headline fz-font-3xl fw-500 neutral-950 mb-0 at_fade_anim" data-fade-from="bottom" data-delay=".1">A modern fashion identity, built to be felt.</h3>
                    </div>
                    <div className="col-lg-4">
                        <p className="sec-2-portfolio-details-3__paragraph fz-font-md neutral-500 mb-0 at_fade_anim" data-fade-from="bottom" data-delay=".2">Nebula is a comprehensive fashion brand identity project dedicated to sculpting a distinctive, modern, and highly expressive visual language. The system bridges avant-garde artistry with wearable design — a brand built not just to be seen, but to be felt.</p>
                    </div>
                    <div className="col-lg-4">
                        <ul className="sec-2-portfolio-details-3__stats list-unstyled mb-0">
                            {STATS.map((s) => (
                                <li key={s.label} className="sec-2-portfolio-details-3__stat at_fade_anim" data-fade-from="left" data-delay={s.delay}>
                                    <span className="sec-2-portfolio-details-3__stat-number d-block fw-500 neutral-950 lh-1">{s.num}</span>
                                    <span className="sec-2-portfolio-details-3__stat-label d-block fz-font-md neutral-500">{s.label}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
