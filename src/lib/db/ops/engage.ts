import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

// Engage flow/journey authoring — the owner-side CRUD for `engage_flows` plus a
// read-only view over `engage_runs`. The graph shape below is a SHARED CONTRACT
// with the runtime (the engage-run edge function executes exactly this JSON):
// do not rename node types or data keys without changing both sides.

// ── Graph contract ───────────────────────────────────────────────────────────

export type FlowKind = "flow" | "journey";
export type FlowStatus = "draft" | "live";

export type NodeType =
  // Flow triggers (live chat)
  | "trigger_keyword"
  | "trigger_new_conversation"
  | "trigger_off_hours"
  // Journey trigger (lifecycle events)
  | "trigger_event"
  // Shared steps
  | "send_message"
  | "buttons"
  | "condition"
  | "collect_input"
  | "set_tag"
  | "delay"
  | "handoff_ai"
  | "handoff_human"
  | "end";

export type TriggerEventName = "order_placed" | "reservation_confirmed" | "contact_tagged";
export type ConditionOp = "contains" | "equals" | "has_tag" | "not_has_tag";
export type ButtonOption = { label: string; value: string };

/**
 * Per-node config. One permissive shape (every key optional) rather than a
 * discriminated union: the graph round-trips through jsonb, so the runtime
 * only reads the keys relevant to each node's `type`.
 */
export type EngageNodeData = {
  /** trigger_keyword */
  keywords?: string[];
  /** trigger_event */
  event?: TriggerEventName;
  /** trigger_event (contact_tagged) · set_tag */
  tag?: string;
  /** send_message · buttons */
  text?: string;
  /** send_message (email channel only) */
  subject?: string;
  /** buttons — each option's value doubles as its outgoing edge's sourceHandle */
  options?: ButtonOption[];
  /** condition */
  field?: string;
  op?: ConditionOp;
  value?: string;
  /** collect_input */
  prompt?: string;
  attribute?: string;
  /** delay */
  minutes?: number;
  /** handoff_human */
  note?: string;
};

export type EngageNode = {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: EngageNodeData;
};

export type EngageEdge = {
  id: string;
  source: string;
  /** buttons: the option value or "else" · condition: "yes" / "no" */
  sourceHandle?: string;
  target: string;
};

export type EngageGraph = { nodes: EngageNode[]; edges: EngageEdge[] };

export const emptyGraph = (): EngageGraph => ({ nodes: [], edges: [] });

// ── Rows ─────────────────────────────────────────────────────────────────────

export type EngageFlow = {
  id: string;
  organization_id: string;
  name: string;
  kind: FlowKind;
  status: FlowStatus;
  graph: EngageGraph;
  last_cursor: string | null;
  created_at: string;
  updated_at: string;
};

export type EngageRunStatus = "active" | "waiting" | "done" | "exited";

export type EngageRun = {
  id: string;
  flow_id: string;
  organization_id: string;
  contact_id: string | null;
  conversation_id: string | null;
  node_id: string | null;
  status: EngageRunStatus;
  state: Record<string, unknown> | null;
  wake_at: string | null;
  started_at: string;
  updated_at: string;
};

/** Per-flow run counters: entered = every run ever started, completed = status done. */
export type FlowStats = Record<string, { entered: number; completed: number }>;

// ── Fail-soft schema bootstrap ───────────────────────────────────────────────
// The engage tables may not exist yet on first use. The runtime exposes a
// member-authorized setup call; on a missing-table error we invoke it once and
// retry the query. If setup itself fails, callers fall back to empty data.

type DbError = { code?: string; message?: string } | null;

const isMissingTable = (e: DbError): boolean =>
  !!e && (e.code === "42P01" || /does not exist|relation|schema cache/i.test(e.message ?? ""));

let setupInFlight: Promise<boolean> | null = null;

async function runSetup(orgId: string): Promise<boolean> {
  if (!setupInFlight) {
    setupInFlight = supabase.functions
      .invoke("engage-run", { body: { action: "setup", orgId } })
      .then(({ error }) => !error)
      .catch(() => false)
      .then((ok) => {
        // A failed setup must not poison the session — allow a later retry.
        if (!ok) setupInFlight = null;
        return ok;
      });
  }
  return setupInFlight;
}

async function withSetupRetry<T>(
  orgId: string,
  run: () => PromiseLike<{ data: T | null; error: DbError }>,
): Promise<{ data: T | null; error: DbError }> {
  let res = await run();
  if (isMissingTable(res.error) && (await runSetup(orgId))) res = await run();
  return res;
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

const FLOW_COLS = "id, organization_id, name, kind, status, graph, last_cursor, created_at, updated_at";

function normalizeFlow(row: Record<string, unknown>): EngageFlow {
  const g = row.graph as Partial<EngageGraph> | null | undefined;
  return {
    ...(row as unknown as EngageFlow),
    graph: {
      nodes: Array.isArray(g?.nodes) ? (g!.nodes as EngageNode[]) : [],
      edges: Array.isArray(g?.edges) ? (g!.edges as EngageEdge[]) : [],
    },
  };
}

/** All of one org's flows or journeys, most recently touched first. Fail-soft:
 *  a still-missing schema reads as an empty list, not an error screen. */
export async function listFlows(orgId: string, kind: FlowKind): Promise<{ data: EngageFlow[]; error: string | null }> {
  const res = await withSetupRetry<Array<Record<string, unknown>>>(orgId, () =>
    supabase
      .from("engage_flows")
      .select(FLOW_COLS)
      .eq("organization_id", orgId)
      .eq("kind", kind)
      .order("updated_at", { ascending: false }),
  );
  if (res.error) {
    return { data: [], error: isMissingTable(res.error) ? null : friendlyError(res.error.message) };
  }
  return { data: (res.data ?? []).map(normalizeFlow), error: null };
}

export async function getFlow(orgId: string, flowId: string): Promise<{ data: EngageFlow | null; error: string | null }> {
  const res = await withSetupRetry<Record<string, unknown>>(orgId, () =>
    supabase.from("engage_flows").select(FLOW_COLS).eq("id", flowId).maybeSingle(),
  );
  if (res.error) return { data: null, error: friendlyError(res.error.message) };
  return { data: res.data ? normalizeFlow(res.data) : null, error: null };
}

export async function createFlow(
  orgId: string,
  input: { name: string; kind: FlowKind; graph: EngageGraph },
): Promise<{ data: EngageFlow | null; error: string | null }> {
  const res = await withSetupRetry<Record<string, unknown>>(orgId, () =>
    supabase
      .from("engage_flows")
      .insert({ organization_id: orgId, name: input.name, kind: input.kind, status: "draft", graph: input.graph })
      .select(FLOW_COLS)
      .single(),
  );
  if (res.error) return { data: null, error: friendlyError(res.error.message) };
  return { data: res.data ? normalizeFlow(res.data) : null, error: null };
}

/** Patch name / status / graph. `updated_at` is bumped here so list ordering
 *  (and the runtime's change detection) stay honest. */
export async function updateFlow(
  flowId: string,
  patch: Partial<{ name: string; status: FlowStatus; graph: EngageGraph }>,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("engage_flows")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", flowId);
  return { error: friendlyError(error?.message) };
}

export async function deleteFlow(flowId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("engage_flows").delete().eq("id", flowId);
  return { error: friendlyError(error?.message) };
}

/** Entered/completed counts per flow, from `engage_runs`. Fail-soft: any
 *  failure (missing schema, RLS, network) reads as "no runs yet". */
export async function flowStats(orgId: string): Promise<{ data: FlowStats; error: string | null }> {
  const res = await withSetupRetry<Array<{ flow_id: string; status: EngageRunStatus }>>(orgId, () =>
    supabase.from("engage_runs").select("flow_id, status").eq("organization_id", orgId),
  );
  if (res.error) return { data: {}, error: null };
  const stats: FlowStats = {};
  for (const r of res.data ?? []) {
    const s = (stats[r.flow_id] ??= { entered: 0, completed: 0 });
    s.entered += 1;
    if (r.status === "done") s.completed += 1;
  }
  return { data: stats, error: null };
}
