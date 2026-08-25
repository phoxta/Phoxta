import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import Section1 from "@/shared/sections/blog-article/Section1";
import Section2 from "@/shared/sections/blog-article/Section2";
import { getArticle, type Article } from "@/data/articles";
import { fetchPublishedArticle } from "@/lib/db/platformPosts";
import { absoluteUrl } from "@/seo/seo.config";

/**
 * A single article, resolved from /blog/:slug.
 *
 * Two sources, one template: a built-in editorial article renders instantly,
 * then swaps to its console-edited version if one is live (or leaves if the
 * console hid it); a slug that exists only as a console post is fetched and
 * rendered through the exact same sections. Only after the lookup answers
 * does an unknown slug redirect to the index.
 */
export default function ArticlePage() {
    const { slug } = useParams<{ slug: string }>();
    const builtIn = getArticle(slug);

    const [remote, setRemote] = useState<{ article: Article | null; hidden: boolean } | null>(null);

    useEffect(() => {
        setRemote(null);
        if (!slug) return;
        let active = true;
        fetchPublishedArticle(slug).then((r) => { if (active) setRemote(r); });
        return () => { active = false; };
    }, [slug]);

    // The console hid this built-in — it is off the site.
    if (builtIn && remote?.hidden) return <Navigate to="/blog" replace />;

    const article = remote?.article ?? builtIn;

    if (!article) {
        // Unknown slug — send the reader to the index rather than a dead page,
        // but only once the console lookup has actually answered.
        if (remote) return <Navigate to="/blog" replace />;
        return <div style={{ minHeight: "60vh" }} aria-busy="true" />;
    }

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: article.title,
        description: article.excerpt,
        image: absoluteUrl(article.img),
        datePublished: article.iso,
        dateModified: article.iso,
        author: { "@type": "Organization", name: article.author },
        publisher: { "@type": "Organization", name: "Phoxta" },
        mainEntityOfPage: absoluteUrl(`/blog/${article.slug}`),
    };

    return (
        <>
            <PageMeta
                title={`${article.title} | Phoxta`}
                description={article.excerpt}
                path={`/blog/${article.slug}`}
                image={article.img}
                type="article"
                jsonLd={jsonLd}
            />
            <Section1 article={article} />
            <Section2 currentSlug={article.slug} />
        </>
    );
}
