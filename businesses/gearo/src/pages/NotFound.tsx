import Layout from "@/components/layout/Layout";
import RLink from "@/components/common/RLink";

export default function NotFound() {
    return (
        <Layout>
            <section className="flat-spacing-2">
                <div className="container">
                    <div className="text-center" style={{ padding: "100px 0" }}>
                        <h1 className="mb-3">404</h1>
                        <p className="text-body-1 mb-4">The page you’re looking for doesn’t exist.</p>
                        <RLink to="index.html" className="tf-btn btn-fill animate-hover-btn">Back to Home</RLink>
                    </div>
                </div>
            </section>
        </Layout>
    );
}
