import { Navigate, useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import Section1 from "@/shared/sections/blog-article/Section1";
import Section2 from "@/shared/sections/blog-article/Section2";
import { getArticle } from "@/data/articles";
import { absoluteUrl } from "@/seo/seo.config";

/** A single article, resolved from /blog/:slug. */
export default function ArticlePage() {
    const { slug } = useParams<{ slug: string }>();
    const article = getArticle(slug);

    // Unknown slug — send the reader to the index rather than a dead page.
    if (!article) return <Navigate to="/blog" replace />;

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
