/**
 * The one place a blueprint's preview image is decided.
 *
 * There were three answers to "what does this business look like?": the public
 * homepage used curated storefront screenshots keyed by slug, while /marketplace
 * and the dashboard marketplace both used blueprints.cover_url, which holds
 * generic Unsplash stock. Same business, different picture depending on which
 * page you were on — and the dashboard's "Your Business" card inherited the
 * stock one.
 *
 * The screenshots win: they show the actual storefront a buyer is getting,
 * which is the whole point of a preview. cover_url stays as the fallback so a
 * blueprint added later still renders something without waiting for someone to
 * take a screenshot and edit this file.
 */

/** Curated screenshots of the real storefronts, keyed by blueprint slug. */
const SLUG_COVERS: Record<string, string> = {
  carento: "/assets/imgs/pages/FS1.webp",
  "niche-apparel": "/assets/imgs/pages/FS.webp",
  travel: "/assets/imgs/pages/FS2.webp",
  "restaurant-orders": "/assets/imgs/pages/FS3.webp",
  gearo: "/assets/imgs/pages/FS4.webp",
};

/** Last resort, so no surface ever renders a broken image. */
export const FALLBACK_COVER = "/assets/imgs/pages/FS.webp";

/**
 * Preview image for a blueprint: curated screenshot, then whatever the DB
 * carries, then the generic fallback.
 */
export function blueprintCover(slug?: string | null, dbCoverUrl?: string | null): string {
  if (slug && SLUG_COVERS[slug]) return SLUG_COVERS[slug];
  return dbCoverUrl || FALLBACK_COVER;
}
