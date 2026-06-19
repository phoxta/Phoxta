import { Swiper, SwiperSlide } from "swiper/react";
import { useFleet } from "@/util/fleet";
import CarCard1 from "@/components/elements/carcard/CarCard1";
import Link from "@/components/common/Link"
import { swiperGroup2 } from '@/util/swiperOptions'

export default function CarsListing3() {
  const { cars } = useFleet();
  const featured = cars.slice(0, 8);
	return (
		<>

			<section className="section-box box-flights background-body">
				<div className="container">
					<div className="row align-items-end">
						<div className="col-lg-6 mb-30 text-center text-lg-start">
							<h2 className="neutral-1000">Popular Vehicles</h2>
							<p className="text-xl-medium neutral-500">Favorite vehicles based on customer reviews</p>
						</div>
						<div className="col-lg-6 mb-30">
							<div className="d-flex align-items-center justify-content-center justify-content-lg-end popular-categories">
								<div className="dropdown dropdown-filter">
									<button className="btn btn-dropdown dropdown-toggle m-0" id="dropdownCategory" type="button" data-bs-toggle="dropdown" aria-expanded="false"><span>Categories</span></button>
									<ul className="dropdown-menu dropdown-menu-light" aria-labelledby="dropdownCategory">
										<li><Link className="dropdown-item active" href="#">Sedan</Link></li>
										<li><Link className="dropdown-item" href="#">SUVs</Link></li>
										<li><Link className="dropdown-item" href="#">Coupes</Link></li>
										<li><Link className="dropdown-item" href="#">Hatchbacks</Link></li>
										<li><Link className="dropdown-item" href="#">Trucks</Link></li>
										<li><Link className="dropdown-item" href="#">Minivan</Link></li>
										<li><Link className="dropdown-item" href="#">Sport</Link></li>
										<li><Link className="dropdown-item" href="#">Cross-over</Link></li>
									</ul>
								</div>
								<div className="dropdown dropdown-filter">
									<button className="btn btn-dropdown dropdown-toggle m-0" id="dropdownCategory" type="button" data-bs-toggle="dropdown" aria-expanded="false"><span>Fuel Type</span></button>
									<ul className="dropdown-menu dropdown-menu-light" aria-labelledby="dropdownCategory">
										<li><Link className="dropdown-item active" href="#">Plug-in Hybrid (PHEV)</Link></li>
										<li><Link className="dropdown-item" href="#">Hybrid (HEV)</Link></li>
										<li><Link className="dropdown-item" href="#">Electric Vehicle (EV)</Link></li>
										<li><Link className="dropdown-item" href="#">Diesel</Link></li>
										<li><Link className="dropdown-item" href="#">Gasoline/Petrol</Link></li>
										<li><Link className="dropdown-item" href="#">Hydrogen</Link></li>
									</ul>
								</div>
								<div className="dropdown dropdown-filter">
									<button className="btn btn-dropdown dropdown-toggle m-0" id="dropdownCategory" type="button" data-bs-toggle="dropdown" aria-expanded="false"><span>Review / Rating</span></button>
									<ul className="dropdown-menu dropdown-menu-light" aria-labelledby="dropdownCategory">
										<li><Link className="dropdown-item active" href="#">Newest</Link></li>
										<li><Link className="dropdown-item" href="#">Oldest</Link></li>
									</ul>
								</div>
								<div className="dropdown dropdown-filter">
									<button className="btn btn-dropdown dropdown-toggle m-0" id="dropdownCategory" type="button" data-bs-toggle="dropdown" aria-expanded="false"><span>Price range</span></button>
									<ul className="dropdown-menu dropdown-menu-light" aria-labelledby="dropdownCategory">
										<li><Link className="dropdown-item active" href="#">$10 - $100</Link></li>
										<li><Link className="dropdown-item" href="#">$100 - $1.000</Link></li>
										<li><Link className="dropdown-item" href="#">$1.000 - $10.000</Link></li>
									</ul>
								</div>
							</div>
						</div>
					</div>
					<div className="block-flights wow fadeInUp">
						<div className="box-swiper mt-30">
							<Swiper {...swiperGroup2} className="swiper-container swiper-group-2 swiper-group-journey">
								<div className="swiper-wrapper">{featured.map((car) => (<SwiperSlide key={car.id}><CarCard1 car={car} /></SwiperSlide>))}</div></Swiper>
						</div>
					</div>
					<div className="d-flex justify-content-center">
						<Link className="btn btn-brand-2 text-nowrap wow fadeInUp" href="/cars-list-1">
							<svg className="me-2" xmlns="http://www.w3.org/2000/svg" width={19} height={18} viewBox="0 0 19 18" fill="none">
								<g clipPath="url(#clip0_117_4717)">
									<path d="M4.4024 14.0977C1.60418 11.2899 1.60418 6.71576 4.4024 3.90794L5.89511 5.40064V0.90332H1.39779L3.13528 2.64081C-0.378102 6.1494 -0.378102 11.8562 3.13528 15.3696C5.35275 17.5823 8.43896 18.403 11.2996 17.8175V15.9648C8.91413 16.584 6.26949 15.9648 4.4024 14.0977Z" fill="#101010" />
									<path d="M15.864 2.64036C13.6465 0.418093 10.5603 -0.402657 7.69971 0.182907V2.03559C10.0852 1.41643 12.7346 2.04519 14.5969 3.90748C17.4047 6.71531 17.4047 11.2894 14.5969 14.0973L13.1042 12.6045V17.1067H17.6063L15.8688 15.3692C19.3774 11.8558 19.3774 6.14894 15.864 2.64036Z" fill="#101010" />
								</g>
								<defs>
									<clipPath id="clip0_117_4717">
										<rect width={18} height={18} fill="white" transform="translate(0.5)" />
									</clipPath>
								</defs>
							</svg>
							Load More Cars
						</Link>
					</div>
				</div>
			</section>
		</>
	)
}
