import Link from "@/components/common/Link"

export default function CarCard1({ car }: any) {
	const href = `/cars-details-1?id=${car.id}`
	return (
		<>
			<div className="card-journey-small background-card hover-up">
					<div className="card-image">
						<Link href={href}>
							<img src={`/assets/imgs/cars-listing/cars-listing-6/${car.image}`} alt={car.name} />
						</Link>
					</div>
					<div className="card-info p-4 pt-30">
						<div className="card-rating">
							<div className="card-left" />
							<div className="card-right">
								<span className="rating text-xs-medium rounded-pill">{car.rating} <span className="text-xs-medium neutral-500">(reviews)</span></span>
							</div>
						</div>
						<div className="card-title"><Link className="text-lg-bold neutral-1000 text-nowrap" href={href}>{car.name}</Link></div>
						<div className="card-program">
							<div className="card-location">
								<p className="text-location text-sm-medium neutral-500">{car.location}</p>
							</div>
							<div className="card-facitlities">
								<p className="card-miles text-md-medium">{car.carType}</p>
								<p className="card-gear text-md-medium">Automatic</p>
								<p className="card-fuel text-md-medium">{car.fuelType}</p>
								<p className="card-seat text-md-medium">{car.amenities}</p>
							</div>
							<div className="endtime">
								<div className="card-price">
									<h6 className="text-lg-bold neutral-1000">${car.price}</h6>
									<p className="text-md-medium neutral-500">/ day</p>
								</div>
								<div className="card-button"><Link className="btn btn-gray" href={href}>Book Now</Link></div>
							</div>
						</div>
					</div>
				</div>
		</>
	)
}
