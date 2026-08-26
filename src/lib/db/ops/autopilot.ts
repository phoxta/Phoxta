import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

/**
 * Autopilot: the agent acting because time passed, rather than because someone
 * asked.
 *
 * An objective is a standing goal the agent owns and revisits on a cadence.
 * Everything it decides is written to `agent_objective_runs` — including the
 * decision to do nothing, which is the most common one and the most important
 * to record: an objective that never rests is inventing work.
 *
 * Nothing here executes anything. The planner runs on the schedule and every
 * write it makes goes through the same governed tool path the Operator uses, so
 * per-tool policy, the approval queue and the audit log all still apply.
 */

export type ObjectiveStatus = "paused" | "active" | "stopped";

export type Objective = {
  id: string;
  organization_id: string;
  goal: string;
  guardrails: string;
  cadence_minutes: number;
  tools: string[];
  status: ObjectiveStatus;
  halted_reason: string | null;
  max_actions_per_day: number;
  last_run_at: string | null;
  next_run_at: string;
  created_at: string;
};

export type ObjectiveRun = {
  id: string;
  objective_id: string;
  outcome: "acted" | "queued" | "noop" | "halted" | "failed";
  reason: string;
  tool: string | null;
  args: Record<string, unknown>;
  result: string;
  tokens: number;
  created_at: string;
};

const SELECT = "id, organization_id, goal, guardrails, cadence_minutes, tools, status, halted_reason, max_actions_per_day, last_run_at, next_run_at, created_at";

export async function listObjectives(orgId: string): Promise<{ data: Objective[]; error: string | null }> {
  const { data, error } = await supabase
    .from("agent_objectives").select(SELECT)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return { data: (data as Objective[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function createObjective(
  orgId: string,
  input: { goal: string; guardrails?: string; cadenceMinutes?: number; maxActionsPerDay?: number; tools?: string[] },
): Promise<{ data: Objective | null; error: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("agent_objectives")
    .insert({
      organization_id: orgId,
      goal: input.goal.trim(),
      guardrails: (input.guardrails ?? "").trim(),
      cadence_minutes: Math.max(5, input.cadenceMinutes ?? 60),
      max_actions_per_day: Math.max(0, input.maxActionsPerDay ?? 20),
      tools: input.tools ?? [],
      // Created PAUSED, always. An objective that starts running the moment it
      // is typed gives nobody the chance to read it back before it acts.
      status: "paused",
      created_by: auth?.user?.id ?? null,
    })
    .select(SELECT)
    .single();
  return { data: (data as Objective | null) ?? null, error: friendlyError(error?.message) };
}

export async function updateObjective(
  id: string,
  patch: Partial<Pick<Objective, "goal" | "guardrails" | "cadence_minutes" | "max_actions_per_day" | "status" | "tools">>,
): Promise<{ error: string | null }> {
  // Starting or restarting clears the halt reason and brings the next run
  // forward: someone who just pressed Start expects it to think now, not in an
  // hour when the old cadence happens to come round.
  const body: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
  if (patch.status === "active") {
    body.halted_reason = null;
    body.next_run_at = new Date().toISOString();
  }
  const { error } = await supabase.from("agent_objectives").update(body).eq("id", id);
  return { error: friendlyError(error?.message) };
}

export async function removeObjective(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("agent_objectives").delete().eq("id", id);
  return { error: friendlyError(error?.message) };
}

/** What the planner decided, newest first. The whole point of autopilot being
 *  trustworthy is that this is readable. */
export async function listObjectiveRuns(
  orgId: string, objectiveId?: string, limit = 50,
): Promise<{ data: ObjectiveRun[]; error: string | null }> {
  let q = supabase.from("agent_objective_runs")
    .select("id, objective_id, outcome, reason, tool, args, result, tokens, created_at")
    .eq("organization_id", orgId);
  if (objectiveId) q = q.eq("objective_id", objectiveId);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(limit);
  return { data: (data as ObjectiveRun[] | null) ?? [], error: friendlyError(error?.message) };
}

/** Today's spend against the ceiling. */
export type Budget = { actions: number; calls: number; emails: number };

export async function todaysBudget(orgId: string): Promise<{ data: Budget; error: string | null }> {
  const day = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("agent_budget").select("actions, calls, emails")
    .eq("organization_id", orgId).eq("day", day).maybeSingle();
  return {
    data: (data as Budget | null) ?? { actions: 0, calls: 0, emails: 0 },
    error: friendlyError(error?.message),
  };
}

/** The ceilings themselves, held on agent_config beside the agent's other
 *  settings. The defaults here mirror app_claim_action's, so the console never
 *  shows a limit the database does not actually enforce. */
export type Ceilings = { max_actions_per_day: number; max_calls_per_day: number; max_emails_per_day: number };
export const DEFAULT_CEILINGS: Ceilings = { max_actions_per_day: 100, max_calls_per_day: 10, max_emails_per_day: 50 };

export async function getCeilings(orgId: string): Promise<{ data: Ceilings; error: string | null }> {
  const { data, error } = await supabase
    .from("agent_config").select("autopilot").eq("organization_id", orgId).maybeSingle();
  const raw = ((data as { autopilot?: Partial<Ceilings> } | null)?.autopilot ?? {});
  return { data: { ...DEFAULT_CEILINGS, ...raw }, error: friendlyError(error?.message) };
}

export async function setCeilings(orgId: string, next: Ceilings): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("agent_config")
    .upsert({ organization_id: orgId, autopilot: next }, { onConflict: "organization_id" });
  return { error: friendlyError(error?.message) };
}
