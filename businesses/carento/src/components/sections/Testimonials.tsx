import { Swiper, SwiperSlide } from "swiper/react";
import { swiperGroupAnimate } from "@/util/swiperOptions";

export default function Testimonials() {
    return (
        <>
            <section className="section-box py-96 background-body">
                <div className="container">
                    <div className="row align-items-end">
                        <div className="col-md-9 col-sm-9 wow fadeInUp">
                            <div className="box-author-testimonials">
                                <img src="/assets/imgs/page/homepage1/testimonial.png" alt="Carento" />
                                <img src="/assets/imgs/page/homepage1/testimonial2.png" alt="Carento" />
                                <img src="/assets/imgs/page/homepage1/testimonial3.png" alt="Carento" />
                                Testimonials
                            </div>
                            <h3 className="mt-8 mb-15 neutral-1000">What they say about us?</h3>
                        </div>
                    </div>
                </div>
                <div className="block-testimonials wow fadeIn">
                    <div className="container-testimonials">
                        <div className="container-slider ps-0">
                            <div className="box-swiper mt-30">
                                <Swiper {...swiperGroupAnimate} className="swiper-container swiper-group-animate swiper-group-journey">
                                    <div className="swiper-wrapper">
                                        <SwiperSlide>
                                            <div className="card-testimonial background-card">
                                                <div className="card-info">
                                                    <p className="text-xl-bold card-title neutral-1000">Fast and Easy to Use</p>
                                                    <p className="text-md-regular neutral-500">I’ve used many car rental platforms before, but Carento’s booking system is hands down the best! The process is so smooth and straightforward.</p>
                                                </div>
                                                <div className="card-top pt-40 border-0 mb-0">
                                                    <div className="card-author">
                                                        <div className="card-image">
                                                            <img src="/assets/imgs/testimonials/testimonials-1/author-1.png" alt="Carento" />
                                                        </div>
                                                        <div className="card-info">
                                                            <p className="text-lg-bold neutral-1000">Sophia Moore</p>
                                                            <p className="text-md-regular neutral-1000">New York</p>
                                                        </div>
                                                    </div>
                                                    <div className="card-rate">
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                    </div>
                                                </div>
                                            </div>
                                        </SwiperSlide>
                                        <SwiperSlide>
                                            <div className="card-testimonial background-card">
                                                <div className="card-info">
                                                    <p className="text-xl-bold card-title neutral-1000">Super Convenient</p>
                                                    <p className="text-md-regular neutral-500">The booking system on this site is top-notch. Everything is laid out clearly, and there are multiple payment options, which makes things super convenient.</p>
                                                </div>
                                                <div className="card-top pt-40 border-0 mb-0">
                                                    <div className="card-author">
                                                        <div className="card-image">
                                                            <img src="/assets/imgs/testimonials/testimonials-1/author-2.png" alt="Carento" />
                                                        </div>
                                                        <div className="card-info">
                                                            <p className="text-lg-bold neutral-1000">Atend John</p>
                                                            <p className="text-md-regular neutral-1000">Tokyo</p>
                                                        </div>
                                                    </div>
                                                    <div className="card-rate">
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                    </div>
                                                </div>
                                            </div>
                                        </SwiperSlide>
                                        <SwiperSlide>
                                            <div className="card-testimonial background-card">
                                                <div className="card-info">
                                                    <p className="text-xl-bold card-title neutral-1000">Great Features and Process</p>
                                                    <p className="text-md-regular neutral-500">I was impressed by the range of features available when booking. The calendar tool for selecting dates was especially useful, and I appreciated the live availability feature.</p>
                                                </div>
                                                <div className="card-top pt-40 border-0 mb-0">
                                                    <div className="card-author">
                                                        <div className="card-image">
                                                            <img src="/assets/imgs/testimonials/testimonials-1/author-3.png" alt="Carento" />
                                                        </div>
                                                        <div className="card-info">
                                                            <p className="text-lg-bold neutral-1000">Sara Mohamed</p>
                                                            <p className="text-md-regular neutral-1000">Jakatar</p>
                                                        </div>
                                                    </div>
                                                    <div className="card-rate">
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                    </div>
                                                </div>
                                            </div>
                                        </SwiperSlide>
                                        <SwiperSlide>
                                            <div className="card-testimonial background-card">
                                                <div className="card-info">
                                                    <p className="text-xl-bold card-title neutral-1000">Easy to Understand</p>
                                                    <p className="text-md-regular neutral-500">The attention to detail in the booking process made our trip stress-free, allowing us to focus on creating lasting memories together.</p>
                                                </div>
                                                <div className="card-top pt-40 border-0 mb-0">
                                                    <div className="card-author">
                                                        <div className="card-image">
                                                            <img src="/assets/imgs/testimonials/testimonials-1/author-1.png" alt="Carento" />
                                                        </div>
                                                        <div className="card-info">
                                                            <p className="text-lg-bold neutral-1000">Sara Mohamed</p>
                                                            <p className="text-md-regular neutral-1000">Jakatar</p>
                                                        </div>
                                                    </div>
                                                    <div className="card-rate">
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                    </div>
                                                </div>
                                            </div>
                                        </SwiperSlide>
                                        <SwiperSlide>
                                            <div className="card-testimonial background-card">
                                                <div className="card-info">
                                                    <p className="text-xl-bold card-title neutral-1000">Fast and Easy to Use</p>
                                                    <p className="text-md-regular neutral-500">I’ve used many car rental platforms before, but Carento’s booking system is hands down the best! The process is so smooth and straightforward.</p>
                                                </div>
                                                <div className="card-top pt-40 border-0 mb-0">
                                                    <div className="card-author">
                                                        <div className="card-image">
                                                            <img src="/assets/imgs/testimonials/testimonials-1/author-1.png" alt="Carento" />
                                                        </div>
                                                        <div className="card-info">
                                                            <p className="text-lg-bold neutral-1000">Sophia Moore</p>
                                                            <p className="text-md-regular neutral-1000">New York</p>
                                                        </div>
                                                    </div>
                                                    <div className="card-rate">
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                    </div>
                                                </div>
                                            </div>
                                        </SwiperSlide>
                                        <SwiperSlide>
                                            <div className="card-testimonial background-card">
                                                <div className="card-info">
                                                    <p className="text-xl-bold card-title neutral-1000">Super Convenient</p>
                                                    <p className="text-md-regular neutral-500">The booking system on this site is top-notch. Everything is laid out clearly, and there are multiple payment options, which makes things super convenient.</p>
                                                </div>
                                                <div className="card-top pt-40 border-0 mb-0">
                                                    <div className="card-author">
                                                        <div className="card-image">
                                                            <img src="/assets/imgs/testimonials/testimonials-1/author-2.png" alt="Carento" />
                                                        </div>
                                                        <div className="card-info">
                                                            <p className="text-lg-bold neutral-1000">Atend John</p>
                                                            <p className="text-md-regular neutral-1000">Tokyo</p>
                                                        </div>
                                                    </div>
                                                    <div className="card-rate">
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                    </div>
                                                </div>
                                            </div>
                                        </SwiperSlide>
                                        <SwiperSlide>
                                            <div className="card-testimonial background-card">
                                                <div className="card-info">
                                                    <p className="text-xl-bold card-title neutral-1000">Great Features and Process</p>
                                                    <p className="text-md-regular neutral-500">I was impressed by the range of features available when booking. The calendar tool for selecting dates was especially useful, and I appreciated the live availability feature.</p>
                                                </div>
                                                <div className="card-top pt-40 border-0 mb-0">
                                                    <div className="card-author">
                                                        <div className="card-image">
                                                            <img src="/assets/imgs/testimonials/testimonials-1/author-3.png" alt="Carento" />
                                                        </div>
                                                        <div className="card-info">
                                                            <p className="text-lg-bold neutral-1000">Sara Mohamed</p>
                                                            <p className="text-md-regular neutral-1000">Jakatar</p>
                                                        </div>
                                                    </div>
                                                    <div className="card-rate">
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                    </div>
                                                </div>
                                            </div>
                                        </SwiperSlide>
                                        <SwiperSlide>
                                            <div className="card-testimonial background-card">
                                                <div className="card-info">
                                                    <p className="text-xl-bold card-title neutral-1000">Easy to Understand</p>
                                                    <p className="text-md-regular neutral-500">The attention to detail in the booking process made our trip stress-free, allowing us to focus on creating lasting memories together.</p>
                                                </div>
                                                <div className="card-top pt-40 border-0 mb-0">
                                                    <div className="card-author">
                                                        <div className="card-image">
                                                            <img src="/assets/imgs/testimonials/testimonials-1/author-1.png" alt="Carento" />
                                                        </div>
                                                        <div className="card-info">
                                                            <p className="text-lg-bold neutral-1000">Sara Mohamed</p>
                                                            <p className="text-md-regular neutral-1000">Jakatar</p>
                                                        </div>
                                                    </div>
                                                    <div className="card-rate">
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" />
                                                    </div>
                                                </div>
                                            </div>
                                        </SwiperSlide>
                                    </div>
                                </Swiper>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
