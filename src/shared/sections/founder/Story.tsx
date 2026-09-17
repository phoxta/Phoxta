import Marquee from "react-fast-marquee";
import RevealText from "@/shared/effects/RevealText";
import { STORY_FRAMES } from "@/lib/founder/media";

// The breath between the hero and the stage rail, and the page's narrative
// spine: three parallax frames that tell the arc in one scroll — hunch, thing
// with a price on it, open shop.
//
// No animation code lives here. `data-speed` is read by ScrollSmoother (frames
// drift at different rates against the scroll), `reveal-text` by
// RevealTextEffect, `char-anim` by CharAnimEffect and `at_fade_anim` by
// FadeAnimEffect — all re-keyed per route in GlobalEffects.

const STAGE_WORDS = [
    "Founder fit",
    "The opportunity",
    "Model and strategy",
    "Legal structure",
    "Plan and pitch",
    "Startup capital",
    "Launch and operate",
    "Growth funding",
    "Scaling up",
    "Exit and harvest",
];

export default function FounderStory() {
    return (
        <section className="fd-story bg-neutral-0 pt-120 pb-60 overflow-hidden">
            {/* The ten stage names as a slow marquee: the whole journey glimpsed
                before it is explained. aria-hidden — it is decoration, and the
                rail below carries the same words as real links. */}
            <div className="fd-story__ticker mb-60" aria-hidden="true">
                <Marquee speed={38} gradient={false} autoFill pauseOnHover>
                    {STAGE_WORDS.map((w) => (
                        <span key={w} className="fd-story__ticker-word">
                            {w}
                            <span className="fd-story__ticker-dot">&bull;</span>
                        </span>
                    ))}
                </Marquee>
            </div>

            <div className="container">
                <div className="row">
                    <div className="col-lg-9">
                        <h2 className="reveal-text mb-0 fd-story__head">
                            <RevealText>
                                Every business that exists was, at some point, somebody sitting down and starting.
                            </RevealText>
                        </h2>
                    </div>
                </div>

                <div className="fd-story__frames mt-60">
                    {STORY_FRAMES.map((f, i) => (
                        <figure
                            key={f.src}
                            className={`fd-story__frame fd-story__frame--${i + 1} at_fade_anim`}
                            data-fade-from="bottom"
                            data-delay={(0.1 + i * 0.12).toFixed(2)}
                        >
                            <div className="fd-story__media" data-speed={f.speed}>
                                <img src={f.src} alt={f.alt} width={720} height={900} loading="lazy" />
                            </div>
                            <figcaption className="fd-story__cap">
                                <span className="fd-story__kicker">{f.kicker}</span>
                                <p className="fd-story__line">{f.line}</p>
                            </figcaption>
                        </figure>
                    ))}
                </div>
            </div>
        </section>
    );
}
