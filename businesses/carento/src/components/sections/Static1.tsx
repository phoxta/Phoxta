import CounterUp from '../elements/CounterUp'


export default function Static1() {
	return (
		<>

			<section className="section-static-1 background-body @@classList">
				<div className="container">
					<div className="row">
						<div className="rounded-12 background-3 pt-30 pb-30">
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
		</>
	)
}
