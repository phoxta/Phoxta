import { adminClient, userClient, type SupabaseClient } from "./supabaseAdmin.ts";
import { json } from "./cors.ts";

export type Org = { id: string; name: string; vertical: string | null };
export type AuthOk = { userId: string; admin: SupabaseClient; org: Org };

/** Verify the JWT, confirm the user belongs to `organizationId`, and load the org.
 *  Returns either `{ ok }` or `{ error }` (a ready-to-return Response). */
export async function authorize(
  req: Request,
  organizationId: string | undefined,
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

  const { data: org } = await admin
    .from("organizations")
    .select("id, name, vertical")
    .eq("id", organizationId)
    .maybeSingle();
  if (!org) return { error: json({ error: "That business could not be found." }, 404) };

  return { ok: { userId: ud.user.id, admin, org: org as Org } };
}

/** Lightweight: just confirm a valid signed-in user (for queue/worker drains).
 *  Additionally allows a trusted server-side scheduler (cron) that presents the
 *  shared `CRON_SECRET` via the `x-cron-secret` header — so queue drains can run
 *  autonomously without a user session. Normal user auth is unchanged when the
 *  header/secret is absent. */
export async function requireUser(req: Request): Promise<{ userId: string } | { error: Response }> {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") === cronSecret) {
    return { userId: "cron" };
  }
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: json({ error: "Please sign in again." }, 401) };
  const { data: ud, error: ue } = await userClient(token).auth.getUser();
  if (ue || !ud?.user) return { error: json({ error: "Please sign in again." }, 401) };
  return { userId: ud.user.id };
}
