import { Link } from "react-router-dom";
import RevealText from "@/shared/effects/RevealText";
import PortfolioCard1 from "@/shared/cards/PortfolioCard1";

const CUBE_SVG = (
    <svg className="fill-primary mb-10" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M17 18L30 5H43V18L30 31V18H17Z" fill="#F0460E" />
        <path d="M30 31H43V44H30V31Z" fill="#F0460E" />
        <path d="M17 18L4 31V44H17L30 31H17V18Z" fill="#F0460E" />
        <path d="M17 18H4V5H17V18Z" fill="#F0460E" />
    </svg>
);

const ARROW_CIRCLE_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="15" viewBox="0 0 16 15" fill="none">
        <path d="M0.0001297 8.99993L0 3.00407e-05L2 0L2.0001 6.99993L12.1719 7.00003L8.22224 3.05027L9.63644 1.63606L16.0003 8.00003L9.63644 14.364L8.22224 12.9497L12.1719 9.00003L0.0001297 8.99993Z" fill="currentColor" />
    </svg>
);

const PORTFOLIO_ITEMS = [
    {
        classList: "mb-55",
        link: "/product-details",
        img: "/assets/imgs/pages/img-11.webp",
        title: "Coffee Subscription",
        description: "A recurring coffee brand with an AI support assistant and automatic cart recovery",
        tags: [
            { label: "E-commerce", href: "/product-archive" },
            { label: "From $1,200", href: "/product-archive" },
            { label: "AI inside", href: "/product-archive" },
        ],
    },
    {
        classList: "mb-55",
        link: "/product-details",
        img: "/assets/imgs/pages/img-12.webp",
        title: "Niche Apparel",
        description: "An audience-ready apparel storefront with AI product copy and built-in SEO",
        tags: [
            { label: "DTC", href: "/product-archive" },
            { label: "From $1,500", href: "/product-archive" },
            { label: "AI inside", href: "/product-archive" },
        ],
    },
    {
        classList: "mb-55",
        link: "/product-details",
        img: "/assets/imgs/pages/img-13.webp",
        title: "Salon & Booking",
        description: "A local services business with an AI receptionist and automated SMS rebooking",
        tags: [
            { label: "Local services", href: "/product-archive" },
            { label: "From $900", href: "/product-archive" },
            { label: "AI inside", href: "/product-archive" },
        ],
    },
    {
        classList: "mb-55",
        link: "/product-details",
        img: "/assets/imgs/pages/img-14.webp",
        title: "Local Marketplace",
        description: "A multi-vendor marketplace with split payouts, ratings and real numbers you can check",
        tags: [
            { label: "Marketplace", href: "/product-archive" },
            { label: "From $3,100", href: "/product-archive" },
            { label: "Multi-vendor", href: "/product-archive" },
            { label: "Verified numbers", href: "/product-archive" },
        ],
    },
];

export default function Section5({ classList = "" }: { classList?: string }) {
    return (
        <div className={`mg-portfolio-area pt-145 pb-65 ${classList}`.trim()}>
            <div className="container">
                <div className="row">
                    <div className="col-xxl-4 col-lg-4">
                        <div className="mg-portfolio-title-wrap mg-portfolio-pin mb-30">
                            {CUBE_SVG}
                            <h2 className="alt-section-title lh-1 mb-30 reveal-text">
                                <RevealText>
                                    Businesses ready to make your own
                                </RevealText>
                            </h2>
                            <div className="at_fade_anim" data-delay=".3">
                                <p className="mg-portfolio-dec mb-50">
                                    A handpicked selection of live, AI-powered businesses with a proven track record &mdash; each one ready to brand, launch and run as your own in days.
                                </p>
                            </div>
                            <div className="at-btn-group at_fade_anim" data-delay=".4" data-fade-from="bottom" data-ease="bounce">
                                <Link className="at-btn-circle" to="/product-archive">
                                    {ARROW_CIRCLE_SVG}
                                </Link>
                                <Link className="at-btn z-index-1" to="/product-archive">
                                    Browse the marketplace
                                </Link>
                                <Link className="at-btn-circle" to="/product-archive">
                                    {ARROW_CIRCLE_SVG}
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-7 ms-auto">
                        <div className="mg-portfolio-item-wrap ml-130 mb-40">
                            {PORTFOLIO_ITEMS.map((item, idx) => (
                                <PortfolioCard1
                                    key={idx}
                                    link={item.link}
                                    img={item.img}
                                    title={item.title}
                                    description={item.description}
                                    tags={item.tags}
                                    classList={item.classList}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
