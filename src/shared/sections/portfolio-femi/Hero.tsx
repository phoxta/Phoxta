import { onAnchorClick } from "@/shared/effects/scrollToId";
import { PROFILE, STATS } from "@/shared/portfolio/portfolioData";

const ARROW = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 8h9M8.5 3.5 13 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default function Hero() {
    return (
        <section id="top" className="pf2-hero">
            <link
                rel="preload"
                as="image"
                href="/assets/imgs/portfolio/femi-adeyemi-400.webp"
                imageSrcSet="/assets/imgs/portfolio/femi-adeyemi-400.webp 400w, /assets/imgs/portfolio/femi-adeyemi-720.webp 720w, /assets/imgs/portfolio/femi-adeyemi.webp 900w"
                imageSizes="(max-width: 991px) 88vw, 400px"
                fetchPriority="high"
            />
            <div className="container-2200 px-3 px-lg-4">
                <div className="pf2-hero__grid">
                    <div className="pf2-hero__copy">
                        <p className="pf2-kicker">
                            <span aria-hidden="true" /> Senior product designer · United Kingdom
                        </p>
                        <h1>I turn complex product systems into clear, shipped experiences.</h1>
                        <p className="pf2-hero__lede">
                            I lead work from problem framing and research through interaction design, design systems and production UI—across AI SaaS, enterprise operations and consumer products.
                        </p>
                        <div className="pf2-actions">
                            <a href="#work" onClick={onAnchorClick("work", 84)} className="pf2-button pf2-button--light">
                                View selected work {ARROW}
                            </a>
                            <a href={`mailto:${PROFILE.email}`} className="pf2-button pf2-button--ghost-light">
                                Start a conversation
                            </a>
                        </div>
                        <p className="pf2-hero__availability">
                            <span aria-hidden="true" /> {PROFILE.availability}
                        </p>
                    </div>

                    <div className="pf2-hero__portrait">
                        <img
                            src="/assets/imgs/portfolio/femi-adeyemi-400.webp"
                            srcSet="/assets/imgs/portfolio/femi-adeyemi-400.webp 400w, /assets/imgs/portfolio/femi-adeyemi-720.webp 720w, /assets/imgs/portfolio/femi-adeyemi.webp 900w"
                            sizes="(max-width: 991px) 88vw, 400px"
                            alt="Oluwafemi Adeyemi, senior product designer"
                            width={720}
                            height={864}
                            loading="eager"
                            fetchPriority="high"
                        />
                        <div className="pf2-hero__portrait-caption">
                            <span>{PROFILE.name}</span>
                            <span>Design strategy · UX · UI · Delivery</span>
                        </div>
                    </div>
                </div>

                <dl className="pf2-proof" aria-label="Experience highlights">
                    {STATS.map((stat) => (
                        <div key={stat.label} className="pf2-proof__item">
                            <dt>{stat.value}</dt>
                            <dd>{stat.label}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    );
}
