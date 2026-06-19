
import Link from "@/components/common/Link"
import { useFleet } from "@/util/fleet"
import CarCard1 from "@/components/elements/carcard/CarCard1"

export default function CarsListing5() {
  const { cars } = useFleet();
  const featured = cars.slice(0, 8);
	return (
		<>

			<section className="section-box box-flights background-body">
				<div className="container">
					<div className="row align-items-end mb-10">
						<div className="col-md-8">
							<h3 className="neutral-1000 wow fadeInUp">Featured Listings</h3>
							<p className="text-lg-medium neutral-500 wow fadeInUp">Find the perfect ride for any occasion</p>
						</div>
						<div className="col-md-4 mt-md-0 mt-4">
							<div className="d-flex justify-content-end">
								<Link className="btn btn-primary wow fadeInUp" href="/cars-list-1">
									View More
									<svg width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M8 15L15 8L8 1M15 8L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</Link>
							</div>
						</div>
					</div>
					<div className="row pt-30">
						{featured.map((car) => (
							<div className="col-lg-3 col-md-6" key={car.id}>
								<CarCard1 car={car} />
							</div>
						))}
					</div>
				</div>
			</section>
		</>
	)
}
