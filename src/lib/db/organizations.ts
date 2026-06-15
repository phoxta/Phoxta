import { supabase } from "@/lib/supabaseClient";
import type { Blueprint } from "@/lib/db/marketplace";

/** Mirrors the live `organizations` table (subset). */
export type Organization = {
  id: string;
  name: string;
  slug: string | null;
  stage: string;
  primary_region: string | null;
  created_at: string;
};

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
  return { id: (data as { id: string } | null)?.id ?? null, error: error?.message ?? null };
}

/** "Make it yours": create a business from a marketplace blueprint and record the purchase. */
export async function buyBlueprint(
  userId: string,
  blueprint: Blueprint,
): Promise<{ id: string | null; error: string | null }> {
  const created = await createBusiness(userId, {
    name: blueprint.name,
    vertical: blueprint.vertical,
    blueprintId: blueprint.id,
  });
  if (created.error || !created.id) return created;

  const { error: purchaseError } = await supabase.from("purchases").insert({
    buyer_user_id: userId,
    blueprint_id: blueprint.id,
    organization_id: created.id,
    amount_cents: blueprint.price_cents,
    currency: blueprint.currency,
    status: "paid",
  });
  // The business exists even if the purchase log fails; surface the error but keep the id.
  return { id: created.id, error: purchaseError?.message ?? null };
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
    .select("role, organizations(id, name, slug, stage, primary_region, created_at)")
    .order("created_at", { ascending: true });

  if (error) return { data: [], error: error.message };

  const rows = (data as unknown as OrganizationMembership[]) ?? [];
  const mapped = rows
    .filter((r) => r.organizations)
    .map((r) => ({ role: r.role, organization: r.organizations as Organization }));
  return { data: mapped, error: null };
}
