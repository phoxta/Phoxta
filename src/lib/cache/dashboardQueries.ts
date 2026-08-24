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

/** The individual sales that make up those 30 days of revenue, largest first —
 *  same tables and status filters as revenue30Query, so the segments always
 *  sum to the same total. Labelled by customer, the way an owner talks about
 *  an order. */
export const revenueOrders30Query = query("revenue.30d.orders", async () => {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const [orders, reservations] = await Promise.all([
    supabase.from("orders").select("id, customer_name, total_cents").in("status", ["paid", "fulfilled"]).gte("created_at", since),
    supabase.from("reservations").select("id, customer_name, total_cents").in("status", ["confirmed", "completed"]).gte("created_at", since),
  ]);
  type Row = { id: string; customer_name: string | null; total_cents: number };
  return [...((orders.data ?? []) as Row[]), ...((reservations.data ?? []) as Row[])]
    .map((r) => ({ id: r.id, label: String(r.customer_name ?? "").trim() || "Order", cents: r.total_cents || 0 }))
    .sort((a, b) => b.cents - a.cents);
});

/** How many sales those 30 days of revenue came from — same tables, same
 *  status filters as revenue30Query, so the two tiles can never disagree. */
export const orders30Query = query("orders.30d", async () => {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const [orders, reservations] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["paid", "fulfilled"]).gte("created_at", since),
    supabase.from("reservations").select("id", { count: "exact", head: true }).in("status", ["confirmed", "completed"]).gte("created_at", since),
  ]);
  return (orders.count ?? 0) + (reservations.count ?? 0);
});

/** Unread customer conversations across every business the user belongs to
 *  (RLS scopes the table) — the same definition the console's Inbox badge uses. */
export const unreadConvos30Query = query("convos.unread", async () => {
  const { count } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("unread", true)
    .not("is_test", "is", true);
  return count ?? 0;
});

/** Revenue bucketed by day for the last 7 days, oldest first.
 *
 *  The home page charts this. Same sources and same status filters as
 *  revenue30Query so the bars and the headline can never disagree — a chart that
 *  sums to a different number than the figure above it is worse than no chart.
 *  Buckets are built locally so empty days appear as real zeroes rather than
 *  gaps the eye fills in. */
export type DayRevenue = { label: string; iso: string; cents: number };

/** The periods the Sales card can be switched between. */
export type SalesRange = "day" | "week" | "month" | "year";

export const SALES_RANGES: { id: SalesRange; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Last 7 days" },
  { id: "month", label: "Months" },
  { id: "year", label: "Year" },
];

/** YYYY-MM-DD in LOCAL time — sv-SE formats exactly that way. */
const localDay = (d: Date) => d.toLocaleDateString("sv-SE");
const localMonth = (d: Date) => localDay(d).slice(0, 7);

type Shape = { buckets: DayRevenue[]; start: Date; keyOf: (d: Date) => string };

/**
 * The buckets for one period, plus how to file a timestamp into them.
 *
 * Everything buckets in LOCAL time, so "today" means the owner's today rather
 * than UTC's — a sale at 9pm in Lagos belongs to that day, not tomorrow.
 */
function seriesShape(range: SalesRange): Shape {
  const now = new Date();

  if (range === "day") {
    // Six four-hour slots reads at this card size; 24 hourly bars does not.
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const buckets: DayRevenue[] = [];
    for (let h = 0; h < 24; h += 4) {
      const d = new Date(start);
      d.setHours(h);
      buckets.push({ label: String(h).padStart(2, "0"), iso: `${localDay(d)}T${String(h).padStart(2, "0")}`, cents: 0 });
    }
    return {
      buckets,
      start,
      keyOf: (d) => `${localDay(d)}T${String(Math.floor(d.getHours() / 4) * 4).padStart(2, "0")}`,
    };
  }

  if (range === "week") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    const buckets: DayRevenue[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      buckets.push({ label: d.toLocaleDateString(undefined, { weekday: "short" }), iso: localDay(d), cents: 0 });
    }
    return { buckets, start, keyOf: localDay };
  }

  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0, 0);
    const buckets: DayRevenue[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      buckets.push({ label: d.toLocaleDateString(undefined, { month: "short" }), iso: localMonth(d), cents: 0 });
    }
    return { buckets, start, keyOf: localMonth };
  }

  const start = new Date(now.getFullYear() - 4, 0, 1, 0, 0, 0, 0);
  const buckets: DayRevenue[] = [];
  for (let i = 0; i < 5; i++) {
    const y = start.getFullYear() + i;
    buckets.push({ label: String(y), iso: String(y), cents: 0 });
  }
  return { buckets, start, keyOf: (d) => String(d.getFullYear()) };
}

async function fetchSeries(range: SalesRange): Promise<DayRevenue[]> {
  const { buckets, start, keyOf } = seriesShape(range);
  const since = start.toISOString();

  // Same sources and status filters as revenue30Query, so the Sales card and the
  // 30-day figure can never tell different stories about the same money.
  const [orders, reservations] = await Promise.all([
    supabase.from("orders").select("total_cents, created_at").in("status", ["paid", "fulfilled"]).gte("created_at", since),
    supabase.from("reservations").select("total_cents, created_at").in("status", ["confirmed", "completed"]).gte("created_at", since),
  ]);

  const byKey = new Map(buckets.map((b) => [b.iso, b]));
  for (const rows of [orders.data, reservations.data]) {
    for (const r of (rows ?? []) as { total_cents: number; created_at: string }[]) {
      const bucket = byKey.get(keyOf(new Date(r.created_at)));
      if (bucket) bucket.cents += r.total_cents || 0;
    }
  }
  return buckets;
}

/** Revenue split into buckets for one period. Cached per range. */
export function revenueSeriesQuery(range: SalesRange): CacheQuery<DayRevenue[]> {
  return query(`revenue.series.${range}`, () => fetchSeries(range));
}

/** The Sales card's default period — also what the idle warmer pre-loads. */
export const revenue7DailyQuery = revenueSeriesQuery("week");

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
  currency: "GBP",
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

/**
 * Which columns each kind of work card can actually reach.
 *
 * Mirrors app_org_work_move, and exists so the board never offers a drag that
 * is guaranteed to fail: a card whose kind is absent here is not draggable at
 * all, and a column the kind cannot reach is not a drop target. The RPC stays
 * the authority — a booking can only be Ready once it has started, which is a
 * per-row fact the client does not hold — but the obvious refusals never get
 * far enough to become a message.
 *
 * Absent on purpose: invoices and campaigns (sending mails a customer, paid is
 * money), agent actions (approvals are governed and audited), and products,
 * domains, contacts, automation runs and outbound, which the board reports on
 * but which have no stage to move through.
 */
export const WORK_MOVES: Record<string, WorkColumn[]> = {
  conversation: ["todo", "doing", "review", "ready"],
  ticket: ["todo", "review", "ready"],
  order: ["todo", "ready"],
  reservation: ["todo", "doing"],
  booking: ["todo", "doing", "ready"],
};

/** Card ids are "kind:uuid" — the kind is what decides how a move is applied. */
export function workCardKind(cardId: string): string {
  return cardId.split(":")[0] ?? "";
}

/** The columns this card may be dropped into. Empty means "not draggable". */
export function movableColumns(cardId: string): WorkColumn[] {
  return WORK_MOVES[workCardKind(cardId)] ?? [];
}

/**
 * Move one work card to another column.
 *
 * The board's column is derived from each record's real status, so this changes
 * the underlying record — there is no stored kanban state to write. Plenty of
 * moves are not expressible that way (a ticket has no In Progress; a reservation
 * reaches Ready when its dates pass; invoices, campaigns and agent approvals are
 * deliberately out of reach of a drag). The RPC returns `ok: false` with a
 * reason for those rather than pretending, so the caller can put the card back
 * and say why.
 */
export async function moveWorkCard(
  orgId: string, cardId: string, col: WorkColumn,
): Promise<{ ok: boolean; reason?: string }> {
  const { data, error } = await supabase.rpc("app_org_work_move", {
    p_org: orgId, p_card: cardId, p_col: col,
  });
  if (error) return { ok: false, reason: error.message };
  const r = (data ?? {}) as { ok?: boolean; reason?: string };
  return { ok: r.ok === true, reason: r.reason };
}

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

