import { supabase } from "@/lib/supabaseClient";
import type {
  Assumption,
  DiscoveryProfile,
  Evidence,
  Experiment,
  Opportunity,
  Source,
  Workspace,
} from "./domain";
import { recordOpportunityEvent } from "./analytics";

export type BriefSection = {
  id: string;
  section_key: string;
  content: {
    text: string;
    kind: "known" | "inferred" | "unknown";
    evidence_ids: string[];
  };
  version: number;
};
export type Artifact = {
  id: string;
  artifact_type: string;
  title: string;
  content: Record<string, unknown>;
  version: number;
  status: string;
  due_at: string | null;
};
export type Decision = {
  id: string;
  decision: string;
  rationale: string;
  created_at: string;
  snapshot: Record<string, unknown>;
};
export type ResearchJob = {
  id: string;
  status: string;
  job_type: string;
  attempts: number;
  max_attempts: number;
  error: { message?: string } | null;
  created_at: string;
};
export type EvidenceLink = {
  evidence_id: string;
  assumption_id: string;
  relation: string;
};
export type Observation = {
  id: string;
  experiment_id: string;
  observation: string;
  evidence_id: string | null;
  created_at: string;
};
export type Aggregate = {
  workspace: Workspace;
  role: "owner" | "admin" | "editor" | "researcher" | "viewer";
  brief: BriefSection[];
  evidence: Evidence[];
  sources: Source[];
  assumptions: Assumption[];
  experiments: Experiment[];
  observations: Observation[];
  links: EvidenceLink[];
  decisions: Decision[];
  artifacts: Artifact[];
  jobs: ResearchJob[];
  workflows: { id: string; name: string; status: string; graph: unknown }[];
  research: {
    id: string;
    artifact_type: string;
    content: Record<string, unknown>;
  }[];
};
export type Plan = {
  plan_key: string;
  label: string;
  monthly_gbp: number;
  limits: Record<string, string | number | null>;
  stripe_price_id: string | null;
};
export type Account = {
  account: { plan_key: string; billing_status: string; org_id: string };
  limits: Record<string, string | number | null>;
  usage: { feature: string; quantity: number; period_start: string }[];
};

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
export async function command(
  action: string,
  data: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  if (action === "member")
    return teamAction(
      data.role === "remove" ? "remove" : "invite",
      data,
    ) as Promise<Record<string, unknown>>;
  const result =
    check(
      await supabase.rpc("opportunity_command", {
        p_action: action,
        p_data: data,
      }),
    ) ?? {};
  if (action === "create")
    recordOpportunityEvent("workspace_created", {
      origin: String(data.origin ?? "idea"),
    });
  if (action === "profile" && data.complete)
    recordOpportunityEvent("onboarding_completed", {
      entry_mode: String(data.entry_mode ?? "browse"),
    });
  if (action === "save")
    recordOpportunityEvent("opportunity_saved", {
      opportunity_id: String(data.opportunity_id),
    });
  if (action === "feedback" && data.action === "dismiss")
    recordOpportunityEvent("opportunity_dismissed", {
      opportunity_id: String(data.opportunity_id),
      reason_code: String(data.reason_code ?? "not_for_me"),
    });
  if (action === "evidence")
    recordOpportunityEvent("evidence_added", {
      type: String(data.evidence_type),
    });
  if (action === "assumption" && !data.id)
    recordOpportunityEvent("assumption_created", { class: String(data.class) });
  if (action === "experiment" && !data.id)
    recordOpportunityEvent("experiment_created", { type: String(data.type) });
  if (
    action === "experiment" &&
    ["completed", "inconclusive"].includes(String(data.status))
  )
    recordOpportunityEvent("experiment_completed", {
      type: String(data.status),
    });
  if (action === "decision")
    recordOpportunityEvent("decision_finalized", {
      decision: String(data.decision),
    });
  if (action === "research")
    recordOpportunityEvent("research_job_started", {
      job_type: String(data.job_type ?? "opportunity"),
    });
  return result;
}
export async function library(): Promise<Opportunity[]> {
  return (
    check(
      await supabase
        .from("global_opportunities")
        .select("*")
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(100),
    ) ?? []
  );
}
export type LibraryPage = {
  items: Opportunity[];
  total: number;
  page: number;
  page_size: number;
  filters: Record<string, string[]>;
};
export async function searchLibrary(
  filters: {
    query?: string;
    industry?: string;
    geography?: string;
    model?: string;
    mode?: "browse" | "for_you" | "saved" | "dismissed";
    page?: number;
  } = {},
): Promise<LibraryPage> {
  return check(
    await supabase.rpc("opportunity_search", {
      p_query: filters.query ?? "",
      p_industry: filters.industry ?? "",
      p_geography: filters.geography ?? "",
      p_model: filters.model ?? "",
      p_mode: filters.mode ?? "browse",
      p_page: filters.page ?? 0,
    }),
  );
}
export async function publicOpportunity(slug: string): Promise<
  | (Opportunity & {
      brief: Record<string, unknown>;
      public_sources: {
        title: string;
        url: string;
        publisher?: string;
        published_at?: string;
      }[];
    })
  | null
> {
  return check(
    await supabase
      .from("global_opportunities")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle(),
  );
}
export async function workspaces(): Promise<Workspace[]> {
  return (
    check(
      await supabase
        .from("opportunity_workspaces")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(100),
    ) ?? []
  );
}
export async function discoveryProfile(): Promise<DiscoveryProfile | null> {
  return check(
    await supabase.from("discovery_profiles").select("*").maybeSingle(),
  );
}
export async function feedback(): Promise<{
  saved: string[];
  dismissed: string[];
}> {
  const [s, f] = await Promise.all([
    supabase.from("saved_opportunities").select("global_opportunity_id"),
    supabase
      .from("opportunity_feedback")
      .select("global_opportunity_id,action"),
  ]);
  return {
    saved: (check(s) ?? []).map((r) => r.global_opportunity_id),
    dismissed: (check(f) ?? [])
      .filter((r) => r.action === "dismiss")
      .map((r) => r.global_opportunity_id),
  };
}
export async function account(): Promise<Account> {
  return check(await supabase.rpc("opportunity_account_summary"));
}
export async function plans(): Promise<Plan[]> {
  return (
    check(
      await supabase
        .from("opportunity_plan_limits")
        .select("*")
        .order("monthly_gbp"),
    ) ?? []
  );
}
export async function aggregate(id: string): Promise<Aggregate> {
  const tables = [
    "brief_sections",
    "evidence_items",
    "sources",
    "assumptions",
    "experiments",
    "evidence_links",
    "decision_reviews",
    "opportunity_artifacts",
    "research_jobs",
    "agent_workflows",
    "research_artifacts",
    "experiment_observations",
  ] as const;
  async function allRows(table: (typeof tables)[number]) {
    const rows: Record<string, unknown>[] = [];
    const pageSize = 500;
    for (let from = 0; ; from += pageSize) {
      const page =
        check(
          await supabase
            .from(table)
            .select("*")
            .eq("workspace_id", id)
            .range(from, from + pageSize - 1),
        ) ?? [];
      rows.push(...page);
      if (page.length < pageSize) return rows;
    }
  }
  const [workspaceResult, roleResult, ...results] = await Promise.all([
    supabase.from("opportunity_workspaces").select("*").eq("id", id).single(),
    supabase.rpc("opportunity_role", { p_workspace: id }),
    ...tables.map(allRows),
  ]);
  const workspace = check(workspaceResult) as unknown as Workspace;
  const role = check(roleResult) as Aggregate["role"];
  const [
    brief,
    evidence,
    sources,
    assumptions,
    experiments,
    links,
    decisions,
    artifacts,
    jobs,
    workflows,
    research,
    observations,
  ] = results;
  return {
    workspace,
    role,
    brief,
    evidence,
    sources,
    assumptions,
    experiments,
    links,
    decisions,
    artifacts,
    jobs,
    workflows,
    research,
    observations,
  } as Aggregate;
}

export type TeamMember = {
  user_id: string;
  email: string;
  role: string;
  origin: "workspace" | "organization";
};
export type TeamInbox = {
  invitations: {
    id: string;
    workspace_id: string;
    title: string;
    role: string;
    expires_at: string;
  }[];
  transfers: { id: string; title: string; expires_at: string }[];
};
export type TeamPending = {
  invitations: {
    id: string;
    email: string;
    role: string;
    expires_at: string;
  }[];
  transfers: { id: string; email: string; expires_at: string }[];
};
export async function teamAction(
  action: string,
  data: Record<string, unknown> = {},
) {
  return check(
    await supabase.rpc("opportunity_team_action", {
      p_action: action,
      p_data: data,
    }),
  );
}
export async function teamInbox(): Promise<TeamInbox> {
  return check(await supabase.rpc("opportunity_team_inbox"));
}
export async function teamPending(workspaceId: string): Promise<TeamPending> {
  return check(
    await supabase.rpc("opportunity_team_pending", {
      p_workspace: workspaceId,
    }),
  );
}
export async function testWorkflow(
  workflowId: string,
  input: Record<string, string>,
) {
  return check(
    await supabase.rpc("opportunity_test_workflow", {
      p_workflow: workflowId,
      p_input: input,
    }),
  );
}
const PRIVATE_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
export async function uploadWorkspaceFile(workspace: Workspace, file: File) {
  if (
    !PRIVATE_FILE_TYPES.has(file.type) ||
    file.size <= 0 ||
    file.size > 25 * 1024 * 1024
  )
    throw new Error(
      "Choose an approved image, PDF, text, CSV or DOCX file up to 25 MB.",
    );
  const cleanName =
    file.name
      .normalize("NFKC")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-120) || "file";
  const path = `${workspace.org_id}/${workspace.id}/${crypto.randomUUID()}-${cleanName}`;
  const uploaded = await supabase.storage
    .from("phoxta-opportunity-private")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploaded.error) throw new Error(uploaded.error.message);
  try {
    return await command("artifact", {
      workspace_id: workspace.id,
      artifact_type: "file",
      title: file.name,
      status: "ready",
      content: {
        path,
        name: file.name,
        content_type: file.type,
        size: file.size,
      },
    });
  } catch (error) {
    await supabase.storage.from("phoxta-opportunity-private").remove([path]);
    throw error;
  }
}
export async function privateFileUrl(path: string): Promise<string> {
  const result = await supabase.storage
    .from("phoxta-opportunity-private")
    .createSignedUrl(path, 300);
  if (result.error || !result.data?.signedUrl)
    throw new Error(result.error?.message ?? "File is unavailable.");
  const configuredOrigin = new URL(import.meta.env.VITE_SUPABASE_URL).origin;
  const url = new URL(result.data.signedUrl);
  if (url.origin !== configuredOrigin)
    throw new Error("Unexpected file destination.");
  return url.href;
}
export async function checkout(planKey: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke(
    "opportunity-billing",
    { body: { action: "checkout", plan_key: planKey } },
  );
  if (error) {
    const response = await (error as { context?: Response }).context
      ?.json()
      .catch(() => null);
    throw new Error(response?.error ?? error.message);
  }
  if (!data?.url)
    throw new Error(data?.error ?? "Checkout is not available yet.");
  const url = new URL(data.url);
  if (
    url.protocol !== "https:" ||
    !["checkout.stripe.com", "billing.stripe.com"].includes(url.hostname)
  )
    throw new Error("Unexpected checkout destination.");
  return url.href;
}
