import Layout from "@/components/layout/Layout";
import Breadcrumb from "@/components/layout/Breadcrumb";

export default function BlogDetails() {
    return (
        <Layout>
            <Breadcrumb title="Blog Details" />
            <section className="flat-spacing-4">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-lg-8">
                            <p className="text-caption-1 text_secondary mb-2">May 12, 2025 · Workspace</p>
                            <h2 className="mb-3">5 ways to set up an ergonomic home office</h2>
                            <img src="/images/blog/blog-1.jpg" alt="" width={800} height={460} style={{ width: "100%", borderRadius: 12, marginBottom: 24 }} />
                            <p className="text-body-1 text_secondary mb-3">
                                A good workspace starts with good posture. Begin with a chair that supports the natural
                                curve of your spine, then set your screen at eye level to keep your neck relaxed.
                            </p>
                            <p className="text-body-1 text_secondary mb-3">
                                Lighting matters more than most people think — a warm task lamp reduces eye strain during
                                long sessions, while natural light keeps energy up through the afternoon.
                            </p>
                            <p className="text-body-1 text_secondary mb-0">
                                Finally, keep cables tidy and surfaces clear. A calm desk makes for a calmer mind, and a
                                little organisation goes a long way toward staying focused.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    );
}
