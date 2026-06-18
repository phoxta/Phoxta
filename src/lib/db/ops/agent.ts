import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

// ---------- Types ----------
export type Capabilities = Record<string, boolean>;
export type AgentConfig = {
  id: string;
  organization_id: string;
  display_name: string;
  persona: string;
  greeting: string;
  tone: string;
  model_tier: "cheap" | "balanced" | "complex";
  business_hours: { tz?: string; open?: string; close?: string; days?: number[] };
  escalation: { to_email?: string; on_intents?: string[] };
  capabilities: Capabilities;
  public_key: string;
};

export type Location = { id: string; name: string; zip: string; phone: string; service_types: string[]; active: boolean };
export type Channel = { id: string; type: string; label: string; status: string };
export type ConvStatus = "open" | "handled" | "escalated" | "closed" | "snoozed";
export type Conversation = {
  id: string;
  channel_type: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: ConvStatus;
  intent: string | null;
  qualified: boolean;
  lead_score: number | null;
  summary: string;
  last_message_at: string;
  assigned_to: string | null;
  tags: string[];
  snoozed_until: string | null;
  first_response_at: string | null;
  csat_score: number | null;
  csat_requested: boolean;
  contact_id: string | null;
  created_at: string;
};
export type ConversationMessage = {
  id: string;
  role: "customer" | "agent" | "human" | "system" | "note";
  body: string;
  meta: Record<string, unknown>;
  created_at: string;
  delivery_status: string | null;
  provider_sid: string | null;
  author_id: string | null;
};
export type CannedResponse = { id: string; title: string; shortcut: string; body: string; channel: string; is_whatsapp_template: boolean; whatsapp_template_sid: string };
export type OrgMember = { user_id: string; full_name: string; role: string };
export type OutboundCampaign = { id: string; name: string; type: string; channel_pref: string; goal: string; status: string; created_at: string };
export type OutboundTask = { id: string; type: string; channel: string; customer_name: string; status: string; outcome: string | null; created_at: string };
export type CallLog = { id: string; direction: string; outcome: string; after_hours: boolean; created_at: string; locations: { name: string } | null };

export const CAPABILITY_LABELS: { key: string; label: string }[] = [
  { key: "call_center", label: "AI Call Center (multi-location)" },
  { key: "scheduling", label: "AI Appointment Scheduling" },
  { key: "after_hours", label: "After-Hours Answering" },
  { key: "reminders", label: "Appointment Reminder Calls" },
  { key: "nurturing", label: "AI Lead Nurturing" },
  { key: "instant_callback", label: "Instant Callback (web form)" },
  { key: "receptionist", label: "AI Front Desk / Receptionist" },
  { key: "chatbot", label: "AI Chatbot (omnichannel)" },
  { key: "customer_service", label: "AI Customer Service" },
  { key: "cold_calling", label: "AI Cold Calling / SDR" },
  { key: "lead_qualification", label: "AI Lead Qualification" },
  { key: "upsell", label: "AI Upsell / Cross-Sell" },
];

// ---------- Config ----------
export async function getAgentConfig(orgId: string): Promise<{ data: AgentConfig | null; error: string | null }> {
  const { data, error } = await supabase.from("agent_config").select("*").eq("organization_id", orgId).maybeSingle();
  if (error) return { data: null, error: friendlyError(error.message) };
  if (data) return { data: data as AgentConfig, error: null };
  // First use — create defaults.
  const { data: created, error: insErr } = await supabase.from("agent_config").insert({ organization_id: orgId }).select("*").single();
  return { data: (created as AgentConfig) ?? null, error: friendlyError(insErr?.message) };
}

export async function saveAgentConfig(id: string, patch: Partial<AgentConfig>): Promise<{ error: string | null }> {
  const { error } = await supabase.from("agent_config").update(patch).eq("id", id);
  return { error: friendlyError(error?.message) };
}

// ---------- Locations ----------
export async function listLocations(orgId: string): Promise<{ data: Location[]; error: string | null }> {
  const { data, error } = await supabase.from("locations").select("id, name, zip, phone, service_types, active").eq("organization_id", orgId).order("created_at", { ascending: true });
  return { data: (data as Location[] | null) ?? [], error: friendlyError(error?.message) };
}
export async function createLocation(orgId: string, input: { name: string; zip: string; phone?: string; service_types?: string[] }): Promise<{ error: string | null }> {
  const { error } = await supabase.from("locations").insert({ organization_id: orgId, name: input.name.trim(), zip: input.zip.trim(), phone: input.phone ?? "", service_types: input.service_types ?? [] });
  return { error: friendlyError(error?.message) };
}
export async function deleteLocation(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("locations").delete().eq("id", id);
  return { error: friendlyError(error?.message) };
}

// Shared edge-function invoker that surfaces the server's error message.
async function invokeFn<T>(fn: string, body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = await (error as { context?: Response }).context?.json?.();
      if (ctx?.error) msg = ctx.error;
    } catch { /* keep generic */ }
    return { data: null, error: friendlyError(msg) };
  }
  return { data: data as T, error: null };
}

// ---------- Inbox ----------
const CONV_COLS =
  "id, channel_type, customer_name, customer_email, customer_phone, status, intent, qualified, lead_score, summary, last_message_at, assigned_to, tags, snoozed_until, first_response_at, csat_score, csat_requested, contact_id, created_at";

export async function listConversations(
  orgId: string,
  opts: { limit?: number; search?: string; channel?: string; status?: string; assignedTo?: string } = {},
): Promise<{ data: Conversation[]; error: string | null }> {
  let q = supabase.from("conversations").select(CONV_COLS).eq("organization_id", orgId);
  if (opts.channel) q = q.eq("channel_type", opts.channel);
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.assignedTo) q = q.eq("assigned_to", opts.assignedTo);
  const s = opts.search?.trim();
  if (s) q = q.or(`customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%,customer_email.ilike.%${s}%,summary.ilike.%${s}%`);
  const { data, error } = await q.order("last_message_at", { ascending: false }).limit(opts.limit ?? 60);
  return { data: (data as Conversation[] | null) ?? [], error: friendlyError(error?.message) };
}
export async function listConversationMessages(convId: string): Promise<{ data: ConversationMessage[]; error: string | null }> {
  const { data, error } = await supabase
    .from("conversation_messages")
    .select("id, role, body, meta, created_at, delivery_status, provider_sid, author_id")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true });
  return { data: (data as ConversationMessage[] | null) ?? [], error: friendlyError(error?.message) };
}

/** Send a human reply — actually delivered over the conversation's channel
 *  (SMS / WhatsApp / email). Returns windowClosed when WhatsApp's 24h window
 *  is shut (an approved template is required instead). */
export async function sendConversationReply(
  orgId: string, convId: string, body: string, channel?: string,
): Promise<{ ok: boolean; windowClosed: boolean; delivery_status: string | null; error: string | null }> {
  const { data, error } = await invokeFn<{ ok: boolean; windowClosed?: boolean; delivery_status?: string; error?: string }>(
    "conversation-send", { organizationId: orgId, conversationId: convId, body, channel },
  );
  return {
    ok: !!data?.ok,
    windowClosed: !!data?.windowClosed,
    delivery_status: data?.delivery_status ?? null,
    error: error ?? (data && !data.ok ? (data.error ?? "Could not send.") : null),
  };
}
/** Private internal note — never delivered to the customer. */
export async function addInternalNote(orgId: string, convId: string, body: string): Promise<{ error: string | null }> {
  const { error } = await invokeFn("conversation-send", { organizationId: orgId, conversationId: convId, body, internal: true });
  return { error };
}
/** AI copilot: a one-line summary + a suggested reply for the human to use. */
export async function suggestReply(orgId: string, convId: string): Promise<{ summary: string; suggestion: string; error: string | null }> {
  const { data, error } = await invokeFn<{ summary: string; suggestion: string }>("conversation-suggest", { organizationId: orgId, conversationId: convId });
  return { summary: data?.summary ?? "", suggestion: data?.suggestion ?? "", error };
}
export async function setConversationStatus(convId: string, status: ConvStatus): Promise<{ error: string | null }> {
  const { error } = await supabase.from("conversations").update({ status }).eq("id", convId);
  return { error: friendlyError(error?.message) };
}
export async function setConversationTags(convId: string, tags: string[]): Promise<{ error: string | null }> {
  const { error } = await supabase.from("conversations").update({ tags }).eq("id", convId);
  return { error: friendlyError(error?.message) };
}
export async function assignConversation(convId: string, userId: string | null): Promise<{ error: string | null }> {
  const { error } = await supabase.from("conversations").update({ assigned_to: userId }).eq("id", convId);
  return { error: friendlyError(error?.message) };
}
export async function snoozeConversation(convId: string, until: string | null): Promise<{ error: string | null }> {
  const { error } = await supabase.from("conversations").update({ status: until ? "snoozed" : "open", snoozed_until: until }).eq("id", convId);
  return { error: friendlyError(error?.message) };
}
export async function setCsat(convId: string, score: number): Promise<{ error: string | null }> {
  const { error } = await supabase.from("conversations").update({ csat_score: score, csat_requested: true }).eq("id", convId);
  return { error: friendlyError(error?.message) };
}

// ---------- Collision presence (who's viewing) ----------
export async function touchPresence(orgId: string, convId: string, userId: string): Promise<void> {
  await supabase.from("conversation_presence").upsert(
    { conversation_id: convId, organization_id: orgId, user_id: userId, last_seen_at: new Date().toISOString() },
    { onConflict: "conversation_id,user_id" },
  );
}
export async function listViewers(convId: string, exceptUserId: string): Promise<{ data: OrgMember[]; error: string | null }> {
  const since = new Date(Date.now() - 30_000).toISOString();
  const { data, error } = await supabase
    .from("conversation_presence")
    .select("user_id")
    .eq("conversation_id", convId)
    .gte("last_seen_at", since)
    .neq("user_id", exceptUserId);
  const ids = ((data as { user_id: string }[] | null) ?? []).map((r) => r.user_id);
  if (ids.length === 0) return { data: [], error: friendlyError(error?.message) };
  return { data: ids.map((id) => ({ user_id: id, full_name: "", role: "" })), error: null };
}

// ---------- Canned responses / WhatsApp templates ----------
export async function listCanned(orgId: string): Promise<{ data: CannedResponse[]; error: string | null }> {
  const { data, error } = await supabase
    .from("canned_responses")
    .select("id, title, shortcut, body, channel, is_whatsapp_template, whatsapp_template_sid")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return { data: (data as CannedResponse[] | null) ?? [], error: friendlyError(error?.message) };
}
export async function createCanned(orgId: string, input: Partial<CannedResponse>): Promise<{ error: string | null }> {
  const { error } = await supabase.from("canned_responses").insert({ organization_id: orgId, ...input });
  return { error: friendlyError(error?.message) };
}
export async function deleteCanned(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("canned_responses").delete().eq("id", id);
  return { error: friendlyError(error?.message) };
}

// ---------- Org members (assignment dropdown) ----------
export async function listMembers(orgId: string): Promise<{ data: OrgMember[]; error: string | null }> {
  const { data, error } = await supabase.rpc("app_org_members", { p_org: orgId });
  return { data: (data as OrgMember[] | null) ?? [], error: friendlyError(error?.message) };
}
export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ---------- Outbound ----------
export async function listCampaigns(orgId: string): Promise<{ data: OutboundCampaign[]; error: string | null }> {
  const { data, error } = await supabase.from("outbound_campaigns").select("id, name, type, channel_pref, goal, status, created_at").eq("organization_id", orgId).order("created_at", { ascending: false });
  return { data: (data as OutboundCampaign[] | null) ?? [], error: friendlyError(error?.message) };
}
export async function createCampaign(orgId: string, input: { name: string; type: string; channel_pref: string; goal: string }): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.from("outbound_campaigns").insert({ organization_id: orgId, ...input, status: "active" }).select("id").single();
  return { id: (data as { id: string } | null)?.id ?? null, error: friendlyError(error?.message) };
}
/** Queue outbound tasks for a campaign against a set of contacts. */
export async function queueCampaign(
  orgId: string,
  campaign: { id: string; type: string; channel_pref: string },
  contacts: { id: string; name: string; email: string; phone: string }[],
): Promise<{ count: number; error: string | null }> {
  if (contacts.length === 0) return { count: 0, error: null };
  const rows = contacts.slice(0, 200).map((c) => ({
    organization_id: orgId,
    campaign_id: campaign.id,
    type: campaign.type,
    contact_id: c.id,
    channel: campaign.channel_pref,
    to_ref: campaign.channel_pref === "email" ? c.email : c.phone || c.email,
    customer_name: c.name,
    due_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("outbound_tasks").insert(rows);
  return { count: rows.length, error: friendlyError(error?.message) };
}
export async function listTasks(orgId: string, limit = 40): Promise<{ data: OutboundTask[]; error: string | null }> {
  const { data, error } = await supabase.from("outbound_tasks").select("id, type, channel, customer_name, status, outcome, created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(limit);
  return { data: (data as OutboundTask[] | null) ?? [], error: friendlyError(error?.message) };
}

// ---------- Call logs + reporting ----------
export async function listCallLogs(orgId: string, limit = 40): Promise<{ data: CallLog[]; error: string | null }> {
  const { data, error } = await supabase.from("call_logs").select("id, direction, outcome, after_hours, created_at, locations(name)").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(limit);
  return { data: (data as unknown as CallLog[] | null) ?? [], error: friendlyError(error?.message) };
}
export type AgentSummary = Record<string, number | Record<string, number>>;
export async function getAgentSummary(orgId: string): Promise<{ data: AgentSummary; error: string | null }> {
  const { data, error } = await supabase.rpc("app_org_agent_summary", { p_org: orgId });
  if (error) return { data: {}, error: friendlyError(error.message) };
  return { data: (data as AgentSummary) ?? {}, error: null };
}

// ---------- The agent (edge function) ----------
async function callAgent<T>(orgId: string, action: string, extra: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("ai-agent", { body: { organizationId: orgId, action, ...extra } });
  if (error) {
    let serverMessage: string | null = null;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        const payload = await ctx.json();
        if (payload?.error) serverMessage = String(payload.error);
      }
    } catch { /* fall through */ }
    return { data: null, error: serverMessage ?? friendlyError(error.message) };
  }
  if (data?.error) return { data: null, error: String(data.error) };
  return { data: data as T, error: null };
}

export type AgentReply = { conversationId: string; reply: string; actions: string[]; escalated: boolean };
export async function agentRespond(orgId: string, message: string, conversationId?: string | null, channel = "web"): Promise<{ data: AgentReply | null; error: string | null }> {
  return callAgent<AgentReply>(orgId, "respond", { message, conversationId: conversationId ?? undefined, channel, customer: {} });
}
export async function summarizeConversation(orgId: string, conversationId: string): Promise<void> {
  await callAgent(orgId, "summarize", { conversationId });
}

/** Fire-and-forget drain of the outbound worker. */
export function runAgentWorker(): void {
  supabase.functions.invoke("agent-worker", { body: {} }).catch(() => {});
}
