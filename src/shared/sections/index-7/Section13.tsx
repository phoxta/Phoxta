import RevealText from "@/shared/effects/RevealText";

// Home 7 Section 13 (Startup School) — Who it's for / audience grid.
// New section; mirrors the eyebrow + RevealText + card-grid pattern used across
// the catalog so it stays consistent with the page.

const ARROW_SVG = (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z" fill="currentColor" />
    </svg>
);

const STAR_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 100 100" fill="none">
        <path fillRule="evenodd" clipRule="evenodd" d="M53.5715 0H46.4286V41.3778L17.17 12.1193L12.1193 17.17L41.3778 46.4286H0V53.5715H41.3778L12.1193 82.83L17.17 87.8805L46.4286 58.622V100H53.5715V58.622L82.83 87.8805L87.8805 82.83L58.622 53.5715H100V46.4286H58.622L87.8805 17.17L82.83 12.1193L53.5715 41.3778V0Z" fill="currentColor" />
    </svg>
);

const AUDIENCE = [
    { title: "First-time founders", desc: "You have an idea — or just the ambition — and want a clear, practical path to start." },
    { title: "Side-project builders", desc: "Turn that weekend project into a real, revenue-generating business." },
    { title: "Students & new grads", desc: "Learn how startups actually work before you graduate or take the leap." },
    { title: "Career changers", desc: "Swap the 9-to-5 for building something of your own, with guidance at every step." },
];

export default function Section13() {
    return (
        <section className="pt-120 pb-120 bg-neutral-0">
            <div className="container">
                <div className="row align-items-end mb-50 g-4">
                    <div className="col-lg-7">
                        <span className="at-btn common-black text-uppercase bg-transparent mb-10 rounded-0 p-0">
                            <span className="text-uppercase">
                                <span className="text-1">Who it's for</span>
                                <span className="text-2">Who it's for</span>
                            </span>
                            <i>
                                {ARROW_SVG}
                                {ARROW_SVG}
                            </i>
                        </span>
                        <h2 className="reveal-text mb-0">
                            <RevealText>Built for anyone ready to start something</RevealText>
                        </h2>
                    </div>
                    <div className="col-lg-5">
                        <p className="fz-font-lg neutral-700 mb-0">
                            No experience or technical background required — just the drive to build. We meet you wherever
                            you are.
                        </p>
                    </div>
                </div>

                <div className="row g-3">
                    {AUDIENCE.map((item) => (
                        <div key={item.title} className="col-lg-3 col-md-6">
                            <div className="h-100 bg-neutral-50 border-100 rounded-4 p-xxl-5 p-4 hover-up">
                                <div className="mb-4 theme-primary">{STAR_SVG}</div>
                                <h5 className="fw-600 mb-2">{item.title}</h5>
                                <p className="mb-0 neutral-700">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
