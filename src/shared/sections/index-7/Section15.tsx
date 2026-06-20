import RevealText from "@/shared/effects/RevealText";

// Home 7 Section 15 (Startup School) — FAQ.
// Mirrors the catalog FAQ pattern (about-3/Section7): at-faq accordion with
// numbered items, so the markup and styling match the design system.

const ARROW_SVG = (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z" fill="currentColor" />
    </svg>
);

const FAQ_ITEMS = [
    {
        id: "ssFaqOne",
        num: "1",
        question: "Do I need an idea to start?",
        answer: "No. Many students arrive with just curiosity or ambition. The first part of the program helps you find and validate an idea worth building.",
        open: true,
    },
    {
        id: "ssFaqTwo",
        num: "2",
        question: "Is it cohort-based or self-paced?",
        answer: "Both. You join a cohort for accountability, live classes and community, while an AI guide paces each lesson around your schedule — the structure of a cohort with the flexibility of self-paced.",
        open: false,
    },
    {
        id: "ssFaqThree",
        num: "3",
        question: "How much time does it take?",
        answer: "Plan for a few hours a week over a six-week cohort. The AI guide adapts to your pace, so you stay on track without it taking over your life.",
        open: false,
    },
    {
        id: "ssFaqFour",
        num: "4",
        question: "Is it really free to start?",
        answer: "Yes. You can join for free and access the core curriculum and community. Optional live cohorts and 1:1 mentor sessions are available as you progress.",
        open: false,
    },
    {
        id: "ssFaqFive",
        num: "5",
        question: "Do I need to know how to code?",
        answer: "Not at all. You'll learn to build and launch with no-code tools, and bring in technical help only when you actually need it.",
        open: false,
    },
    {
        id: "ssFaqSix",
        num: "6",
        question: "What do I get at the end?",
        answer: "A real, running business that you own, the skills to grow it, a certificate of completion, and a global network of fellow founders.",
        open: false,
    },
];

export default function Section15() {
    return (
        <section className="sec-7-about py-5 overflow-hidden bg-neutral-0">
            <div className="container py-5">
                <div className="row g-5">
                    <div className="col-lg-4">
                        <span className="at-btn common-black text-uppercase bg-transparent mb-10 rounded-0 p-0">
                            <span className="text-uppercase">
                                <span className="text-1">FAQ</span>
                                <span className="text-2">FAQ</span>
                            </span>
                            <i>
                                {ARROW_SVG}
                                {ARROW_SVG}
                            </i>
                        </span>
                        <h3 className="section-title lh-1 reveal-text">
                            <RevealText>
                                Frequently <br />Asked Questions
                            </RevealText>
                        </h3>
                        <h6 className="fz-font-lg fw-500">
                            Everything you need to know <br className="d-none d-xxl-block" />before you enroll.
                        </h6>
                    </div>
                    <div className="col-lg-7 ms-lg-auto">
                        <div className="accordion pt-80" id="accordionStartupSchoolFaq">
                            {FAQ_ITEMS.map((item) => (
                                <div
                                    key={item.id}
                                    className="at-faq-item bg-neutral-0 border-100 scroll-move-up rounded-4"
                                >
                                    <div className="at-faq-header d-flex gap-2">
                                        <div className="box-number">
                                            <span className="at-faq-number">{item.num}</span>
                                        </div>
                                        <button
                                            className={`at-faq-button${item.open ? "" : " collapsed"}`}
                                            type="button"
                                            data-bs-toggle="collapse"
                                            data-bs-target={`#${item.id}`}
                                            aria-expanded={item.open}
                                            aria-controls={item.id}
                                        >
                                            {item.question}
                                        </button>
                                    </div>
                                    <div
                                        id={item.id}
                                        className={`at-faq-collapse collapse${item.open ? " show" : ""}`}
                                        data-bs-parent="#accordionStartupSchoolFaq"
                                    >
                                        <div className="at-faq-body">
                                            <p>{item.answer}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
