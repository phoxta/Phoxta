import Layout from "@/components/layout/Layout";
import Link from "@/components/common/Link";
import { useOrgContent } from "@/util/content";
import { fetchBlog, type BlogPost } from "@/lib/phoxta";

const FALLBACK: BlogPost[] = [
    { id: "1", slug: "top-road-trips-2026", title: "Top Road Trips for 2026", excerpt: "Routes worth renting a car for this year.", body: "", cover_url: "/assets/imgs/cars-listing/cars-listing-6/car-1.png", author: "The Team", published_at: new Date().toISOString() },
];

export default function BlogGrid() {
    const posts = useOrgContent(fetchBlog, FALLBACK);
    return (
        <Layout footerStyle={1}>
            <div>
                <section className="section-box pt-80 pb-80 background-body">
                    <div className="container">
                        <div className="text-center mb-50">
                            <h3 className="neutral-1000">From the blog</h3>
                            <p className="text-xl-medium neutral-500">Stories, guides and tips.</p>
                        </div>
                        <div className="row">
                            {posts.map((p) => (
                                <div className="col-lg-4 col-md-6 mb-4" key={p.id}>
                                    <div className="card h-100 border rounded-3 overflow-hidden background-card hover-up">
                                        <Link href={`/blog-details?slug=${p.slug}`}>
                                            <img src={p.cover_url || "/assets/imgs/cars-listing/cars-listing-6/car-1.png"} alt={p.title} style={{ width: "100%", height: 200, objectFit: "cover" }} />
                                        </Link>
                                        <div className="p-4">
                                            <p className="text-sm-medium neutral-500 mb-1">{new Date(p.published_at).toLocaleDateString()} · {p.author}</p>
                                            <h5 className="neutral-1000"><Link href={`/blog-details?slug=${p.slug}`}>{p.title}</Link></h5>
                                            <p className="text-md-medium neutral-500 mb-0">{p.excerpt}</p>
                                        </div>
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
