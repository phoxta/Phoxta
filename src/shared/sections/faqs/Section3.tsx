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

const FAQ_SECTIONS: FaqSection[] = [
    {
        number: "01",
        title: "Getting started",
        description:
            "What Phoxta is, what you get, and how quickly you can go live.",
        accordionId: "accordionFaq1",
        items: [
            {
                id: "collapseFaq1-1",
                num: "1",
                question: "What is Phoxta?",
                answer:
                    "Phoxta is a marketplace of validated, AI-powered businesses you can own and run from day one. Pick a business blueprint, make it your own, and launch with a ready storefront, an operating console, and an AI agent that runs the day-to-day.",
                open: true,
            },
            {
                id: "collapseFaq1-2",
                num: "2",
                question: "Do I need technical or business experience?",
                answer:
                    "No. Every business comes ready to operate — the AI agent and console handle customer messages, bookings, orders and follow-ups, and setup is fully guided.",
                open: false,
            },
            {
                id: "collapseFaq1-3",
                num: "3",
                question: "What exactly do I get when I buy a business?",
                answer:
                    "A live storefront on your own domain, an operating console to run it, and a dedicated AI agent that answers calls, chats and bookings across every channel — all pre-wired and ready to brand.",
                open: false,
            },
            {
                id: "collapseFaq1-4",
                num: "4",
                question: "How fast can I go live?",
                answer:
                    "Most owners launch within minutes: pick a blueprint, brand it, and publish on a free Phoxta subdomain. Connect a custom domain whenever you're ready.",
                open: false,
            },
        ],
    },
    {
        number: "02",
        title: (
            <>
                Your AI agent <br />
                &amp; operations
            </>
        ),
        description:
            "How the agent works across channels — and how it acts on your business.",
        accordionId: "accordionFaq2",
        items: [
            {
                id: "collapseFaq2-1",
                num: "1",
                question: "What can the AI agent do?",
                answer:
                    "It answers customers over SMS, WhatsApp, email and voice — booking and rescheduling appointments, capturing leads, taking orders, recommending products, and escalating to you when needed. One agent, every channel.",
                open: true,
            },
            {
                id: "collapseFaq2-2",
                num: "2",
                question: "Can the agent take actions, not just chat?",
                answer:
                    "Yes. With your permission it can update prices, fulfil orders, manage bookings and more — governed by a per-tool policy (off, ask-me, or auto), an approval queue, and a full audit log you control.",
                open: false,
            },
            {
                id: "collapseFaq2-3",
                num: "3",
                question: "Does it work after hours?",
                answer:
                    "Yes — it helps customers 24/7, captures every lead, books when it can, and never sends anyone to voicemail.",
                open: false,
            },
            {
                id: "collapseFaq2-4",
                num: "4",
                question: "Can I control how it sounds and behaves?",
                answer:
                    "Yes. From the console you set its persona, tone, business hours, escalation rules and knowledge, and you can test it live before customers ever reach it.",
                open: false,
            },
        ],
    },
    {
        number: "03",
        title: "Branding & customisation",
        description:
            "Make the business yours — branding, domains, and editable content.",
        accordionId: "accordionFaq3",
        items: [
            {
                id: "collapseFaq3-1",
                num: "1",
                question: "Can I make the business my own?",
                answer:
                    "Completely. Rebrand instantly with your name, logo, colours and fonts — manually or with AI — and edit pages, sections, text and images in the visual Studio editor.",
                open: true,
            },
            {
                id: "collapseFaq3-2",
                num: "2",
                question: "Can I use my own domain?",
                answer:
                    "Yes. Launch on a free Phoxta subdomain, then connect a custom domain you already own — or buy one — from the dashboard in a few clicks.",
                open: false,
            },
            {
                id: "collapseFaq3-3",
                num: "3",
                question: "Can I edit the storefront and products?",
                answer:
                    "Yes — every page, section, product, price and image is editable from the Studio editor and the operating console, and changes go live immediately.",
                open: false,
            },
            {
                id: "collapseFaq3-4",
                num: "4",
                question: "Can I run more than one business?",
                answer:
                    "Yes. You can buy and run multiple businesses from a single account; higher plans include more businesses and capacity.",
                open: false,
            },
        ],
    },
    {
        number: "04",
        title: (
            <>
                Pricing, billing <br />
                &amp; support
            </>
        ),
        description:
            "How pricing works, billing, cancellation, and getting help.",
        accordionId: "accordionFaq4",
        items: [
            {
                id: "collapseFaq4-1",
                num: "1",
                question: "How does pricing work?",
                answer:
                    "A simple monthly subscription per account — Starter, Growth or Scale — plus a one-time price for each business blueprint you buy. See the Pricing page for full details.",
                open: true,
            },
            {
                id: "collapseFaq4-2",
                num: "2",
                question: "Is there a free trial?",
                answer:
                    "No — Phoxta doesn't offer a free trial. Pricing is simple: a monthly plan plus a one-time price per business. You can preview any business live before you buy, and cancel anytime.",
                open: false,
            },
            {
                id: "collapseFaq4-3",
                num: "3",
                question: "What happens to my business if I cancel?",
                answer:
                    "You keep your data and your storefront simply pauses. You can re-activate anytime, and export your customers and content whenever you like.",
                open: false,
            },
            {
                id: "collapseFaq4-4",
                num: "4",
                question: "How do I get help?",
                answer:
                    "Your in-console AI assistant answers most questions instantly, and you can email our team anytime. Growth and Scale plans include priority support.",
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
