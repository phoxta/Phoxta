import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";
import { catalogue } from "@/lib/designs/templates";

/**
 * A month of content, planned once and approved once.
 *
 * The plan owns no content of its own: it points at real social_posts, written
 * as `draft`. The publisher only ever claims `queued`, so an unapproved plan
 * cannot post by accident, and approving it is one statement in the database
 * rather than a loop that could queue half a month and stop.
 */

export type ContentPlan = {
  id: string;
  title: string;
  brief: string;
  starts_on: string;
  days: number;
  status: "draft" | "approved" | "rejected";
  /** The planner's own account of the shape it gave the month. */
  rationale: string;
  approved_at: string | null;
  created_at: string;
};

export type PlannedPost = {
  id: string;
  design_id: string | null;
  caption: string;
  scheduled_at: string;
  status: string;
  /** Empty until the day it goes out — see the note in content-plan. */
  media_url: string;
  social_targets: { platform: string; status: string }[];
};

/** One stage of the engine's thinking, as stored. */
export type PlanSection = {
  section: "context" | "situation" | "audience" | "strategy" | "calendar" | "production";
  content: Record<string, unknown>;
  model: string | null;
  generated_at: string;
};

export type Coverage = { source: string; rows: number; note: string };
export type Dropped = { what: string; why: string };

/** What the setup screen collects. Everything here is chosen from real rows
 *  rather than typed, which is what makes the plan specific to this business. */
export type PlanInputs = {
  brief: string;
  startsOn?: string;
  days?: number;
  posts?: number;
  goal?: string;
  /** Real product and service names to feature. */
  featured?: string[];
  /** Real promo codes a campaign may be anchored on. */
  offers?: string[];
  /** Real segment names to write for. */
  segments?: string[];
  platforms?: string[];
  /** YYYY-MM-DD dates nothing may land on. */
  blackout?: string[];
  steer?: string;
  /** A template id to pin every post to, or "vary" to choose per piece. */
  templateId?: string;
  /** The art direction the whole month is made in — an owner's own design
   *  rebuilt as a layout, or a direction to work in. See ops/designReference. */
  look?: unknown;
};

async function call<T>(body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("content-plan", { body });
    if (error) {
      let msg = error.message;
      try {
        const ctx = await (error as { context?: Response }).context?.json?.();
        if (ctx?.error) msg = ctx.error;
      } catch { /* keep the transport's message */ }
      return { data: null, error: friendlyError(msg) };
    }
    if (data?.error) return { data: null, error: String(data.error) };
    return { data: data as T, error: null };
  } catch (e) {
    return { data: null, error: friendlyError(String((e as Error)?.message ?? e)) };
  }
}

export const listContentPlans = (orgId: string) =>
  call<{ plans: ContentPlan[] }>({ orgId, action: "list" });

export const getContentPlan = (orgId: string, planId: string) =>
  call<{ plan: ContentPlan; posts: PlannedPost[] }>({ orgId, action: "get", planId });

/**
 * Plan a month.
 *
 * Pictures are always stock, and that is a cost decision rather than a quality
 * one: Pexels is real photography and free, while generated pictures are
 * charged per image — and a post now fills every photo slot its layout defines,
 * so generated imagery would multiply by slots as well as by posts. A month of
 * it is charges for a plan nobody has approved yet. The owner regenerates the
 * individual pictures they care about in the editor afterwards.
 */
export const generateContentPlan = (
  orgId: string,
  p: {
    brief: string; days?: number; posts?: number; startsOn?: string;
    /** A template id, or "vary" to let the planner choose per post. */
    templateId?: string;
  },
) => call<{
  planId: string; title: string; rationale: string; posts: number;
  /** What the plan was written from, and what was missing — shown to the owner. */
  coverage?: { source: string; rows: number; note: string }[];
  notes?: string[];
}>({
  orgId, action: "generate", ...p,
  // The layouts travel with the request rather than being listed on the
  // server: a duplicated list kept working while listing six of eighteen.
  catalogue: catalogue(),
});

/* ── The stage machine ─────────────────────────────────────────────────────
 *
 * A month is thought through in stages — situation, audience, strategy,
 * calendar, then the writing — and the BROWSER drives the chain, one request
 * per stage. Not because that is elegant, but because Supabase kills an edge
 * function at 150 seconds idle and a month does not fit: run as one call it
 * dies halfway with nothing to show, while a dropped connection here costs one
 * stage. `next` always comes back from the server, which reads it from the
 * database, so refreshing the page mid-run resumes rather than restarting.
 */

async function runCall<T>(body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("content-plan-run", { body });
    if (error) {
      let msg = error.message;
      try {
        const ctx = await (error as { context?: Response }).context?.json?.();
        if (ctx?.error) msg = ctx.error;
      } catch { /* keep the transport's message */ }
      return { data: null, error: friendlyError(msg) };
    }
    if (data?.error) return { data: null, error: String(data.error) };
    return { data: data as T, error: null };
  } catch (e) {
    return { data: null, error: friendlyError(String((e as Error)?.message ?? e)) };
  }
}

/** Start a plan. Writes the parent row; no thinking happens yet. */
export const createContentPlan = (orgId: string, inputs: PlanInputs) =>
  runCall<{ planId: string; next: string }>({ orgId, action: "create", inputs });

/**
 * Run whichever stage comes next. The server decides which that is.
 *
 * The layouts travel with the request for the same reason they do everywhere
 * else here: a server-side copy of the template list kept working while listing
 * six of eighteen.
 */
export const runPlanStage = (orgId: string, planId: string) =>
  runCall<{
    stage: string; next: string | null; done?: number; total?: number;
    made?: number; content?: Record<string, unknown>;
    coverage?: Coverage[]; dropped?: Dropped[]; notes?: string[];
  }>({ orgId, planId, catalogue: catalogue() });

/**
 * Throw away a stage and everything after it, so the owner can say "no, not
 * like that" without starting the month again. Posts produced from the
 * discarded calendar go with it — a month half-written to a strategy nobody
 * approved is worse than one that is simply missing.
 */
export const rewindPlan = (orgId: string, planId: string, stage: string) =>
  runCall<{ next: string }>({ orgId, planId, action: "rewind", stage });

/** The stored thinking, read directly — RLS scopes it to the caller's org. */
export async function getPlanSections(
  orgId: string, planId: string,
): Promise<{ data: PlanSection[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("content_plan_sections")
    .select("section, content, model, generated_at")
    .eq("organization_id", orgId)
    .eq("plan_id", planId);
  if (error) return { data: null, error: friendlyError(error.message) };
  return { data: (data ?? []) as PlanSection[], error: null };
}

export const approveContentPlan = (orgId: string, planId: string) =>
  call<{ queued: number }>({ orgId, action: "approve", planId });

export const rejectContentPlan = (orgId: string, planId: string) =>
  call<{ ok: true }>({ orgId, action: "reject", planId });

/**
 * Change one planned post — the words, or the day.
 *
 * THROUGH THE FUNCTION, NOT AT THE TABLE. social_posts is SELECT-only under
 * RLS (migration 0118), so the direct UPDATE this used to do matched zero rows
 * and reported success — the edit showed locally, and on the day the OLD
 * caption published. The `update_post` action holds the same rules the rest of
 * the plan lives by: only a draft can change (409 otherwise — an approved
 * post's caption is a plan the owner already signed off), and the caption cap
 * is checked where the write happens (400).
 */
export async function updatePlannedPost(
  orgId: string,
  planId: string,
  postId: string,
  updates: { caption?: string; scheduledAt?: string },
): Promise<{ post: PlannedPost | null; error: string | null }> {
  // `organizationId` is what update_post reads; `orgId` rides along because the
  // function's shared entry gate still wants it before it routes the action.
  const { data, error } = await call<{ post: PlannedPost }>({
    organizationId: orgId, orgId, action: "update_post", planId, postId, ...updates,
  });
  return { post: data?.post ?? null, error };
}
