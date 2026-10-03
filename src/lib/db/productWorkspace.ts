import { friendlyError } from "@/lib/friendlyError";
import { supabase } from "@/lib/supabaseClient";

export type WorkspaceTaskStatus = "todo" | "doing" | "review" | "ready";
export type WorkspaceTask = {
  id: string;
  organization_id: string;
  title: string;
  detail: string;
  status: WorkspaceTaskStatus;
  source: "human" | "agent" | "workflow" | "opportunity" | "school" | "system";
  source_id: string | null;
  due_at: string | null;
  assigned_to: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export async function listWorkspaceTasks(orgId: string) {
  const { data, error } = await supabase.from("workspace_tasks").select("*").eq("organization_id", orgId).order("updated_at", { ascending: false });
  return { data: (data as WorkspaceTask[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function createWorkspaceTask(orgId: string, input: Pick<WorkspaceTask, "title" | "detail" | "status"> & Partial<Pick<WorkspaceTask, "due_at" | "source" | "source_id" | "metadata">>) {
  const { data, error } = await supabase.from("workspace_tasks").insert({ organization_id: orgId, ...input }).select("*").single();
  return { data: (data as WorkspaceTask | null) ?? null, error: friendlyError(error?.message) };
}

export async function updateWorkspaceTask(id: string, patch: Partial<Pick<WorkspaceTask, "title" | "detail" | "status" | "due_at" | "assigned_to" | "metadata">>) {
  const { data, error } = await supabase.from("workspace_tasks").update(patch).eq("id", id).select("*").single();
  return { data: (data as WorkspaceTask | null) ?? null, error: friendlyError(error?.message) };
}

export type LearningSettings = {
  organization_id: string;
  user_id: string;
  enabled: boolean;
  capture_navigation: boolean;
  capture_work_patterns: boolean;
  capture_response_metrics: boolean;
  retention_days: number;
};

export const DEFAULT_LEARNING_SETTINGS: Omit<LearningSettings, "organization_id" | "user_id"> = {
  enabled: false,
  capture_navigation: true,
  capture_work_patterns: true,
  capture_response_metrics: true,
  retention_days: 30,
};

export async function getLearningSettings(orgId: string, userId: string) {
  const { data, error } = await supabase.from("behavior_learning_settings").select("*").eq("organization_id", orgId).eq("user_id", userId).maybeSingle();
  return { data: data ? data as LearningSettings : { organization_id: orgId, user_id: userId, ...DEFAULT_LEARNING_SETTINGS }, error: friendlyError(error?.message) };
}

export async function saveLearningSettings(settings: LearningSettings) {
  const { error } = await supabase.from("behavior_learning_settings").upsert(settings, { onConflict: "organization_id,user_id" });
  return { error: friendlyError(error?.message) };
}

export async function clearBehaviorMemory(orgId: string, userId: string) {
  const [{ error: memoryError }, { error: eventsError }] = await Promise.all([
    supabase.from("behavior_memory").delete().eq("organization_id", orgId).eq("user_id", userId),
    supabase.from("analytics_events").delete().eq("organization_id", orgId).in("name", ["workspace_learning_session", "workspace_user_action"]).contains("props", { user_id: userId }),
  ]);
  return { error: friendlyError(memoryError?.message || eventsError?.message) };
}

export type CapabilityState = "active" | "preview" | "disconnected" | "provider_required" | "disabled" | "failed";
export type Capability = { key: string; label: string; area: string; state: CapabilityState; provider?: string; detail: string };
export type DeliveryReceipt = { id: string; capability_key: string; provider: string | null; external_id: string | null; state: "preview" | "queued" | "sent" | "delivered" | "failed" | "disconnected"; summary: string; error: string | null; created_at: string; verified_at: string | null };

export const CORE_CAPABILITIES: Capability[] = [
  { key: "customer.webchat", label: "Web chat", area: "Customers", state: "active", detail: "The Phoxta web inbox is ready." },
  { key: "customer.email", label: "Customer email", area: "Customers", state: "provider_required", provider: "Google Workspace", detail: "Connect a mailbox to receive and send live email." },
  { key: "customer.whatsapp", label: "WhatsApp", area: "Customers", state: "provider_required", provider: "Twilio or Meta", detail: "Connect a WhatsApp sender to deliver messages." },
  { key: "customer.voice", label: "Voice", area: "Customers", state: "provider_required", provider: "Twilio", detail: "Requires a connected voice provider." },
  { key: "operations.commerce", label: "Commerce", area: "Operations", state: "active", detail: "Products, orders, fulfilment and refunds." },
  { key: "operations.bookings", label: "Bookings", area: "Operations", state: "active", detail: "Services, appointments and status updates." },
  { key: "growth.email", label: "Email campaigns", area: "Growth", state: "provider_required", provider: "Google or Resend", detail: "Drafting works before a delivery provider is connected." },
  { key: "growth.social", label: "Social publishing", area: "Growth", state: "provider_required", provider: "Social account", detail: "Preview until a social account is connected." },
  { key: "intelligence.opportunities", label: "Opportunity intelligence", area: "Intelligence", state: "active", detail: "Evidence, assumptions, experiments and decisions." },
  { key: "learning.school", label: "Startup School", area: "Learning", state: "active", detail: "Contextual lessons and venture artifacts." },
];

export async function listCapabilities(orgId: string) {
  const [registry, google, social, agent, channels] = await Promise.all([
    supabase.from("capability_registry").select("capability_key,label,area,state,provider,detail").or(`organization_id.is.null,organization_id.eq.${orgId}`),
    supabase.from("google_connections").select("email").eq("organization_id", orgId).maybeSingle(),
    supabase.from("social_accounts").select("id,status,platform").eq("organization_id", orgId),
    supabase.from("agent_config").select("public_key,voice").eq("organization_id", orgId).maybeSingle(),
    supabase.from("channels").select("type,status").eq("organization_id", orgId),
  ]);
  const overrides = new Map((registry.data ?? []).map((row) => [row.capability_key, row]));
  const connected = new Map<string, Partial<Capability>>();
  if (google.data?.email) {
    connected.set("growth.email", { state: "active", detail: `Connected as ${google.data.email}.` });
    connected.set("customer.email", { state: "active", detail: `Connected as ${google.data.email}.` });
  }
  const channelRows = (channels.data ?? []) as Array<{ type?: string; status?: string }>;
  if (channelRows.some((row) => row.type === "whatsapp" && row.status === "connected")) connected.set("customer.whatsapp", { state: "active", detail: "WhatsApp delivery is connected." });
  const socialRows = (social.data ?? []) as Array<{ status?: string; platform?: string }>;
  const liveSocial = socialRows.filter((row) => row.status === "connected" || row.status === "active");
  if (liveSocial.length) connected.set("growth.social", { state: "active", detail: `${liveSocial.map((row) => row.platform).filter(Boolean).join(", ")} connected.` });
  const voice = agent.data?.voice;
  if (voice && typeof voice === "object" && Object.keys(voice as object).length) connected.set("customer.voice", { state: "active", detail: "Voice provider configured." });
  return {
    data: CORE_CAPABILITIES.map((item) => ({ ...item, ...(overrides.get(item.key) ?? {}), ...(connected.get(item.key) ?? {}) })),
    error: friendlyError(registry.error?.message || google.error?.message || social.error?.message || agent.error?.message || channels.error?.message),
  };
}

export async function listDeliveryReceipts(orgId: string, limit = 40) {
  const { data, error } = await supabase.from("delivery_receipts").select("id,capability_key,provider,external_id,state,summary,error,created_at,verified_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(limit);
  return { data: (data as DeliveryReceipt[] | null) ?? [], error: friendlyError(error?.message) };
}
