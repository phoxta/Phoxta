import { Swiper, SwiperSlide } from "swiper/react";
import Link from "@/components/common/Link"
import { swiperGroup2 } from '@/util/swiperOptions'

export default function Blog2() {
	return (
		<>

			<section className="section-box background-body pb-85">
				<div className="container">
					<div className="row align-items-end">
						<div className="col-md-9 mb-30 wow fadeInUp">
							<h3 className="title-svg neutral-1000 mb-15 wow fadeInUp">Inside &amp; Trending</h3>
							<p className="text-lg-medium text-bold neutral-500 wow fadeInUp">The latest news and events</p>
						</div>
						<div className="col-md-3 position-relative mb-30 wow fadeInUp">
							<div className="box-button-slider box-button-slider-team justify-content-end">
								<div className="swiper-button-prev swiper-button-prev-style-1 swiper-button-prev-2">
									<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16" fill="none">
										<path d="M7.99992 3.33325L3.33325 7.99992M3.33325 7.99992L7.99992 12.6666M3.33325 7.99992H12.6666" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</div>
								<div className="swiper-button-next swiper-button-next-style-1 swiper-button-next-2">
									<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16" fill="none">
										<path d="M7.99992 12.6666L12.6666 7.99992L7.99992 3.33325M12.6666 7.99992L3.33325 7.99992" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</div>
							</div>
						</div>
					</div>
					<div className="box-list-news wow fadeInUp mt-5">
						<div className="box-swiper">
							<Swiper {...swiperGroup2} className="swiper-container swiper-group-2">
								<div className="swiper-wrapper">
									<SwiperSlide className="swiper-slide pb-4 pt-2">
										<div className="card-news background-card hover-up d-md-flex mb-4">
											<div className="card-image">
												<Link href="/blog-details">
													<img className="w-100" src="/assets/imgs/blog/blog-2/img-1.png" alt="Carento" />
												</Link>
											</div>
											<div className="card-info mt-0 w-68 px-4">
												<div className="card-title mb-2">
													<Link className="text-xl-bold neutral-1000" href="/blog-details">
														<h6>The Art of Living: A Stylish Tech Odyssey</h6>
													</Link>
												</div>
												<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
												<p className="text-md-medium neutral-500">The dark wood paneling and furnishings, deluxe red-draped</p>
												<div className="card-program">
													<div className="endtime mt-4">
														<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
													</div>
												</div>
											</div>
										</div>
										<div className="card-news background-card hover-up d-md-flex mb-4">
											<div className="card-image">
												<Link href="/blog-details">
													<img className="w-100" src="/assets/imgs/blog/blog-2/img-2.png" alt="Carento" />
												</Link>
											</div>
											<div className="card-info mt-0 w-68 px-4">
												<div className="card-title mb-2">
													<Link className="text-xl-bold neutral-1000" href="/blog-details">
														<h6>The Art of Living: A Stylish Tech Odyssey</h6>
													</Link>
												</div>
												<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
												<p className="text-md-medium neutral-500">The dark wood paneling and furnishings, deluxe red-draped</p>
												<div className="card-program">
													<div className="endtime mt-4">
														<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
													</div>
												</div>
											</div>
										</div>
									</SwiperSlide>
									<SwiperSlide className="swiper-slide pb-4 pt-2">
										<div className="card-news background-card hover-up d-md-flex mb-4">
											<div className="card-image">
												<Link href="/blog-details">
													<img className="w-100" src="/assets/imgs/blog/blog-2/img-3.png" alt="Carento" />
												</Link>
											</div>
											<div className="card-info mt-0 w-68 px-4">
												<div className="card-title mb-2">
													<Link className="text-xl-bold neutral-1000" href="/blog-details">
														<h6>The Art of Living: A Stylish Tech Odyssey</h6>
													</Link>
												</div>
												<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
												<p className="text-md-medium neutral-500">The dark wood paneling and furnishings, deluxe red-draped</p>
												<div className="card-program">
													<div className="endtime mt-4">
														<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
													</div>
												</div>
											</div>
										</div>
										<div className="card-news background-card hover-up d-md-flex mb-4">
											<div className="card-image">
												<Link href="/blog-details">
													<img className="w-100" src="/assets/imgs/blog/blog-2/img-4.png" alt="Carento" />
												</Link>
											</div>
											<div className="card-info mt-0 w-68 px-4">
												<div className="card-title mb-2">
													<Link className="text-xl-bold neutral-1000" href="/blog-details">
														<h6>The Art of Living: A Stylish Tech Odyssey</h6>
													</Link>
												</div>
												<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
												<p className="text-md-medium neutral-500">The dark wood paneling and furnishings, deluxe red-draped</p>
												<div className="card-program">
													<div className="endtime mt-4">
														<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
													</div>
												</div>
											</div>
										</div>
									</SwiperSlide>
									<SwiperSlide className="swiper-slide pb-4 pt-2">
										<div className="card-news background-card hover-up d-md-flex mb-4">
											<div className="card-image">
												<Link href="/blog-details">
													<img className="w-100" src="/assets/imgs/blog/blog-2/img-1.png" alt="Carento" />
												</Link>
											</div>
											<div className="card-info mt-0 w-68 px-4">
												<div className="card-title mb-2">
													<Link className="text-xl-bold neutral-1000" href="/blog-details">
														<h6>The Art of Living: A Stylish Tech Odyssey</h6>
													</Link>
												</div>
												<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
												<p className="text-md-medium neutral-500">The dark wood paneling and furnishings, deluxe red-draped</p>
												<div className="card-program">
													<div className="endtime mt-4">
														<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
													</div>
												</div>
											</div>
										</div>
										<div className="card-news background-card hover-up d-md-flex mb-4">
											<div className="card-image">
												<Link href="/blog-details">
													<img className="w-100" src="/assets/imgs/blog/blog-2/img-2.png" alt="Carento" />
												</Link>
											</div>
											<div className="card-info mt-0 w-68 px-4">
												<div className="card-title mb-2">
													<Link className="text-xl-bold neutral-1000" href="/blog-details">
														<h6>The Art of Living: A Stylish Tech Odyssey</h6>
													</Link>
												</div>
												<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
												<p className="text-md-medium neutral-500">The dark wood paneling and furnishings, deluxe red-draped</p>
												<div className="card-program">
													<div className="endtime mt-4">
														<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
													</div>
												</div>
											</div>
										</div>
									</SwiperSlide>
									<SwiperSlide className="swiper-slide pb-4 pt-2">
										<div className="card-news background-card hover-up d-md-flex mb-4">
											<div className="card-image">
												<Link href="/blog-details">
													<img className="w-100" src="/assets/imgs/blog/blog-2/img-3.png" alt="Carento" />
												</Link>
											</div>
											<div className="card-info mt-0 w-68 px-4">
												<div className="card-title mb-2">
													<Link className="text-xl-bold neutral-1000" href="/blog-details">
														<h6>The Art of Living: A Stylish Tech Odyssey</h6>
													</Link>
												</div>
												<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
												<p className="text-md-medium neutral-500">The dark wood paneling and furnishings, deluxe red-draped</p>
												<div className="card-program">
													<div className="endtime mt-4">
														<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
													</div>
												</div>
											</div>
										</div>
										<div className="card-news background-card hover-up d-md-flex mb-4">
											<div className="card-image">
												<Link href="/blog-details">
													<img className="w-100" src="/assets/imgs/blog/blog-2/img-4.png" alt="Carento" />
												</Link>
											</div>
											<div className="card-info mt-0 w-68 px-4">
												<div className="card-title mb-2">
													<Link className="text-xl-bold neutral-1000" href="/blog-details">
														<h6>The Art of Living: A Stylish Tech Odyssey</h6>
													</Link>
												</div>
												<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
												<p className="text-md-medium neutral-500">The dark wood paneling and furnishings, deluxe red-draped</p>
												<div className="card-program">
													<div className="endtime mt-4">
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
