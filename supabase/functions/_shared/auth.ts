import { adminClient, userClient, type SupabaseClient } from "./supabaseAdmin.ts";
import { json } from "./cors.ts";

export type Org = { id: string; name: string; vertical: string | null };
export type Role = "owner" | "admin" | "member";
export type AuthOk = { userId: string; admin: SupabaseClient; org: Org; role: Role };

/** Roles allowed to take privileged actions (approve agent writes, spend money,
 *  connect/disconnect integrations). Mirrors app_is_org_admin() in the schema. */
const ADMIN_ROLES: readonly string[] = ["owner", "admin"];

export function isAdminRole(role: string | null | undefined): boolean {
  return ADMIN_ROLES.includes(role ?? "");
}

/** Verify the JWT, confirm the user belongs to `organizationId`, and load the org.
 *  Returns either `{ ok }` (carrying the caller's role) or `{ error }` (a
 *  ready-to-return Response).
 *
 *  Pass `opts.requireAdmin` for privileged endpoints — membership alone is NOT
 *  sufficient for actions like approving a queued agent write or placing calls
 *  that bill the shared telephony account. */
export async function authorize(
  req: Request,
  organizationId: string | undefined,
  opts: { requireAdmin?: boolean } = {},
): Promise<{ ok: AuthOk; error?: undefined } | { ok?: undefined; error: Response }> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: json({ error: "Please sign in again." }, 401) };

  const { data: ud, error: ue } = await userClient(token).auth.getUser();
  if (ue || !ud?.user) return { error: json({ error: "Please sign in again." }, 401) };
  if (!organizationId) return { error: json({ error: "Choose a business first." }, 400) };

  const admin = adminClient();
  const { data: m } = await admin
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", ud.user.id)
    .maybeSingle();
  if (!m) return { error: json({ error: "You don't have access to that business." }, 403) };

  const role = ((m as { role?: string }).role ?? "member") as Role;
  if (opts.requireAdmin && !isAdminRole(role)) {
    return { error: json({ error: "Only an owner or admin can do that." }, 403) };
  }

  const { data: org } = await admin
    .from("organizations")
    .select("id, name, vertical")
    .eq("id", organizationId)
    .maybeSingle();
  if (!org) return { error: json({ error: "That business could not be found." }, 404) };

  return { ok: { userId: ud.user.id, admin, org: org as Org, role } };
}

/** Lightweight: just confirm a valid signed-in user (for queue/worker drains).
 *  Additionally allows a trusted server-side scheduler (cron) that presents the
 *  shared `CRON_SECRET` via the `x-cron-secret` header — so queue drains can run
 *  autonomously without a user session. Normal user auth is unchanged when the
 *  header/secret is absent. */
export async function requireUser(req: Request): Promise<{ userId: string } | { error: Response }> {
  // Two accepted scheduler secrets: CRON_SECRET (Railway worker-cron) and
  // BILLING_CRON_SECRET (pg_cron jobs) — both drive the same worker drains,
  // letting pg_cron replace the external scheduler without a breaking cutover.
  const presented = req.headers.get("x-cron-secret");
  const cronSecrets = [Deno.env.get("CRON_SECRET"), Deno.env.get("BILLING_CRON_SECRET")].filter(Boolean);
  if (presented && cronSecrets.includes(presented)) {
    return { userId: "cron" };
  }
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: json({ error: "Please sign in again." }, 401) };
  const { data: ud, error: ue } = await userClient(token).auth.getUser();
  if (ue || !ud?.user) return { error: json({ error: "Please sign in again." }, 401) };
  return { userId: ud.user.id };
}
