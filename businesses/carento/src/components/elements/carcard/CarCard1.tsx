import Link from "@/components/common/Link"

export default function CarCard1({ car }: any) {
	return (
		<>
			<div className="card-journey-small background-card hover-up">
					<div className="card-image">
						<Link href="/cars-details-1">
							<img src={`/assets/imgs/cars-listing/cars-listing-6/${car.image}`} alt="Carento" />
						</Link>
					</div>
					<div className="card-info p-4 pt-30">
						<div className="card-rating">
							<div className="card-left" />
							<div className="card-right">
								<span className="rating text-xs-medium rounded-pill">4.96 <span className="text-xs-medium neutral-500">(672 reviews)</span></span>
							</div>
						</div>
						<div className="card-title"><Link className="text-lg-bold neutral-1000 text-nowrap" href="/cars-details-1">{car.name}</Link></div>
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
									<h6 className="text-lg-bold neutral-1000">$89.32</h6>
									<p className="text-md-medium neutral-500">/ day</p>
								</div>
								<div className="card-button"><Link className="btn btn-gray" href="/cars-details-1">Book Now</Link></div>
							</div>
						</div>
					</div>
				</div>
		</>
	)
}
