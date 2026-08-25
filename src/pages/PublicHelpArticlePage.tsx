import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import Section2 from "@/shared/sections/help/Section2";
import { fetchPublicHelpArticle, type HelpArticle, type PublicHelpOrg } from "@/lib/db/ops/helpCenter";

/**
 * One public help article, resolved from /help/:org/:slug.
 *
 * Anon-read from help_articles under RLS (published only). An unknown slug
 * sends the reader to the business's help index once the lookup has actually
 * answered; an unknown business falls through to the index's friendly empty
 * state. Dynamic — deliberately NOT prerendered.
 */
export default function PublicHelpArticlePage() {
    const { org: orgRef, slug } = useParams<{ org: string; slug: string }>();

    const [state, setState] = useState<{ org: PublicHelpOrg | null; article: HelpArticle | null } | null>(null);

    useEffect(() => {
        setState(null);
        if (!orgRef || !slug) return;
        let active = true;
        fetchPublicHelpArticle(orgRef, slug).then((r) => { if (active) setState(r); });
        return () => { active = false; };
    }, [orgRef, slug]);

    // Still resolving — keep the page height so the footer doesn't jump.
    if (!state) return <div style={{ minHeight: "60vh" }} aria-busy="true" />;

    // Unknown business or article — the help index explains, or redirects sensibly.
    if (!state.org || !state.article || !orgRef) {
        return <Navigate to={orgRef ? `/help/${orgRef}` : "/"} replace />;
    }

    return (
        <>
            <PageMeta
                title={`${state.article.title} — ${state.org.name} Help Center | Phoxta`}
                description={state.article.excerpt || `Help from the ${state.org.name} team.`}
                path={`/help/${orgRef}/${state.article.slug}`}
                type="article"
            />
            <Section2 org={state.org} orgRef={orgRef} article={state.article} />
        </>
    );
}
