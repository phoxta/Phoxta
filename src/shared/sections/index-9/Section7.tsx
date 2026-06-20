import { Link } from "react-router-dom";
import RevealText from "@/shared/effects/RevealText";

const tags = [
    { label: "AI Brand Generation", delay: ".1" },
    { label: "Logo & Identity", delay: ".2" },
    { label: "Color & Type", delay: ".3" },
    { label: "Brand Voice", delay: ".4" },
    { label: "Visual Studio", delay: ".5" },
];

export default function Section7() {
    return (
        <>
            {/* home-9 section 7 - Collective / capabilities */}
            <section className="sec-7-home-9 changeless">
                <div className="sec-7-home-9__container">
                    <h2 className="sec-7-home-9__lead reveal-text at_fade_anim" data-delay=".1" data-fade-from="top" data-fade-offset="50">
                        <RevealText>Phoxta merges generative AI with real design craft, so any business can launch a credible, distinctive brand — and refine every detail without a designer.</RevealText>
                    </h2>

                    <div className="row g-4 g-xxl-5 align-items-start sec-7-home-9__main">
                        <div className="col-lg-6 col-xl-7">
                            <div className="sec-7-home-9__visual">
                                <div className="fix anim-zoomin">
                                    <img
                                        data-speed=".8"
                                        src="/assets/imgs/pages/home-9/sec-7-layer.webp"
                                        alt="phoxta"
                                        width={1000}
                                        height={667}
                                        style={{ width: "auto", height: "auto" }} loading="lazy" />
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-6 col-xl-5">
                            <div className="sec-7-home-9__aside">
                                <div className="sec-7-home-9__deco" aria-hidden="true">
                                    <img
                                        src="/assets/imgs/pages/home-9/sec-7-deco.webp"
                                        alt="phoxta"
                                        width={99}
                                        height={99}
                                        loading="lazy"
                                    />
                                </div>
                                <blockquote className="sec-7-home-9__quote at_fade_anim">
                                    &ldquo;We pair AI speed with human taste. Generate a complete identity in seconds, then fine-tune logo, palette, type and voice in a visual editor — and publish it everywhere your business shows up.&rdquo;
                                </blockquote>
                                <div className="sec-7-home-9__tags">
                                    {tags.map((tag, i) => (
                                        <Link
                                            key={i}
                                            to="#"
                                            className="sec-7-home-9__tag at_fade_anim"
                                            data-delay={tag.delay}
                                        >
                                            <span>{tag.label}</span>
                                            <img
                                                src="/assets/imgs/pages/home-9/sec-7-tag-arrow.webp"
                                                alt="phoxta"
                                                width={9}
                                                height={9}
                                                loading="lazy"
                                            />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
