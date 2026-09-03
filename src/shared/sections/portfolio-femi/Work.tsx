import { Link } from "react-router-dom";
import RevealText from "@/shared/effects/RevealText";
import { PROJECTS } from "@/shared/portfolio/portfolioData";
import { findCaseStudy } from "@/shared/portfolio/caseStudies";

// Selected work in the "What we do" format from phoxta.com/marketing
// (sec-4-home-3): a compact pinned numbered nav on the left and a scroll-driven
// stack of screenshot-led cards on the right — one big shot, one line of copy,
// one CTA. Every card links to /work/:slug (a full case study when one exists,
// otherwise a project brief built from the same data).

const ARROW_SVG = (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z" fill="currentColor" />
    </svg>
);
const NAV_ARROW = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M12.1716 8.77806L8.55964e-06 8.77806L1.47897e-06 6.77807L12.1716 6.77807L6.80761 1.41412L8.22183 -9.53337e-05L16 7.77806L8.22181 15.5562L6.80759 14.142L12.1716 8.77806Z" fill="currentColor" />
    </svg>
);

export default function Work() {
    return (
        <section id="work" className="pf-work sec-4-home-3 bg-neutral-0 pt-120 pb-60 overflow-hidden">
            <div className="container-2200 px-3 px-lg-4">
                <div className="row g-4 align-items-end">
                    <div className="col-xxl-10 col-12">
                        <span className="at-btn common-black text-uppercase bg-transparent mb-10 rounded-0 p-0">
                            <span className="text-uppercase">
                                <span className="text-1">Selected work</span>
                                <span className="text-2">Selected work</span>
                            </span>
                            <i>{ARROW_SVG}{ARROW_SVG}</i>
                        </span>
                        <h3 className="reveal-text mb-0">
                            <RevealText>The products I've designed.</RevealText>
                        </h3>
                    </div>
                </div>
            </div>
            <div className="container-2200 px-3 px-lg-4 section-fix pt-60">
                <div className="row g-4">
                    <div className="col-xxl-2 col-lg-3 h-100">
                        <ul className="list-unstyled navigation-sec4home3 navigation-active-item section-title-pin pf-work__nav h-100">
                            {PROJECTS.map((p, idx) => (
                                <li key={p.slug}>
                                    <div className="item">
                                        <div className="content d-flex align-items-center">
                                            <span className="neutral-500">[{String(idx + 1).padStart(2, "0")}]</span>
                                            <h6 className="mb-0">{p.name}</h6>
                                            {NAV_ARROW}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="col-lg-9 offset-xxl-1 p-relative">
                        <div className="scroll-section vertical-section section">
                            <div className="wrapper">
                                <div role="list" className="list">
                                    {PROJECTS.map((p) => {
                                        const href = `/work/${p.slug}`;
                                        const label = findCaseStudy(p.slug) ? "View case study" : "View project";
                                        return (
                                            <div key={p.slug} className="item">
                                                <div className="container bg-neutral-50 rounded-4 pf-work__card">
                                                    <Link to={href} className="pf-work__shot" aria-label={`${label}: ${p.name}`}>
                                                        <img src={p.image} alt={`${p.name} — ${p.kicker}`} width={1600} height={1000} loading="lazy" />
                                                        <span className="pf-work__peek" aria-hidden="true">{label} {NAV_ARROW}</span>
                                                    </Link>
                                                    <div className="pf-work__foot">
                                                        <div className="pf-work__copy">
                                                            <span className="pf-work__kicker d-block">{p.kicker} · {p.period}</span>
                                                            <h4 className="pf-work__name text-scale-anim">
                                                                <Link to={href} className="pf-work__name-link">{p.name}</Link>
                                                            </h4>
                                                            <p className="pf-work__blurb">{p.blurb}</p>
                                                        </div>
                                                        <Link to={href} className="pf-work__cta d-inline-flex align-items-center gap-2 fw-600 text-decoration-none">
                                                            {label} {NAV_ARROW}
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
