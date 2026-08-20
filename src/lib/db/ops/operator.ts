import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

// The AI operator: chat that can act on the business through governed write tools,
// plus the approval queue, audit trail and per-tool policy that make it safe.
/** A file on an operator message. `path` is a storage key in the private
 *  `operator-files` bucket — never a URL, since reads need a signed one. */
export type OperatorAttachment = {
  kind: "image" | "video" | "audio" | "file";
  path: string;
  name: string;
  mime?: string;
  size?: number;
};
export type OperatorMsg = {
  role: "user" | "assistant";
  content: string;
  attachments?: OperatorAttachment[];
  created_at?: string;
};

/** Which of the four renderers a file gets, from its MIME type. */
export function attachmentKind(mime: string): OperatorAttachment["kind"] {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}
export type AgentAction = { id: string; tool: string; args: Record<string, unknown>; title: string; status: string; result: string | null; error: string | null; created_at: string };
export type AuditEntry = { id: string; actor: string; tool: string; status: string; summary: string; args: Record<string, unknown> | null; created_at: string };
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

export async function runOperator(
  orgId: string,
  message: string,
  history: OperatorMsg[],
): Promise<{ reply: string; toolCalls: string[]; attachments: OperatorAttachment[]; error: string | null }> {
  // `attachments` carries anything the turn produced — today, voice notes from
  // the speak tool, stored in the private operator-files bucket.
  const { data, error } = await invoke<{ reply: string; toolCalls: string[]; attachments?: OperatorAttachment[] }>(
    "agent-operator",
    { organizationId: orgId, message, history },
  );
  return {
    reply: data?.reply ?? "",
    toolCalls: data?.toolCalls ?? [],
    attachments: data?.attachments ?? [],
    error,
  };
}

// Operator chat history — persisted so a session survives refresh/navigation.
export async function listOperatorMessages(orgId: string): Promise<{ data: OperatorMsg[]; error: string | null }> {
  const { data, error } = await supabase
    .from("operator_messages")
    .select("role, content, attachments, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true })
    .limit(200);
  return { data: (data as OperatorMsg[] | null) ?? [], error: friendlyError(error?.message) };
}
export async function saveOperatorMessages(orgId: string, msgs: OperatorMsg[]): Promise<void> {
  if (msgs.length === 0) return;
  await supabase.from("operator_messages").insert(
    msgs.map((m) => ({
      organization_id: orgId,
      role: m.role,
      content: m.content,
      attachments: m.attachments ?? [],
    })),
  );
}

/** Upload a chat attachment. Namespaced by org id because that first path
 *  segment is what the storage policy checks membership against. */
export async function uploadOperatorFile(
  orgId: string,
  file: File,
): Promise<{ attachment: OperatorAttachment | null; error: string | null }> {
  const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
  const path = `${orgId}/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from("operator-files").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) return { attachment: null, error: friendlyError(error.message) };
  return {
    attachment: {
      kind: attachmentKind(file.type || ""),
      path,
      name: file.name,
      mime: file.type || undefined,
      size: file.size,
    },
    error: null,
  };
}

/** Short-lived signed URLs for rendering — the bucket is private, so object
 *  paths are useless on their own. Signed in one round trip per message batch. */
export async function signOperatorFiles(paths: string[], ttlSeconds = 3600): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await supabase.storage.from("operator-files").createSignedUrls(paths, ttlSeconds);
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  }
  return out;
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

/** Approve-with-edit: rewrite a still-pending action's args before deciding it. */
export async function updateActionArgs(actionId: string, args: Record<string, unknown>): Promise<{ error: string | null }> {
  const { error } = await supabase.from("agent_actions").update({ args }).eq("id", actionId).eq("status", "pending");
  return { error: friendlyError(error?.message) };
}

export async function listAudit(orgId: string, limit = 25): Promise<{ data: AuditEntry[]; error: string | null }> {
  const { data, error } = await supabase
    .from("agent_audit_log")
    .select("id, actor, tool, status, summary, args, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
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
  // Inbox
  reply_conversation: "Reply in a conversation",
  set_conversation_status: "Change a conversation's status",
  assign_conversation: "Assign a conversation",
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
  { label: "Inbox", tools: ["reply_conversation", "set_conversation_status", "assign_conversation"] },
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

export async function updateMemory(id: string, content: string, title?: string): Promise<{ error: string | null }> {
  const patch: Record<string, string> = { content };
  if (title !== undefined) patch.title = title;
  const { error } = await supabase.from("agent_memory").update(patch).eq("id", id);
  return { error: friendlyError(error?.message) };
}

export async function removeMemory(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("agent_memory").delete().eq("id", id);
  return { error: friendlyError(error?.message) };
}
