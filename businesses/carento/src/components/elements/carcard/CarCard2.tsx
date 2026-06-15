import Link from "@/components/common/Link"

export default function CarCard2({ car }: any) {
	return (
		<>
			<div className="card-flight card-hotel card-property background-card border">
				<div className="card-image">
					<Link href="/cars-details-3"><img src={`/assets/imgs/cars-listing/cars-listing-6/${car.image}`} alt="Carento" /></Link>
				</div>
				<div className="card-info p-md-40 p-3">
					<label className="sale-lbl">-25%</label>
					<div className="tour-rate">
						<div className="rate-element">
							<span className="rating">4.96 <span className="text-sm-medium neutral-500">(672 reviews)</span></span>
						</div>
					</div>
					<div className="card-title"><Link className="heading-6 neutral-1000" href="/cars-details-3">{car.name}</Link></div>
					<div className="card-program">
						<div className="card-location mb-25">
							<p className="text-location text-md-medium neutral-500">Manchester, England</p>
						</div>
						<div className="card-facilities">
							<div className="item-facilities">
								<p className="room text-md-medium neutral-1000">Unlimited mileage</p>
							</div>
							<div className="item-facilities">
								<p className="size text-md-medium neutral-1000">Automatic</p>
							</div>
							<div className="item-facilities">
								<p className="parking text-md-medium neutral-1000">3 Large bags</p>
							</div>
							<div className="item-facilities">
								<p className="bed text-md-medium neutral-1000">Diesel</p>
							</div>
							<div className="item-facilities">
								<p className="bathroom text-md-medium neutral-1000">7 seats</p>
							</div>
							<div className="item-facilities">
								<p className="pet text-md-medium neutral-1000">SUVs</p>
							</div>
						</div>
						<div className="endtime">
							<div className="card-price">
								<p className="text-md-medium neutral-500 mr-5">From</p>
								<h6 className="heading-6 neutral-1000">$778.35</h6>
								<p className="text-md-medium neutral-500">/ night</p>
							</div>
							<div className="card-button"><Link className="btn btn-gray" href="/cars-details-3">Book Now</Link></div>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
