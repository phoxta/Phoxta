import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

/**
 * Phoxta's own operating data.
 *
 * The operating console manages a TENANT: every table it touches is behind RLS
 * scoped to one organization. That is right for a blueprint business and no use
 * for running the platform, where every question — how many customers, what did
 * we sell, who is churning — spans tenants.
 *
 * These read through security-definer RPCs (0090) that check platform admin
 * membership first, rather than widening tenant RLS. A non-admin gets empty
 * results, not an error, so the surface reveals nothing about itself.
 */

export type PlatformOverview = {
  tenants_total: number;
  tenants_active: number;
  tenants_new_30d: number;
  subs_active: number;
  purchases_total: number;
  revenue_cents: number;
  revenue_30d_cents: number;
  leads_total: number;
  leads_new_30d: number;
  blueprints_live: number;
  domains_live: number;
  ai_tokens_30d: number;
};

export type PlatformTenant = {
  id: string;
  name: string;
  slug: string | null;
  vertical: string | null;
  stage: string;
  created_at: string;
  plan: string | null;
  sub_status: string | null;
  domains_live: number;
  tokens_30d: number;
};

export type PlatformPurchase = {
  id: string;
  organization_id: string | null;
  org_name: string | null;
  blueprint_name: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
};

export async function isPlatformAdmin(): Promise<boolean> {
  const { data } = await supabase.rpc("app_is_platform_admin");
  return data === true;
}

export async function fetchPlatformOverview(): Promise<{ data: PlatformOverview | null; error: string | null }> {
  const { data, error } = await supabase.rpc("app_platform_overview");
  if (error) return { data: null, error: friendlyError(error.message) };
  // A non-admin gets {} rather than a row — treat that as "no access", not zeroes,
  // so the UI never shows a confident 0 customers to someone who simply cannot see.
  const o = (data ?? {}) as Partial<PlatformOverview>;
  if (o.tenants_total == null) return { data: null, error: null };
  return { data: o as PlatformOverview, error: null };
}

export async function fetchPlatformTenants(limit = 200): Promise<{ data: PlatformTenant[]; error: string | null }> {
  const { data, error } = await supabase.rpc("app_platform_tenants", { p_limit: limit });
  return { data: (data as PlatformTenant[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function fetchPlatformRevenue(limit = 200): Promise<{ data: PlatformPurchase[]; error: string | null }> {
  const { data, error } = await supabase.rpc("app_platform_revenue", { p_limit: limit });
  return { data: (data as PlatformPurchase[] | null) ?? [], error: friendlyError(error?.message) };
}

/** Who can open the platform console. Membership is granted only by an existing
 *  admin — 0090 originally seeded every business owner, which would have handed
 *  cross-tenant reads to customers; 0091 cut that back to the owner. */
export type PlatformAdmin = { user_id: string; email: string; note: string; created_at: string };

export async function fetchPlatformAdmins(): Promise<{ data: PlatformAdmin[]; error: string | null }> {
  const { data, error } = await supabase.rpc("app_platform_admins");
  return { data: (data as PlatformAdmin[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function addPlatformAdmin(email: string): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc("app_platform_admin_add", { p_email: email });
  if (error) return { ok: false, error: friendlyError(error.message) };
  const r = (data ?? {}) as { ok?: boolean; error?: string };
  return { ok: !!r.ok, error: r.ok ? null : (r.error ?? "Could not add that admin.") };
}

export async function removePlatformAdmin(userId: string): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc("app_platform_admin_remove", { p_user: userId });
  if (error) return { ok: false, error: friendlyError(error.message) };
  const r = (data ?? {}) as { ok?: boolean; error?: string };
  return { ok: !!r.ok, error: r.ok ? null : (r.error ?? "Could not remove that admin.") };
}
