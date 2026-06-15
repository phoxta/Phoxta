import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

export type Subscription = {
  id: string;
  plan: "starter" | "growth" | "scale" | "enterprise";
  status: "trialing" | "active" | "past_due" | "canceled";
  amount_cents: number;
  currency: string;
  current_period_end: string | null;
  organizations: { name: string } | null;
};

/** Subscriptions for every business the user belongs to (RLS scopes by membership). */
export async function listMySubscriptions(): Promise<{ data: Subscription[]; error: string | null }> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, plan, status, amount_cents, currency, current_period_end, organizations(name)")
    .order("created_at", { ascending: true });
  return { data: (data as unknown as Subscription[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function getSubscriptionForOrg(orgId: string): Promise<{ data: Subscription | null; error: string | null }> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, plan, status, amount_cents, currency, current_period_end, organizations(name)")
    .eq("organization_id", orgId)
    .maybeSingle();
  return { data: (data as unknown as Subscription | null) ?? null, error: friendlyError(error?.message) };
}

export type Purchase = {
  id: string;
  amount_cents: number;
  currency: string;
  status: "pending" | "paid" | "refunded" | "failed";
  created_at: string;
  blueprints: { name: string } | null;
  organizations: { name: string } | null;
};

/** The signed-in buyer's purchase history (RLS: own rows). */
export async function listMyPurchases(): Promise<{ data: Purchase[]; error: string | null }> {
  const { data, error } = await supabase
    .from("purchases")
    .select("id, amount_cents, currency, status, created_at, blueprints(name), organizations(name)")
    .order("created_at", { ascending: false });
  return { data: (data as unknown as Purchase[] | null) ?? [], error: friendlyError(error?.message) };
}
