/**
 * Every URL the storefront serves, in match order. This is the single source
 * of truth for the router, the sitemap generator and the parity harness.
 *
 * Only experiences are routed today; the other verticals' pages are ported
 * and ready but deliberately absent from this list.
 */

export type LayoutKey =
    | "listing-type"
    | "other-pages"
    | "account"
    | "auth"
    | "experience-listings"
    | "experience-search"
    | "experience-categories";

export type PageKey =
    | "home-experience"
    | "experience-detail"
    | "experience-search"
    | "experience-categories"
    | "about"
    | "contact"
    | "blog"
    | "blog-detail"
    | "authors"
    | "author-detail"
    | "checkout"
    | "pay-done"
    | "manage-booking"
    | "account"
    | "not-found";

export interface RouteEntry {
    path: string;
    page: PageKey;
    layout: LayoutKey;
    /** Include in sitemap.xml (public, indexable, no params). */
    sitemap?: boolean;
}

export const ROUTES: readonly RouteEntry[] = [
    // Home (experiences)
    { path: "/", page: "home-experience", layout: "listing-type", sitemap: true },
    { path: "/experience", page: "home-experience", layout: "listing-type", sitemap: true },
    { path: "/experience-listings/:handle", page: "experience-detail", layout: "experience-listings" },
    { path: "/experience-search", page: "experience-search", layout: "experience-search", sitemap: true },
    { path: "/experience-categories", page: "experience-categories", layout: "experience-categories", sitemap: true },
    { path: "/experience-categories/:handle", page: "experience-categories", layout: "experience-categories" },
    // Other pages
    { path: "/about", page: "about", layout: "other-pages", sitemap: true },
    { path: "/contact", page: "contact", layout: "other-pages", sitemap: true },
    { path: "/blog", page: "blog", layout: "other-pages", sitemap: true },
    { path: "/blog/:handle", page: "blog-detail", layout: "other-pages" },
    { path: "/authors", page: "authors", layout: "other-pages" },
    { path: "/authors/:handle", page: "author-detail", layout: "other-pages" },
    { path: "/checkout", page: "checkout", layout: "other-pages" },
    { path: "/pay-done", page: "pay-done", layout: "other-pages" },
    { path: "/manage-booking", page: "manage-booking", layout: "other-pages" },
    // Account (one component; the active tab is derived from the pathname)
    { path: "/account", page: "account", layout: "account" },
    { path: "/account-billing", page: "account", layout: "account" },
    { path: "/account-password", page: "account", layout: "account" },
    { path: "/account-savelists", page: "account", layout: "account" },
    // Auth
    { path: "/login", page: "account", layout: "auth" },
    { path: "/signup", page: "account", layout: "auth" },
    { path: "/forgot-password", page: "account", layout: "auth" },
    // Catch-all
    { path: "*", page: "not-found", layout: "other-pages" },
] as const;

export const SITEMAP_PATHS: readonly string[] = ROUTES.filter((r) => r.sitemap).map((r) => r.path);
