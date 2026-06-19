import { Link } from "react-router-dom";
import RevealText from "@/shared/effects/RevealText";
import OdometerCounter from "@/shared/elements/OdometerCounter";

const STATS = [
    { shape: "sec-2-shape-1.webp", tag: "Fixed", prefix: "", count: 7, suffix: "%+", cap: "Annual target return on fixed Growth Notes.", delay: ".1" },
    { shape: "sec-2-shape-2.webp", tag: "Up to", prefix: "", count: 15, suffix: "%", cap: "Target net yield on Credit Invest portfolios.", delay: ".25" },
    { shape: "sec-2-shape-3.webp", tag: "Backed by", prefix: "", count: 5, suffix: "", cap: "Diversified revenue streams securing every payout.", delay: ".4" },
    { shape: "sec-2-shape-4.webp", tag: "From", prefix: "$", count: 500, suffix: "", cap: "Minimum to open an account — paid out monthly.", delay: ".55" },
];

export default function Section2() {
    return (
        <section className="sec-2-home-13" aria-label="About Us">
            <div className="sec-2-home-13__inner">
                <div className="sec-2-home-13__top">
                    <div className="sec-2-home-13__left">
                        <div className="sec-2-home-13__label at_fade_anim" data-fade-from="left" data-delay=".05">
                            <span className="sec-2-home-13__label-dot" aria-hidden="true"></span>
                            <span className="sec-2-home-13__label-text">THE OPPORTUNITY</span>
                        </div>

                        <div className="sec-2-home-13__intro">
                            <p className="sec-2-home-13__intro-text mb-0 at_fade_anim">
                                You back the <strong>infrastructure</strong> behind thousands of AI-run businesses — and share in revenue that compounds as the network grows.
                            </p>

                            <ul className="sec-2-home-13__team list-unstyled mb-0">
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <li key={n} className="sec-2-home-13__team-avatar at_fade_anim" data-fade-from="left" data-delay={`.${n}`}>
                                        <img src={`/assets/imgs/pages/home-13/sec-2-avatar-${n}.webp`} alt="Phoxta" loading="lazy" />
                                    </li>
                                ))}
                            </ul>

                            <Link className="sec-2-home-13__cta at_fade_anim" to="/product-archive">
                                <span>Browse the businesses</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                                    <path d="M3.5 10.5L10.5 3.5M10.5 3.5H4.66667M10.5 3.5V9.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </Link>
                        </div>
                    </div>

                    <div className="sec-2-home-13__right">
                        <div className="sec-2-home-13__head">
                            <span className="sec-2-home-13__pill at_fade_anim" data-fade-from="bottom" data-delay=".05">
                                <span className="sec-2-home-13__pill-dot" aria-hidden="true"></span>
                                <span>Open to new investors</span>
                            </span>
                            <h2 className="sec-2-home-13__title mb-0 reveal-text">
                                <RevealText>Real businesses. Real revenue. Returns engineered to be durable &mdash; not hype.</RevealText>
                            </h2>
                        </div>

                        <div className="sec-2-home-13__grid">
                            <div className="sec-2-home-13__col me-0 me-lg-4">
                                <figure className="sec-2-home-13__media anim-zoomin-wrap mb-0">
                                    <img className="anim-zoomin" src="/assets/imgs/pages/home-13/sec-2-img-1.webp" alt="Phoxta" loading="lazy" />
                                </figure>
                                <div className="sec-2-home-13__caption">
                                    <h3 className="sec-2-home-13__caption-title mb-0 at-char-animation">Where returns come from</h3>
                                    <p className="sec-2-home-13__caption-text mb-0 at_fade_anim">
                                        Every payout is funded by real economics: one-time launch fees, recurring subscriptions, metered usage and marketplace take &mdash; plus interest on working-capital advances to vetted, revenue-generating businesses.
                                    </p>
                                </div>
                            </div>
                            <div className="sec-2-home-13__col sec-2-home-13__col--tall  ms-0 ms-lg-4">
                                <figure className="sec-2-home-13__media sec-2-home-13__media--tall anim-zoomin-wrap mb-0">
                                    <img className="anim-zoomin" src="/assets/imgs/pages/home-13/sec-2-img-2.webp" alt="Phoxta" loading="lazy" />
                                </figure>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="sec-2-home-13__stats">
                    {STATS.map((s, i) => (
                        <div key={i} className="sec-2-home-13__stat at_fade_anim" data-fade-from="left" data-fade-offset="24" data-delay={s.delay}>
                            <div className="sec-2-home-13__stat-head">
                                <span className="sec-2-home-13__stat-icon">
                                    <img className="dark-mode-invert" src={`/assets/imgs/pages/home-13/${s.shape}`} alt="Phoxta" loading="lazy" />
                                </span>
                                <span className="sec-2-home-13__stat-tag">{s.tag}</span>
                            </div>
                            <p className="sec-2-home-13__stat-num mb-0">{s.prefix}<OdometerCounter count={s.count} />{s.suffix}</p>
                            <p className="sec-2-home-13__stat-cap mb-0">{s.cap}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
