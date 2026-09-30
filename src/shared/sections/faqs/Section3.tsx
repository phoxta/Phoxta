import RevealText from "@/shared/effects/RevealText";

// FAQs section 3 - Scroll sections with accordions by topic

const ARROW_SVG = (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z"
            fill="currentColor"
        />
    </svg>
);

type FaqItem = {
    id: string;
    num: string;
    question: string;
    answer: string;
    open: boolean;
};

type FaqSection = {
    number: string;
    title: React.ReactNode;
    description: string;
    accordionId: string;
    items: FaqItem[];
};

export const FAQ_SECTIONS: FaqSection[] = [
    {
        number: "01",
        title: "Choose & Activate",
        description:
            "What you choose, what you tailor and how the work begins.",
        accordionId: "accordionFaq1",
        items: [
            {
                id: "collapseFaq1-1",
                num: "1",
                question: "What is Phoxta?",
                answer:
                    "Phoxta lets you start with an existing business system instead of a blank brief. You can preview the system, choose the package that fits your market, tailor the offer and begin operating it with practical support.",
                open: true,
            },
            {
                id: "collapseFaq1-2",
                num: "2",
                question: "Do I need technical expertise to operate these businesses?",
                answer:
                    "You do not need a software team to assess a package or begin setup. You still need to make the business decisions: who you serve, what you offer, how you price it and how you will learn from customers.",
                open: false,
            },
            {
                id: "collapseFaq1-3",
                num: "3",
                question: "What is included in a business package?",
                answer:
                    "Every package page lists its scope before you choose it. Depending on the package, this can include a storefront, customer and operating workflows, content, templates and configured AI support. Read the package scope as the source of truth.",
                open: false,
            },
            {
                id: "collapseFaq1-4",
                num: "4",
                question: "What happens after I choose a business?",
                answer:
                    "You create an account, select the business and work through the activation steps. The first priorities are your market, offer, brand details, customer journey and operating checks — then you test with real customers before expanding.",
                open: false,
            },
        ],
    },
    {
        number: "02",
        title: (
            <>
                AI Support <br />
                &amp; Control
            </>
        ),
        description:
            "Where AI can help and where human judgement must remain.",
        accordionId: "accordionFaq2",
        items: [
            {
                id: "collapseFaq2-1",
                num: "1",
                question: "What can AI help with?",
                answer:
                    "AI can help draft and organise work, summarise customer information, prepare replies and support repeatable workflows. The useful question is not whether AI can do a task, but whether the task has clear inputs, rules, review and a measurable result.",
                open: true,
            },
                        {
                id: "collapseFaq2-2",
                num: "2",
                question: "Who remains accountable for decisions?",
                answer:
                    "You do. AI can support a decision, but the business owner remains responsible for pricing, customer promises, sensitive information and the rules under which any automated action runs.",
                open: false,
            },
            {
                id: "collapseFaq2-3",
                num: "3",
                question: "Can AI act automatically?",
                answer:
                    "Use automation only for stable, repeated work with clear boundaries. Start by reviewing outputs, define what the system may and may not do, and keep human approval for high-impact customer, financial or legal decisions.",
                open: false,
            },
            {
                id: "collapseFaq2-4",
                num: "4",
                question: "How should I use AI across customer channels?",
                answer:
                    "Connect only the channels your customers actually use. Keep the offer and service standards consistent, make handoffs visible and review customer conversations regularly so automation improves the experience instead of hiding problems.",
                open: false,
            },
        ],
    },
    {
        number: "03",
        title: "Run & Grow",
        description:
            "How to operate one business well, then expand deliberately.",
        accordionId: "accordionFaq3",
        items: [
            {
                id: "collapseFaq3-1",
                num: "1",
                question: "Can I manage multiple businesses from one console?",
                answer:
                    "You can add businesses as your operation grows. Start with one clear customer, offer and operating rhythm; a second business should add a deliberate opportunity, not just another source of work.",
                open: true,
            },
            {
                id: "collapseFaq3-2",
                num: "2",
                question: "When should I set up a custom domain?",
                answer:
                    "Set up a domain once the business name and initial offer are settled. It should point to a clear customer promise, useful pages and a reliable way for interested customers to contact or buy from you.",
                open: false,
            },
            {
                id: "collapseFaq3-3",
                num: "3",
                question: "What is a business system?",
                answer:
                    "A business system is the connected starting point for an offer: the customer journey, operating workflow, content, tools and decisions needed to deliver value. It shortens setup; it does not replace customer validation or sound management.",
                open: false,
            },
            {
                id: "collapseFaq3-4",
                num: "4",
                question: "What should I review every week?",
                answer:
                    "Review customer demand, delivery quality, cash, recurring issues and the experiments you ran. Then choose one next action that improves the offer, customer experience or operating process.",
                open: false,
            },
        ],
    },
    {
        number: "04",
        title: (
            <>
                Pricing, Access <br />
                &amp; Data
            </>
        ),
        description:
            "The practical details to understand before you begin.",
        accordionId: "accordionFaq4",
        items: [
            {
                id: "collapseFaq4-1",
                num: "1",
                question: "How does pricing work?",
                answer:
                    "The business package price and any ongoing Console plan are shown separately. Review the package scope, one-time cost and recurring costs before checkout so you understand what supports the initial setup and ongoing operation.",
                open: true,
            },
            {
                id: "collapseFaq4-2",
                num: "2",
                question: "What should I check before I pay?",
                answer:
                    "Check the customer and market you intend to serve, the exact package scope, the work still required from you, the recurring cost and the customer or operating evidence you will use to judge progress.",
                open: false,
            },
            {
                id: "collapseFaq4-3",
                num: "3",
                question: "How should I handle business and customer data?",
                answer:
                    "Collect only the data your business needs, give access deliberately and keep customer information accurate. Use your account, package terms and applicable privacy obligations as the guide for access, retention and export.",
                open: false,
            },
            {
                id: "collapseFaq4-4",
                num: "4",
                question: "What level of security is provided?",
                answer:
                    "Security also depends on how you operate: use strong account access, limit permissions, protect customer information and review automated workflows. Do not give an AI system more access than the task requires.",
                open: false,
            },
        ],
    },
];

export default function Section3() {
    return (
        <section className="sec-3-faqs p-relative z-n1 pb-100">
            <div className="scroll-section">
                <div className="wrapper">
                    {FAQ_SECTIONS.map((section) => (
                        <div
                            key={section.accordionId}
                            className="item bg-neutral-0 d-block"
                        >
                            <div className="pt-100 border-top-100">
                                <div className="container">
                                    <div className="row g-4">
                                        <div className="col-lg-4 h-100">
                                            <span className="at-btn common-black text-uppercase bg-transparent mb-10 rounded-0 p-0">
                                                <span className="text-uppercase">
                                                    <span className="text-1">
                                                        [ {section.number} ]
                                                    </span>
                                                    <span className="text-2">
                                                        [ {section.number} ]
                                                    </span>
                                                </span>
                                                <i>
                                                    {ARROW_SVG}
                                                    {ARROW_SVG}
                                                </i>
                                            </span>
                                            <h3 className="reveal-text">
                                                <RevealText>{section.title}</RevealText>
                                            </h3>
                                            <h6 className="fw-500 mb-0 fz-font-lg">
                                                {section.description}
                                            </h6>
                                            <div className="section-title-pin"></div>
                                        </div>
                                        <div className="col-lg-7 offset-lg-1 p-relative">
                                            <div
                                                className="accordion p-relative z-index-3"
                                                id={section.accordionId}
                                            >
                                                {section.items.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="at-faq-item bg-neutral-0 border-100 rounded-4"
                                                    >
                                                        <div className="at-faq-header d-flex gap-2">
                                                            <div className="box-number">
                                                                <span className="at-faq-number">
                                                                    {item.num}
                                                                </span>
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
                                                            data-bs-parent={`#${section.accordionId}`}
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
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
