import { EDUCATION, CERTIFICATIONS } from "@/shared/portfolio/portfolioData";

export default function Credentials() {
    return (
        <section id="credentials" className="pf-cred bg-neutral-50 overflow-hidden pt-120 pb-120">
            <div className="container-2200 px-3 px-lg-4">
                <div className="row g-4 g-lg-5">
                    <div className="col-lg-5">
                        <span className="pf-eyebrow"><span className="pf-eyebrow__dot" aria-hidden="true" />Education</span>
                        <h2 className="pf-section-title fz-60 fw-600 lh-1 mt-20 mb-40">
                            Grounded in maths, business &amp; data.
                        </h2>
                        <ul className="list-unstyled d-flex flex-column gap-3 m-0">
                            {EDUCATION.map((e) => (
                                <li key={e.title} className="pf-cred__edu">
                                    <div className="d-flex align-items-baseline justify-content-between gap-2">
                                        <h3 className="pf-cred__edu-title mb-0">{e.title}</h3>
                                        <span className="pf-cred__year">{e.year}</span>
                                    </div>
                                    <p className="pf-cred__edu-org mb-0">{e.org}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="col-lg-7">
                        <p className="pf-cred__label mb-20">Certifications &amp; training</p>
                        <div className="row g-3">
                            {CERTIFICATIONS.map((c) => (
                                <div key={c.title} className="col-sm-6">
                                    <div className="pf-cert at_fade_anim" data-fade-from="bottom">
                                        <div className="d-flex align-items-baseline justify-content-between gap-2">
                                            <h3 className="pf-cert__title mb-0">{c.title}</h3>
                                            <span className="pf-cred__year">{c.year}</span>
                                        </div>
                                        <p className="pf-cert__org mb-0">{c.org}</p>
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
