// Shared, reusable dashboard reads — the single source of truth for each query's
// cache KEY and FETCHER. Both the pages that render the data AND the idle warmer
// (src/lib/cache/warmDashboard.ts) import these descriptors, so warming always
// pre-populates the exact cache entry a page will read (no key drift, no double
// fetch of the same data under two keys).
//
// Each fetcher unwraps the repo's standard `{ data, error }` db result, throwing on
// error so useCachedData surfaces it.

import { supabase } from "@/lib/supabaseClient";
import { getMyProfile } from "@/lib/db/profile";
import { listMyOrganizations } from "@/lib/db/organizations";
import { listMyInvitations, listNotifications } from "@/lib/db/collaboration";
import { listAiUsageThisMonth } from "@/lib/db/ai";
import { listMySubscriptions, listMyPurchases } from "@/lib/db/billing";
import { listBlueprints } from "@/lib/db/marketplace";
import { getMyMatchProfile, listOpenProfiles, listMyMatches, type MatchProfile, type Match } from "@/lib/db/matching";
import { listDomains, type Domain } from "@/lib/db/domains";

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

/** Real 30-day revenue across every business the user belongs to (RLS scopes
 *  both tables to their orgs): paid/fulfilled orders + confirmed/completed
 *  reservations. Replaces the hardcoded $0 tile the audit flagged. */
export const revenue30Query = query("revenue.30d", async () => {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const [orders, reservations] = await Promise.all([
    supabase.from("orders").select("total_cents").in("status", ["paid", "fulfilled"]).gte("created_at", since),
    supabase.from("reservations").select("total_cents").in("status", ["confirmed", "completed"]).gte("created_at", since),
  ]);
  const sum = (rows: { total_cents: number }[] | null) => (rows ?? []).reduce((s, r) => s + (r.total_cents || 0), 0);
  return sum(orders.data) + sum(reservations.data);
});

/** Windowed operating metrics for one business — rpc app_org_ops_window (0073).
 *  Money fields are cents in the org's currency (also returned). `_prev` fields
 *  are the immediately preceding window of the same length, for delta arrows. */
export type OpsWindow = {
  currency: string;
  revenue: number;
  revenue_prev: number;
  orders: number;
  orders_prev: number;
  unfulfilled: number;
  unread: number;
  escalated: number;
  approvals: number;
  low_stock: number;
  arrivals_today: number;
  departures_today: number;
  bookings_today: number;
  overdue_invoices: number;
  reservations_pending: number;
  reservations_upcoming: number;
};

const EMPTY_OPS_WINDOW: OpsWindow = {
  currency: "USD",
  revenue: 0,
  revenue_prev: 0,
  orders: 0,
  orders_prev: 0,
  unfulfilled: 0,
  unread: 0,
  escalated: 0,
  approvals: 0,
  low_stock: 0,
  arrivals_today: 0,
  departures_today: 0,
  bookings_today: 0,
  overdue_invoices: 0,
  reservations_pending: 0,
  reservations_upcoming: 0,
};

/** Fetch the 30-day (default) ops window for an org. Throws on error so
 *  useCachedData / callers surface it; missing keys fall back to 0. */
export async function getOpsWindow(orgId: string, days = 30): Promise<OpsWindow> {
  const { data, error } = await supabase.rpc("app_org_ops_window", { p_org: orgId, p_days: days });
  if (error) throw new Error(error.message);
  return { ...EMPTY_OPS_WINDOW, ...((data as Partial<OpsWindow> | null) ?? {}) };
}

// ---------- Work board (Overview) ----------

/** The four board columns, in display order. */
export const WORK_COLUMNS = [
  { key: "todo", label: "To do" },
  { key: "doing", label: "In Progress" },
  { key: "review", label: "Under Review" },
  { key: "ready", label: "Ready" },
] as const;
export type WorkColumn = (typeof WORK_COLUMNS)[number]["key"];

/** A preview attachment on a work card. */
export type WorkMedia = { kind: "image" | "video" | "audio"; url: string };

/** One piece of outstanding work, derived from a real row somewhere in the app
 *  (a conversation, order, invoice, reservation, agent action …). */
export type WorkCard = {
  id: string;
  col: WorkColumn;
  /** Console module key — the client hides cards for modules this vertical
   *  doesn't enable. */
  module: string;
  /** Two chips: the module, then this record's own status/type. */
  tags: string[];
  title: string;
  detail: string;
  /** Preview media from the underlying record: product shots, a call recording,
   *  or video. `kind` is derived from the URL server-side, so a video dropped
   *  into a product gallery renders as one without a schema change. */
  media: WorkMedia[];
  who: string;
  who_role: string;
  occurred_at: string | null;
  amount_cents: number | null;
  /** Real message count (conversation/ticket threads). */
  comments: number;
  /** Real attached records (order or invoice line items, reserved units). */
  links: number;
  /** 0-100, only where a genuine ratio exists (a campaign's sent-vs-audience, a
   *  stay that is part-way through). null everywhere else — the meter is not
   *  drawn rather than invented. */
  progress: number | null;
  /** Console-relative route to the underlying record. */
  to_path: string;
  urgent: boolean;
};

export type WorkBoard = {
  /** True totals per column — a column can show "17" while listing 8 cards. */
  counts: Record<WorkColumn, number>;
  cards: WorkCard[];
};

const EMPTY_COUNTS: Record<WorkColumn, number> = { todo: 0, doing: 0, review: 0, ready: 0 };

/** Fetch the console work board. The RPC omits columns with no items, so counts
 *  are merged onto a zeroed base rather than trusted to be complete. */
export async function getWorkBoard(orgId: string, limit = 8): Promise<WorkBoard> {
  const { data, error } = await supabase.rpc("app_org_work_board", { p_org: orgId, p_limit: limit });
  if (error) throw new Error(error.message);
  const raw = (data ?? {}) as Partial<WorkBoard>;
  return {
    counts: { ...EMPTY_COUNTS, ...(raw.counts ?? {}) },
    cards: Array.isArray(raw.cards) ? raw.cards : [],
  };
}

/** Domains for one business — the Phoxta subdomain plus any linked/bought ones.
 *  Read by Business details ("Site & domains") and by the operating console's
 *  "View live site" link, so both share one cache entry under this key. */
export const domainsQuery = (orgId: string): CacheQuery<Domain[]> =>
  query(`domains:${orgId}`, async () => (await listDomains(orgId)).data);

/** The canonical public address for a business: the primary live domain, else a
 *  live custom domain, else any live one. Mirrors the "Live at" precedence on
 *  Business details so the console never disagrees with it. */
export function primaryLiveDomain(domains: Domain[] | undefined): Domain | null {
  const live = (domains ?? []).filter((d) => d.status === "live");
  return live.find((d) => d.is_primary) ?? live.find((d) => d.kind === "custom") ?? live[0] ?? null;
}

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
