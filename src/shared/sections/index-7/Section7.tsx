import { Link } from "react-router-dom";
import RevealText from "@/shared/effects/RevealText";

{/* Home 7 Section 7 (CTA — Ready to Build the Future?) */}

const FEATURES = [
    { text: "Pre-validated businesses", delay: "0.1" },
    { text: "Launch in days, not years", delay: "0.2" },
    { text: "AI runs the operations", delay: "0.3" },
    { text: "Playbooks & founder network", delay: "0.4" },
];

export default function Section7() {
    return (
        <div className="sec-7-home-7 overflow-hidden py-4">
            <div className="container-2200 px-lg-5 px-3 py-120">
                <div className="row align-items-center g-4 g-xxl-5">
                    {/* Left: Image block */}
                    <div className="col-xxl-5 col-xl-6 col-12">
                        <div className="sec-7-home-7__media">
                            <div className="fix anim-zoomin">
                                <img
                                    src="/assets/imgs/pages/home-7/sec-7-photo.webp"
                                    alt="phoxta"
                                    width={798}
                                    height={798}
                                    loading="lazy"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right: Content */}
                    <div className="col-xxl-7 col-xl-6 col-12">
                        <div className="sec-7-home-7__content ms-xxl-4">
                            <div className="sec-7-home-7__eyebrow d-inline-flex align-items-center gap-2 mb-3 text-uppercase">
                                <span className="text-scramble" data-scramble-text="Ready to Build the Future ?">Ready to Build the Future ?</span>
                                <img
                                    className="sec-7-home-7__eyebrow-icon"
                                    src="/assets/imgs/pages/home-7/sec-7-eyebrow-arrow.svg"
                                    alt=""
                                    width={14}
                                    height={13} loading="lazy" />
                            </div>

                            <p className="sec-7-home-7__headline mb-4 mb-lg-40 reveal-text">
                                <RevealText>
                                    Stop building from scratch, start owning. Whether you&apos;re exploring your first business or scaling a portfolio, Phoxta gets you running fast.
                                </RevealText>
                            </p>

                            <ul className="sec-7-home-7__features list-unstyled mb-4 mb-lg-60">
                                {FEATURES.map((feature, i) => (
                                    <li key={i} className="sec-7-home-7__feature at_fade_anim" data-delay={feature.delay}>
                                        <img
                                            src="/assets/imgs/pages/home-7/sec-7-plus.svg"
                                            alt=""
                                            width={18}
                                            height={18}
                                            aria-hidden="true" loading="lazy" />
                                        <span>{feature.text}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="sec-7-home-7__cta d-inline-flex align-items-stretch at_fade_anim">
                                <Link to="/auth" className="at-btn sec-7-home-7__cta-btn">
                                    <span>
                                        <span className="text-1">Get started</span>
                                        <span className="text-2">Get started</span>
                                    </span>
                                </Link>
                                <Link to="/auth" className="sec-7-home-7__cta-circle" aria-label="Get started">
                                    <img
                                        src="/assets/imgs/pages/home-7/sec-7-btn-arrow.svg"
                                        alt=""
                                        width={24}
                                        height={24}
                                        aria-hidden="true" loading="lazy" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Decorative rotating star */}
            <div className="sec-7-home-7__star" aria-hidden="true">
                <img src="/assets/imgs/pages/home-7/sec-7-rotating.svg" alt="" width={100} height={100} loading="lazy" />
            </div>
        </div>
    );
}
