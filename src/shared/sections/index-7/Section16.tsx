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
        title: "Real business fundamentals",
        desc: "Strategy, finance, marketing, operations and leadership — the skills an MBA teaches, made practical and current.",
    },
    {
        icon: ICON_SPARK,
        title: "Built for the AI era",
        desc: "AI agents, automation and frontier tools are core to the curriculum — learn to operate the way the best modern businesses do.",
    },
    {
        icon: ICON_BUILD,
        title: "Learn by doing",
        desc: "Apply every lesson to a real business you build and run, with a cohort and mentors keeping you accountable.",
    },
];

const STATS = [
    { value: "12 wk", label: "Cohort program, end to end" },
    { value: "~90%", label: "Finish the cohort" },
    { value: "50k+", label: "Learners in the community" },
    { value: "$0", label: "To get started" },
];

export default function Section16() {
    return (
        <section className="pt-120 pb-120 bg-neutral-0">
            <div className="container">
                <div className="row align-items-end mb-60 g-4">
                    <div className="col-lg-7">
                        <span className="at-btn common-black text-uppercase bg-transparent mb-10 rounded-0 p-0">
                            <span className="text-uppercase">
                                <span className="text-1">Why it works</span>
                                <span className="text-2">Why it works</span>
                            </span>
                            <i>
                                {ARROW_SVG}
                                {ARROW_SVG}
                            </i>
                        </span>
                        <h2 className="reveal-text mb-0">
                            <RevealText>Built around real practice</RevealText>
                        </h2>
                    </div>
                    <div className="col-lg-5">
                        <p className="fz-font-lg neutral-700 mb-0">
                            You don&rsquo;t just study business — you practice it. Every lesson is applied to a real
                            business you build and run, with a cohort and mentors alongside you.
                        </p>
                    </div>
                </div>

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

                <div className="row g-4 pt-60 mt-40 border-top-100">
                    {STATS.map((stat) => (
                        <div key={stat.label} className="col-lg-3 col-6">
                            <div className="fz-font-3xl fw-700 mb-1 lh-1">{stat.value}</div>
                            <p className="neutral-700 mb-0 fz-font-md">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
