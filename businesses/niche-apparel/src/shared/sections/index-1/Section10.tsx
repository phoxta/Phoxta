import Marquee from "react-fast-marquee";

const TICKER_SVG = (
    <svg className="scroll-rotate" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path
            d="M20 0C20.3015 10.9184 29.0816 19.6985 40 20C29.0816 20.3015 20.3015 29.0816 20 40C19.6985 29.0816 10.9184 20.3015 0 20C10.9184 19.6985 19.6985 10.9184 20 0Z"
            fill="#B7B7B7"
        />
    </svg>
);

const TICKER_ITEMS = [
    "E-commerce & DTC",
    "Local Services",
    "Content & Creator",
    "SaaS & Digital Products",
    "Marketplaces",
    "Education & Courses",
    "Restaurant & Hospitality",
    "B2B & Wholesale",
    "Membership & Community",
    "AI Assistants",
    "Automations",
];

export default function Section10() {
    return (
        <section className="at-brand-area border-top-0">
            <div className="carouselTicker carouselTicker-left">
                <Marquee
                    speed={40}
                    direction="left"
                    pauseOnHover={false}
                    gradient={false}
                    className="carouselTicker__marquee"
                >
                    <ul className="d-flex align-items-center justify-content-center gap-4 carouselTicker__list scroll-move-left fix">
                        {TICKER_ITEMS.map((label) => (
                            <li key={label} className="d-flex align-items-center gap-4 carouselTicker__item mx-0">
                                <h5 className="mb-0 text-nowrap">{label}</h5>
                                {TICKER_SVG}
                            </li>
                        ))}
                    </ul>
                </Marquee>
            </div>
        </section>
    );
}
