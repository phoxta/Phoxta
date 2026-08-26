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

// ── Operations ─────────────────────────────────────────────────────────────
// Everything below is a WRITE across tenants. Each RPC re-checks admin
// membership server-side and appends to platform_audit, so the console never
// needs table permissions and every action has an owner.

const call = async (fn: string, args: Record<string, unknown>): Promise<{ ok: boolean; error: string | null }> => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { ok: false, error: friendlyError(error.message) };
  const r = (data ?? {}) as { ok?: boolean; error?: string };
  return { ok: !!r.ok, error: r.ok ? null : (r.error ?? "That didn't work.") };
};

export type PlatformLead = {
  id: string; source: string; name: string; email: string; phone: string;
  message: string; status: string; notes: string; created_at: string;
};
export const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;

export async function fetchPlatformLeads(limit = 200): Promise<{ data: PlatformLead[]; error: string | null }> {
  const { data, error } = await supabase.rpc("app_platform_leads", { p_limit: limit });
  return { data: (data as PlatformLead[] | null) ?? [], error: friendlyError(error?.message) };
}
export const savePlatformLead = (id: string, status: string | null, notes: string | null) =>
  call("app_platform_lead_save", { p_id: id, p_status: status, p_notes: notes });

export type PlatformBlueprint = {
  id: string; slug: string; name: string; tagline: string; vertical: string;
  price_cents: number; currency: string; status: string; demo_url: string | null;
};

export async function fetchPlatformBlueprints(): Promise<{ data: PlatformBlueprint[]; error: string | null }> {
  const { data, error } = await supabase.rpc("app_platform_blueprints");
  return { data: (data as PlatformBlueprint[] | null) ?? [], error: friendlyError(error?.message) };
}
export const savePlatformBlueprint = (
  id: string, name: string | null, tagline: string | null, priceCents: number | null, status: string | null,
) => call("app_platform_blueprint_save", { p_id: id, p_name: name, p_tagline: tagline, p_price_cents: priceCents, p_status: status });

export const setTenantStage = (orgId: string, stage: string) =>
  call("app_platform_tenant_stage", { p_org: orgId, p_stage: stage });

export const setTenantSubscription = (orgId: string, plan: string | null, status: string | null) =>
  call("app_platform_subscription_set", { p_org: orgId, p_plan: plan, p_status: status });

/** Grants the admin a real, revocable membership rather than impersonating —
 *  the customer's team can see it and the audit log records who granted it. */
export const setSupportAccess = (orgId: string, grant: boolean) =>
  call("app_platform_support_access", { p_org: orgId, p_grant: grant });

export type PlatformMargin = {
  organization_id: string; name: string;
  revenue_cents: number; ai_cost_cents: number; tokens: number;
};

export async function fetchPlatformMargin(days = 30): Promise<{ data: PlatformMargin[]; error: string | null }> {
  const { data, error } = await supabase.rpc("app_platform_margin", { p_days: days });
  return { data: (data as PlatformMargin[] | null) ?? [], error: friendlyError(error?.message) };
}

export type PlatformAuditRow = {
  id: string; actor_email: string | null; action: string; target: string;
  detail: Record<string, unknown>; created_at: string;
};

export async function fetchPlatformAudit(limit = 100): Promise<{ data: PlatformAuditRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc("app_platform_audit", { p_limit: limit });
  return { data: (data as PlatformAuditRow[] | null) ?? [], error: friendlyError(error?.message) };
}

// ── Users (auth roster) ─────────────────────────────────────────────────────
// GoTrue admin operations — list every account, create one, mint a recovery
// link/OTP, ban — live in the platform-users edge function, because they need
// the service role. The function re-checks platform_admins membership and
// audits every write; these are thin wrappers.

export type OrgRole = "owner" | "admin" | "staff" | "viewer";

/** One business a user can reach, and what they can do in it. */
export type UserAccess = { orgId: string; name: string; role: OrgRole };

export type PlatformUser = {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
  banned: boolean;
  /** Business names, for the roster line. */
  orgs: string[];
  /** The same memberships with ids and roles, for the access controls. */
  access: UserAccess[];
};

export type PlatformBusiness = { id: string; name: string; vertical: string | null; stage: string | null };

const usersFn = async (body: Record<string, unknown>): Promise<{ data: Record<string, unknown> | null; error: string | null }> => {
  const { data, error } = await supabase.functions.invoke("platform-users", { body });
  if (error) {
    let msg = error.message;
    try { const ctx = await (error as { context?: Response }).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* keep */ }
    return { data: null, error: friendlyError(msg) };
  }
  const d = (data ?? {}) as Record<string, unknown>;
  if (typeof d.error === "string") return { data: null, error: d.error };
  return { data: d, error: null };
};

export async function listPlatformUsers(page = 1, q = ""): Promise<{
  users: PlatformUser[]; total: number; error: string | null;
}> {
  const { data, error } = await usersFn({ action: "list", page, q });
  if (error || !data) return { users: [], total: 0, error };
  return { users: (data.users as PlatformUser[]) ?? [], total: Number(data.total) || 0, error: null };
}

/** Creates a confirmed account. The credentials come back exactly once. */
export async function createPlatformUser(email: string, fullName: string, password?: string): Promise<{
  email: string | null; password: string | null; error: string | null;
}> {
  const { data, error } = await usersFn({ action: "create", email, fullName, password: password || undefined });
  if (error || !data) return { email: null, password: null, error };
  return { email: String(data.email), password: String(data.password), error: null };
}

/** Password-reset link + OTP for the admin to relay to the customer directly
 *  (outbound email is not dependable right now, so nothing is "sent"). */
export async function generateRecoveryLink(email: string): Promise<{
  link: string | null; otp: string | null; error: string | null;
}> {
  const { data, error } = await usersFn({ action: "recovery", email });
  if (error || !data) return { link: null, otp: null, error };
  return { link: (data.link as string) ?? null, otp: (data.otp as string) ?? null, error: null };
}

export async function setUserBanned(userId: string, ban: boolean): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await usersFn({ action: "ban", userId, ban });
  return { ok: !!data?.ok, error };
}

// ── Payment tests ───────────────────────────────────────────────────────────

/**
 * One probe of the payment path.
 *
 * `webhook_seen_at` is the field that matters. A charged card proves Stripe
 * took the money; only this proves stripe-webhook ran — and that is the half
 * that provisions businesses. A test that is `paid` with no webhook timestamp
 * is the exact shape of a live key wired to a test-mode webhook secret.
 */
export type PaymentTest = {
  id: string;
  amount_cents: number;
  currency: string;
  note: string;
  status: "pending" | "paid" | "failed";
  stripe_session_id: string | null;
  webhook_seen_at: string | null;
  created_at: string;
};

export async function listPaymentTests(limit = 10): Promise<{ data: PaymentTest[]; error: string | null }> {
  const { data, error } = await supabase
    .from("payment_tests")
    .select("id, amount_cents, currency, note, status, stripe_session_id, webhook_seen_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data: (data as PaymentTest[] | null) ?? [], error: friendlyError(error?.message) };
}

/** Start a test payment. Returns the Stripe Checkout URL to send the browser to. */
export async function startPaymentTest(
  amountPence: number,
  note: string,
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    body: {
      kind: "test",
      amountPence,
      note,
      returnUrl: `${window.location.origin}/dashboard/platform?section=Payments`,
    },
  });
  if (error) {
    let msg = error.message;
    try { const ctx = await (error as { context?: Response }).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* keep */ }
    return { url: null, error: friendlyError(msg) };
  }
  const d = (data ?? {}) as { url?: string; error?: string };
  if (d.error) return { url: null, error: d.error };
  return { url: d.url ?? null, error: null };
}

/**
 * Which businesses a user can be given access to.
 *
 * Every console in the product is reached through organization_memberships, so
 * this is the whole of "give someone access": there is no separate permission
 * to set, and an account with no membership has nothing to open.
 */
export async function listPlatformBusinesses(q = ""): Promise<{
  data: PlatformBusiness[]; error: string | null;
}> {
  const { data, error } = await usersFn({ action: "businesses", q });
  if (error || !data) return { data: [], error };
  return { data: (data.businesses as PlatformBusiness[]) ?? [], error: null };
}

/** Give a user access to a business, or change the role they already have. */
export async function grantAccess(userId: string, orgId: string, role: OrgRole = "staff"): Promise<{ error: string | null }> {
  const { error } = await usersFn({ action: "grant", userId, orgId, role });
  return { error };
}

export async function revokeAccess(userId: string, orgId: string): Promise<{ error: string | null }> {
  const { error } = await usersFn({ action: "revoke", userId, orgId });
  return { error };
}

/* ── The background loop ─────────────────────────────────────────────────── */

/**
 * Every scheduled worker records that it ran.
 *
 * This exists because the background loop moved hosts and the only thing that
 * would have revealed it stopping was a dashboard on the old host going quiet.
 * A loop meant to run unattended has to say so, in the product, where someone
 * will actually look.
 */
export type Heartbeat = {
  worker: string;
  last_run_at: string;
  last_ok_at: string | null;
  last_status: string;
  last_detail: string;
  consecutive_failures: number;
  runs: number;
};

export async function listHeartbeats(): Promise<{ data: Heartbeat[]; error: string | null }> {
  const { data, error } = await supabase
    .from("cron_heartbeats").select("*").order("worker");
  return { data: (data as Heartbeat[] | null) ?? [], error: friendlyError(error?.message) };
}
