import CounterUp from '../elements/CounterUp'


export default function Cta2() {
	return (
		<>

			<section className="box-cta-2 background-body overflow-hidden">
				<div className="bg-shape top-50 start-50 translate-middle" />
				<div className="container position-relative z-1">
					<div className="row ">
						<div className="col-lg-5 pe-lg-5 ">
							<h3 className="text-white wow fadeInDown">Want to Calculate Your Car Payment?</h3>
							<p className="text-lg-medium text-white wow fadeInUp">Match with up to 4 lenders to get the lowest
								rate available with no markups, no fees, and no obligations.</p>
						</div>
						<div className="col-lg-6 offset-lg-1">
							<div className="mb-30 background-card p-md-5 p-4 rounded-3 mt-lg-0 mt-30 wow fadeIn">
								<h5 className="neutral-1000 mb-2">Car Loan Calculator</h5>
								<p className="text-sm-medium neutral-500 mb-25">Estimate your monthly auto loan payments with
									this calculator.</p>
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
					<div className="row align-items-center">
						<div className="border-top py-3 mt-3" />
						<div className="col-lg-7 mb-20 wow fadeIn">
							<div className="row">
								<div className="col-md-3 col-6 mb-md-0 mb-4 d-flex flex-column align-items-center align-items-md-start">
									<div className="d-flex justify-content-center justify-content-md-start">
										<h3 className="count text-white"><CounterUp count={45} /></h3>
										<h3 className="text-white">+</h3>
									</div>
									<div className="position-relative">
										<p className="text-lg-bold text-white">Global</p>
										<p className="text-lg-bold text-white">Branches</p>
									</div>
								</div>
								<div className="col-md-3 col-6 mb-md-0 mb-4 d-flex flex-column align-items-center align-items-md-start">
									<div className="d-flex justify-content-center justify-content-md-start">
										<h3 className="count text-white"><CounterUp count={29} /></h3>
										<h3 className="text-white">K</h3>
									</div>
									<div className="position-relative">
										<p className="text-lg-bold text-white">Destinations</p>
										<p className="text-lg-bold text-white">Collaboration</p>
									</div>
								</div>
								<div className="col-md-3 col-6 mb-md-0 mb-4 d-flex flex-column align-items-center align-items-md-start">
									<div className="d-flex justify-content-center justify-content-md-start">
										<h3 className="count text-white"><CounterUp count={20} /></h3>
										<h3 className="text-white">+</h3>
									</div>
									<div className="position-relative">
										<p className="text-lg-bold text-white">Years</p>
										<p className="text-lg-bold text-white">Experience</p>
									</div>
								</div>
								<div className="col-md-3 col-6 mb-md-0 mb-4 d-flex flex-column align-items-center align-items-md-start">
									<div className="d-flex justify-content-center justify-content-md-start">
										<h3 className="count text-white"><CounterUp count={168} /></h3>
										<h3 className="text-white">K</h3>
									</div>
									<div className="position-relative">
										<p className="text-lg-bold text-white">Happy</p>
										<p className="text-lg-bold text-white">Customers</p>
									</div>
								</div>
							</div>
						</div>
						<div className="col-lg-4 offset-lg-1 wow fadeIn">
							<div className="box-authors-partner background-body wow fadeInUp p-4">
								<div className="authors-partner-left">
									<img src="/assets/imgs/page/homepage5/author.png" alt="Carento" /><img src="/assets/imgs/page/homepage5/author2.png" alt="Carento" /><img src="/assets/imgs/page/homepage5/author3.png" alt="Carento" />
									<span className="item-author">
										<svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
											<rect x="0.5" y="7.448" width={17} height="2.31818" fill="black" />
											<rect x="7.84082" y="17.1072" width={17} height="2.31818" transform="rotate(-90 7.84082 17.1072)" fill="black" />
										</svg>
									</span>
								</div>
								<div className="authors-partner-right">
									<p className="text-sm neutral-1000">1684 people used <strong>Carento </strong>in the last
										<strong>24 hours</strong></p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>
		</>
	)
}
