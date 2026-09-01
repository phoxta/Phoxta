import { onAnchorClick } from "@/shared/effects/scrollToId";
import { PROFILE, STATS } from "@/shared/portfolio/portfolioData";

const ARROW_SVG = (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z" fill="currentColor" />
    </svg>
);

export default function Hero() {
    return (
        <section id="top" className="pf-hero bg-neutral-0 overflow-hidden pt-150 pb-120">
            <div className="container-2200 px-3 px-lg-4">
                <div className="row align-items-center g-5">
                    <div className="col-lg-7">
                        <span className="pf-eyebrow at_fade_anim" data-fade-from="bottom" data-delay=".05">
                            <span className="pf-eyebrow__dot" aria-hidden="true" />
                            {PROFILE.role} · {PROFILE.location.split(",")[0]}
                        </span>
                        <h1 className="pf-hero__title fz-ds-1 fw-600 lh-1 mt-30 mb-0 at_fade_anim" data-fade-from="bottom" data-delay=".15">
                            I design digital products people actually use — <span className="pf-accent-word">and ship them.</span>
                        </h1>
                        <p className="pf-hero__lede fz-font-lg mt-40 mb-0 at_fade_anim" data-fade-from="bottom" data-delay=".25">
                            {PROFILE.lede}
                        </p>
                        <div className="d-flex flex-wrap align-items-center gap-3 mt-40 at_fade_anim" data-fade-from="bottom" data-delay=".35">
                            <a href="#work" onClick={onAnchorClick("work", 88)} className="pf-btn pf-btn--dark">
                                <span><span className="text-1">View selected work</span><span className="text-2">View selected work</span></span>
                                <i>{ARROW_SVG}{ARROW_SVG}</i>
                            </a>
                            <a href={`mailto:${PROFILE.email}`} className="pf-btn pf-btn--ghost">
                                <span><span className="text-1">Get in touch</span><span className="text-2">Get in touch</span></span>
                            </a>
                        </div>
                    </div>

                    <div className="col-lg-5">
                        <div className="pf-now at_fade_anim" data-fade-from="bottom" data-delay=".3">
                            <div className="pf-now__status">
                                <span className="pf-now__pulse" aria-hidden="true" />
                                {PROFILE.availability}
                            </div>
                            <p className="pf-now__label">Currently</p>
                            <p className="pf-now__role">Founder &amp; Lead Product Designer</p>
                            <p className="pf-now__at">at Phoxta — an AI operations platform</p>
                            <div className="pf-now__disc">{PROFILE.disciplines}</div>
                        </div>
                    </div>
                </div>

                <div className="pf-hero__stats row g-3 mt-60">
                    {STATS.map((s, i) => (
                        <div key={s.label} className="col-6 col-lg-3">
                            <div className="pf-stat at_fade_anim" data-fade-from="bottom" data-delay={`${0.1 + i * 0.08}`}>
                                <span className="pf-stat__value">{s.value}</span>
                                <span className="pf-stat__label">{s.label}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
