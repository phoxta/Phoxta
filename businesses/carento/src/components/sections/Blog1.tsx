import { Swiper, SwiperSlide } from "swiper/react";
import Link from "@/components/common/Link"
import { swiperGroup3 } from '@/util/swiperOptions'

export default function Blog1() {
	return (
		<>

			<section className="section-box box-news background-body">
				<div className="container">
					<div className="row align-items-end">
						<div className="col-md-9 mb-30 wow fadeInUp">
							<h3 className="title-svg neutral-1000 mb-15">Upcoming Cars &amp; Events</h3>
							<p className="text-lg-medium text-bold neutral-500">Stay ahead with the latest car releases and
								upcoming events</p>
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
												<div className="card-meta"><span className="post-date neutral-1000">18 Sep
													2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
												<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">2025 Cadillac Escalade costs more money
												</Link></div>
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
												<div className="card-meta"><span className="post-date neutral-1000">18 Sep
													2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
												<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">2025 BMW 5 Series Review: A balanced luxury
													sedan</Link></div>
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
												<div className="card-meta"><span className="post-date neutral-1000">18 Sep
													2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
												<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">2025 Ruf Rodeo is ready to wrangle some
													rough roads</Link></div>
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
												<div className="card-meta"><span className="post-date neutral-1000">18 Sep
													2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
												<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">2025 Cadillac Escalade costs more money
												</Link></div>
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
												<div className="card-meta"><span className="post-date neutral-1000">18 Sep
													2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
												<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">2025 BMW 5 Series Review: A balanced luxury
													sedan</Link></div>
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
												<div className="card-meta"><span className="post-date neutral-1000">18 Sep
													2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
												<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">2025 Ruf Rodeo is ready to wrangle some
													rough roads</Link></div>
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
		</>
	)
}
