import Layout from "@/components/layout/Layout";
import Link from "@/components/common/Link";
import { useOrgContent } from "@/util/content";
import { fetchPricing, type Plan } from "@/lib/phoxta";

const FALLBACK: Plan[] = [
    { id: "1", name: "Starter", price_cents: 0, interval: "monthly", features: ["Browse the full fleet", "Standard support", "Email confirmations"], highlighted: false },
    { id: "2", name: "Plus", price_cents: 1900, interval: "monthly", features: ["Everything in Starter", "Priority support", "Member-only rates", "Free changes"], highlighted: true },
    { id: "3", name: "Pro", price_cents: 4900, interval: "monthly", features: ["Everything in Plus", "Dedicated manager", "Best available rates", "24/7 support"], highlighted: false },
];

export default function Pricing() {
    const plans = useOrgContent(fetchPricing, FALLBACK);
    return (
        <Layout footerStyle={1}>
            <div>
                <section className="section-box pt-80 pb-80 background-body">
                    <div className="container">
                        <div className="text-center mb-50">
                            <h3 className="neutral-1000">Simple, transparent pricing</h3>
                            <p className="text-xl-medium neutral-500">Choose the plan that fits how you drive.</p>
                        </div>
                        <div className="row justify-content-center">
                            {plans.map((p) => (
                                <div className="col-lg-4 col-md-6 mb-4" key={p.id}>
                                    <div className={`card h-100 border rounded-3 p-4 ${p.highlighted ? "border-dark shadow" : ""} background-card`}>
                                        {p.highlighted && <span className="btn btn-brand-2 btn-sm rounded-pill mb-2">Most popular</span>}
                                        <h5 className="neutral-1000">{p.name}</h5>
                                        <div className="d-flex align-items-end my-3">
                                            <h2 className="neutral-1000 mb-0">${Math.round((p.price_cents || 0) / 100)}</h2>
                                            <span className="text-md-medium neutral-500 ms-2 mb-1">/ {p.interval}</span>
                                        </div>
                                        <ul className="list-unstyled mb-4">
                                            {(p.features || []).map((f, i) => (
                                                <li className="text-md-medium neutral-700 py-1" key={i}>✓ {f}</li>
                                            ))}
                                        </ul>
                                        <Link href="/cars-list-1" className={`btn ${p.highlighted ? "btn-brand-2" : "btn-gray"} w-100`}>Get started</Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </Layout>
    );
}
