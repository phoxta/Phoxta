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
        title: "Acquisition & Launch",
        description:
            "How to acquire a business, deploy your infrastructure, and go live.",
        accordionId: "accordionFaq1",
        items: [
            {
                id: "collapseFaq1-1",
                num: "1",
                question: "What is Phoxta?",
                answer:
                    "Phoxta is an M&A platform for high-margin, agentic businesses. We provide validated business blueprints that include autonomous infrastructure, unified commerce operations, and specialized AI models, allowing you to acquire and launch a revenue-ready business in minutes.",
                open: true,
            },
            {
                id: "collapseFaq1-2",
                num: "2",
                question: "Do I need technical expertise to operate these businesses?",
                answer:
                    "No. Phoxta businesses are engineered for autonomous operation. Your agentic console handles the technical complexity of CRM, commerce, and multi-channel communication, while you focus on high-level strategic growth.",
                open: false,
            },
            {
                id: "collapseFaq1-3",
                num: "3",
                question: "What exactly is included in an acquisition?",
                answer:
                    "Each acquisition includes a production-ready storefront, a comprehensive Agentic Operating Console, a specialized AI Agent (Email, Voice, SMS, WhatsApp), and a vertical-specific industry dossier for strategic intelligence.",
                open: false,
            },
            {
                id: "collapseFaq1-4",
                num: "4",
                question: "How quickly can I deploy and scale?",
                answer:
                    "Deployment is near-instant. Once you select a blueprint and finalize your brand configuration, your entire autonomous infrastructure is provisioned and ready for traffic immediately.",
                open: false,
            },
        ],
    },
    {
        number: "02",
        title: (
            <>
                Agentic Operations <br />
                &amp; Governance
            </>
        ),
        description:
            "How your autonomous agents manage workflows and business logic.",
        accordionId: "accordionFaq2",
        items: [
            {
                id: "collapseFaq2-1",
                num: "1",
                question: "What capabilities does the AI Operator have?",
                answer:
                    "The AI Operator is a production-grade agent that handles lead acquisition, appointment orchestration, order fulfillment, and omnichannel support. It uses Context-Aware RAG and long-term memory to maintain deep customer relationships.",
                open: true,
            },
                        {
                id: "collapseFaq2-2",
                num: "2",
                question: "How is AI governance handled?",
                answer:
                    "We use an Enterprise AI Governance model. You control every action via 'Human-in-the-Loop' (HITL) approvals. You can set granular policies for your agent—choosing which tasks are autonomous, which require your sign-off, and which are restricted.",
                open: false,
            },
            {
                id: "collapseFaq2-3",
                num: "3",
                question: "Can the agent manage complex commerce tasks?",
                answer:
                    "Yes. The agent is integrated into your business logic, allowing it to issue refunds, update inventory, manage reservations, and schedule social content—all while maintaining a full audit trail.",
                open: false,
            },
            {
                id: "collapseFaq2-4",
                num: "4",
                question: "Is the intelligence truly omnichannel?",
                answer:
                    "Absolutely. Your business uses 'One Brain' across Email, SMS, WhatsApp, and Voice. Memory and context are shared across all touchpoints, ensuring a seamless experience for your customers regardless of the channel.",
                open: false,
            },
        ],
    },
    {
        number: "03",
        title: "Scale & Strategic Growth",
        description:
            "Managing portfolios, custom domains, and industry-specific tools.",
        accordionId: "accordionFaq3",
        items: [
            {
                id: "collapseFaq3-1",
                num: "1",
                question: "Can I manage multiple businesses from one console?",
                answer:
                    "Yes. Phoxta is designed for portfolio operators. You can acquire multiple high-margin businesses and manage them through a single unified console, sharing operations while maintaining distinct brand identities and domains.",
                open: true,
            },
            {
                id: "collapseFaq3-2",
                num: "2",
                question: "How do custom domains and SEO work?",
                answer:
                    "Every storefront is optimized for both human and AI search (LLM-ready). You can link your own custom domains with automated TLS/SSL provisioning via our Vercel-backed infrastructure.",
                open: false,
            },
            {
                id: "collapseFaq3-3",
                num: "3",
                question: "What is the 'Business Dossier'?",
                answer:
                    "The Dossier is an industry-specific intelligence report included with every blueprint. It covers market strategy, competitive analysis, and operational procedures, providing the strategic roadmap you need to scale.",
                open: false,
            },
            {
                id: "collapseFaq3-4",
                num: "4",
                question: "Is the platform LLM-optimized?",
                answer:
                    "Yes. Our frontend and content structures are designed for 'AI Search Optimization' (ASO), ensuring your business is correctly interpreted and recommended by AI-driven search engines and answer bots.",
                open: false,
            },
        ],
    },
    {
        number: "04",
        title: (
            <>
                Investment, Billing <br />
                &amp; Data Privacy
            </>
        ),
        description:
            "Pricing models, asset ownership, and security standards.",
        accordionId: "accordionFaq4",
        items: [
            {
                id: "collapseFaq4-1",
                num: "1",
                question: "What is the investment model?",
                answer:
                    "Acquisition involves a one-time asset price for the business blueprint and a monthly subscription—Starter, Growth, or Scale—for the ongoing autonomous infrastructure and agent operations.",
                open: true,
            },
            {
                id: "collapseFaq4-2",
                num: "2",
                question: "Who owns the data and the customer records?",
                answer:
                    "You do. You have full ownership of your CRM, order history, and content. Data is isolated per tenant using enterprise-grade RLS (Row-Level Security) on our Supabase-backed infrastructure.",
                open: false,
            },
            {
                id: "collapseFaq4-3",
                num: "3",
                question: "What happens to the business if I pause my subscription?",
                answer:
                    "Your business data remains yours. The autonomous infrastructure pauses, but all records are preserved. You can re-activate or export your business assets at any time.",
                open: false,
            },
            {
                id: "collapseFaq4-4",
                num: "4",
                question: "What level of security is provided?",
                answer:
                    "We employ production-grade security, including encrypted OAuth for Google Workspace, isolated database tenancy, and comprehensive audit logs for all AI and human actions.",
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
