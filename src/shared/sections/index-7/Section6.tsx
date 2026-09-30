import RevealText from "@/shared/effects/RevealText";

{/* Home 7 Section 6 (The Process — Growth Engine) */}

const EYEBROW_ARROW_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="13" viewBox="0 0 14 13" fill="none">
        <path d="M11.0037 3.41421L2.39712 12.0208L0.98291 10.6066L9.5895 2H2.00373V0H13.0037V11H11.0037V3.41421Z" fill="currentColor" />
    </svg>
);

const CHIPS = [
    { text: "Name the decision", className: "sec-6-home-7__chip--1", delay: "0.1" },
    { text: "State the assumption", className: "sec-6-home-7__chip--2", delay: "0.2" },
    { text: "Gather evidence", className: "sec-6-home-7__chip--3", delay: "0.3" },
    { text: "Decide and improve", className: "sec-6-home-7__chip--4", delay: "0.4" },
];

const CARDS = [
    {
        num: "[01]",
        title: "Name the decision",
        desc: "Choose one decision that matters now: who to serve, what problem to solve, what to charge or how to deliver.",
        img: "/assets/imgs/pages/home-7/step-1.webp",
        alt: "Naming a business decision",
        delay: "0.1",
    },
    {
        num: "[02]",
        title: "State what must be true",
        desc: "Write the assumption, your confidence in it and the evidence that would confirm it or prove it wrong.",
        img: "/assets/imgs/pages/home-7/step-2.webp",
        alt: "Stating a business assumption",
        delay: "0.3",
    },
    {
        num: "[03]",
        title: "Gather useful evidence",
        desc: "Use customer conversations, observation, a landing page, a manual service or a small offer to learn quickly.",
        img: "/assets/imgs/pages/home-7/step-3.webp",
        alt: "Gathering customer evidence",
        delay: "0.5",
    },
    {
        num: "[04]",
        title: "Decide what to do next",
        desc: "Record what happened, update the venture record and make the next decision with better evidence.",
        img: "/assets/imgs/pages/home-7/step-4.webp",
        alt: "Making the next business decision",
        delay: "0.7",
    },
];

export default function Section6() {
    return (
        <div className="sec-6-home-7 p-relative bg-neutral-0">
            <div className="container-2200 px-lg-5 px-3">
                {/* Header row: eyebrow + big title + description */}
                <div className="sec-6-home-7__header row g-0 pt-100 pb-50">
                    <div className="col-lg-7 col-12">
                        <span className="sec-6-home-7__eyebrow d-inline-flex align-items-center gap-2 mb-3 text-uppercase">
                            <span className="text-scramble" data-scramble-text="How you learn">How you learn</span>
                            {EYEBROW_ARROW_SVG}
                        </span>
                        <h2 className="sec-6-home-7__title mb-0 reveal-text"><RevealText>The practical learning loop</RevealText></h2>
                    </div>
                    <div className="col-lg-5 col-12 mt-4 mt-lg-0 d-flex align-items-end justify-content-lg-end">
                        <p className="sec-6-home-7__desc text-lg-end mb-0 at_fade_anim">
                            Move from an uncertain business question to evidence you can use, without treating a plan as proof.
                        </p>
                    </div>
                </div>

                {/* Waterfall chip labels (staircase pattern) */}
                <div className="sec-6-home-7__chips d-none d-lg-flex flex-column mb-80">
                    {CHIPS.map((chip, i) => (
                        <span
                            key={i}
                            className={`sec-6-home-7__chip ${chip.className} at_fade_anim`}
                            data-fade-offset="100"
                            data-delay={chip.delay}
                        >
                            <span className="sec-6-home-7__chip-text">{chip.text}</span>
                        </span>
                    ))}
                </div>

                {/* 4 process cards */}
                <div className="sec-6-home-7__cards pb-120">
                    {CARDS.map((card, i) => (
                        <div key={i} className="sec-6-home-7__card-wrap at_fade_anim" data-delay={card.delay}>
                            <div className="sec-6-home-7__card">
                                <div className="sec-6-home-7__card-body">
                                    <p className="sec-6-home-7__card-num mb-0">{card.num}</p>
                                    <h3 className="sec-6-home-7__card-title mb-0">{card.title}</h3>
                                    <p className="sec-6-home-7__card-desc mb-0">{card.desc}</p>
                                </div>
                                <div className="sec-6-home-7__card-media">
                                    <img src={card.img} alt={card.alt} width={400} height={280} loading="lazy" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
