import { Link } from "react-router-dom";
import RevealText from "@/shared/effects/RevealText";

function ArrowIcon() {
    return (
        <>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z" fill="currentColor" />
            </svg>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z" fill="currentColor" />
            </svg>
        </>
    );
}

function CaseArrow() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="11" viewBox="0 0 12 11" fill="none">
            <path d="M4.512 10.8V0H6.984V10.8H4.512ZM0 6.6V4.2H11.52V6.6H0Z" fill="currentColor"></path>
        </svg>
    );
}

const filters = [
    { label: "All Works", filter: "all", delay: ".1", active: true },
    { label: "Logos & Identity", filter: "design", delay: ".2" },
    { label: "Color & Type", filter: "photography", delay: ".3" },
    { label: "Full Rebrands", filter: "marketing", delay: ".4" },
];

const col1Cards = [
    {
        img: "/assets/imgs/pages/home-9/sec-4-img-1.webp",
        category: "marketing",
        tag: "Rebrand",
        metric: "Full identity in minutes",
        excerpt: "AI generated the logo, palette, type and voice; refined in Studio and shipped on a custom domain.",
        project: "Aurelia — fashion",
        badge: "Featured",
    },
    {
        img: "/assets/imgs/pages/home-9/sec-4-img-2.webp",
        category: "photography",
        tag: "Logo",
        metric: "Logo + favicon, on brand",
        excerpt: "",
        project: "Carento — car rental",
        badge: "",
    },
    {
        img: "/assets/imgs/pages/home-9/sec-4-img-3.webp",
        category: "photography",
        tag: "Palette",
        metric: "Cohesive color & type",
        excerpt: "",
        project: "Voyage — travel",
        badge: "",
    },
];

const col2Cards = [
    {
        img: "/assets/imgs/pages/home-9/sec-4-img-4.webp",
        category: "design",
        tag: "Voice",
        metric: "Brand voice across channels",
        excerpt: "",
        project: "Atlas — services",
        badge: "",
    },
    {
        img: "/assets/imgs/pages/home-9/sec-4-img-5.webp",
        category: "design",
        tag: "Domain",
        metric: "Live on your own domain",
        excerpt: "",
        project: "Nimbus — SaaS",
        badge: "",
    },
    {
        img: "/assets/imgs/pages/home-9/sec-4-img-6.webp",
        category: "marketing",
        tag: "Rebrand",
        metric: "Restyled in an afternoon",
        excerpt: "",
        project: "Bloom — wellness",
        badge: "",
    },
];

export default function Section4() {
    return (
        <>
            {/* home-9 section 4 - Selected work */}
            <section className="sec-4-home-9 overflow-hidden bg-neutral-50">
                <div className="sec-4-home-9__container">
                    <h2 className="sec-4-home-9__title at-char-animation">Selected work</h2>

                    <div className="filter-portfolio sec-4-home-9__filters d-flex flex-wrap justify-content-center align-items-center gap-2">
                        {filters.map((f, i) => (
                            <Link
                                key={i}
                                to="#"
                                className={`at-btn filter-btn btn-sm at_fade_anim${f.active ? " active" : ""}`}
                                data-delay={f.delay}
                                data-filter={f.filter}
                            >
                                {f.label}
                            </Link>
                        ))}
                    </div>

                    <div className="sec-4-home-9__grid">
                        <div className="sec-4-home-9__col">
                            {col1Cards.map((card, i) => (
                                <article key={i} className="sec-4-home-9__card mg-portfolio-item" data-category={card.category}>
                                    <div className="sec-4-home-9__visual">
                                        <Link to="/marketplace" className="sec-4-home-9__visual-link cursor-hide">
                                            <div className="fix anim-zoomin">
                                                <img src={card.img} alt="phoxta" width={600} height={450} loading="lazy" />
                                            </div>
                                            <div className="sec-4-home-9__overlay">
                                                <span className="sec-4-home-9__tag">{card.tag}</span>
                                                <p className="sec-4-home-9__metric text-white">{card.metric}</p>
                                                {card.excerpt && (
                                                    <p className="sec-4-home-9__excerpt text-white">{card.excerpt}</p>
                                                )}
                                            </div>
                                        </Link>
                                        {card.badge && (
                                            <span className="sec-4-home-9__badge">{card.badge}</span>
                                        )}
                                    </div>
                                    <div className="sec-4-home-9__bar">
                                        <Link to="/marketplace">
                                            <h3 className="sec-4-home-9__project">{card.project}</h3>
                                        </Link>
                                        <Link to="/marketplace" className="sec-4-home-9__case">
                                            <span>View case</span>
                                            <CaseArrow />
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <div className="sec-4-home-9__col sec-4-home-9__col--offset">
                            {col2Cards.map((card, i) => (
                                <article key={i} className="sec-4-home-9__card mg-portfolio-item" data-category={card.category}>
                                    <div className="sec-4-home-9__visual">
                                        <Link to="/marketplace" className="sec-4-home-9__visual-link cursor-hide">
                                            <div className="fix anim-zoomin">
                                                <img src={card.img} alt="phoxta" width={600} height={450} loading="lazy" />
                                            </div>
                                            <div className="sec-4-home-9__overlay">
                                                <span className="sec-4-home-9__tag">{card.tag}</span>
                                                <p className="sec-4-home-9__metric text-white">{card.metric}</p>
                                            </div>
                                        </Link>
                                    </div>
                                    <div className="sec-4-home-9__bar">
                                        <Link to="/marketplace">
                                            <h3 className="sec-4-home-9__project">{card.project}</h3>
                                        </Link>
                                        <Link to="/marketplace" className="sec-4-home-9__case">
                                            <span>View case</span>
                                            <CaseArrow />
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>

                    <div className="sec-4-home-9__cta">
                        <p className="sec-4-home-9__cta-text reveal-text">
                            <RevealText>Phoxta turns any business into a brand — generate a complete identity with AI, refine it visually, and launch it on your own domain.</RevealText>
                        </p>
                        <Link className="at-btn at_fade_anim" to="/auth" data-delay=".5">
                            <span>
                                <span className="text-1">GET STARTED</span>
                                <span className="text-2">GET STARTED</span>
                            </span>
                            <i>
                                <ArrowIcon />
                            </i>
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
}
