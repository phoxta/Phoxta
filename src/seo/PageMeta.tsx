import { useLocation } from "react-router-dom";
import {
    SITE_NAME,
    TWITTER_HANDLE,
    DEFAULT_DESCRIPTION,
    DEFAULT_OG_IMAGE,
    absoluteUrl,
} from "@/seo/seo.config";

type Props = {
    /** Full document title (e.g. "Pricing — Phoxta"). */
    title: string;
    /** Meta description; falls back to the site default when omitted. */
    description?: string;
    /**
     * Canonical path for this route (e.g. "/pricing"). When omitted the current
     * location pathname is used — correct at runtime and when prerendered.
     */
    path?: string;
    /** Social share image (site-root-relative or absolute URL). */
    image?: string;
    /** Open Graph type. */
    type?: "website" | "article";
    /** Exclude from search indexes (private/app/utility pages). */
    noindex?: boolean;
    /** Optional JSON-LD structured data (object or array of objects). */
    jsonLd?: object | object[];
};

/**
 * Renders SEO + social head tags. React 19 hoists <title>/<meta>/<link> from a
 * component body into <head>, so this works without a helmet library.
 *
 * Note: for non-JS social scrapers, these tags only exist after hydration —
 * see the prerender step (item 4) to bake them into the static HTML per route.
 */
export default function PageMeta({
    title,
    description = DEFAULT_DESCRIPTION,
    path,
    image = DEFAULT_OG_IMAGE,
    type = "website",
    noindex = false,
    jsonLd,
}: Props) {
    const location = useLocation();
    const url = absoluteUrl(path ?? location.pathname);
    const ogImage = image.startsWith("http") ? image : absoluteUrl(image);

    return (
        <>
            <title>{title}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={url} />
            {noindex ? <meta name="robots" content="noindex, nofollow" /> : null}

            {/* Open Graph */}
            <meta property="og:type" content={type} />
            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={url} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:image:alt" content={title} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content={TWITTER_HANDLE} />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={ogImage} />

            {jsonLd ? (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            ) : null}
        </>
    );
}
