import { Link } from "react-router-dom";
import RevealText from "@/shared/effects/RevealText";

const features = [
    {
        img: "/assets/imgs/pages/home-9/sec-3-img-1.webp",
        title: "Strategy-first",
        desc: "Every identity starts with positioning, audience and meaning — not just aesthetics.",
        delay: ".32",
    },
    {
        img: "/assets/imgs/pages/home-9/sec-3-img-2.webp",
        title: "Crafted by designers",
        desc: "Senior designers shape every logo, palette and type system — accelerated, not replaced, by AI.",
        delay: ".4",
    },
    {
        img: "/assets/imgs/pages/home-9/sec-3-img-3.webp",
        title: "Built to scale",
        desc: "We deliver complete design systems and guidelines so your brand stays consistent everywhere.",
        delay: ".48",
    },
];

export default function Section3() {
    return (
        <>
            {/* Home 9 / section 3 - About + pillars */}
            <section className="sec-3-home-9 bg-neutral-50">
                <div className="sec-3-home-9__container">
                    <div className="row align-items-start g-0 gy-5 gx-xl-5">
                        <div className="col-12 col-lg-5">
                            <div className="sec-3-home-9__visual at_fade_anim" data-delay=".15" data-fade-from="bottom" data-fade-offset="20">
                                <div className="fix anim-zoomin">
                                    <img
                                        data-speed=".8"
                                        src="/assets/imgs/pages/home-9/sec-3-img-0.webp"
                                        alt="phoxta"
                                        width={699}
                                        height={415}
                                        loading="lazy"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="col-12 col-lg-7">
                            <div className="sec-3-home-9__intro">
                                <Link
                                    to="/about"
                                    className="sec-3-home-9__eyebrow d-inline-flex align-items-center gap-2 text-uppercase at_fade_anim"
                                    data-delay=".1"
                                    data-fade-from="bottom"
                                    data-fade-offset="16"
                                >
                                    <span className="text-scramble">About Us</span>
                                    <span className="sec-3-home-9__eyebrow-icon" aria-hidden="true">
                                        <img
                                            src="/assets/imgs/pages/home-9/sec-3-eyebrow-arrow.svg"
                                            alt="phoxta"
                                            width={14}
                                            height={13}
                                            loading="lazy"
                                        />
                                    </span>
                                </Link>
                                <h2 className="sec-3-home-9__headline text-uppercase mb-0 at_fade_anim reveal-text" data-delay=".2" data-fade-from="bottom" data-fade-offset="20">
                                    <RevealText>We build brands that are impossible to ignore.</RevealText>
                                </h2>
                                <p className="sec-3-home-9__lede text-uppercase mb-0 at_fade_anim reveal-text" data-delay=".28" data-fade-from="bottom" data-fade-offset="20">
                                    <RevealText>Phoxta pairs senior design craft with generative tools, so ambitious brands get distinctive, cohesive identities — faster and sharper than a traditional studio.</RevealText>
                                </p>
                            </div>

                            <div className="sec-3-home-9__features">
                                {features.map((feature, i) => (
                                    <div
                                        key={i}
                                        className="sec-3-home-9__feature at_fade_anim"
                                        data-delay={feature.delay}
                                        data-fade-from="left"
                                        data-fade-offset="20"
                                    >
                                        <div className="sec-3-home-9__feature-thumb">
                                            <div className="fix anim-zoomin position-relative w-100 h-100">
                                                <img
                                                    src={feature.img}
                                                    alt="phoxta"
                                                    style={{ objectFit: "cover" }}
                                                    loading="lazy"
                                                />
                                            </div>
                                        </div>
                                        <div className="sec-3-home-9__feature-text">
                                            <h3 className="sec-3-home-9__feature-title at-char-animation">{feature.title}</h3>
                                            <p className="sec-3-home-9__feature-desc mb-0">{feature.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
