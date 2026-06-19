import Layout from "@/components/layout/Layout";
import Breadcrumb from "@/components/layout/Breadcrumb";
import RLink from "@/components/common/RLink";

const POSTS = [
    { img: "/images/blog/blog-1.jpg", title: "5 ways to set up an ergonomic home office", date: "May 12, 2025" },
    { img: "/images/blog/blog-2.jpg", title: "Choosing the right desk for small spaces", date: "May 03, 2025" },
    { img: "/images/blog/blog-3.jpg", title: "Lighting tips for focus and comfort", date: "Apr 21, 2025" },
    { img: "/images/blog/blog-4.jpg", title: "Cable management that actually lasts", date: "Apr 09, 2025" },
    { img: "/images/blog/blog-5.jpg", title: "Standing vs sitting: finding your balance", date: "Mar 28, 2025" },
    { img: "/images/blog/blog-6.jpg", title: "Sustainable materials in modern furniture", date: "Mar 15, 2025" },
];

export default function Blog() {
    return (
        <Layout>
            <Breadcrumb title="Blog" />
            <section className="flat-spacing-4">
                <div className="container">
                    <div className="tf-grid-layout tf-col-2 lg-col-3">
                        {POSTS.map((p) => (
                            <div key={p.title} className="blog-article-item">
                                <RLink to="blog-details.html" className="image-wrap" style={{ display: "block", borderRadius: 12, overflow: "hidden" }}>
                                    <img src={p.img} alt={p.title} width={420} height={300} style={{ width: "100%", objectFit: "cover" }} />
                                </RLink>
                                <div className="article-content" style={{ paddingTop: 14 }}>
                                    <p className="text-caption-1 text_secondary mb-1">{p.date}</p>
                                    <h5><RLink to="blog-details.html" className="link">{p.title}</RLink></h5>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </Layout>
    );
}
