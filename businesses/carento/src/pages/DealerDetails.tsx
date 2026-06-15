
import Layout from "@/components/layout/Layout"
import Link from "@/components/common/Link"
import Marquee from 'react-fast-marquee'
export default function DealerDetails() {

	return (
		<>

			<Layout footerStyle={1}>
				<div>
					<div className="page-header pt-30 background-body">
						<div className="custom-container position-relative mx-auto">
							<div className="bg-overlay rounded-12 overflow-hidden">
								<img className="w-100 h-100 img-banner" src="/assets/imgs/page-header/banner8.png" alt="Carento" />
							</div>
							<div className="container position-absolute z-1 top-50 start-50 translate-middle">
								<h2 className="text-white">Peugeot Sheffield</h2>
								<span className="text-white text-xl-medium">Since 2012</span>
							</div>
							<div className="background-body position-absolute z-1 top-100 start-50 translate-middle px-3 py-2 rounded-12 border d-flex gap-3 d-none">
								<Link href="/" className="neutral-700 text-md-medium">Home</Link>
								<span>
									<img src="/assets/imgs/template/icons/arrow-right.svg" alt="Carento" />
								</span>
								<Link href="#" className="neutral-1000 text-md-bold" />
							</div>
						</div>
					</div>
					{/* dealer details */}
					<section className="box-section box-content-tour-detail box-content-room-detail background-body border-bottom">
						<div className="container">
							<div className="row">
								<div className="col-lg-8">
									<div className="box-collapse-expand">
										<div className="group-collapse-expand">
											<button className="btn btn-collapse" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOverview" aria-expanded="false" aria-controls="collapseOverview">
												<h6>Overview</h6>
												<svg width={12} height={7} viewBox="0 0 12 7" fill="none" xmlns="http://www.w3.org/2000/svg">
													<path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
												</svg>
											</button>
											<div className="collapse show" id="collapseOverview">
												<div className="card-contact border-0 border-bottom rounded-0 d-flex">
													<div className="card-image me-3">
														<div className="position-relative">
															<img src="/assets/imgs/dealer/dealer-listing/icon-9.svg" alt="Carento" />
														</div>
													</div>
													<div className="card-info">
														<div className="card-title">
															<Link className="title heading-6" href="#">Peugeot Sheffield</Link>
															<p className="text-md-medium neutral-500">123 Kingsway Strandeif, Manchester, M19 2XS</p>
														</div>
														<div className="card-method-contact2">
															<Link className="email text-xs-bold" href="#"> 180 Vehicles </Link>
														</div>
													</div>
												</div>
												<div className="card card-body">
													<p>Elevate your Las Vegas experience to new heights with a journey aboard The High Roller at The LINQ. As the tallest observation wheel in the world, standing at an impressive 550 feet tall, The High Roller offers a bird's-eye perspective of the iconic Las Vegas Strip and its surrounding desert landscape. From the moment you step into one of the spacious cabins, you'll be transported on a mesmerizing adventure, where every turn offers a new and breathtaking vista of the vibrant city below.</p>
													<p>Whether you're a first-time visitor or a seasoned Las Vegas aficionado, The High Roller promises an unparalleled experience that will leave you in awe. With its climate-controlled cabins and immersive audio commentary, this attraction provides a unique opportunity to see Las Vegas from a whole new perspective, while learning about its rich history and famous landmarks along the way.</p>
													<div className="row g-3 mt-1">
														<div className="col-md-6">
															<img className="rounded-1" src="/assets/imgs/dealer/dealer-details/img-1.png" alt="Carento" />
														</div>
														<div className="col-md-6 d-flex align-items-center justify-content-between flex-column gap-3">
															<img className="rounded-1" src="/assets/imgs/dealer/dealer-details/img-2.png" alt="Carento" />
															<img className="rounded-1" src="/assets/imgs/dealer/dealer-details/img-3.png" alt="Carento" />
														</div>
													</div>
												</div>
											</div>
										</div>
										<div className="group-collapse-expand mb-0">
											<button className="btn btn-collapse" type="button" data-bs-toggle="collapse" data-bs-target="#collapseHighlight" aria-expanded="false" aria-controls="collapseHighlight">
												<h6>Services</h6>
												<svg width={12} height={7} viewBox="0 0 12 7" fill="none" xmlns="http://www.w3.org/2000/svg">
													<path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
												</svg>
											</button>
											<div className="collapse show" id="collapseHighlight">
												<div className="card card-body">
													<div className="row flex-lg-nowrap">
														<div className="col-auto">
															<ul className="list-checked-green-2">
																<li>Exclusive new vehicle sales with customization options</li>
																<li>Certified pre-owned vehicles with comprehensive inspections</li>
																<li>Flexible financing and leasing solutions tailored to your needs</li>
																<li>Full-service vehicle maintenance and repair center</li>
																<li>Authentic parts and accessories for optimal vehicle performance</li>
															</ul>
														</div>
														<div className="col-auto ms-lg-auto">
															<ul className="list-checked-green-2">
																<li>Comprehensive Vehicle Maintenance</li>
																<li>Genuine Parts &amp; Accessories</li>
																<li>Trade-In Valuation</li>
																<li>Extended Warranty Plans</li>
															</ul>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4">
									<div className="sidebar-left border-1 background-card">
										<h6 className="text-xl-bold neutral-1000">Get in touch</h6>
										<div className="box-sidebar-content">
											<form className="form-contact">
												<div className="row">
													<div className="col-lg-12">
														<div className="form-group">
															<input className="form-control username" type="text" placeholder="Your name" />
														</div>
													</div>
													<div className="col-lg-12">
														<div className="form-group">
															<input className="form-control email" type="email" placeholder="Your email" />
														</div>
													</div>
													<div className="col-lg-12">
														<div className="form-group">
															<textarea className="form-control message" rows={6} placeholder="Message" />
														</div>
													</div>
													<div className="col-lg-12">
														<button className="btn btn-book">
															Send message
															<svg width={17} height={16} viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M8.5 15L15.5 8L8.5 1M15.5 8L1.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</button>
													</div>
												</div>
											</form>
											<div className="box-info-contact pt-4">
												<p className="text-md-medium mobile-phone neutral-1000"><span className="text-md-bold">Mobile:</span> 1-222-333-4444</p>
												<p className="text-md-medium email neutral-1000"><span className="text-md-bold">Email:</span> emily-rose@gmail.com</p>
												<p className="text-md-medium whatsapp neutral-1000"><span className="text-md-bold">WhatsApp:</span> 1-222-333-4444</p>
												<p className="text-md-medium fax neutral-1000"><span className="text-md-bold">Fax:</span> 1-222-333-4444</p>
											</div>
										</div>
									</div>
									<div className="sidebar-banner">
										<div className="p-4 background-body border rounded-3">
											<p className="text-xl-bold neutral-1000 mb-4">Dealer Location</p>
											<div className="box-collapse scrollFilter mb-15">
												<div className="pt-0">
													<div className="box-map-small">
														<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5249.611419370571!2d2.3406913487788334!3d48.86191519358772!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47e66e18a5f84801%3A0x6eb5daa624bdebd2!2sLes%20Halles%2C%2075001%20Pa%20ri%2C%20Ph%C3%A1p!5e0!3m2!1svi!2s!4v1711728202093!5m2!1svi!2s" width="100%" height={160} style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
													</div>
												</div>
											</div>
											<p className="text-sm-medium neutral-1000">123 Kingsway Strandeif, Manchester, M19 2XS</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</section>
					{/* cars-listing-1 */}
					<section className="section-box pt-50 background-body">
						<div className="container">
							<div className="row align-items-end">
								<div className="col-md-9 mb-30 wow fadeInUp">
									<h4 className="title-svg neutral-1000 mb-15">Listed by this dealer</h4>
									<p className="text-lg-medium text-bold neutral-500">Top Car Rental Service</p>
								</div>
							</div>
						</div>
					</section>
					<section className="box-section block-content-tourlist background-body">
						<div className="container">
							<div className="box-content-main pt-20">
								<div className="content-right">
									<div className="box-grid-tours wow fadeIn">
										<div className="row">
											<div className="col-lg-3 col-md-6">
												<div className="card-journey-small background-card hover-up">
													<div className="card-image">
														<img src="/assets/imgs/cars-listing/cars-listing-6/car-6.png" alt="Carento" />
													</div>
													<div className="card-info p-4 pt-30">
														<div className="card-rating">
															<div className="card-left" />
															<div className="card-right">
																<span className="rating text-xs-medium rounded-pill">4.96 <span className="text-xs-medium neutral-500">(672 reviews)</span></span>
															</div>
														</div>
														<div className="card-title"><Link className="text-lg-bold neutral-1000 text-nowrap" href="/cars-details-1">Hyundai Sonata SEL Plus</Link></div>
														<div className="card-program">
															<div className="card-location">
																<p className="text-location text-sm-medium neutral-500">New South Wales, Australia</p>
															</div>
															<div className="card-facitlities">
																<p className="card-miles text-md-medium">25,100 miles</p>
																<p className="card-gear text-md-medium">Automatic</p>
																<p className="card-fuel text-md-medium">Diesel</p>
																<p className="card-seat text-md-medium">7 seats</p>
															</div>
															<div className="endtime">
																<div className="card-price">
																	<h6 className="text-lg-bold neutral-1000">$72.15</h6>
																	<p className="text-md-medium neutral-500">/ day</p>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/cars-details-1">Book Now</Link></div>
															</div>
														</div>
													</div>
												</div>
											</div>
											<div className="col-lg-3 col-md-6">
												<div className="card-journey-small background-card hover-up">
													<div className="card-image">
														<img src="/assets/imgs/cars-listing/cars-listing-6/car-5.png" alt="Carento" />
													</div>
													<div className="card-info p-4 pt-30">
														<div className="card-rating">
															<div className="card-left" />
															<div className="card-right">
																<span className="rating text-xs-medium rounded-pill">4.96 <span className="text-xs-medium neutral-500">(672 reviews)</span></span>
															</div>
														</div>
														<div className="card-title"><Link className="text-lg-bold neutral-1000 text-nowrap" href="/cars-details-1">Buick Enclave Avenir</Link></div>
														<div className="card-program">
															<div className="card-location">
																<p className="text-location text-sm-medium neutral-500">New South Wales, Australia</p>
															</div>
															<div className="card-facitlities">
																<p className="card-miles text-md-medium">25,100 miles</p>
																<p className="card-gear text-md-medium">Automatic</p>
																<p className="card-fuel text-md-medium">Diesel</p>
																<p className="card-seat text-md-medium">7 seats</p>
															</div>
															<div className="endtime">
																<div className="card-price">
																	<h6 className="text-lg-bold neutral-1000">$69.56</h6>
																	<p className="text-md-medium neutral-500">/ day</p>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/cars-details-1">Book Now</Link></div>
															</div>
														</div>
													</div>
												</div>
											</div>
											<div className="col-lg-3 col-md-6">
												<div className="card-journey-small background-card hover-up">
													<div className="card-image">
														<img src="/assets/imgs/cars-listing/cars-listing-6/car-4.png" alt="Carento" />
													</div>
													<div className="card-info p-4 pt-30">
														<div className="card-rating">
															<div className="card-left" />
															<div className="card-right">
																<span className="rating text-xs-medium rounded-pill">4.96 <span className="text-xs-medium neutral-500">(672 reviews)</span></span>
															</div>
														</div>
														<div className="card-title"><Link className="text-lg-bold neutral-1000 text-nowrap" href="/cars-details-1">Chevrolet Silverado</Link></div>
														<div className="card-program">
															<div className="card-location">
																<p className="text-location text-sm-medium neutral-500">New South Wales, Australia</p>
															</div>
															<div className="card-facitlities">
																<p className="card-miles text-md-medium">25,100 miles</p>
																<p className="card-gear text-md-medium">Automatic</p>
																<p className="card-fuel text-md-medium">Diesel</p>
																<p className="card-seat text-md-medium">7 seats</p>
															</div>
															<div className="endtime">
																<div className="card-price">
																	<h6 className="text-lg-bold neutral-1000">$253.0</h6>
																	<p className="text-md-medium neutral-500">/ day</p>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/cars-details-1">Book Now</Link></div>
															</div>
														</div>
													</div>
												</div>
											</div>
											<div className="col-lg-3 col-md-6">
												<div className="card-journey-small background-card hover-up">
													<div className="card-image">
														<img src="/assets/imgs/cars-listing/cars-listing-6/car-3.png" alt="Carento" />
													</div>
													<div className="card-info p-4 pt-30">
														<div className="card-rating">
															<div className="card-left" />
															<div className="card-right">
																<span className="rating text-xs-medium rounded-pill">4.96 <span className="text-xs-medium neutral-500">(672 reviews)</span></span>
															</div>
														</div>
														<div className="card-title"><Link className="text-lg-bold neutral-1000 text-nowrap" href="/cars-details-1">Subaru Outback Limited XT</Link></div>
														<div className="card-program">
															<div className="card-location">
																<p className="text-location text-sm-medium neutral-500">New South Wales, Australia</p>
															</div>
															<div className="card-facitlities">
																<p className="card-miles text-md-medium">25,100 miles</p>
																<p className="card-gear text-md-medium">Automatic</p>
																<p className="card-fuel text-md-medium">Diesel</p>
																<p className="card-seat text-md-medium">7 seats</p>
															</div>
															<div className="endtime">
																<div className="card-price">
																	<h6 className="text-lg-bold neutral-1000">$75.86</h6>
																	<p className="text-md-medium neutral-500">/ day</p>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/cars-details-1">Book Now</Link></div>
															</div>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
								<div className="content-left order-lg-first d-none">
									<div className="sidebar-left border-1 background-body">
										<div className="box-filters-sidebar">
											<div className="block-filter border-1">
												<h6 className="text-lg-bold item-collapse neutral-1000">Show on map</h6>
												<div className="box-collapse scrollFilter mb-15">
													<div className="pt-0">
														<div className="box-map-small">
															<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5249.611419370571!2d2.3406913487788334!3d48.86191519358772!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47e66e18a5f84801%3A0x6eb5daa624bdebd2!2sLes%20Halles%2C%2075001%20Pa%20ri%2C%20Ph%C3%A1p!5e0!3m2!1svi!2s!4v1711728202093!5m2!1svi!2s" width="100%" height={160} style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
									<div className="sidebar-left border-1 background-body">
										<div className="box-filters-sidebar">
											<div className="block-filter border-1">
												<h6 className="text-lg-bold item-collapse neutral-1000">Filter Price</h6>
												<div className="box-collapse scrollFilter">
													<div className="pt-20">
														<div className="box-slider-range">
															<div id="slider-range" />
															<div className="box-value-price"><span className="text-md-medium neutral-1000">$0</span><span className="text-md-medium neutral-1000">$500</span></div>
															<input className="value-money" type="hidden" />
														</div>
													</div>
												</div>
												<div className="d-flex justify-content-between pt-20 border-top">
													<Link href="#" className="d-flex align-items-center">
														<div className="background-100 icon-shape p-1 rounded-1 me-2">
															<svg xmlns="http://www.w3.org/2000/svg" width={9} height={9} viewBox="0 0 9 9" fill="none">
																<line x1="1.20074" y1="1.5141" x2="7.59837" y2="7.91174" stroke="black" strokeWidth="0.904762" />
																<line x1="1.01337" y1="7.91156" x2="7.411" y2="1.51393" stroke="black" strokeWidth="0.904762" />
															</svg>
														</div>
														<span className="text-sm-medium neutral-1000">Clear</span>
													</Link>
													<Link href="#" className="btn btn-primary px-3 py-2">
														<img src="/assets/imgs/template/icons/user.svg" alt="Carento" />
														Apply
													</Link>
												</div>
											</div>
										</div>
									</div>
									<div className="sidebar-left border-1 background-body">
										<div className="box-filters-sidebar">
											<div className="block-filter border-1">
												<h6 className="text-lg-bold item-collapse neutral-1000">Car type</h6>
												<div className="box-collapse scrollFilter">
													<ul className="list-filter-checkbox">
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">All </span><span className="checkmark" /> </label><span className="number-item">198</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Sedans</span><span className="checkmark" /> </label><span className="number-item">32</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">SUVs </span><span className="checkmark" /> </label><span className="number-item">13</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Coupes</span><span className="checkmark" /> </label><span className="number-item">23</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Hatchbacks</span><span className="checkmark" /> </label><span className="number-item">35</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Convertibles</span><span className="checkmark" /> </label><span className="number-item">56</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Trucks</span><span className="checkmark" /> </label><span className="number-item">76</span>
														</li>
													</ul>
													<div className="box-see-more mt-20 mb-25">
														<Link className="link-see-more" href="#">
															See more
															<svg width={8} height={6} viewBox="0 0 8 6" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M7.89553 1.02367C7.75114 0.870518 7.50961 0.864815 7.35723 1.00881L3.9998 4.18946L0.642774 1.00883C0.490387 0.86444 0.249236 0.870534 0.104474 1.02369C-0.0402885 1.17645 -0.0338199 1.4176 0.118958 1.56236L3.73809 4.99102C3.81123 5.06036 3.90571 5.0954 3.9998 5.0954C4.0939 5.0954 4.18875 5.06036 4.26191 4.99102L7.88104 1.56236C8.03382 1.41758 8.04029 1.17645 7.89553 1.02367Z" fill="#101010" />
															</svg>
														</Link>
													</div>
												</div>
											</div>
										</div>
									</div>
									<div className="sidebar-left border-1 background-body">
										<div className="box-filters-sidebar">
											<div className="block-filter border-1">
												<h6 className="text-lg-bold item-collapse neutral-1000">Car Amenities</h6>
												<div className="box-collapse scrollFilter">
													<ul className="list-filter-checkbox">
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">All</span><span className="checkmark" /> </label><span className="number-item">32</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Leather upholstery</span><span className="checkmark" /> </label><span className="number-item">13</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Heated seats</span><span className="checkmark" /> </label><span className="number-item">23</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Sunroof/Moonroof</span><span className="checkmark" /> </label><span className="number-item">23</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Keyless entry/start</span><span className="checkmark" /> </label><span className="number-item">35</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Heads-up display</span><span className="checkmark" /> </label><span className="number-item">56</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Adaptive cruise control</span><span className="checkmark" /> </label><span className="number-item">76</span>
														</li>
													</ul>
													<div className="box-see-more mt-20 mb-25">
														<Link className="link-see-more" href="#">
															See more
															<svg width={8} height={6} viewBox="0 0 8 6" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M7.89553 1.02367C7.75114 0.870518 7.50961 0.864815 7.35723 1.00881L3.9998 4.18946L0.642774 1.00883C0.490387 0.86444 0.249236 0.870534 0.104474 1.02369C-0.0402885 1.17645 -0.0338199 1.4176 0.118958 1.56236L3.73809 4.99102C3.81123 5.06036 3.90571 5.0954 3.9998 5.0954C4.0939 5.0954 4.18875 5.06036 4.26191 4.99102L7.88104 1.56236C8.03382 1.41758 8.04029 1.17645 7.89553 1.02367Z" fill="#101010" />
															</svg>
														</Link>
													</div>
												</div>
											</div>
										</div>
									</div>
									<div className="sidebar-left border-1 background-body">
										<div className="box-filters-sidebar">
											<div className="block-filter border-1">
												<h6 className="text-lg-bold item-collapse neutral-1000">Fuel Type</h6>
												<div className="box-collapse scrollFilter">
													<ul className="list-filter-checkbox">
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">All</span><span className="checkmark" /> </label><span className="number-item">32</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Plug-in Hybrid (PHEV)</span><span className="checkmark" /> </label><span className="number-item">13</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Hybrid (HEV)</span><span className="checkmark" /> </label><span className="number-item">23</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Electric Vehicle (EV)</span><span className="checkmark" /> </label><span className="number-item">23</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Diesel</span><span className="checkmark" /> </label><span className="number-item">35</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Gasoline/Petrol</span><span className="checkmark" /> </label><span className="number-item">56</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Hydrogen</span><span className="checkmark" /> </label><span className="number-item">76</span>
														</li>
													</ul>
												</div>
											</div>
										</div>
									</div>
									<div className="sidebar-left border-1 background-body">
										<div className="box-filters-sidebar">
											<div className="block-filter border-1">
												<h6 className="text-lg-bold item-collapse neutral-1000">Review Score</h6>
												<div className="box-collapse scrollFilter">
													<ul className="list-filter-checkbox">
														<li>
															<label className="cb-container">
																<input type="checkbox" /><span className="text-sm-medium"> <img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" /><img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" /><img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" /><img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" /><img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" /></span><span className="checkmark" />
															</label>
														</li>
														<li>
															<label className="cb-container">
																<input type="checkbox" /><span className="text-sm-medium"> <img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" /><img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" /><img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" /><img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" /><img src="/assets/imgs/template/icons/star-grey.svg" alt="Carento" /></span><span className="checkmark" />
															</label>
														</li>
														<li>
															<label className="cb-container">
																<input type="checkbox" /><span className="text-sm-medium"> <img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" /><img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" /><img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" /><img src="/assets/imgs/template/icons/star-grey.svg" alt="Carento" /><img src="/assets/imgs/template/icons/star-grey.svg" alt="Carento" /></span><span className="checkmark" />
															</label>
														</li>
														<li>
															<label className="cb-container">
																<input type="checkbox" /><span className="text-sm-medium"> <img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" /><img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" /><img src="/assets/imgs/template/icons/star-grey.svg" alt="Carento" /><img src="/assets/imgs/template/icons/star-grey.svg" alt="Carento" /><img src="/assets/imgs/template/icons/star-grey.svg" alt="Carento" /></span><span className="checkmark" />
															</label>
														</li>
														<li>
															<label className="cb-container">
																<input type="checkbox" /><span className="text-sm-medium"> <img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" /><img src="/assets/imgs/template/icons/star-grey.svg" alt="Carento" /><img src="/assets/imgs/template/icons/star-grey.svg" alt="Carento" /><img src="/assets/imgs/template/icons/star-grey.svg" alt="Carento" /><img src="/assets/imgs/template/icons/star-grey.svg" alt="Carento" /></span><span className="checkmark" />
															</label>
														</li>
													</ul>
												</div>
											</div>
										</div>
									</div>
									<div className="sidebar-left border-1 background-body">
										<div className="box-filters-sidebar">
											<div className="block-filter border-1">
												<h6 className="text-lg-bold item-collapse neutral-1000">Booking Location</h6>
												<div className="box-collapse scrollFilter">
													<ul className="list-filter-checkbox">
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Maldives Haven</span><span className="checkmark" /> </label><span className="number-item">198</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Santorini Retreat</span><span className="checkmark" /> </label><span className="number-item">32</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Parisian Plaza</span><span className="checkmark" /> </label><span className="number-item">13</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Tokyo Tower View</span><span className="checkmark" /> </label><span className="number-item">23</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Caribbean Cove</span><span className="checkmark" /> </label><span className="number-item">35</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Swiss Alps Lodge</span><span className="checkmark" /> </label><span className="number-item">56</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">New York Cityscape</span><span className="checkmark" /> </label><span className="number-item">76</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Dubai Oasis</span><span className="checkmark" /> </label><span className="number-item">76</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Barcelona Beachfront</span><span className="checkmark" /> </label><span className="number-item">76</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">London Luxe</span><span className="checkmark" /> </label><span className="number-item">76</span>
														</li>
													</ul>
													<div className="box-see-more">
														<Link className="link-see-more" href="#">
															See more
															<svg width={8} height={6} viewBox="0 0 8 6" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M7.89553 1.02367C7.75114 0.870518 7.50961 0.864815 7.35723 1.00881L3.9998 4.18946L0.642774 1.00883C0.490387 0.86444 0.249236 0.870534 0.104474 1.02369C-0.0402885 1.17645 -0.0338199 1.4176 0.118958 1.56236L3.73809 4.99102C3.81123 5.06036 3.90571 5.0954 3.9998 5.0954C4.0939 5.0954 4.18875 5.06036 4.26191 4.99102L7.88104 1.56236C8.03382 1.41758 8.04029 1.17645 7.89553 1.02367Z" fill="#101010" />
															</svg>
														</Link>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
						<div className="background-100 pt-55 pb-55">
							<div className="container">
								<Marquee direction='left' pauseOnHover={true} className="carouselTicker carouselTicker-left box-list-brand-car justify-content-center  wow fadeIn">
									<ul className="carouselTicker__list">
										<li className="carouselTicker__item">
											<div className="item-brand">
												<img className="light-mode" src="/assets/imgs/page/homepage2/lexus.png" alt="Carento" />
												<img className="dark-mode" src="/assets/imgs/page/homepage2/lexus-w.png" alt="Carento" />
											</div>
										</li>
										<li className="carouselTicker__item">
											<div className="item-brand">
												<img className="light-mode" src="/assets/imgs/page/homepage2/mer.png" alt="Carento" />
												<img className="dark-mode" src="/assets/imgs/page/homepage2/mer-w.png" alt="Carento" />
											</div>
										</li>
										<li className="carouselTicker__item">
											<div className="item-brand">
												<img className="light-mode" src="/assets/imgs/page/homepage2/bugatti.png" alt="Carento" />
												<img className="dark-mode" src="/assets/imgs/page/homepage2/bugatti-w.png" alt="Carento" />
											</div>
										</li>
										<li className="carouselTicker__item">
											<div className="item-brand">
												<img className="light-mode" src="/assets/imgs/page/homepage2/jaguar.png" alt="Carento" />
												<img className="dark-mode" src="/assets/imgs/page/homepage2/jaguar-w.png" alt="Carento" />
											</div>
										</li>
										<li className="carouselTicker__item">
											<div className="item-brand">
												<img className="light-mode" src="/assets/imgs/page/homepage2/honda.png" alt="Carento" />
												<img className="dark-mode" src="/assets/imgs/page/homepage2/honda-w.png" alt="Carento" />
											</div>
										</li>
										<li className="carouselTicker__item">
											<div className="item-brand">
												<img className="light-mode" src="/assets/imgs/page/homepage2/chevrolet.png" alt="Carento" />
												<img className="dark-mode" src="/assets/imgs/page/homepage2/chevrolet-w.png" alt="Carento" />
											</div>
										</li>
										<li className="carouselTicker__item">
											<div className="item-brand">
												<img className="light-mode" src="/assets/imgs/page/homepage2/acura.png" alt="Carento" />
												<img className="dark-mode" src="/assets/imgs/page/homepage2/acura-w.png" alt="Carento" />
											</div>
										</li>
										<li className="carouselTicker__item">
											<div className="item-brand">
												<img className="light-mode" src="/assets/imgs/page/homepage2/bmw.png" alt="Carento" />
												<img className="dark-mode" src="/assets/imgs/page/homepage2/bmw-w.png" alt="Carento" />
											</div>
										</li>
										<li className="carouselTicker__item">
											<div className="item-brand">
												<img className="light-mode" src="/assets/imgs/page/homepage2/toyota.png" alt="Carento" />
												<img className="dark-mode" src="/assets/imgs/page/homepage2/toyota-w.png" alt="Carento" />
											</div>
										</li>
										<li className="carouselTicker__item">
											<div className="item-brand">
												<img className="light-mode" src="/assets/imgs/page/homepage2/lexus.png" alt="Carento" />
												<img className="dark-mode" src="/assets/imgs/page/homepage2/lexus-w.png" alt="Carento" />
											</div>
										</li>
										<li className="carouselTicker__item">
											<div className="item-brand">
												<img className="light-mode" src="/assets/imgs/page/homepage2/mer.png" alt="Carento" />
												<img className="dark-mode" src="/assets/imgs/page/homepage2/mer-w.png" alt="Carento" />
											</div>
										</li>
										<li className="carouselTicker__item">
											<div className="item-brand">
												<img className="light-mode" src="/assets/imgs/page/homepage2/bugatti.png" alt="Carento" />
												<img className="dark-mode" src="/assets/imgs/page/homepage2/bugatti-w.png" alt="Carento" />
											</div>
										</li>
									</ul>
								</Marquee>
							</div>
						</div>
					</section>
				</div >

			</Layout >
		</>
	)
}