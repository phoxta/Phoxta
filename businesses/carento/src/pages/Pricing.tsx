import Layout from "@/components/layout/Layout"
import { swiperGroup3 } from '@/util/swiperOptions'
import Link from "@/components/common/Link"
import { useState } from "react"
import { Swiper, SwiperSlide } from "swiper/react"
export default function Pricing() {
	const [isTab, setIsTab] = useState(1)
	const handleTab = (i: number) => {
		setIsTab(i)
	}
	const [isAccordion, setIsAccordion] = useState(1)

	const handleAccordion = (key: any) => {
		setIsAccordion(prevState => prevState === key ? null : key)
	}
	return (
		<>

			<Layout footerStyle={1}>
				<div>
					<div className="page-header pt-30 background-body">
						<div className="custom-container position-relative mx-auto">
							<div className="bg-overlay rounded-12 overflow-hidden">
								<img className="w-100 h-100 img-banner" src="/assets/imgs/page-header/banner2.png" alt="Carento" />
							</div>
							<div className="container position-absolute z-1 top-50 start-50 translate-middle">
								<h2 className="text-white">Pricing</h2>
								<span className="text-white text-xl-medium">Choose The Best Plan That’s For You</span>
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
					{/*Pricing 1*/}
					<section className="section-pricing-1 pt-80 pb-100 background-body border-bottom">
						<div className="container">
							<div className="row pb-40 z-1 justify-content-center">
								<div className="col-lg-auto align-self-end">
									<h3 className="text-center neutral-1000">Membership Plans</h3>
									<div className="d-flex justify-content-center align-items-center mt-3">
										<ul className="list-unstyled d-flex align-items-center gap-3 change-price-plan">
											<li>
												<a onClick={() => handleTab(1)} className="active btn btn-primary monthly px-3 py-2" data-type="monthly">Monthly Price</a>
											</li>
											<li>
												<a onClick={() => handleTab(2)} className="yearly btn btn-white px-3 py-2" data-type="yearly">Annual Price</a>
											</li>
										</ul>
									</div>
								</div>
							</div>
							<div className="row">
								<div className="col-lg-3 col-sm-6 mb-lg-0 mb-4">
									<div className="h-100 p-4 border rounded-12">
										<h6 className="text-lg-bold neutral-1000">Basic</h6>
										<div className="d-flex">
											<span className="heading-3 neutral-1000">$</span>
											<h3 className="neutral-1000 mb-0 text-price-standard">{isTab === 1 ? '19' : '49'}</h3>
											<span className="neutral-500 text-md-medium align-self-end text-type-standard">/{isTab === 1 ? 'month' : 'year'}</span>
										</div>
										<p className="text-sm-medium neutral-1000">For most businesses that want to optimize web queries</p>
										<ul className="list-unstyled mb-0 py-4 border-top mt-4">
											<li className="d-flex align-items-center mb-3">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2">Access to standard vehicles</p>
											</li>
											<li className="d-flex align-items-center mb-3">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2">24/7 customer support</p>
											</li>
											<li className="d-flex align-items-center mb-3">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2">Basic insurance coverage</p>
											</li>
											<li className="d-flex align-items-center mb-3">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2 text-400">Online booking</p>
											</li>
											<li className="d-flex align-items-center mb-3">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2 text-400">Standard roadside assistance</p>
											</li>
											<li className="d-flex align-items-center">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2 text-400">One free vehicle per month</p>
											</li>
										</ul>
										<button className="btn btn-primary2 w-100 d-flex justify-content-between">
											Get Started Now
											<svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none">
												<path className="fill-dark" d="M17.4177 5.41797L16.3487 6.48705L21.1059 11.2443H0V12.7562H21.1059L16.3487 17.5134L17.4177 18.5825L24 12.0002L17.4177 5.41797Z" fill="#111827" />
											</svg>
										</button>
									</div>
								</div>
								<div className="col-lg-3 col-sm-6 mb-lg-0 mb-4">
									<div className="h-100 p-4 border rounded-12">
										<h6 className="text-lg-bold neutral-1000">Standard</h6>
										<div className="d-flex">
											<span className="heading-3 neutral-1000">$</span>
											<h3 className="neutral-1000 mb-0 text-price-standard">{isTab === 1 ? '39' : '99'}</h3>
											<span className="neutral-500 text-md-medium align-self-end text-type-standard">/{isTab === 1 ? 'month' : 'year'}</span>
										</div>
										<p className="text-sm-medium neutral-1000">For most businesses that want to optimize web queries</p>
										<ul className="list-unstyled mb-0 py-4 border-top mt-4">
											<li className="d-flex align-items-center mb-3">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2">All Basic Plan features</p>
											</li>
											<li className="d-flex align-items-center mb-3">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2">Access to premium vehicles</p>
											</li>
											<li className="d-flex align-items-center mb-3">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2">Flexible rental terms</p>
											</li>
											<li className="d-flex align-items-center mb-3">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2">GPS included</p>
											</li>
											<li className="d-flex align-items-center mb-3">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2">Free additional driver</p>
											</li>
											<li className="d-flex align-items-center">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2">Unlimited vehicle swaps</p>
											</li>
										</ul>
										<button className="btn btn-primary2 w-100 d-flex justify-content-between">
											Get Started Now
											<svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none">
												<path className="fill-dark" d="M17.4177 5.41797L16.3487 6.48705L21.1059 11.2443H0V12.7562H21.1059L16.3487 17.5134L17.4177 18.5825L24 12.0002L17.4177 5.41797Z" fill="dark" />
											</svg>
										</button>
									</div>
								</div>
								<div className="col-lg-3 col-sm-6 mb-lg-0 mb-4">
									<div className="h-100 p-4 border rounded-12">
										<h6 className="text-lg-bold neutral-1000">Premium</h6>
										<div className="d-flex">
											<span className="heading-3 neutral-1000">$</span>
											<h3 className="neutral-1000 mb-0 text-price-business">{isTab === 1 ? '59' : '199'}</h3>
											<span className="neutral-500 text-md-medium align-self-end text-type-business">/{isTab === 1 ? 'month' : 'year'}</span>
										</div>
										<p className="text-sm-medium neutral-1000">For most businesses that want to optimize web queries</p>
										<ul className="list-unstyled mb-0 py-4 border-top mt-4">
											<li className="d-flex align-items-center mb-3">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2">All Standard Plan features</p>
											</li>
											<li className="d-flex align-items-center mb-3">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2">Luxury vehicle options</p>
											</li>
											<li className="d-flex align-items-center mb-3">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2">Complimentary upgrades</p>
											</li>
											<li className="d-flex align-items-center mb-3">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2">Enhanced insurance coverage</p>
											</li>
											<li className="d-flex align-items-center mb-3">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2">Free airport pickup, drop-off</p>
											</li>
											<li className="d-flex align-items-center">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2">Exclusive deals and offers</p>
											</li>
										</ul>
										<button className="btn btn-primary2 w-100 d-flex justify-content-between">
											Get Started Now
											<svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none">
												<path className="fill-dark" d="M17.4177 5.41797L16.3487 6.48705L21.1059 11.2443H0V12.7562H21.1059L16.3487 17.5134L17.4177 18.5825L24 12.0002L17.4177 5.41797Z" fill="#111827" />
											</svg>
										</button>
									</div>
								</div>
								<div className="col-lg-3 col-sm-6 mb-lg-0 mb-4">
									<div className="h-100 p-4 border rounded-12">
										<h6 className="text-lg-bold neutral-1000">VIP</h6>
										<div className="d-flex">
											<span className="heading-3 neutral-1000">$</span>
											<h3 className="neutral-1000 mb-0 text-price-enterprise">{isTab === 1 ? '79' : '299'}</h3>
											<span className="neutral-500 text-md-medium align-self-end text-type-enterprise">/{isTab === 1 ? 'month' : 'year'}</span>
										</div>
										<p className="text-sm-medium neutral-1000">For most businesses that want to optimize web queries</p>
										<ul className="list-unstyled mb-0 py-4 border-top mt-4">
											<li className="d-flex align-items-center mb-3">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2">All Premium Plan features</p>
											</li>
											<li className="d-flex align-items-center mb-3">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2">VIP transfer service</p>
											</li>
											<li className="d-flex align-items-center mb-3">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2">Personal concierge</p>
											</li>
											<li className="d-flex align-items-center mb-3">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2">Unlimited mileage</p>
											</li>
											<li className="d-flex align-items-center mb-3">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2">Luxury vehicle upgrades</p>
											</li>
											<li className="d-flex align-items-center">
												<img src="/assets/imgs/pricing-1/check-primary.svg" alt="carento" />
												<p className="text-sm-medium neutral-1000 m-0 ms-2">24/7 account manager</p>
											</li>
										</ul>
										<button className="btn btn-primary2 w-100 d-flex justify-content-between">
											Get Started Now
											<svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none">
												<path className="fill-dark" d="M17.4177 5.41797L16.3487 6.48705L21.1059 11.2443H0V12.7562H21.1059L16.3487 17.5134L17.4177 18.5825L24 12.0002L17.4177 5.41797Z" fill="#111827" />
											</svg>
										</button>
									</div>
								</div>
							</div>
						</div>
						<div className="rotate-center ellipse-rotate-success position-absolute z-0" />
						<div className="rotate-center-rev ellipse-rotate-primary position-absolute z-0" />
					</section>
					{/* FAQs 2 */}
					<section className="section-faqs-2 pt-80 pb-80 border-bottom background-body position-relative">
						<div className="container position-relative z-2">
							<div className="text-center mb-40 ">
								<h3 className="my-3 neutral-1000 @@classList">Frequently Asked Questions</h3>
								<p className="text-xl-medium neutral-500 @@d-none">Any questions? We would be happy to help you.</p>
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