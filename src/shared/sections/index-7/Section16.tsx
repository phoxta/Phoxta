import RevealText from "@/shared/effects/RevealText";

// Home 7 Section 16 (Startup School) — Why it works (value pillars + proof band).
// Replaces the busy staircase intro that used to sit after the hero. Mirrors the
// catalog's eyebrow + RevealText heading + icon-pillar + stats-strip patterns so
// it stays visually consistent while reading cleaner in the sales flow.

const ARROW_SVG = (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z" fill="currentColor" />
    </svg>
);

const ICON_TARGET = (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <circle cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="2" />
        <circle cx="18" cy="18" r="9" stroke="currentColor" strokeWidth="2" />
        <circle cx="18" cy="18" r="3" fill="currentColor" />
    </svg>
);

const ICON_BUILD = (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M18 2 4 10v16l14 8 14-8V10L18 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M4 10l14 8 14-8M18 18v16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
);

const ICON_SPARK = (
    <svg width="34" height="34" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path fillRule="evenodd" clipRule="evenodd" d="M53.5715 0H46.4286V41.3778L17.17 12.1193L12.1193 17.17L41.3778 46.4286H0V53.5715H41.3778L12.1193 82.83L17.17 87.8805L46.4286 58.622V100H53.5715V58.622L82.83 87.8805L87.8805 82.83L58.622 53.5715H100V46.4286H58.622L87.8805 17.17L82.83 12.1193L53.5715 41.3778V0Z" fill="currentColor" />
    </svg>
);

const PILLARS = [
    {
        icon: ICON_TARGET,
        title: "Start where you are",
        desc: "No business idea is required. Start with a problem, an industry, a technology or a question worth investigating.",
    },
    {
        icon: ICON_SPARK,
        title: "Learning must create artifacts",
        desc: "Every module connects a lesson, example, exercise and template to useful work in your live opportunity workspace.",
    },
    {
        icon: ICON_BUILD,
        title: "Learn while doing",
        desc: "Learn opportunity discovery, validation, business design and go-to-market through your own evidence, experiments and decisions.",
    },
];

const STATS = [
    { value: "Customer", label: "the people and problem your business serves" },
    { value: "Offer", label: "the promise, price and reason to choose you" },
    { value: "Operations", label: "the routines that make delivery reliable" },
    { value: "AI", label: "practical support with clear human ownership" },
];

export default function Section16() {
    return (
        <section className="pt-80 pb-120 bg-neutral-0">
            <div className="container">
                <div className="row g-4">
                    {PILLARS.map((pillar) => (
                        <div key={pillar.title} className="col-lg-4">
                            <div className="h-100 pe-lg-4">
                                <div className="mb-4 theme-primary">{pillar.icon}</div>
                                <h4 className="fw-600 mb-2">{pillar.title}</h4>
                                <p className="mb-0 neutral-700">{pillar.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
