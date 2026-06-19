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

const COVER = (id: string) => `https://images.unsplash.com/${id}?w=800&h=600&fit=crop&q=80`;

const PORTFOLIO_ITEMS = [
    {
        classList: "mb-55",
        link: "/dashboard/marketplace/carento",
        img: COVER("photo-1503376780353-7e6692767b70"),
        title: "Car Marketplace",
        description: "A full car buying & selling marketplace with listings, financing tools and an AI assistant",
        tags: [
            { label: "Automotive", href: "/product-archive" },
            { label: "From $3,900", href: "/product-archive" },
            { label: "AI inside", href: "/product-archive" },
        ],
    },
    {
        classList: "mb-55",
        link: "/dashboard/marketplace/niche-apparel",
        img: COVER("photo-1441986300917-64674bd600d8"),
        title: "Fashion Store",
        description: "A modern fashion store with product archive, online ordering, cart/checkout and an AI stylist",
        tags: [
            { label: "eCommerce", href: "/product-archive" },
            { label: "From $1,500", href: "/product-archive" },
            { label: "AI inside", href: "/product-archive" },
        ],
    },
    {
        classList: "mb-55",
        link: "/dashboard/marketplace/restaurant-orders",
        img: COVER("photo-1414235077428-338989a2e8c0"),
        title: "Restaurant + Orders",
        description: "A fine-dining restaurant with online ordering, reservations, order tracking and an AI concierge",
        tags: [
            { label: "Hospitality", href: "/product-archive" },
            { label: "From $1,500", href: "/product-archive" },
            { label: "AI inside", href: "/product-archive" },
        ],
    },
    {
        classList: "mb-55",
        link: "/dashboard/marketplace/travel",
        img: COVER("photo-1566073771259-6a8506099945"),
        title: "Travel & Stays",
        description: "A travel booking site for stays, flights and experiences, with an AI trip planner",
        tags: [
            { label: "Travel", href: "/product-archive" },
            { label: "From $3,600", href: "/product-archive" },
            { label: "AI inside", href: "/product-archive" },
        ],
    },
    {
        classList: "mb-55",
        link: "/dashboard/marketplace/gearo",
        img: COVER("photo-1555041469-a586c61ea9bc"),
        title: "Furniture Store",
        description: "A modern furniture & workspace eCommerce store with cart, checkout and an AI shopping assistant",
        tags: [
            { label: "eCommerce", href: "/product-archive" },
            { label: "From $1,400", href: "/product-archive" },
            { label: "AI inside", href: "/product-archive" },
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
                                    A handpicked selection of live, AI-powered businesses with a proven track record &mdash; each one ready to brand, launch and run as your own in minutes.
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
