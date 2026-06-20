const stats = [
    { value: 30, suffix: "%", label: "More conversions" },
    { value: 24, suffix: "/7", label: "Always-on outreach" },
    { value: 5, suffix: "+", label: "Channels, one inbox" },
    { value: 40, suffix: "%", label: "Less manual work" },
    { value: 3, suffix: "×", label: "Faster follow-ups" },
];

export default function Section5() {
    // Duplicate items for seamless scroll
    const duplicatedStats = [...stats, ...stats];

    return (
        <section className="sec-5-home-3">
            <div className="pt-120 pb-120 bg-neutral-900 changeless">
                <div className="d-flex align-items-center justify-content-center gap-5 scroll-move-right">
                    {duplicatedStats.map((item, index) => (
                        <div key={index} className="text-center">
                            <h1 className="fz-ds-1 fw-500 mb-0 text-white text-nowrap">
                                {item.prefix}
                                {item.value}
                                {item.suffix}
                            </h1>
                            <h6 className="fw-500 text-white mb-0">{item.label}</h6>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
