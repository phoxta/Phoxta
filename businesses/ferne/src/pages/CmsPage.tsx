import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCms } from "@/lib/phoxta";
import PageMeta from "@/components/PageMeta";
import { useCatalog } from "@/state/catalog";

/** Privacy and terms: whatever the shop has published in the console, with a
 *  short honest placeholder until it writes its own. */
export default function CmsPage({ slug, title, fallback }: { slug: string; title: string; fallback: string }) {
    const { orgId } = useCatalog();
    const [page, setPage] = useState<{ title: string; body: string } | null>(null);

    useEffect(() => {
        if (!orgId) return;
        let active = true;
        void fetchCms(orgId, slug).then((p) => {
            if (active && p?.body?.trim()) setPage(p);
        });
        return () => {
            active = false;
        };
    }, [orgId, slug]);

    const body = page?.body ?? fallback;

    return (
        <div className="page">
            <PageMeta title={page?.title ?? title} />
            <div className="wrap">
                <div className="page-head">
                    <div className="crumbs">
                        <Link to="/">Home</Link> / <b>{page?.title ?? title}</b>
                    </div>
                    <h1 className="serif">{page?.title ?? title}</h1>
                </div>
                <div className="article" style={{ marginTop: 0 }}>
                    {body
                        .split(/\n{2,}/)
                        .map((p) => p.trim())
                        .filter(Boolean)
                        .map((p, i) => (
                            <p key={i}>{p}</p>
                        ))}
                </div>
            </div>
        </div>
    );
}
