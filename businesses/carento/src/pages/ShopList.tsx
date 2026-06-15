
import Layout from "@/components/layout/Layout"
import Link from "@/components/common/Link"
import Marquee from 'react-fast-marquee'
export default function ShopList() {

	return (
		<>

			<Layout footerStyle={1}>
				<div>
					<div className="page-header-2 pt-30 background-body">
						<div className="custom-container position-relative mx-auto">
							<div className="bg-overlay rounded-12 overflow-hidden">
								<img className="w-100 h-100 img-fluid img-banner" src="/assets/imgs/page-header/banner9.png" alt="Carento" />
							</div>
							<div className="container position-absolute z-1 top-50 start-50 pb-70 translate-middle text-center">
								<span className="text-sm-bold bg-2 px-4 py-3 rounded-12">Find cars for sale and for rent near you</span>
								<h2 className="text-white mt-4">Find the Perfect Part at the <br /> Best Price for Your Vehicle's Comfort</h2>
								<span className="text-white text-lg-medium" />
							</div>
							<div className="background-body position-absolute z-1 top-100 start-50 translate-middle px-3 py-2 rounded-12 border d-flex gap-3 @@navigation-page d-none d-md-flex">
								<Link href="/" className="neutral-700 text-md-medium">Home</Link>
								<span className="@@ds-prev-page">
									<img src="/assets/imgs/template/icons/arrow-right.svg" alt="Carento" />
								</span>
								<Link href="#" className="neutral-1000 text-md-bold">Shop</Link>
								<span>
									<img src="/assets/imgs/template/icons/arrow-right.svg" alt="Carento" />
								</span>
								<Link href="#" className="neutral-1000 text-md-bold text-nowrap">All items</Link>
							</div>
						</div>
					</div>
					{/* shop-list-1 */}
					<section className="section-box pt-50 background-body">
						<div className="container">
							<div className="row align-items-end">
								<div className="col-md-9 mb-30 wow fadeInUp">
									<h4 className="title-svg neutral-1000 mb-15">Latest Products</h4>
									<p className="text-lg-medium text-bold neutral-500">Experience The Best Car Services In Carento</p>
								</div>
							</div>
						</div>
					</section>
					<section className="box-section block-content-tourlist background-body">
						<div className="container">
							<div className="box-content-main pt-20">
								<div className="content-right">
									<div className="box-filters mb-25 pb-5 border-bottom border-1">
										<div className="row align-items-center">
											<div className="col-xl-4 col-md-4 mb-10 text-lg-start text-center">
												<div className="box-view-type">
													<Link className="display-type display-grid active" href="/cars-list-1">
														<svg width={22} height={22} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
															<path d="M20 8V2.75C20 2.3375 19.6625 2 19.25 2H14C13.5875 2 13.25 2.3375 13.25 2.75V8C13.25 8.4125 13.5875 8.75 14 8.75H19.25C19.6625 8.75 20 8.4125 20 8ZM19.25 0.5C20.495 0.5 21.5 1.505 21.5 2.75V8C21.5 9.245 20.495 10.25 19.25 10.25H14C12.755 10.25 11.75 9.245 11.75 8V2.75C11.75 1.505 12.755 0.5 14 0.5H19.25Z" fill="#101010" />
															<path d="M20 19.25V14C20 13.5875 19.6625 13.25 19.25 13.25H14C13.5875 13.25 13.25 13.5875 13.25 14V19.25C13.25 19.6625 13.5875 20 14 20H19.25C19.6625 20 20 19.6625 20 19.25ZM19.25 11.75C20.495 11.75 21.5 12.755 21.5 14V19.25C21.5 20.495 20.495 21.5 19.25 21.5H14C12.755 21.5 11.75 20.495 11.75 19.25V14C11.75 12.755 12.755 11.75 14 11.75H19.25Z" fill="#101010" />
															<path d="M8 8.75C8.4125 8.75 8.75 8.4125 8.75 8V2.75C8.75 2.3375 8.4125 2 8 2H2.75C2.3375 2 2 2.3375 2 2.75V8C2 8.4125 2.3375 8.75 2.75 8.75H8ZM8 0.5C9.245 0.5 10.25 1.505 10.25 2.75V8C10.25 9.245 9.245 10.25 8 10.25H2.75C1.505 10.25 0.5 9.245 0.5 8V2.75C0.5 1.505 1.505 0.5 2.75 0.5H8Z" fill="#101010" />
															<path d="M8 20C8.4125 20 8.75 19.6625 8.75 19.25V14C8.75 13.5875 8.4125 13.25 8 13.25H2.75C2.3375 13.25 2 13.5875 2 14V19.25C2 19.6625 2.3375 20 2.75 20H8ZM8 11.75C9.245 11.75 10.25 12.755 10.25 14V19.25C10.25 20.495 9.245 21.5 8 21.5H2.75C1.505 21.5 0.5 20.495 0.5 19.25V14C0.5 12.755 1.505 11.75 2.75 11.75H8Z" fill="#101010" />
														</svg>
													</Link>
													<Link className="display-type display-list" href="/cars-list-4">
														<svg width={21} height={21} viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
															<path d="M4.788 0H1.09497C0.491194 0 0 0.486501 0 1.08456V4.74269C0 5.34075 0.491194 5.82729 1.09497 5.82729H4.788C5.39177 5.82729 5.88297 5.34075 5.88297 4.74269V1.08456C5.88297 0.486501 5.39177 0 4.788 0ZM4.80951 4.74273C4.80951 4.75328 4.79865 4.76404 4.788 4.76404H1.09497C1.08432 4.76404 1.07345 4.75328 1.07345 4.74273V1.08456C1.07345 1.07401 1.08432 1.06329 1.09497 1.06329H4.788C4.79865 1.06329 4.80951 1.07401 4.80951 1.08456V4.74273ZM7.53412 1.32686C7.53412 1.03321 7.77444 0.795211 8.07084 0.795211H20.4632C20.7596 0.795211 21 1.03321 21 1.32686C21 1.62046 20.7596 1.8585 20.4632 1.8585H8.07084C7.77444 1.8585 7.53412 1.62046 7.53412 1.32686ZM21 4.50043C21 4.79408 20.7597 5.03208 20.4633 5.03208H8.07084C7.77444 5.03208 7.53412 4.79408 7.53412 4.50043C7.53412 4.20683 7.77444 3.96879 8.07084 3.96879H20.4632C20.7597 3.96879 21 4.20683 21 4.50043ZM4.788 7.58633H1.09497C0.491194 7.58633 0 8.07283 0 8.67089V12.329C0 12.9271 0.491194 13.4136 1.09497 13.4136H4.788C5.39177 13.4136 5.88297 12.9271 5.88297 12.329V8.67089C5.88297 8.07288 5.39177 7.58633 4.788 7.58633ZM4.80951 12.3291C4.80951 12.3396 4.79865 12.3504 4.788 12.3504H1.09497C1.08432 12.3504 1.07345 12.3396 1.07345 12.3291V8.67094C1.07345 8.66039 1.08432 8.64967 1.09497 8.64967H4.788C4.79865 8.64967 4.80951 8.66039 4.80951 8.67094V12.3291ZM4.788 15.1727H1.09497C0.491194 15.1727 0 15.6592 0 16.2573V19.9154C0 20.5135 0.491194 21 1.09497 21H4.788C5.39177 21 5.88297 20.5135 5.88297 19.9154V16.2573C5.88297 15.6592 5.39177 15.1727 4.788 15.1727ZM4.80951 19.9154C4.80951 19.926 4.79865 19.9368 4.788 19.9368H1.09497C1.08432 19.9368 1.07345 19.926 1.07345 19.9154V16.2573C1.07345 16.2468 1.08432 16.236 1.09497 16.236H4.788C4.79865 16.236 4.80951 16.2468 4.80951 16.2573V19.9154ZM21 12.0868C21 12.3805 20.7597 12.6185 20.4633 12.6185H8.07084C7.77444 12.6185 7.53412 12.3805 7.53412 12.0868C7.53412 11.7932 7.77444 11.5552 8.07084 11.5552H20.4632C20.7597 11.5552 21 11.7932 21 12.0868ZM21 8.91328C21 9.20688 20.7597 9.44492 20.4633 9.44492H8.07084C7.77444 9.44492 7.53412 9.20688 7.53412 8.91328C7.53412 8.61963 7.77444 8.38163 8.07084 8.38163H20.4632C20.7597 8.38163 21 8.61963 21 8.91328ZM21 16.4996C21 16.7932 20.7597 17.0313 20.4633 17.0313H8.07084C7.77444 17.0313 7.53412 16.7932 7.53412 16.4996C7.53412 16.206 7.77444 15.968 8.07084 15.968H20.4632C20.7597 15.968 21 16.206 21 16.4996ZM21 19.6732C21 19.9668 20.7597 20.2048 20.4633 20.2048H8.07084C7.77444 20.2048 7.53412 19.9668 7.53412 19.6732C7.53412 19.3796 7.77444 19.1415 8.07084 19.1415H20.4632C20.7597 19.1415 21 19.3796 21 19.6732Z" fill="#101010" />
														</svg>
													</Link>
													<span className="text-sm-bold neutral-500 number-found">64 items found</span>
												</div>
											</div>
											<div className="col-xl-8 col-md-8 mb-10 text-lg-end text-center">
												<div className="box-item-sort">
													<Link className="btn btn-sort" href="#">
														<svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
															<path d="M8.25 6L5.25 3M5.25 3L2.25 6M5.25 3L5.25 15" stroke="#101010" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
															<path d="M9.75 12L12.75 15M12.75 15L15.75 12M12.75 15L12.75 3" stroke="#101010" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
														</svg>
													</Link>
													<div className="item-sort border-1">
														<span className="text-xs-medium neutral-500 mr-5">Show</span>
														<div className="dropdown dropdown-sort border-1-right">
															<button className="btn dropdown-toggle" id="dropdownSort2" type="button" data-bs-toggle="dropdown" aria-expanded="false" data-bs-display="static"><span>20</span></button>
															<ul className="dropdown-menu dropdown-menu-light" aria-labelledby="dropdownSort2">
																<li><Link className="dropdown-item active" href="#">20</Link></li>
																<li><Link className="dropdown-item" href="#">30</Link></li>
																<li><Link className="dropdown-item" href="#">50</Link></li>
															</ul>
														</div>
													</div>
													<div className="item-sort border-1">
														<span className="text-xs-medium neutral-500 mr-5">Sort by:</span>
														<div className="dropdown dropdown-sort border-1-right">
															<button className="btn dropdown-toggle" id="dropdownSort" type="button" data-bs-toggle="dropdown" aria-expanded="false"><span>Most Viewed</span></button>
															<ul className="dropdown-menu dropdown-menu-light m-0" aria-labelledby="dropdownSort">
																<li><Link className="dropdown-item active" href="#">Most Viewed</Link></li>
																<li><Link className="dropdown-item" href="#">Recently search</Link></li>
																<li><Link className="dropdown-item" href="#">Most popular</Link></li>
																<li><Link className="dropdown-item" href="#">Top rated</Link></li>
															</ul>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
									<div className="box-grid-tours wow fadeIn">
										<div className="row">
											<div className="col-lg-4 col-md-6">
												<div className="card-journey-small background-card hover-up">
													<div className="card-image">
														<Link className="wish" href="#">
															<svg width={20} height={18} viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M17.071 10.1422L11.4141 15.7991C10.6331 16.5801 9.36672 16.5801 8.58568 15.7991L2.92882 10.1422C0.9762 8.1896 0.9762 5.02378 2.92882 3.07116C4.88144 1.11853 8.04727 1.11853 9.99989 3.07116C11.9525 1.11853 15.1183 1.11853 17.071 3.07116C19.0236 5.02378 19.0236 8.1896 17.071 10.1422Z" stroke="#101010" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</Link>
														<img src="/assets/imgs/shop/shop-list/product1.png" alt="Carento" />
													</div>
													<div className="card-info p-3 pt-30 border-top">
														<div className="card-rating">
															<div className="card-left" />
															<div className="card-right">
																<span className="rating text-xs-medium rounded-pill">4.9 5 <span className="text-xs-medium neutral-500">(672 reviews)</span></span>
															</div>
														</div>
														<div className="card-title"><Link className="text-lg-bold neutral-1000" href="/shop-details">Mobil 1 Extended Performance Full Synthetic Motor Oil</Link></div>
														<div className="card-program">
															<ul className="list-style-disc ps-3 pe-4">
																<li className="text-xs-medium neutral-1000">Mobil Delvac 1300 Super Heavy Duty Synthetic Blend</li>
																<li className="text-xs-medium neutral-1000">Confident driving in all weather conditions</li>
																<li className="text-xs-medium neutral-1000">Visual Alignment Indicators</li>
															</ul>
															<div className="endtime pt-3 mt-3 border-top">
																<div className="card-price">
																	<h6 className="text-md-medium neutral-500 text-decoration-line-through">$68.53</h6>
																</div>
																<Link href="#" className="card-button pe-3"><img src="/assets/imgs/shop/shop-list/stock.png" alt="Carento" /></Link>
															</div>
															<div className="endtime">
																<div className="card-price">
																	<h6 className="text-lg-bold neutral-1000">$98.67</h6>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/shop-details">Book Now</Link></div>
															</div>
														</div>
													</div>
												</div>
											</div>
											<div className="col-lg-4 col-md-6">
												<div className="card-journey-small background-card hover-up">
													<div className="card-image">
														<Link className="wish" href="#">
															<svg width={20} height={18} viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M17.071 10.1422L11.4141 15.7991C10.6331 16.5801 9.36672 16.5801 8.58568 15.7991L2.92882 10.1422C0.9762 8.1896 0.9762 5.02378 2.92882 3.07116C4.88144 1.11853 8.04727 1.11853 9.99989 3.07116C11.9525 1.11853 15.1183 1.11853 17.071 3.07116C19.0236 5.02378 19.0236 8.1896 17.071 10.1422Z" stroke="#101010" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</Link>
														<img src="/assets/imgs/shop/shop-list/product2.png" alt="Carento" />
													</div>
													<div className="card-info p-3 pt-30 border-top">
														<div className="card-rating">
															<div className="card-left" />
															<div className="card-right">
																<span className="rating text-xs-medium rounded-pill">4.9 5 <span className="text-xs-medium neutral-500">(672 reviews)</span></span>
															</div>
														</div>
														<div className="card-title"><Link className="text-lg-bold neutral-1000" href="/shop-details">Thinkware F770 Dash Cam Dual Channel Wifi</Link></div>
														<div className="card-program">
															<ul className="list-style-disc ps-3 pe-4">
																<li className="text-xs-medium neutral-1000">Mobil Delvac 1300 Super Heavy Duty Synthetic Blend</li>
																<li className="text-xs-medium neutral-1000">Confident driving in all weather conditions</li>
																<li className="text-xs-medium neutral-1000">Visual Alignment Indicators</li>
															</ul>
															<div className="endtime pt-3 mt-3 border-top">
																<div className="card-price">
																	<h6 className="text-md-medium neutral-500 text-decoration-line-through">$68.53</h6>
																</div>
																<Link href="#" className="card-button pe-3"><img src="/assets/imgs/shop/shop-list/stock.png" alt="Carento" /></Link>
															</div>
															<div className="endtime">
																<div className="card-price">
																	<h6 className="text-lg-bold neutral-1000">$98.67</h6>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/shop-details">Book Now</Link></div>
															</div>
														</div>
													</div>
												</div>
											</div>
											<div className="col-lg-4 col-md-6">
												<div className="card-journey-small background-card hover-up">
													<div className="card-image">
														<Link className="wish" href="#">
															<svg width={20} height={18} viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M17.071 10.1422L11.4141 15.7991C10.6331 16.5801 9.36672 16.5801 8.58568 15.7991L2.92882 10.1422C0.9762 8.1896 0.9762 5.02378 2.92882 3.07116C4.88144 1.11853 8.04727 1.11853 9.99989 3.07116C11.9525 1.11853 15.1183 1.11853 17.071 3.07116C19.0236 5.02378 19.0236 8.1896 17.071 10.1422Z" stroke="#101010" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</Link>
														<img src="/assets/imgs/shop/shop-list/product3.png" alt="Carento" />
													</div>
													<div className="card-info p-3 pt-30 border-top">
														<div className="card-rating">
															<div className="card-left" />
															<div className="card-right">
																<span className="rating text-xs-medium rounded-pill">4.9 5 <span className="text-xs-medium neutral-500">(672 reviews)</span></span>
															</div>
														</div>
														<div className="card-title"><Link className="text-lg-bold neutral-1000" href="/shop-details">Mobil Delvac 1300 Super Heavy Duty Synthetic Blend</Link></div>
														<div className="card-program">
															<ul className="list-style-disc ps-3 pe-4">
																<li className="text-xs-medium neutral-1000">Mobil Delvac 1300 Super Heavy Duty Synthetic Blend</li>
																<li className="text-xs-medium neutral-1000">Confident driving in all weather conditions</li>
																<li className="text-xs-medium neutral-1000">Visual Alignment Indicators</li>
															</ul>
															<div className="endtime pt-3 mt-3 border-top">
																<div className="card-price">
																	<h6 className="text-md-medium neutral-500 text-decoration-line-through">$68.53</h6>
																</div>
																<Link href="#" className="card-button pe-3"><img src="/assets/imgs/shop/shop-list/stock.png" alt="Carento" /></Link>
															</div>
															<div className="endtime">
																<div className="card-price">
																	<h6 className="text-lg-bold neutral-1000">$98.67</h6>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/shop-details">Book Now</Link></div>
															</div>
														</div>
													</div>
												</div>
											</div>
											<div className="col-lg-4 col-md-6">
												<div className="card-journey-small background-card hover-up">
													<div className="card-image">
														<Link className="wish" href="#">
															<svg width={20} height={18} viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M17.071 10.1422L11.4141 15.7991C10.6331 16.5801 9.36672 16.5801 8.58568 15.7991L2.92882 10.1422C0.9762 8.1896 0.9762 5.02378 2.92882 3.07116C4.88144 1.11853 8.04727 1.11853 9.99989 3.07116C11.9525 1.11853 15.1183 1.11853 17.071 3.07116C19.0236 5.02378 19.0236 8.1896 17.071 10.1422Z" stroke="#101010" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</Link>
														<img src="/assets/imgs/shop/shop-list/product4.png" alt="Carento" />
													</div>
													<div className="card-info p-3 pt-30 border-top">
														<div className="card-rating">
															<div className="card-left" />
															<div className="card-right">
																<span className="rating text-xs-medium rounded-pill">4.9 5 <span className="text-xs-medium neutral-500">(672 reviews)</span></span>
															</div>
														</div>
														<div className="card-title"><Link className="text-lg-bold neutral-1000" href="/shop-details">Spyder® – Projector Headlight Misubisi 2024</Link></div>
														<div className="card-program">
															<ul className="list-style-disc ps-3 pe-4">
																<li className="text-xs-medium neutral-1000">Mobil Delvac 1300 Super Heavy Duty Synthetic Blend</li>
																<li className="text-xs-medium neutral-1000">Confident driving in all weather conditions</li>
																<li className="text-xs-medium neutral-1000">Visual Alignment Indicators</li>
															</ul>
															<div className="endtime pt-3 mt-3 border-top">
																<div className="card-price">
																	<h6 className="text-md-medium neutral-500 text-decoration-line-through">$68.53</h6>
																</div>
																<Link href="#" className="card-button pe-3"><img src="/assets/imgs/shop/shop-list/stock.png" alt="Carento" /></Link>
															</div>
															<div className="endtime">
																<div className="card-price">
																	<h6 className="text-lg-bold neutral-1000">$98.67</h6>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/shop-details">Book Now</Link></div>
															</div>
														</div>
													</div>
												</div>
											</div>
											<div className="col-lg-4 col-md-6">
												<div className="card-journey-small background-card hover-up">
													<div className="card-image">
														<Link className="wish" href="#">
															<svg width={20} height={18} viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M17.071 10.1422L11.4141 15.7991C10.6331 16.5801 9.36672 16.5801 8.58568 15.7991L2.92882 10.1422C0.9762 8.1896 0.9762 5.02378 2.92882 3.07116C4.88144 1.11853 8.04727 1.11853 9.99989 3.07116C11.9525 1.11853 15.1183 1.11853 17.071 3.07116C19.0236 5.02378 19.0236 8.1896 17.071 10.1422Z" stroke="#101010" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</Link>
														<img src="/assets/imgs/shop/shop-list/product5.png" alt="Carento" />
													</div>
													<div className="card-info p-3 pt-30 border-top">
														<div className="card-rating">
															<div className="card-left" />
															<div className="card-right">
																<span className="rating text-xs-medium rounded-pill">4.9 5 <span className="text-xs-medium neutral-500">(672 reviews)</span></span>
															</div>
														</div>
														<div className="card-title"><Link className="text-lg-bold neutral-1000" href="/shop-details">HRE FlowForm® – FT01 Tarma Honda 2024</Link></div>
														<div className="card-program">
															<ul className="list-style-disc ps-3 pe-4">
																<li className="text-xs-medium neutral-1000">Mobil Delvac 1300 Super Heavy Duty Synthetic Blend</li>
																<li className="text-xs-medium neutral-1000">Confident driving in all weather conditions</li>
																<li className="text-xs-medium neutral-1000">Visual Alignment Indicators</li>
															</ul>
															<div className="endtime pt-3 mt-3 border-top">
																<div className="card-price">
																	<h6 className="text-md-medium neutral-500 text-decoration-line-through">$68.53</h6>
																</div>
																<Link href="#" className="card-button pe-3"><img src="/assets/imgs/shop/shop-list/stock.png" alt="Carento" /></Link>
															</div>
															<div className="endtime">
																<div className="card-price">
																	<h6 className="text-lg-bold neutral-1000">$98.67</h6>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/shop-details">Book Now</Link></div>
															</div>
														</div>
													</div>
												</div>
											</div>
											<div className="col-lg-4 col-md-6">
												<div className="card-journey-small background-card hover-up">
													<div className="card-image">
														<Link className="wish" href="#">
															<svg width={20} height={18} viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M17.071 10.1422L11.4141 15.7991C10.6331 16.5801 9.36672 16.5801 8.58568 15.7991L2.92882 10.1422C0.9762 8.1896 0.9762 5.02378 2.92882 3.07116C4.88144 1.11853 8.04727 1.11853 9.99989 3.07116C11.9525 1.11853 15.1183 1.11853 17.071 3.07116C19.0236 5.02378 19.0236 8.1896 17.071 10.1422Z" stroke="#101010" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</Link>
														<img src="/assets/imgs/shop/shop-list/product6.png" alt="Carento" />
													</div>
													<div className="card-info p-3 pt-30 border-top">
														<div className="card-rating">
															<div className="card-left" />
															<div className="card-right">
																<span className="rating text-xs-medium rounded-pill">4.9 5 <span className="text-xs-medium neutral-500">(672 reviews)</span></span>
															</div>
														</div>
														<div className="card-title"><Link className="text-lg-bold neutral-1000" href="/shop-details">Right Stuff® – Drilled and Slotted Brake Rotor</Link></div>
														<div className="card-program">
															<ul className="list-style-disc ps-3 pe-4">
																<li className="text-xs-medium neutral-1000">Mobil Delvac 1300 Super Heavy Duty Synthetic Blend</li>
																<li className="text-xs-medium neutral-1000">Confident driving in all weather conditions</li>
																<li className="text-xs-medium neutral-1000">Visual Alignment Indicators</li>
															</ul>
															<div className="endtime pt-3 mt-3 border-top">
																<div className="card-price">
																	<h6 className="text-md-medium neutral-500 text-decoration-line-through">$68.53</h6>
																</div>
																<Link href="#" className="card-button pe-3"><img src="/assets/imgs/shop/shop-list/stock.png" alt="Carento" /></Link>
															</div>
															<div className="endtime">
																<div className="card-price">
																	<h6 className="text-lg-bold neutral-1000">$98.67</h6>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/shop-details">Book Now</Link></div>
															</div>
														</div>
													</div>
												</div>
											</div>
											<div className="col-lg-4 col-md-6">
												<div className="card-journey-small background-card hover-up">
													<div className="card-image">
														<Link className="wish" href="#">
															<svg width={20} height={18} viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M17.071 10.1422L11.4141 15.7991C10.6331 16.5801 9.36672 16.5801 8.58568 15.7991L2.92882 10.1422C0.9762 8.1896 0.9762 5.02378 2.92882 3.07116C4.88144 1.11853 8.04727 1.11853 9.99989 3.07116C11.9525 1.11853 15.1183 1.11853 17.071 3.07116C19.0236 5.02378 19.0236 8.1896 17.071 10.1422Z" stroke="#101010" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</Link>
														<img src="/assets/imgs/shop/shop-list/product7.png" alt="Carento" />
													</div>
													<div className="card-info p-3 pt-30 border-top">
														<div className="card-rating">
															<div className="card-left" />
															<div className="card-right">
																<span className="rating text-xs-medium rounded-pill">4.9 5 <span className="text-xs-medium neutral-500">(672 reviews)</span></span>
															</div>
														</div>
														<div className="card-title"><Link className="text-lg-bold neutral-1000" href="/shop-details">PIRELLI TIRES® – P4 FOUR SEASONS PLUS</Link></div>
														<div className="card-program">
															<ul className="list-style-disc ps-3 pe-4">
																<li className="text-xs-medium neutral-1000">Mobil Delvac 1300 Super Heavy Duty Synthetic Blend</li>
																<li className="text-xs-medium neutral-1000">Confident driving in all weather conditions</li>
																<li className="text-xs-medium neutral-1000">Visual Alignment Indicators</li>
															</ul>
															<div className="endtime pt-3 mt-3 border-top">
																<div className="card-price">
																	<h6 className="text-md-medium neutral-500 text-decoration-line-through">$68.53</h6>
																</div>
																<Link href="#" className="card-button pe-3"><img src="/assets/imgs/shop/shop-list/stock.png" alt="Carento" /></Link>
															</div>
															<div className="endtime">
																<div className="card-price">
																	<h6 className="text-lg-bold neutral-1000">$98.67</h6>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/shop-details">Book Now</Link></div>
															</div>
														</div>
													</div>
												</div>
											</div>
											<div className="col-lg-4 col-md-6">
												<div className="card-journey-small background-card hover-up">
													<div className="card-image">
														<Link className="wish" href="#">
															<svg width={20} height={18} viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M17.071 10.1422L11.4141 15.7991C10.6331 16.5801 9.36672 16.5801 8.58568 15.7991L2.92882 10.1422C0.9762 8.1896 0.9762 5.02378 2.92882 3.07116C4.88144 1.11853 8.04727 1.11853 9.99989 3.07116C11.9525 1.11853 15.1183 1.11853 17.071 3.07116C19.0236 5.02378 19.0236 8.1896 17.071 10.1422Z" stroke="#101010" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</Link>
														<img src="/assets/imgs/shop/shop-list/product8.png" alt="Carento" />
													</div>
													<div className="card-info p-3 pt-30 border-top">
														<div className="card-rating">
															<div className="card-left" />
															<div className="card-right">
																<span className="rating text-xs-medium rounded-pill">4.9 5 <span className="text-xs-medium neutral-500">(672 reviews)</span></span>
															</div>
														</div>
														<div className="card-title"><Link className="text-lg-bold neutral-1000" href="/shop-details">Lumen® – Custom Sealed Beam LED Headlights</Link></div>
														<div className="card-program">
															<ul className="list-style-disc ps-3 pe-4">
																<li className="text-xs-medium neutral-1000">Mobil Delvac 1300 Super Heavy Duty Synthetic Blend</li>
																<li className="text-xs-medium neutral-1000">Confident driving in all weather conditions</li>
																<li className="text-xs-medium neutral-1000">Visual Alignment Indicators</li>
															</ul>
															<div className="endtime pt-3 mt-3 border-top">
																<div className="card-price">
																	<h6 className="text-md-medium neutral-500 text-decoration-line-through">$68.53</h6>
																</div>
																<Link href="#" className="card-button pe-3"><img src="/assets/imgs/shop/shop-list/stock.png" alt="Carento" /></Link>
															</div>
															<div className="endtime">
																<div className="card-price">
																	<h6 className="text-lg-bold neutral-1000">$98.67</h6>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/shop-details">Book Now</Link></div>
															</div>
														</div>
													</div>
												</div>
											</div>
											<div className="col-lg-4 col-md-6">
												<div className="card-journey-small background-card hover-up">
													<div className="card-image">
														<Link className="wish" href="#">
															<svg width={20} height={18} viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M17.071 10.1422L11.4141 15.7991C10.6331 16.5801 9.36672 16.5801 8.58568 15.7991L2.92882 10.1422C0.9762 8.1896 0.9762 5.02378 2.92882 3.07116C4.88144 1.11853 8.04727 1.11853 9.99989 3.07116C11.9525 1.11853 15.1183 1.11853 17.071 3.07116C19.0236 5.02378 19.0236 8.1896 17.071 10.1422Z" stroke="#101010" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</Link>
														<img src="/assets/imgs/shop/shop-list/product9.png" alt="Carento" />
													</div>
													<div className="card-info p-3 pt-30 border-top">
														<div className="card-rating">
															<div className="card-left" />
															<div className="card-right">
																<span className="rating text-xs-medium rounded-pill">4.9 5 <span className="text-xs-medium neutral-500">(672 reviews)</span></span>
															</div>
														</div>
														<div className="card-title"><Link className="text-lg-bold neutral-1000" href="/shop-details">Shell Rotella T1 SAE 30 Conventional Heavy Duty</Link></div>
														<div className="card-program">
															<ul className="list-style-disc ps-3 pe-4">
																<li className="text-xs-medium neutral-1000">Mobil Delvac 1300 Super Heavy Duty Synthetic Blend</li>
																<li className="text-xs-medium neutral-1000">Confident driving in all weather conditions</li>
																<li className="text-xs-medium neutral-1000">Visual Alignment Indicators</li>
															</ul>
															<div className="endtime pt-3 mt-3 border-top">
																<div className="card-price">
																	<h6 className="text-md-medium neutral-500 text-decoration-line-through">$68.53</h6>
																</div>
																<Link href="#" className="card-button pe-3"><img src="/assets/imgs/shop/shop-list/stock.png" alt="Carento" /></Link>
															</div>
															<div className="endtime">
																<div className="card-price">
																	<h6 className="text-lg-bold neutral-1000">$98.67</h6>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/shop-details">Book Now</Link></div>
															</div>
														</div>
													</div>
												</div>
											</div>
											<div className="col-lg-4 col-md-6">
												<div className="card-journey-small background-card hover-up">
													<div className="card-image">
														<Link className="wish" href="#">
															<svg width={20} height={18} viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M17.071 10.1422L11.4141 15.7991C10.6331 16.5801 9.36672 16.5801 8.58568 15.7991L2.92882 10.1422C0.9762 8.1896 0.9762 5.02378 2.92882 3.07116C4.88144 1.11853 8.04727 1.11853 9.99989 3.07116C11.9525 1.11853 15.1183 1.11853 17.071 3.07116C19.0236 5.02378 19.0236 8.1896 17.071 10.1422Z" stroke="#101010" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</Link>
														<img src="/assets/imgs/shop/shop-list/product10.png" alt="Carento" />
													</div>
													<div className="card-info p-3 pt-30 border-top">
														<div className="card-rating">
															<div className="card-left" />
															<div className="card-right">
																<span className="rating text-xs-medium rounded-pill">4.9 5 <span className="text-xs-medium neutral-500">(672 reviews)</span></span>
															</div>
														</div>
														<div className="card-title"><Link className="text-lg-bold neutral-1000" href="/shop-details">R1 Concepts® – eLINE Series Plain Brake Rotors</Link></div>
														<div className="card-program">
															<ul className="list-style-disc ps-3 pe-4">
																<li className="text-xs-medium neutral-1000">Mobil Delvac 1300 Super Heavy Duty Synthetic Blend</li>
																<li className="text-xs-medium neutral-1000">Confident driving in all weather conditions</li>
																<li className="text-xs-medium neutral-1000">Visual Alignment Indicators</li>
															</ul>
															<div className="endtime pt-3 mt-3 border-top">
																<div className="card-price">
																	<h6 className="text-md-medium neutral-500 text-decoration-line-through">$68.53</h6>
																</div>
																<Link href="#" className="card-button pe-3"><img src="/assets/imgs/shop/shop-list/stock.png" alt="Carento" /></Link>
															</div>
															<div className="endtime">
																<div className="card-price">
																	<h6 className="text-lg-bold neutral-1000">$98.67</h6>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/shop-details">Book Now</Link></div>
															</div>
														</div>
													</div>
												</div>
											</div>
											<div className="col-lg-4 col-md-6">
												<div className="card-journey-small background-card hover-up">
													<div className="card-image">
														<Link className="wish" href="#">
															<svg width={20} height={18} viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M17.071 10.1422L11.4141 15.7991C10.6331 16.5801 9.36672 16.5801 8.58568 15.7991L2.92882 10.1422C0.9762 8.1896 0.9762 5.02378 2.92882 3.07116C4.88144 1.11853 8.04727 1.11853 9.99989 3.07116C11.9525 1.11853 15.1183 1.11853 17.071 3.07116C19.0236 5.02378 19.0236 8.1896 17.071 10.1422Z" stroke="#101010" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</Link>
														<img src="/assets/imgs/shop/shop-list/product11.png" alt="Carento" />
													</div>
													<div className="card-info p-3 pt-30 border-top">
														<div className="card-rating">
															<div className="card-left" />
															<div className="card-right">
																<span className="rating text-xs-medium rounded-pill">4.9 5 <span className="text-xs-medium neutral-500">(672 reviews)</span></span>
															</div>
														</div>
														<div className="card-title"><Link className="text-lg-bold neutral-1000" href="/shop-details">Mobil Delvac 1300 Super Heavy Duty Synthetic Blend</Link></div>
														<div className="card-program">
															<ul className="list-style-disc ps-3 pe-4">
																<li className="text-xs-medium neutral-1000">Mobil Delvac 1300 Super Heavy Duty Synthetic Blend</li>
																<li className="text-xs-medium neutral-1000">Confident driving in all weather conditions</li>
																<li className="text-xs-medium neutral-1000">Visual Alignment Indicators</li>
															</ul>
															<div className="endtime pt-3 mt-3 border-top">
																<div className="card-price">
																	<h6 className="text-md-medium neutral-500 text-decoration-line-through">$68.53</h6>
																</div>
																<Link href="#" className="card-button pe-3"><img src="/assets/imgs/shop/shop-list/stock.png" alt="Carento" /></Link>
															</div>
															<div className="endtime">
																<div className="card-price">
																	<h6 className="text-lg-bold neutral-1000">$98.67</h6>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/shop-details">Book Now</Link></div>
															</div>
														</div>
													</div>
												</div>
											</div>
											<div className="col-lg-4 col-md-6">
												<div className="card-journey-small background-card hover-up">
													<div className="card-image">
														<Link className="wish" href="#">
															<svg width={20} height={18} viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M17.071 10.1422L11.4141 15.7991C10.6331 16.5801 9.36672 16.5801 8.58568 15.7991L2.92882 10.1422C0.9762 8.1896 0.9762 5.02378 2.92882 3.07116C4.88144 1.11853 8.04727 1.11853 9.99989 3.07116C11.9525 1.11853 15.1183 1.11853 17.071 3.07116C19.0236 5.02378 19.0236 8.1896 17.071 10.1422Z" stroke="#101010" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</Link>
														<img src="/assets/imgs/shop/shop-list/product12.png" alt="Carento" />
													</div>
													<div className="card-info p-3 pt-30 border-top">
														<div className="card-rating">
															<div className="card-left" />
															<div className="card-right">
																<span className="rating text-xs-medium rounded-pill">4.9 5 <span className="text-xs-medium neutral-500">(672 reviews)</span></span>
															</div>
														</div>
														<div className="card-title"><Link className="text-lg-bold neutral-1000" href="/shop-details">Mobil Delvac 1300 Super Heavy Duty Synthetic Blend</Link></div>
														<div className="card-program">
															<ul className="list-style-disc ps-3 pe-4">
																<li className="text-xs-medium neutral-1000">Mobil Delvac 1300 Super Heavy Duty Synthetic Blend</li>
																<li className="text-xs-medium neutral-1000">Confident driving in all weather conditions</li>
																<li className="text-xs-medium neutral-1000">Visual Alignment Indicators</li>
															</ul>
															<div className="endtime pt-3 mt-3 border-top">
																<div className="card-price">
																	<h6 className="text-md-medium neutral-500 text-decoration-line-through">$68.53</h6>
																</div>
																<Link href="#" className="card-button pe-3"><img src="/assets/imgs/shop/shop-list/stock.png" alt="Carento" /></Link>
															</div>
															<div className="endtime">
																<div className="card-price">
																	<h6 className="text-lg-bold neutral-1000">$98.67</h6>
																</div>
																<div className="card-button"><Link className="btn btn-gray" href="/shop-details">Book Now</Link></div>
															</div>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
									<nav aria-label="Page navigation example">
										<ul className="pagination">
											<li className="page-item">
												<Link className="page-link" href="#" aria-label="Previous">
													<span aria-hidden="true">
														<svg width={12} height={12} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
															<path d="M6.00016 1.33325L1.3335 5.99992M1.3335 5.99992L6.00016 10.6666M1.3335 5.99992H10.6668" stroke="#101010" strokeLinecap="round" strokeLinejoin="round" />
														</svg>
													</span>
												</Link>
											</li>
											<li className="page-item"><Link className="page-link" href="#">1</Link></li>
											<li className="page-item"><Link className="page-link active" href="#">2</Link></li>
											<li className="page-item"><Link className="page-link" href="#">3</Link></li>
											<li className="page-item"><Link className="page-link" href="#">4</Link></li>
											<li className="page-item"><Link className="page-link" href="#">5</Link></li>
											<li className="page-item"><Link className="page-link" href="#">...</Link></li>
											<li className="page-item">
												<Link className="page-link" href="#" aria-label="Next">
													<span aria-hidden="true">
														<svg width={12} height={12} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
															<path d="M5.99967 10.6666L10.6663 5.99992L5.99968 1.33325M10.6663 5.99992L1.33301 5.99992" stroke="#101010" strokeLinecap="round" strokeLinejoin="round" />
														</svg>
													</span>
												</Link>
											</li>
										</ul>
									</nav>
								</div>
								<div className="content-left order-lg-first">
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
												<h6 className="text-lg-bold item-collapse neutral-1000">Categories</h6>
												<div className="box-collapse scrollFilter">
													<ul className="list-filter-checkbox">
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Accessories</span><span className="checkmark" /> </label><span className="number-item">198</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Automotive Rims</span><span className="checkmark" /> </label><span className="number-item">32</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Brakes</span><span className="checkmark" /> </label><span className="number-item">13</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Detailing</span><span className="checkmark" /> </label><span className="number-item">23</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Headlight</span><span className="checkmark" /> </label><span className="number-item">35</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Tires &amp; Wheels</span><span className="checkmark" /> </label><span className="number-item">56</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Auto Safety &amp; Security </span><span className="checkmark" /> </label><span className="number-item">76</span>
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
												<h6 className="text-lg-bold item-collapse neutral-1000">Brands</h6>
												<div className="box-collapse scrollFilter">
													<ul className="list-filter-checkbox">
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">All</span><span className="checkmark" /> </label><span className="number-item">32</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Honda</span><span className="checkmark" /> </label><span className="number-item">13</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Hyundai</span><span className="checkmark" /> </label><span className="number-item">23</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Jaguar</span><span className="checkmark" /> </label><span className="number-item">23</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Lexus</span><span className="checkmark" /> </label><span className="number-item">35</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Lotus</span><span className="checkmark" /> </label><span className="number-item">56</span>
														</li>
														<li>
															<label className="cb-container"> <input type="checkbox" /><span className="text-sm-medium">Toyota</span><span className="checkmark" /> </label><span className="number-item">76</span>
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