import Layout from "@/components/layout/Layout"
import { swiperGroup1 } from '@/util/swiperOptions'
import Link from "@/components/common/Link"
import { Swiper, SwiperSlide } from "swiper/react"
export default function BlogGrid() {

	return (
		<>

			<Layout footerStyle={1}>
				<section className="box-section background-body pt-80">
					<div className="container">
						<div className="text-center  mb-40">
							<div className="background-body px-3 py-2 rounded-12 border d-flex gap-3 d-inline-flex">
								<Link href="/" className="neutral-700 text-md-medium">Home</Link>
								<span>
									<img src="/assets/imgs/template/icons/arrow-right.svg" alt="Carento" />
								</span>
								<Link href="#" className="neutral-1000 text-md-bold">Blog</Link>
							</div>
							<h3 className="my-3 neutral-1000">Inside &amp; Trending</h3>
						</div>
						<div className="box-swiper">
							<Swiper {...swiperGroup1} className="swiper-container swiper-group-1 position-relative">
								<div className="swiper-wrapper">
									<SwiperSlide>
										<div className="item-banner-slide-review d-flex align-items-center rounded-12">
											<div className="ps-md-5 ps-2 position-relative z-1">
												<span className="text-primary text-md-bold">Road Trips</span>
												<h3 className="mt-20 mb-20 color-white">
													How to Choose the Perfect <br className="d-none d-md-block" />
													Rental Car for Your Trip
												</h3>
												<div className="card-meta-user">
													<div className="box-author-small">
														<img src="/assets/imgs/blog/blog-grid/avatar.png" alt="carento" />
														<p className="text-sm-bold">By Jimmy Dave</p>
													</div>
													<div className="date-post">
														<p className="text-sm-medium">12 January 2024</p>
													</div>
												</div>
												<p className="text-lg-medium color-white mt-3">
													The Tucson Plug-in Hybrid is easy to drive and provides a <br />
													sufficient all-electric range.
												</p>
											</div>
										</div>
									</SwiperSlide>
									<SwiperSlide>
										<div className="item-banner-slide-review banner2 d-flex align-items-center rounded-12">
											<div className="ps-md-5 ps-2 position-relative z-1">
												<span className="text-primary text-md-bold">Road Trips</span>
												<h3 className="mt-20 mb-20 color-white">
													How to Choose the Perfect <br className="d-none d-md-block" />
													Rental Car for Your Trip
												</h3>
												<div className="card-meta-user">
													<div className="box-author-small">
														<img src="/assets/imgs/blog/blog-grid/avatar.png" alt="carento" />
														<p className="text-sm-bold">By Jimmy Dave</p>
													</div>
													<div className="date-post">
														<p className="text-sm-medium">12 January 2024</p>
													</div>
												</div>
												<p className="text-lg-medium color-white mt-3">
													The Tucson Plug-in Hybrid is easy to drive and provides a <br />
													sufficient all-electric range.
												</p>
											</div>
										</div>
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
						<div className="d-flex flex-wrap align-items-center justify-content-center gap-3 pt-55 pb-60">
							<span className="text-md-bold neutral-1000"> CATEGORY: </span>
							<Link href="#" className="btn btn-white px-3 py-2">Industry News</Link>
							<Link href="#" className="btn btn-white px-3 py-2">Rental Advice</Link>
							<Link href="#" className="btn btn-white px-3 py-2">Road Trips</Link>
							<Link href="#" className="btn btn-white px-3 py-2">Car Review</Link>
							<Link href="#" className="btn btn-white px-3 py-2">Travel Tips</Link>
							<Link href="#" className="btn btn-white px-3 py-2">Customer Stories</Link>
						</div>
						<h3 className="text-center mb-65 neutral-1000">Latest News</h3>
						<div className="row">
							<div className="col-lg-4 col-md-6 col-12">
								<div className="card-news background-card hover-up mb-4">
									<div className="card-image">
										<img src="/assets/imgs/blog/blog-grid/img-3.png" alt="Carento" />
									</div>
									<div className="card-info">
										<label className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold">Car Review</label>
										<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
										<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">The Continued Growth of Delivery and Ride share-2024</Link></div>
										<div className="card-program">
											<div className="endtime">
												<div className="card-author">
													<img className="rounded-circle border border-primary" src="/assets/imgs/blog/blog-grid/avatar1.png" alt="Carento" />
													<p className="text-sm-bold neutral-1000">Jimmy Dave</p>
												</div>
												<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="col-lg-4 col-md-6 col-12">
								<div className="card-news background-card hover-up mb-4">
									<div className="card-image">
										<img src="/assets/imgs/blog/blog-grid/img-4.png" alt="Carento" />
									</div>
									<div className="card-info">
										<label className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold">Travel Tips</label>
										<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
										<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">The Continued Growth of Delivery and Ride share-2024</Link></div>
										<div className="card-program">
											<div className="endtime">
												<div className="card-author">
													<img className="rounded-circle border border-primary" src="/assets/imgs/blog/blog-grid/avatar2.png" alt="Carento" />
													<p className="text-sm-bold neutral-1000">Jimmy Dave</p>
												</div>
												<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="col-lg-4 col-md-6 col-12">
								<div className="card-news background-card hover-up mb-4">
									<div className="card-image">
										<img src="/assets/imgs/blog/blog-grid/img-5.png" alt="Carento" />
									</div>
									<div className="card-info">
										<label className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold">Industry News</label>
										<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
										<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">The Continued Growth of Delivery and Ride share-2024</Link></div>
										<div className="card-program">
											<div className="endtime">
												<div className="card-author">
													<img className="rounded-circle border border-primary" src="/assets/imgs/blog/blog-grid/avatar3.png" alt="Carento" />
													<p className="text-sm-bold neutral-1000">Jimmy Dave</p>
												</div>
												<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="col-lg-4 col-md-6 col-12">
								<div className="card-news background-card hover-up mb-4">
									<div className="card-image">
										<img src="/assets/imgs/blog/blog-grid/img-6.png" alt="Carento" />
									</div>
									<div className="card-info">
										<label className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold">Car Updates</label>
										<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
										<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">The Continued Growth of Delivery and Ride share-2024</Link></div>
										<div className="card-program">
											<div className="endtime">
												<div className="card-author">
													<img className="rounded-circle border border-primary" src="/assets/imgs/blog/blog-grid/avatar4.png" alt="Carento" />
													<p className="text-sm-bold neutral-1000">Jimmy Dave</p>
												</div>
												<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="col-lg-4 col-md-6 col-12">
								<div className="card-news background-card hover-up mb-4">
									<div className="card-image">
										<img src="/assets/imgs/blog/blog-grid/img-7.png" alt="Carento" />
									</div>
									<div className="card-info">
										<label className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold">Rental Advice</label>
										<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
										<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">Top 10 Travel Hacks for Budget-Conscious Adventurers</Link></div>
										<div className="card-program">
											<div className="endtime">
												<div className="card-author">
													<img className="rounded-circle border border-primary" src="/assets/imgs/blog/blog-grid/avatar5.png" alt="Carento" />
													<p className="text-sm-bold neutral-1000">Jimmy Dave</p>
												</div>
												<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="col-lg-4 col-md-6 col-12">
								<div className="card-news background-card hover-up mb-4">
									<div className="card-image">
										<img src="/assets/imgs/blog/blog-grid/img-8.png" alt="Carento" />
									</div>
									<div className="card-info">
										<label className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold">Road Trips</label>
										<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
										<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">Top 10 Travel Hacks for Budget-Conscious Adventurers</Link></div>
										<div className="card-program">
											<div className="endtime">
												<div className="card-author">
													<img className="rounded-circle border border-primary" src="/assets/imgs/blog/blog-grid/avatar6.png" alt="Carento" />
													<p className="text-sm-bold neutral-1000">Jimmy Dave</p>
												</div>
												<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="col-lg-4 col-md-6 col-12">
								<div className="card-news background-card hover-up mb-4">
									<div className="card-image">
										<img src="/assets/imgs/blog/blog-grid/img-9.png" alt="Carento" />
									</div>
									<div className="card-info">
										<label className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold">Car Review</label>
										<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
										<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">Top 10 Travel Hacks for Budget-Conscious Adventurers</Link></div>
										<div className="card-program">
											<div className="endtime">
												<div className="card-author">
													<img className="rounded-circle border border-primary" src="/assets/imgs/blog/blog-grid/avatar7.png" alt="Carento" />
													<p className="text-sm-bold neutral-1000">Jimmy Dave</p>
												</div>
												<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="col-lg-4 col-md-6 col-12">
								<div className="card-news background-card hover-up mb-4">
									<div className="card-image">
										<img src="/assets/imgs/blog/blog-grid/img-10.png" alt="Carento" />
									</div>
									<div className="card-info">
										<label className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold">Car Review</label>
										<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
										<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">Top 10 Travel Hacks for Budget-Conscious Adventurers</Link></div>
										<div className="card-program">
											<div className="endtime">
												<div className="card-author">
													<img className="rounded-circle border border-primary" src="/assets/imgs/blog/blog-grid/avatar3.png" alt="Carento" />
													<p className="text-sm-bold neutral-1000">Jimmy Dave</p>
												</div>
												<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="col-lg-4 col-md-6 col-12">
								<div className="card-news background-card hover-up mb-4">
									<div className="card-image">
										<img src="/assets/imgs/blog/blog-grid/img-11.png" alt="Carento" />
									</div>
									<div className="card-info">
										<label className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold">Discovery</label>
										<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
										<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">The Continued Growth of Delivery and Ride share-2024</Link></div>
										<div className="card-program">
											<div className="endtime">
												<div className="card-author">
													<img className="rounded-circle border border-primary" src="/assets/imgs/blog/blog-grid/avatar5.png" alt="Carento" />
													<p className="text-sm-bold neutral-1000">Jimmy Dave</p>
												</div>
												<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="col-lg-4 col-md-6 col-12">
								<div className="card-news background-card hover-up mb-4">
									<div className="card-image">
										<img src="/assets/imgs/blog/blog-grid/img-12.png" alt="Carento" />
									</div>
									<div className="card-info">
										<label className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold">Industry News</label>
										<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
										<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">The Continued Growth of Delivery and Ride share-2024</Link></div>
										<div className="card-program">
											<div className="endtime">
												<div className="card-author">
													<img className="rounded-circle border border-primary" src="/assets/imgs/blog/blog-grid/avatar3.png" alt="Carento" />
													<p className="text-sm-bold neutral-1000">Jimmy Dave</p>
												</div>
												<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="col-lg-4 col-md-6 col-12">
								<div className="card-news background-card hover-up mb-4">
									<div className="card-image">
										<img src="/assets/imgs/blog/blog-grid/img-13.png" alt="Carento" />
									</div>
									<div className="card-info">
										<label className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold">Industry News</label>
										<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
										<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">The Continued Growth of Delivery and Ride share-2024</Link></div>
										<div className="card-program">
											<div className="endtime">
												<div className="card-author">
													<img className="rounded-circle border border-primary" src="/assets/imgs/blog/blog-grid/avatar2.png" alt="Carento" />
													<p className="text-sm-bold neutral-1000">Jimmy Dave</p>
												</div>
												<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="col-lg-4 col-md-6 col-12">
								<div className="card-news background-card hover-up mb-4">
									<div className="card-image">
										<img src="/assets/imgs/blog/blog-grid/img-14.png" alt="Carento" />
									</div>
									<div className="card-info">
										<label className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold">Industry News</label>
										<div className="card-meta"><span className="post-date neutral-1000">18 Sep 2024</span><span className="post-time neutral-1000">6 mins</span><span className="post-comment neutral-1000">38 comments</span></div>
										<div className="card-title"><Link className="text-xl-bold neutral-1000" href="/blog-details">The Continued Growth of Delivery and Ride share-2024</Link></div>
										<div className="card-program">
											<div className="endtime">
												<div className="card-author">
													<img className="rounded-circle border border-primary" src="/assets/imgs/blog/blog-grid/avatar8.png" alt="Carento" />
													<p className="text-sm-bold neutral-1000">Jimmy Dave</p>
												</div>
												<div className="card-button"><Link className="btn btn-gray" href="/blog-details">Keep Reading</Link></div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
						<div className="d-flex justify-content-center">
							<nav aria-label="Page navigation example">
								<ul className="pagination">
									<li className="page-item">
										<Link className="page-link" href="#" aria-label="Previous">
											<span aria-hidden="true">
												<svg width={12} height={12} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
													<path d="M6.00016 1.33325L1.3335 5.99992M1.3335 5.99992L6.00016 10.6666M1.3335 5.99992H10.6668" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
												</svg>
											</span>
										</Link>
									</li>
									<li className="page-item"><Link className="page-link" href="#">1</Link></li>
									<li className="page-item"><Link className="page-link" href="#">2</Link></li>
									<li className="page-item"><Link className="page-link" href="#">3</Link></li>
									<li className="page-item"><Link className="page-link" href="#">4</Link></li>
									<li className="page-item"><Link className="page-link" href="#">5</Link></li>
									<li className="page-item"><Link className="page-link" href="#">...</Link></li>
									<li className="page-item">
										<Link className="page-link active" href="#" aria-label="Next">
											<span aria-hidden="true">
												<svg width={12} height={12} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
													<path d="M5.99967 10.6666L10.6663 5.99992L5.99968 1.33325M10.6663 5.99992L1.33301 5.99992" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
												</svg>
											</span>
										</Link>
									</li>
								</ul>
							</nav>
						</div>
						<div className="section-box box-subscriber background-body pt-85">
							<div className="container">
								<div className="block-subscriber">
									<div className="subscriber-left">
										<span className="btn btn-primary">Get instant discounts</span>
										<h4 className="mt-15 mb-30 neutral-1000">Sign up to unlock secret deals instantly!</h4>
										<form className="form-subscriber" action="#">
											<input className="form-control" type="text" placeholder="Your Email" />
											<input className="btn btn-submit" type="submit" defaultValue="Subscribe" />
										</form>
										<p className="text-sm-medium neutral-500 mt-15">No ads. No trails. No commitments</p>
									</div>
									<div className="subscriber-right" />
								</div>
							</div>
						</div>
					</div>
				</section>

			</Layout>
		</>
	)
}