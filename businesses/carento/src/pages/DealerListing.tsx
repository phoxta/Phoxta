
import CounterUp from '@/components/elements/CounterUp'
import Layout from "@/components/layout/Layout"
import Link from "@/components/common/Link"
export default function DealerListing() {

	return (
		<>

			<Layout footerStyle={1}>
				<div>
					<div className="page-header pt-30 background-body">
						<div className="custom-container position-relative mx-auto">
							<div className="bg-overlay rounded-12 overflow-hidden">
								<img className="w-100 h-100 img-banner" src="/assets/imgs/page-header/banner7.png" alt="Carento" />
							</div>
							<div className="container position-absolute z-1 top-50 start-50 translate-middle">
								<h2 className="text-white">Dealer Listing</h2>
								<span className="text-white text-xl-medium">Professional car rental people</span>
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
					{/* dealer listing */}
					<section className="box-section background-body py-96 border-bottom">
						<div className="container">
							<div className="row align-items-end">
								<div className="col-md-8">
									<h4 className="neutral-1000">Our Vehicle Fleet</h4>
									<p className="text-lg-medium neutral-500">Turning dreams into reality with versatile vehicles.</p>
								</div>
								<div className="col-md-4">
									<div className="d-flex justify-content-end mt-md-0 mt-4">
										<Link className="btn btn-primary rounded-3" href="/cars-list-1">
											Become a renter
											<svg width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
												<path d="M8 15L15 8L8 1M15 8L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
											</svg>
										</Link>
									</div>
								</div>
							</div>
							<div className="row mt-60">
								<div className="col-lg-4 col-sm-6">
									<div className="card-contact card-dealer d-flex">
										<div className="card-image me-3">
											<div className="position-relative">
												<img src="/assets/imgs/dealer/dealer-listing/icon-1.svg" alt="Carento" />
											</div>
										</div>
										<div className="card-info">
											<div className="card-title">
												<Link className="title heading-6" href="/dealer-details">Opel Manchester</Link>
												<p className="text-md-medium neutral-500">123 Kingsway Strandeif, Manchester, M19 2XS</p>
											</div>
											<div className="card-method-contact2">
												<Link className="email text-xs-bold" href="/cars-list-1">
													180 Vehicles
												</Link>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-sm-6">
									<div className="card-contact card-dealer d-flex">
										<div className="card-image me-3">
											<div className="position-relative">
												<img src="/assets/imgs/dealer/dealer-listing/icon-2.svg" alt="Carento" />
											</div>
										</div>
										<div className="card-info">
											<div className="card-title">
												<Link className="title heading-6" href="/dealer-details">BMW Birmingham</Link>
												<p className="text-md-medium neutral-500">45 Solihull Road, Birmingham, B91 2DA</p>
											</div>
											<div className="card-method-contact2">
												<Link className="email text-xs-bold" href="/cars-list-1">
													180 Vehicles
												</Link>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-sm-6">
									<div className="card-contact card-dealer d-flex">
										<div className="card-image me-3">
											<div className="position-relative">
												<img src="/assets/imgs/dealer/dealer-listing/icon-3.svg" alt="Carento" />
											</div>
										</div>
										<div className="card-info">
											<div className="card-title">
												<Link className="title heading-6" href="/dealer-details">Toyota London</Link>
												<p className="text-md-medium neutral-500">78 High Street Nomawal, London, E1 6RL</p>
											</div>
											<div className="card-method-contact2">
												<Link className="email text-xs-bold" href="/cars-list-1">
													180 Vehicles
												</Link>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-sm-6">
									<div className="card-contact card-dealer d-flex">
										<div className="card-image me-3">
											<div className="position-relative">
												<img src="/assets/imgs/dealer/dealer-listing/icon-4.svg" alt="Carento" />
											</div>
										</div>
										<div className="card-info">
											<div className="card-title">
												<Link className="title heading-6" href="/dealer-details">Ford Glasgow</Link>
												<p className="text-md-medium neutral-500">15 Buchanan Street,
													Glasgow, G1 3HL</p>
											</div>
											<div className="card-method-contact2">
												<Link className="email text-xs-bold" href="/cars-list-1">
													180 Vehicles
												</Link>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-sm-6">
									<div className="card-contact card-dealer d-flex">
										<div className="card-image me-3">
											<div className="position-relative">
												<img src="/assets/imgs/dealer/dealer-listing/icon-5.svg" alt="Carento" />
											</div>
										</div>
										<div className="card-info">
											<div className="card-title">
												<Link className="title heading-6" href="/dealer-details">Volkswagen Leeds</Link>
												<p className="text-md-medium neutral-500">230 block 90 Kirkstall Road, Leeds, LS3 1HS</p>
											</div>
											<div className="card-method-contact2">
												<Link className="email text-xs-bold" href="/cars-list-1">
													180 Vehicles
												</Link>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-sm-6">
									<div className="card-contact card-dealer d-flex">
										<div className="card-image me-3">
											<div className="position-relative">
												<img src="/assets/imgs/dealer/dealer-listing/icon-6.svg" alt="Carento" />
											</div>
										</div>
										<div className="card-info">
											<div className="card-title">
												<Link className="title heading-6" href="/dealer-details">Honda Edinburgh</Link>
												<p className="text-md-medium neutral-500">62 Princes Street,
													Edinburgh, EH2 4AD</p>
											</div>
											<div className="card-method-contact2">
												<Link className="email text-xs-bold" href="/cars-list-1">
													180 Vehicles
												</Link>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-sm-6">
									<div className="card-contact card-dealer d-flex">
										<div className="card-image me-3">
											<div className="position-relative">
												<img src="/assets/imgs/dealer/dealer-listing/icon-7.svg" alt="Carento" />
											</div>
										</div>
										<div className="card-info">
											<div className="card-title">
												<Link className="title heading-6" href="/dealer-details">Nissan Bristol</Link>
												<p className="text-md-medium neutral-500">11 Clifton Down Road,
													Bristol, BS8 4AB</p>
											</div>
											<div className="card-method-contact2">
												<Link className="email text-xs-bold" href="/cars-list-1">
													180 Vehicles
												</Link>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-sm-6">
									<div className="card-contact card-dealer d-flex">
										<div className="card-image me-3">
											<div className="position-relative">
												<img src="/assets/imgs/dealer/dealer-listing/icon-8.svg" alt="Carento" />
											</div>
										</div>
										<div className="card-info">
											<div className="card-title">
												<Link className="title heading-6" href="/dealer-details">Kia Liverpool</Link>
												<p className="text-md-medium neutral-500">29 Hope Street,
													Liverpool, L1 9BX</p>
											</div>
											<div className="card-method-contact2">
												<Link className="email text-xs-bold" href="/cars-list-1">
													180 Vehicles
												</Link>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-sm-6">
									<div className="card-contact card-dealer d-flex">
										<div className="card-image me-3">
											<div className="position-relative">
												<img src="/assets/imgs/dealer/dealer-listing/icon-9.svg" alt="Carento" />
											</div>
										</div>
										<div className="card-info">
											<div className="card-title">
												<Link className="title heading-6" href="/dealer-details">Peugeot Sheffield</Link>
												<p className="text-md-medium neutral-500">Block 123 / 90 Kirkstall Road, Leeds, LS3 1HS</p>
											</div>
											<div className="card-method-contact2">
												<Link className="email text-xs-bold" href="/cars-list-1">
													180 Vehicles
												</Link>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-sm-6">
									<div className="card-contact card-dealer d-flex">
										<div className="card-image me-3">
											<div className="position-relative">
												<img src="/assets/imgs/dealer/dealer-listing/icon-10.svg" alt="Carento" />
											</div>
										</div>
										<div className="card-info">
											<div className="card-title">
												<Link className="title heading-6" href="/dealer-details">Volvo Oxford</Link>
												<p className="text-md-medium neutral-500">45 Solihull Road, Birmingham, B91 2DA</p>
											</div>
											<div className="card-method-contact2">
												<Link className="email text-xs-bold" href="/cars-list-1">
													180 Vehicles
												</Link>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-sm-6">
									<div className="card-contact card-dealer d-flex">
										<div className="card-image me-3">
											<div className="position-relative">
												<img src="/assets/imgs/dealer/dealer-listing/icon-11.svg" alt="Carento" />
											</div>
										</div>
										<div className="card-info">
											<div className="card-title">
												<Link className="title heading-6" href="/dealer-details">Mazda Southampton</Link>
												<p className="text-md-medium neutral-500">123 Kingsway Strandeif, Manchester, M19 2XS</p>
											</div>
											<div className="card-method-contact2">
												<Link className="email text-xs-bold" href="/cars-list-1">
													180 Vehicles
												</Link>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-sm-6">
									<div className="card-contact card-dealer d-flex">
										<div className="card-image me-3">
											<div className="position-relative">
												<img src="/assets/imgs/dealer/dealer-listing/icon-12.svg" alt="Carento" />
											</div>
										</div>
										<div className="card-info">
											<div className="card-title">
												<Link className="title heading-6" href="/dealer-details">Land Rover Norwich</Link>
												<p className="text-md-medium neutral-500">45 Solihull Road, Birmingham, B91 2DA</p>
											</div>
											<div className="card-method-contact2">
												<Link className="email text-xs-bold" href="/cars-list-1">
													180 Vehicles
												</Link>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-sm-6">
									<div className="card-contact card-dealer d-flex">
										<div className="card-image me-3">
											<div className="position-relative">
												<img src="/assets/imgs/dealer/dealer-listing/icon-13.svg" alt="Carento" />
											</div>
										</div>
										<div className="card-info">
											<div className="card-title">
												<Link className="title heading-6" href="/dealer-details">Jeep Nottingham</Link>
												<p className="text-md-medium neutral-500">123 Kingsway Strandeif, Manchester, M19 2XS</p>
											</div>
											<div className="card-method-contact2">
												<Link className="email text-xs-bold" href="/cars-list-1">
													180 Vehicles
												</Link>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-sm-6">
									<div className="card-contact card-dealer d-flex">
										<div className="card-image me-3">
											<div className="position-relative">
												<img src="/assets/imgs/dealer/dealer-listing/icon-2.svg" alt="Carento" />
											</div>
										</div>
										<div className="card-info">
											<div className="card-title">
												<Link className="title heading-6" href="/dealer-details">BMW Manchester</Link>
												<p className="text-md-medium neutral-500">11 Clifton Down Road,
													Bristol, BS8 4AB</p>
											</div>
											<div className="card-method-contact2">
												<Link className="email text-xs-bold" href="/cars-list-1">
													180 Vehicles
												</Link>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-4 col-sm-6">
									<div className="card-contact card-dealer d-flex">
										<div className="card-image me-3">
											<div className="position-relative">
												<img src="/assets/imgs/dealer/dealer-listing/icon-4.svg" alt="Carento" />
											</div>
										</div>
										<div className="card-info">
											<div className="card-title">
												<Link className="title heading-6" href="/dealer-details">Ford Manchester</Link>
												<p className="text-md-medium neutral-500">123 Kingsway Strandeif, Manchester, M19 2XS</p>
											</div>
											<div className="card-method-contact2">
												<Link className="email text-xs-bold" href="/cars-list-1">
													180 Vehicles
												</Link>
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
													<path d="M6.00016 1.33325L1.3335 5.99992M1.3335 5.99992L6.00016 10.6666M1.3335 5.99992H10.6668" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
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
													<path d="M5.99967 10.6666L10.6663 5.99992L5.99968 1.33325M10.6663 5.99992L1.33301 5.99992" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
												</svg>
											</span>
										</Link>
									</li>
								</ul>
							</nav>
						</div>
					</section>
					{/* cta 8*/}
					<section className="section-cta-7 background-body py-96">
						<div className="box-cta-6">
							<div className="container">
								<div className="row align-items-center">
									<div className="col-lg-5">
										<Link className="btn btn-signin bg-2 text-dark mb-4" href="#">Our Mission</Link>
										<h4 className="mb-4 neutral-1000">Sell your car at a fair price. <br />Get started with us today.</h4>
										<p className="text-lg-medium neutral-500 mb-4">Our mission is to make car rental easy, accessible, and affordable for everyone. We believe that renting a car should be a hassle-free experience, and we're dedicated to ensuring that every customer finds the perfect vehicle for their journey.</p>
										<div className="row">
											<div className="col">
												<ul className="list-ticks-green list-ticks-green-2">
													<li className="neutral-1000 pe-0">Explore a wide range of flexible rental options to suit your needs</li>
													<li className="neutral-1000 pe-0">Comprehensive insurance coverage for complete peace of mind</li>
													<li className="neutral-1000 pe-0">24/7 customer support for assistance anytime, anywhere</li>
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
									<div className="col-lg-6 offset-lg-1 position-relative z-1 mt-lg-0 mt-4">
										<div className="d-flex flex-column gap-4">
											<div className="d-flex gap-4">
												<div className="position-relative">
													<img className="bdrd8 w-100" src="/assets/imgs/cta/cta-8/img-1.png" alt="Carento" />
												</div>
												<div className="mt-auto">
													<img className="bdrd8 w-100" src="/assets/imgs/cta/cta-8/img-2.png" alt="Carento" />
												</div>
											</div>
											<div className="d-flex gap-4">
												<div className="position-relative">
													<img className="bdrd8 w-100" src="/assets/imgs/cta/cta-8/img-3.png" alt="Carento" />
												</div>
												<div className="position-relative">
													<img className="bdrd8 w-100" src="/assets/imgs/cta/cta-8/img-4.png" alt="Carento" />
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="bg-overlay position-absolute bottom-0 end-0 h-75 background-brand-2 opacity-25 z-0 rounded-start-pill" />
						</div>
					</section>
					{/* Static 1 */}
					<section className="section-static-1 background-body background-2 pt-80 pb-80">
						<div className="container">
							<div className="row">
								<div>
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
				</div>

			</Layout>
		</>
	)
}