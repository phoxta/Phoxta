
import Link from "@/components/common/Link"

export default function App() {
	return (
		<>

			<section className="box-app position-relative">
				<div className="container position-relative z-1">
					<div className="row align-items-center py-5">
						<div className="col-lg-5">
							<h4 className=" wow fadeInDown">Carento App is Available</h4>
							<p className="text-md-medium pb-3 wow fadeInUp">Manage all your car rentals on the go with the
								Carento app</p>
							<div className="download-apps mt-0">
								<Link className=" wow fadeInUp" href="#"><img src="/assets/imgs/template/googleplay.png" alt="Carento" /></Link>
								<Link className=" wow fadeInUp" data-wow-delay="0.2s" href="#"><img src="/assets/imgs/template/appstore.png" alt="Carento" /></Link>
							</div>
						</div>
						<div className="col-lg-7">
							<div className="box-app-img wow fadeIn"><img src="/assets/imgs/app/app-1/truck.png" alt="Carento" />
							</div>
						</div>
					</div>
				</div>
			</section>
		</>
	)
}
