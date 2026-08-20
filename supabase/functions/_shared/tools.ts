// Guardrailed, read-only agent tools scoped to one organization. The model can
// read the business's own data (RAG + structured) but cannot mutate it here.
import { embedOne } from "./openai.ts";
import type { SupabaseClient } from "./supabaseAdmin.ts";
import type { Tool } from "./anthropic.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

export const READ_TOOLS: Tool[] = [
  {
    name: "search_knowledge",
    description:
      "Semantic search over THIS business's own content (products, published pages, contacts, past tickets). Use for any question about the business's offerings, policies, customers or history.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to look up" },
        source_types: {
          type: "array",
          items: { type: "string", enum: ["products", "cms_pages", "crm_contacts", "tickets"] },
          description: "Optional filter of content types",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_products",
    description: "List the business's products with price, stock and status.",
    input_schema: { type: "object", properties: {} },
  },
];

/**
 * Reads that must NEVER reach the public storefront agent.
 *
 * agent-inbound is unauthenticated — anyone on a buyer's website is talking to
 * it. list_orders returns other customers' names and order totals,
 * search_contacts searches the CRM, and get_metrics returns the business's own
 * revenue. These belong to the owner's operator only; a shopper asking about
 * THEIR order uses lookup_order, which requires the reference AND the matching
 * email before it returns anything.
 */
export const OWNER_READ_TOOLS: Tool[] = [
  {
    name: "get_metrics",
    description: "Get current operating metrics for the business (revenue, orders, customers, tickets, bookings, subscriptions, stock).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_orders",
    description: "List recent orders with customer, total and status.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "search_contacts",
    description: "Find customers/contacts semantically by description.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
];

// Operator-only read tools. These list a business's records broadly (CRM,
// invoices, tickets, bookings…), so they are exposed ONLY to the owner-facing
// agents (operator + proactive automations) — NEVER to the public customer
// agent, which would otherwise be able to dump other customers' data. The runner
// below can execute them; a tool is only callable if an agent advertises it.
export const OPERATOR_READ_TOOLS: Tool[] = [
  { name: "list_contacts", description: "List CRM contacts with stage, email, phone, company and value.", input_schema: { type: "object", properties: {} } },
  { name: "list_invoices", description: "List invoices with number, customer, status, total and due date.", input_schema: { type: "object", properties: {} } },
  { name: "list_conversations", description: "List Inbox conversations across every channel (chat, email, SMS, WhatsApp, voice) with the customer, channel, status, whether unread, the AI summary and the last message time. Use for questions about the inbox, what needs replying to, or what a customer has been saying. Returns the conversation id, which reply_conversation / set_conversation_status / assign_conversation need.", input_schema: { type: "object", properties: { status: { type: "string", description: "Filter: open, handled, escalated or closed." }, unread_only: { type: "boolean" } } } },
  { name: "read_conversation", description: "Read the full message thread of one conversation, oldest first. Use before replying so the reply fits what was already said.", input_schema: { type: "object", properties: { conversation_id: { type: "string" } }, required: ["conversation_id"] } },
  { name: "list_tickets", description: "List support tickets with subject, customer, status and priority.", input_schema: { type: "object", properties: {} } },
  { name: "list_bookings", description: "List appointments/bookings with customer (name, email, phone), time, status and service.", input_schema: { type: "object", properties: {} } },
  { name: "list_reservations", description: "List reservations (rentals/stays) with customer, dates, status, resource, total, currency, whether paid and the payment reference — use this to answer payment questions like 'which upcoming rentals are unpaid?'.", input_schema: { type: "object", properties: {} } },
  { name: "list_campaigns", description: "List marketing campaigns with channel, status and recipients.", input_schema: { type: "object", properties: {} } },
  { name: "list_services", description: "List bookable services with duration, price and whether active.", input_schema: { type: "object", properties: {} } },
  { name: "list_locations", description: "List business/branch locations with ZIP, phone and service types.", input_schema: { type: "object", properties: {} } },
];

// Memory tools — the agent's durable per-tenant notes (safe self-writes, not
// governed business actions). Include alongside READ_TOOLS for the operator.
export const MEMORY_TOOLS: Tool[] = [
  { name: "remember", description: "Store a durable note about this business so you recall it later (brand voice, owner preferences, recurring decisions, lasting facts). Use when the owner tells you how they like things or shares something to remember.", input_schema: { type: "object", properties: { title: { type: "string" }, content: { type: "string" } }, required: ["content"] } },
  { name: "recall", description: "Read your stored notes/memory about this business.", input_schema: { type: "object", properties: { query: { type: "string" } }, required: [] } },
];

/** Build a tool runner bound to (admin client, org). All reads are hard-filtered to the org. */
export function toolRunner(admin: SupabaseClient, orgId: string) {
  return async (name: string, input: Json): Promise<string> => {
    if (name === "search_knowledge" || name === "search_contacts") {
      const emb = await embedOne(String(input?.query ?? ""));
      const sourceTypes = name === "search_contacts" ? ["crm_contacts"] : (input?.source_types ?? null);
      const { data } = await admin.rpc("app_match_embeddings", {
        p_org: orgId,
        query_embedding: emb,
        match_count: 6,
        p_source_types: sourceTypes,
      });
      const rows = (data as { source_type: string; content: string }[] | null) ?? [];
      if (rows.length === 0) return "No matching content found.";
      return rows.map((r) => `[${r.source_type}] ${r.content}`).join("\n---\n");
    }
    if (name === "get_metrics") {
      const { data } = await admin.rpc("app_org_ops_summary", { p_org: orgId });
      return JSON.stringify(data ?? {});
    }
    if (name === "list_products") {
      const { data } = await admin
        .from("products")
        .select("name, sku, price_cents, stock, status")
        .eq("organization_id", orgId)
        .limit(60);
      return JSON.stringify(data ?? []);
    }
    if (name === "list_orders") {
      const { data } = await admin
        .from("orders")
        .select("customer_name, total_cents, status, fulfillment_status, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(60);
      return JSON.stringify(data ?? []);
    }
    if (name === "remember") {
      await admin.from("agent_memory").insert({ organization_id: orgId, title: String(input?.title ?? ""), content: String(input?.content ?? ""), source: "agent" });
      return "Saved to memory.";
    }
    if (name === "recall") {
      const { data } = await admin.from("agent_memory").select("title, content").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(15);
      const rows = (data as { title: string; content: string }[] | null) ?? [];
      return rows.length ? rows.map((r) => `- ${r.title ? r.title + ": " : ""}${r.content}`).join("\n") : "No stored memory yet.";
    }
    if (name === "list_contacts") {
      const { data } = await admin.from("crm_contacts").select("name, email, phone, company, stage, value_cents").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(60);
      return JSON.stringify(data ?? []);
    }
    if (name === "list_invoices") {
      const { data } = await admin.from("invoices").select("number, customer_name, status, total_cents, due_date").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(60);
      return JSON.stringify(data ?? []);
    }
    if (name === "list_conversations") {
      // is_test threads are the sandbox — they never represent real work.
      let q = admin.from("conversations")
        .select("id, channel_type, customer_name, customer_email, customer_phone, status, unread, summary, intent, last_message_at, assigned_to")
        .eq("organization_id", orgId).eq("is_test", false);
      const status = String((input as Json)?.status ?? "").trim();
      if (status) q = q.eq("status", status);
      if ((input as Json)?.unread_only === true) q = q.eq("unread", true);
      const { data } = await q.order("last_message_at", { ascending: false }).limit(60);
      return JSON.stringify(data ?? []);
    }
    if (name === "read_conversation") {
      const id = String((input as Json)?.conversation_id ?? "").trim();
      if (!id) return "No conversation_id given.";
      // Scoped by organization_id as well as id: the id arrives from the model.
      const { data: conv } = await admin.from("conversations")
        .select("id, customer_name, channel_type, status, summary")
        .eq("id", id).eq("organization_id", orgId).maybeSingle();
      if (!conv) return "No such conversation in this business.";
      const { data: msgs } = await admin.from("conversation_messages")
        .select("role, body, created_at").eq("conversation_id", id)
        .order("created_at", { ascending: true }).limit(80);
      return JSON.stringify({ conversation: conv, messages: msgs ?? [] });
    }
    if (name === "list_tickets") {
      const { data } = await admin.from("tickets").select("subject, customer_name, status, priority").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(60);
      return JSON.stringify(data ?? []);
    }
    if (name === "list_bookings") {
      const { data } = await admin.from("bookings").select("customer_name, customer_email, customer_phone, start_at, status, services(name)").eq("organization_id", orgId).order("start_at", { ascending: true }).limit(60);
      return JSON.stringify(data ?? []);
    }
    if (name === "list_reservations") {
      const { data } = await admin.from("reservations").select("customer_name, start_date, end_date, units, status, total_cents, currency, metadata, products(name)").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(60);
      // Surface payment state from metadata (set by the payment webhook) so the
      // operator can answer "which upcoming rentals are unpaid?".
      const rows = ((data as Json[] | null) ?? []).map((r) => {
        const meta = (r.metadata ?? {}) as Json;
        const rest = { ...r };
        delete rest.metadata;
        return { ...rest, paid: meta.paid === true, payment_reference: meta.payment_reference ?? null };
      });
      return JSON.stringify(rows);
    }
    if (name === "list_campaigns") {
      const { data } = await admin.from("campaigns").select("name, channel, status, recipients").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(40);
      return JSON.stringify(data ?? []);
    }
    if (name === "list_services") {
      const { data } = await admin.from("services").select("name, duration_min, price_cents, active").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(40);
      return JSON.stringify(data ?? []);
    }
    if (name === "list_locations") {
      const { data } = await admin.from("locations").select("name, zip, phone, service_types, active").eq("organization_id", orgId).order("created_at", { ascending: true }).limit(40);
      return JSON.stringify(data ?? []);
    }
    return "Unknown tool.";
  };
}

/** Recent memory as a short text block, to inject into the agent's system prompt. */
export async function memoryContext(admin: SupabaseClient, orgId: string): Promise<string> {
  const { data } = await admin.from("agent_memory").select("title, content").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(8);
  const rows = (data as { title: string; content: string }[] | null) ?? [];
  return rows.length ? rows.map((r) => `- ${r.title ? r.title + ": " : ""}${r.content}`).join("\n") : "";
}
