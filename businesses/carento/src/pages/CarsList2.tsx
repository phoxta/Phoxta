import CarCard1 from "@/components/elements/carcard/CarCard1";
import HeroSearch from "@/components/elements/HeroSearch";
import SortCarsFilter from "@/components/elements/SortCarsFilter";
import ByPagination from "@/components/Filter/ByPagination";
import Layout from "@/components/layout/Layout";
import { useFleet } from "@/util/fleet";
import useCarFilter from "@/util/useCarFilter";
import Link from "@/components/common/Link";
import Marquee from "react-fast-marquee";

export default function CarsList2() {
    const { cars } = useFleet();
    const { sortCriteria, itemsPerPage, currentPage, sortedCars, totalPages, paginatedCars, handleSortChange, handleItemsPerPageChange, handlePageChange, handlePreviousPage, handleNextPage, handleClearFilters, startItemIndex, endItemIndex } = useCarFilter(cars);

    return (
        <>
            <Layout footerStyle={1}>
                <div>
                    <div className="page-header-2 pt-30 background-body">
                        <div className="custom-container position-relative mx-auto">
                            <div className="bg-overlay rounded-12 overflow-hidden">
                                <img className="w-100 h-100 img-fluid img-banner" src="/assets/imgs/page-header/banner6.png" alt="Carento" />
                            </div>
                            <div className="container position-absolute z-1 top-50 start-50 pb-70 translate-middle text-center">
                                <span className="text-sm-bold bg-2 px-4 py-3 rounded-12">Find cars for sale and for rent near you</span>
                                <h2 className="text-white mt-4">Discover Your Ideal Vehicle</h2>
                                <span className="text-white text-lg-medium">Search and find your best car rental with easy way</span>
                            </div>
                        </div>
                    </div>
                    {/* search 1 */}
                    <section className="box-section box-search-advance-home10 background-body">
                        <div className="container">
                            <div className="box-search-advance background-card wow fadeIn">
                                <div className="box-top-search">
                                    <div className="left-top-search">
                                        <Link className="category-link text-sm-bold btn-click active" href="#">
                                            All cars
                                        </Link>
                                        <Link className="category-link text-sm-bold btn-click" href="#">
                                            New cars
                                        </Link>
                                        <Link className="category-link text-sm-bold btn-click" href="#">
                                            Used cars
                                        </Link>
                                    </div>
                                    <div className="right-top-search d-none d-md-flex">
                                        <Link className="text-sm-medium need-some-help" href="/contact">
                                            Need help?
                                        </Link>
                                    </div>
                                </div>
                                <HeroSearch />
                            </div>
                        </div>
                    </section>
                    {/* cars-listing-1 */}
                    <section className="section-box pt-50 background-body">
                        <div className="container">
                            <div className="row align-items-end">
                                <div className="col-md-9 mb-30 wow fadeInUp">
                                    <h4 className="title-svg neutral-1000 mb-15">Our Vehicle Fleet</h4>
                                    <p className="text-lg-medium text-bold neutral-500">Turning dreams into reality with versatile vehicles.</p>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section className="box-section block-content-tourlist background-body">
                        <div className="container">
                            <div className="box-content-main pt-20">
                                <div className="content-right">
                                    <div className="box-filters mb-25 pb-5 border-bottom border-1">
                                        <SortCarsFilter sortCriteria={sortCriteria} handleSortChange={handleSortChange} itemsPerPage={itemsPerPage} handleItemsPerPageChange={handleItemsPerPageChange} handleClearFilters={handleClearFilters} startItemIndex={startItemIndex} endItemIndex={endItemIndex} sortedCars={sortedCars} />
                                    </div>
                                    <div className="box-grid-tours wow fadeIn">
                                        <div className="row">
                                            {paginatedCars.map((car) => (
                                                <div className="col-lg-3 col-md-6" key={car.id}>
                                                    <CarCard1 car={car} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <ByPagination handlePreviousPage={handlePreviousPage} totalPages={totalPages} currentPage={currentPage} handleNextPage={handleNextPage} handlePageChange={handlePageChange} />
                                </div>
                                <div className="content-left order-lg-first d-none">
                                    <div className="sidebar-left border-1 background-body">
                                        <div className="box-filters-sidebar">
                                            <div className="block-filter border-1">
                                                <h6 className="text-lg-bold item-collapse neutral-1000">Show on map</h6>
                                                <div className="box-collapse scrollFilter mb-15">
                                                    <div className="pt-0">
                                                        <div className="box-map-small">
                                                            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5249.611419370571!2d2.3406913487788334!3d48.86191519358772!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47e66e18a5f84801%3A0x6eb5daa624bdebd2!2sLes%20Halles%2C%2075001%20Pa%20ri%2C%20Ph%C3%A1p!5e0!3m2!1svi!2s!4v1711728202093!5m2!1svi!2s" width="100%" height={160} style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="sidebar-left border-1 background-body">
                                        <div className="box-filters-sidebar">
                                            <div className="block-filter border-1">
                                                <h6 className="text-lg-bold item-collapse neutral-1000">Filter Price</h6>
                                                <div className="box-collapse scrollFilter">
                                                    <div className="pt-20">
                                                        <div className="box-slider-range">
                                                            <div id="slider-range" />
                                                            <div className="box-value-price">
                                                                <span className="text-md-medium neutral-1000">$0</span>
                                                                <span className="text-md-medium neutral-1000">$500</span>
                                                            </div>
                                                            <input className="value-money" type="hidden" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="d-flex justify-content-between pt-20 border-top">
                                                    <Link href="#" className="d-flex align-items-center">
                                                        <div className="background-100 icon-shape p-1 rounded-1 me-2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width={9} height={9} viewBox="0 0 9 9" fill="none">
                                                                <line x1="1.20074" y1="1.5141" x2="7.59837" y2="7.91174" stroke="black" strokeWidth="0.904762" />
                                                                <line x1="1.01337" y1="7.91156" x2="7.411" y2="1.51393" stroke="black" strokeWidth="0.904762" />
                                                            </svg>
                                                        </div>
                                                        <span className="text-sm-medium neutral-1000">Clear</span>
                                                    </Link>
                                                    <Link href="#" className="btn btn-primary px-3 py-2">
                                                        <img src="/assets/imgs/template/icons/user.svg" alt="Carento" />
                                                        Apply
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="sidebar-left border-1 background-body">
                                        <div className="box-filters-sidebar">
                                            <div className="block-filter border-1">
                                                <h6 className="text-lg-bold item-collapse neutral-1000">Car type</h6>
                                                <div className="box-collapse scrollFilter">
                                                    <ul className="list-filter-checkbox">
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">All </span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">198</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Sedans</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">32</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">SUVs </span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">13</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Coupes</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">23</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Hatchbacks</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">35</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Convertibles</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">56</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Trucks</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">76</span>
                                                        </li>
                                                    </ul>
                                                    <div className="box-see-more mt-20 mb-25">
                                                        <Link className="link-see-more" href="#">
                                                            See more
                                                            <svg width={8} height={6} viewBox="0 0 8 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M7.89553 1.02367C7.75114 0.870518 7.50961 0.864815 7.35723 1.00881L3.9998 4.18946L0.642774 1.00883C0.490387 0.86444 0.249236 0.870534 0.104474 1.02369C-0.0402885 1.17645 -0.0338199 1.4176 0.118958 1.56236L3.73809 4.99102C3.81123 5.06036 3.90571 5.0954 3.9998 5.0954C4.0939 5.0954 4.18875 5.06036 4.26191 4.99102L7.88104 1.56236C8.03382 1.41758 8.04029 1.17645 7.89553 1.02367Z" fill="currentColor" />
                                                            </svg>
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="sidebar-left border-1 background-body">
                                        <div className="box-filters-sidebar">
                                            <div className="block-filter border-1">
                                                <h6 className="text-lg-bold item-collapse neutral-1000">Car Amenities</h6>
                                                <div className="box-collapse scrollFilter">
                                                    <ul className="list-filter-checkbox">
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">All</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">32</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Leather upholstery</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">13</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Heated seats</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">23</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Sunroof/Moonroof</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">23</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Keyless entry/start</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">35</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Heads-up display</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">56</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Adaptive cruise control</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">76</span>
                                                        </li>
                                                    </ul>
                                                    <div className="box-see-more mt-20 mb-25">
                                                        <Link className="link-see-more" href="#">
                                                            See more
                                                            <svg width={8} height={6} viewBox="0 0 8 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M7.89553 1.02367C7.75114 0.870518 7.50961 0.864815 7.35723 1.00881L3.9998 4.18946L0.642774 1.00883C0.490387 0.86444 0.249236 0.870534 0.104474 1.02369C-0.0402885 1.17645 -0.0338199 1.4176 0.118958 1.56236L3.73809 4.99102C3.81123 5.06036 3.90571 5.0954 3.9998 5.0954C4.0939 5.0954 4.18875 5.06036 4.26191 4.99102L7.88104 1.56236C8.03382 1.41758 8.04029 1.17645 7.89553 1.02367Z" fill="currentColor" />
                                                            </svg>
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="sidebar-left border-1 background-body">
                                        <div className="box-filters-sidebar">
                                            <div className="block-filter border-1">
                                                <h6 className="text-lg-bold item-collapse neutral-1000">Fuel Type</h6>
                                                <div className="box-collapse scrollFilter">
                                                    <ul className="list-filter-checkbox">
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">All</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">32</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Plug-in Hybrid (PHEV)</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">13</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Hybrid (HEV)</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">23</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Electric Vehicle (EV)</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">23</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Diesel</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">35</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Gasoline/Petrol</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">56</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Hydrogen</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">76</span>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="sidebar-left border-1 background-body">
                                        <div className="box-filters-sidebar">
                                            <div className="block-filter border-1">
                                                <h6 className="text-lg-bold item-collapse neutral-1000">Review Score</h6>
                                                <div className="box-collapse scrollFilter">
                                                    <ul className="list-filter-checkbox">
                                                        <li>
                                                            <label className="cb-container">
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">
                                                                    {" "}
                                                                    <img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" />
                                                                    <img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" />
                                                                    <img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" />
                                                                    <img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" />
                                                                    <img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" />
                                                                </span>
                                                                <span className="checkmark" />
                                                            </label>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">
                                                                    {" "}
                                                                    <img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" />
                                                                    <img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" />
                                                                    <img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" />
                                                                    <img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" />
                                                                    <img src="/assets/imgs/template/icons/star-grey.svg" alt="Carento" />
                                                                </span>
                                                                <span className="checkmark" />
                                                            </label>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">
                                                                    {" "}
                                                                    <img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" />
                                                                    <img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" />
                                                                    <img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" />
                                                                    <img src="/assets/imgs/template/icons/star-grey.svg" alt="Carento" />
                                                                    <img src="/assets/imgs/template/icons/star-grey.svg" alt="Carento" />
                                                                </span>
                                                                <span className="checkmark" />
                                                            </label>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">
                                                                    {" "}
                                                                    <img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" />
                                                                    <img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" />
                                                                    <img src="/assets/imgs/template/icons/star-grey.svg" alt="Carento" />
                                                                    <img src="/assets/imgs/template/icons/star-grey.svg" alt="Carento" />
                                                                    <img src="/assets/imgs/template/icons/star-grey.svg" alt="Carento" />
                                                                </span>
                                                                <span className="checkmark" />
                                                            </label>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">
                                                                    {" "}
                                                                    <img src="/assets/imgs/template/icons/star-yellow.svg" alt="Carento" />
                                                                    <img src="/assets/imgs/template/icons/star-grey.svg" alt="Carento" />
                                                                    <img src="/assets/imgs/template/icons/star-grey.svg" alt="Carento" />
                                                                    <img src="/assets/imgs/template/icons/star-grey.svg" alt="Carento" />
                                                                    <img src="/assets/imgs/template/icons/star-grey.svg" alt="Carento" />
                                                                </span>
                                                                <span className="checkmark" />
                                                            </label>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="sidebar-left border-1 background-body">
                                        <div className="box-filters-sidebar">
                                            <div className="block-filter border-1">
                                                <h6 className="text-lg-bold item-collapse neutral-1000">Booking Location</h6>
                                                <div className="box-collapse scrollFilter">
                                                    <ul className="list-filter-checkbox">
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Maldives Haven</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">198</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Santorini Retreat</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">32</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Parisian Plaza</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">13</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Tokyo Tower View</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">23</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Caribbean Cove</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">35</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Swiss Alps Lodge</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">56</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">New York Cityscape</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">76</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Dubai Oasis</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">76</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">Barcelona Beachfront</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">76</span>
                                                        </li>
                                                        <li>
                                                            <label className="cb-container">
                                                                {" "}
                                                                <input type="checkbox" />
                                                                <span className="text-sm-medium">London Luxe</span>
                                                                <span className="checkmark" />{" "}
                                                            </label>
                                                            <span className="number-item">76</span>
                                                        </li>
                                                    </ul>
                                                    <div className="box-see-more">
                                                        <Link className="link-see-more" href="#">
                                                            See more
                                                            <svg width={8} height={6} viewBox="0 0 8 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M7.89553 1.02367C7.75114 0.870518 7.50961 0.864815 7.35723 1.00881L3.9998 4.18946L0.642774 1.00883C0.490387 0.86444 0.249236 0.870534 0.104474 1.02369C-0.0402885 1.17645 -0.0338199 1.4176 0.118958 1.56236L3.73809 4.99102C3.81123 5.06036 3.90571 5.0954 3.9998 5.0954C4.0939 5.0954 4.18875 5.06036 4.26191 4.99102L7.88104 1.56236C8.03382 1.41758 8.04029 1.17645 7.89553 1.02367Z" fill="currentColor" />
                                                            </svg>
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="background-100 pt-55 pb-55">
                            <div className="container">
                                <Marquee direction="left" pauseOnHover={true} className="carouselTicker carouselTicker-left box-list-brand-car justify-content-center  wow fadeIn">
                                    <ul className="carouselTicker__list">
                                        <li className="carouselTicker__item">
                                            <div className="item-brand">
                                                <img className="light-mode" src="/assets/imgs/page/homepage2/lexus.png" alt="Carento" />
                                                <img className="dark-mode" src="/assets/imgs/page/homepage2/lexus-w.png" alt="Carento" />
                                            </div>
                                        </li>
                                        <li className="carouselTicker__item">
                                            <div className="item-brand">
                                                <img className="light-mode" src="/assets/imgs/page/homepage2/mer.png" alt="Carento" />
                                                <img className="dark-mode" src="/assets/imgs/page/homepage2/mer-w.png" alt="Carento" />
                                            </div>
                                        </li>
                                        <li className="carouselTicker__item">
                                            <div className="item-brand">
                                                <img className="light-mode" src="/assets/imgs/page/homepage2/bugatti.png" alt="Carento" />
                                                <img className="dark-mode" src="/assets/imgs/page/homepage2/bugatti-w.png" alt="Carento" />
                                            </div>
                                        </li>
                                        <li className="carouselTicker__item">
                                            <div className="item-brand">
                                                <img className="light-mode" src="/assets/imgs/page/homepage2/jaguar.png" alt="Carento" />
                                                <img className="dark-mode" src="/assets/imgs/page/homepage2/jaguar-w.png" alt="Carento" />
                                            </div>
                                        </li>
                                        <li className="carouselTicker__item">
                                            <div className="item-brand">
                                                <img className="light-mode" src="/assets/imgs/page/homepage2/honda.png" alt="Carento" />
                                                <img className="dark-mode" src="/assets/imgs/page/homepage2/honda-w.png" alt="Carento" />
                                            </div>
                                        </li>
                                        <li className="carouselTicker__item">
                                            <div className="item-brand">
                                                <img className="light-mode" src="/assets/imgs/page/homepage2/chevrolet.png" alt="Carento" />
                                                <img className="dark-mode" src="/assets/imgs/page/homepage2/chevrolet-w.png" alt="Carento" />
                                            </div>
                                        </li>
                                        <li className="carouselTicker__item">
                                            <div className="item-brand">
                                                <img className="light-mode" src="/assets/imgs/page/homepage2/acura.png" alt="Carento" />
                                                <img className="dark-mode" src="/assets/imgs/page/homepage2/acura-w.png" alt="Carento" />
                                            </div>
                                        </li>
                                        <li className="carouselTicker__item">
                                            <div className="item-brand">
                                                <img className="light-mode" src="/assets/imgs/page/homepage2/bmw.png" alt="Carento" />
                                                <img className="dark-mode" src="/assets/imgs/page/homepage2/bmw-w.png" alt="Carento" />
                                            </div>
                                        </li>
                                        <li className="carouselTicker__item">
                                            <div className="item-brand">
                                                <img className="light-mode" src="/assets/imgs/page/homepage2/toyota.png" alt="Carento" />
                                                <img className="dark-mode" src="/assets/imgs/page/homepage2/toyota-w.png" alt="Carento" />
                                            </div>
                                        </li>
                                        <li className="carouselTicker__item">
                                            <div className="item-brand">
                                                <img className="light-mode" src="/assets/imgs/page/homepage2/lexus.png" alt="Carento" />
                                                <img className="dark-mode" src="/assets/imgs/page/homepage2/lexus-w.png" alt="Carento" />
                                            </div>
                                        </li>
                                        <li className="carouselTicker__item">
                                            <div className="item-brand">
                                                <img className="light-mode" src="/assets/imgs/page/homepage2/mer.png" alt="Carento" />
                                                <img className="dark-mode" src="/assets/imgs/page/homepage2/mer-w.png" alt="Carento" />
                                            </div>
                                        </li>
                                        <li className="carouselTicker__item">
                                            <div className="item-brand">
                                                <img className="light-mode" src="/assets/imgs/page/homepage2/bugatti.png" alt="Carento" />
                                                <img className="dark-mode" src="/assets/imgs/page/homepage2/bugatti-w.png" alt="Carento" />
                                            </div>
                                        </li>
                                    </ul>
                                </Marquee>
                            </div>
                        </div>
                    </section>
                </div>
            </Layout>
        </>
    );
}
