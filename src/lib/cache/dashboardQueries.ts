// Shared, reusable dashboard reads — the single source of truth for each query's
// cache KEY and FETCHER. Both the pages that render the data AND the idle warmer
// (src/lib/cache/warmDashboard.ts) import these descriptors, so warming always
// pre-populates the exact cache entry a page will read (no key drift, no double
// fetch of the same data under two keys).
//
// Each fetcher unwraps the repo's standard `{ data, error }` db result, throwing on
// error so useCachedData surfaces it.

import { getMyProfile } from "@/lib/db/profile";
import { listMyOrganizations } from "@/lib/db/organizations";
import { listMyInvitations, listNotifications } from "@/lib/db/collaboration";
import { listAiUsageThisMonth } from "@/lib/db/ai";
import { listMySubscriptions, listMyPurchases } from "@/lib/db/billing";
import { listBlueprints } from "@/lib/db/marketplace";
import { getMyMatchProfile, listOpenProfiles, listMyMatches, type MatchProfile, type Match } from "@/lib/db/matching";

export type CacheQuery<T> = { key: string; fetch: () => Promise<T> };

/**
 * Default freshness window for the kept-alive top pages. <Activity> tears down and
 * re-runs a page's effects on every hide→show, so without a TTL useCachedData would
 * re-hit the backend on every quick navigation. 60s keeps fast back-and-forth
 * instant while still refreshing when you return after a while.
 */
export const DASHBOARD_TTL = 60_000;

async function unwrap<T>(p: Promise<{ data: T; error: string | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error);
  return data;
}

function query<T>(key: string, fetch: () => Promise<T>): CacheQuery<T> {
  return { key, fetch };
}

/** Signed-in user's profile (shell + Home + Settings). */
export const profileQuery = query("profile", () => unwrap(getMyProfile()));

/** Businesses the user can access — shared by Home, Businesses, Assistant, Studio. */
export const organizationsQuery = query("organizations", () => unwrap(listMyOrganizations()));

/** Pending collaboration invitations (Businesses). */
export const invitationsQuery = query("invitations", () => unwrap(listMyInvitations()));

/** Sidebar notifications (shell). */
export const notificationsQuery = query("notifications", () => unwrap(listNotifications()));

/** This month's assistant token usage (Home + Billing). */
export const aiUsageMonthQuery = query("ai.usage.month", () => unwrap(listAiUsageThisMonth()));

/** Marketplace blueprint catalog. */
export const marketplaceBlueprintsQuery = query("marketplace.blueprints", () => unwrap(listBlueprints()));

/** Billing overview: subscriptions + purchases + this month's AI usage. */
export const billingQuery = query("billing", async () => {
  const [s, p, a] = await Promise.all([listMySubscriptions(), listMyPurchases(), listAiUsageThisMonth()]);
  if (s.error) throw new Error(s.error);
  return { subs: s.data, purchases: p.data, aiUsage: a.data };
});

/** Network / matching page: my match profile + open people + my matches (user-scoped). */
export type NetworkData = { profile: MatchProfile | null; people: MatchProfile[]; matches: Match[] };
export const networkQuery = (userId: string): CacheQuery<NetworkData> =>
  query(`network:${userId}`, async () => {
    const [mine, open, mm] = await Promise.all([getMyMatchProfile(userId), listOpenProfiles(userId), listMyMatches()]);
    if (mine.error) throw new Error(mine.error);
    return { profile: mine.data, people: open.data, matches: mm.data };
  });
