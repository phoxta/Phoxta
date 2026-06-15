import { supabase } from "@/lib/supabaseClient";

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
  return { data: (data as unknown as Subscription[] | null) ?? [], error: error?.message ?? null };
}
