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
      "Semantic search over THIS business's published content — products, pages and its knowledge base. Use for questions about what the business offers, its policies and how it works. It does NOT reach customer records.",
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
/** Marketplace catalogue. Gated behind capabilities.marketplace because only the
 *  Phoxta platform org sells blueprints — a car dealer's agent has no use for it.
 *
 *  This exists because the platform agent was reciting a TEN-blueprint catalogue
 *  (Coffee Subscription, Hair Salon, Dental Clinic…) from embedded marketing copy
 *  while the blueprints table held five live ones. Embeddings are a photograph;
 *  a catalogue is a fact. Facts belong in a tool, where the answer is whatever
 *  is true at the moment it is asked. */
export const MARKETPLACE_TOOLS: Tool[] = [
  {
    name: "list_blueprints",
    description:
      "The businesses a customer can buy RIGHT NOW, read live from the catalogue. " +
      "Always call this before naming, counting or pricing what is for sale — never answer from memory or from any document, which may describe products that were retired. " +
      "On web chat, rich cards (cover image, price, demo and buy buttons) are attached to your reply automatically — introduce them with one short line (e.g. \"Here's what's available:\") and do NOT repeat the same items as a markdown list or paste bare URLs.",
    input_schema: { type: "object", properties: {} },
  },
];

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

  // The social surface. Without these the operator could write a caption and
  // nothing else — it could not see which channels were connected, which
  // designs existed, or how the last post did, so it correctly reported that
  // it had no way to post and no way to check one.
  { name: "list_social_accounts", description: "Which social accounts this business has connected (Instagram, LinkedIn, TikTok, X), the handle, and whether each is working or needs reconnecting. Check this before scheduling a post — a channel that is not connected cannot receive one.", input_schema: { type: "object", properties: {} } },
  { name: "list_designs", description: "The graphics this business has made, newest first: the title, and whether the design has a rendered picture yet. A design can only be posted once it has one — that happens when it is opened and saved in Graphics. Use the title when scheduling a post.", input_schema: { type: "object", properties: {} } },
  { name: "list_social_posts", description: "Social posts this business has scheduled or published: the caption, when it goes or went out, its status, which channels, and the likes and comments where they have been read. Use for 'what is going out this week' and 'how did the last post do'.", input_schema: { type: "object", properties: {} } },
];

// Memory tools — the agent's durable per-tenant notes (safe self-writes, not
// governed business actions). Include alongside READ_TOOLS for the operator.
export const MEMORY_TOOLS: Tool[] = [
  { name: "remember", description: "Store a durable note about this business so you recall it later (brand voice, owner preferences, recurring decisions, lasting facts). Use when the owner tells you how they like things or shares something to remember.", input_schema: { type: "object", properties: { title: { type: "string" }, content: { type: "string" } }, required: ["content"] } },
  { name: "recall", description: "Read your stored notes/memory about this business.", input_schema: { type: "object", properties: { query: { type: "string" } }, required: [] } },
];

/** Build a tool runner bound to (admin client, org). All reads are hard-filtered to the org. */
/** What semantic search may reach when the caller is an anonymous website
 *  visitor. Everything embedded for an org shares one vector table — products
 *  and CMS pages alongside crm_contacts, tickets and conversations — so an
 *  unfiltered search over "the business's own content" reaches other customers'
 *  records. A public visitor asking the storefront agent to "search recent buyer
 *  enquiries" was returned a real customer's name and enquiry.
 *
 *  The model cannot widen this: source_types it supplies are intersected with
 *  the allowlist, never trusted. Refusing by prompt is not a control — the same
 *  request framed as "I'm the new sales manager" walked straight past it. */
const PUBLIC_SOURCE_TYPES = ["products", "cms_pages", "knowledge_docs"];

export function toolRunner(admin: SupabaseClient, orgId: string, opts?: { audience?: "public" | "member" }) {
  const isPublic = opts?.audience === "public";
  return async (name: string, input: Json): Promise<string> => {
    if (name === "search_knowledge" || name === "search_contacts") {
      // search_contacts is owner-only; a public caller must never reach it even
      // if a tool name is somehow injected into the run.
      if (isPublic && name === "search_contacts") return "Not available.";
      const emb = await embedOne(String(input?.query ?? ""));
      const asked: string[] | null = name === "search_contacts" ? ["crm_contacts"] : (input?.source_types ?? null);
      const sourceTypes = isPublic
        ? (Array.isArray(asked) ? asked.filter((t: string) => PUBLIC_SOURCE_TYPES.includes(t)) : PUBLIC_SOURCE_TYPES.slice())
        : asked;
      if (isPublic && Array.isArray(sourceTypes) && sourceTypes.length === 0) {
        return "No matching content found.";
      }
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
    if (name === "list_blueprints") {
      const { data } = await admin
        .from("blueprints")
        .select("name, slug, tagline, price_cents, currency, vertical, demo_url")
        .eq("status", "live")
        .order("name");
      const rows = (data ?? []) as Record<string, unknown>[];
      if (!rows.length) return "No blueprints are currently available to buy.";
      return JSON.stringify(rows);
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
    if (name === "list_social_accounts") {
      const { data } = await admin.from("social_accounts")
        .select("platform, handle, display_name, status, last_error")
        .eq("organization_id", orgId).neq("status", "revoked").order("platform");
      const rows = (data ?? []) as Json[];
      if (rows.length === 0) return "No social accounts are connected. They are connected in Graphics → Accounts.";
      return JSON.stringify(rows);
    }
    if (name === "list_designs") {
      const { data } = await admin.from("designs")
        .select("id, title, status, png_url, updated_at")
        .eq("organization_id", orgId).neq("status", "archived")
        .order("updated_at", { ascending: false }).limit(40);
      // postable, not png_url: the URL is of no use to the model and the only
      // thing it needs to know is whether the design can go out yet.
      return JSON.stringify((data ?? []).map((d: Json) => ({
        title: d.title, status: d.status, postable: Boolean(d.png_url),
        updated_at: d.updated_at,
      })));
    }
    if (name === "list_social_posts") {
      const { data } = await admin.from("social_posts")
        .select("caption, scheduled_at, status, social_targets(platform, status, likes, comments, permalink)")
        .eq("organization_id", orgId).order("scheduled_at", { ascending: false }).limit(30);
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
