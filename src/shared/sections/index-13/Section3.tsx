import { Link } from "react-router-dom";
import RevealText from "@/shared/effects/RevealText";

const PROJECTS = [
    { loc: "TIER 01 — STARTER", title: "Starter Note", img: "sec-3-img-1.webp", link: "/auth", desc: "Begin with as little as $500. A 12-month note paying a fixed annual rate, with interest you can withdraw monthly or compound back in.", category: "$500", size: "12 months", service: "7.0% fixed APR" },
    { loc: "TIER 02 — CORE", title: "Core Note", img: "sec-3-img-2.webp", link: "/auth", desc: "Our most-held note. A 24-month term at a higher fixed rate, funded by Phoxta's recurring subscription and usage revenue.", category: "$5,000", size: "24 months", service: "9.0% fixed APR" },
    { loc: "TIER 03 — GROWTH", title: "Growth Note", img: "sec-3-img-3.webp", link: "/auth", desc: "For investors building a position. A 36-month note with a rate step-up each year you reinvest your interest.", category: "$25,000", size: "36 months", service: "11.0% fixed APR" },
    { loc: "TIER 04 — ANCHOR", title: "Anchor Note", img: "sec-3-img-4.webp", link: "/auth", desc: "For larger allocations. A 48-month note at our top fixed rate, with quarterly reporting and priority access to new offerings.", category: "$100,000", size: "48 months", service: "12.5% fixed APR" },
];

const ARROW_ICON = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="15" viewBox="0 0 16 15" fill="none">
        <path d="M0.0001297 8.99993L0 3.00407e-05L2 0L2.0001 6.99993L12.1719 7.00003L8.22224 3.05027L9.63644 1.63606L16.0003 8.00003L9.63644 14.364L8.22224 12.9497L12.1719 9.00003L0.0001297 8.99993Z" fill="currentColor" />
    </svg>
);

export default function Section3() {
    return (
        <section className="sec-3-home-13" aria-label="Growth Notes">
            <div className="sec-3-home-13__inner">
                <header className="sec-3-home-13__header">
                    <div className="sec-3-home-13__head-text">
                        <div className="sec-3-home-13__label at_fade_anim" data-fade-from="left" data-delay=".05">
                            <span className="sec-3-home-13__label-dot" aria-hidden="true"></span>
                            <span className="sec-3-home-13__label-text">GROWTH NOTES · FROM 7%</span>
                        </div>
                        <h2 className="sec-3-home-13__title mb-0 reveal-text">
                            <RevealText>Fixed-term notes that pay you </RevealText>
                            <span className="sec-3-home-13__title-italic"><RevealText>from real platform revenue.</RevealText></span>
                        </h2>
                    </div>

                    <div className="at-btn-group at_fade_anim" data-delay=".4" data-fade-from="bottom" data-ease="bounce">
                        <Link className="at-btn-circle" to="/auth">{ARROW_ICON}</Link>
                        <Link className="at-btn z-index-1" to="/auth">Open an account</Link>
                        <Link className="at-btn-circle" to="/auth">{ARROW_ICON}</Link>
                    </div>
                </header>

                <div className="sec-3-home-13__list">
                    {PROJECTS.map((p, i) => (
                        <article key={i} className="sec-3-home-13__card">
                            <div className="sec-3-home-13__card-meta">
                                <p className="sec-3-home-13__card-loc mb-0">{p.loc}</p>
                                <h3 className="sec-3-home-13__card-title mb-0 reveal-text"><RevealText>{p.title}</RevealText></h3>
                                <Link className="sec-3-home-13__card-link" to={p.link}>
                                    <span>INVEST</span>
                                    <span className="sec-3-home-13__card-link-dots" aria-hidden="true">• • •</span>
                                </Link>
                            </div>
                            <Link className="sec-3-home-13__card-media anim-zoomin-wrap" to={p.link}>
                                <img className="anim-zoomin" data-speed=".8" src={`/assets/imgs/pages/home-13/${p.img}`} alt="Phoxta" loading="lazy" />
                            </Link>
                            <div className="sec-3-home-13__card-info">
                                <p className="sec-3-home-13__card-desc mb-0">{p.desc}</p>
                                <dl className="sec-3-home-13__card-specs mb-0">
                                    <div className="sec-3-home-13__card-row"><dt>MINIMUM</dt><dd>{p.category}</dd></div>
                                    <div className="sec-3-home-13__card-row"><dt>TERM</dt><dd>{p.size}</dd></div>
                                    <div className="sec-3-home-13__card-row"><dt>TARGET RETURN</dt><dd>{p.service}</dd></div>
                                </dl>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
