/**
 * Central SEO configuration for the Phoxta marketing site.
 *
 * SITE_URL is the canonical production origin (no trailing slash). Override per
 * environment with `VITE_SITE_URL` so canonical/og:url tags point at the right
 * host on preview deployments.
 */
export const SITE_URL = (
    import.meta.env.VITE_SITE_URL || "https://www.phoxta.com"
).replace(/\/$/, "");

export const SITE_NAME = "Phoxta";
export const TWITTER_HANDLE = "@phoxta";

export const DEFAULT_TITLE = "Phoxta — Own a validated, AI-powered business";
export const TITLE_SUFFIX = " | Phoxta";

export const DEFAULT_DESCRIPTION =
    "Phoxta is a marketplace of validated, AI-powered businesses you can own and run from day one. Pick a business, make it yours, and go from launch to revenue in days — not months.";

/**
 * Default social share image — a purpose-built 1200×630 card.
 * Regenerate with `npm run og-image` (scripts/generate-og-image.mjs).
 */
export const DEFAULT_OG_IMAGE = "/assets/imgs/template/og-image.jpg";

/** Build an absolute URL from a site-root-relative path. */
export const absoluteUrl = (path = "/") =>
    `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Organization structured data (rendered once, site-wide). */
export const ORGANIZATION_JSONLD = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Phoxta",
    legalName: "Phoxta Holdings Ltd.",
    url: SITE_URL,
    logo: absoluteUrl("/assets/imgs/template/logo/logo-d.svg"),
    description: DEFAULT_DESCRIPTION,
    email: "hello@phoxta.com",
    address: {
        "@type": "PostalAddress",
        addressLocality: "London",
        addressCountry: "GB",
    },
    sameAs: [
        "https://www.linkedin.com/company/phoxta",
        "https://x.com/phoxta",
    ],
};

/** WebSite structured data with a sitelinks search box hint. */
export const WEBSITE_JSONLD = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
        "@type": "SearchAction",
        target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/marketplace?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
    },
};

/** Public, indexable marketing routes — the source of truth for the sitemap. */
export const SITEMAP_ROUTES: { path: string; priority: number; changefreq: string }[] = [
    { path: "/", priority: 1.0, changefreq: "weekly" },
    { path: "/marketplace", priority: 0.9, changefreq: "weekly" },
    { path: "/pricing", priority: 0.8, changefreq: "monthly" },
    { path: "/about", priority: 0.8, changefreq: "monthly" },
    { path: "/invest", priority: 0.7, changefreq: "monthly" },
    { path: "/blog", priority: 0.6, changefreq: "weekly" },
    { path: "/faqs", priority: 0.6, changefreq: "monthly" },
    { path: "/careers", priority: 0.6, changefreq: "monthly" },
    { path: "/contact", priority: 0.7, changefreq: "yearly" },
    { path: "/privacy", priority: 0.3, changefreq: "yearly" },
    { path: "/terms", priority: 0.3, changefreq: "yearly" },
];
