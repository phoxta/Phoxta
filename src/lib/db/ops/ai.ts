import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

/**
 * Single client entrypoint for the per-domain AI engine (`ai-actions` Edge
 * Function). The function holds the model + embeddings keys, scopes everything
 * to the business, meters usage, and returns structured JSON.
 */
export async function invokeAction<T = unknown>(
  orgId: string,
  action: string,
  input: Record<string, unknown> = {},
): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("ai-actions", {
    body: { organizationId: orgId, action, input },
  });
  if (error) {
    let serverMessage: string | null = null;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        const payload = await ctx.json();
        if (payload?.error) serverMessage = String(payload.error);
      }
    } catch {
      /* fall through */
    }
    return { data: null, error: serverMessage ?? friendlyError(error.message) };
  }
  if (data?.error) return { data: null, error: String(data.error) };
  return { data: (data?.result ?? null) as T, error: null };
}

export type Match = { source_type: string; source_id: string; content: string; similarity: number };

/** Semantic (vector) search over the business's own indexed content. */
export async function semanticSearch(
  orgId: string,
  query: string,
  sourceTypes?: string[],
): Promise<{ matches: Match[]; error: string | null }> {
  const { data, error } = await invokeAction<{ matches: Match[] }>(orgId, "semantic_search", {
    query,
    source_types: sourceTypes ?? null,
  });
  return { matches: data?.matches ?? [], error };
}

/** Fire-and-forget: ask the embedding worker to index newly-queued content. */
export function drainEmbeddings(): void {
  supabase.functions.invoke("embed-worker", { body: {} }).catch(() => {});
}

/** Fire-and-forget: ask the workflow worker to run any pending automations. */
export function drainWorkflows(): void {
  supabase.functions.invoke("workflow-worker", { body: {} }).catch(() => {});
}

export type WorkflowRun = {
  id: string;
  trigger: string;
  status: "pending" | "running" | "succeeded" | "failed";
  steps: unknown[];
  error: string | null;
  created_at: string;
  automations: { name: string } | null;
};

export async function listWorkflowRuns(orgId: string, limit = 25): Promise<{ data: WorkflowRun[]; error: string | null }> {
  const { data, error } = await supabase
    .from("workflow_runs")
    .select("id, trigger, status, steps, error, created_at, automations(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data: (data as unknown as WorkflowRun[] | null) ?? [], error: friendlyError(error?.message) };
}
