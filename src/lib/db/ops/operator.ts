import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

// The AI operator: chat that can act on the business through governed write tools,
// plus the approval queue, audit trail and per-tool policy that make it safe.
/**
 * A file on an operator message. `path` is a storage key in the private
 * `operator-files` bucket — never a URL, since reads need a signed one.
 *
 * "design" IS THE EXCEPTION, and deliberately so. It is not a file at all: it
 * is a reference to a design, and `path` holds the design's id. The chat
 * renders it with the same DesignSvg the studio uses rather than showing a
 * picture of it — so the preview is the live document, crisp at any size and
 * never a stale copy of what the design looked like when it was last saved.
 */
export type OperatorAttachment = {
  kind: "image" | "video" | "audio" | "file" | "design";
  /** A storage key — or, for "design", the design's id. */
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
  /** Client-only. The page speaking in the operator's place — "I ran out of
   *  steps before finishing" — shown in the thread where the answer would have
   *  been, but never saved and never sent back as history, because the operator
   *  did not say it. Rows read from the database never carry it. */
  notice?: boolean;
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

/** Mint the one-time deep link that connects the owner's Telegram to this
 *  business's operator. The returned url opens the bot with the link payload;
 *  after that, the owner runs everything from Telegram. */
export async function connectTelegram(orgId: string): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await invoke<{ url: string }>("telegram-link", { organizationId: orgId });
  return { url: data?.url ?? null, error };
}

async function invoke<T>(fn: string, body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = await (error as { context?: Response }).context?.json?.();
      // The monthly-cap message is ours and written for the owner: it says what
      // happened and what to do. friendlyError would flatten it to "Something
      // went wrong", which sends them looking for a bug that is a plan limit.
      if (ctx?.limitReached && ctx?.error) return { data: null, error: String(ctx.error) };
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

// --- Streaming ---------------------------------------------------------------
// supabase.functions.invoke buffers the whole body before it resolves, so the
// streaming variant goes through fetch with the two headers invoke would have
// sent — the signed-in user's JWT and the anon key — and reads the response as
// server-sent events: `data: <JSON>\n\n` per event, the runner's own events
// (delta / turn / tool_start / tool_end) and then one `done` or one `error`.

const SUPABASE_URL = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const DROPPED_ERROR = "The connection dropped before the operator finished. Please try again.";

/** One event off the operator's stream: the agent runner's events plus the two
 *  the function adds to end a turn. */
export type OperatorStreamEvent =
  | { type: "delta"; text: string }
  | { type: "turn"; n: number }
  | { type: "tool_start"; name: string }
  | { type: "tool_end"; name: string; ok: boolean }
  | {
    type: "done";
    reply: string;
    toolCalls: string[];
    attachments?: OperatorAttachment[];
    usage?: { input_tokens: number; output_tokens: number };
    model?: string;
    exhausted?: boolean;
  }
  | { type: "error"; error: string };

export type OperatorStreamHandlers = {
  /** A piece of the answer, as the model produces it. */
  onDelta?: (text: string) => void;
  /** A model call is starting. Whatever streamed before it was the model
   *  thinking aloud ahead of its tool calls, not the answer — clear it. */
  onTurn?: (n: number) => void;
  onToolStart?: (name: string) => void;
  onToolEnd?: (name: string, ok: boolean) => void;
};

export type OperatorResult = {
  reply: string;
  toolCalls: string[];
  attachments: OperatorAttachment[];
  /** The agent used every turn it had without finishing. `reply` is then a
   *  notice to show, not an answer to keep. */
  exhausted: boolean;
  /** False when the deployed function answered with plain JSON — an older build
   *  that does not know `stream` — and the reply arrived in one piece. */
  streamed: boolean;
  error: string | null;
};

const failed = (error: string): OperatorResult =>
  ({ reply: "", toolCalls: [], attachments: [], exhausted: false, streamed: false, error });

/**
 * Streaming counterpart of runOperator. Handlers fire as events arrive; the
 * promise resolves once with the finished turn — the same fields runOperator
 * returns plus `exhausted` and `streamed` — so a page keeps ONE finalise path.
 *
 * Falls back by itself: when the response is not `text/event-stream` (an older
 * deployment ignored `stream: true` and answered JSON) the JSON is returned
 * whole, with `streamed: false`.
 */
export async function runOperatorStream(
  orgId: string,
  message: string,
  history: OperatorMsg[],
  on: OperatorStreamHandlers = {},
): Promise<OperatorResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return failed("Your session has expired. Please sign in again.");
  if (!SUPABASE_URL) return failed("Can't reach the server. Check your connection and try again.");

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/agent-operator`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        organizationId: orgId,
        message,
        // Role + content only. The function strips the rest as well, but a
        // row's attachments and timestamps have no business on the wire.
        history: history.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
      }),
    });
  } catch (e) {
    return failed(friendlyError(e instanceof Error ? e.message : String(e)) ?? GENERIC_ERROR);
  }

  // Auth, the monthly cap and an empty message all fail BEFORE the stream
  // starts, as ordinary HTTP statuses — read them the way invoke() does.
  if (!res.ok) {
    let msg: string | null = null;
    try {
      const j = (await res.json()) as { error?: string; limitReached?: boolean } | null;
      // The cap message is ours and written for the owner — pass it through;
      // anything else is mapped so no raw provider text reaches the screen.
      msg = j?.limitReached && j.error ? String(j.error) : friendlyError(j?.error ?? `HTTP ${res.status}`);
    } catch { /* not JSON */ }
    return failed(msg ?? GENERIC_ERROR);
  }

  // SSE framing. Events are separated by a blank line and each carries one or
  // more "data:" lines whose payloads join with "\n". Network chunks need not
  // align with events, so `feed` returns whatever trails for the next chunk.
  // `state` is an object rather than a `let` so TypeScript sees the assignment
  // made inside `handle` — a plain variable is narrowed to its initial null.
  const state: { final: OperatorResult | null } = { final: null };
  const handle = (frame: string) => {
    const data = frame.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
    if (!data) return;
    let ev: OperatorStreamEvent;
    try {
      ev = JSON.parse(data) as OperatorStreamEvent;
    } catch {
      return; // a frame we cannot read is skipped, not fatal — `done` still decides the turn
    }
    switch (ev.type) {
      case "delta":
        on.onDelta?.(ev.text);
        break;
      case "turn":
        on.onTurn?.(ev.n);
        break;
      case "tool_start":
        on.onToolStart?.(ev.name);
        break;
      case "tool_end":
        on.onToolEnd?.(ev.name, ev.ok);
        break;
      case "done":
        state.final = {
          reply: ev.reply ?? "",
          toolCalls: ev.toolCalls ?? [],
          attachments: ev.attachments ?? [],
          exhausted: ev.exhausted === true,
          streamed: true,
          error: null,
        };
        break;
      case "error":
        state.final = failed(friendlyError(ev.error) ?? GENERIC_ERROR);
        break;
    }
  };
  const feed = (buf: string): string => {
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      handle(buf.slice(0, i));
      buf = buf.slice(i + 2);
    }
    return buf;
  };
  const finish = (rest: string): OperatorResult => {
    if (!state.final && rest.trim()) handle(rest);
    return state.final ?? failed(DROPPED_ERROR);
  };

  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("text/event-stream")) {
    const text = await res.text();
    let parsed: { reply?: string; toolCalls?: string[]; attachments?: OperatorAttachment[]; error?: string } | null = null;
    try {
      parsed = JSON.parse(text);
    } catch { /* not JSON */ }
    if (parsed) {
      // An older deployment: the whole reply, the old shape.
      if (parsed.error) return failed(friendlyError(parsed.error) ?? GENERIC_ERROR);
      return { reply: parsed.reply ?? "", toolCalls: parsed.toolCalls ?? [], attachments: parsed.attachments ?? [], exhausted: false, streamed: false, error: null };
    }
    // Not JSON either: an event stream whose content type a proxy rewrote. The
    // events are all here, just not progressive — replay them.
    if (!/^data:/m.test(text)) return failed(GENERIC_ERROR);
    return finish(feed(text));
  }

  if (!res.body) return failed(GENERIC_ERROR);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf = feed(buf + decoder.decode(value, { stream: true }));
      // `done`/`error` ends the turn; anything after it is the server closing.
      if (state.final) break;
    }
    buf += decoder.decode();
  } catch {
    if (!state.final) return failed(DROPPED_ERROR);
  } finally {
    reader.cancel().catch(() => { /* already closed */ });
  }
  return finish(buf);
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
  // Governs every ingress path the agent has — the connected mailbox, the inbound
  // email webhook, SMS, WhatsApp, web chat, Chatwoot and voice — because it is
  // enforced in _shared/autoReply.ts and in agent-inbound, which all of them go
  // through. A switch that reported Off while four channels kept replying would
  // be worse than no switch.
  auto_reply: "Answer new customer messages automatically — email, SMS, WhatsApp, chat and voice (Ask me = stay silent and flag them for you)",
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
  { label: "Inbox", tools: ["auto_reply", "reply_conversation", "set_conversation_status", "assign_conversation"] },
  { label: "Helpdesk", tools: ["create_ticket", "reply_ticket", "set_ticket_status"] },
  { label: "Marketing", tools: ["create_campaign", "send_campaign"] },
  { label: "Call center", tools: ["add_location"] },
  { label: "Reaching customers", tools: ["send_message", "place_call"] },
  { label: "Google Workspace", tools: ["google_send_email", "google_create_doc", "google_create_event", "google_append_sheet"] },
];

/**
 * What a tool does when the business has never touched its switch.
 *
 * Every WRITE tool defaults to "approve" — the operator agent asks first, which
 * is the right posture for changing a price or fulfilling an order. Answering a
 * customer is the opposite case: a business that connects its mailbox to an AI
 * agent is asking for its mail to be answered, and a fix that ships switched off
 * does not fix "the agent did not reply". Mirrors the server-side default in
 * supabase/functions/_shared/autoReply.ts — the two must agree, or the console
 * would show "Ask me" while the agent was replying.
 */
export const WRITE_TOOL_DEFAULTS: Record<string, ToolPolicy["mode"]> = { auto_reply: "auto" };

export const defaultToolMode = (tool: string): ToolPolicy["mode"] => WRITE_TOOL_DEFAULTS[tool] ?? "approve";

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
