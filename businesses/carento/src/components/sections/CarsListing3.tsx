import { Swiper, SwiperSlide } from "swiper/react";
import Link from "@/components/common/Link"
import { swiperGroup2 } from '@/util/swiperOptions'

export default function CarsListing3() {
	return (
		<>

			<section className="section-box box-flights background-body">
				<div className="container">
					<div className="row align-items-end">
						<div className="col-lg-6 mb-30 text-center text-lg-start">
							<h2 className="neutral-1000">Popular Vehicles</h2>
							<p className="text-xl-medium neutral-500">Favorite vehicles based on customer reviews</p>
						</div>
						<div className="col-lg-6 mb-30">
							<div className="d-flex align-items-center justify-content-center justify-content-lg-end popular-categories">
								<div className="dropdown dropdown-filter">
									<button className="btn btn-dropdown dropdown-toggle m-0" id="dropdownCategory" type="button" data-bs-toggle="dropdown" aria-expanded="false"><span>Categories</span></button>
									<ul className="dropdown-menu dropdown-menu-light" aria-labelledby="dropdownCategory">
										<li><Link className="dropdown-item active" href="#">Sedan</Link></li>
										<li><Link className="dropdown-item" href="#">SUVs</Link></li>
										<li><Link className="dropdown-item" href="#">Coupes</Link></li>
										<li><Link className="dropdown-item" href="#">Hatchbacks</Link></li>
										<li><Link className="dropdown-item" href="#">Trucks</Link></li>
										<li><Link className="dropdown-item" href="#">Minivan</Link></li>
										<li><Link className="dropdown-item" href="#">Sport</Link></li>
										<li><Link className="dropdown-item" href="#">Cross-over</Link></li>
									</ul>
								</div>
								<div className="dropdown dropdown-filter">
									<button className="btn btn-dropdown dropdown-toggle m-0" id="dropdownCategory" type="button" data-bs-toggle="dropdown" aria-expanded="false"><span>Fuel Type</span></button>
									<ul className="dropdown-menu dropdown-menu-light" aria-labelledby="dropdownCategory">
										<li><Link className="dropdown-item active" href="#">Plug-in Hybrid (PHEV)</Link></li>
										<li><Link className="dropdown-item" href="#">Hybrid (HEV)</Link></li>
										<li><Link className="dropdown-item" href="#">Electric Vehicle (EV)</Link></li>
										<li><Link className="dropdown-item" href="#">Diesel</Link></li>
										<li><Link className="dropdown-item" href="#">Gasoline/Petrol</Link></li>
										<li><Link className="dropdown-item" href="#">Hydrogen</Link></li>
									</ul>
								</div>
								<div className="dropdown dropdown-filter">
									<button className="btn btn-dropdown dropdown-toggle m-0" id="dropdownCategory" type="button" data-bs-toggle="dropdown" aria-expanded="false"><span>Review / Rating</span></button>
									<ul className="dropdown-menu dropdown-menu-light" aria-labelledby="dropdownCategory">
										<li><Link className="dropdown-item active" href="#">Newest</Link></li>
										<li><Link className="dropdown-item" href="#">Oldest</Link></li>
									</ul>
								</div>
								<div className="dropdown dropdown-filter">
									<button className="btn btn-dropdown dropdown-toggle m-0" id="dropdownCategory" type="button" data-bs-toggle="dropdown" aria-expanded="false"><span>Price range</span></button>
									<ul className="dropdown-menu dropdown-menu-light" aria-labelledby="dropdownCategory">
										<li><Link className="dropdown-item active" href="#">$10 - $100</Link></li>
										<li><Link className="dropdown-item" href="#">$100 - $1.000</Link></li>
										<li><Link className="dropdown-item" href="#">$1.000 - $10.000</Link></li>
									</ul>
								</div>
							</div>
						</div>
					</div>
					<div className="block-flights wow fadeInUp">
						<div className="box-swiper mt-30">
							<Swiper {...swiperGroup2} className="swiper-container swiper-group-2 swiper-group-journey">
								<div className="swiper-wrapper">
									<SwiperSlide>
										<div className="card-journey-small card-journey-small-listing-3 background-0 d-flex flex-md-row flex-column align-items-center mw-100 position-relative">
											<div className="card-image w-100">
												<Link href="/cars-details-1">
													<img src="/assets/imgs/cars-listing/cars-listing-3/car-1.png" alt="Carento" />
												</Link>
											</div>
											<div className="card-info p-4 mt-0 position-relative end-0 h-100 w-lg-55 rounded-12">
												<div className="card-rating position-relative start-0 top-0">
													<div className="card-right">
														<span className="rating shadow-none border-0 bg-transparent"> 4.96 <span className="text-sm-medium neutral-500">(672 reviews)</span> </span>
													</div>
												</div>
												<div className="card-title pb-1"><Link className="heading-6 neutral-1000" href="/cars-details-1">Audi A3 1.6 TDI S line</Link></div>
												<div className="card-program">
													<div className="card-facitlities border-0 pb-3">
														<p className="card-miles text-md-medium">72.491km</p>
														<p className="card-gear text-md-medium">Automatic</p>
														<p className="card-fuel text-md-medium">Diesel</p>
														<p className="card-seat text-md-medium">7 seats</p>
													</div>
													<div className="endtime border-top pt-4">
														<div className="card-price">
															<p className="text-md-medium neutral-500 me-2">From</p>
															<h6 className="heading-6 neutral-1000">$35.62</h6>
														</div>
														<div className="card-button"><Link className="btn btn-gray" href="/cars-details-1">Book Now</Link></div>
													</div>
												</div>
											</div>
										</div>
										<div className="card-journey-small card-journey-small-listing-3 background-0 d-flex flex-md-row flex-column align-items-center mw-100 position-relative">
											<div className="card-image w-100">
												<Link href="/cars-details-1">
													<img src="/assets/imgs/cars-listing/cars-listing-3/car-2.png" alt="Carento" />
												</Link>
											</div>
											<div className="card-info p-4 mt-0 position-relative end-0 h-100 w-lg-55 rounded-12">
												<div className="card-rating position-relative start-0 top-0">
													<div className="card-right">
														<span className="rating shadow-none border-0 bg-transparent"> 4.96 <span className="text-sm-medium neutral-500">(672 reviews)</span> </span>
													</div>
												</div>
												<div className="card-title pb-1"><Link className="heading-6 neutral-1000" href="/cars-details-1">BMW 320d xDrive M</Link></div>
												<div className="card-program">
													<div className="card-facitlities border-0 pb-3">
														<p className="card-miles text-md-medium">72.491km</p>
														<p className="card-gear text-md-medium">Automatic</p>
														<p className="card-fuel text-md-medium">Diesel</p>
														<p className="card-seat text-md-medium">7 seats</p>
													</div>
													<div className="endtime border-top pt-4">
														<div className="card-price">
															<p className="text-md-medium neutral-500 me-2">From</p>
															<h6 className="heading-6 neutral-1000">$35.62</h6>
														</div>
														<div className="card-button"><Link className="btn btn-gray" href="/cars-details-1">Book Now</Link></div>
													</div>
												</div>
											</div>
										</div>
										<div className="card-journey-small card-journey-small-listing-3 background-0 d-flex flex-md-row flex-column align-items-center mw-100 position-relative">
											<div className="card-image w-100">
												<Link href="/cars-details-1">
													<img src="/assets/imgs/cars-listing/cars-listing-3/car-3.png" alt="Carento" />
												</Link>
											</div>
											<div className="card-info p-4 mt-0 position-relative end-0 h-100 w-lg-55 rounded-12">
												<div className="card-rating position-relative start-0 top-0">
													<div className="card-right">
														<span className="rating shadow-none border-0 bg-transparent"> 4.96 <span className="text-sm-medium neutral-500">(672 reviews)</span> </span>
													</div>
												</div>
												<div className="card-title pb-1"><Link className="heading-6 neutral-1000" href="/cars-details-1">Mercedes-Benz C220d</Link></div>
												<div className="card-program">
													<div className="card-facitlities border-0 pb-3">
														<p className="card-miles text-md-medium">72.491km</p>
														<p className="card-gear text-md-medium">Automatic</p>
														<p className="card-fuel text-md-medium">Diesel</p>
														<p className="card-seat text-md-medium">7 seats</p>
													</div>
													<div className="endtime border-top pt-4">
														<div className="card-price">
															<p className="text-md-medium neutral-500 me-2">From</p>
															<h6 className="heading-6 neutral-1000">$35.62</h6>
														</div>
														<div className="card-button"><Link className="btn btn-gray" href="/cars-details-1">Book Now</Link></div>
													</div>
												</div>
											</div>
										</div>
									</SwiperSlide>
									<SwiperSlide>
										<div className="card-journey-small card-journey-small-listing-3 background-0 d-flex flex-md-row flex-column align-items-center mw-100 position-relative">
											<div className="card-image w-100">
												<Link href="/cars-details-1">
													<img src="/assets/imgs/cars-listing/cars-listing-3/car-4.png" alt="Carento" />
												</Link>
											</div>
											<div className="card-info p-4 mt-0 position-relative end-0 h-100 w-lg-55 rounded-12">
												<div className="card-rating position-relative start-0 top-0">
													<div className="card-right">
														<span className="rating shadow-none border-0 bg-transparent"> 4.96 <span className="text-sm-medium neutral-500">(672 reviews)</span> </span>
													</div>
												</div>
												<div className="card-title pb-1"><Link className="heading-6 neutral-1000" href="/cars-details-1">Volkswagen Golf GTD</Link></div>
												<div className="card-program">
													<div className="card-facitlities border-0 pb-3">
														<p className="card-miles text-md-medium">72.491km</p>
														<p className="card-gear text-md-medium">Automatic</p>
														<p className="card-fuel text-md-medium">Diesel</p>
														<p className="card-seat text-md-medium">7 seats</p>
													</div>
													<div className="endtime border-top pt-4">
														<div className="card-price">
															<p className="text-md-medium neutral-500 me-2">From</p>
															<h6 className="heading-6 neutral-1000">$35.62</h6>
														</div>
														<div className="card-button"><Link className="btn btn-gray" href="/cars-details-1">Book Now</Link></div>
													</div>
												</div>
											</div>
										</div>
										<div className="card-journey-small card-journey-small-listing-3 background-0 d-flex flex-md-row flex-column align-items-center mw-100 position-relative">
											<div className="card-image w-100">
												<Link href="/cars-details-1">
													<img src="/assets/imgs/cars-listing/cars-listing-3/car-5.png" alt="Carento" />
												</Link>
											</div>
											<div className="card-info p-4 mt-0 position-relative end-0 h-100 w-lg-55 rounded-12">
												<div className="card-rating position-relative start-0 top-0">
													<div className="card-right">
														<span className="rating shadow-none border-0 bg-transparent"> 4.96 <span className="text-sm-medium neutral-500">(672 reviews)</span> </span>
													</div>
												</div>
												<div className="card-title pb-1"><Link className="heading-6 neutral-1000" href="/cars-details-1">Volvo S60 D4 R-Design</Link></div>
												<div className="card-program">
													<div className="card-facitlities border-0 pb-3">
														<p className="card-miles text-md-medium">72.491km</p>
														<p className="card-gear text-md-medium">Automatic</p>
														<p className="card-fuel text-md-medium">Diesel</p>
														<p className="card-seat text-md-medium">7 seats</p>
													</div>
													<div className="endtime border-top pt-4">
														<div className="card-price">
															<p className="text-md-medium neutral-500 me-2">From</p>
															<h6 className="heading-6 neutral-1000">$35.62</h6>
														</div>
														<div className="card-button"><Link className="btn btn-gray" href="/cars-details-1">Book Now</Link></div>
													</div>
												</div>
											</div>
										</div>
										<div className="card-journey-small card-journey-small-listing-3 background-0 d-flex flex-md-row flex-column align-items-center mw-100 position-relative">
											<div className="card-image w-100">
												<Link href="/cars-details-1">
													<img src="/assets/imgs/cars-listing/cars-listing-3/car-6.png" alt="Carento" />
												</Link>
											</div>
											<div className="card-info p-4 mt-0 position-relative end-0 h-100 w-lg-55 rounded-12">
												<div className="card-rating position-relative start-0 top-0">
													<div className="card-right">
														<span className="rating shadow-none border-0 bg-transparent"> 4.96 <span className="text-sm-medium neutral-500">(672 reviews)</span> </span>
													</div>
												</div>
												<div className="card-title pb-1"><Link className="heading-6 neutral-1000" href="/cars-details-1">Jaguar XE 2.0d R-Sport</Link></div>
												<div className="card-program">
													<div className="card-facitlities border-0 pb-3">
														<p className="card-miles text-md-medium">72.491km</p>
														<p className="card-gear text-md-medium">Automatic</p>
														<p className="card-fuel text-md-medium">Diesel</p>
														<p className="card-seat text-md-medium">7 seats</p>
													</div>
													<div className="endtime border-top pt-4">
														<div className="card-price">
															<p className="text-md-medium neutral-500 me-2">From</p>
															<h6 className="heading-6 neutral-1000">$35.62</h6>
														</div>
														<div className="card-button"><Link className="btn btn-gray" href="/cars-details-1">Book Now</Link></div>
													</div>
												</div>
											</div>
										</div>
									</SwiperSlide>
									<SwiperSlide>
										<div className="card-journey-small card-journey-small-listing-3 background-0 d-flex flex-md-row flex-column align-items-center mw-100 position-relative">
											<div className="card-image w-100">
												<Link href="/cars-details-1">
													<img src="/assets/imgs/cars-listing/cars-listing-3/car-1.png" alt="Carento" />
												</Link>
											</div>
											<div className="card-info p-4 mt-0 position-relative end-0 h-100 w-lg-55 rounded-12">
												<div className="card-rating position-relative start-0 top-0">
													<div className="card-right">
														<span className="rating shadow-none border-0 bg-transparent"> 4.96 <span className="text-sm-medium neutral-500">(672 reviews)</span> </span>
													</div>
												</div>
												<div className="card-title pb-1"><Link className="heading-6 neutral-1000" href="/cars-details-1">Audi A3 1.6 TDI S line</Link></div>
												<div className="card-program">
													<div className="card-facitlities border-0 pb-3">
														<p className="card-miles text-md-medium">72.491km</p>
														<p className="card-gear text-md-medium">Automatic</p>
														<p className="card-fuel text-md-medium">Diesel</p>
														<p className="card-seat text-md-medium">7 seats</p>
													</div>
													<div className="endtime border-top pt-4">
														<div className="card-price">
															<p className="text-md-medium neutral-500 me-2">From</p>
															<h6 className="heading-6 neutral-1000">$35.62</h6>
														</div>
														<div className="card-button"><Link className="btn btn-gray" href="/cars-details-1">Book Now</Link></div>
													</div>
												</div>
											</div>
										</div>
										<div className="card-journey-small card-journey-small-listing-3 background-0 d-flex flex-md-row flex-column align-items-center mw-100 position-relative">
											<div className="card-image w-100">
												<Link href="/cars-details-1">
													<img src="/assets/imgs/cars-listing/cars-listing-3/car-2.png" alt="Carento" />
												</Link>
											</div>
											<div className="card-info p-4 mt-0 position-relative end-0 h-100 w-lg-55 rounded-12">
												<div className="card-rating position-relative start-0 top-0">
													<div className="card-right">
														<span className="rating shadow-none border-0 bg-transparent"> 4.96 <span className="text-sm-medium neutral-500">(672 reviews)</span> </span>
													</div>
												</div>
												<div className="card-title pb-1"><Link className="heading-6 neutral-1000" href="/cars-details-1">BMW 320d xDrive M</Link></div>
												<div className="card-program">
													<div className="card-facitlities border-0 pb-3">
														<p className="card-miles text-md-medium">72.491km</p>
														<p className="card-gear text-md-medium">Automatic</p>
														<p className="card-fuel text-md-medium">Diesel</p>
														<p className="card-seat text-md-medium">7 seats</p>
													</div>
													<div className="endtime border-top pt-4">
														<div className="card-price">
															<p className="text-md-medium neutral-500 me-2">From</p>
															<h6 className="heading-6 neutral-1000">$35.62</h6>
														</div>
														<div className="card-button"><Link className="btn btn-gray" href="/cars-details-1">Book Now</Link></div>
													</div>
												</div>
											</div>
										</div>
										<div className="card-journey-small card-journey-small-listing-3 background-0 d-flex flex-md-row flex-column align-items-center mw-100 position-relative">
											<div className="card-image w-100">
												<Link href="/cars-details-1">
													<img src="/assets/imgs/cars-listing/cars-listing-3/car-3.png" alt="Carento" />
												</Link>
											</div>
											<div className="card-info p-4 mt-0 position-relative end-0 h-100 w-lg-55 rounded-12">
												<div className="card-rating position-relative start-0 top-0">
													<div className="card-right">
														<span className="rating shadow-none border-0 bg-transparent"> 4.96 <span className="text-sm-medium neutral-500">(672 reviews)</span> </span>
													</div>
												</div>
												<div className="card-title pb-1"><Link className="heading-6 neutral-1000" href="/cars-details-1">Mercedes-Benz C220d</Link></div>
												<div className="card-program">
													<div className="card-facitlities border-0 pb-3">
														<p className="card-miles text-md-medium">72.491km</p>
														<p className="card-gear text-md-medium">Automatic</p>
														<p className="card-fuel text-md-medium">Diesel</p>
														<p className="card-seat text-md-medium">7 seats</p>
													</div>
													<div className="endtime border-top pt-4">
														<div className="card-price">
															<p className="text-md-medium neutral-500 me-2">From</p>
															<h6 className="heading-6 neutral-1000">$35.62</h6>
														</div>
														<div className="card-button"><Link className="btn btn-gray" href="/cars-details-1">Book Now</Link></div>
													</div>
												</div>
											</div>
										</div>
									</SwiperSlide>
									<SwiperSlide>
										<div className="card-journey-small card-journey-small-listing-3 background-0 d-flex flex-md-row flex-column align-items-center mw-100 position-relative">
											<div className="card-image w-100">
												<Link href="/cars-details-1">
													<img src="/assets/imgs/cars-listing/cars-listing-3/car-4.png" alt="Carento" />
												</Link>
											</div>
											<div className="card-info p-4 mt-0 position-relative end-0 h-100 w-lg-55 rounded-12">
												<div className="card-rating position-relative start-0 top-0">
													<div className="card-right">
														<span className="rating shadow-none border-0 bg-transparent"> 4.96 <span className="text-sm-medium neutral-500">(672 reviews)</span> </span>
													</div>
												</div>
												<div className="card-title pb-1"><Link className="heading-6 neutral-1000" href="/cars-details-1">Volkswagen Golf GTD</Link></div>
												<div className="card-program">
													<div className="card-facitlities border-0 pb-3">
														<p className="card-miles text-md-medium">72.491km</p>
														<p className="card-gear text-md-medium">Automatic</p>
														<p className="card-fuel text-md-medium">Diesel</p>
														<p className="card-seat text-md-medium">7 seats</p>
													</div>
													<div className="endtime border-top pt-4">
														<div className="card-price">
															<p className="text-md-medium neutral-500 me-2">From</p>
															<h6 className="heading-6 neutral-1000">$35.62</h6>
														</div>
														<div className="card-button"><Link className="btn btn-gray" href="/cars-details-1">Book Now</Link></div>
													</div>
												</div>
											</div>
										</div>
										<div className="card-journey-small card-journey-small-listing-3 background-0 d-flex flex-md-row flex-column align-items-center mw-100 position-relative">
											<div className="card-image w-100">
												<Link href="/cars-details-1">
													<img src="/assets/imgs/cars-listing/cars-listing-3/car-5.png" alt="Carento" />
												</Link>
											</div>
											<div className="card-info p-4 mt-0 position-relative end-0 h-100 w-lg-55 rounded-12">
												<div className="card-rating position-relative start-0 top-0">
													<div className="card-right">
														<span className="rating shadow-none border-0 bg-transparent"> 4.96 <span className="text-sm-medium neutral-500">(672 reviews)</span> </span>
													</div>
												</div>
												<div className="card-title pb-1"><Link className="heading-6 neutral-1000" href="/cars-details-1">Volvo S60 D4 R-Design</Link></div>
												<div className="card-program">
													<div className="card-facitlities border-0 pb-3">
														<p className="card-miles text-md-medium">72.491km</p>
														<p className="card-gear text-md-medium">Automatic</p>
														<p className="card-fuel text-md-medium">Diesel</p>
														<p className="card-seat text-md-medium">7 seats</p>
													</div>
													<div className="endtime border-top pt-4">
														<div className="card-price">
															<p className="text-md-medium neutral-500 me-2">From</p>
															<h6 className="heading-6 neutral-1000">$35.62</h6>
														</div>
														<div className="card-button"><Link className="btn btn-gray" href="/cars-details-1">Book Now</Link></div>
													</div>
												</div>
											</div>
										</div>
										<div className="card-journey-small card-journey-small-listing-3 background-0 d-flex flex-md-row flex-column align-items-center mw-100 position-relative">
											<div className="card-image w-100">
												<Link href="/cars-details-1">
													<img src="/assets/imgs/cars-listing/cars-listing-3/car-6.png" alt="Carento" />
												</Link>
											</div>
											<div className="card-info p-4 mt-0 position-relative end-0 h-100 w-lg-55 rounded-12">
												<div className="card-rating position-relative start-0 top-0">
													<div className="card-right">
														<span className="rating shadow-none border-0 bg-transparent"> 4.96 <span className="text-sm-medium neutral-500">(672 reviews)</span> </span>
													</div>
												</div>
												<div className="card-title pb-1"><Link className="heading-6 neutral-1000" href="/cars-details-1">Jaguar XE 2.0d R-Sport</Link></div>
												<div className="card-program">
													<div className="card-facitlities border-0 pb-3">
														<p className="card-miles text-md-medium">72.491km</p>
														<p className="card-gear text-md-medium">Automatic</p>
														<p className="card-fuel text-md-medium">Diesel</p>
														<p className="card-seat text-md-medium">7 seats</p>
													</div>
													<div className="endtime border-top pt-4">
														<div className="card-price">
															<p className="text-md-medium neutral-500 me-2">From</p>
															<h6 className="heading-6 neutral-1000">$35.62</h6>
														</div>
														<div className="card-button"><Link className="btn btn-gray" href="/cars-details-1">Book Now</Link></div>
													</div>
												</div>
											</div>
										</div>
									</SwiperSlide>
								</div>
							</Swiper>
						</div>
					</div>
					<div className="d-flex justify-content-center">
						<Link className="btn btn-brand-2 text-nowrap wow fadeInUp" href="/cars-list-1">
							<svg className="me-2" xmlns="http://www.w3.org/2000/svg" width={19} height={18} viewBox="0 0 19 18" fill="none">
								<g clipPath="url(#clip0_117_4717)">
									<path d="M4.4024 14.0977C1.60418 11.2899 1.60418 6.71576 4.4024 3.90794L5.89511 5.40064V0.90332H1.39779L3.13528 2.64081C-0.378102 6.1494 -0.378102 11.8562 3.13528 15.3696C5.35275 17.5823 8.43896 18.403 11.2996 17.8175V15.9648C8.91413 16.584 6.26949 15.9648 4.4024 14.0977Z" fill="#101010" />
									<path d="M15.864 2.64036C13.6465 0.418093 10.5603 -0.402657 7.69971 0.182907V2.03559C10.0852 1.41643 12.7346 2.04519 14.5969 3.90748C17.4047 6.71531 17.4047 11.2894 14.5969 14.0973L13.1042 12.6045V17.1067H17.6063L15.8688 15.3692C19.3774 11.8558 19.3774 6.14894 15.864 2.64036Z" fill="#101010" />
								</g>
								<defs>
									<clipPath id="clip0_117_4717">
										<rect width={18} height={18} fill="white" transform="translate(0.5)" />
									</clipPath>
								</defs>
							</svg>
							Load More Cars
						</Link>
					</div>
				</div>
			</section>
		</>
	)
}
