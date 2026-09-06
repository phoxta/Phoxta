/**
 * The business identity. Everything that names the brand, its host or its slug
 * reads from here so a rename is a one-line change and no stale literal can
 * survive in copy, metadata or generated files.
 */
export const BRAND = {
    /** Visible brand name: wordmark, page titles, copyright, meta. */
    name: "Ferne",
    /** Marketplace blueprint slug, Vercel project name, folder name. */
    slug: "ferne",
    /** Canonical public host; buyer tenants live at <tenant>.<host>. */
    host: "ferne.phoxta.com",
    /** Legal entity shown in the footer. */
    legalName: "Ferne Botanicals Ltd",
    tagline: "Botanical skincare with traceable ingredients",
    description:
        "Small-batch botanical skincare, formulated in Birmingham and grown by farms we can name.",
} as const;

export const SITE_URL = `https://${BRAND.host}`;

/**
 * Storefront commerce rules the shopper sees before checkout. These are display
 * defaults: the ORDER is priced server-side by `app_place_order` from the
 * tenant's own catalogue and promo codes, so nothing here can move a real total.
 */
export const STORE = {
    /** Spend (in minor units) that unlocks free standard delivery. */
    freeShippingThresholdCents: 4000,
    /** Delivery options offered at checkout. `priceCents` is added at checkout. */
    shipping: [
        { id: "standard", name: "Standard", eta: "3–5 working days", priceCents: 395 },
        { id: "express", name: "Express", eta: "Next working day", priceCents: 695 },
        { id: "collect", name: "Collect in store", eta: "Ready in 2 hours · Birmingham", priceCents: 0 },
    ],
} as const;

export type ShippingOption = (typeof STORE.shipping)[number];
