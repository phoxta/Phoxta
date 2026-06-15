import { supabase } from "@/lib/supabaseClient";

/** Mirrors the live `organizations` table (subset). */
export type Organization = {
  id: string;
  name: string;
  slug: string | null;
  stage: string;
  primary_region: string | null;
  created_at: string;
};

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
    .select("role, organizations(id, name, slug, stage, primary_region, created_at)")
    .order("created_at", { ascending: true });

  if (error) return { data: [], error: error.message };

  const rows = (data as unknown as OrganizationMembership[]) ?? [];
  const mapped = rows
    .filter((r) => r.organizations)
    .map((r) => ({ role: r.role, organization: r.organizations as Organization }));
  return { data: mapped, error: null };
}
