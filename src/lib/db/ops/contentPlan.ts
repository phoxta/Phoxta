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

/** Render one planned design early, so the month can be looked at before it is
 *  approved. The publisher would otherwise do this on the day. */
export async function renderPlannedDesign(
  orgId: string,
  designId: string,
): Promise<{ url: string | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("design-render", { body: { orgId, designId } });
    if (error) return { url: null, error: friendlyError(error.message) };
    if (data?.error) return { url: null, error: String(data.error) };
    return { url: String(data?.url ?? ""), error: null };
  } catch (e) {
    return { url: null, error: friendlyError(String((e as Error)?.message ?? e)) };
  }
}
