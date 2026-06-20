import SwiperDynamic from "@/shared/components/SwiperDynamic";

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

const testimonials = [
    {
        img: "/assets/imgs/pages/home-9/testimonial-1.webp",
        logo: "/assets/imgs/pages/home-9/logo-3.svg",
        quote: "Phoxta delivered a complete brand — strategy, logo, palette and voice — that finally captures who we are. It looks like the work of a top-tier studio.",
        name: "Amelia Wright",
        position: "Head of Marketing",
    },
    {
        img: "/assets/imgs/pages/home-9/testimonial-2.webp",
        logo: "/assets/imgs/pages/home-9/logo-4.svg",
        quote: "They translated complex brand values into a clean, high-impact identity. Our conversion rates jumped within the first month of launch.",
        name: "Sophia Sterling",
        position: "Founder, AURA",
    },
    {
        img: "/assets/imgs/pages/home-9/testimonial-3.webp",
        logo: "/assets/imgs/pages/home-9/logo-2.svg",
        quote: "The consistency across everything — web, social, packaging — is what sets the work apart. Phoxta felt like true partners, not just a vendor.",
        name: "Marcus Thorne",
        position: "Brand Director",
    },
];

export default function Section8() {
    return (
        <>
            {/* home-9 section 8 - Testimonials */}
            <div className="home-9-testimonial-area pt-150 pb-150 at-item-anime-area">
                <div className="container">
                    <div className="testimonial-9-title-wrap at_fade_anim" data-fade-from="bottom">
                        <span className="at-btn common-black text-uppercase bg-transparent mb-10 rounded-0 p-0">
                            <span className="text-uppercase">
                                <span className="text-1">TESTIMONIALS</span>
                                <span className="text-2">TESTIMONIALS</span>
                            </span>
                            <i>
                                <ArrowIcon />
                            </i>
                        </span>
                        <div className="title-right">
                            <p className="neutral-900 m-0 fw-500 text-decoration-underline at_fade_anim" data-delay=".3">Trusted by brands worldwide</p>
                        </div>
                    </div>

                    <SwiperDynamic
                        className="swiper about-me-slider-active at_fade_anim"
                        slidesPerView={2}
                        spaceBetween={30}
                        loop={true}
                        breakpoints={{
                            0: { slidesPerView: 1 },
                            576: { slidesPerView: 1 },
                            768: { slidesPerView: 1 },
                            992: { slidesPerView: 2 },
                        }}
                    >
                        {testimonials.map((item, i) => (
                            <div key={i} className="testimonial-9-card">
                                <div className="testimonial-img anim-zoomin-wrap">
                                    <img
                                        src={item.img}
                                        alt="phoxta"
                                        className="anim-zoomin"
                                        width={400}
                                        height={300} loading="lazy" />
                                </div>
                                <div className="testimonial-content">
                                    <p className="testimonial-quote">&quot;{item.quote}&quot;</p>
                                    <div className="testimonial-author">
                                        <div className="author-logo">
                                            <img src={item.logo} alt="phoxta" width={80} height={30} loading="lazy" />
                                        </div>
                                        <div className="author-info">
                                            <h6 className="author-name neutral-950 m-0 fw-600">{item.name}</h6>
                                            <p className="author-position neutral-500 m-0 fw-500">{item.position}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </SwiperDynamic>
                </div>
            </div>
        </>
    );
}
