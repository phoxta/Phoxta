import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Navigation, Pagination } from "swiper/modules";
import RLink from "@/components/common/RLink";

// Hero slideshow — converted from the template's `.tf-slideshow` Swiper. The
// template's swiper-bundle CSS (linked in index.html) styles it; Swiper React
// drives it (no jQuery), so it re-inits cleanly on SPA navigation.
const SLIDES = [
    { img: "/images/slider/slider-1.jpg", title: "Ergonomic Chair Pro", text: "Get superior support and better posture with ergonomic chairs for long work hours" },
    { img: "/images/slider/slider-2.jpg", title: "Wireless Charging Dock", text: "Charge effortlessly and keep your desk tidy with a sleek wireless charging dock" },
    { img: "/images/slider/slider-3.jpg", title: "Standing Desk Essentials", text: "Switch between sitting and standing to stay energised through the working day" },
];

export default function Hero() {
    return (
        <div className="tf-slideshow style-default slider-effect-fade">
            <Swiper
                className="tf-sw-slideshow"
                modules={[Autoplay, EffectFade, Navigation, Pagination]}
                slidesPerView={1}
                loop
                effect="fade"
                speed={1000}
                autoplay={{ delay: 4000, disableOnInteraction: false }}
                pagination={{ clickable: true }}
                navigation
            >
                {SLIDES.map((s, i) => (
                    <SwiperSlide key={i}>
                        <div className={`wrap-slider slide-${(i % 3) + 1}`}>
                            <div className="img-style">
                                <img src={s.img} alt={s.title} width={1920} height={760} />
                            </div>
                            <div className="box-content">
                                <div className="box-title">
                                    <h1 className="text-white">{s.title}</h1>
                                    <p className="text-body-1 text-white">{s.text}</p>
                                </div>
                                <RLink to="shop-default.html" className="tf-btn btn-white">
                                    Explore Collection <i className="icon-arrow-up-right" />
                                </RLink>
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
}
