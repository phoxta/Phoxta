import OdometerCounter from "@/shared/elements/OdometerCounter";

const stats = [
    { value: "60", suffix: "s", label: "Generate a complete brand identity in about a minute.", delay: ".1" },
    { value: "4", suffix: "", label: "Logo, palette, typography and voice — one cohesive system.", delay: ".22" },
    { value: "100", suffix: "%", label: "Applied across your storefront, emails and AI agent.", delay: ".34" },
    { value: "1", suffix: "", label: "One brand, live on your own custom domain.", delay: ".46" },
    { value: "No code", suffix: "", label: "Edit every page and asset visually — no designer required.", delay: ".58" },
];

export default function Section2() {
    return (
        <>
            {/* Home 9 / section 2 - stats + odometer */}
            <section className="sec-2-home-9 bg-neutral-0">
                <div className="sec-2-home-9__container">
                    <div className="sec-2-home-9__stats">
                        {stats.map((stat, i) => (
                            <div
                                key={i}
                                className="sec-2-home-9__stat at_fade_anim"
                                data-delay={stat.delay}
                                data-fade-from="left"
                                data-fade-offset="24"
                            >
                                <p className="sec-2-home-9__value text-nowrap">
                                    {i < 4 ? (
                                        <>
                                            <OdometerCounter count={Number(stat.value)} />{stat.suffix}
                                        </>
                                    ) : (
                                        stat.value
                                    )}
                                </p>
                                <p className="sec-2-home-9__label mb-0">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                    <div className="sec-2-home-9__lines" aria-hidden="true">
                        <img
                            src="/assets/imgs/pages/home-9/sec-2-lines.svg"
                            alt="phoxta"
                            width={1720}
                            height={33}
                            loading="lazy"
                        />
                    </div>
                </div>
            </section>
        </>
    );
}
