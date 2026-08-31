import { Link } from "react-router-dom";

const AVATARS = [
    { src: "/assets/imgs/template/avatar/avatar-1.webp", alt: "phoxta", zClass: "z-2" },
    { src: "/assets/imgs/template/avatar/avatar-2.webp", alt: "phoxta", zClass: "z-3" },
    { src: "/assets/imgs/template/avatar/avatar-3.webp", alt: "phoxta", zClass: "z-4" },
    { src: "/assets/imgs/template/avatar/avatar-4.webp", alt: "phoxta", zClass: "z-5" },
    { src: "/assets/imgs/template/avatar/avatar-5.webp", alt: "phoxta", zClass: "z-5" },
] as const;

export default function Section2() {
    return (
        <section className="at-about-area pt-10">
            <div className="container">
                <div className="at-about-border mt-20 pt-55">
                    <div className="row">
                        <div className="col-xxl-2 col-lg-3 col-md-7 mb-md-5">
                            <div className="at-about-subtitle-wrap mb-30">
                                <span className="at-about-subtitle">
                                    <br className="d-block" /> Loved by 
                                    <span className="fw-900">entrepreneurs</span> in <span className="fw-900">Canada, UK, USA, UAE and Africa</span>
                                </span>
                            </div>
                            <div className="d-flex align-items-center">
                                <div className="block-author d-flex align-items-center position-relative">
                                    {AVATARS.map((avatar, i) => (
                                        <div key={i} className={`avatar overflow-hidden ${avatar.zClass}`}>
                                            <Link to="#">
                                                <img
                                                    src={avatar.src}
                                                    alt={avatar.alt}
                                                    width={48}
                                                    height={48} loading="lazy" />
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                                <div className="fz-font-md fw-600 text-nowrap">
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-1 col-md-3 col-5 align-self-end ms-auto">
                        </div>
                        <div className="col-lg-8 ms-auto">
                            <div className="at-about-thumb-wrap ml-75">
                                <div className="row gx-80">
                                    <div className="col-lg-6 col-md-6">
                                        <div className="at-about-item anim-zoomin-wrap mb-40">
                                            <div className="mb-35">
                                                <div className="at-about-thumb fix anim-zoomin">
                                                    <img
                                                        data-speed=".8"
                                                        data-delay=".4"
                                                        data-fade-from="bottom"
                                                        data-ease="bounce"
                                                        data-parallax
                                                        data-parallax-speed="0.45"
                                                        data-parallax-range="100"
                                                        src="/assets/imgs/pages/wbd2.jpg"
                                                        alt="phoxta"
                                                        width={600}
                                                        height={450} loading="lazy" />
                                                </div>
                                            </div>
                                            <div className="at-about-content">
                                                                                                <h4 className="at-about-title mb-10">Agentic workflow orchestration</h4>
                                                <p className="at-about-dec at_fade_anim">
                                                    Deploy a production-grade ecosystem of autonomous agents engineered to manage your entire lifecycle. From lead acquisition to omnichannel support, operate at scale with zero downtime.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-lg-6 col-md-6">
                                        <div className="at-about-item mb-40 d-flex flex-column gap-4">
                                            <div className="at-about-content order-2 order-md-1">
                                                <h4 className="at-about-title mb-10">Vertical-specific AI infrastructure</h4>
                                                <p className="at-about-dec at_fade_anim">
                                                    Integrate deep industry domain knowledge with modern automation. Each blueprint features a specialized UI and an embedded model fine-tuned for its vertical, enabling competitive advantage from day one.
                                                </p>
                                            </div>
                                            <div className="anim-zoomin-wrap order-1 order-md-2">
                                                <div className="at-about-thumb fix anim-zoomin">
                                                    <img
                                                        data-speed=".8"
                                                        data-delay=".4"
                                                        data-fade-from="bottom"
                                                        data-ease="bounce"
                                                        src="/assets/imgs/template/wb3.webp"
                                                        alt="phoxta"
                                                        width={500}
                                                        height={450} loading="lazy" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
