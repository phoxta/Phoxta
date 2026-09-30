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

const AWARDS = [
    {
        href: "https://www.phoxta.com",
        imgSm: "/assets/imgs/pages/img-89-sm.webp",
        imgAward: "/assets/imgs/pages/img-89.webp",
        title: "Clear scope",
        org: "A named workflow, owner and success measure before delivery begins",
        date: "01",
        url: "phoxta.com",
    },
    {
        href: "https://www.phoxta.com",
        imgSm: "/assets/imgs/pages/img-90-sm.webp",
        imgAward: "/assets/imgs/pages/img-90.webp",
        title: "Useful evaluation",
        org: "Representative cases and regular quality checks that match the work",
        date: "02",
        url: "phoxta.com",
    },
    {
        href: "https://www.phoxta.com",
        imgSm: "/assets/imgs/pages/img-91-sm.webp",
        imgAward: "/assets/imgs/pages/img-91.webp",
        title: "Data boundaries",
        org: "Approved information, access choices and handling expectations agreed up front",
        date: "03",
        url: "phoxta.com",
    },
    {
        href: "https://www.phoxta.com",
        imgSm: "/assets/imgs/pages/img-92-sm.webp",
        imgAward: "/assets/imgs/pages/img-92.webp",
        title: "Human fallback",
        org: "Clear escalation when confidence is low or the consequence is high",
        date: "04",
        url: "phoxta.com",
    },
    {
        href: "https://www.phoxta.com",
        imgSm: "/assets/imgs/pages/img-93-sm.webp",
        imgAward: "/assets/imgs/pages/img-93.webp",
        title: "Operational ownership",
        org: "People and routines that keep the knowledge and workflow current",
        date: "05",
        url: "phoxta.com",
        isLast: true,
    },
];

export default function Section5() {
    return (
        <div className="container-2200 pt-30 bg-neutral-50">
            <section className="sec-5-home-4">
                <div
                    className="bg-linear-opacity pt-100 pb-100 rounded-5 mx-lg-3 mx-2 bg-cover"
                    data-background="/assets/imgs/pages/bg-img-5.webp"
                >
                    <div className="container">
                        <div className="row g-4 align-items-end">
                            <div className="col-lg-8 col-md-8">
                                <h2 className="text-white mb-2 lh-1">A disciplined way to build AI</h2>
                                <h6 className="text-white mb-0">
                                    The practical checks that make an AI workflow understandable, reviewable and useful.
                                </h6>
                            </div>
                            <div className="col-lg-3 col-md-4 ms-auto d-flex justify-content-lg-end">
                                <div
                                    className="at-btn-group at-btn-group-transparent at_fade_anim"
                                    data-delay=".5"
                                    data-fade-from="bottom"
                                    data-ease="bounce"
                                >
                                    <Link className="at-btn-circle" to="/contact">
                                        {ARROW_RIGHT}
                                    </Link>
                                    <Link className="at-btn z-index-1" to="/contact">
                                        Discuss a workflow
                                    </Link>
                                    <Link className="at-btn-circle" to="/contact">
                                        {ARROW_RIGHT}
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className="row mt-120">
                            <div className="col-12">
                                {AWARDS.map((award, idx) => (
                                    <div
                                        key={idx}
                                        className={`card-award scroll-move-up ${award.isLast ? "mb-0" : ""}`}
                                        data-rotate="positive-15deg"
                                        data-img-award={award.imgAward}
                                    >
                                        <a
                                            href={award.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="card-award-link"
                                        >
                                            <div className="card-award-content">
                                                <div className="card-award-image position-relative">
                                                    <img
                                                        src={award.imgSm}
                                                        alt="Award"
                                                        style={{ objectFit: "cover" }} loading="lazy" />
                                                </div>
                                                <h6 className="card-award-title mb-0 text-white">{award.title}</h6>
                                            </div>
                                            <h6 className="card-award-web-excellence mb-0 fz-font-lg fw-500 text-white">
                                                {award.org}
                                            </h6>
                                            <span className="card-award-date text-white">[ {award.date} ]</span>
                                            <div className="card-award-meta">
                                                <span className="card-award-url fz-font-lg text-white">
                                                    {award.url}
                                                </span>
                                            </div>
                                            <div className="card-award-icon ms-auto text-white">
                                                {EXTERNAL_LINK_ICON}
                                            </div>
                                        </a>
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
