import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";
import { STEP_KEYS, type IdeaStep } from "@/lib/ideas/steps";

/**
 * Ideas: the validation run's data layer.
 *
 * The run advances one step per call rather than one request that does all
 * eight. Supabase kills a function at 150s idle and the full chain is minutes of
 * model time, so a single "do everything" request would die partway with some
 * steps saved and nothing recording where it stopped. Driving it from here means
 * a dropped connection costs one step, and a reload resumes from what is stored.
 */

export type IdeaStatus = "active" | "completed" | "archived";

export type Idea = {
  id: string;
  title: string;
  idea_seed: string;
  target_audience: string | null;
  core_outcome: string | null;
  mvp_type: string | null;
  ai_profile: Record<string, unknown>;
  report: Record<string, unknown> | null;
  current_step: IdeaStep;
  status: IdeaStatus;
  is_profile_locked: boolean;
  run_started_at: string | null;
  run_finished_at: string | null;
  run_error: string | null;
  created_at: string;
  updated_at: string;
};

const SELECT =
  "id, title, idea_seed, target_audience, core_outcome, mvp_type, ai_profile, report, " +
  "current_step, status, is_profile_locked, run_started_at, run_finished_at, run_error, created_at, updated_at";

export async function listIdeas(): Promise<{ data: Idea[]; error: string | null }> {
  const { data, error } = await supabase
    .from("ideas").select(SELECT).order("updated_at", { ascending: false });
  return { data: (data as Idea[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function getIdea(id: string): Promise<{ data: Idea | null; error: string | null }> {
  const { data, error } = await supabase.from("ideas").select(SELECT).eq("id", id).maybeSingle();
  return { data: (data as Idea | null) ?? null, error: friendlyError(error?.message) };
}

/** RLS fills user_id from the session; it is never sent from here. */
export async function createIdea(input: {
  title: string;
  ideaSeed: string;
  targetAudience?: string;
  coreOutcome?: string;
}): Promise<{ data: Idea | null; error: string | null }> {
  const { data: session } = await supabase.auth.getUser();
  const userId = session?.user?.id;
  if (!userId) return { data: null, error: "Please sign in again." };

  const { data, error } = await supabase
    .from("ideas")
    .insert({
      user_id: userId,
      title: input.title.trim() || input.ideaSeed.trim().slice(0, 60),
      idea_seed: input.ideaSeed.trim(),
      target_audience: input.targetAudience?.trim() || null,
      core_outcome: input.coreOutcome?.trim() || null,
    })
    .select(SELECT)
    .single();
  return { data: (data as Idea | null) ?? null, error: friendlyError(error?.message) };
}

export async function updateIdea(
  id: string,
  patch: Partial<Pick<Idea, "title" | "idea_seed" | "target_audience" | "core_outcome" | "status" | "is_profile_locked">>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("ideas").update(patch).eq("id", id);
  return { error: friendlyError(error?.message) };
}

export async function deleteIdea(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("ideas").delete().eq("id", id);
  return { error: friendlyError(error?.message) };
}

/**
 * Generate one step.
 *
 * Returns what the next step would be, so the caller can drive the chain
 * without knowing the order — the order lives in one place, and this keeps the
 * client from growing a second copy of it.
 */
export async function runStep(
  ideaId: string,
  step: IdeaStep,
): Promise<{ output: unknown; next: IdeaStep | null; done: boolean; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("idea-run", { body: { ideaId, step } });
  if (error) {
    let msg = error.message;
    try {
      const ctx = await (error as { context?: Response }).context?.json?.();
      if (ctx?.error) msg = ctx.error;
    } catch {
      /* keep the generic message */
    }
    return { output: null, next: null, done: false, error: friendlyError(msg) };
  }
  const d = (data ?? {}) as { output?: unknown; next?: IdeaStep | null; done?: boolean; error?: string };
  if (d.error) return { output: null, next: null, done: false, error: d.error };
  return { output: d.output ?? null, next: d.next ?? null, done: d.done === true, error: null };
}

/** The public validator. No auth — see the idea-validate function. */
export async function validateIdeaPublicly(
  idea: string,
): Promise<{ report: Record<string, unknown> | null; remaining: number | null; limited: boolean; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("idea-validate", { body: { idea } });
  if (error) {
    let msg = error.message;
    let limited = false;
    try {
      const ctx = await (error as { context?: Response }).context?.json?.();
      if (ctx?.error) msg = ctx.error;
      if (ctx?.limited) limited = true;
    } catch {
      /* keep the generic message */
    }
    return { report: null, remaining: null, limited, error: friendlyError(msg) };
  }
  const d = (data ?? {}) as { report?: Record<string, unknown>; remaining?: number; error?: string; limited?: boolean };
  if (d.error) return { report: null, remaining: null, limited: d.limited === true, error: d.error };
  return { report: d.report ?? null, remaining: d.remaining ?? null, limited: false, error: null };
}

/** Which steps the founder filled in themselves, as opposed to generated. */
export async function listStepInputs(ideaId: string): Promise<{ data: IdeaStep[]; error: string | null }> {
  const { data, error } = await supabase.from("idea_step_inputs").select("step").eq("idea_id", ideaId);
  const steps = ((data as { step: IdeaStep }[] | null) ?? []).map((r) => r.step);
  return { data: steps.filter((s) => STEP_KEYS.includes(s)), error: friendlyError(error?.message) };
}
