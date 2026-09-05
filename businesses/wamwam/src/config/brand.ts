/**
 * The business identity. Everything that names the brand, its host or its slug
 * reads from here so a rename is a one-line change and no stale literal can
 * survive in copy, metadata or generated files.
 */
export const BRAND = {
    /** Visible brand name: wordmark, page titles, copyright, meta. */
    name: "WamWam",
    /** Marketplace blueprint slug, Vercel project name, folder name. */
    slug: "wamwam",
    /** Canonical public host; buyer tenants live at <tenant>.<host>. */
    host: "wamwam.phoxta.com",
    /** Used in <title> and the meta description. */
    tagline: "Book stays, flights, cars & experiences",
    description: "WamWam by Phoxta — book stays, flights, car rentals and experiences around the world.",
} as const;

export const SITE_URL = `https://${BRAND.host}`;
