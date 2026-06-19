import Layout from "@/components/layout/Layout";
import Link from "@/components/common/Link";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useFleet } from "@/util/fleet";
import { fetchBlogPost, type BlogPost } from "@/lib/phoxta";

export default function BlogDetails() {
    const [sp] = useSearchParams();
    const slug = sp.get("slug");
    const { orgId } = useFleet();
    const [post, setPost] = useState<BlogPost | null>(null);

    useEffect(() => {
        if (!orgId || !slug) return;
        fetchBlogPost(orgId, slug).then(setPost).catch(() => {});
    }, [orgId, slug]);

    return (
        <Layout footerStyle={1}>
            <div>
                <section className="section-box pt-80 pb-80 background-body">
                    <div className="container" style={{ maxWidth: 820 }}>
                        <Link href="/blog-list" className="text-md-medium neutral-500">← Back to blog</Link>
                        {post ? (
                            <article className="mt-3">
                                <h2 className="neutral-1000 mb-2">{post.title}</h2>
                                <p className="text-sm-medium neutral-500 mb-4">{new Date(post.published_at).toLocaleDateString()} · {post.author}</p>
                                {post.cover_url && <img src={post.cover_url} alt={post.title} className="rounded-3 mb-4" style={{ width: "100%", maxHeight: 420, objectFit: "cover" }} />}
                                {(post.body || post.excerpt || "").split("\n").filter(Boolean).map((p, i) => (
                                    <p className="text-lg-medium neutral-700 mb-3" key={i}>{p}</p>
                                ))}
                            </article>
                        ) : (
                            <p className="text-lg-medium neutral-500 mt-4">Loading article…</p>
                        )}
                    </div>
                </section>
            </div>
        </Layout>
    );
}
