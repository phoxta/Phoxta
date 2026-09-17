import { useRef } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Pagination } from "swiper/modules";
import HeaderNav from "@/shared/header/HeaderNav";
import { STAGES } from "@/lib/founder/journey";
import { HERO_BG, HERO_CARDS, HERO_SLIDES, HERO_VIDEO, HERO_VIDEO_POSTER } from "@/lib/founder/media";

// The Founder Toolkit hero, built on the homepage hero (index-1/Section1): the
// same rounded full-bleed panel over a gradient render, the same fading
// headline slider with its vertical dot rail, the same muted looping video at
// the lower left and the same card row and tag pills at the right. HeaderNav is
// rendered here in its light variant and the route sets `noHeader`, exactly as
// the homepage does, so the nav floats over the artwork instead of sitting on a
// white band above it.

const ARROW_SVG = (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z"
            fill="currentColor"
        />
    </svg>
);

const TAG_ARROW_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="9" height="10" viewBox="0 0 9 10" fill="none">
        <path
            d="M5.62494 9.99994L0.562517 10L0.5625 8.75003L4.49994 8.74996L4.5 2.39273L2.27828 4.86124L1.48278 3.97739L5.0625 0L8.64225 3.97739L7.84676 4.86124L5.625 2.3927L5.62494 9.99994Z"
            fill="currentColor"
        />
    </svg>
);

/** The six stages worth surfacing as pills. Ten would wrap into a wall. */
const PILL_STAGES = STAGES.slice(0, 6);

export default function FounderHero() {
    const dotsRef = useRef<HTMLDivElement>(null);

    return (
        <div className="container-2200 sec-1-home-4-wrap p-relative z-0" style={{ paddingTop: 20 }}>
            <div
                className="sec-1-home-4 bg-linear-opacity p-relative bg-cover mt-20 rounded-5 mx-lg-3 mx-2"
                data-background={HERO_BG}
            >
                <HeaderNav light />
                <div className="container p-relative z-index-1">
                    <div className="row align-items-start">
                        <div className="col-xxl-6 col-lg-6 mb-5 mb-lg-0 pe-xxl-5">
                            {/* Dot rail is a flex sibling to the left of the slider, never
                                absolutely positioned, so it cannot overlap the headline.
                                The !important overrides neutralise swiper-bundle.css rules
                                that target external pagination elements. */}
                            <style>{`
                                .fd-hero-dots {
                                    position: static !important;
                                    bottom: auto !important;
                                    left: auto !important;
                                    width: auto !important;
                                    display: flex;
                                    flex-direction: column;
                                    gap: 12px;
                                    flex-shrink: 0;
                                    opacity: 0.5;
                                    transition: opacity 0.2s ease;
                                }
                                .fd-hero-dots:hover { opacity: 1; }
                                .fd-hero-dots .swiper-pagination-bullet {
                                    display: block;
                                    width: 11px;
                                    height: 11px;
                                    margin: 0;
                                    border-radius: 50%;
                                    background: transparent;
                                    border: 2px solid rgba(254, 254, 254, 0.55);
                                    opacity: 1;
                                    cursor: pointer;
                                    transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
                                }
                                .fd-hero-dots .swiper-pagination-bullet:hover {
                                    border-color: #fefefe;
                                    transform: scale(1.2);
                                }
                                .fd-hero-dots .swiper-pagination-bullet-active {
                                    background: #fefefe;
                                    border-color: #fefefe;
                                }
                            `}</style>

                            <span className="at-btn text-white text-uppercase bg-transparent rounded-0 p-0 mb-10 d-inline-flex">
                                <span className="text-uppercase">
                                    <span className="text-1">Free founder toolkit</span>
                                    <span className="text-2">Free founder toolkit</span>
                                </span>
                                <i>
                                    {ARROW_SVG}
                                    {ARROW_SVG}
                                </i>
                            </span>

                            <div className="d-flex align-items-center gap-3 mb-4 mb-md-5">
                                <div ref={dotsRef} className="fd-hero-dots" aria-label="Toolkit highlights" />
                                <Swiper
                                    modules={[Autoplay, EffectFade, Pagination]}
                                    effect="fade"
                                    fadeEffect={{ crossFade: true }}
                                    autoplay={{ delay: 8000, disableOnInteraction: false }}
                                    pagination={{ el: null, clickable: true }}
                                    onBeforeInit={(swiper) => {
                                        if (typeof swiper.params.pagination === "object") {
                                            swiper.params.pagination.el = dotsRef.current;
                                        }
                                    }}
                                    loop
                                    speed={900}
                                    slidesPerView={1}
                                    allowTouchMove={false}
                                    className="hero-headline-swiper flex-grow-1 mx-0"
                                >
                                    {HERO_SLIDES.map((slide) => (
                                        <SwiperSlide key={slide.title}>
                                            <h1 className="at-section-title fw-600 text-white mb-3 mb-md-4 lh-1">
                                                {slide.title}
                                            </h1>
                                            <p className="text-white fz-font-lg mb-0" style={{ opacity: 0.85, maxWidth: 540 }}>
                                                {slide.sub}
                                            </p>
                                        </SwiperSlide>
                                    ))}
                                </Swiper>
                            </div>

                            <div className="d-flex flex-wrap align-items-end gap-4">
                                <Link className="at-btn rounded-0 bg-white text-dark" to={`/founder/${STAGES[0].slug}`}>
                                    <span>
                                        <span className="text-1">Start at the beginning</span>
                                        <span className="text-2">Start at the beginning</span>
                                    </span>
                                </Link>

                                <div className="at-hero-video" style={{ maxWidth: 200 }}>
                                    <div className="rounded-3 overflow-hidden">
                                        <video
                                            className="img-cover"
                                            autoPlay
                                            muted
                                            loop
                                            playsInline
                                            poster={HERO_VIDEO_POSTER}
                                        >
                                            <source src={HERO_VIDEO} type="video/mp4" />
                                        </video>
                                    </div>
                                    <a
                                        href="#stages"
                                        className="at-btn text-white rounded-0 bg-transparent px-0 pt-2 pb-3 border-0"
                                    >
                                        <span>
                                            <span className="text-1">See the ten stages</span>
                                            <span className="text-2">See the ten stages</span>
                                        </span>
                                        <i>
                                            {ARROW_SVG}
                                            {ARROW_SVG}
                                        </i>
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="col-xxl-4 col-lg-6 col-md-10 ms-lg-auto mt-lg-0 mt-4">
                            <div className="sec-1-home-4__cards d-flex gap-3 mb-4">
                                {HERO_CARDS.map((card) => (
                                    <div key={card.src} className="sec-1-home-4__card rounded-3 overflow-hidden">
                                        <img
                                            src={card.src}
                                            alt={card.alt}
                                            width={280}
                                            height={200}
                                            className="img-cover w-100 h-100"
                                            loading="lazy"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="sec-1-home-4__tags d-flex flex-wrap gap-3 mt-40">
                                {PILL_STAGES.map((s) => (
                                    <Link key={s.id} to={`/founder/${s.slug}`} className="sec-1-home-4__tag">
                                        {s.title}
                                        {TAG_ARROW_SVG}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
