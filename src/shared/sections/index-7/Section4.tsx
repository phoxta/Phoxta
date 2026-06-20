import { Link } from "react-router-dom";
import RevealText from "@/shared/effects/RevealText";

{/* Home 7 Section 4 — Our mission / dual-tone reveal headline / locations */}

const EYEBROW_ARROW_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="13" viewBox="0 0 14 13" fill="none" aria-hidden="true">
        <path d="M11.0037 3.41421L2.39712 12.0208L0.98291 10.6066L9.5895 2H2.00373V0H13.0037V11H11.0037V3.41421Z" fill="currentColor" />
    </svg>
);

const CTA_CIRCLE_SVG = (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 17L17 7M17 7H9M17 7V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default function Section4() {
    return (
        <div className="sec-4-home-7 bg-neutral-50 pt-120 pb-120">
            <div className="container-2200 px-lg-5 px-3">
                <div className="row g-4 g-xl-5 align-items-start">
                    <div className="col-xl-3 col-lg-4 col-12">
                        <div className="sec-4-home-7__eyebrow d-inline-flex align-items-center gap-2 mb-4 text-uppercase">
                            <span className="text-scramble" data-scramble-text="Our mission">Our mission</span>
                            {EYEBROW_ARROW_SVG}
                        </div>
                        <div className="sec-4-home-7__frame overflow-hidden mt-4 at-hover-parallax" data-parallax-strength="18" data-parallax-scale="1.05">
                            <img
                                className="sec-4-home-7__img fix anim-zoomin"
                                src="/assets/imgs/pages/home-7/sec-4-helmet.webp"
                                alt="phoxta"
                                width={377}
                                height={471}
                                loading="lazy"
                                decoding="async"
                            />
                        </div>
                    </div>
                    <div className="col-xl-9 col-lg-8 col-12">
                        <h2 className="sec-4-home-7__title mb-4 mb-lg-5">
                            <span className="reveal-text sec-4-home-7__title-part sec-4-home-7__title-part--950"><RevealText>More than a course, we're a community — guiding you from your first idea to your first customers with curriculum, mentors and peers.</RevealText></span>
                        </h2>
                        <div className="sec-4-home-7__cta d-inline-flex align-items-stretch mb-60 at_fade_anim">
                            <Link to="/contact" className="at-btn sec-4-home-7__cta-btn text-capitalize">
                                <span>
                                    <span className="text-1">Join the school</span>
                                    <span className="text-2">Join the school</span>
                                </span>
                            </Link>
                            <Link to="/contact" className="sec-4-home-7__cta-circle d-inline-flex align-items-center justify-content-center text-white" aria-label="Join the school">
                                {CTA_CIRCLE_SVG}
                            </Link>
                        </div>
                        <div className="sec-4-home-7__locations row g-4 g-lg-5">
                            <div className="col-lg-6 col-12">
                                <div className="d-flex gap-4">
                                    <div className="sec-4-home-7__pin flex-shrink-0" aria-hidden="true">
                                        <img src="/assets/imgs/pages/home-7/sec-4-pin-icon.svg" width={40} height={40} alt="" loading="lazy" />
                                    </div>
                                    <div className="flex-grow-1 min-w-0">
                                        <h3 className="sec-4-home-7__loc-title h6 mb-3 at-char-animation">Find us online</h3>
                                        <div className="sec-4-home-7__loc-body at_fade_anim">
                                            <p className="mb-2">Phoxta Startup School is fully online.<br />Learn from anywhere, at your own pace.</p>
                                            <p className="mb-2">
                                                Support:{" "}
                                                <Link to="/contact" className="sec-4-home-7__loc-strong">Contact us</Link>
                                            </p>
                                            <p className="mb-0">
                                                Email:{" "}
                                                <a href="mailto:hello@phoxta.com" className="sec-4-home-7__loc-strong">hello@phoxta.com</a>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-6 col-12">
                                <div className="sec-4-home-7__loc-body sec-4-home-7__loc-body--solo ps-lg-4 at_fade_anim">
                                    <p className="mb-2">Questions before you enroll?<br />Reach out — we&rsquo;re happy to help you get started.</p>
                                    <p className="mb-2">
                                        Sales:{" "}
                                        <Link to="/contact" className="sec-4-home-7__loc-strong">Talk to us</Link>
                                    </p>
                                    <p className="mb-0">
                                        Email:{" "}
                                        <a href="mailto:hello@phoxta.com" className="sec-4-home-7__loc-strong">hello@phoxta.com</a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
