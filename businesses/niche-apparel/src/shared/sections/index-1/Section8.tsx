import OdometerCounter from "@/shared/elements/OdometerCounter";

const STATS = [
    { count: 10, suffix: "+", label: "Businesses ready to own" },
    { count: 10, suffix: "+", label: "Industries you can launch in" },
    { count: 30, suffix: "-day", label: "Hands-on onboarding" },
    { count: 6, suffix: "+", label: "Built-in AI assistants" },
    { count: 24, suffix: "/7", label: "AI working for you" },
];

export default function Section8() {
    return (
        <div className="container-2200">
            <section className="at-sec8-area pt-90 pb-90 bg-neutral-50 rounded-5 mx-lg-3 mx-2 mt-10">
                <div className="container">
                    <div className="row">
                        <div className="col-12">
                            <div className="d-flex flex-wrap justify-content-lg-between justify-content-around align-items-center gap-4">
                                {STATS.map((stat) => (
                                    <div key={stat.label}>
                                        <h1>
                                            <OdometerCounter count={stat.count} suffix={stat.suffix} className="text-nowrap" />
                                        </h1>
                                        <p>{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
