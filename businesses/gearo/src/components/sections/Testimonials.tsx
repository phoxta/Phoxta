import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";

const REVIEWS = [
    { name: "Amelia R.", role: "Designer", text: "The ergonomic chair completely changed my work days — no more back pain after long sessions." },
    { name: "Daniel K.", role: "Engineer", text: "Beautiful build quality and fast delivery. My whole desk setup feels premium now." },
    { name: "Sophie L.", role: "Founder", text: "Stylish, sturdy and surprisingly affordable. Gearo is my go-to for office furniture." },
    { name: "Marcus T.", role: "Architect", text: "The standing desk frame is rock solid. Assembly was painless and it looks fantastic." },
];

export default function Testimonials() {
    return (
        <section className="flat-spacing-2 section-testimonials">
            <div className="container">
                <div className="heading-section text-center mb-4">
                    <h3 className="wow fadeInUp">What our customers say</h3>
                </div>
                <Swiper
                    modules={[Autoplay, Pagination]}
                    slidesPerView={1}
                    spaceBetween={24}
                    loop
                    autoplay={{ delay: 4500, disableOnInteraction: false }}
                    pagination={{ clickable: true }}
                    breakpoints={{ 768: { slidesPerView: 2 }, 1200: { slidesPerView: 3 } }}
                >
                    {REVIEWS.map((r, i) => (
                        <SwiperSlide key={i}>
                            <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 28, height: "100%", marginBottom: 40 }}>
                                <div style={{ color: "#f5a623", marginBottom: 12 }}>★★★★★</div>
                                <p className="text-body-1 mb-4">“{r.text}”</p>
                                <div className="text-title" style={{ fontWeight: 600 }}>{r.name}</div>
                                <div className="text-caption-1 text_secondary">{r.role}</div>
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
        </section>
    );
}
