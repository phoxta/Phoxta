import { Link } from "react-router-dom";
// Home 4 Section 5 - Awards & Recognitions

const ARROW_RIGHT = (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
            d="M5.00013 13.9999L5 5.00003L7 5L7.0001 11.9999L17.1719 12L13.2222 8.05027L14.6364 6.63606L21.0003 13L14.6364 19.364L13.2222 17.9497L17.1719 14L5.00013 13.9999Z"
            fill="currentColor"
        />
    </svg>
);

const EXTERNAL_LINK_ICON = (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none">
        <path
            d="M10.0208 3.41421L1.41421 12.0208L0 10.6066L8.60659 2H1.02082V0H12.0208V11H10.0208V3.41421Z"
            fill="currentColor"
        />
    </svg>
);

const FEATURES = [
    {
        href: "/dashboard",
        imgSm: "/assets/imgs/pages/img-89-sm.webp",
        title: "Unified Agentic Inbox",
        org: "Omnichannel intelligence across Email, SMS, and Voice touchpoints",
        date: "Communications",
        url: "✔",
    },
    {
        href: "/dashboard",
        imgSm: "/assets/imgs/pages/img-90-sm.webp",
        title: "Autonomous Context Retrieval",
        org: "Dynamic RAG engine with per-customer long-term memory banks",
        date: "Intelligence",
        url: "✔",
    },
    {
        href: "/dashboard",
        imgSm: "/assets/imgs/pages/img-91-sm.webp",
        title: "Goal-Oriented Orchestration",
        org: "Autonomous lifecycle flows for journeys and proactive outreach",
        date: "Automation",
        url: "✔",
    },
    {
        href: "/dashboard",
        imgSm: "/assets/imgs/pages/img-92-sm.webp",
        title: "Enterprise AI Governance",
        org: "Production-grade guardrails with Human-in-the-Loop (HITL) control",
        date: "Governance",
        url: "✔",
    },
    {
        href: "/dashboard",
        imgSm: "/assets/imgs/pages/img-93-sm.webp",
        title: "Full-Stack Customer Ops",
        org: "Unified commerce, payments, and CRM integrated into the AI loop",
        date: "Operations",
        url: "✔",
        isLast: true,
    },
];

export default function Section5() {
    return (
        <div className="container-2200 pt-30 bg-neutral-50">
            <section className="sec-5-home-4">
                <div
                    className="bg-linear-opacity pt-100 pb-100 rounded-5 mx-lg-3 mx-2 bg-cover"
                    data-background="/assets/imgs/pages/ft_img.webp"
                >
                    <div className="container">
                        <div className="row g-4 align-items-end">
                            <div className="col-lg-8 col-md-8">
                                <h2 className="text-white mb-2 lh-1">Phoxta AI Console</h2>
                            </div>
                            <div className="col-lg-3 col-md-4 ms-auto d-flex justify-content-lg-end">
                                <div
                                    className="at-btn-group at-btn-group-transparent at_fade_anim"
                                    data-delay=".5"
                                    data-fade-from="bottom"
                                    data-ease="bounce"
                                >
                                    <Link className="at-btn-circle" to="/auth">
                                        {ARROW_RIGHT}
                                    </Link>
                                    <Link className="at-btn z-index-1" to="/auth">
                                        Get Started
                                    </Link>
                                    <Link className="at-btn-circle" to="/auth">
                                        {ARROW_RIGHT}
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className="row mt-120">
                            <div className="col-12">
                                                                {FEATURES.map((feature, idx) => (
                                                                        <div
                                        key={idx}
                                        className={`card-award scroll-move-up ${feature.isLast ? "mb-0" : ""}`}
                                    >
                                        <Link
                                            to={feature.href}
                                            className="card-award-link"
                                        >
                                            <div className="card-award-content">
                                                <div className="card-award-image position-relative">
                                                    <img
                                                        src={feature.imgSm}
                                                        alt="Feature"
                                                        style={{ objectFit: "cover" }} loading="lazy" />
                                                </div>
                                                <h6 className="card-award-title mb-0 text-white">{feature.title}</h6>
                                            </div>
                                            <h6 className="card-award-web-excellence mb-0 fz-font-lg fw-500 text-white">
                                                {feature.org}
                                            </h6>
                                            <span className="card-award-date text-white">[ {feature.date} ]</span>
                                            <div className="card-award-meta">
                                                <span className="card-award-url fz-font-lg text-white">
                                                    {feature.url}
                                                </span>
                                            </div>
                                            <div className="card-award-icon ms-auto text-white">
                                                {EXTERNAL_LINK_ICON}
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
