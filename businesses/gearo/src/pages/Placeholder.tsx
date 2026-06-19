import Layout from "@/components/layout/Layout";
import RLink from "@/components/common/RLink";

// Temporary page for routes not yet converted from the template. Keeps the app
// fully navigable and building while pages are ported one by one.
export default function Placeholder({ title }: { title: string }) {
    return (
        <Layout>
            <section className="flat-spacing-2">
                <div className="container">
                    <div className="text-center" style={{ padding: "80px 0" }}>
                        <h2 className="mb-3">{title}</h2>
                        <p className="text-body-1 mb-4">This page is being rebuilt in React from the template.</p>
                        <RLink to="index.html" className="tf-btn btn-fill animate-hover-btn">Back to Home</RLink>
                    </div>
                </div>
            </section>
        </Layout>
    );
}
