import Link from "@/components/common/Link";
import { useState } from "react";
import ModalVideo from "react-modal-video";

export default function CarReview1() {
    const [isOpen, setOpen] = useState(false);
    return (
        <>
            <section className="section-box box-picked background-body">
                <div className="container">
                    <div className="row align-items-end">
                        <div className="col-md-9 mb-30 wow fadeInUp">
                            <h3 className="neutral-1000">Car Review</h3>
                            <p className="text-lg-medium neutral-500">Expert insights and honest evaluations to help you choose the perfect car</p>
                        </div>
                        <div className="col-md-3 mb-30 wow fadeInUp">
                            <div className="d-flex justify-content-center justify-content-md-end">
                                <Link className="btn btn-primary" href="/cars-list-1">
                                    View More
                                    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M8 15L15 8L8 1M15 8L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="box-videos-small mt-0">
                        <div className="bg-video background-2" />
                        <div className="row">
                            <div className="col-lg-7">
                                <div className="card-grid-video wow fadeIn">
                                    <div className="card-image">
                                        <a className="btn btn-play popup-youtube" onClick={() => setOpen(true)}>
                                            {" "}
                                        </a>
                                        <img className="mr-10" src="/assets/imgs/car-review/car-review-1/img-video-1.png" alt="Carento" />
                                    </div>
                                    <div className="card-info">
                                        <h4 className="text-white">Farewell, BMW M2: will this be the last M car of its kind</h4>
                                        <p className="text-md-medium text-white">18 August 2024</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-5">
                                <div className="list-videos-small">
                                    <div className="item-video-small wow fadeIn" data-wow-delay="0.1s">
                                        <div className="item-image">
                                            <a className="btn-play-sm popup-youtube" onClick={() => setOpen(true)}>
                                                {" "}
                                            </a>
                                            <img className="mr-10" src="/assets/imgs/car-review/car-review-1/img-video-2.png" alt="Carento" />
                                        </div>
                                        <div className="item-info">
                                            <Link className="heading-6" href="/cars-details-1">
                                                Best Midsize 3-row SUVs 2024
                                            </Link>
                                            <p className="text-md-medium neutral-500">18 August 2024</p>
                                        </div>
                                    </div>
                                    <div className="item-video-small wow fadeIn" data-wow-delay="0.2s">
                                        <div className="item-image">
                                            <a className="btn-play-sm popup-youtube" onClick={() => setOpen(true)}>
                                                {" "}
                                            </a>
                                            <img className="mr-10" src="/assets/imgs/car-review/car-review-1/img-video-3.png" alt="Carento" />
                                        </div>
                                        <div className="item-info">
                                            <Link className="heading-6" href="/cars-details-1">
                                                5 Best Luxury sport coupes 2024
                                            </Link>
                                            <p className="text-md-medium neutral-500">18 August 2024</p>
                                        </div>
                                    </div>
                                    <div className="item-video-small wow fadeIn" data-wow-delay="0.3s">
                                        <div className="item-image">
                                            <a className="btn-play-sm popup-youtube" onClick={() => setOpen(true)}>
                                                {" "}
                                            </a>
                                            <img className="mr-10" src="/assets/imgs/car-review/car-review-1/img-video-4.png" alt="Carento" />
                                        </div>
                                        <div className="item-info">
                                            <Link className="heading-6" href="/cars-details-1">
                                                Best Small hatchbacks 2024 and 2025
                                            </Link>
                                            <p className="text-md-medium neutral-500">18 August 2024</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <ModalVideo channel="youtube" isOpen={isOpen} videoId="AOg61RB75Ho" onClose={() => setOpen(false)} />
        </>
    );
}
