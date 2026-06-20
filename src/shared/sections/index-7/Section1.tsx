import { Link } from "react-router-dom";
{/* Home 7 Section 1 (Hero - Advancing Startup Innovation) */}

const BRACKET_ITEMS = [
    { text: "[ LEARN ]", delay: "0.1" },
    { text: "[ BUILD ]", delay: "0.2" },
    { text: "[ LAUNCH ]", delay: "0.3" },
    { text: "[ GROW ]", delay: "0.4" },
];

const AVATARS = [
    { src: "/assets/imgs/pages/home-7/avatar-1.webp", alt: "Client 1", delay: "0.1" },
    { src: "/assets/imgs/pages/home-7/avatar-2.webp", alt: "Client 2", delay: "0.2" },
    { src: "/assets/imgs/pages/home-7/avatar-3.webp", alt: "Client 3", delay: "0.3" },
    { src: "/assets/imgs/pages/home-7/avatar-4.webp", alt: "Client 4", delay: "0.4" },
    { src: "/assets/imgs/pages/home-7/avatar-5.webp", alt: "Client 5", delay: "0.5" },
];

const HEADLINE_ARROW_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="70" height="53" viewBox="0 0 69 53" fill="none">
        <path d="M40.2 0L67.72 25.4267L69 26.7141L67.72 27.6797L40.2 53.1064L38.6 51.4971L64.2 27.6797H-59V25.4267H64.2L38.6 1.60928L40.2 0Z" fill="currentColor" />
    </svg>
);

const CTA_ARROW_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 11 11" fill="none">
        <path d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z" fill="currentColor" />
    </svg>
);

export default function Section1() {
    return (
        <div className="sec-1-home-7 p-relative z-index-1 overflow-hidden">
            {/* Split background: vermilion (left) + maroon (right) */}
            <div className="sec-1-home-7__bg d-flex">
                <div className="sec-1-home-7__bg-left"></div>
                <div className="sec-1-home-7__bg-right"></div>
            </div>

            {/* Decorative 8-point asterisk sitting on the split */}
            <div className="sec-1-home-7__star d-none d-lg-flex">
                <img
                    className="at-scroll-rotate"
                    data-rotate-duration="18"
                    data-rotate-sensitivity="0.18"
                    data-rotate-boost="12"
                    src="/assets/imgs/pages/home-7/star-asterisk.svg"
                    alt="decorative star" loading="lazy" />
            </div>

            <div className="sec-1-home-7__img-wrap">
                <div className="anim-zoomin">
                    <img
                        className="sec-1-home-7__img"
                        src="/assets/imgs/pages/home-7/hero-vr.webp"
                        alt="Futuristic VR experience"
                        width={960}
                        height={1080} loading="lazy" />
                </div>
            </div>

            <div className="container-fluid p-relative">
                <div className="row g-0 align-items-stretch">
                    {/* LEFT: Hero image (overlays removed for a cleaner hero) */}
                    <div className="col-lg-6 p-relative sec-1-home-7__left"></div>

                    {/* RIGHT: Copy + CTA */}
                    <div className="col-lg-6 sec-1-home-7__right">
                        <div className="sec-1-home-7__content">
                            {/* [BUILD] [GROW] [SCALE] [BOOST] */}
                            <ul className="sec-1-home-7__brackets list-unstyled d-flex flex-wrap gap-4 mb-30">
                                {BRACKET_ITEMS.map((item, i) => (
                                    <li
                                        key={i}
                                        className="at_fade_anim"
                                        data-start="100%"
                                        data-delay={item.delay}
                                    >
                                        {item.text}
                                    </li>
                                ))}
                            </ul>

                            {/* Headline with diagonal arrow */}
                            <div className="sec-1-home-7__headline-wrap p-relative">
                                <h1 className="sec-1-home-7__headline text-white text-uppercase fw-700 mb-30 at_fade_anim" data-start="100%" data-delay="0.3">
                                    Practical business education for the AI era
                                </h1>
                                <span className="sec-1-home-7__headline-arrow-cover d-none d-md-inline-block">
                                    <span className="sec-1-home-7__headline-arrow at_fade_anim" data-start="100%" data-delay="0.6">
                                        {HEADLINE_ARROW_SVG}
                                    </span>
                                </span>
                            </div>

                            {/* Description */}
                            <p className="sec-1-home-7__desc text-white mb-40 at_fade_anim" data-start="100%" data-delay="0.5">
                                Learn strategy, finance, marketing and the AI tools reshaping business — then apply it all by building and running a real company, with expert mentors beside you.
                            </p>

                            {/* Primary CTA + icon bubble */}
                            <div className="sec-1-home-7__cta d-flex align-items-center flex-wrap gap-2 mb-60">
                                <Link to="/contact" className="sec-1-home-7__cta-btn at_fade_anim" data-start="100%" data-delay="0.3">
                                    <span>Join the school</span>
                                </Link>
                                <Link to="/contact" className="sec-1-home-7__cta-arrow" aria-label="Join the school">
                                    {CTA_ARROW_SVG}
                                </Link>
                            </div>

                            {/* Social proof: avatar stack + copy */}
                            <div className="sec-1-home-7__proof d-flex align-items-center flex-wrap gap-3">
                                <div className="sec-1-home-7__avatars">
                                    {AVATARS.map((avatar, i) => (
                                        <span
                                            key={i}
                                            className="sec-1-home-7__avatar at_fade_anim"
                                            data-start="100%"
                                            data-delay={avatar.delay}
                                        >
                                            <img
                                                src={avatar.src}
                                                alt={avatar.alt}
                                                width={48}
                                                height={48} loading="lazy" />
                                        </span>
                                    ))}
                                </div>
                                <p className="sec-1-home-7__proof-text text-white fw-700 mb-0 at_fade_anim" data-start="100%" data-delay="0.6">
                                    Founders from around the <br className="d-none d-xl-inline" />world start here
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
