import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";
import {
  parsePolicies,
  type RoutingPolicy,
  type SlaPolicy,
} from "@/lib/ops/sla";
import type { OrgRole } from "@/lib/ops/permissions";

// Service-level + routing policies and team-role writes for one business.
// Storage: agent_config.escalation (jsonb, member RLS) under `sla`/`routing` —
// see src/lib/ops/sla.ts for why the org-level jsonbs weren't used.

export type ServicePolicies = { sla: SlaPolicy; routing: RoutingPolicy };

/** Light read for the Inbox: no row is created when the org has no agent_config yet. */
export async function getServicePolicies(
  orgId: string,
): Promise<{ data: ServicePolicies; error: string | null }> {
  const { data, error } = await supabase
    .from("agent_config")
    .select("escalation")
    .eq("organization_id", orgId)
    .maybeSingle();
  return {
    data: parsePolicies((data as { escalation?: unknown } | null)?.escalation),
    error: friendlyError(error?.message),
  };
}

/**
 * Save SLA/routing under the escalation jsonb, preserving whatever else lives
 * there (to_email, on_intents). Read-merge-write: a concurrent save from the
 * agent Configure page could clobber this in a race, which is the same
 * two-tabs caveat every jsonb setting in the console already has.
 */
export async function saveServicePolicies(
  orgId: string,
  patch: Partial<ServicePolicies>,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from("agent_config")
    .select("id, escalation")
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) return { error: friendlyError(error.message) };

  let id = (data as { id: string } | null)?.id ?? null;
  let escalation = ((data as { escalation?: Record<string, unknown> } | null)?.escalation ?? {}) as Record<string, unknown>;
  if (!id) {
    // First touch — create the same default row getAgentConfig would.
    const { data: created, error: insErr } = await supabase
      .from("agent_config")
      .insert({ organization_id: orgId })
      .select("id, escalation")
      .single();
    if (insErr) return { error: friendlyError(insErr.message) };
    id = (created as { id: string }).id;
    escalation = ((created as { escalation?: Record<string, unknown> }).escalation ?? {}) as Record<string, unknown>;
  }

  const next = { ...escalation, ...(patch.sla ? { sla: patch.sla } : {}), ...(patch.routing ? { routing: patch.routing } : {}) };
  const { error: upErr } = await supabase.from("agent_config").update({ escalation: next }).eq("id", id);
  return { error: friendlyError(upErr?.message) };
}

/**
 * Change a teammate's role via the app_set_member_role security-definer RPC
 * (memberships have no UPDATE RLS policy). Server enforces: caller must be
 * owner/admin of the org, the owner seat is immutable, and 'owner' is not
 * grantable. The RPC is bootstrapped by ops-maintenance (recorded in
 * migrations/0105_sla_routing.sql).
 */
export async function setMemberRole(
  orgId: string,
  userId: string,
  role: Exclude<OrgRole, "owner">,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("app_set_member_role", {
    p_org: orgId,
    p_user: userId,
    p_role: role,
  });
  return { error: friendlyError(error?.message) };
}
