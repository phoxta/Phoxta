import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

// The AI operator: chat that can act on the business through governed write tools,
// plus the approval queue, audit trail and per-tool policy that make it safe.
export type OperatorMsg = { role: "user" | "assistant"; content: string };
export type AgentAction = { id: string; tool: string; args: Record<string, unknown>; title: string; status: string; result: string | null; error: string | null; created_at: string };
export type AuditEntry = { id: string; actor: string; tool: string; status: string; summary: string; created_at: string };
export type ToolPolicy = { tool: string; mode: "off" | "approve" | "auto" };

async function invoke<T>(fn: string, body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
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

export async function runOperator(orgId: string, message: string, history: OperatorMsg[]): Promise<{ reply: string; toolCalls: string[]; error: string | null }> {
  const { data, error } = await invoke<{ reply: string; toolCalls: string[] }>("agent-operator", { organizationId: orgId, message, history });
  return { reply: data?.reply ?? "", toolCalls: data?.toolCalls ?? [], error };
}

// Operator chat history — persisted so a session survives refresh/navigation.
export async function listOperatorMessages(orgId: string): Promise<{ data: OperatorMsg[]; error: string | null }> {
  const { data, error } = await supabase
    .from("operator_messages")
    .select("role, content")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true })
    .limit(200);
  return { data: (data as OperatorMsg[] | null) ?? [], error: friendlyError(error?.message) };
}
export async function saveOperatorMessages(orgId: string, msgs: OperatorMsg[]): Promise<void> {
  if (msgs.length === 0) return;
  await supabase.from("operator_messages").insert(msgs.map((m) => ({ organization_id: orgId, role: m.role, content: m.content })));
}

export async function listActions(orgId: string): Promise<{ data: AgentAction[]; error: string | null }> {
  const { data, error } = await supabase
    .from("agent_actions")
    .select("id, tool, args, title, status, result, error, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(25);
  return { data: (data as AgentAction[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function decideAction(actionId: string, decision: "approve" | "reject"): Promise<{ status: string | null; error: string | null }> {
  const { data, error } = await invoke<{ status: string }>("agent-approve", { actionId, decision });
  return { status: data?.status ?? null, error };
}

export async function listAudit(orgId: string): Promise<{ data: AuditEntry[]; error: string | null }> {
  const { data, error } = await supabase
    .from("agent_audit_log")
    .select("id, actor, tool, status, summary, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(25);
  return { data: (data as AuditEntry[] | null) ?? [], error: friendlyError(error?.message) };
}

export const WRITE_TOOL_LABELS: Record<string, string> = {
  // Commerce
  create_product: "Create a product",
  update_product_price: "Change a price",
  set_product_stock: "Set stock",
  set_product_status: "Publish / archive a product",
  fulfill_order: "Fulfil an order",
  set_order_status: "Change an order's status",
  // CRM
  create_contact: "Add a contact",
  update_contact_stage: "Move a contact's stage",
  add_contact_note: "Add a note to a contact",
  tag_contact: "Tag a contact",
  // Invoicing
  create_invoice: "Create an invoice",
  set_invoice_status: "Change an invoice's status",
  // Bookings
  create_service: "Create a bookable service",
  create_booking: "Create a booking",
  set_booking_status: "Change a booking's status",
  // Reservations
  set_reservation_status: "Update a reservation",
  block_availability: "Block availability (blackout)",
  // Content
  create_blog_post: "Publish a blog post",
  publish_page: "Publish a content page",
  // Helpdesk
  create_ticket: "Open a support ticket",
  reply_ticket: "Reply to a ticket",
  set_ticket_status: "Change a ticket's status",
  // Marketing
  create_campaign: "Create a campaign",
  send_campaign: "Send a campaign",
  // Call center
  add_location: "Add a location",
  // Outreach
  send_message: "Message a customer (SMS / WhatsApp / email)",
  place_call: "Place a phone call",
  // Google Workspace
  google_send_email: "Send email (Google Workspace)",
  google_create_doc: "Create a Google Doc",
  google_create_event: "Create a calendar event",
  google_append_sheet: "Log a row to a Google Sheet",
};

// Grouping for the policy panel so the (now ~30) tools read as tidy sections.
export const WRITE_TOOL_GROUPS: { label: string; tools: string[] }[] = [
  { label: "Commerce", tools: ["create_product", "update_product_price", "set_product_stock", "set_product_status", "fulfill_order", "set_order_status"] },
  { label: "CRM", tools: ["create_contact", "update_contact_stage", "add_contact_note", "tag_contact"] },
  { label: "Invoicing", tools: ["create_invoice", "set_invoice_status"] },
  { label: "Bookings & reservations", tools: ["create_service", "create_booking", "set_booking_status", "set_reservation_status", "block_availability"] },
  { label: "Content", tools: ["create_blog_post", "publish_page"] },
  { label: "Helpdesk", tools: ["create_ticket", "reply_ticket", "set_ticket_status"] },
  { label: "Marketing", tools: ["create_campaign", "send_campaign"] },
  { label: "Call center", tools: ["add_location"] },
  { label: "Reaching customers", tools: ["send_message", "place_call"] },
  { label: "Google Workspace", tools: ["google_send_email", "google_create_doc", "google_create_event", "google_append_sheet"] },
];

export async function listToolPolicies(orgId: string): Promise<{ data: ToolPolicy[]; error: string | null }> {
  const { data, error } = await supabase.from("agent_tool_policy").select("tool, mode").eq("organization_id", orgId);
  return { data: (data as ToolPolicy[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function setToolPolicy(orgId: string, tool: string, mode: ToolPolicy["mode"]): Promise<{ error: string | null }> {
  const { error } = await supabase.from("agent_tool_policy").upsert({ organization_id: orgId, tool, mode }, { onConflict: "organization_id,tool" });
  return { error: friendlyError(error?.message) };
}

// --- Memory: durable notes the agent stores/recalls -------------------------
export type MemoryNote = { id: string; title: string; content: string; source: string; created_at: string };

export async function listMemory(orgId: string): Promise<{ data: MemoryNote[]; error: string | null }> {
  const { data, error } = await supabase
    .from("agent_memory")
    .select("id, title, content, source, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(30);
  return { data: (data as MemoryNote[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function addMemory(orgId: string, content: string, title = ""): Promise<{ error: string | null }> {
  const { error } = await supabase.from("agent_memory").insert({ organization_id: orgId, content, title, source: "owner" });
  return { error: friendlyError(error?.message) };
}

export async function removeMemory(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("agent_memory").delete().eq("id", id);
  return { error: friendlyError(error?.message) };
}
