import RLink from "@/components/common/RLink";

const POSTS = [
    { img: "/images/blog/blog-1.jpg", title: "5 ways to set up an ergonomic home office", date: "May 12, 2025" },
    { img: "/images/blog/blog-2.jpg", title: "Choosing the right desk for small spaces", date: "May 03, 2025" },
    { img: "/images/blog/blog-3.jpg", title: "Lighting tips for focus and comfort", date: "Apr 21, 2025" },
];

export default function BlogNews() {
    return (
        <section className="flat-spacing-2 pt-0 section-news-insight">
            <div className="container">
                <div className="heading-section text-center mb-4">
                    <h3 className="wow fadeInUp">From the journal</h3>
                    <p className="text-body-default text_secondary">Ideas and inspiration for a better workspace.</p>
                </div>
                <div className="tf-grid-layout tf-col-2 lg-col-3">
                    {POSTS.map((p) => (
                        <div key={p.title} className="blog-article-item">
                            <RLink to="blog-details.html" className="image-wrap" style={{ display: "block", borderRadius: 12, overflow: "hidden" }}>
                                <img src={p.img} alt={p.title} width={420} height={300} style={{ width: "100%", objectFit: "cover" }} />
                            </RLink>
                            <div style={{ paddingTop: 14 }}>
                                <p className="text-caption-1 text_secondary mb-1">{p.date}</p>
                                <h5><RLink to="blog-details.html" className="link">{p.title}</RLink></h5>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
