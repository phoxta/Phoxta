{/* Home 7 Section 1 (Hero - Advancing Startup Innovation) */}

const SCHOOL_URL = "/app/school";

const BRACKET_ITEMS = [
    { text: "[ START ]", delay: "0.1" },
    { text: "[ TEST ]", delay: "0.2" },
    { text: "[ LAUNCH ]", delay: "0.3" },
    { text: "[ IMPROVE ]", delay: "0.4" },
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
                        src="/assets/imgs/pages/Startup%20School%20Hero.jpeg"
                        alt="Phoxta Startup School"
                        width={960}
                        height={1080} loading="lazy" />
                </div>
                {/* Legibility scrim under the overlaid proof */}
                <div
                    className="position-absolute bottom-0 start-0 end-0"
                    style={{ height: "45%", background: "linear-gradient(to top, rgba(0,0,0,.55), rgba(0,0,0,0))", pointerEvents: "none", zIndex: 1 }}
                    aria-hidden="true"
                />
                {/* A concise descriptor keeps the image useful without making an unsupported social-proof claim. */}
                <div className="sec-1-home-7__proof position-absolute bottom-0 start-0 d-flex align-items-center flex-wrap gap-3 p-4" style={{ zIndex: 2 }}>
                    <p className="sec-1-home-7__proof-text text-white fw-700 mb-0 at_fade_anim" data-start="100%" data-delay="0.6">
                        Practical business education <br className="d-none d-xl-inline" />for the work in front of you
                    </p>
                </div>
            </div>

            <div className="container-fluid p-relative">
                <div className="row g-0 align-items-stretch">
                    {/* LEFT: Hero image (overlays removed for a cleaner hero) */}
                    <div className="col-lg-6 p-relative sec-1-home-7__left"></div>

                    {/* RIGHT: Copy + CTA */}
                    <div className="col-lg-6 sec-1-home-7__right">
                        <div className="sec-1-home-7__content">
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

                            <div className="sec-1-home-7__headline-wrap p-relative">
                                <h1 className="sec-1-home-7__headline text-white text-uppercase fw-700 mb-30 at_fade_anim" data-start="100%" data-delay="0.3">
                                    Turn a business idea into a business you can run
                                </h1>
                                <span className="sec-1-home-7__headline-arrow-cover d-none d-md-inline-block">
                                    <span className="sec-1-home-7__headline-arrow at_fade_anim" data-start="100%" data-delay="0.6">
                                        {HEADLINE_ARROW_SVG}
                                    </span>
                                </span>
                            </div>

                            <p className="sec-1-home-7__desc text-white mb-30 at_fade_anim" data-start="100%" data-delay="0.5">
                                Learn how to find customers, shape an offer, launch well and build the day-to-day system behind it. Bring an idea, an existing business or a Phoxta turnkey business you want to make your own.
                            </p>

                            <p className="sec-1-home-7__price text-white mb-20 at_fade_anim" data-start="100%" data-delay="0.55">
                                Short, applied courses. Useful business work from the first lesson.
                            </p>

                            <div className="sec-1-home-7__cta d-flex align-items-center flex-wrap gap-2 mb-10">
                                <a href={SCHOOL_URL} className="sec-1-home-7__cta-btn at_fade_anim" data-start="100%" data-delay="0.3">
                                    <span>Start in Startup School</span>
                                </a>
                                <a href={SCHOOL_URL} className="sec-1-home-7__cta-arrow" aria-label="Start in Startup School">
                                    {CTA_ARROW_SVG}
                                </a>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
