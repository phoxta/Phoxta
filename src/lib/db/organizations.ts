import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";
import type { Blueprint } from "@/lib/db/marketplace";

/** Mirrors the live `organizations` table (subset). */
export type Organization = {
  id: string;
  name: string;
  slug: string | null;
  stage: string;
  vertical: string | null;
  primary_region: string | null;
  created_at: string;
  /** The KB "four moves" lifecycle of the business as a tenant. */
  lifecycle_stage?: "draft" | "building" | "operating" | "archived";
  app_path?: string | null;       // which storefront app, e.g. "businesses/carento"
  site_url?: string | null;       // deployed storefront URL
  provisioned_at?: string | null;
};

export type Member = { user_id: string; role: "owner" | "admin" | "staff" | "viewer"; created_at: string };

const ORG_SELECT =
  "id, name, slug, stage, vertical, primary_region, created_at, lifecycle_stage, app_path, site_url, provisioned_at";

/** A single business the user can access (RLS scopes to members). */
export async function getBusiness(id: string): Promise<{ data: Organization | null; error: string | null }> {
  const { data, error } = await supabase
    .from("organizations")
    .select(ORG_SELECT)
    .eq("id", id)
    .maybeSingle();
  return { data: (data as Organization | null) ?? null, error: friendlyError(error?.message) };
}

/** Update the business's deploy + lifecycle fields (owner/members, RLS-guarded). */
export async function updateBusiness(
  id: string,
  patch: Partial<Pick<Organization, "site_url" | "lifecycle_stage" | "name">>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("organizations").update(patch).eq("id", id);
  return { error: friendlyError(error?.message) };
}

/** Members of a business (RLS lets members read co-members). */
export async function listMembers(orgId: string): Promise<{ data: Member[]; error: string | null }> {
  const { data, error } = await supabase
    .from("organization_memberships")
    .select("user_id, role, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });
  return { data: (data as Member[] | null) ?? [], error: friendlyError(error?.message) };
}

function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "business"}-${suffix}`;
}

/** Create a new business (organization). The DB triggers add the owner membership + trial subscription. */
export async function createBusiness(
  userId: string,
  input: { name: string; vertical?: string | null; region?: string | null; blueprintId?: string | null },
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("organizations")
    .insert({
      owner_user_id: userId,
      name: input.name.trim(),
      slug: makeSlug(input.name),
      vertical: input.vertical ?? null,
      primary_region: input.region ?? null,
      blueprint_id: input.blueprintId ?? null,
      stage: "trial",
    })
    .select("id")
    .single();
  return { id: (data as { id: string } | null)?.id ?? null, error: friendlyError(error?.message) };
}

/**
 * "Make it yours": buy a Phoxta blueprint → the site factory provisions a fresh
 * tenant. The `app_provision_business` RPC does it atomically server-side: copies
 * the blueprint's preset (modules + AI/automation config) into the new org, sets
 * its lifecycle to `building` and `app_path`, and lets the DB triggers create the
 * owner membership, trial subscription and Phoxta subdomain, plus log the purchase.
 */
export async function buyBlueprint(
  _userId: string,
  blueprint: Blueprint,
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc("app_provision_business", {
    p_blueprint: blueprint.id,
    p_name: blueprint.name,
  });
  return { id: (data as string | null) ?? null, error: friendlyError(error?.message) };
}

export type OrganizationMembership = {
  role: "owner" | "admin" | "staff" | "viewer";
  organizations: Organization | null;
};

/**
 * Businesses the signed-in user belongs to.
 * `organization_memberships` self-read RLS scopes this to the current user;
 * we join the org record in the same query.
 */
export async function listMyOrganizations(): Promise<{
  data: Array<{ role: OrganizationMembership["role"]; organization: Organization }>;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("organization_memberships")
    .select("role, organizations(id, name, slug, stage, vertical, primary_region, created_at)")
    .order("created_at", { ascending: true });

  if (error) return { data: [], error: friendlyError(error.message) };

  const rows = (data as unknown as OrganizationMembership[]) ?? [];
  const mapped = rows
    .filter((r) => r.organizations)
    .map((r) => ({ role: r.role, organization: r.organizations as Organization }));
  return { data: mapped, error: null };
}
