import { SCHOOL_MODULES } from "@/lib/opportunities/school";
import { useRef } from "react";
import RevealText from "@/shared/effects/RevealText";

const THEMES = ['warm', 'light', 'blue', 'ember', 'sunrise', 'midnight'];
const CARDS = SCHOOL_MODULES.map((module, index) => ({
    number: String(index + 1).padStart(2, '0'), title: module.title,
    description: `${module.outcome} Create: ${module.artifact}.`,
    theme: THEMES[index % THEMES.length],
}));

const ARROW = (
    <svg viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M1 12h43M33 2l10 10-10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default function LearningCards() {
    const railRef = useRef<HTMLDivElement>(null);

    const moveRail = (direction: "previous" | "next") => {
        const rail = railRef.current;
        if (!rail) return;

        rail.scrollBy({
            left: (direction === "next" ? 1 : -1) * Math.min(rail.clientWidth * 0.78, 560),
            behavior: "smooth",
        });
    };

    return (
        <section id="curriculum" className="ss-learning-cards py-120 pt-120 bg-neutral-0 overflow-hidden" aria-labelledby="learning-cards-title">
            <div className="container">
                <div className="row align-items-end g-4 mb-50">
                    <div className="col-lg-7">
                        <h2 id="learning-cards-title" className="reveal-text mb-0">
                            <RevealText>Learn by building something real.</RevealText>
                        </h2>
                    </div>
                    <div className="col-lg-5">
                        <p className="fz-font-lg neutral-700 mb-0">
                            Twelve modules connect a short lesson, example, exercise and reusable template to an artifact in your live workspace.
                        </p>
                    </div>
                </div>

                <div className="ss-learning-cards__controls d-flex justify-content-end gap-2 mb-20" aria-label="Carousel controls">
                    <button type="button" className="ss-learning-cards__control ss-learning-cards__control--previous" onClick={() => moveRail("previous")} aria-label="Show previous course cards">
                        {ARROW}
                    </button>
                    <button type="button" className="ss-learning-cards__control" onClick={() => moveRail("next")} aria-label="Show next course cards">
                        {ARROW}
                    </button>
                </div>

                <div ref={railRef} className="ss-learning-cards__rail" role="region" aria-label="Startup School learning cards" tabIndex={0}>
                    {CARDS.map((card) => (
                        <article key={card.number} className={`ss-learning-cards__card ss-learning-cards__card--${card.theme}`}>
                            <div className="ss-learning-cards__card-top">
                                <span>[ {card.number} ]</span>
                                <span>PHOXTA / STARTUP SCHOOL</span>
                            </div>
                            <div className="ss-learning-cards__card-copy">
                                <h3>{card.title}</h3>
                                <p>{card.description}</p>
                            </div>
                            <div className="ss-learning-cards__card-bottom" aria-hidden="true">{ARROW}</div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
