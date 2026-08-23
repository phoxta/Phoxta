/**
 * Site-wide marketplace promotion — single source of truth.
 *
 * Every surface that shows a business price (homepage listing cards, public
 * marketplace grid, dashboard marketplace list + detail) and the top-of-site
 * announcement banner read from here, so ending or changing the promo is a
 * one-line edit: flip `active` (or change `percentOff`) and every strikethrough,
 * discounted price and banner updates together.
 *
 * Note: blueprint purchase is provisioning-only today (no card charge at
 * "Make it yours"), so the discount is applied at display level. If a paid
 * checkout is added later, it must read `promoPriceCents` too.
 */
export const PROMO = {
  // Promo ended 2026-08-18 — replaced by "first month of Growth free" on every
  // purchased business (see paystack-webhook). Flip to re-run a price promo;
  // keep paystack-checkout's PROMO_ACTIVE in sync.
  active: false,
  percentOff: 35,
  /** Short badge/label, e.g. shown on cards. */
  label: "35% OFF",
} as const;

/** The discounted price in cents (rounded to the nearest cent). */
export function promoPriceCents(cents: number): number {
  return Math.round(cents * (1 - PROMO.percentOff / 100));
}

/** Discount a whole-pound amount and format it, e.g. 4500 → "£2,925". */
export function promoPriceDollars(pounds: number): string {
  return `£${Math.round(pounds * (1 - PROMO.percentOff / 100)).toLocaleString()}`;
}
