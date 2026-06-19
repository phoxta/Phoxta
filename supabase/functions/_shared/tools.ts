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
    name: "get_metrics",
    description: "Get current operating metrics for the business (revenue, orders, customers, tickets, bookings, subscriptions, stock).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_products",
    description: "List the business's products with price, stock and status.",
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
  { name: "list_tickets", description: "List support tickets with subject, customer, status and priority.", input_schema: { type: "object", properties: {} } },
  { name: "list_bookings", description: "List appointments/bookings with customer, time, status and service.", input_schema: { type: "object", properties: {} } },
  { name: "list_reservations", description: "List reservations (rentals/stays) with customer, dates, status and resource.", input_schema: { type: "object", properties: {} } },
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
    if (name === "list_tickets") {
      const { data } = await admin.from("tickets").select("subject, customer_name, status, priority").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(60);
      return JSON.stringify(data ?? []);
    }
    if (name === "list_bookings") {
      const { data } = await admin.from("bookings").select("customer_name, customer_email, start_at, status, services(name)").eq("organization_id", orgId).order("start_at", { ascending: true }).limit(60);
      return JSON.stringify(data ?? []);
    }
    if (name === "list_reservations") {
      const { data } = await admin.from("reservations").select("customer_name, start_date, end_date, units, status, products(name)").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(60);
      return JSON.stringify(data ?? []);
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
