import { Link } from "react-router-dom";
import HeaderNav from "@/shared/header/HeaderNav";
import { STAGES } from "@/lib/founder/journey";
import { ALL_TOOLS } from "@/lib/founder/tools";
import { HERO_COLLAGE } from "@/lib/founder/media";

// The Founder Toolkit hero.
//
// The first version cloned the homepage hero — a dark wave with a huge headline
// dropped on it. It looked like the homepage wearing different words: no focal
// point, storefront thumbnails too small to read, and nothing anywhere saying
// what the thing actually is.
//
// This is built the other way round, from what a founder needs to decide in
// four seconds: what is it, is it really free, and where do I start. So the
// proof is a stat row rather than a paragraph, and the right-hand side is a
// collage of the people the toolkit is for — a baker, a ceramicist, a florist —
// because "launch a business" means their businesses, not an abstract render.
//
// The serif italic accent, the soft light wash and the overlapping rounded
// cards are the editorial motifs from the reference set.

const ARROW = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const STATS = [
    { n: String(ALL_TOOLS.length), l: "tools" },
    { n: String(STAGES.length), l: "stages" },
    { n: "14", l: "sources cited" },
    { n: "£0", l: "forever" },
];

export default function FounderHero() {
    return (
        <section className="fdh">
            {/* Three blurred colour fields rather than a photographic background:
                the copy stays legible at every size, and nothing competes with
                the collage for attention. aria-hidden, purely atmospheric. */}
            <div className="fdh__wash" aria-hidden="true">
                <span className="fdh__blob fdh__blob--peach" />
                <span className="fdh__blob fdh__blob--lilac" />
                <span className="fdh__blob fdh__blob--mint" />
            </div>

            <HeaderNav />

            <div className="container fdh__inner">
                <div className="row align-items-center g-5">
                    <div className="col-lg-6 fdh__copy">
                        <span className="fdh__eyebrow">
                            <span className="fdh__dot" aria-hidden="true" />
                            Free forever · No account · Any country
                        </span>

                        <h1 className="fdh__title">
                            Everything you need to <em>actually</em> start a business.
                        </h1>

                        <p className="fdh__lede">
                            {ALL_TOOLS.length} working tools across the {STAGES.length} stages of building a company —
                            from deciding whether to start, to working out what it is worth. Every number shows its
                            source and its year.
                        </p>

                        <div className="fdh__cta">
                            <Link to={`/founder/${STAGES[0].slug}`} className="fdh__btn fdh__btn--solid">
                                Start at the beginning {ARROW}
                            </Link>
                            <a href="#stages" className="fdh__btn fdh__btn--ghost">
                                See the {STAGES.length} stages
                            </a>
                        </div>

                        <dl className="fdh__stats">
                            {STATS.map((s) => (
                                <div key={s.l} className="fdh__stat">
                                    <dt>{s.n}</dt>
                                    <dd>{s.l}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>

                    <div className="col-lg-6">
                        {/* Overlapping cards on their own float rhythm. Transform-only
                            animation, and it stops entirely under prefers-reduced-motion. */}
                        <div className="fdh__collage">
                            {HERO_COLLAGE.map((c, i) => (
                                <figure key={c.src} className={`fdh__card fdh__card--${i + 1}`}>
                                    <img src={c.src} alt={c.alt} width={560} height={700} loading="eager" />
                                    <figcaption>
                                        <span className="fdh__card-name">{c.name}</span>
                                        <span className="fdh__card-role">{c.role}</span>
                                    </figcaption>
                                </figure>
                            ))}

                            <div className="fdh__tile fdh__tile--score" aria-hidden="true">
                                <span className="fdh__tile-k">Opportunity score</span>
                                <span className="fdh__tile-v">72<small>/100</small></span>
                                <span className="fdh__tile-bar"><i style={{ width: "72%" }} /></span>
                            </div>

                            <div className="fdh__tile fdh__tile--break" aria-hidden="true">
                                <span className="fdh__tile-k">Breakeven</span>
                                <span className="fdh__tile-v fdh__tile-v--sm">418 units</span>
                                <span className="fdh__tile-note">at £24 · 62% margin</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
