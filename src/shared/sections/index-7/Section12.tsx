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
    { num: "01", title: "Strategy & business models", desc: "How businesses create and capture value — markets, moats, pricing and the models that win." },
    { num: "02", title: "Marketing & growth", desc: "Find and keep customers: positioning, brand, channels and AI-driven, search-ready marketing." },
    { num: "03", title: "Finance & metrics", desc: "Read the numbers that matter — unit economics, cash flow, fundraising and sharper decisions." },
    { num: "04", title: "Operations & leadership", desc: "Run and scale: process, hiring, management and leading a team of people and AI." },
    { num: "05", title: "AI & frontier tools", desc: "Put AI agents, automation and emerging tech to work — to research, build, sell and operate." },
    { num: "06", title: "Entrepreneurship in practice", desc: "Validate, launch and run a real business, applying every lesson as you go." },
];

export default function Section12() {
    return (
        <section className="pt-120 pb-120 bg-neutral-50">
            <div className="container">
                <div className="row align-items-end mb-50 g-4">
                    <div className="col-lg-7">
                        <span className="at-btn common-black text-uppercase bg-transparent mb-10 rounded-0 p-0">
                            <span className="text-uppercase">
                                <span className="text-1">What you'll learn</span>
                                <span className="text-2">What you'll learn</span>
                            </span>
                            <i>
                                {ARROW_SVG}
                                {ARROW_SVG}
                            </i>
                        </span>
                        <h2 className="reveal-text mb-0">
                            <RevealText>A practical curriculum, built for the AI era</RevealText>
                        </h2>
                    </div>
                    <div className="col-lg-5">
                        <p className="fz-font-lg neutral-700 mb-0">
                            Every topic is a lesson you immediately apply to your own business — so you finish with real
                            progress, not just notes.
                        </p>
                    </div>
                </div>

                <div className="row g-3">
                    {TOPICS.map((topic) => (
                        <div key={topic.num} className="col-lg-4 col-md-6">
                            <div className="h-100 bg-neutral-0 border-100 rounded-4 p-xxl-5 p-4 hover-up">
                                <h6 className="fw-600 neutral-300 mb-3">[{topic.num}]</h6>
                                <h5 className="fw-600 mb-2">{topic.title}</h5>
                                <p className="mb-0 neutral-700">{topic.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
