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
 * `imagery` is "stock" by default and that is a cost decision, not a quality
 * one: Pexels is real photography and free, while generated pictures are
 * charged per image — a month of them is thirty charges for a plan nobody has
 * approved yet.
 */
export const generateContentPlan = (
  orgId: string,
  p: {
    brief: string; days?: number; posts?: number; startsOn?: string;
    imagery?: "stock" | "generated";
    /** A template id, or "vary" to let the planner choose per post. */
    templateId?: string;
  },
) => call<{ planId: string; title: string; rationale: string; posts: number }>({
  orgId, action: "generate", ...p,
  // The layouts travel with the request rather than being listed on the
  // server: a duplicated list kept working while listing six of eighteen.
  catalogue: catalogue(),
});

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
