import { onAnchorClick } from "@/shared/effects/scrollToId";
import RevealText from "@/shared/effects/RevealText";
import { PROFILE } from "@/shared/portfolio/portfolioData";

// Hero built on the phoxta.com/marketing section that follows "Our Solutions"
// (index-3 Section8): a dark two-column block — heading, lede and a button group
// on the left, a framed portrait on the right.

const ARROW_CIRCLE = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="15" viewBox="0 0 16 15" fill="none">
        <path d="M0.0001297 8.99993L0 3.00407e-05L2 0L2.0001 6.99993L12.1719 7.00003L8.22224 3.05027L9.63644 1.63606L16.0003 8.00003L9.63644 14.364L8.22224 12.9497L12.1719 9.00003L0.0001297 8.99993Z" fill="currentColor" />
    </svg>
);

export default function Hero() {
    return (
        <section
            id="top"
            className="home-3-section-8 pf-hero pf-hero--dark bg-cover bg-neutral-900 overflow-hidden pt-150 pb-120"
            data-background="/assets/imgs/pages/bg-img-3.webp"
            style={{ backgroundImage: "url(/assets/imgs/pages/bg-img-3.webp)", backgroundSize: "cover" }}
        >
            <div className="container">
                <div className="row g-4 g-lg-5 align-items-center">
                    <div className="col-lg-7 me-auto">
                        <span className="pf-hero__eyebrow d-inline-flex align-items-center gap-2 mb-20">
                            <span className="pf-hero__dot" aria-hidden="true" />
                            {PROFILE.role} · {PROFILE.location}
                        </span>
                        <h1 className="reveal-text mb-0 text-white pe-lg-4">
                            <RevealText>I design digital products people actually use — and ship them.</RevealText>
                        </h1>
                        <p className="text-white fz-xl py-4" style={{ opacity: 0.85, maxWidth: 560 }}>
                            Product designer with 7+ years taking software from research and wireframes to polished,
                            production-ready interfaces — with hands-on front-end in React, Next.js and TypeScript.
                        </p>
                        <div className="at-btn-group at-btn-group-transparent at_fade_anim" data-delay=".4" data-fade-from="bottom" data-ease="bounce">
                            <a href="#work" onClick={onAnchorClick("work", 88)} className="at-btn-circle">{ARROW_CIRCLE}</a>
                            <a href="#work" onClick={onAnchorClick("work", 88)} className="at-btn z-index-1">View my work</a>
                            <a href={`mailto:${PROFILE.email}`} className="at-btn-circle">{ARROW_CIRCLE}</a>
                        </div>
                    </div>
                    <div className="col-lg-4">
                        <div className="pf-hero__photo p-relative rounded-4 overflow-hidden">
                            <img
                                src={PROFILE.photo}
                                alt={PROFILE.name}
                                width={360}
                                height={432}
                                className="img-cover w-100 h-100"
                                loading="eager"
                            />
                            <span className="pf-hero__badge">
                                <span className="pf-hero__badge-dot" aria-hidden="true" />
                                {PROFILE.availability}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
