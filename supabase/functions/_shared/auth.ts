import { adminClient, userClient, type SupabaseClient } from "./supabaseAdmin.ts";
import { json } from "./cors.ts";
import { safeEqual } from "./internalProof.ts";

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

// ── The scheduler ────────────────────────────────────────────────────────────
//
// Two accepted scheduler secrets: CRON_SECRET (the worker-cron tick on the
// Oracle VM) and BILLING_CRON_SECRET (pg_cron jobs) — both drive the same
// worker drains, letting pg_cron replace the external scheduler without a
// breaking cutover.
//
// WHY THE COMPARISON IS CONSTANT-TIME AND FAILS CLOSED. Eleven functions each
// compared the header their own way — `===`, `Array.includes`, and in one case
// `if (secret && header !== secret)`, which admits EVERYONE the moment the
// secret is unset. A short-circuiting string compare is also a timing oracle
// on the one credential that can start outbound mail, SMS and model spend for
// every tenant at once. So: one function, safeEqual against every configured
// secret, and no configured secret means nobody is the scheduler.

function cronSecrets(): string[] {
  return [Deno.env.get("CRON_SECRET"), Deno.env.get("BILLING_CRON_SECRET")].filter((s): s is string => !!s);
}

/** True when the request carries a valid scheduler secret. Constant-time; false
 *  when no secret is configured. Use this on dual-mode functions that have a
 *  member leg as well; use requireCron on schedule-only ones. */
export function isCronRequest(req: Request): boolean {
  const presented = req.headers.get("x-cron-secret") ?? "";
  if (!presented) return false;
  // Every configured secret is compared, not just up to the first match, so
  // the response time does not say which of the two it was.
  let ok = false;
  for (const secret of cronSecrets()) if (safeEqual(presented, secret)) ok = true;
  return ok;
}

/** Schedule-only gate: the request must present a configured cron secret.
 *  Returns `{ error }` (a ready-to-return 403) otherwise — including when no
 *  secret is configured at all, which is a misconfiguration and not an
 *  invitation. */
export function requireCron(req: Request): { ok: true; error?: undefined } | { ok?: undefined; error: Response } {
  if (cronSecrets().length === 0) {
    console.error("[phoxta] a scheduled worker was called but neither CRON_SECRET nor BILLING_CRON_SECRET is set — refusing");
    return { error: json({ error: "This endpoint runs on the schedule, and no schedule secret is configured." }, 403) };
  }
  if (!isCronRequest(req)) return { error: json({ error: "This endpoint runs on the schedule." }, 403) };
  return { ok: true };
}

/**
 * The dashboard's "nudge the worker" path: a signed-in person who belongs to
 * at least one business, and the list of businesses they belong to.
 *
 * embed-worker and agent-worker are pinged fire-and-forget by the console after
 * a write (src/lib/db/ops/ai.ts, agent.ts) with no organisation in the body.
 * requireUser used to admit ANY signed-in user of ANY tenant and the worker
 * then drained the PLATFORM's queue — every tenant's rows, on one tenant's
 * session. A worker nudged by a member drains that member's businesses and
 * nothing else; the platform-wide sweep is the scheduler's alone.
 */
export async function requireMemberOrgs(
  req: Request,
): Promise<{ userId: string; orgIds: string[]; error?: undefined } | { userId?: undefined; orgIds?: undefined; error: Response }> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: json({ error: "Please sign in again." }, 401) };
  const { data: ud, error: ue } = await userClient(token).auth.getUser();
  if (ue || !ud?.user) return { error: json({ error: "Please sign in again." }, 401) };
  const { data } = await adminClient()
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", ud.user.id)
    .limit(200);
  const orgIds = ((data as { organization_id: string }[] | null) ?? []).map((m) => m.organization_id);
  if (orgIds.length === 0) return { error: json({ error: "You don't belong to any business yet." }, 403) };
  return { userId: ud.user.id, orgIds };
}

/** Lightweight: just confirm a valid signed-in user (for queue/worker drains).
 *  Additionally allows a trusted server-side scheduler (cron) that presents the
 *  shared `CRON_SECRET` / `BILLING_CRON_SECRET` via the `x-cron-secret` header —
 *  so queue drains can run autonomously without a user session. Normal user
 *  auth is unchanged when the header/secret is absent.
 *
 *  Prefer requireCron (schedule-only) or requireMemberOrgs (a member nudging a
 *  worker over their own businesses) for new workers: this one says nothing
 *  about WHICH tenant the caller may act for. */
export async function requireUser(req: Request): Promise<{ userId: string } | { error: Response }> {
  if (isCronRequest(req)) return { userId: "cron" };
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: json({ error: "Please sign in again." }, 401) };
  const { data: ud, error: ue } = await userClient(token).auth.getUser();
  if (ue || !ud?.user) return { error: json({ error: "Please sign in again." }, 401) };
  return { userId: ud.user.id };
}
