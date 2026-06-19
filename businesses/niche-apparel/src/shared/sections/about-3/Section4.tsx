import React from "react";
import RevealText from "@/shared/effects/RevealText";
import OdometerCounter from "@/shared/elements/OdometerCounter";

// About 3 Section 4 - Stats (Years of Practice, Deployments, Partners)

const STATS = [
    { count: 25, prefix: undefined as React.ReactNode, suffix: "+", label: "Models in Production" },
    { count: 15, prefix: "$" as React.ReactNode, suffix: "M+", label: " Daily Inferences" },
    { count: 300, prefix: undefined as React.ReactNode, suffix: "%", label: "Latency Optimization" },
    { count: 500, prefix: undefined as React.ReactNode, suffix: "TB", label: "Data Orchestrated" },
    { count: 99, prefix: undefined as React.ReactNode, suffix: ".9%", label: "System Uptime" },
];

export default function Section4() {
    return (
        <section className="sec-4-about pt-120 pb-120">
            <div className="container">
                <div className="row">
                    <div className="col-lg-8">
                        <h3 className="reveal-text">
                            <RevealText>
                                Years of Practice, Hundreds of Deployments, and Satisfied Partners
                            </RevealText>
                        </h3>
                    </div>
                    <div className="pt-100">
                        <div className="d-flex flex-wrap align-items-center justify-content-lg-between justify-content-center gap-md-5 gap-4">
                            {STATS.map((item, i) => (
                                <div key={i} className="text-center">
                                    <h1 className="fw-600 mb-0">
                                        <OdometerCounter
                                            count={item.count}
                                            prefix={item.prefix}
                                            suffix={item.suffix}
                                        />
                                    </h1>
                                    <h6 className="fw-500 fz-font-md neutral-500 mb-0">{item.label}</h6>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
