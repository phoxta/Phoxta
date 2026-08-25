import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import Section1 from "@/shared/sections/help/Section1";
import { fetchPublicHelpIndex, type HelpArticle, type PublicHelpOrg } from "@/lib/db/ops/helpCenter";

/**
 * A business's public Help Center index, resolved from /help/:org.
 *
 * :org is the business's public slug (or raw id). Entirely dynamic — the data
 * is anon-read from help_articles under RLS (published only), so this route is
 * deliberately NOT prerendered and fails soft to a friendly "no help center
 * here" state rather than a dead page.
 */
export default function PublicHelpPage() {
    const { org: orgRef } = useParams<{ org: string }>();

    const [state, setState] = useState<{ org: PublicHelpOrg | null; articles: HelpArticle[] } | null>(null);

    useEffect(() => {
        setState(null);
        if (!orgRef) return;
        let active = true;
        fetchPublicHelpIndex(orgRef).then((r) => { if (active) setState(r); });
        return () => { active = false; };
    }, [orgRef]);

    // Still resolving — keep the page height so the footer doesn't jump.
    if (!state) return <div style={{ minHeight: "60vh" }} aria-busy="true" />;

    if (!state.org || !orgRef) {
        return (
            <>
                <PageMeta title="Help Center | Phoxta" noindex />
                <section className="sec-1-blog-index overflow-hidden pt-150 pb-120">
                    <div className="container text-center">
                        <h2 className="alt-section-title lh-1 neutral-900 fw-700 mb-20">
                            No help center here
                        </h2>
                        <p className="fz-font-lg neutral-700 mb-30">
                            This business hasn’t published any help articles yet — or the link is
                            out of date.
                        </p>
                        <Link to="/" className="at-btn filter-btn btn-sm">
                            Back to Phoxta
                        </Link>
                    </div>
                </section>
            </>
        );
    }

    return (
        <>
            <PageMeta
                title={`${state.org.name} Help Center | Phoxta`}
                description={`Guides and answers from the ${state.org.name} team.`}
                path={`/help/${orgRef}`}
            />
            <Section1 org={state.org} orgRef={orgRef} articles={state.articles} />
        </>
    );
}
