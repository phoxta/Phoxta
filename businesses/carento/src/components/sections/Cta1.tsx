import Link from "@/components/common/Link";
import { useState } from "react";
import ModalVideo from "react-modal-video";

export default function Cta1() {
    const [isOpen, setOpen] = useState(false);
    return (
        <>
            <section className="box-cta-1 background-100 py-96">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-lg-6 pe-lg-5 wow fadeInUp">
                            <div className="card-video">
                                <div className="card-image">
                                    <a className="btn btn-play popup-youtube" onClick={() => setOpen(true)} />
                                    <img src="/assets/imgs/cta/cta-1/video.png" alt="Carento" />
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-6 mt-lg-0 mt-4">
                            <span className="btn btn-signin bg-white text-dark mb-4 wow fadeInUp">Best Car Rental System</span>
                            <h4 className="mb-4 neutral-1000 wow fadeInUp">Receive a Competitive Offer Sell Your Car to Us Today.</h4>
                            <p className="text-lg-medium neutral-500 mb-4 wow fadeInUp">We are committed to delivering exceptional service, competitive pricing, and a diverse selection of options for our customers.</p>
                            <div className="row">
                                <div className="col-md-6">
                                    <ul className="list-ticks-green">
                                        <li className="neutral-1000 wow fadeInUp" data-wow-delay="0.1s">
                                            Expert Certified Mechanics
                                        </li>
                                        <li className="neutral-1000 wow fadeInUp" data-wow-delay="0.2s">
                                            Get Reasonable Price
                                        </li>
                                        <li className="neutral-1000 wow fadeInUp" data-wow-delay="0.3s">
                                            Genuine Spares Parts
                                        </li>
                                    </ul>
                                </div>
                                <div className="col-md-6">
                                    <ul className="list-ticks-green wow fadeInUp">
                                        <li className="neutral-1000 wow fadeInUp" data-wow-delay="0.1s">
                                            First Class Services
                                        </li>
                                        <li className="neutral-1000 wow fadeInUp" data-wow-delay="0.2s">
                                            24/7 road assistance
                                        </li>
                                        <li className="neutral-1000 wow fadeInUp" data-wow-delay="0.3s">
                                            Free Pick-Up &amp; Drop-Offs
                                        </li>
                                    </ul>
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
