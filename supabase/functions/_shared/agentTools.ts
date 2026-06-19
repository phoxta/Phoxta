// Phoxta — the unified agent's tool surface. Read/RAG tools (from tools.ts)
// plus guardrailed WRITE tools that let the one agent actually operate the
// business: schedule, capture/qualify leads, open tickets, route by location,
// schedule callbacks, escalate. All hard-scoped to one org; actions are
// recorded on the shared ctx so the caller can show what the agent did.
import type { SupabaseClient } from "./supabaseAdmin.ts";
import type { Tool } from "./anthropic.ts";
import { READ_TOOLS, toolRunner } from "./tools.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

export type AgentCtx = {
  conversationId: string | null;
  customer: { name?: string; phone?: string; email?: string; zip?: string };
  contactId: string | null;
  locationId: string | null;
  actions: string[];
};

const WRITE_TOOLS: Tool[] = [
  {
    name: "check_availability",
    description: "Check open appointment slots before offering a time. Optionally filter by service.",
    input_schema: { type: "object", properties: { service: { type: "string" } } },
  },
  {
    name: "book_appointment",
    description: "Book an appointment once the customer confirms a specific time (ISO 8601).",
    input_schema: {
      type: "object",
      properties: { service: { type: "string" }, start_at: { type: "string" }, customer_name: { type: "string" }, customer_email: { type: "string" } },
      required: ["start_at"],
    },
  },
  {
    name: "reschedule_appointment",
    description: "Move the customer's most recent appointment to a new time (ISO 8601).",
    input_schema: { type: "object", properties: { start_at: { type: "string" } }, required: ["start_at"] },
  },
  {
    name: "capture_lead",
    description: "Save the customer as a CRM contact/lead. Call this whenever you learn their name and a phone or email.",
    input_schema: { type: "object", properties: { name: { type: "string" }, phone: { type: "string" }, email: { type: "string" }, notes: { type: "string" } } },
  },
  {
    name: "qualify_lead",
    description: "Record a lead-qualification result for this conversation (filters spam, scores intent).",
    input_schema: {
      type: "object",
      properties: { score: { type: "number", description: "0-100 buying intent" }, qualified: { type: "boolean" }, reason: { type: "string" } },
      required: ["score", "qualified"],
    },
  },
  {
    name: "create_ticket",
    description: "Open a support ticket for an issue or complaint that needs follow-up.",
    input_schema: { type: "object", properties: { subject: { type: "string" }, message: { type: "string" } }, required: ["subject"] },
  },
  {
    name: "recommend_products",
    description: "Get the catalog to make an upsell or cross-sell recommendation.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "route_location",
    description: "Route the caller to the right branch/location by ZIP code and service type (multi-location call center).",
    input_schema: { type: "object", properties: { zip: { type: "string" }, service: { type: "string" } } },
  },
  {
    name: "schedule_callback",
    description: "Queue a callback to the customer (e.g. instant callback or after-hours follow-up).",
    input_schema: { type: "object", properties: { when: { type: "string" }, channel: { type: "string", enum: ["call", "sms", "email"] }, reason: { type: "string" } } },
  },
  {
    name: "escalate_to_human",
    description: "Hand the conversation to a human teammate for complaints, refunds, or anything you can't resolve.",
    input_schema: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"] },
  },
];

export const AGENT_TOOLS: Tool[] = [...READ_TOOLS, ...WRITE_TOOLS];

const isWrite = new Set(WRITE_TOOLS.map((t) => t.name));

export function agentToolRunner(admin: SupabaseClient, orgId: string, ctx: AgentCtx) {
  const readRun = toolRunner(admin, orgId);

  async function findServiceId(name?: string): Promise<string | null> {
    if (!name) return null;
    const { data } = await admin.from("services").select("id").eq("organization_id", orgId).ilike("name", `%${name}%`).limit(1).maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
  }

  return async (name: string, input: Json): Promise<string> => {
    if (!isWrite.has(name)) return readRun(name, input);

    if (name === "check_availability") {
      const { data: booked } = await admin
        .from("bookings")
        .select("start_at")
        .eq("organization_id", orgId)
        .gte("start_at", new Date().toISOString());
      const taken = new Set(((booked as { start_at: string }[] | null) ?? []).map((b) => new Date(b.start_at).toISOString().slice(0, 13)));
      const slots: string[] = [];
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      for (let day = 1; day <= 14 && slots.length < 6; day++) {
        const date = new Date(d.getTime() + day * 86400000);
        const dow = date.getUTCDay();
        if (dow === 0 || dow === 6) continue;
        for (const hour of [9, 11, 13, 15]) {
          const slot = new Date(date);
          slot.setUTCHours(hour, 0, 0, 0);
          if (!taken.has(slot.toISOString().slice(0, 13))) slots.push(slot.toISOString());
          if (slots.length >= 6) break;
        }
      }
      return JSON.stringify({ available: slots });
    }

    if (name === "book_appointment") {
      const serviceId = await findServiceId(input.service);
      const { data, error } = await admin
        .from("bookings")
        .insert({
          organization_id: orgId,
          service_id: serviceId,
          contact_id: ctx.contactId,
          customer_name: input.customer_name || ctx.customer.name || "",
          customer_email: input.customer_email || ctx.customer.email || "",
          start_at: input.start_at,
          status: "confirmed",
        })
        .select("id")
        .single();
      if (error) return `Could not book: ${error.message}`;
      ctx.actions.push(`Booked appointment for ${new Date(input.start_at).toLocaleString()}`);
      return `Booked (${(data as { id: string }).id}) for ${input.start_at}.`;
    }

    if (name === "reschedule_appointment") {
      let q = admin.from("bookings").select("id").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(1);
      if (ctx.customer.email) q = q.eq("customer_email", ctx.customer.email);
      const { data: b } = await q.maybeSingle();
      if (!b) return "No appointment found to reschedule.";
      await admin.from("bookings").update({ start_at: input.start_at, status: "confirmed" }).eq("id", (b as { id: string }).id);
      ctx.actions.push(`Rescheduled to ${new Date(input.start_at).toLocaleString()}`);
      return `Rescheduled to ${input.start_at}.`;
    }

    if (name === "capture_lead") {
      const email = input.email || ctx.customer.email || "";
      const name2 = input.name || ctx.customer.name || "Lead";
      const phone = input.phone || ctx.customer.phone || "";
      let contactId: string | null = null;
      if (email) {
        const { data: existing } = await admin.from("crm_contacts").select("id").eq("organization_id", orgId).eq("email", email).maybeSingle();
        contactId = (existing as { id: string } | null)?.id ?? null;
      }
      if (contactId) {
        await admin.from("crm_contacts").update({ name: name2, phone, notes: input.notes ?? "" }).eq("id", contactId);
      } else {
        const { data: created } = await admin
          .from("crm_contacts")
          .insert({ organization_id: orgId, name: name2, email, phone, notes: input.notes ?? "", stage: "lead" })
          .select("id")
          .single();
        contactId = (created as { id: string } | null)?.id ?? null;
      }
      ctx.contactId = contactId;
      ctx.actions.push("Captured lead in CRM");
      return "Lead saved.";
    }

    if (name === "qualify_lead") {
      if (ctx.conversationId) {
        await admin.from("conversations").update({ qualified: !!input.qualified, lead_score: Math.round(input.score ?? 0) }).eq("id", ctx.conversationId);
      }
      if (ctx.contactId) await admin.from("crm_contacts").update({ lead_score: Math.round(input.score ?? 0) }).eq("id", ctx.contactId);
      ctx.actions.push(`Qualified lead (${input.qualified ? "hot" : "not yet"}, score ${Math.round(input.score ?? 0)})`);
      return "Recorded.";
    }

    if (name === "create_ticket") {
      const { data: t, error } = await admin
        .from("tickets")
        .insert({ organization_id: orgId, contact_id: ctx.contactId, subject: input.subject, customer_name: ctx.customer.name || "", customer_email: ctx.customer.email || "", priority: "normal" })
        .select("id")
        .single();
      if (error) return `Could not open ticket: ${error.message}`;
      if (input.message) {
        await admin.from("ticket_messages").insert({ organization_id: orgId, ticket_id: (t as { id: string }).id, author: "customer", body: input.message });
      }
      ctx.actions.push("Opened support ticket");
      return "Ticket opened.";
    }

    if (name === "recommend_products") {
      const { data } = await admin.from("products").select("name, description, price_cents").eq("organization_id", orgId).eq("status", "active").limit(40);
      return JSON.stringify(data ?? []);
    }

    if (name === "route_location") {
      const zip = input.zip || ctx.customer.zip || "";
      const { data: locId } = await admin.rpc("app_route_location", { p_org: orgId, p_zip: zip, p_service: input.service ?? "" });
      if (!locId) return "No matching location found.";
      const { data: loc } = await admin.from("locations").select("name, phone").eq("id", locId).maybeSingle();
      ctx.locationId = locId as string;
      if (ctx.conversationId) await admin.from("conversations").update({ location_id: locId }).eq("id", ctx.conversationId);
      ctx.actions.push(`Routed to ${(loc as { name: string } | null)?.name ?? "branch"}`);
      return JSON.stringify(loc ?? { name: "branch" });
    }

    if (name === "schedule_callback") {
      const due = input.when ? new Date(input.when) : new Date();
      await admin.from("outbound_tasks").insert({
        organization_id: orgId,
        type: "instant_callback",
        contact_id: ctx.contactId,
        conversation_id: ctx.conversationId,
        channel: input.channel || "call",
        to_ref: ctx.customer.phone || ctx.customer.email || "",
        customer_name: ctx.customer.name || "",
        due_at: isNaN(due.getTime()) ? new Date().toISOString() : due.toISOString(),
        payload: { reason: input.reason ?? "" },
      });
      ctx.actions.push("Scheduled a callback");
      return "Callback scheduled.";
    }

    if (name === "escalate_to_human") {
      if (ctx.conversationId) await admin.from("conversations").update({ status: "escalated" }).eq("id", ctx.conversationId);
      const { data: members } = await admin.from("organization_memberships").select("user_id").eq("organization_id", orgId).in("role", ["owner", "admin"]);
      const rows = ((members as { user_id: string }[] | null) ?? []).map((m) => ({
        user_id: m.user_id,
        title: "Conversation escalated",
        body: input.reason || "A customer conversation needs a human.",
        kind: "info",
        link: "/dashboard/businesses",
      }));
      if (rows.length) await admin.from("notifications").insert(rows);
      ctx.actions.push("Escalated to a human");
      return "Escalated to your team.";
    }

    return "Unknown tool.";
  };
}
