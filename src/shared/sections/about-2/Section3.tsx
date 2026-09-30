import { Link } from "react-router-dom";
import RevealText from "@/shared/effects/RevealText";

// About 2 Section 3 - Who We Are / Our Journey (card-award-2 timeline)

const ARROW_SVG = (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z"
            fill="currentColor"
        />
    </svg>
);

const ARROW_CIRCLE_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="15" viewBox="0 0 16 15" fill="none">
        <path
            d="M0.0001297 8.99993L0 3.00407e-05L2 0L2.0001 6.99993L12.1719 7.00003L8.22224 3.05027L9.63644 1.63606L16.0003 8.00003L9.63644 14.364L8.22224 12.9497L12.1719 9.00003L0.0001297 8.99993Z"
            fill="currentColor"
        />
    </svg>
);

const CARD_ICON_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none">
        <path
            d="M10.0208 3.41421L1.41421 12.0208L0 10.6066L8.60659 2H1.02082V0H12.0208V11H10.0208V3.41421Z"
            fill="currentColor"
        />
    </svg>
);

const AWARD_CARDS = [
    {
        year: "Step 01 — Choose",
        title: "Start with a business system",
        desc: "Preview the business, its customer journey and what the package includes. Choose the system that gives you a useful starting point for the market you understand.",
        img: "/assets/imgs/pages/img-126.webp",
        alt: "Choose a business system",
    },
    {
        year: "Step 02 — Tailor",
        title: "Make the offer specific",
        desc: "Set the customer, market, message, price and service standard. A system becomes your business only when those choices are clear enough for a customer to understand.",
        img: "/assets/imgs/pages/img-127.webp",
        alt: "Tailor the offer",
    },
    {
        year: "Step 03 — Test",
        title: "Learn from real customers",
        desc: "Use customer conversations, demand tests and delivery evidence to find what works. Keep assumptions visible and let the result change the next decision.",
        img: "/assets/imgs/pages/img-128.webp",
        alt: "Test with customers",
    },
    {
        year: "Step 04 — Run",
        title: "Improve the operating rhythm",
        desc: "Review customer value, delivery quality, cash and capacity each week. Use AI for clear, repeatable work while people remain responsible for important decisions.",
        img: "/assets/imgs/pages/img-129.webp",
        alt: "Run and improve the business",
    },
];

export default function Section3() {
    return (
        <section className="sec-3-about pt-120">
            <div className="container">
                <div className="row align-items-end g-4">
                    <div className="col-lg-5 col-md-8">
                        <span className="at-btn common-black text-uppercase bg-transparent mb-10 rounded-0 p-0">
                            <span className="text-uppercase">
                                <span className="text-1">How Phoxta works</span>
                                <span className="text-2">How Phoxta works</span>
                            </span>
                            <i>
                                {ARROW_SVG}
                                {ARROW_SVG}
                            </i>
                        </span>
                        <h3 className="reveal-text mb-0">
                            <RevealText>From starting point to practical progress</RevealText>
                        </h3>
                    </div>
                    <div className="col-lg-3 col-md-4 ms-auto d-flex justify-content-lg-end">
                        <div
                            className="at-btn-group at-btn-group-transparent at_fade_anim"
                            data-delay=".5"
                            data-fade-from="bottom"
                            data-ease="bounce"
                        >
                            <Link className="at-btn-circle" to="/marketplace">
                                {ARROW_CIRCLE_SVG}
                            </Link>
                            <Link className="at-btn z-index-1" to="/marketplace">
                                Explore businesses
                            </Link>
                            <Link className="at-btn-circle" to="/marketplace">
                                {ARROW_CIRCLE_SVG}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
            <div className="container pt-100">
                <div className="row">
                    <div className="col-12">
                        <div className="card-award-2-list">
                            {AWARD_CARDS.map((card, i) => (
                                <div key={i} className="card-award-2 scroll-move-up">
                                    <div className="card-award-2-link">
                                        <span className="card-award-2-year">{card.year}</span>
                                        <div className="card-award-2-content">
                                            <h6 className="card-award-2-title">{card.title}</h6>
                                            <p className="card-award-2-desc mb-0">{card.desc}</p>
                                        </div>
                                        <div className="card-award-2-image-wrap">
                                            <div className="card-award-2-image">
                                                <img
                                                    src={card.img}
                                                    alt={card.alt}
                                                    width={800}
                                                    height={500}
                                                    style={{ width: "100%", height: "auto", objectFit: "cover" }} loading="lazy" />
                                            </div>
                                        </div>
                                        <div className="card-award-2-icon">{CARD_ICON_SVG}</div>
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
