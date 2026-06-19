import { ORGANIZATION_JSONLD, WEBSITE_JSONLD } from "@/seo/seo.config";

/**
 * Site-wide structured data (Organization + WebSite). Rendered once inside the
 * marketing layout so it appears on every public page but not the private app.
 */
export default function SiteJsonLd() {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify([ORGANIZATION_JSONLD, WEBSITE_JSONLD]),
            }}
        />
    );
}
