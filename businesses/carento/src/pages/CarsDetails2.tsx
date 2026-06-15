import MyDatePicker from "@/components/elements/MyDatePicker";
import Layout from "@/components/layout/Layout";
import Link from "@/components/common/Link";
import { useState } from "react";
import Marquee from "react-fast-marquee";
import ModalVideo from "react-modal-video";
export default function CarsDetails2() {
    const [isOpen, setOpen] = useState(false);
    const [isAccordion, setIsAccordion] = useState(null);

    const handleAccordion = (key: any) => {
        setIsAccordion((prevState) => (prevState === key ? null : key));
    };
    return (
        <>
            <Layout footerStyle={1}>
                <div>
                    <section className="box-section box-breadcrumb background-body">
                        <div className="container">
                            <ul className="breadcrumbs">
                                <li>
                                    <Link href="/">Home</Link>
                                    <span className="arrow-right">
                                        <svg width={7} height={12} viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 11L6 6L1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                </li>
                                <li>
                                    <Link href="/cars-list-1">Cars Rental</Link>
                                    <span className="arrow-right">
                                        <svg width={7} height={12} viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 11L6 6L1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                </li>
                                <li>
                                    <span className="text-breadcrumb">Hyundai Accent 2025 </span>
                                </li>
                            </ul>
                        </div>
                    </section>
                    <section className="box-section box-content-tour-detail background-body">
                        <div className="container">
                            <div className="tour-header">
                                <div className="tour-rate">
                                    <div className="rate-element">
                                        <span className="rating">
                                            4.96 <span className="text-sm-medium neutral-500">(672 reviews)</span>
                                        </span>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-lg-8">
                                        <div className="tour-title-main">
                                            <h4 className="neutral-1000">Hyundai Accent 2015 - Modern compact sedan in blue color on beautiful dark wheels</h4>
                                        </div>
                                    </div>
                                </div>
                                <div className="tour-metas">
                                    <div className="tour-meta-left">
                                        <p className="text-md-medium neutral-1000 mr-20 tour-location">
                                            <svg className="invert" xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16" fill="none">
                                                <path d="M7.99967 0C4.80452 0 2.20508 2.59944 2.20508 5.79456C2.20508 9.75981 7.39067 15.581 7.61145 15.8269C7.81883 16.0579 8.18089 16.0575 8.38789 15.8269C8.60867 15.581 13.7943 9.75981 13.7943 5.79456C13.7942 2.59944 11.1948 0 7.99967 0ZM7.99967 8.70997C6.39211 8.70997 5.0843 7.40212 5.0843 5.79456C5.0843 4.187 6.39214 2.87919 7.99967 2.87919C9.6072 2.87919 10.915 4.18703 10.915 5.79459C10.915 7.40216 9.6072 8.70997 7.99967 8.70997Z" fill="#101010" />
                                            </svg>
                                            Las Vegas, USA
                                        </p>
                                        <Link className="text-md-medium neutral-1000 mr-30" href="#">
                                            Show on map
                                        </Link>
                                        <p className="text-md-medium neutral-1000 tour-code mr-15">
                                            <svg className="invert" xmlns="http://www.w3.org/2000/svg" width={20} height={18} viewBox="0 0 20 18" fill="none">
                                                <path
                                                    fillRule="evenodd"
                                                    clipRule="evenodd"
                                                    d="M13.2729 0.273646C13.4097 0.238432 13.5538 0.24262 13.6884 0.28573L18.5284 1.83572L18.5474 1.84209C18.8967 1.96436 19.1936 2.19167 19.4024 2.4875C19.5891 2.75202 19.7309 3.08694 19.7489 3.46434C19.7494 3.47622 19.7497 3.4881 19.7497 3.49998V15.5999C19.7625 15.8723 19.7102 16.1395 19.609 16.3754C19.6059 16.3827 19.6026 16.39 19.5993 16.3972C19.476 16.6613 19.3017 16.8663 19.1098 17.0262C19.1023 17.0324 19.0947 17.0385 19.087 17.0445C18.8513 17.2258 18.5774 17.3363 18.2988 17.3734L18.2927 17.3743C18.0363 17.4063 17.7882 17.3792 17.5622 17.3133C17.5379 17.3081 17.5138 17.3016 17.4901 17.294L13.4665 16.0004L6.75651 17.7263C6.62007 17.7614 6.47649 17.7574 6.34221 17.7147L1.47223 16.1647C1.46543 16.1625 1.45866 16.1603 1.45193 16.1579C1.0871 16.0302 0.813939 15.7971 0.613929 15.5356C0.608133 15.528 0.602481 15.5203 0.596973 15.5125C0.395967 15.2278 0.277432 14.8905 0.260536 14.5357C0.259972 14.5238 0.259689 14.5119 0.259689 14.5V2.39007C0.246699 2.11286 0.301239 1.83735 0.420015 1.58283C0.544641 1.31578 0.724533 1.10313 0.942417 0.93553C1.17424 0.757204 1.45649 0.6376 1.7691 0.61312C2.03626 0.583264 2.30621 0.616234 2.56047 0.712834L6.56277 1.99963L13.2729 0.273646ZM13.437 1.78025L6.72651 3.50634C6.58929 3.54162 6.44493 3.53736 6.31011 3.49398L2.08011 2.13402C2.06359 2.1287 2.04725 2.12282 2.03113 2.11637C2.00054 2.10413 1.96854 2.09972 1.93273 2.10419C1.91736 2.10611 1.90194 2.10756 1.88649 2.10852C1.88649 2.10852 1.88436 2.10866 1.88088 2.11001C1.8771 2.11149 1.86887 2.11532 1.85699 2.12447C1.81487 2.15686 1.79467 2.18421 1.77929 2.21715C1.76189 2.25446 1.75611 2.28942 1.75823 2.32321C1.7592 2.33879 1.75969 2.35439 1.75969 2.36999V14.4772C1.76448 14.5336 1.78316 14.5879 1.81511 14.6367C1.86704 14.7014 1.90866 14.7272 1.94108 14.7398L6.59169 16.2199L13.3028 14.4937C13.44 14.4584 13.5844 14.4626 13.7192 14.506L17.8938 15.8482C17.9184 15.8537 17.9428 15.8605 17.9669 15.8685C18.0209 15.8865 18.0669 15.8902 18.1034 15.8862C18.1214 15.8833 18.1425 15.8759 18.1629 15.8623C18.1981 15.8309 18.2196 15.8024 18.2346 15.7738C18.2473 15.7399 18.2533 15.7014 18.2511 15.6668C18.2502 15.6512 18.2497 15.6356 18.2497 15.62V3.52464C18.2453 3.48222 18.2258 3.42174 18.1769 3.3525C18.147 3.3102 18.1062 3.2784 18.0582 3.26022L13.437 1.78025Z"
                                                    fill="#101010"
                                                />
                                                <path fillRule="evenodd" clipRule="evenodd" d="M6.55957 2.01953C6.97375 2.01953 7.30957 2.35532 7.30957 2.76953V16.9195C7.30957 17.3338 6.97375 17.6695 6.55957 17.6695C6.14533 17.6695 5.80957 17.3338 5.80957 16.9195V2.76953C5.80957 2.35532 6.14533 2.01953 6.55957 2.01953Z" fill="#101010" />
                                                <path fillRule="evenodd" clipRule="evenodd" d="M13.4893 0.330078C13.9035 0.330078 14.2393 0.665862 14.2393 1.08008V15.2301C14.2393 15.6443 13.9035 15.9801 13.4893 15.9801C13.0751 15.9801 12.7393 15.6443 12.7393 15.2301V1.08008C12.7393 0.665862 13.0751 0.330078 13.4893 0.330078Z" fill="#101010" />
                                            </svg>
                                            Fleet Code:
                                        </p>
                                        <Link className="text-md-medium neutral-1000" href="#">
                                            LVA-4125
                                        </Link>
                                    </div>
                                    <div className="tour-meta-right">
                                        <Link className="btn btn-share" href="#">
                                            <svg width={16} height={18} viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M13 11.5332C12.012 11.5332 11.1413 12.0193 10.5944 12.7584L5.86633 10.3374C5.94483 10.0698 6 9.79249 6 9.49989C6 9.10302 5.91863 8.72572 5.77807 8.37869L10.7262 5.40109C11.2769 6.04735 12.0863 6.46655 13 6.46655C14.6543 6.46655 16 5.12085 16 3.46655C16 1.81225 14.6543 0.466553 13 0.466553C11.3457 0.466553 10 1.81225 10 3.46655C10 3.84779 10.0785 4.20942 10.2087 4.54515L5.24583 7.53149C4.69563 6.90442 3.8979 6.49989 3 6.49989C1.3457 6.49989 0 7.84559 0 9.49989C0 11.1542 1.3457 12.4999 3 12.4999C4.00433 12.4999 4.8897 11.9996 5.4345 11.2397L10.147 13.6529C10.0602 13.9331 10 14.2249 10 14.5332C10 16.1875 11.3457 17.5332 13 17.5332C14.6543 17.5332 16 16.1875 16 14.5332C16 12.8789 14.6543 11.5332 13 11.5332Z" fill="currentColor" />
                                            </svg>
                                            Share
                                        </Link>
                                        <Link className="btn btn-wishlish" href="#">
                                            <svg width={20} height={18} viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path fillRule="evenodd" clipRule="evenodd" d="M2.2222 2.3638C4.34203 0.243977 7.65342 0.0419426 10.0004 1.7577C12.3473 0.0419426 15.6587 0.243977 17.7786 2.3638C20.1217 4.70695 20.1217 8.50594 17.7786 10.8491L12.1217 16.5059C10.9501 17.6775 9.05063 17.6775 7.87906 16.5059L2.2222 10.8491C-0.120943 8.50594 -0.120943 4.70695 2.2222 2.3638Z" fill="currentColor" />
                                            </svg>
                                            Wishlish
                                        </Link>
                                    </div>
                                </div>
                            </div>
                            <div className="box-section box-banner-property-detail background-body">
                                <div className="position-relative">
                                    <div className="block-banner-property-detail container-banner-activities">
                                        <div className="row g-3">
                                            <div className="col-lg-7">
                                                <div className="position-relative rounded-12 overflow-hidden">
                                                    <img src="/assets/imgs/cars-details//banner6.png" alt="Travile" />
                                                    <div className="box-button-abs">
                                                        <Link className="btn btn-primary rounded-pill" href="#">
                                                            <svg width={22} height={22} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M20 8V2.75C20 2.3375 19.6625 2 19.25 2H14C13.5875 2 13.25 2.3375 13.25 2.75V8C13.25 8.4125 13.5875 8.75 14 8.75H19.25C19.6625 8.75 20 8.4125 20 8ZM19.25 0.5C20.495 0.5 21.5 1.505 21.5 2.75V8C21.5 9.245 20.495 10.25 19.25 10.25H14C12.755 10.25 11.75 9.245 11.75 8V2.75C11.75 1.505 12.755 0.5 14 0.5H19.25Z" fill="currentColor" />
                                                                <path d="M20 19.25V14C20 13.5875 19.6625 13.25 19.25 13.25H14C13.5875 13.25 13.25 13.5875 13.25 14V19.25C13.25 19.6625 13.5875 20 14 20H19.25C19.6625 20 20 19.6625 20 19.25ZM19.25 11.75C20.495 11.75 21.5 12.755 21.5 14V19.25C21.5 20.495 20.495 21.5 19.25 21.5H14C12.755 21.5 11.75 20.495 11.75 19.25V14C11.75 12.755 12.755 11.75 14 11.75H19.25Z" fill="currentColor" />
                                                                <path d="M8 8.75C8.4125 8.75 8.75 8.4125 8.75 8V2.75C8.75 2.3375 8.4125 2 8 2H2.75C2.3375 2 2 2.3375 2 2.75V8C2 8.4125 2.3375 8.75 2.75 8.75H8ZM8 0.5C9.245 0.5 10.25 1.505 10.25 2.75V8C10.25 9.245 9.245 10.25 8 10.25H2.75C1.505 10.25 0.5 9.245 0.5 8V2.75C0.5 1.505 1.505 0.5 2.75 0.5H8Z" fill="currentColor" />
                                                                <path d="M8 20C8.4125 20 8.75 19.6625 8.75 19.25V14C8.75 13.5875 8.4125 13.25 8 13.25H2.75C2.3375 13.25 2 13.5875 2 14V19.25C2 19.6625 2.3375 20 2.75 20H8ZM8 11.75C9.245 11.75 10.25 12.755 10.25 14V19.25C10.25 20.495 9.245 21.5 8 21.5H2.75C1.505 21.5 0.5 20.495 0.5 19.25V14C0.5 12.755 1.505 11.75 2.75 11.75H8Z" fill="currentColor" />
                                                            </svg>
                                                            See All Photos
                                                        </Link>
                                                        <a className="btn btn-white-md popup-youtube" onClick={() => setOpen(true)}>
                                                            {" "}
                                                            <img src="/assets/imgs/page/activities/video.svg" alt="Carento" />
                                                            Video Clips
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-lg-5">
                                                <div className="d-flex gap-3">
                                                    <div className="d-flex gap-3 flex-column w-100">
                                                        <div className="rounded-12 overflow-hidden w-100">
                                                            <img className="w-100" src="/assets/imgs/cars-details//banner7.png" alt="Travile" />
                                                        </div>
                                                        <div className="rounded-12 overflow-hidden w-100">
                                                            <img className="w-100" src="/assets/imgs/cars-details//banner8.png" alt="Travile" />
                                                        </div>
                                                    </div>
                                                    <div className="d-flex gap-3 flex-column w-100">
                                                        <div className="rounded-12 overflow-hidden w-100">
                                                            <img className="w-100" src="/assets/imgs/cars-details//banner9.png" alt="Travile" />
                                                        </div>
                                                        <div className="rounded-12 overflow-hidden w-100">
                                                            <img className="w-100" src="/assets/imgs/cars-details//banner10.png" alt="Travile" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="row mt-30">
                                <div className="col-lg-8">
                                    <div className="box-feature-car">
                                        <div className="list-feature-car">
                                            <div className="item-feature-car w-md-25">
                                                <div className="item-feature-car-inner">
                                                    <div className="feature-image">
                                                        <img src="/assets/imgs/page/car/km.svg" alt="Carento" />
                                                    </div>
                                                    <div className="feature-info">
                                                        <p className="text-md-medium neutral-1000">56,500</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="item-feature-car w-md-25">
                                                <div className="item-feature-car-inner">
                                                    <div className="feature-image">
                                                        <img src="/assets/imgs/page/car/diesel.svg" alt="Carento" />
                                                    </div>
                                                    <div className="feature-info">
                                                        <p className="text-md-medium neutral-1000">Diesel</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="item-feature-car w-md-25">
                                                <div className="item-feature-car-inner">
                                                    <div className="feature-image">
                                                        <img src="/assets/imgs/page/car/auto.svg" alt="Carento" />
                                                    </div>
                                                    <div className="feature-info">
                                                        <p className="text-md-medium neutral-1000">Automatic</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="item-feature-car w-md-25">
                                                <div className="item-feature-car-inner">
                                                    <div className="feature-image">
                                                        <img src="/assets/imgs/page/car/seat.svg" alt="Carento" />
                                                    </div>
                                                    <div className="feature-info">
                                                        <p className="text-md-medium neutral-1000">7 seats</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="item-feature-car w-md-25">
                                                <div className="item-feature-car-inner">
                                                    <div className="feature-image">
                                                        <img src="/assets/imgs/page/car/bag.svg" alt="Carento" />
                                                    </div>
                                                    <div className="feature-info">
                                                        <p className="text-md-medium neutral-1000">3 Large bags</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="item-feature-car w-md-25">
                                                <div className="item-feature-car-inner">
                                                    <div className="feature-image">
                                                        <img src="/assets/imgs/page/car/suv.svg" alt="Carento" />
                                                    </div>
                                                    <div className="feature-info">
                                                        <p className="text-md-medium neutral-1000">SUVs</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="item-feature-car w-md-25">
                                                <div className="item-feature-car-inner">
                                                    <div className="feature-image">
                                                        <img src="/assets/imgs/page/car/door.svg" alt="Carento" />
                                                    </div>
                                                    <div className="feature-info">
                                                        <p className="text-md-medium neutral-1000">4 Doors</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="item-feature-car w-md-25">
                                                <div className="item-feature-car-inner">
                                                    <div className="feature-image">
                                                        <img src="/assets/imgs/page/car/lit.svg" alt="Carento" />
                                                    </div>
                                                    <div className="feature-info">
                                                        <p className="text-md-medium neutral-1000">2.5L</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="box-collapse-expand">
                                        <div className="group-collapse-expand">
                                            <button className={isAccordion == 1 ? "btn btn-collapse collapsed" : "btn btn-collapse"} type="button" data-bs-toggle="collapse" data-bs-target="#collapseOverview" aria-expanded="false" aria-controls="collapseOverview" onClick={() => handleAccordion(1)}>
                                                <h6>Overview</h6>
                                                <svg width={12} height={7} viewBox="0 0 12 7" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M1 1L6 6L11 1" stroke="" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                </svg>
                                            </button>
                                            <div className={isAccordion == 1 ? "collapse" : "collapse show"} id="collapseOverview">
                                                <div className="card card-body">
                                                    <p>Elevate your Las Vegas experience to new heights with a journey aboard The High Roller at The LINQ. As the tallest observation wheel in the world, standing at an impressive 550 feet tall, The High Roller offers a bird's-eye perspective of the iconic Las Vegas Strip and its surrounding desert landscape. From the moment you step into one of the spacious cabins, you'll be transported on a mesmerizing adventure, where every turn offers a new and breathtaking vista of the vibrant city below.</p>
                                                    <p>Whether you're a first-time visitor or a seasoned Las Vegas aficionado, The High Roller promises an unparalleled experience that will leave you in awe. With its climate-controlled cabins and immersive audio commentary, this attraction provides a unique opportunity to see Las Vegas from a whole new perspective, while learning about its rich history and famous landmarks along the way.</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="group-collapse-expand">
                                            <button className={isAccordion == 2 ? "btn btn-collapse collapsed" : "btn btn-collapse"} type="button" data-bs-toggle="collapse" data-bs-target="#collapseItinerary" aria-expanded="false" aria-controls="collapseItinerary" onClick={() => handleAccordion(2)}>
                                                <h6>Included in the price</h6>
                                                <svg width={12} height={7} viewBox="0 0 12 7" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M1 1L6 6L11 1" stroke="" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                </svg>
                                            </button>
                                            <div className={isAccordion == 2 ? "collapse" : "collapse show"} id="collapseItinerary">
                                                <div className="card card-body">
                                                    <ul className="list-checked-green">
                                                        <li>Free cancellation up to 48 hours before pick-up</li>
                                                        <li>Collision Damage Waiver with $700 deductible</li>
                                                        <li>Theft Protection with ₫66,926,626 excess</li>
                                                        <li>Unlimited mileage</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="group-collapse-expand">
                                            <button className={isAccordion == 3 ? "btn btn-collapse collapsed" : "btn btn-collapse"} type="button" data-bs-toggle="collapse" data-bs-target="#collapseQuestion" aria-expanded="false" aria-controls="collapseQuestion" onClick={() => handleAccordion(3)}>
                                                <h6>Question Answers</h6>
                                                <svg width={12} height={7} viewBox="0 0 12 7" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M1 1L6 6L11 1" stroke="" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                </svg>
                                            </button>
                                            <div className={isAccordion == 3 ? "collapse" : "collapse show"} id="collapseQuestion">
                                                <div className="card card-body">
                                                    <div className="list-questions">
                                                        <div className="item-question">
                                                            <div className="head-question">
                                                                <p className="text-md-bold neutral-1000">Is The High Roller suitable for all ages?</p>
                                                            </div>
                                                            <div className="content-question">
                                                                <p className="text-sm-medium neutral-800">Absolutely! The High Roller offers a family-friendly experience suitable for visitors of all ages. Children must be accompanied by an adult.</p>
                                                            </div>
                                                        </div>
                                                        <div className="item-question active">
                                                            <div className="head-question">
                                                                <p className="text-md-bold neutral-1000">Can I bring food or drinks aboard The High Roller?</p>
                                                            </div>
                                                            <div className="content-question">
                                                                <p className="text-sm-medium neutral-800">Outside food and beverages are not permitted on The High Roller. However, there are nearby dining options at The LINQ Promenade where you can enjoy a meal before or after your ride.</p>
                                                            </div>
                                                        </div>
                                                        <div className="item-question">
                                                            <div className="head-question">
                                                                <p className="text-md-bold neutral-1000">Is The High Roller wheelchair accessible?</p>
                                                            </div>
                                                            <div className="content-question">
                                                                <p className="text-sm-medium neutral-800">es, The High Roller cabins are wheelchair accessible, making it possible for everyone to enjoy the breathtaking views of Las Vegas.</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="group-collapse-expand">
                                            <button className={isAccordion == 4 ? "btn btn-collapse collapsed" : "btn btn-collapse"} type="button" data-bs-toggle="collapse" data-bs-target="#collapseReviews" aria-expanded="false" aria-controls="collapseReviews" onClick={() => handleAccordion(4)}>
                                                <h6>Rate Reviews</h6>
                                                <svg width={12} height={7} viewBox="0 0 12 7" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M1 1L6 6L11 1" stroke="" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                </svg>
                                            </button>
                                            <div className={isAccordion == 4 ? "collapse" : "collapse show"} id="collapseReviews">
                                                <div className="card card-body">
                                                    <div className="head-reviews">
                                                        <div className="review-left">
                                                            <div className="review-info-inner">
                                                                <h6 className="neutral-1000">4.95 / 5</h6>
                                                                <p className="text-sm-medium neutral-400">(672 reviews)</p>
                                                                <div className="review-rate">
                                                                    {" "}
                                                                    <img src="/assets/imgs/page/tour-detail/star.svg" alt="Travila" />
                                                                    <img src="/assets/imgs/page/tour-detail/star.svg" alt="Travila" />
                                                                    <img src="/assets/imgs/page/tour-detail/star.svg" alt="Travila" />
                                                                    <img src="/assets/imgs/page/tour-detail/star.svg" alt="Travila" />
                                                                    <img src="/assets/imgs/page/tour-detail/star.svg" alt="Travila" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="review-right">
                                                            <div className="review-progress">
                                                                <div className="item-review-progress">
                                                                    <div className="text-rv-progress">
                                                                        <p className="text-sm-bold">Price</p>
                                                                    </div>
                                                                    <div className="bar-rv-progress">
                                                                        <div className="progress">
                                                                            <div className="progress-bar" style={{ width: "90%" }}>
                                                                                {" "}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-avarage">
                                                                        <p>4.8/5</p>
                                                                    </div>
                                                                </div>
                                                                <div className="item-review-progress">
                                                                    <div className="text-rv-progress">
                                                                        <p className="text-sm-bold">Service</p>
                                                                    </div>
                                                                    <div className="bar-rv-progress">
                                                                        <div className="progress">
                                                                            <div className="progress-bar" style={{ width: "90%" }}>
                                                                                {" "}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-avarage">
                                                                        <p>4.2/5</p>
                                                                    </div>
                                                                </div>
                                                                <div className="item-review-progress">
                                                                    <div className="text-rv-progress">
                                                                        <p className="text-sm-bold">Safety</p>
                                                                    </div>
                                                                    <div className="bar-rv-progress">
                                                                        <div className="progress">
                                                                            <div className="progress-bar" style={{ width: "95%" }}>
                                                                                {" "}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-avarage">
                                                                        <p>4.9/5</p>
                                                                    </div>
                                                                </div>
                                                                <div className="item-review-progress">
                                                                    <div className="text-rv-progress">
                                                                        <p className="text-sm-bold">Entertainment</p>
                                                                    </div>
                                                                    <div className="bar-rv-progress">
                                                                        <div className="progress">
                                                                            <div className="progress-bar" style={{ width: "85%" }}>
                                                                                {" "}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-avarage">
                                                                        <p>4.7/5</p>
                                                                    </div>
                                                                </div>
                                                                <div className="item-review-progress">
                                                                    <div className="text-rv-progress">
                                                                        <p className="text-sm-bold">Accessibility</p>
                                                                    </div>
                                                                    <div className="bar-rv-progress">
                                                                        <div className="progress">
                                                                            <div className="progress-bar" style={{ width: "100%" }}>
                                                                                {" "}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-avarage">
                                                                        <p>5/5</p>
                                                                    </div>
                                                                </div>
                                                                <div className="item-review-progress">
                                                                    <div className="text-rv-progress">
                                                                        <p className="text-sm-bold">Support</p>
                                                                    </div>
                                                                    <div className="bar-rv-progress">
                                                                        <div className="progress">
                                                                            <div className="progress-bar" style={{ width: "100%" }} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-avarage">
                                                                        <p>5/5</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="list-reviews">
                                                        <div className="item-review">
                                                            <div className="head-review">
                                                                <div className="author-review">
                                                                    {" "}
                                                                    <img src="/assets/imgs/page/tour-detail/avatar.png" alt="Travila" />
                                                                    <div className="author-info">
                                                                        <p className="text-lg-bold">Sarah Johnson</p>
                                                                        <p className="text-sm-medium neutral-500">December 4, 2024 at 3:12 pm</p>
                                                                    </div>
                                                                </div>
                                                                <div className="rate-review">
                                                                    {" "}
                                                                    <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                    <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                    <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                    <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                    <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                </div>
                                                            </div>
                                                            <div className="content-review">
                                                                <p className="text-sm-medium neutral-800">The views from The High Roller were absolutely stunning! It's a fantastic way to see the Strip and the surrounding area. The cabins are spacious and comfortable, and the audio commentary adds an extra layer of enjoyment. Highly recommend!</p>
                                                            </div>
                                                        </div>
                                                        <div className="item-review">
                                                            <div className="head-review">
                                                                <div className="author-review">
                                                                    {" "}
                                                                    <img src="/assets/imgs/page/tour-detail/avatar.png" alt="Travila" />
                                                                    <div className="author-info">
                                                                        <p className="text-lg-bold">Sarah Johnson</p>
                                                                        <p className="text-sm-medium neutral-500">December 4, 2024 at 3:12 pm</p>
                                                                    </div>
                                                                </div>
                                                                <div className="rate-review">
                                                                    {" "}
                                                                    <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                    <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                    <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                    <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                    <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                </div>
                                                            </div>
                                                            <div className="content-review">
                                                                <p className="text-sm-medium neutral-800">The views from The High Roller were absolutely stunning! It's a fantastic way to see the Strip and the surrounding area. The cabins are spacious and comfortable, and the audio commentary adds an extra layer of enjoyment. Highly recommend!</p>
                                                            </div>
                                                        </div>
                                                        <div className="item-review">
                                                            <div className="head-review">
                                                                <div className="author-review">
                                                                    {" "}
                                                                    <img src="/assets/imgs/page/tour-detail/avatar.png" alt="Travila" />
                                                                    <div className="author-info">
                                                                        <p className="text-lg-bold">Sarah Johnson</p>
                                                                        <p className="text-sm-medium neutral-500">December 4, 2024 at 3:12 pm</p>
                                                                    </div>
                                                                </div>
                                                                <div className="rate-review">
                                                                    {" "}
                                                                    <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                    <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                    <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                    <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                    <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                </div>
                                                            </div>
                                                            <div className="content-review">
                                                                <p className="text-sm-medium neutral-800">The views from The High Roller were absolutely stunning! It's a fantastic way to see the Strip and the surrounding area. The cabins are spacious and comfortable, and the audio commentary adds an extra layer of enjoyment. Highly recommend!</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <nav aria-label="Page navigation example">
                                                        <ul className="pagination">
                                                            <li className="page-item">
                                                                <Link className="page-link" href="#" aria-label="Previous">
                                                                    <span aria-hidden="true">
                                                                        <svg width={12} height={12} viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
                                                                            <path d="M6.00016 1.33325L1.3335 5.99992M1.3335 5.99992L6.00016 10.6666M1.3335 5.99992H10.6668" strokeLinecap="round" strokeLinejoin="round" />
                                                                        </svg>
                                                                    </span>
                                                                </Link>
                                                            </li>
                                                            <li className="page-item">
                                                                <Link className="page-link" href="#">
                                                                    1
                                                                </Link>
                                                            </li>
                                                            <li className="page-item">
                                                                <Link className="page-link active" href="#">
                                                                    2
                                                                </Link>
                                                            </li>
                                                            <li className="page-item">
                                                                <Link className="page-link" href="#">
                                                                    3
                                                                </Link>
                                                            </li>
                                                            <li className="page-item">
                                                                <Link className="page-link" href="#">
                                                                    4
                                                                </Link>
                                                            </li>
                                                            <li className="page-item">
                                                                <Link className="page-link" href="#">
                                                                    5
                                                                </Link>
                                                            </li>
                                                            <li className="page-item">
                                                                <Link className="page-link" href="#">
                                                                    ...
                                                                </Link>
                                                            </li>
                                                            <li className="page-item">
                                                                <Link className="page-link" href="#" aria-label="Next">
                                                                    <span aria-hidden="true">
                                                                        <svg width={12} height={12} viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
                                                                            <path d="M5.99967 10.6666L10.6663 5.99992L5.99968 1.33325M10.6663 5.99992L1.33301 5.99992" strokeLinecap="round" strokeLinejoin="round" />
                                                                        </svg>
                                                                    </span>
                                                                </Link>
                                                            </li>
                                                        </ul>
                                                    </nav>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="group-collapse-expand">
                                            <button className={isAccordion == 5 ? "btn btn-collapse collapsed" : "btn btn-collapse"} type="button" data-bs-toggle="collapse" data-bs-target="#collapseAddReview" aria-expanded="false" aria-controls="collapseAddReview" onClick={() => handleAccordion(5)}>
                                                <h6>Add a review</h6>
                                                <svg width={12} height={7} viewBox="0 0 12 7" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M1 1L6 6L11 1" stroke="" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                </svg>
                                            </button>
                                            <div className={isAccordion == 5 ? "collapse" : "collapse show"} id="collapseAddReview">
                                                <div className="card card-body">
                                                    <div className="box-type-reviews">
                                                        <div className="row">
                                                            <div className="col-lg-4">
                                                                <div className="box-type-review">
                                                                    <p className="text-sm-bold text-type-rv">Price</p>
                                                                    <p className="rate-type-review">
                                                                        {" "}
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                    </p>
                                                                </div>
                                                                <div className="box-type-review">
                                                                    <p className="text-sm-bold text-type-rv">Service</p>
                                                                    <p className="rate-type-review">
                                                                        {" "}
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="col-lg-4">
                                                                <div className="box-type-review">
                                                                    <p className="text-sm-bold text-type-rv">Safety</p>
                                                                    <p className="rate-type-review">
                                                                        {" "}
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                    </p>
                                                                </div>
                                                                <div className="box-type-review">
                                                                    <p className="text-sm-bold text-type-rv">Entertainment</p>
                                                                    <p className="rate-type-review">
                                                                        {" "}
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="col-lg-4">
                                                                <div className="box-type-review">
                                                                    <p className="text-sm-bold text-type-rv">Accessibility</p>
                                                                    <p className="rate-type-review">
                                                                        {" "}
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                    </p>
                                                                </div>
                                                                <div className="box-type-review">
                                                                    <p className="text-sm-bold text-type-rv">Support</p>
                                                                    <p className="rate-type-review">
                                                                        {" "}
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                        <img src="/assets/imgs/page/tour-detail/star-big.svg" alt="Travila" />
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="box-form-reviews">
                                                        <h6 className="text-md-bold neutral-1000 mb-15">Leave feedback</h6>
                                                        <div className="row">
                                                            <div className="col-md-6">
                                                                <div className="form-group">
                                                                    <input className="form-control" type="text" placeholder="Your name" />
                                                                </div>
                                                            </div>
                                                            <div className="col-md-6">
                                                                <div className="form-group">
                                                                    <input className="form-control" type="text" placeholder="Email address" />
                                                                </div>
                                                            </div>
                                                            <div className="col-md-12">
                                                                <div className="form-group">
                                                                    <textarea className="form-control" placeholder="Your comment" defaultValue={""} />
                                                                </div>
                                                            </div>
                                                            <div className="col-md-12">
                                                                <button className="btn btn-black-lg-square">
                                                                    Submit review
                                                                    <svg width={16} height={16} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                                                        <path d="M8 15L15 8L8 1M15 8L1 8" stroke="" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-lg-4">
                                    <div className="sidebar-banner">
                                        <div className="p-4 background-body border rounded-3">
                                            <p className="text-xl-bold neutral-1000 mb-4">Get Started</p>
                                            <Link href="#" className="btn btn-primary w-100 rounded-3 py-3 mb-3">
                                                Schedule Test Drive
                                                <svg width={17} height={16} viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M8.5 15L15.5 8L8.5 1M15.5 8L1.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </Link>
                                            <Link href="#" className="btn btn-book bg-2">
                                                Make An Offer Price
                                                <svg width={17} height={16} viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M8.5 15L15.5 8L8.5 1M15.5 8L1.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="booking-form">
                                        <div className="head-booking-form">
                                            <p className="text-xl-bold neutral-1000">Rent This Vehicle</p>
                                        </div>
                                        <div className="content-booking-form">
                                            <div className="item-line-booking border-bottom-0 pb-0">
                                                <strong className="text-md-bold neutral-1000">Pick-Up</strong>
                                                <div className="input-calendar">
                                                    <MyDatePicker form />
                                                    <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path
                                                            d="M14.5312 1.3828H13.8595V0.703125C13.8595 0.314789 13.5448 0 13.1564 0C12.7681 0 12.4533 0.314789 12.4533 0.703125V1.3828H5.55469V0.703125C5.55469 0.314789 5.2399 0 4.85156 0C4.46323 0 4.14844 0.314789 4.14844 0.703125V1.3828H3.47678C1.55967 1.3828 0 2.94247 0 4.85954V14.5232C0 16.4403 1.55967 18 3.47678 18H14.5313C16.4483 18 18.008 16.4403 18.008 14.5232V4.85954C18.008 2.94247 16.4483 1.3828 14.5312 1.3828ZM3.47678 2.78905H4.14844V4.16014C4.14844 4.54848 4.46323 4.86327 4.85156 4.86327C5.2399 4.86327 5.55469 4.54848 5.55469 4.16014V2.78905H12.4533V4.16014C12.4533 4.54848 12.7681 4.86327 13.1565 4.86327C13.5448 4.86327 13.8596 4.54848 13.8596 4.16014V2.78905H14.5313C15.6729 2.78905 16.6018 3.71788 16.6018 4.85954V5.53124H1.40625V4.85954C1.40625 3.71788 2.33508 2.78905 3.47678 2.78905ZM14.5312 16.5938H3.47678C2.33508 16.5938 1.40625 15.6649 1.40625 14.5232V6.93749H16.6018V14.5232C16.6018 15.6649 15.6729 16.5938 14.5312 16.5938ZM6.24611 9.70312C6.24611 10.0915 5.93132 10.4062 5.54298 10.4062H4.16018C3.77184 10.4062 3.45705 10.0915 3.45705 9.70312C3.45705 9.31479 3.77184 9 4.16018 9H5.54298C5.93128 9 6.24611 9.31479 6.24611 9.70312ZM14.551 9.70312C14.551 10.0915 14.2362 10.4062 13.8479 10.4062H12.4651C12.0767 10.4062 11.7619 10.0915 11.7619 9.70312C11.7619 9.31479 12.0767 9 12.4651 9H13.8479C14.2362 9 14.551 9.31479 14.551 9.70312ZM10.3945 9.70312C10.3945 10.0915 10.0798 10.4062 9.69142 10.4062H8.30862C7.92028 10.4062 7.60549 10.0915 7.60549 9.70312C7.60549 9.31479 7.92028 9 8.30862 9H9.69142C10.0797 9 10.3945 9.31479 10.3945 9.70312ZM6.24611 13.8516C6.24611 14.2399 5.93132 14.5547 5.54298 14.5547H4.16018C3.77184 14.5547 3.45705 14.2399 3.45705 13.8516C3.45705 13.4632 3.77184 13.1484 4.16018 13.1484H5.54298C5.93128 13.1484 6.24611 13.4632 6.24611 13.8516ZM14.551 13.8516C14.551 14.2399 14.2362 14.5547 13.8479 14.5547H12.4651C12.0767 14.5547 11.7619 14.2399 11.7619 13.8516C11.7619 13.4632 12.0767 13.1484 12.4651 13.1484H13.8479C14.2362 13.1484 14.551 13.4632 14.551 13.8516ZM10.3945 13.8516C10.3945 14.2399 10.0798 14.5547 9.69142 14.5547H8.30862C7.92028 14.5547 7.60549 14.2399 7.60549 13.8516C7.60549 13.4632 7.92028 13.1484 8.30862 13.1484H9.69142C10.0797 13.1484 10.3945 13.4632 10.3945 13.8516Z"
                                                            fill="currentColor"
                                                        />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="item-line-booking">
                                                <strong className="text-md-bold neutral-1000">Drop-Off</strong>
                                                <div className="input-calendar">
                                                    <MyDatePicker form />
                                                    <svg width={18} height={18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path
                                                            d="M14.5312 1.3828H13.8595V0.703125C13.8595 0.314789 13.5448 0 13.1564 0C12.7681 0 12.4533 0.314789 12.4533 0.703125V1.3828H5.55469V0.703125C5.55469 0.314789 5.2399 0 4.85156 0C4.46323 0 4.14844 0.314789 4.14844 0.703125V1.3828H3.47678C1.55967 1.3828 0 2.94247 0 4.85954V14.5232C0 16.4403 1.55967 18 3.47678 18H14.5313C16.4483 18 18.008 16.4403 18.008 14.5232V4.85954C18.008 2.94247 16.4483 1.3828 14.5312 1.3828ZM3.47678 2.78905H4.14844V4.16014C4.14844 4.54848 4.46323 4.86327 4.85156 4.86327C5.2399 4.86327 5.55469 4.54848 5.55469 4.16014V2.78905H12.4533V4.16014C12.4533 4.54848 12.7681 4.86327 13.1565 4.86327C13.5448 4.86327 13.8596 4.54848 13.8596 4.16014V2.78905H14.5313C15.6729 2.78905 16.6018 3.71788 16.6018 4.85954V5.53124H1.40625V4.85954C1.40625 3.71788 2.33508 2.78905 3.47678 2.78905ZM14.5312 16.5938H3.47678C2.33508 16.5938 1.40625 15.6649 1.40625 14.5232V6.93749H16.6018V14.5232C16.6018 15.6649 15.6729 16.5938 14.5312 16.5938ZM6.24611 9.70312C6.24611 10.0915 5.93132 10.4062 5.54298 10.4062H4.16018C3.77184 10.4062 3.45705 10.0915 3.45705 9.70312C3.45705 9.31479 3.77184 9 4.16018 9H5.54298C5.93128 9 6.24611 9.31479 6.24611 9.70312ZM14.551 9.70312C14.551 10.0915 14.2362 10.4062 13.8479 10.4062H12.4651C12.0767 10.4062 11.7619 10.0915 11.7619 9.70312C11.7619 9.31479 12.0767 9 12.4651 9H13.8479C14.2362 9 14.551 9.31479 14.551 9.70312ZM10.3945 9.70312C10.3945 10.0915 10.0798 10.4062 9.69142 10.4062H8.30862C7.92028 10.4062 7.60549 10.0915 7.60549 9.70312C7.60549 9.31479 7.92028 9 8.30862 9H9.69142C10.0797 9 10.3945 9.31479 10.3945 9.70312ZM6.24611 13.8516C6.24611 14.2399 5.93132 14.5547 5.54298 14.5547H4.16018C3.77184 14.5547 3.45705 14.2399 3.45705 13.8516C3.45705 13.4632 3.77184 13.1484 4.16018 13.1484H5.54298C5.93128 13.1484 6.24611 13.4632 6.24611 13.8516ZM14.551 13.8516C14.551 14.2399 14.2362 14.5547 13.8479 14.5547H12.4651C12.0767 14.5547 11.7619 14.2399 11.7619 13.8516C11.7619 13.4632 12.0767 13.1484 12.4651 13.1484H13.8479C14.2362 13.1484 14.551 13.4632 14.551 13.8516ZM10.3945 13.8516C10.3945 14.2399 10.0798 14.5547 9.69142 14.5547H8.30862C7.92028 14.5547 7.60549 14.2399 7.60549 13.8516C7.60549 13.4632 7.92028 13.1484 8.30862 13.1484H9.69142C10.0797 13.1484 10.3945 13.4632 10.3945 13.8516Z"
                                                            fill="currentColor"
                                                        />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="item-line-booking">
                                                <div className="box-tickets">
                                                    <strong className="text-md-bold neutral-1000">Add Extra:</strong>
                                                    <div className="line-booking-tickets">
                                                        <div className="item-ticket">
                                                            <ul className="list-filter-checkbox">
                                                                <li>
                                                                    <label className="cb-container">
                                                                        {" "}
                                                                        <input type="checkbox" />
                                                                        <span className="text-md-medium">GPS Navigation System </span>
                                                                        <span className="checkmark" />{" "}
                                                                    </label>
                                                                </li>
                                                            </ul>
                                                        </div>
                                                        <div className="include-price">
                                                            <p className="text-md-bold neutral-1000">$25.00</p>
                                                        </div>
                                                    </div>
                                                    <div className="line-booking-tickets">
                                                        <div className="item-ticket">
                                                            <ul className="list-filter-checkbox">
                                                                <li>
                                                                    <label className="cb-container">
                                                                        {" "}
                                                                        <input type="checkbox" />
                                                                        <span className="text-md-medium">Child Seat </span>
                                                                        <span className="checkmark" />{" "}
                                                                    </label>
                                                                </li>
                                                            </ul>
                                                        </div>
                                                        <div className="include-price">
                                                            <p className="text-md-bold neutral-1000">$32.00</p>
                                                        </div>
                                                    </div>
                                                    <div className="line-booking-tickets">
                                                        <div className="item-ticket">
                                                            <ul className="list-filter-checkbox">
                                                                <li>
                                                                    <label className="cb-container">
                                                                        {" "}
                                                                        <input type="checkbox" />
                                                                        <span className="text-md-medium">Additional Driver </span>
                                                                        <span className="checkmark" />{" "}
                                                                    </label>
                                                                </li>
                                                            </ul>
                                                        </div>
                                                        <div className="include-price">
                                                            <p className="text-md-bold neutral-1000">$25.00</p>
                                                        </div>
                                                    </div>
                                                    <div className="line-booking-tickets">
                                                        <div className="item-ticket">
                                                            <ul className="list-filter-checkbox">
                                                                <li>
                                                                    <label className="cb-container">
                                                                        {" "}
                                                                        <input type="checkbox" />
                                                                        <span className="text-md-medium">Insurance Coverage </span>
                                                                        <span className="checkmark" />{" "}
                                                                    </label>
                                                                </li>
                                                            </ul>
                                                        </div>
                                                        <div className="include-price">
                                                            <p className="text-md-bold neutral-1000">$52.00</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="item-line-booking last-item pb-0">
                                                <strong className="text-md-medium neutral-1000">Subtotal</strong>
                                                <div className="line-booking-right">
                                                    <p className="text-xl-bold neutral-1000">$124.00</p>
                                                </div>
                                            </div>
                                            <div className="item-line-booking last-item pb-0">
                                                <strong className="text-md-medium neutral-1000">Sale discount</strong>
                                                <div className="line-booking-right">
                                                    <p className="text-xl-bold neutral-1000">$124.00</p>
                                                </div>
                                            </div>
                                            <div className="item-line-booking last-item">
                                                <strong className="text-md-bold neutral-1000">Total Payable</strong>
                                                <div className="line-booking-right">
                                                    <p className="text-xl-bold neutral-1000">$124.00</p>
                                                </div>
                                            </div>
                                            <div className="box-button-book">
                                                <Link className="btn btn-book" href="#">
                                                    Book Now
                                                    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M8 15L15 8L8 1M15 8L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </Link>
                                            </div>
                                            <div className="box-need-help">
                                                <Link href="#">
                                                    <svg width={12} height={14} viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M2.83366 3.66667C2.83366 1.92067 4.25433 0.5 6.00033 0.5C7.74633 0.5 9.16699 1.92067 9.16699 3.66667C9.16699 5.41267 7.74633 6.83333 6.00033 6.83333C4.25433 6.83333 2.83366 5.41267 2.83366 3.66667ZM8.00033 7.83333H4.00033C1.88699 7.83333 0.166992 9.55333 0.166992 11.6667C0.166992 12.678 0.988992 13.5 2.00033 13.5H10.0003C11.0117 13.5 11.8337 12.678 11.8337 11.6667C11.8337 9.55333 10.1137 7.83333 8.00033 7.83333Z" fill="currentColor" />
                                                    </svg>
                                                    Need some help?
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="sidebar-left border-1 background-card">
                                        <h6 className="text-xl-bold neutral-1000">Listed by</h6>
                                        <div className="box-sidebar-content">
                                            <div className="box-agent-support border-bottom pb-3 mb-3">
                                                <div className="card-author">
                                                    <div className="me-2">
                                                        <img src="/assets/imgs/template/icons/car-1.png" alt="Carento" />
                                                    </div>
                                                    <div className="card-author-info">
                                                        <p className="text-lg-bold neutral-1000">Emily Rose</p>
                                                        <p className="text-sm-medium neutral-500">Las Vegas, USA</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="box-info-contact">
                                                <p className="text-md-medium mobile-phone neutral-1000">
                                                    <span className="text-md-bold">Mobile:</span> 1-222-333-4444
                                                </p>
                                                <p className="text-md-medium email neutral-1000">
                                                    <span className="text-md-bold">Email:</span> emily-rose@gmail.com
                                                </p>
                                                <p className="text-md-medium whatsapp neutral-1000">
                                                    <span className="text-md-bold">WhatsApp:</span> 1-222-333-4444
                                                </p>
                                                <p className="text-md-medium fax neutral-1000">
                                                    <span className="text-md-bold">Fax:</span> 1-222-333-4444
                                                </p>
                                            </div>
                                            <div className="box-link-bottom">
                                                <Link className="btn btn-primary py-3 w-100 rounded-3" href="#">
                                                    All items by this dealer
                                                    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M8 15L15 8L8 1M15 8L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="background-100 pt-55 pb-55 mt-100">
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
                    <ModalVideo channel="youtube" isOpen={isOpen} videoId="AOg61RB75Ho" onClose={() => setOpen(false)} />
                </div>
            </Layout>
        </>
    );
}
