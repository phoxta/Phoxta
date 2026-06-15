import Layout from "@/components/layout/Layout"
import Link from "@/components/common/Link"
import { useState } from 'react'
export default function Calculator() {
	const [isAccordion, setIsAccordion] = useState(1)

	const handleAccordion = (key: any) => {
		setIsAccordion(prevState => prevState === key ? null : key)
	}

	return (
		<>

			<Layout footerStyle={1}>
				<div>
					<section className="section-cta-11 background-body pt-85 pb-85">
						<div className="container">
							<div className="row">
								<div className="col-lg-5">
									<h4 className="mb-10 neutral-1000">
										Get a competitive loan offer.
										Apply with us today.
									</h4>
									<p className="text-lg-medium mt-2 neutral-1000">Unlock the best rates and terms for your car loan with our easy application process.</p>
								</div>
								<div className="col-lg-7 mt-lg-0 mt-4">
									<div className="d-flex flex-md-row flex-column align-items-center justify-content-center gap-3 mb-30">
										<div>
											<img className="rounded-12" src="/assets/imgs/cta/cta-11/img-1.png" alt="Carento" />
										</div>
										<div>
											<img className="rounded-12" src="/assets/imgs/cta/cta-11/img-2.png" alt="Carento" />
										</div>
									</div>
								</div>
							</div></div></section>
					{/* cta 12*/}
					<section className="section-cta-12 background-100 py-96">
						<div className="box-cta-6">
							<div className="container">
								<div className="row align-items-center flex-column-reverse flex-lg-row">
									<div className="col-lg-6">
										<div className="card-image d-inline-block position-relative mb-100">
											<img className="rounded-12" src="/assets/imgs/cta/cta-11/img-3.png" alt="Carento" />
											<img className="position-absolute top-100 start-100 translate-middle d-none d-md-block" src="/assets/imgs/cta/cta-11/img-car.png" alt="Carento" />
										</div>
									</div>
									<div className="col-lg-6 ps-lg-5">
										<div className="mb-30 background-card p-md-5 p-4 rounded-3 mt-lg-0 mt-30">
											<h5 className="neutral-1000 mb-2">Car Loan Calculator</h5>
											<p className="text-sm-medium neutral-500 mb-25">Estimate your monthly auto loan payments with this calculator.</p>
											<div className="form-contact">
												<div className="row">
													<div className="col-lg-6">
														<div className="form-group">
															<label className="text-sm-medium neutral-1000">Price of vehicle</label>
															<input className="form-control" type="text" placeholder="$20,000" />
														</div>
													</div>
													<div className="col-lg-6">
														<div className="form-group">
															<label className="text-sm-medium neutral-1000">Interest rate</label>
															<input className="form-control" type="text" placeholder="5%" />
														</div>
													</div>
													<div className="col-lg-6">
														<div className="form-group">
															<label className="text-sm-medium neutral-1000">Terms</label>
															<input className="form-control" type="text" placeholder="12 months" />
														</div>
													</div>
													<div className="col-lg-6">
														<div className="form-group">
															<label className="text-sm-medium neutral-1000">Down payment</label>
															<input className="form-control" type="text" placeholder="$12,000" />
														</div>
													</div>
													<div className="row py-4">
														<div className="col-md-5 col-8 d-flex flex-column gap-1">
															<p className="text-sm-bold neutral-1000">Down payment ammout</p>
															<p className="text-sm-bold neutral-1000">Amount financed</p>
															<p className="text-sm-bold neutral-1000">Monthly payment</p>
														</div>
														<div className="col-md-7 col-4 d-flex flex-column gap-1 align-items-end align-items-md-start">
															<p className="text-sm-bold neutral-1000">$12,000</p>
															<p className="text-sm-bold neutral-1000">$800,00</p>
															<p className="text-sm-bold text-primary-dark">$480,00</p>
														</div>
													</div>
													<div className="col-lg-12">
														<button className="btn btn-book">
															Apply for a loan
															<svg width={17} height={16} viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M8.5 15L15.5 8L8.5 1M15.5 8L1.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														</button>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="bg-overlay position-absolute bottom-0 end-0 h-75 background-brand-2 opacity-25 z-0 rounded-start-pill" />
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
					{/* FAQs 2 */}
					<section className="section-faqs-2 pt-80 pb-80 border-bottom background-body position-relative">
						<div className="container position-relative z-2">
							<div className="text-center mb-40 ">
								<h3 className="my-3 neutral-1000 text-start">Frequently Asked Questions</h3>
								<p className="text-xl-medium neutral-500 d-none">Any questions? We would be happy to help you.</p>
							</div>
							<div className="row">
								<div className="col-lg-6">
									<div className="accordion">
										<div className="mb-2 card border">
											<div className="px-0 card-header border-0 bg-gradient-1 background-card">
												<a className="collapsed px-3 py-2 text-900 fw-bold d-flex align-items-center" onClick={() => handleAccordion(1)} >
													<p className="text-lg-bold neutral-1000 pe-4">How do I make a reservation on your website?</p>
													<span className="ms-auto arrow me-2">
														<svg className="invert" xmlns="http://www.w3.org/2000/svg" width={13} height={8} viewBox="0 0 13 8" fill="none">
															<path className="stroke-dark" d="M11.5 1L6.25 6.5L1 1" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
														</svg>
													</span>
												</a>
											</div>
											<div id="collapse01" className={`collapse ${isAccordion == 1 ? 'show' : ''} `} data-bs-parent=".accordion">
												<p className="pt-0 pb-4 card-body background-body">Provide a step-by-step guide on how users can browse and book travel services on your platform. Include information on searching for destinations, selecting dates, choosing accommodation, and completing the booking process. Mention any special features or tools that can help users find the best deals.</p>
											</div>
										</div>
										<div className="mb-2 card border">
											<div className="px-0 card-header border-0 bg-gradient-1 background-card">
												<a className="collapsed px-3 py-2 text-900 fw-bold d-flex align-items-center" onClick={() => handleAccordion(2)} >
													<p className="text-lg-bold neutral-1000 pe-4">What documents do I need for my trip, and how do I obtain them?</p>
													<span className="ms-auto arrow me-2">
														<svg className="invert" xmlns="http://www.w3.org/2000/svg" width={13} height={8} viewBox="0 0 13 8" fill="none">
															<path className="stroke-dark" d="M11.5 1L6.25 6.5L1 1" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
														</svg>
													</span>
												</a>
											</div>
											<div id="collapse02" className={`collapse ${isAccordion == 2 ? 'show' : ''} `} data-bs-parent=".accordion">
												<p className="pt-0 pb-4 card-body background-body">Provide a step-by-step guide on how users can browse and book travel services on your platform. Include information on searching for destinations, selecting dates, choosing accommodation, and completing the booking process. Mention any special features or tools that can help users find the best deals.</p>
											</div>
										</div>
										<div className="mb-2 card border">
											<div className="px-0 card-header border-0 bg-gradient-1 background-card">
												<a className="collapsed px-3 py-2 text-900 fw-bold d-flex align-items-center" onClick={() => handleAccordion(3)} >
													<p className="text-lg-bold neutral-1000 pe-4">In the event that I need to modify or cancel my reservation, what are the policies in place?</p>
													<span className="ms-auto arrow me-2">
														<svg className="invert" xmlns="http://www.w3.org/2000/svg" width={13} height={8} viewBox="0 0 13 8" fill="none">
															<path className="stroke-dark" d="M11.5 1L6.25 6.5L1 1" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
														</svg>
													</span>
												</a>
											</div>
											<div id="collapse03" className={`collapse ${isAccordion == 3 ? 'show' : ''} `} data-bs-parent=".accordion">
												<p className="pt-0 pb-4 card-body background-body">Provide a step-by-step guide on how users can browse and book travel services on your platform. Include information on searching for destinations, selecting dates, choosing accommodation, and completing the booking process. Mention any special features or tools that can help users find the best deals.</p>
											</div>
										</div>
										<div className="mb-2 card border">
											<div className="px-0 card-header border-0 bg-gradient-1 background-card">
												<a className="collapsed px-3 py-2 text-900 fw-bold d-flex align-items-center" onClick={() => handleAccordion(4)} >
													<p className="text-lg-bold neutral-1000 pe-4">Can you specify the types of credit/debit cards, digital wallets, or other online payment methods accepted?</p>
													<span className="ms-auto arrow me-2">
														<svg className="invert" xmlns="http://www.w3.org/2000/svg" width={13} height={8} viewBox="0 0 13 8" fill="none">
															<path className="stroke-dark" d="M11.5 1L6.25 6.5L1 1" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
														</svg>
													</span>
												</a>
											</div>
											<div id="collapse04" className={`collapse ${isAccordion == 4 ? 'show' : ''} `} data-bs-parent=".accordion">
												<p className="pt-0 pb-4 card-body background-body">Provide a step-by-step guide on how users can browse and book travel services on your platform. Include information on searching for destinations, selecting dates, choosing accommodation, and completing the booking process. Mention any special features or tools that can help users find the best deals.</p>
											</div>
										</div>
										<div className="mb-2 card border">
											<div className="px-0 card-header border-0 bg-gradient-1 background-card">
												<a className="collapsed px-3 py-2 text-900 fw-bold d-flex align-items-center" onClick={() => handleAccordion(5)} >
													<p className="text-lg-bold neutral-1000 pe-4">What payment methods do you accept?</p>
													<span className="ms-auto arrow me-2">
														<svg className="invert" xmlns="http://www.w3.org/2000/svg" width={13} height={8} viewBox="0 0 13 8" fill="none">
															<path className="stroke-dark" d="M11.5 1L6.25 6.5L1 1" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
														</svg>
													</span>
												</a>
											</div>
											<div id="collapse05" className={`collapse ${isAccordion == 5 ? 'show' : ''} `} data-bs-parent=".accordion">
												<p className="pt-0 pb-4 card-body background-body">Provide a step-by-step guide on how users can browse and book travel services on your platform. Include information on searching for destinations, selecting dates, choosing accommodation, and completing the booking process. Mention any special features or tools that can help users find the best deals.</p>
											</div>
										</div>
										<div className="mb-2 card border">
											<div className="px-0 card-header border-0 bg-gradient-1 background-card">
												<a className="collapsed px-3 py-2 text-900 fw-bold d-flex align-items-center" onClick={() => handleAccordion(6)} >
													<p className="text-lg-bold neutral-1000 pe-4">Can I modify or cancel my reservation?</p>
													<span className="ms-auto arrow me-2">
														<svg className="invert" xmlns="http://www.w3.org/2000/svg" width={13} height={8} viewBox="0 0 13 8" fill="none">
															<path className="stroke-dark" d="M11.5 1L6.25 6.5L1 1" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
														</svg>
													</span>
												</a>
											</div>
											<div id="collapse6" className={`collapse ${isAccordion == 6 ? 'show' : ''} `} data-bs-parent=".accordion">
												<p className="pt-0 pb-4 card-body background-body">Provide a step-by-step guide on how users can browse and book travel services on your platform. Include information on searching for destinations, selecting dates, choosing accommodation, and completing the booking process. Mention any special features or tools that can help users find the best deals.</p>
											</div>
										</div>
										<div className="mb-2 card border">
											<div className="px-0 card-header border-0 bg-gradient-1 background-card">
												<a className="collapsed px-3 py-2 text-900 fw-bold d-flex align-items-center" onClick={() => handleAccordion(7)} >
													<p className="text-lg-bold neutral-1000 pe-4">Do you offer discounts for group bookings?</p>
													<span className="ms-auto arrow me-2">
														<svg className="invert" xmlns="http://www.w3.org/2000/svg" width={13} height={8} viewBox="0 0 13 8" fill="none">
															<path className="stroke-dark" d="M11.5 1L6.25 6.5L1 1" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
														</svg>
													</span>
												</a>
											</div>
											<div id="collapse7" className={`collapse ${isAccordion == 7 ? 'show' : ''} `} data-bs-parent=".accordion">
												<p className="pt-0 pb-4 card-body background-body">Provide a step-by-step guide on how users can browse and book travel services on your platform. Include information on searching for destinations, selecting dates, choosing accommodation, and completing the booking process. Mention any special features or tools that can help users find the best deals.</p>
											</div>
										</div>
									</div>
								</div>
								<div className="col-lg-6 mt-lg-0 mt-2">
									<div className="accordion">
										<div className="mb-2 card border">
											<div className="px-0 card-header border-0 bg-gradient-1 background-card">
												<a className="collapsed px-3 py-2 text-900 fw-bold d-flex align-items-center" onClick={() => handleAccordion(8)} >
													<p className="text-lg-bold neutral-1000 pe-4">How do I search for hotels on your website?</p>
													<span className="ms-auto arrow me-2">
														<svg className="invert" xmlns="http://www.w3.org/2000/svg" width={13} height={8} viewBox="0 0 13 8" fill="none">
															<path className="stroke-dark" d="M11.5 1L6.25 6.5L1 1" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
														</svg>
													</span>
												</a>
											</div>
											<div id="collapseSevent" className={`collapse ${isAccordion == 8 ? 'show' : ''} `} data-bs-parent=".accordion">
												<p className="pt-0 pb-4 card-body background-body">Provide a step-by-step guide on how users can browse and book travel services on your platform. Include information on searching for destinations, selecting dates, choosing accommodation, and completing the booking process. Mention any special features or tools that can help users find the best deals.</p>
											</div>
										</div>
										<div className="mb-2 card border">
											<div className="px-0 card-header border-0 bg-gradient-1 background-card">
												<a className="collapsed px-3 py-2 text-900 fw-bold d-flex align-items-center" onClick={() => handleAccordion(9)} >
													<p className="text-lg-bold neutral-1000 pe-4">In the event that I need to modify or cancel my reservation, what are the policies in place?</p>
													<span className="ms-auto arrow me-2">
														<svg className="invert" xmlns="http://www.w3.org/2000/svg" width={13} height={8} viewBox="0 0 13 8" fill="none">
															<path className="stroke-dark" d="M11.5 1L6.25 6.5L1 1" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
														</svg>
													</span>
												</a>
											</div>
											<div id="collapseEight" className={`collapse ${isAccordion == 9 ? 'show' : ''} `} data-bs-parent=".accordion">
												<p className="pt-0 pb-4 card-body background-body">Provide a step-by-step guide on how users can browse and book travel services on your platform. Include information on searching for destinations, selecting dates, choosing accommodation, and completing the booking process. Mention any special features or tools that can help users find the best deals.</p>
											</div>
										</div>
										<div className="mb-2 card border">
											<div className="px-0 card-header border-0 bg-gradient-1 background-card">
												<a className="collapsed px-3 py-2 text-900 fw-bold d-flex align-items-center" onClick={() => handleAccordion(10)} >
													<p className="text-lg-bold neutral-1000 pe-4">Is breakfast included in the room rate?</p>
													<span className="ms-auto arrow me-2">
														<svg className="invert" xmlns="http://www.w3.org/2000/svg" width={13} height={8} viewBox="0 0 13 8" fill="none">
															<path className="stroke-dark" d="M11.5 1L6.25 6.5L1 1" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
														</svg>
													</span>
												</a>
											</div>
											<div id="collapseNine" className={`collapse ${isAccordion == 10 ? 'show' : ''} `} data-bs-parent=".accordion">
												<p className="pt-0 pb-4 card-body background-body">Provide a step-by-step guide on how users can browse and book travel services on your platform. Include information on searching for destinations, selecting dates, choosing accommodation, and completing the booking process. Mention any special features or tools that can help users find the best deals.</p>
											</div>
										</div>
										<div className="mb-2 card border">
											<div className="px-0 card-header border-0 bg-gradient-1 background-card">
												<a className="collapsed px-3 py-2 text-900 fw-bold d-flex align-items-center" onClick={() => handleAccordion(11)} >
													<p className="text-lg-bold neutral-1000 pe-4">Are pets allowed in the hotels?</p>
													<span className="ms-auto arrow me-2">
														<svg className="invert" xmlns="http://www.w3.org/2000/svg" width={13} height={8} viewBox="0 0 13 8" fill="none">
															<path className="stroke-dark" d="M11.5 1L6.25 6.5L1 1" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
														</svg>
													</span>
												</a>
											</div>
											<div id="collapseTen" className={`collapse ${isAccordion == 11 ? 'show' : ''} `} data-bs-parent=".accordion">
												<p className="pt-0 pb-4 card-body background-body">Provide a step-by-step guide on how users can browse and book travel services on your platform. Include information on searching for destinations, selecting dates, choosing accommodation, and completing the booking process. Mention any special features or tools that can help users find the best deals.</p>
											</div>
										</div>
										<div className="mb-2 card border">
											<div className="px-0 card-header border-0 bg-gradient-1 background-card">
												<a className="collapsed px-3 py-2 text-900 fw-bold d-flex align-items-center" onClick={() => handleAccordion(12)} >
													<p className="text-lg-bold neutral-1000 pe-4">
														How do I contact customer support if I have a question or <br />
														issue?
													</p>
													<span className="ms-auto arrow me-2">
														<svg className="invert" xmlns="http://www.w3.org/2000/svg" width={13} height={8} viewBox="0 0 13 8" fill="none">
															<path className="stroke-dark" d="M11.5 1L6.25 6.5L1 1" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
														</svg>
													</span>
												</a>
											</div>
											<div id="collapseEleven" className={`collapse ${isAccordion == 12 ? 'show' : ''} `} data-bs-parent=".accordion">
												<p className="pt-0 pb-4 card-body background-body">Provide a step-by-step guide on how users can browse and book travel services on your platform. Include information on searching for destinations, selecting dates, choosing accommodation, and completing the booking process. Mention any special features or tools that can help users find the best deals.</p>
											</div>
										</div>
										<div className="mb-2 card border">
											<div className="px-0 card-header border-0 bg-gradient-1 background-card">
												<a className="collapsed px-3 py-2 text-900 fw-bold d-flex align-items-center" onClick={() => handleAccordion(13)} >
													<p className="text-lg-bold neutral-1000 pe-4">
														Are there any loyalty programs or rewards for frequent <br />
														guests?
													</p>
													<span className="ms-auto arrow me-2">
														<svg className="invert" xmlns="http://www.w3.org/2000/svg" width={13} height={8} viewBox="0 0 13 8" fill="none">
															<path className="stroke-dark" d="M11.5 1L6.25 6.5L1 1" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
														</svg>
													</span>
												</a>
											</div>
											<div id="collapseTwelve" className={`collapse ${isAccordion == 13 ? 'show' : ''} `} data-bs-parent=".accordion">
												<p className="pt-0 pb-4 card-body background-body">Provide a step-by-step guide on how users can browse and book travel services on your platform. Include information on searching for destinations, selecting dates, choosing accommodation, and completing the booking process. Mention any special features or tools that can help users find the best deals.</p>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="row">
								<div className="col-12 wow fadeInUp mt-4">
									<div className="d-flex justify-content-center gap-2">
										<Link className="btn btn-gray2" href="#">
											Contact Us
											<svg width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
												<path d="M8 15L15 8L8 1M15 8L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
											</svg>
										</Link>
										<Link className="btn btn-primary rounded-3" href="#">
											Submit a Ticket
											<svg width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
												<path d="M8 15L15 8L8 1M15 8L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
											</svg>
										</Link>
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