import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

/** Aggregate counts across the operating tables for the console overview. */
export type OpsSummary = {
  contacts: number;
  customers: number;
  products: number;
  low_stock: number;
  orders: number;
  revenue_cents: number;
  unfulfilled: number;
  outstanding_cents: number;
  open_tickets: number;
  ai_deflected: number;
  upcoming_bookings: number;
  active_subs: number;
  published_pages: number;
};

const EMPTY: OpsSummary = {
  contacts: 0,
  customers: 0,
  products: 0,
  low_stock: 0,
  orders: 0,
  revenue_cents: 0,
  unfulfilled: 0,
  outstanding_cents: 0,
  open_tickets: 0,
  ai_deflected: 0,
  upcoming_bookings: 0,
  active_subs: 0,
  published_pages: 0,
};

export async function getOpsSummary(orgId: string): Promise<{ data: OpsSummary; error: string | null }> {
  const { data, error } = await supabase.rpc("app_org_ops_summary", { p_org: orgId });
  if (error) return { data: EMPTY, error: friendlyError(error.message) };
  return { data: { ...EMPTY, ...((data as Partial<OpsSummary> | null) ?? {}) }, error: null };
}

export type AnalyticsEvent = { id: string; name: string; props: Record<string, unknown>; created_at: string };

export async function listRecentEvents(orgId: string, limit = 25): Promise<{ data: AnalyticsEvent[]; error: string | null }> {
  const { data, error } = await supabase
    .from("analytics_events")
    .select("id, name, props, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data: (data as AnalyticsEvent[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function logEvent(
  orgId: string,
  name: string,
  props: Record<string, unknown> = {},
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("analytics_events").insert({ organization_id: orgId, name, props });
  return { error: friendlyError(error?.message) };
}
