import CounterUp from '@/components/elements/CounterUp'
import Layout from "@/components/layout/Layout"
import { swiperGroup1, swiperGroup3, swiperGroupAnimate } from '@/util/swiperOptions'
import Link from "@/components/common/Link"
import { Swiper, SwiperSlide } from "swiper/react"
export default function Services() {

	return (
		<>

			<Layout footerStyle={1}>
				<div>
					<div className="page-header pt-30 background-body">
						<div className="custom-container position-relative mx-auto">
							<div className="bg-overlay rounded-12 overflow-hidden">
								<img className="w-100 h-100 img-banner" src="/assets/imgs/page-header/banner1.png" alt="Carento" />
							</div>
							<div className="container position-absolute z-1 top-50 start-50 translate-middle">
								<h2 className="text-white">Our Services</h2>
								<span className="text-white text-xl-medium">Perfect service, top experts</span>
							</div>
							<div className="background-body position-absolute z-1 top-100 start-50 translate-middle px-3 py-2 rounded-12 border d-flex gap-3 @@navigation-page">
								<Link href="/" className="neutral-700 text-md-medium">Home</Link>
								<span>
									<img src="/assets/imgs/template/icons/arrow-right.svg" alt="Carento" />
								</span>
								<Link href="#" className="neutral-1000 text-md-bold">Services</Link>
							</div>
						</div>
					</div>
					{/* services list 1 */}
					<section className="section-box background-body py-96">
						<div className="container">
							<div className="row align-items-end">
								<div className="col-lg-7">
									<h3 className="neutral-1000">Comprehensive <span className="text-primary">Car Rental</span> Services to Meet All Your Needs</h3>
								</div>
								<div className="col-lg-5">
									<p className="text-lg-medium neutral-500">From daily rentals to long-term solutions, we offer a comprehensive range of vehicles and services to suit every need and budget.</p>
								</div>
							</div>
							<div className="row mt-50">
								<div className="col-lg-4 col-md-6">
									<div className="card-news background-card hover-up mb-24">
										<div className="card-image">
											<img src="/assets/imgs/services/services-list-1/img-1.png" alt="Carento" />
										</div>
										<div className="card-info">
											<div className="card-title mb-3">
												<Link className="text-xl-bold neutral-1000" href="/blog-details">Daily and Weekly Car Rentals</Link>
												<p className="text-md-medium neutral-500 mt-2">Flexible rental options available for both short-term and weekly needs, ideal for vacations or business trips.</p>
											</div>
											<div className="card-program">
												<div className="endtime">
													<div className="card-button"><Link className="btn btn-primary2" href="/blog-details">View Details</Link></div>
												</div>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-md-6">
									<div className="card-news background-card hover-up mb-24">
										<div className="card-image">
											<img src="/assets/imgs/services/services-list-1/img-2.png" alt="Carento" />
										</div>
										<div className="card-info">
											<div className="card-title mb-3">
												<Link className="text-xl-bold neutral-1000" href="/blog-details">Long-Term Rentals</Link>
												<p className="text-md-medium neutral-500 mt-2">Convenient and cost-effective solutions for those needing a vehicle for an extended period, with discounted rates.</p>
											</div>
											<div className="card-program">
												<div className="endtime">
													<div className="card-button"><Link className="btn btn-primary2" href="/blog-details">View Details</Link></div>
												</div>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-md-6">
									<div className="card-news background-card hover-up mb-24">
										<div className="card-image">
											<img src="/assets/imgs/services/services-list-1/img-3.png" alt="Carento" />
										</div>
										<div className="card-info">
											<div className="card-title mb-3">
												<Link className="text-xl-bold neutral-1000" href="/blog-details">Luxury Car Rentals</Link>
												<p className="text-md-medium neutral-500 mt-2">Drive in style with our selection of high-end vehicles, perfect for special occasions or executive travel.</p>
											</div>
											<div className="card-program">
												<div className="endtime">
													<div className="card-button"><Link className="btn btn-primary2" href="/blog-details">View Details</Link></div>
												</div>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-md-6">
									<div className="card-news background-card hover-up mb-24">
										<div className="card-image">
											<img src="/assets/imgs/services/services-list-1/img-4.png" alt="Carento" />
										</div>
										<div className="card-info">
											<div className="card-title mb-3">
												<Link className="text-xl-bold neutral-1000" href="/blog-details">VIP Transfer Services</Link>
												<p className="text-md-medium neutral-500 mt-2">Flexible rental options available for both short-term and weekly needs, ideal for vacations or business trips.</p>
											</div>
											<div className="card-program">
												<div className="endtime">
													<div className="card-button"><Link className="btn btn-primary2" href="/blog-details">View Details</Link></div>
												</div>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-md-6">
									<div className="card-news background-card hover-up mb-24">
										<div className="card-image">
											<img src="/assets/imgs/services/services-list-1/img-5.png" alt="Carento" />
										</div>
										<div className="card-info">
											<div className="card-title mb-3">
												<Link className="text-xl-bold neutral-1000" href="/blog-details">Chauffeur Services</Link>
												<p className="text-md-medium neutral-500 mt-2">Flexible rental options available for both short-term and weekly needs, ideal for vacations or business trips.</p>
											</div>
											<div className="card-program">
												<div className="endtime">
													<div className="card-button"><Link className="btn btn-primary2" href="/blog-details">View Details</Link></div>
												</div>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-md-6">
									<div className="card-news background-card hover-up mb-24">
										<div className="card-image">
											<img src="/assets/imgs/services/services-list-1/img-6.png" alt="Carento" />
										</div>
										<div className="card-info">
											<div className="card-title mb-3">
												<Link className="text-xl-bold neutral-1000" href="/blog-details">Airport Meet and Greet</Link>
												<p className="text-md-medium neutral-500 mt-2">Flexible rental options available for both short-term and weekly needs, ideal for vacations or business trips.</p>
											</div>
											<div className="card-program">
												<div className="endtime">
													<div className="card-button"><Link className="btn btn-primary2" href="/blog-details">View Details</Link></div>
												</div>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-md-6">
									<div className="card-news background-card hover-up mb-24">
										<div className="card-image">
											<img src="/assets/imgs/services/services-list-1/img-7.png" alt="Carento" />
										</div>
										<div className="card-info">
											<div className="card-title mb-3">
												<Link className="text-xl-bold neutral-1000" href="/blog-details">Concierge Services</Link>
												<p className="text-md-medium neutral-500 mt-2">Flexible rental options available for both short-term and weekly needs, ideal for vacations or business trips.</p>
											</div>
											<div className="card-program">
												<div className="endtime">
													<div className="card-button"><Link className="btn btn-primary2" href="/blog-details">View Details</Link></div>
												</div>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-md-6">
									<div className="card-news background-card hover-up mb-24">
										<div className="card-image">
											<img src="/assets/imgs/services/services-list-1/img-8.png" alt="Carento" />
										</div>
										<div className="card-info">
											<div className="card-title mb-3">
												<Link className="text-xl-bold neutral-1000" href="/blog-details">Roadside Assistance</Link>
												<p className="text-md-medium neutral-500 mt-2">Flexible rental options available for both short-term and weekly needs, ideal for vacations or business trips.</p>
											</div>
											<div className="card-program">
												<div className="endtime">
													<div className="card-button"><Link className="btn btn-primary2" href="/blog-details">View Details</Link></div>
												</div>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-md-6">
									<div className="card-news background-card hover-up mb-24">
										<div className="card-image">
											<img src="/assets/imgs/services/services-list-1/img-9.png" alt="Carento" />
										</div>
										<div className="card-info">
											<div className="card-title mb-3">
												<Link className="text-xl-bold neutral-1000" href="/blog-details">Customizable Rental Packages</Link>
												<p className="text-md-medium neutral-500 mt-2">Flexible rental options available for both short-term and weekly needs, ideal for vacations or business trips.</p>
											</div>
											<div className="card-program">
												<div className="endtime">
													<div className="card-button"><Link className="btn btn-primary2" href="/blog-details">View Details</Link></div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</section>
					{/* banners 3 */}
					<section className="section-box-banner-3 banner-2 background-body">
						<div className="container pt-110 pb-110 position-relative z-1">
							<div className="row justify-content-center">
								<div className="col-auto text-center wow fadeInUp justify-content-center d-flex flex-column align-items-center">
									<h2 className="text-white">Best Car Rent Deals</h2>
									<h6 className="text-white">
										Save 15% or more when you book and ride <br />
										before 1 April 2025
									</h6>
									<Link className="btn btn-primary rounded-pill btn-lg mt-20" href="#">
										Find Early 2025 Deals
										<svg xmlns="http://www.w3.org/2000/svg" width={25} height={24} viewBox="0 0 25 24" fill="none">
											<path d="M12.5 19L19.5 12L12.5 5M19.5 12L5.5 12" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
										</svg>
									</Link>
								</div>
							</div>
						</div>
					</section>
					{/* testimonials */}
					<section className="section-box py-96 background-body">
						<div className="container">
							<div className="row">
								<div className="col-auto mx-auto wow fadeInUp text-center d-flex flex-column align-items-center justify-content-center">
									<div className="box-author-testimonials background-100">
										<img src="/assets/imgs/page/homepage1/testimonial.png" alt="Carento" />
										<img src="/assets/imgs/page/homepage1/testimonial2.png" alt="Carento" />
										<img src="/assets/imgs/page/homepage1/testimonial3.png" alt="Carento" />
										Testimonials
									</div>
									<h3 className="mt-8 mb-15 neutral-1000">What they say about us?</h3>
								</div>
							</div>
						</div>
						<div className="block-testimonials wow fadeIn ps-0 mask-image">
							<div className="container-testimonials ">
								<div className="container-slider ps-0">
									<div className="box-swiper mt-30">
										<Swiper {...swiperGroupAnimate} className="swiper-container swiper-group-animate swiper-group-journey">
											<div className="swiper-wrapper">
												<SwiperSlide className="swiper-slide">
													<div className="card-testimonial background-card">
														<div className="card-info">
															<p className="text-xl-bold card-title neutral-1000">No Hidden Fees</p>
															<p className="text-md-regular neutral-500">The attention to detail in the booking process made our trip stress-free, allowing us to focus on creating lasting memories together.</p>
														</div>
														<div className="card-top pt-40 border-0 mb-0">
															<div className="card-author">
																<div className="card-image"><img src="/assets/imgs/testimonials/testimonials-1/author-1.png" alt="Carento" /></div>
																<div className="card-info">
																	<p className="text-lg-bold neutral-1000">Sophia Moore</p>
																	<p className="text-md-regular neutral-1000">New York</p>
																</div>
															</div>
															<div className="card-rate"><img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" /><img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" /><img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" /><img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" /><img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" /></div>
														</div>
													</div>
												</SwiperSlide>
												<SwiperSlide className="swiper-slide">
													<div className="card-testimonial background-card">
														<div className="card-info">
															<p className="text-xl-bold card-title neutral-1000">Mobile-Friendly and Fast!</p>
															<p className="text-md-regular neutral-500">Embarking on our dream vacation was made a breeze through the seamless coordination of items and hotels using this exceptional booking platform.</p>
														</div>
														<div className="card-top pt-40 border-0 mb-0">
															<div className="card-author">
																<div className="card-image"><img src="/assets/imgs/testimonials/testimonials-1/author-2.png" alt="Carento" /></div>
																<div className="card-info">
																	<p className="text-lg-bold neutral-1000">Atend John</p>
																	<p className="text-md-regular neutral-1000">Paris</p>
																</div>
															</div>
															<div className="card-rate"><img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" /><img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" /><img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" /><img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" /><img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" /></div>
														</div>
													</div>
												</SwiperSlide>
												<SwiperSlide className="swiper-slide">
													<div className="card-testimonial background-card">
														<div className="card-info">
															<p className="text-xl-bold card-title neutral-1000">Excellent Customer Service</p>
															<p className="text-md-regular neutral-500">The overall process was not just efficient but also enriching, as the platform's intuitive design and user-friendly interface made every step enjoyable.</p>
														</div>
														<div className="card-top pt-40 border-0 mb-0">
															<div className="card-author">
																<div className="card-image"><img src="/assets/imgs/testimonials/testimonials-1/author-3.png" alt="Carento" /></div>
																<div className="card-info">
																	<p className="text-lg-bold neutral-1000">Sara Mohamed</p>
																	<p className="text-md-regular neutral-1000">Jakatar</p>
																</div>
															</div>
															<div className="card-rate"><img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" /><img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" /><img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" /><img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" /><img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" /></div>
														</div>
													</div>
												</SwiperSlide>
												<SwiperSlide className="swiper-slide">
													<div className="card-testimonial background-card">
														<div className="card-info">
															<p className="text-xl-bold card-title neutral-1000">Highly Flexible and Customizable</p>
															<p className="text-md-regular neutral-500">The attention to detail in the booking process made our trip stress-free, allowing us to focus on creating lasting memories together.</p>
														</div>
														<div className="card-top pt-40 border-0 mb-0">
															<div className="card-author">
																<div className="card-image"><img src="/assets/imgs/testimonials/testimonials-1/author-1.png" alt="Carento" /></div>
																<div className="card-info">
																	<p className="text-lg-bold neutral-1000">Sara Mohamed</p>
																	<p className="text-md-regular neutral-1000">Jakatar</p>
																</div>
															</div>
															<div className="card-rate"><img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" /><img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" /><img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" /><img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" /><img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-black.svg" alt="Carento" /></div>
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
					{/* cta 10*/}
					<section className="section-cta-7 background-body">
						<div className="box-cta-6">
							<div className="container">
								<div className="row align-items-center">
									<div className="col-lg-6">
										<div className="box-swiper">
											<Swiper {...swiperGroup1} className="swiper-container swiper-group-1">
												<div className="swiper-wrapper">
													<SwiperSlide className="swiper-slide">
														<img className="rounded-12" src="/assets/imgs/cta/cta-10/img-1.png" alt="Carento" />
													</SwiperSlide>
													<SwiperSlide className="swiper-slide">
														<img className="rounded-12" src="/assets/imgs/cta/cta-10/img-1.png" alt="Carento" />
													</SwiperSlide>
												</div>
												<div className="position-absolute end-0 bottom-0 p-40">
													<div className="box-button-slider box-button-slider-team justify-content-end">
														<div className="swiper-button-prev swiper-button-prev-style-1 swiper-button-prev-2" tabIndex={0} role="button" aria-label="Previous slide" aria-controls="swiper-wrapper-9c1b729b91027a37b">
															<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16" fill="none">
																<path d="M7.99992 3.33325L3.33325 7.99992M3.33325 7.99992L7.99992 12.6666M3.33325 7.99992H12.6666" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</div>
														<div className="swiper-button-next swiper-button-next-style-1 swiper-button-next-2" tabIndex={0} role="button" aria-label="Next slide" aria-controls="swiper-wrapper-9c1b729b91027a37b">
															<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16" fill="none">
																<path d="M7.99992 12.6666L12.6666 7.99992L7.99992 3.33325M12.6666 7.99992L3.33325 7.99992" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</div>
													</div>
												</div>
											</Swiper>
										</div>
									</div>
									<div className="col-lg-6 ps-lg-5 mt-lg-0 mt-4">
										<h4 className="mb-4 neutral-1000">Plan Your Trip with Us</h4>
										<p className="text-lg-medium neutral-500 mb-4">Let us help you make your next journey smooth and enjoyable—get started today.</p>
										<div className="row">
											<div className="col">
												<ul className="list-ticks-green list-ticks-green-2">
													<li className="neutral-1000 pe-0">Detailed vehicle descriptions and images</li>
													<li className="neutral-1000 pe-0">Filter options by vehicle type, size, and features</li>
													<li className="neutral-1000 pe-0">Availability information in real-time</li>
												</ul>
											</div>
										</div>
										<Link className="btn btn-primary mt-2" href="#">
											Get Started Now
											<svg width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
												<path d="M8 15L15 8L8 1M15 8L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
											</svg>
										</Link>
									</div>
								</div>
							</div>
							<div className="bg-overlay position-absolute bottom-0 end-0 h-75 background-brand-2 opacity-25 z-0 rounded-start-pill" />
						</div>
					</section>
					{/* Static 1 */}
					<section className="section-static-1 background-body border-bottom">
						<div className="container">
							<div className="row">
								<div className="pt-65 pb-96">
									<div className="wow fadeIn">
										<div className="d-flex align-items-center justify-content-around flex-wrap">
											<div className="mb-4 mb-lg-0 d-block px-lg-5 px-3">
												<div className="d-flex justify-content-center justify-content-md-start">
													<h3 className="count neutral-1000"><CounterUp count={45} /></h3>
													<h3 className="neutral-1000">+</h3>
												</div>
												<div className="text-md-start text-center">
													<p className="text-lg-bold neutral-1000">Global</p>
													<p className="text-lg-bold neutral-1000">Branches</p>
												</div>
											</div>
											<div className="mb-4 mb-lg-0 d-block px-lg-5 px-3">
												<div className="d-flex justify-content-center justify-content-md-start">
													<h3 className="count neutral-1000"><CounterUp count={29} /></h3>
													<h3 className="neutral-1000">K</h3>
												</div>
												<div className="text-md-start text-center">
													<p className="text-lg-bold neutral-1000">Destinations</p>
													<p className="text-lg-bold neutral-1000">Collaboration</p>
												</div>
											</div>
											<div className="mb-4 mb-lg-0 d-block px-lg-5 px-3">
												<div className="d-flex justify-content-center justify-content-md-start">
													<h3 className="count neutral-1000"><CounterUp count={20} /></h3>
													<h3 className="neutral-1000">+</h3>
												</div>
												<div className="text-md-start text-center">
													<p className="text-lg-bold neutral-1000">Years</p>
													<p className="text-lg-bold neutral-1000">Experience</p>
												</div>
											</div>
											<div className="mb-4 mb-lg-0 d-block px-lg-5 px-3">
												<div className="d-flex justify-content-center justify-content-md-start">
													<h3 className="count neutral-1000"><CounterUp count={168} /></h3>
													<h3 className="neutral-1000">K</h3>
												</div>
												<div className="text-md-start text-center">
													<p className="text-lg-bold neutral-1000">Happy</p>
													<p className="text-lg-bold neutral-1000">Customers</p>
												</div>
											</div>
											<div className="mb-4 mb-lg-0 d-block px-lg-5 px-3">
												<div className="d-flex justify-content-center justify-content-md-start">
													<h3 className="count neutral-1000"><CounterUp count={15} /></h3>
													<h3 className="neutral-1000">M</h3>
												</div>
												<div className="text-md-start text-center">
													<p className="text-lg-bold neutral-1000">User</p>
													<p className="text-lg-bold neutral-1000">Account</p>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</section>
					{/* blog-1 */}
					<section className="section-box box-news background-body">
						<div className="container">
							<div className="row align-items-end">
								<div className="col-md-9 mb-30 wow fadeInUp">
									<h3 className="title-svg neutral-1000 mb-15">Upcoming Cars &amp; Events</h3>
									<p className="text-lg-medium text-bold neutral-500">Stay ahead with the latest car releases and upcoming events</p>
								</div>
								<div className="col-md-3 position-relative mb-30 wow fadeInUp">
									<div className="box-button-slider box-button-slider-team justify-content-end">
										<div className="swiper-button-prev swiper-button-prev-style-1 swiper-button-prev-2" tabIndex={0} role="button" aria-label="Previous slide" aria-controls="swiper-wrapper-f147def6ba09c37a">
											<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16" fill="none">
												<path d="M7.99992 3.33325L3.33325 7.99992M3.33325 7.99992L7.99992 12.6666M3.33325 7.99992H12.6666" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
											</svg>
										</div>
										<div className="swiper-button-next swiper-button-next-style-1 swiper-button-next-2" tabIndex={0} role="button" aria-label="Next slide" aria-controls="swiper-wrapper-f147def6ba09c37a">
											<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16" fill="none">
												<path d="M7.99992 12.6666L12.6666 7.99992L7.99992 3.33325M12.6666 7.99992L3.33325 7.99992" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
											</svg>
										</div>
									</div>
								</div>
							</div>
							<div className="box-list-news wow fadeInUp mt-5">
								<div className="box-swiper">
									<Swiper {...swiperGroup3} className="swiper-container swiper-group-3">
										<div className="swiper-wrapper">
											<SwiperSlide className="swiper-slide pt-2">
												<div className="card-news background-card hover-up">
													<div className="card-image">
														<Link href="/blog-details">
															<img src="/assets/imgs/blog/blog-1/img-1.png" alt="Carento" />
														</Link>
													</div>
													<div className="card-info">
														<Link className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold" href="/blog-grid">News</Link>
														<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
														<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">2025 Cadillac Escalade costs more money </Link></div>
														<div className="card-program">
															<div className="endtime">
																<div className="card-author">
																	<img src="/assets/imgs/blog/blog-1/avatar-1.png" alt="Carento" />
																	<p className="text-sm-bold neutral-1000">Jimmy Dave</p>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
															</div>
														</div>
													</div>
												</div>
											</SwiperSlide>
											<SwiperSlide className="swiper-slide pt-2">
												<div className="card-news background-card hover-up">
													<div className="card-image">
														<Link href="/blog-details">
															<img src="/assets/imgs/blog/blog-1/img-2.png" alt="Carento" />
														</Link>
													</div>
													<div className="card-info">
														<Link className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold" href="/blog-grid">Trend</Link>
														<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
														<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">2025 BMW 5 Series Review: A balanced luxury sedan</Link></div>
														<div className="card-program">
															<div className="endtime">
																<div className="card-author">
																	<img src="/assets/imgs/blog/blog-1/avatar-2.png" alt="Carento" />
																	<p className="text-sm-bold neutral-1000">Steven Job</p>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
															</div>
														</div>
													</div>
												</div>
											</SwiperSlide>
											<SwiperSlide className="swiper-slide pt-2">
												<div className="card-news background-card hover-up">
													<div className="card-image">
														<Link href="/blog-details">
															<img src="/assets/imgs/blog/blog-1/img-3.png" alt="Carento" />
														</Link>
													</div>
													<div className="card-info">
														<Link className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold" href="/blog-grid">Discovery</Link>
														<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
														<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">2025 Ruf Rodeo is ready to wrangle some rough roads</Link></div>
														<div className="card-program">
															<div className="endtime">
																<div className="card-author">
																	<img src="/assets/imgs/blog/blog-1/avatar-3.png" alt="Carento" />
																	<p className="text-sm-bold neutral-1000">David Jame</p>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
															</div>
														</div>
													</div>
												</div>
											</SwiperSlide>
											<SwiperSlide className="swiper-slide pt-2">
												<div className="card-news background-card hover-up">
													<div className="card-image">
														<Link href="/blog-details">
															<img src="/assets/imgs/blog/blog-1/img-1.png" alt="Carento" />
														</Link>
													</div>
													<div className="card-info">
														<Link className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold" href="/blog-grid">News</Link>
														<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
														<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">2025 Cadillac Escalade costs more money </Link></div>
														<div className="card-program">
															<div className="endtime">
																<div className="card-author">
																	<img src="/assets/imgs/blog/blog-1/avatar-1.png" alt="Carento" />
																	<p className="text-sm-bold neutral-1000">Jimmy Dave</p>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
															</div>
														</div>
													</div>
												</div>
											</SwiperSlide>
											<SwiperSlide className="swiper-slide pt-2">
												<div className="card-news background-card hover-up">
													<div className="card-image">
														<Link href="/blog-details">
															<img src="/assets/imgs/blog/blog-1/img-2.png" alt="Carento" />
														</Link>
													</div>
													<div className="card-info">
														<Link className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold" href="/blog-grid">Trend</Link>
														<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
														<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">2025 BMW 5 Series Review: A balanced luxury sedan</Link></div>
														<div className="card-program">
															<div className="endtime">
																<div className="card-author">
																	<img src="/assets/imgs/blog/blog-1/avatar-2.png" alt="Carento" />
																	<p className="text-sm-bold neutral-1000">Steven Job</p>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
															</div>
														</div>
													</div>
												</div>
											</SwiperSlide>
											<SwiperSlide className="swiper-slide pt-2">
												<div className="card-news background-card hover-up">
													<div className="card-image">
														<Link href="/blog-details">
															<img src="/assets/imgs/blog/blog-1/img-3.png" alt="Carento" />
														</Link>
													</div>
													<div className="card-info">
														<Link className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold" href="/blog-grid">Discovery</Link>
														<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
														<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">2025 Ruf Rodeo is ready to wrangle some rough roads</Link></div>
														<div className="card-program">
															<div className="endtime">
																<div className="card-author">
																	<img src="/assets/imgs/blog/blog-1/avatar-3.png" alt="Carento" />
																	<p className="text-sm-bold neutral-1000">David Jame</p>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
															</div>
														</div>
													</div>
												</div>
											</SwiperSlide>
										</div>
									</Swiper>
								</div>
							</div>
						</div>
					</section>
				</div>

			</Layout>
		</>
	)
}