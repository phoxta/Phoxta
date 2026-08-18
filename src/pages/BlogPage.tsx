import PageMeta from "@/seo/PageMeta";
import Section1 from "@/shared/sections/blog-index/Section1";
import { ARTICLES_BY_DATE } from "@/data/articles";
import { absoluteUrl } from "@/seo/seo.config";

/** The blog index — every article. Individual posts render at /blog/:slug. */
export default function BlogPage() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Blog",
        name: "Phoxta Blog",
        url: absoluteUrl("/blog"),
        blogPost: ARTICLES_BY_DATE.map((a) => ({
            "@type": "BlogPosting",
            headline: a.title,
            datePublished: a.iso,
            author: { "@type": "Organization", name: a.author },
            url: absoluteUrl(`/blog/${a.slug}`),
        })),
    };

    return (
        <>
            <PageMeta
                title="Blog — Playbooks, tear-downs and case studies | Phoxta"
                description="Articles and startup guides on owning and operating AI-powered businesses — playbooks, unit-economics tear-downs and case studies from the Phoxta marketplace."
                path="/blog"
                jsonLd={jsonLd}
            />
            <Section1 />
        </>
    );
}
