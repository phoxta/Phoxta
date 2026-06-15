import { swiperGroup4 } from '@/util/swiperOptions'
import Link from "@/components/common/Link"
import { Swiper, SwiperSlide } from "swiper/react"

export default function Services1() {
	return (
		<>

			<section className="section-box box-properties-area pt-96 pb-50 background-body">
				<div className="container">
					<div className="row align-items-end mb-40">
						<div className="col-md-8">
							<h3 className="neutral-1000">Our Services</h3>
							<p className="text-lg-medium neutral-500">Serving You with Quality, Comfort, and Convenience</p>
						</div>
						<div className="col-md-4 mt-md-0 mt-4">
							<div className="d-flex justify-content-md-end justify-content-center">
								<Link className="btn btn-primary" href="/cars-list-1">
									View More
									<svg width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M8 15L15 8L8 1M15 8L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</Link>
							</div>
						</div>
					</div>
					<div className="box-list-featured">
						<div className="box-swiper mt-0">
							<Swiper {...swiperGroup4} className="swiper-container swiper-group-4 swiper-group-journey">
								<div className="swiper-wrapper">
									<SwiperSlide>
										<div className="card-spot background-card wow fadeInDown">
											<div className="card-image">
												<Link href="/services"><img className="rounded-3" src="/assets/imgs/services/services-1/img-1.png" alt="Carento" /></Link>
											</div>
											<div className="card-info background-card">
												<div className="card-left">
													<div className="card-title"><Link className="text-lg-bold neutral-1000" href="/services">Venice</Link></div>
													<div className="card-desc"><Link className="text-sm neutral-500" href="#">356
														Properties</Link></div>
												</div>
												<div className="card-right">
													<div className="card-button">
														<Link href="/services">
															<svg width={10} height={10} viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M5.00011 9.08347L9.08347 5.00011L5.00011 0.916748M9.08347 5.00011L0.916748 5.00011" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</Link>
													</div>
												</div>
											</div>
										</div>
									</SwiperSlide>
									<SwiperSlide>
										<div className="card-spot background-card wow fadeInDown">
											<div className="card-image">
												<Link href="/services"><img className="rounded-3" src="/assets/imgs/services/services-1/img-2.png" alt="Carento" /></Link>
											</div>
											<div className="card-info background-card">
												<div className="card-left">
													<div className="card-title"><Link className="text-lg-bold neutral-1000" href="/services">New York</Link></div>
													<div className="card-desc"><Link className="text-sm neutral-500" href="#">356
														Properties</Link></div>
												</div>
												<div className="card-right">
													<div className="card-button">
														<Link href="/services">
															<svg width={10} height={10} viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M5.00011 9.08347L9.08347 5.00011L5.00011 0.916748M9.08347 5.00011L0.916748 5.00011" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</Link>
													</div>
												</div>
											</div>
										</div>
									</SwiperSlide>
									<SwiperSlide>
										<div className="card-spot background-card wow fadeInDown">
											<div className="card-image">
												<Link href="/services"><img className="rounded-3" src="/assets/imgs/services/services-1/img-3.png" alt="Carento" /></Link>
											</div>
											<div className="card-info background-card">
												<div className="card-left">
													<div className="card-title"><Link className="text-lg-bold neutral-1000" href="/services">Amsterdam</Link></div>
													<div className="card-desc"><Link className="text-sm neutral-500" href="#">356
														Properties</Link></div>
												</div>
												<div className="card-right">
													<div className="card-button">
														<Link href="/services">
															<svg width={10} height={10} viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M5.00011 9.08347L9.08347 5.00011L5.00011 0.916748M9.08347 5.00011L0.916748 5.00011" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</Link>
													</div>
												</div>
											</div>
										</div>
									</SwiperSlide>
									<SwiperSlide>
										<div className="card-spot background-card wow fadeInDown">
											<div className="card-image">
												<Link href="/services"><img className="rounded-3" src="/assets/imgs/services/services-1/img-4.png" alt="Carento" /></Link>
											</div>
											<div className="card-info background-card">
												<div className="card-left">
													<div className="card-title"><Link className="text-lg-bold neutral-1000" href="/services">Budapest</Link></div>
													<div className="card-desc"><Link className="text-sm neutral-500" href="#">356
														Properties</Link></div>
												</div>
												<div className="card-right">
													<div className="card-button">
														<Link href="/services">
															<svg width={10} height={10} viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M5.00011 9.08347L9.08347 5.00011L5.00011 0.916748M9.08347 5.00011L0.916748 5.00011" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</Link>
													</div>
												</div>
											</div>
										</div>
									</SwiperSlide>
									<SwiperSlide>
										<div className="card-spot background-card wow fadeInDown">
											<div className="card-image">
												<Link href="/services"><img className="rounded-3" src="/assets/imgs/services/services-1/img-2.png" alt="Carento" /></Link>
											</div>
											<div className="card-info background-card">
												<div className="card-left">
													<div className="card-title"><Link className="text-lg-bold neutral-1000" href="/services">New York</Link></div>
													<div className="card-desc"><Link className="text-sm neutral-500" href="#">356
														Properties</Link></div>
												</div>
												<div className="card-right">
													<div className="card-button">
														<Link href="/services">
															<svg width={10} height={10} viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M5.00011 9.08347L9.08347 5.00011L5.00011 0.916748M9.08347 5.00011L0.916748 5.00011" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</Link>
													</div>
												</div>
											</div>
										</div>
									</SwiperSlide>
									<SwiperSlide>
										<div className="card-spot background-card wow fadeInDown">
											<div className="card-image">
												<Link href="/services"><img className="rounded-3" src="/assets/imgs/services/services-1/img-3.png" alt="Carento" /></Link>
											</div>
											<div className="card-info background-card">
												<div className="card-left">
													<div className="card-title"><Link className="text-lg-bold neutral-1000" href="/services">Amsterdam</Link></div>
													<div className="card-desc"><Link className="text-sm neutral-500" href="#">356
														Properties</Link></div>
												</div>
												<div className="card-right">
													<div className="card-button">
														<Link href="/services">
															<svg width={10} height={10} viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M5.00011 9.08347L9.08347 5.00011L5.00011 0.916748M9.08347 5.00011L0.916748 5.00011" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</Link>
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
