

export default function Cta7() {
	return (
		<>

			<section className="box-cta-7 background-body">
				<div className="container position-relative z-1">
					<div className="bg-shape" />
					<div className="row position-relative z-1">
						<div className="col-lg-6 p-md-5 p-4">
							<div className="background-card p-md-5 p-4 rounded-3 my-3">
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
										<div className="row pt-3 pb-4">
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
			</section>
		</>
	)
}
