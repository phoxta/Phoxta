import { useRef } from "react";
import RevealText from "@/shared/effects/RevealText";

// Home 7 Section 12 (Startup School) — What you'll learn / practical syllabus.
// New section; reuses the catalog's eyebrow + RevealText heading + card-grid
// patterns so it stays visually consistent with the rest of the page.

const ARROW_SVG = (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z" fill="currentColor" />
    </svg>
);

const TOPICS = [
    { num: "01", title: "Find an opportunity worth pursuing", desc: "Assess the customer, market, access, economics and downside before committing time and money.", image: "/assets/imgs/pages/startup-school/customer-discovery.png", alt: "Founders listening to a small-business owner during a customer interview", position: "center" },
    { num: "02", title: "Understand customers and markets", desc: "Turn assumptions into customer interviews, observations and small tests that can change your next move.", image: "/assets/imgs/pages/startup-school/market-research.png", alt: "Founder observing customer behaviour while taking market-research notes", position: "center" },
    { num: "03", title: "Design an offer people can choose", desc: "Define the problem, promise, price, cost and evidence required to make an offer credible.", image: "/assets/imgs/pages/startup-school/offer-economics.png", alt: "Founders reviewing product samples, costs and an offer", position: "center" },
    { num: "04", title: "Plan the business and operations", desc: "Build the simple routines for selling, delivery, cash, decisions and customer follow-through.", image: "/assets/imgs/pages/startup-school/operations-planning.png", alt: "Small-business team planning customer-order fulfilment", position: "center" },
    { num: "05", title: "Launch, measure and improve", desc: "Run a focused test, understand the result and improve the offer or operation from evidence.", image: "/assets/imgs/pages/startup-school/early-launch.png", alt: "Founder introducing a new product to an early customer", position: "center" },
    { num: "06", title: "Use AI in the right places", desc: "Apply AI to research, drafts and routine work while keeping important decisions in human hands.", image: "/assets/imgs/pages/startup-school/ai-operations.png", alt: "Business owners reviewing a digital workflow together", position: "75% center" },
];

const CARD_ARROW = (
    <svg viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M1 12h43M33 2l10 10-10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default function Section12() {
    const railRef = useRef<HTMLDivElement>(null);
    const moveRail = (direction: "previous" | "next") => {
        const rail = railRef.current;
        if (!rail) return;
        rail.scrollBy({ left: (direction === "next" ? 1 : -1) * Math.min(rail.clientWidth * 0.78, 560), behavior: "smooth" });
    };

    return (
        <section className="ss-curriculum pt-120 pb-120 bg-neutral-50">
            <div className="container">
                <div className="row align-items-end mb-50 g-4">
                    <div className="col-lg-7">
                        <span className="at-btn common-black text-uppercase bg-transparent mb-10 rounded-0 p-0">
                            <span className="text-uppercase">
                                <span className="text-1">The curriculum</span>
                                <span className="text-2">The curriculum</span>
                            </span>
                            <i>
                                {ARROW_SVG}
                                {ARROW_SVG}
                            </i>
                        </span>
                        <h2 className="reveal-text mb-0">
                            <RevealText>From first idea to a business you can operate</RevealText>
                        </h2>
                    </div>
                    <div className="col-lg-5">
                        <p className="fz-font-lg neutral-700 mb-0">
                            The curriculum builds the core business skills in a useful order. Every course gives you something to apply to your own venture or Phoxta business.
                        </p>
                    </div>
                </div>

                <div className="ss-curriculum__controls d-flex justify-content-end gap-2 mb-20" aria-label="Curriculum carousel controls">
                    <button type="button" className="ss-curriculum__control ss-curriculum__control--previous" onClick={() => moveRail("previous")} aria-label="Show previous curriculum cards">{CARD_ARROW}</button>
                    <button type="button" className="ss-curriculum__control" onClick={() => moveRail("next")} aria-label="Show next curriculum cards">{CARD_ARROW}</button>
                </div>

                <div ref={railRef} className="ss-curriculum__rail" role="region" aria-label="Startup School curriculum" tabIndex={0}>
                    {TOPICS.map((topic) => (
                        <article key={topic.num} className="ss-curriculum__card">
                            <img className="ss-curriculum__image" src={topic.image} alt={topic.alt} style={{ objectPosition: topic.position }} loading="lazy" />
                            <div className="ss-curriculum__scrim" aria-hidden="true" />
                            <div className="ss-curriculum__top">
                                <span>[ {topic.num} ]</span>
                                <span>PHOXTA / STARTUP SCHOOL</span>
                            </div>
                            <div className="ss-curriculum__copy">
                                <h3>{topic.title}</h3>
                                <p>{topic.desc}</p>
                            </div>
                            <div className="ss-curriculum__arrow" aria-hidden="true">{CARD_ARROW}</div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
