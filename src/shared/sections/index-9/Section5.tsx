import { Link } from "react-router-dom";
function LongArrowRight() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="15" viewBox="0 0 16 15" fill="none">
            <path d="M0.0001297 8.99993L0 3.00407e-05L2 0L2.0001 6.99993L12.1719 7.00003L8.22224 3.05027L9.63644 1.63606L16.0003 8.00003L9.63644 14.364L8.22224 12.9497L12.1719 9.00003L0.0001297 8.99993Z" fill="currentColor" />
        </svg>
    );
}

export default function Section5() {
    return (
        <>
            {/* home-9 section 5 - Contact / marquee */}
            <section className="sec-5-home-9 position-relative overflow-x-hidden changeless">
                <div className="sec-5-home-9__bg" aria-hidden="true">
                    <img
                        className="sec-5-home-9__bg-img"
                        src="/assets/imgs/pages/home-9/sec-5-img-1.webp"
                        alt="phoxta"
                        width={1024}
                        height={512}
                        loading="lazy"
                    />
                </div>

                <div className="sec-5-home-9__container">
                    <div className="row g-4 g-xl-5 justify-content-between sec-5-home-9__meta">
                        <div className="col-md-4 col-xl-3 at_fade_anim" data-delay="0.1">
                            <div className="sec-5-home-9__block">
                                <p className="sec-5-home-9__label text-white">Online</p>
                                <p className="sec-5-home-9__value text-white">
                                    Phoxta is a remote brand studio.<br />
                                    We work with clients worldwide.
                                </p>
                            </div>
                        </div>
                        <div className="col-md-4 col-xl-3 at_fade_anim" data-delay="0.2">
                            <div className="sec-5-home-9__block">
                                <p className="sec-5-home-9__label text-white">Support</p>
                                <div className="sec-5-home-9__value sec-5-home-9__value--stack">
                                    <p className="mb-0 text-white">Live chat &amp; email</p>
                                    <p className="mb-0 text-white">7 days a week</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4 col-xl-3 at_fade_anim" data-delay="0.3">
                            <div className="sec-5-home-9__block">
                                <p className="sec-5-home-9__label text-white">Message</p>
                                <p className="sec-5-home-9__value mb-0 text-white">
                                    <a className="sec-5-home-9__mailto text-white" href="mailto:hello@phoxta.com">hello@phoxta.com</a>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="sec-5-home-9__marquee-shell">
                        <div className="at-marquee sec-5-home-9__marquee at_fade_anim" data-delay=".1">
                            <div className="at-marquee__track sec-5-home-9__marquee-track">
                                <div className="at-marquee__group sec-5-home-9__marquee-group">
                                    <span className="sec-5-home-9__marquee-text">Distinctive brands, crafted with care</span>
                                    <span className="sec-5-home-9__marquee-sep" aria-hidden="true">&nbsp;&mdash;&nbsp;</span>
                                </div>
                                <div className="at-marquee__group sec-5-home-9__marquee-group" aria-hidden="true">
                                    <span className="sec-5-home-9__marquee-text">Distinctive brands, crafted with care</span>
                                    <span className="sec-5-home-9__marquee-sep" aria-hidden="true">&nbsp;&mdash;&nbsp;</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="sec-5-home-9__cta-wrap">
                        <div className="at-btn-group at_fade_anim" data-delay=".4" data-fade-from="bottom" data-ease="bounce">
                            <Link className="at-btn-circle" to="/contact">
                                <LongArrowRight />
                            </Link>
                            <Link className="at-btn z-index-1" to="/contact">Start a project</Link>
                            <Link className="at-btn-circle" to="/contact">
                                <LongArrowRight />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
