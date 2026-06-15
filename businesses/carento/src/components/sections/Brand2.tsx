
import Link from "@/components/common/Link"
import Marquee from 'react-fast-marquee'

export default function Brand2({ noBg }: any) {
	return (
		<>

			<div className={`py-96 ${noBg ? '' : ' background-100'}`}>
				<div className="container">
					<div className="box-search-category">
						<h3 className="heading-3 mb-0 neutral-1000 wow fadeInUp">Premium Brands</h3>
						<div className="d-flex align-items-center justify-content-between">
							<p className="text-lg-medium neutral-500 wow fadeInUp">Unveil the Finest Selection of High-End Vehicles</p>
							<Link href="#" className="text-sm-bold neutral-1000 wow fadeInUp">
								Show All Brands
								<svg className="ms-1" xmlns="http://www.w3.org/2000/svg" width={15} height={10} viewBox="0 0 15 10" fill="none">
									<path fillRule="evenodd" clipRule="evenodd" d="M0.718262 4.99965C0.718262 4.86705 0.77094 4.73987 0.864708 4.6461C0.958476 4.55233 1.08565 4.49965 1.21826 4.49965H13.0113L9.86426 1.35366C9.77038 1.25977 9.71763 1.13243 9.71763 0.999655C9.71763 0.866879 9.77038 0.739542 9.86426 0.645655C9.95815 0.551768 10.0855 0.499023 10.2183 0.499023C10.351 0.499023 10.4784 0.551768 10.5723 0.645655L14.5723 4.64565C14.6188 4.6921 14.6558 4.74728 14.681 4.80802C14.7062 4.86877 14.7192 4.93389 14.7192 4.99965C14.7192 5.06542 14.7062 5.13054 14.681 5.19129C14.6558 5.25203 14.6188 5.30721 14.5723 5.35365L10.5723 9.35365C10.4784 9.44754 10.351 9.50029 10.2183 9.50029C10.0855 9.50029 9.95815 9.44754 9.86426 9.35365C9.77038 9.25977 9.71763 9.13243 9.71763 8.99965C9.71763 8.86688 9.77038 8.73954 9.86426 8.64565L13.0113 5.49965H1.21826C1.08565 5.49965 0.958476 5.44698 0.864708 5.35321C0.77094 5.25944 0.718262 5.13226 0.718262 4.99965Z" fill="#101010" />
								</svg>
							</Link>
						</div>
						<Marquee direction='left' pauseOnHover={true} className="carouselTicker carouselTicker-left box-list-brand-car flex-lg-nowrap justify-content-lg-between gap-3 justify-content-center">
							<ul className="carouselTicker__list">
								<li className="carouselTicker__item">
									<div className="item-brand-2">
										<img className="dark-invert" src="/assets/imgs/brand/brand-2/icon-1.png" alt="Carento" />
										<span className="text-md-bold mt-2">Opel</span>
										<span className="text-xs-bold neutral-500">180 cars</span>
									</div>
								</li>
								<li className="carouselTicker__item">
									<div className="item-brand-2">
										<img className="dark-invert" src="/assets/imgs/brand/brand-2/icon-2.png" alt="Carento" />
										<span className="text-md-bold mt-2">BMV</span>
										<span className="text-xs-bold neutral-500">180 cars</span>
									</div>
								</li>
								<li className="carouselTicker__item">
									<div className="item-brand-2">
										<img className="dark-invert" src="/assets/imgs/brand/brand-2/icon-3.png" alt="Carento" />
										<span className="text-md-bold mt-2">Mercedes</span>
										<span className="text-xs-bold neutral-500">180 cars</span>
									</div>
								</li>
								<li className="carouselTicker__item">
									<div className="item-brand-2">
										<img className="dark-invert" src="/assets/imgs/brand/brand-2/icon-4.png" alt="Carento" />
										<span className="text-md-bold mt-2">Ford</span>
										<span className="text-xs-bold neutral-500">180 cars</span>
									</div>
								</li>
								<li className="carouselTicker__item">
									<div className="item-brand-2">
										<img className="dark-invert" src="/assets/imgs/brand/brand-2/icon-5.png" alt="Carento" />
										<span className="text-md-bold mt-2">Peugeot</span>
										<span className="text-xs-bold neutral-500">180 cars</span>
									</div>
								</li>
								<li className="carouselTicker__item">
									<div className="item-brand-2">
										<img className="dark-invert" src="/assets/imgs/brand/brand-2/icon-6.png" alt="Carento" />
										<span className="text-md-bold mt-2">Hyundai</span>
										<span className="text-xs-bold neutral-500">180 cars</span>
									</div>
								</li>
								<li className="carouselTicker__item">
									<div className="item-brand-2">
										<img className="dark-invert" src="/assets/imgs/brand/brand-2/icon-7.png" alt="Carento" />
										<span className="text-md-bold mt-2">Toyota</span>
										<span className="text-xs-bold neutral-500">180 cars</span>
									</div>
								</li>
								<li className="carouselTicker__item">
									<div className="item-brand-2">
										<img className="dark-invert" src="/assets/imgs/brand/brand-2/icon-2.png" alt="Carento" />
										<span className="text-md-bold mt-2">BMV</span>
										<span className="text-xs-bold neutral-500">180 cars</span>
									</div>
								</li>
								<li className="carouselTicker__item">
									<div className="item-brand-2">
										<img className="dark-invert" src="/assets/imgs/brand/brand-2/icon-3.png" alt="Carento" />
										<span className="text-md-bold mt-2">Mercedes</span>
										<span className="text-xs-bold neutral-500">180 cars</span>
									</div>
								</li>
								<li className="carouselTicker__item">
									<div className="item-brand-2">
										<img className="dark-invert" src="/assets/imgs/brand/brand-2/icon-8.png" alt="Carento" />
										<span className="text-md-bold mt-2">Nissan</span>
										<span className="text-xs-bold neutral-500">180 cars</span>
									</div>
								</li>
								<li className="carouselTicker__item">
									<div className="item-brand-2">
										<img className="dark-invert" src="/assets/imgs/brand/brand-2/icon-9.png" alt="Carento" />
										<span className="text-md-bold mt-2">Mazda</span>
										<span className="text-xs-bold neutral-500">180 cars</span>
									</div>
								</li>
							</ul>
						</Marquee>
					</div>
				</div>
			</div >
		</>
	)
}
