import Layout from "@/components/layout/Layout";
import Breadcrumb from "@/components/layout/Breadcrumb";

const VALUES = [
    ["Ergonomic by design", "Every product is built to support better posture and longer focus."],
    ["Sustainably sourced", "Responsibly made materials with a lower footprint."],
    ["Free delivery", "On all orders over $20, shipped fast and tracked."],
];

export default function About() {
    return (
        <Layout>
            <Breadcrumb title="About Us" />
            <section className="flat-spacing-4">
                <div className="container">
                    <div className="row align-items-center g-4">
                        <div className="col-md-6">
                            <img src="/images/section/collections-banner.jpg" alt="About Gearo" width={640} height={460} style={{ width: "100%", borderRadius: 16 }} />
                        </div>
                        <div className="col-md-6">
                            <h3 className="mb-3">Furniture for the way you work</h3>
                            <p className="text-body-default text_secondary mb-3">
                                Gearo designs modern, ergonomic furniture and workspace essentials — from standing desks
                                to task lighting — that help people work comfortably and beautifully.
                            </p>
                            <p className="text-body-default text_secondary">
                                We obsess over the details so your workspace feels effortless, considered and built to last.
                            </p>
                        </div>
                    </div>
                    <div className="row g-4 mt-2">
                        {VALUES.map(([t, d]) => (
                            <div className="col-md-4" key={t}>
                                <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 24, height: "100%" }}>
                                    <h5 className="mb-2">{t}</h5>
                                    <p className="text-body-default text_secondary mb-0">{d}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </Layout>
    );
}
