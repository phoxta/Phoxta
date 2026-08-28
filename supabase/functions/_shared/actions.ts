// Write/action tools for the operator agent — guardrailed, org-scoped mutations.
// Execution is governed by per-tool policy: 'off' (blocked), 'approve' (queued for
// the owner), or 'auto' (run now). Every attempt is written to agent_audit_log.
import type { SupabaseClient } from "./supabaseAdmin.ts";
import { internalProofHeaders } from "./internalProof.ts";
import type { Tool } from "./anthropic.ts";
import { getAccessToken, gmailSendRaw, createDoc, createEvent, appendSheet } from "./google.ts";
import { dispatch, placeAiCall } from "./dispatch.ts";
import { autoReplyAllowed, deliverAutoReply } from "./autoReply.ts";
import { orgReplyTo } from "./conversationEmail.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

export const WRITE_TOOLS: Tool[] = [
  { name: "update_product_price", description: "Change a product's price. Give the product name (or id) and the new price in dollars.", input_schema: { type: "object", properties: { product: { type: "string" }, price: { type: "number" } }, required: ["product", "price"] } },
  { name: "set_product_stock", description: "Set a product's stock quantity. Give the product name (or id) and the new stock.", input_schema: { type: "object", properties: { product: { type: "string" }, stock: { type: "number" } }, required: ["product", "stock"] } },
  { name: "fulfill_order", description: "Mark an order as fulfilled. Give the order id.", input_schema: { type: "object", properties: { order_id: { type: "string" } }, required: ["order_id"] } },
  { name: "set_reservation_status", description: "Update a reservation's status.", input_schema: { type: "object", properties: { reservation_id: { type: "string" }, status: { type: "string", enum: ["pending", "confirmed", "completed", "cancelled"] } }, required: ["reservation_id", "status"] } },
  { name: "create_blog_post", description: "Write and publish a blog post for the business.", input_schema: { type: "object", properties: { title: { type: "string" }, excerpt: { type: "string" }, body: { type: "string" } }, required: ["title", "body"] } },
  { name: "publish_page", description: "Create or update a published content page (e.g. about, terms).", input_schema: { type: "object", properties: { slug: { type: "string" }, title: { type: "string" }, body: { type: "string" } }, required: ["slug", "title", "body"] } },
  { name: "google_send_email", description: "Send an email from the business's connected Google Workspace mailbox (Gmail). Give recipient, subject and body.", input_schema: { type: "object", properties: { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" } }, required: ["to", "subject", "body"] } },
  { name: "google_create_doc", description: "Create a Google Doc in the connected Workspace (e.g. a proposal, quote or summary). Give a title and optional body text.", input_schema: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } }, required: ["title"] } },
  { name: "google_create_event", description: "Create a Google Calendar event. Give a title, ISO start and end datetimes, and optional attendee emails.", input_schema: { type: "object", properties: { summary: { type: "string" }, start: { type: "string" }, end: { type: "string" }, attendees: { type: "array", items: { type: "string" } } }, required: ["summary", "start"] } },
  { name: "google_append_sheet", description: "Append a row to a Google Sheet (e.g. log a lead, order or note). Give the spreadsheet ID and the row's cell values.", input_schema: { type: "object", properties: { spreadsheet_id: { type: "string" }, row: { type: "array", items: { type: "string" } } }, required: ["spreadsheet_id", "row"] } },

  // --- Commerce ---
  { name: "create_product", description: "Add a new product to the catalog. Give a name and price (in dollars); optional SKU, description, stock and status.", input_schema: { type: "object", properties: { name: { type: "string" }, price: { type: "number" }, stock: { type: "number" }, sku: { type: "string" }, description: { type: "string" }, status: { type: "string", enum: ["active", "draft", "archived"] } }, required: ["name", "price"] } },
  { name: "set_product_status", description: "Set a product's status (publish, draft or archive it). Give the product name (or id).", input_schema: { type: "object", properties: { product: { type: "string" }, status: { type: "string", enum: ["active", "draft", "archived"] } }, required: ["product", "status"] } },
  { name: "set_order_status", description: "Update an order's status. Reference the order by id or customer name.", input_schema: { type: "object", properties: { order: { type: "string" }, status: { type: "string", enum: ["pending", "paid", "fulfilled", "cancelled", "refunded"] } }, required: ["order", "status"] } },

  // --- CRM ---
  { name: "create_contact", description: "Add a customer/contact to the CRM. Give a name; optional email, phone, company and stage.", input_schema: { type: "object", properties: { name: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, company: { type: "string" }, stage: { type: "string", enum: ["lead", "prospect", "customer", "churned"] } }, required: ["name"] } },
  { name: "update_contact_stage", description: "Move a contact to a different pipeline stage. Reference the contact by name, email or id.", input_schema: { type: "object", properties: { contact: { type: "string" }, stage: { type: "string", enum: ["lead", "prospect", "customer", "churned"] } }, required: ["contact", "stage"] } },
  { name: "add_contact_note", description: "Append a note to a contact's record. Reference the contact by name, email or id.", input_schema: { type: "object", properties: { contact: { type: "string" }, note: { type: "string" } }, required: ["contact", "note"] } },
  { name: "tag_contact", description: "Set the tags on a contact (replaces existing tags). Reference the contact by name, email or id.", input_schema: { type: "object", properties: { contact: { type: "string" }, tags: { type: "array", items: { type: "string" } } }, required: ["contact", "tags"] } },

  // --- Invoicing ---
  { name: "create_invoice", description: "Create a draft invoice for a customer with line items (each: description, quantity, unit_price in dollars).", input_schema: { type: "object", properties: { customer_name: { type: "string" }, customer_email: { type: "string" }, due_date: { type: "string" }, items: { type: "array", items: { type: "object", properties: { description: { type: "string" }, quantity: { type: "number" }, unit_price: { type: "number" } }, required: ["description", "quantity", "unit_price"] } } }, required: ["customer_name", "items"] } },
  { name: "set_invoice_status", description: "Update an invoice's status (e.g. mark it sent, paid or void). Reference it by number, customer name or id.", input_schema: { type: "object", properties: { invoice: { type: "string" }, status: { type: "string", enum: ["draft", "sent", "paid", "void"] } }, required: ["invoice", "status"] } },

  // --- Bookings ---
  { name: "create_service", description: "Add a bookable service. Give a name, duration in minutes and price in dollars.", input_schema: { type: "object", properties: { name: { type: "string" }, duration_min: { type: "number" }, price: { type: "number" } }, required: ["name"] } },
  { name: "create_booking", description: "Create an appointment/booking. Give the customer name and an ISO start datetime; optional service name, email and notes.", input_schema: { type: "object", properties: { customer_name: { type: "string" }, start_at: { type: "string" }, service: { type: "string" }, customer_email: { type: "string" }, notes: { type: "string" } }, required: ["customer_name", "start_at"] } },
  { name: "set_booking_status", description: "Update a booking's status. Reference it by customer name or id.", input_schema: { type: "object", properties: { booking: { type: "string" }, status: { type: "string", enum: ["pending", "confirmed", "completed", "cancelled"] } }, required: ["booking", "status"] } },

  // --- Reservations ---
  { name: "block_availability", description: "Block a resource/product as unavailable for a date range (a blackout). Reference the resource by product name, give start_date and end_date (YYYY-MM-DD).", input_schema: { type: "object", properties: { product: { type: "string" }, start_date: { type: "string" }, end_date: { type: "string" }, reason: { type: "string" } }, required: ["product", "start_date", "end_date"] } },

  // --- Helpdesk ---
  { name: "create_ticket", description: "Open a support ticket. Give a subject and customer name; optional email, priority and first message.", input_schema: { type: "object", properties: { subject: { type: "string" }, customer_name: { type: "string" }, customer_email: { type: "string" }, priority: { type: "string", enum: ["low", "normal", "high"] }, message: { type: "string" } }, required: ["subject", "customer_name"] } },
  { name: "reply_ticket", description: "Post an agent reply on a support ticket. Reference the ticket by subject or id.", input_schema: { type: "object", properties: { ticket: { type: "string" }, body: { type: "string" } }, required: ["ticket", "body"] } },
  { name: "reply_conversation", description: "Reply inside an existing Inbox conversation, on the channel it came in on (SMS, WhatsApp or email). Use this to answer a customer who already wrote in — send_message is for starting a NEW thread. Identify the conversation by its id from list_conversations, or by the customer name.", input_schema: { type: "object", properties: { conversation: { type: "string" }, body: { type: "string" } }, required: ["conversation", "body"] } },
  { name: "set_conversation_status", description: "Change an Inbox conversation's status: open, handled, escalated or closed.", input_schema: { type: "object", properties: { conversation: { type: "string" }, status: { type: "string" } }, required: ["conversation", "status"] } },
  { name: "assign_conversation", description: "Assign an Inbox conversation to a teammate by name or email, or pass unassign to clear it.", input_schema: { type: "object", properties: { conversation: { type: "string" }, assignee: { type: "string" } }, required: ["conversation", "assignee"] } },
  { name: "set_ticket_status", description: "Update a ticket's status. Reference it by subject or id.", input_schema: { type: "object", properties: { ticket: { type: "string" }, status: { type: "string", enum: ["open", "pending", "resolved", "closed"] } }, required: ["ticket", "status"] } },

  // --- Marketing ---
  { name: "create_campaign", description: "Create a marketing campaign (draft). Give a name; optional channel (email/sms), subject, body and audience.", input_schema: { type: "object", properties: { name: { type: "string" }, channel: { type: "string", enum: ["email", "sms"] }, subject: { type: "string" }, body: { type: "string" }, audience: { type: "string" } }, required: ["name"] } },
  { name: "send_campaign", description: "Send a campaign to the business's contacts. Reference it by name or id.", input_schema: { type: "object", properties: { campaign: { type: "string" } }, required: ["campaign"] } },

  // --- Social ---
  // Scheduling, not publishing. The row goes into the same queue the console
  // writes to and the same cron worker publishes it, so there is exactly one
  // piece of code that has ever put a post on the wire — and a post the
  // operator scheduled can be edited, moved or cancelled from the console like
  // any other.
  { name: "schedule_post", description: "Schedule a social post to the business's connected accounts. It goes out from the server at the time given — nothing needs to be open. Pick a design by title from list_designs (it must be postable) and check list_social_accounts first. Instagram extras: collaborators are up to 3 usernames invited as co-authors, who each have to accept; alt_text describes the picture; also_story puts the same picture on the story as well.", input_schema: { type: "object", properties: { design: { type: "string", description: "The design's title, from list_designs." }, caption: { type: "string" }, when: { type: "string", description: "ISO datetime. Omit to send on the next tick, within five minutes." }, platforms: { type: "array", items: { type: "string", enum: ["instagram", "linkedin", "tiktok", "x"] }, description: "Omit to use every connected account." }, collaborators: { type: "array", items: { type: "string" }, description: "Instagram only, up to 3 usernames." }, alt_text: { type: "string" }, also_story: { type: "boolean" } }, required: ["design", "caption"] } },

  { name: "plan_content", description: "Plan a month of social content: the posts, when each goes out, the words on each picture and the caption. It creates the designs and the pictures too. NOTHING GOES OUT until the owner approves the plan — every post is written as a draft, so this is safe to run and show them. Give a brief saying what the month should be about; optionally how many days to spread it over, how many posts, and imagery \"stock\" (real photographs, free, the default) or \"generated\" (made to order, costs per picture).", input_schema: { type: "object", properties: { brief: { type: "string" }, days: { type: "number", description: "Days to spread it over. Default 30." }, posts: { type: "number", description: "How many posts. Default 12, maximum 30." }, starts_on: { type: "string", description: "YYYY-MM-DD. Default today." }, imagery: { type: "string", enum: ["stock", "generated"] } }, required: ["brief"] } },

  // --- Call center ---
  { name: "add_location", description: "Add a business/branch location for call routing. Give a name and ZIP; optional phone and service types.", input_schema: { type: "object", properties: { name: { type: "string" }, zip: { type: "string" }, phone: { type: "string" }, service_types: { type: "array", items: { type: "string" } } }, required: ["name"] } },

  // --- Outreach: contact customers directly ---
  { name: "send_message", description: "Send a message to a customer over SMS, WhatsApp or email. 'to' is a contact name, phone number or email address.", input_schema: { type: "object", properties: { to: { type: "string" }, channel: { type: "string", enum: ["sms", "whatsapp", "email"] }, message: { type: "string" }, subject: { type: "string" } }, required: ["to", "channel", "message"] } },
  { name: "place_call", description: "Place an outbound phone call where the business's AI voice agent talks to the customer. 'to' is a contact name or phone number; 'opening' is an optional purpose/first line.", input_schema: { type: "object", properties: { to: { type: "string" }, opening: { type: "string" } }, required: ["to"] } },
];

const WRITE_NAMES = new Set(WRITE_TOOLS.map((t) => t.name));
export const isWriteTool = (name: string) => WRITE_NAMES.has(name);

const slugify = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function resolveProduct(admin: SupabaseClient, orgId: string, ref: string) {
  const byId = /^[0-9a-f-]{36}$/i.test(ref);
  let q = admin.from("products").select("id, name").eq("organization_id", orgId);
  q = byId ? q.eq("id", ref) : q.ilike("name", `%${ref}%`);
  const { data } = await q.limit(1);
  return ((data as Array<{ id: string; name: string }> | null) ?? [])[0] ?? null;
}

// Generic "resolve an org-scoped row by id, or fuzzily by one of `matchCols`".
// Returns the most recent match (ordered by `orderCol`) so natural-language
// references like a customer name or invoice number land on a real row.
async function resolveRow(
  admin: SupabaseClient, orgId: string, table: string, cols: string, ref: string, matchCols: string[], orderCol = "created_at",
): Promise<Json> {
  const r = String(ref).trim();
  const byId = /^[0-9a-f-]{36}$/i.test(r);
  let q = admin.from(table).select(cols).eq("organization_id", orgId);
  q = byId ? q.eq("id", r) : q.or(matchCols.map((c) => `${c}.ilike.%${r}%`).join(","));
  const { data } = await q.order(orderCol, { ascending: false }).limit(1);
  return ((data as Json[] | null) ?? [])[0] ?? null;
}

const resolveContact = (admin: SupabaseClient, orgId: string, ref: string): Promise<Json> =>
  resolveRow(admin, orgId, "crm_contacts", "id, name, email, phone", ref, ["name", "email", "phone"]);

// Resolve a destination for outreach: accept a raw email/phone, otherwise look
// up a contact by name and use its email (for email) or phone (for sms/whatsapp/call).
async function destinationFor(admin: SupabaseClient, orgId: string, ref: string, channel: string): Promise<string | null> {
  const r = String(ref).trim();
  if (channel === "email") {
    if (r.includes("@")) return r;
    const c = await resolveContact(admin, orgId, r);
    return (c?.email as string) || null;
  }
  if (/^[+]?[\d][\d\s().-]{5,}$/.test(r)) return r.replace(/[^\d+]/g, "");
  const c = await resolveContact(admin, orgId, r);
  return (c?.phone as string) || null;
}

/** Perform the mutation. Returns a human summary or throws. */
export async function runWrite(admin: SupabaseClient, orgId: string, tool: string, a: Json): Promise<string> {
  if (tool === "update_product_price") {
    const p = await resolveProduct(admin, orgId, String(a.product));
    if (!p) throw new Error(`No product matching "${a.product}".`);
    await admin.from("products").update({ price_cents: Math.round(Number(a.price) * 100) }).eq("id", p.id);
    return `Set ${p.name} price to $${Number(a.price)}.`;
  }
  if (tool === "set_product_stock") {
    const p = await resolveProduct(admin, orgId, String(a.product));
    if (!p) throw new Error(`No product matching "${a.product}".`);
    const n = Math.max(0, Math.round(Number(a.stock)));
    await admin.from("products").update({ stock: n }).eq("id", p.id);
    return `Set ${p.name} stock to ${n}.`;
  }
  if (tool === "fulfill_order") {
    const { error } = await admin.from("orders").update({ fulfillment_status: "fulfilled", status: "fulfilled" }).eq("id", a.order_id).eq("organization_id", orgId);
    if (error) throw new Error(error.message);
    return `Order ${String(a.order_id).slice(0, 8)} marked fulfilled.`;
  }
  if (tool === "set_reservation_status") {
    const { error } = await admin.from("reservations").update({ status: a.status }).eq("id", a.reservation_id).eq("organization_id", orgId);
    if (error) throw new Error(error.message);
    return `Reservation ${String(a.reservation_id).slice(0, 8)} set to ${a.status}.`;
  }
  if (tool === "create_blog_post") {
    const slug = `${slugify(String(a.title))}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await admin.from("blog_posts").insert({ organization_id: orgId, slug, title: a.title, excerpt: a.excerpt ?? "", body: a.body, author: "AI Operator", status: "published" });
    if (error) throw new Error(error.message);
    return `Published blog post "${a.title}".`;
  }
  if (tool === "publish_page") {
    const { error } = await admin.from("cms_pages").upsert({ organization_id: orgId, slug: slugify(String(a.slug)), title: a.title, body: a.body, status: "published", published_at: new Date().toISOString() }, { onConflict: "organization_id,slug" });
    if (error) throw new Error(error.message);
    return `Published page "${a.title}".`;
  }
  if (tool === "google_send_email") {
    const token = await getAccessToken(admin, orgId);
    if (!token) throw new Error("Google Workspace isn't connected for this business.");
    await gmailSendRaw(token, { to: String(a.to), subject: String(a.subject ?? ""), text: String(a.body ?? "") });
    return `Emailed ${a.to} — "${a.subject}".`;
  }
  if (tool === "google_create_doc") {
    const token = await getAccessToken(admin, orgId);
    if (!token) throw new Error("Google Workspace isn't connected for this business.");
    const link = await createDoc(token, { title: String(a.title), text: a.body ? String(a.body) : undefined });
    return `Created Google Doc "${a.title}": ${link}`;
  }
  if (tool === "google_create_event") {
    const token = await getAccessToken(admin, orgId);
    if (!token) throw new Error("Google Workspace isn't connected for this business.");
    await createEvent(token, { summary: String(a.summary), start: String(a.start), end: a.end ? String(a.end) : undefined, attendees: Array.isArray(a.attendees) ? a.attendees : undefined });
    return `Created calendar event "${a.summary}".`;
  }
  if (tool === "google_append_sheet") {
    const token = await getAccessToken(admin, orgId);
    if (!token) throw new Error("Google Workspace isn't connected for this business.");
    const row = (Array.isArray(a.row) ? a.row : [a.row]).map((v: unknown) => String(v ?? ""));
    await appendSheet(token, String(a.spreadsheet_id), [row]);
    return `Logged a row to the sheet.`;
  }
  // --- Commerce ---
  if (tool === "create_product") {
    const { error } = await admin.from("products").insert({
      organization_id: orgId, name: String(a.name).trim(), sku: a.sku ? String(a.sku) : "",
      description: a.description ? String(a.description) : "", price_cents: Math.round(Number(a.price) * 100),
      stock: a.stock != null ? Math.max(0, Math.round(Number(a.stock))) : 0, status: a.status ?? "active",
    });
    if (error) throw new Error(error.message);
    return `Created product "${a.name}" at $${Number(a.price)}.`;
  }
  if (tool === "set_product_status") {
    const p = await resolveProduct(admin, orgId, String(a.product));
    if (!p) throw new Error(`No product matching "${a.product}".`);
    const { error } = await admin.from("products").update({ status: a.status }).eq("id", p.id);
    if (error) throw new Error(error.message);
    return `Set ${p.name} to ${a.status}.`;
  }
  if (tool === "set_order_status") {
    const o = await resolveRow(admin, orgId, "orders", "id, customer_name", String(a.order), ["customer_name", "customer_email"]);
    if (!o) throw new Error(`No order matching "${a.order}".`);
    const patch: Json = { status: a.status };
    if (a.status === "fulfilled") patch.fulfillment_status = "fulfilled";
    const { error } = await admin.from("orders").update(patch).eq("id", o.id).eq("organization_id", orgId);
    if (error) throw new Error(error.message);
    return `Order ${String(o.id).slice(0, 8)} set to ${a.status}.`;
  }

  // --- CRM ---
  if (tool === "create_contact") {
    const { error } = await admin.from("crm_contacts").insert({
      organization_id: orgId, name: String(a.name).trim(), email: a.email ? String(a.email) : "",
      phone: a.phone ? String(a.phone) : "", company: a.company ? String(a.company) : "", stage: a.stage ?? "lead",
    });
    if (error) throw new Error(error.message);
    return `Added contact ${a.name}.`;
  }
  if (tool === "update_contact_stage") {
    const c = await resolveContact(admin, orgId, String(a.contact));
    if (!c) throw new Error(`No contact matching "${a.contact}".`);
    const { error } = await admin.from("crm_contacts").update({ stage: a.stage }).eq("id", c.id);
    if (error) throw new Error(error.message);
    return `Moved ${c.name} to ${a.stage}.`;
  }
  if (tool === "add_contact_note") {
    const c = await resolveContact(admin, orgId, String(a.contact));
    if (!c) throw new Error(`No contact matching "${a.contact}".`);
    const { data: cur } = await admin.from("crm_contacts").select("notes").eq("id", c.id).maybeSingle();
    const prev = ((cur as Json)?.notes ?? "").toString();
    const note = `${prev ? prev + "\n" : ""}${new Date().toISOString().slice(0, 10)}: ${String(a.note)}`;
    const { error } = await admin.from("crm_contacts").update({ notes: note }).eq("id", c.id);
    if (error) throw new Error(error.message);
    return `Added a note to ${c.name}.`;
  }
  if (tool === "tag_contact") {
    const c = await resolveContact(admin, orgId, String(a.contact));
    if (!c) throw new Error(`No contact matching "${a.contact}".`);
    const tags = (Array.isArray(a.tags) ? a.tags : [a.tags]).map((t: unknown) => String(t).trim()).filter(Boolean);
    const { error } = await admin.from("crm_contacts").update({ tags }).eq("id", c.id);
    if (error) throw new Error(error.message);
    return `Tagged ${c.name}: ${tags.join(", ")}.`;
  }

  // --- Invoicing ---
  if (tool === "create_invoice") {
    const items = (Array.isArray(a.items) ? a.items : []).map((i: Json) => ({
      description: String(i.description ?? ""), quantity: Math.max(1, Math.round(Number(i.quantity ?? 1))),
      unit_price_cents: Math.round(Number(i.unit_price ?? 0) * 100),
    }));
    const total = items.reduce((s: number, i: Json) => s + i.quantity * i.unit_price_cents, 0);
    const number = `INV-${Date.now().toString().slice(-6)}`;
    const { data: inv, error } = await admin.from("invoices").insert({
      organization_id: orgId, number, customer_name: String(a.customer_name).trim(),
      customer_email: a.customer_email ? String(a.customer_email) : "", due_date: a.due_date || null,
      total_cents: total, status: "draft",
    }).select("id").single();
    if (error || !inv) throw new Error(error?.message ?? "Could not create invoice.");
    if (items.length) await admin.from("invoice_items").insert(items.map((i: Json) => ({ organization_id: orgId, invoice_id: (inv as Json).id, ...i })));
    return `Created invoice ${number} for ${a.customer_name} ($${(total / 100).toFixed(2)}).`;
  }
  if (tool === "set_invoice_status") {
    const inv = await resolveRow(admin, orgId, "invoices", "id, number", String(a.invoice), ["number", "customer_name"]);
    if (!inv) throw new Error(`No invoice matching "${a.invoice}".`);
    const { error } = await admin.from("invoices").update({ status: a.status }).eq("id", inv.id);
    if (error) throw new Error(error.message);
    return `Invoice ${inv.number} set to ${a.status}.`;
  }

  // --- Bookings ---
  if (tool === "create_service") {
    const { error } = await admin.from("services").insert({
      organization_id: orgId, name: String(a.name).trim(),
      duration_min: Math.max(1, Math.round(Number(a.duration_min ?? 30))), price_cents: Math.round(Number(a.price ?? 0) * 100),
    });
    if (error) throw new Error(error.message);
    return `Created service "${a.name}".`;
  }
  if (tool === "create_booking") {
    let serviceId: string | null = null;
    if (a.service) { const s = await resolveRow(admin, orgId, "services", "id, name", String(a.service), ["name"]); serviceId = (s?.id as string) ?? null; }
    const { error } = await admin.from("bookings").insert({
      organization_id: orgId, service_id: serviceId, customer_name: String(a.customer_name).trim(),
      customer_email: a.customer_email ? String(a.customer_email) : "", start_at: String(a.start_at), notes: a.notes ? String(a.notes) : "", status: "pending",
    });
    if (error) throw new Error(error.message);
    return `Booked ${a.customer_name} for ${a.start_at}.`;
  }
  if (tool === "set_booking_status") {
    const b = await resolveRow(admin, orgId, "bookings", "id, customer_name", String(a.booking), ["customer_name", "customer_email"], "start_at");
    if (!b) throw new Error(`No booking matching "${a.booking}".`);
    const { error } = await admin.from("bookings").update({ status: a.status }).eq("id", b.id);
    if (error) throw new Error(error.message);
    return `Booking for ${b.customer_name} set to ${a.status}.`;
  }

  // --- Reservations ---
  if (tool === "block_availability") {
    const p = await resolveProduct(admin, orgId, String(a.product));
    if (!p) throw new Error(`No resource matching "${a.product}".`);
    const { error } = await admin.from("resource_blackouts").insert({ organization_id: orgId, product_id: p.id, start_date: String(a.start_date), end_date: String(a.end_date), reason: a.reason ? String(a.reason) : "" });
    if (error) throw new Error(error.message);
    return `Blocked ${p.name} from ${a.start_date} to ${a.end_date}.`;
  }

  // --- Helpdesk ---
  if (tool === "create_ticket") {
    const { data: t, error } = await admin.from("tickets").insert({
      organization_id: orgId, subject: String(a.subject).trim(), customer_name: String(a.customer_name).trim(),
      customer_email: a.customer_email ? String(a.customer_email) : "", priority: a.priority ?? "normal",
    }).select("id").single();
    if (error || !t) throw new Error(error?.message ?? "Could not create ticket.");
    if (a.message) await admin.from("ticket_messages").insert({ organization_id: orgId, ticket_id: (t as Json).id, author: "customer", body: String(a.message) });
    return `Opened ticket "${a.subject}".`;
  }
  if (tool === "reply_ticket") {
    const t = await resolveRow(admin, orgId, "tickets", "id, subject", String(a.ticket), ["subject", "customer_name"]);
    if (!t) throw new Error(`No ticket matching "${a.ticket}".`);
    const { error } = await admin.from("ticket_messages").insert({ organization_id: orgId, ticket_id: t.id, author: "agent", body: String(a.body) });
    if (error) throw new Error(error.message);
    return `Replied on "${t.subject}".`;
  }
  if (tool === "set_ticket_status") {
    const t = await resolveRow(admin, orgId, "tickets", "id, subject", String(a.ticket), ["subject", "customer_name"]);
    if (!t) throw new Error(`No ticket matching "${a.ticket}".`);
    const { error } = await admin.from("tickets").update({ status: a.status }).eq("id", t.id);
    if (error) throw new Error(error.message);
    return `Ticket "${t.subject}" set to ${a.status}.`;
  }

  // --- Marketing ---
  if (tool === "create_campaign") {
    const { error } = await admin.from("campaigns").insert({
      organization_id: orgId, name: String(a.name).trim(), channel: a.channel ?? "email",
      subject: a.subject ? String(a.subject) : "", body: a.body ? String(a.body) : "", audience: a.audience ? String(a.audience) : "all", status: "draft",
    });
    if (error) throw new Error(error.message);
    return `Created campaign "${a.name}".`;
  }
  if (tool === "send_campaign") {
    const c = await resolveRow(admin, orgId, "campaigns", "id, name", String(a.campaign), ["name"]);
    if (!c) throw new Error(`No campaign matching "${a.campaign}".`);
    const { count } = await admin.from("crm_contacts").select("id", { count: "exact", head: true }).eq("organization_id", orgId);
    const { error } = await admin.from("campaigns").update({ status: "sent", sent_at: new Date().toISOString(), recipients: count ?? 0 }).eq("id", c.id);
    if (error) throw new Error(error.message);
    return `Sent campaign "${c.name}" to ${count ?? 0} contacts.`;
  }

  // --- Social ---
  if (tool === "schedule_post") {
    const { data: d } = await admin.from("designs")
      .select("id, title, png_url").eq("organization_id", orgId)
      .ilike("title", `%${String(a.design).trim()}%`).limit(1).maybeSingle();
    if (!d) throw new Error(`No design matching "${a.design}". Use list_designs to see them.`);
    // A design with no rendered picture cannot be posted, and finding that out
    // at publish time — in a worker, five minutes later — is the wrong place.
    if (!d.png_url) {
      throw new Error(`"${d.title}" has no picture yet. Open it in Graphics and save it once, which renders it, then it can be posted.`);
    }

    const wanted: string[] = Array.isArray(a.platforms) ? a.platforms.map(String) : [];
    const { data: accts } = await admin.from("social_accounts")
      .select("id, platform, handle").eq("organization_id", orgId).eq("status", "connected");
    const usable = ((accts ?? []) as Json[]).filter((x) => wanted.length === 0 || wanted.includes(x.platform));
    if (usable.length === 0) {
      throw new Error(wanted.length
        ? "None of those channels are connected. They are connected in Graphics → Accounts."
        : "No social accounts are connected. Connect one in Graphics → Accounts.");
    }

    const at = a.when ? new Date(String(a.when)) : new Date();
    if (Number.isNaN(at.getTime())) throw new Error("That date does not parse.");

    const caption = String(a.caption ?? "");
    // Checked against the TIGHTEST chosen channel here rather than at publish
    // time: a caption X refuses for length would otherwise sit in the queue and
    // fail five minutes later, in a worker, where nobody is watching.
    const caps: Record<string, number> = { instagram: 2200, linkedin: 3000, tiktok: 2200, x: 280 };
    const tight = usable.reduce((w: Json | null, x: Json) =>
      !w || (caps[x.platform] ?? 2200) < (caps[w.platform] ?? 2200) ? x : w, null);
    if (tight && caption.length > (caps[tight.platform] ?? 2200)) {
      throw new Error(`That caption is ${caption.length - (caps[tight.platform] ?? 2200)} characters too long for ${tight.platform}.`);
    }

    const collaborators = (Array.isArray(a.collaborators) ? a.collaborators : [])
      .map((c: unknown) => String(c ?? "").trim().replace(/^@+/, "")).filter(Boolean).slice(0, 3);
    const options = (collaborators.length || a.alt_text || a.also_story)
      ? { instagram: {
          collaborators,
          userTags: [],
          altText: String(a.alt_text ?? "").slice(0, 1000),
          alsoStory: Boolean(a.also_story),
        } }
      : {};

    const { data: post, error } = await admin.from("social_posts").insert({
      organization_id: orgId, design_id: d.id, media_url: d.png_url, caption,
      scheduled_at: at.toISOString(), status: "queued", options, created_by: userId,
    }).select("id").single();
    if (error || !post) throw new Error(error?.message ?? "Could not queue it.");

    const { error: tErr } = await admin.from("social_targets").insert(
      usable.map((x: Json) => ({ organization_id: orgId, post_id: post.id, account_id: x.id, platform: x.platform })),
    );
    if (tErr) {
      // A post with no targets would sit queued for ever.
      await admin.from("social_posts").delete().eq("id", post.id);
      throw new Error(tErr.message);
    }

    const where = usable.map((x: Json) => x.platform).join(", ");
    const invited = collaborators.length ? `, inviting ${collaborators.map((c: string) => "@" + c).join(", ")}` : "";
    return `Scheduled "${d.title}" to ${where} for ${at.toLocaleString("en-GB")}${invited}.`;
  }


  if (tool === "plan_content") {
    // The planner is its own function because it spends the model budget and
    // writes a month of rows; calling it here keeps ONE implementation of what
    // a plan is, rather than the operator having a second, simpler idea of it.
    const base = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!base || !key) throw new Error("The planner is not reachable from here.");
    const res = await fetch(`${base}/functions/v1/content-plan`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${key}`,
        apikey: key,
        ...(await internalProofHeaders()),
        // The planner authorises on the caller's membership; the operator is
        // acting for the owner whose session started this turn.
        "x-acting-user": userId ?? "",
      },
      body: JSON.stringify({
        orgId, action: "generate",
        brief: String(a.brief ?? ""),
        days: Number(a.days) || 30,
        posts: Number(a.posts) || 12,
        startsOn: a.starts_on ? String(a.starts_on) : undefined,
        imagery: a.imagery === "generated" ? "generated" : "stock",
      }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || out?.error) throw new Error(out?.error ?? `The planner refused it (HTTP ${res.status}).`);
    return `Planned ${out.posts} posts — "${out.title}". ${out.rationale} Nothing goes out until the plan is approved in Graphics.`;
  }


  // --- Call center ---
  if (tool === "add_location") {
    const { error } = await admin.from("locations").insert({ organization_id: orgId, name: String(a.name).trim(), zip: a.zip ? String(a.zip) : "", phone: a.phone ? String(a.phone) : "", service_types: Array.isArray(a.service_types) ? a.service_types.map((s: unknown) => String(s)) : [] });
    if (error) throw new Error(error.message);
    return `Added location "${a.name}".`;
  }

  // --- Outreach: contact customers directly ---
  if (tool === "send_message") {
    const channel = ["sms", "whatsapp", "email"].includes(a.channel) ? a.channel : "sms";
    const dest = await destinationFor(admin, orgId, String(a.to), channel);
    if (!dest) throw new Error(`No ${channel === "email" ? "email address" : "phone number"} found for "${a.to}".`);
    // The autopilot can run this tool on its own, so the mail it sends must come
    // back to THIS business. Without a Reply-To of its own, dispatch() stamps
    // Phoxta's hello@ on it — the customer's reply then lands in the platform's
    // mailbox instead of the tenant's, which is a cross-tenant disclosure and,
    // if that mailbox is connected, gets them answered by the wrong company.
    let replyTo = "";
    if (channel === "email") {
      replyTo = await orgReplyTo(admin, orgId);
      if (!replyTo) throw new Error("This business has no email address on file for replies — add a billing email in Settings, or connect Google.");
    }
    const r = await dispatch(channel, dest, a.subject ? String(a.subject) : "A message for you", String(a.message), replyTo ? { replyTo } : undefined);
    if (r.status === "failed") throw new Error("Message could not be delivered.");
    return `Sent ${channel} to ${dest}${r.status === "simulated" ? " (simulated — no provider configured)" : ""}.`;
  }
  if (tool === "place_call") {
    const dest = await destinationFor(admin, orgId, String(a.to), "call");
    if (!dest) throw new Error(`No phone number found for "${a.to}".`);
    const { data: cfg } = await admin.from("agent_config").select("public_key").eq("organization_id", orgId).maybeSingle();
    const key = (cfg as Json)?.public_key;
    if (!key) throw new Error("No AI agent is configured for this business yet.");
    const r = await placeAiCall(String(key), dest, a.opening ? String(a.opening) : "");
    await admin.from("call_logs").insert({ organization_id: orgId, direction: "outbound", to_number: dest, outcome: r.status });
    if (!r.ok && r.status !== "simulated") throw new Error(r.error ?? "Call could not be placed.");
    return `Calling ${dest}${r.status === "simulated" ? " (simulated — no telephony configured)" : "…"}`;
  }

  // ── Inbox ────────────────────────────────────────────────────────────────
  if (tool === "reply_conversation") {
    const c = await resolveRow(admin, orgId, "conversations",
      "id, customer_name, customer_phone, customer_email, channel_type", String(a.conversation),
      ["customer_name", "customer_email", "customer_phone"]);
    if (!c) throw new Error(`No conversation matching "${a.conversation}".`);
    const channel = ["sms", "whatsapp", "email"].includes(String((c as Json).channel_type))
      ? String((c as Json).channel_type) : "email";
    const dest = channel === "email" ? (c as Json).customer_email : (c as Json).customer_phone;
    if (!dest) throw new Error(`That conversation has no ${channel === "email" ? "email address" : "phone number"} to reply to.`);
    const conversationId = String((c as Json).id);

    // THE GATES FIRST, then the row.
    //
    // The insert used to be unconditional, so a reply the funnel then refused —
    // because a human had pressed "Take over", because the thread was closed,
    // because the per-thread ceiling was reached — still put an agent bubble on
    // the conversation carrying the operator's words. Nothing was sent, which is
    // the important half, but the person reading the thread saw the AI talking
    // over the human who had just claimed it. A cheap pre-flight settles that
    // before anything is written; deliverAutoReply re-runs every gate anyway.
    const pre = await autoReplyAllowed(admin, orgId, { conversationId, channel, mode: "auto" });
    if (!pre.ok) throw new Error(pre.reason);

    // Recorded before the send, so the thread shows what was said even if the
    // send then fails, and so deliverAutoReply has a row to stamp with the real
    // delivery status. The role was 'assistant', which the CHECK constraint does
    // not allow — so every reply this tool sent was delivered to a real customer
    // and then silently rejected by Postgres, leaving no trace on the thread and
    // nothing in the history the agent reads on its next turn.
    const { data: row, error: recErr } = await admin.from("conversation_messages").insert({
      organization_id: orgId, conversation_id: conversationId, role: "agent",
      channel_type: channel, body: String(a.body), provider_sid: "",
      // A marker, so this row is distinguishable from an automatic reply by
      // anything reading the thread later.
      meta: { source: "agent-operator", tool: "reply_conversation" },
    }).select("id").maybeSingle();
    if (recErr) console.error("[phoxta] reply_conversation could not be recorded:", recErr.message);

    // Everything else goes through the SAME funnel as an automatic reply, for the
    // same reasons: it must not speak over a human who pressed "Take over" (this
    // tool read nothing about ai_paused, so an autopilot objective could answer
    // a thread a person had promised to own), it must not answer a closed
    // thread, it counts against the per-thread ceiling and the daily cap, it is
    // written to the audit trail, and — for email — it answers from the
    // conversation's OWN identity in its own thread with its own subject, rather
    // than from the platform's sending domain under "Re: your message".
    const sent = await deliverAutoReply(admin, orgId, {
      channel,
      trigger: "agent-operator",
      conversationId,
      to: String(dest),
      text: String(a.body),
      agentMessageId: (row as Json)?.id ? String((row as Json).id) : null,
      // NOT gated on the auto_reply switch: this tool has its own policy row
      // (WRITE_TOOL_GROUPS → Inbox → reply_conversation), which runWrite has
      // already enforced before getting here. Applying "answer new customer
      // messages automatically" on top of it would refuse an owner who asked
      // the operator, in words, to reply to somebody. Every other gate — the
      // take-over, the closed thread, the per-thread ceiling, the spacing, the
      // hourly throttle, the daily cap — still applies.
      mode: "auto",
    });
    // "Simulated" is a development environment with no provider wired up, not a
    // failure — the same distinction dispatch() has always drawn.
    const simulated = sent.outcome?.status === "simulated";
    if (!sent.sent && !simulated) throw new Error(sent.reason);

    await admin.from("conversations").update({ last_message_at: new Date().toISOString(), unread: false })
      .eq("id", conversationId).eq("organization_id", orgId);
    return `Replied to ${(c as Json).customer_name || "the customer"} over ${channel}${simulated ? " (simulated — no provider configured)" : ""}.`;
  }
  if (tool === "set_conversation_status") {
    const allowed = ["open", "handled", "escalated", "closed"];
    const status = String(a.status ?? "").toLowerCase();
    if (!allowed.includes(status)) throw new Error(`Status must be one of ${allowed.join(", ")}.`);
    const c = await resolveRow(admin, orgId, "conversations", "id, customer_name", String(a.conversation),
      ["customer_name", "customer_email", "customer_phone"]);
    if (!c) throw new Error(`No conversation matching "${a.conversation}".`);
    const { error } = await admin.from("conversations").update({ status }).eq("id", (c as Json).id);
    if (error) throw new Error(error.message);
    return `Conversation with ${(c as Json).customer_name || "the customer"} set to ${status}.`;
  }
  if (tool === "assign_conversation") {
    const c = await resolveRow(admin, orgId, "conversations", "id, customer_name", String(a.conversation),
      ["customer_name", "customer_email", "customer_phone"]);
    if (!c) throw new Error(`No conversation matching "${a.conversation}".`);
    const who = String(a.assignee ?? "").trim();
    if (!who || who.toLowerCase() === "unassign" || who.toLowerCase() === "nobody") {
      const { error } = await admin.from("conversations").update({ assigned_to: null }).eq("id", (c as Json).id);
      if (error) throw new Error(error.message);
      return `Unassigned the conversation with ${(c as Json).customer_name || "the customer"}.`;
    }
    // Only members of THIS business can be assigned work in it.
    //
    // The query here was `.select("user_id, user_profiles(full_name, email)")` —
    // user_profiles has no `email` column and organization_memberships has no
    // embeddable relationship to it (its foreign key points at auth.users), so
    // PostgREST returned an ERROR that was never thrown, `members` was null, and
    // this tool could never match anybody. Names come from user_profiles by
    // user_id; login addresses come from the Admin API, the same place the rest
    // of the platform reads them.
    const { data: members } = await admin
      .from("organization_memberships")
      .select("user_id")
      .eq("organization_id", orgId);
    const ids = ((members ?? []) as Json[]).map((m) => String(m.user_id));
    if (ids.length === 0) throw new Error(`No teammate in this business matching "${who}".`);
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("user_id, full_name")
      .in("user_id", ids);
    const nameOf = new Map(((profiles ?? []) as Json[]).map((p) => [String(p.user_id), String(p.full_name ?? "")]));
    const needle = who.toLowerCase();
    let hitId = ids.find((id) => (nameOf.get(id) ?? "").toLowerCase().includes(needle));
    if (!hitId && needle.includes("@")) {
      for (const id of ids) {
        try {
          const { data: u } = await admin.auth.admin.getUserById(id);
          if (String(u?.user?.email ?? "").toLowerCase().includes(needle)) { hitId = id; break; }
        } catch { /* an unreadable member is simply not a match */ }
      }
    }
    if (!hitId) throw new Error(`No teammate in this business matching "${who}".`);
    const { error } = await admin.from("conversations").update({ assigned_to: hitId }).eq("id", (c as Json).id);
    if (error) throw new Error(error.message);
    return `Assigned the conversation to ${nameOf.get(hitId) || who}.`;
  }

  throw new Error(`Unknown action ${tool}.`);
}

export function actionTitle(tool: string, a: Json): string {
  switch (tool) {
    case "update_product_price": return `Set ${a.product} price to $${a.price}`;
    case "set_product_stock": return `Set ${a.product} stock to ${a.stock}`;
    case "fulfill_order": return `Fulfil order ${String(a.order_id).slice(0, 8)}`;
    case "set_reservation_status": return `Set reservation ${String(a.reservation_id).slice(0, 8)} to ${a.status}`;
    case "create_blog_post": return `Publish blog post "${a.title}"`;
    case "publish_page": return `Publish page "${a.title}"`;
    case "google_send_email": return `Email ${a.to}: "${a.subject}"`;
    case "google_create_doc": return `Create Google Doc "${a.title}"`;
    case "google_create_event": return `Create calendar event "${a.summary}"`;
    case "google_append_sheet": return `Log a row to a Google Sheet`;
    case "create_product": return `Create product "${a.name}" at $${a.price}`;
    case "set_product_status": return `Set ${a.product} to ${a.status}`;
    case "set_order_status": return `Set order ${a.order} to ${a.status}`;
    case "create_contact": return `Add contact ${a.name}`;
    case "update_contact_stage": return `Move ${a.contact} to ${a.stage}`;
    case "add_contact_note": return `Add a note to ${a.contact}`;
    case "tag_contact": return `Tag ${a.contact}`;
    case "create_invoice": return `Create invoice for ${a.customer_name}`;
    case "set_invoice_status": return `Set invoice ${a.invoice} to ${a.status}`;
    case "create_service": return `Create service "${a.name}"`;
    case "create_booking": return `Book ${a.customer_name} for ${a.start_at}`;
    case "set_booking_status": return `Set booking ${a.booking} to ${a.status}`;
    case "block_availability": return `Block ${a.product}: ${a.start_date}–${a.end_date}`;
    case "create_ticket": return `Open ticket "${a.subject}"`;
    case "reply_ticket": return `Reply on ticket ${a.ticket}`;
    case "reply_conversation": return `Reply to ${a.conversation}`;
    case "set_conversation_status": return `Set conversation ${a.conversation} to ${a.status}`;
    case "assign_conversation": return `Assign ${a.conversation} to ${a.assignee}`;
    case "set_ticket_status": return `Set ticket ${a.ticket} to ${a.status}`;
    case "create_campaign": return `Create campaign "${a.name}"`;
    case "send_campaign": return `Send campaign ${a.campaign}`;
    case "add_location": return `Add location "${a.name}"`;
    case "send_message": return `Send ${a.channel ?? "message"} to ${a.to}`;
    case "place_call": return `Call ${a.to}`;
    default: return tool;
  }
}

/**
 * Before→after snapshots for the approval queue: when an action is queued,
 * capture the current values of the fields its args will change so the owner
 * can judge the diff ("$120 → $90") instead of a bare instruction. Stored under
 * args.__before (jsonb-safe, ignored by runWrite). Best-effort — a failed
 * lookup simply queues the action without a snapshot; per-tool map, default =
 * no snapshot. No schema change.
 */
async function captureBefore(admin: SupabaseClient, orgId: string, tool: string, a: Json): Promise<Json | null> {
  try {
    const product = (cols: string) => resolveRow(admin, orgId, "products", cols, String(a.product), ["name", "sku"]);
    switch (tool) {
      case "update_product_price": {
        const p = await product("id, name, price_cents");
        return p ? { name: p.name, price_cents: p.price_cents } : null;
      }
      case "set_product_stock": {
        const p = await product("id, name, stock");
        return p ? { name: p.name, stock: p.stock } : null;
      }
      case "set_product_status": {
        const p = await product("id, name, status");
        return p ? { name: p.name, status: p.status } : null;
      }
      case "fulfill_order": {
        const { data } = await admin.from("orders").select("customer_name, status, fulfillment_status").eq("id", a.order_id).eq("organization_id", orgId).maybeSingle();
        return data ?? null;
      }
      case "set_order_status": {
        const o = await resolveRow(admin, orgId, "orders", "id, customer_name, status", String(a.order), ["customer_name", "customer_email"]);
        return o ? { customer_name: o.customer_name, status: o.status } : null;
      }
      case "set_reservation_status": {
        const { data } = await admin.from("reservations").select("customer_name, status").eq("id", a.reservation_id).eq("organization_id", orgId).maybeSingle();
        return data ?? null;
      }
      case "update_contact_stage": {
        const c = await resolveRow(admin, orgId, "crm_contacts", "id, name, stage", String(a.contact), ["name", "email", "phone"]);
        return c ? { name: c.name, stage: c.stage } : null;
      }
      case "tag_contact": {
        const c = await resolveRow(admin, orgId, "crm_contacts", "id, name, tags", String(a.contact), ["name", "email", "phone"]);
        return c ? { name: c.name, tags: c.tags } : null;
      }
      case "set_invoice_status": {
        const inv = await resolveRow(admin, orgId, "invoices", "id, number, status", String(a.invoice), ["number", "customer_name"]);
        return inv ? { number: inv.number, status: inv.status } : null;
      }
      case "set_booking_status": {
        const b = await resolveRow(admin, orgId, "bookings", "id, customer_name, status", String(a.booking), ["customer_name", "customer_email"], "start_at");
        return b ? { customer_name: b.customer_name, status: b.status } : null;
      }
      case "set_ticket_status": {
        const t = await resolveRow(admin, orgId, "tickets", "id, subject, status", String(a.ticket), ["subject", "customer_name"]);
        return t ? { subject: t.subject, status: t.status } : null;
      }
      case "publish_page": {
        const { data } = await admin.from("cms_pages").select("title, status").eq("organization_id", orgId).eq("slug", slugify(String(a.slug))).maybeSingle();
        return data ?? null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

async function policyMode(admin: SupabaseClient, orgId: string, tool: string): Promise<"off" | "approve" | "auto"> {
  const { data } = await admin.from("agent_tool_policy").select("mode").eq("organization_id", orgId).eq("tool", tool).maybeSingle();
  return ((data as { mode?: string } | null)?.mode as "off" | "approve" | "auto") ?? "approve"; // safe default
}

async function audit(admin: SupabaseClient, orgId: string, tool: string, args: Json, status: string, summary: string) {
  await admin.from("agent_audit_log").insert({ organization_id: orgId, actor: "operator", tool, args, status, summary });
}

/** Governed execution used by the operator agent's tool runner. Returns a string for the model.
 *
 *  `isAdmin` reflects the caller's org role. Non-admins can still drive the
 *  operator, but a tool set to 'auto' is downgraded to 'approve' for them — so a
 *  plain member can never have the agent change prices, fulfil orders or send
 *  mail from the business mailbox without an owner/admin signing off. */
export async function executeAction(
  admin: SupabaseClient,
  orgId: string,
  userId: string | null,
  tool: string,
  args: Json,
  isAdmin = true,
): Promise<string> {
  let mode = await policyMode(admin, orgId, tool);
  if (mode === "auto" && !isAdmin) mode = "approve";
  if (mode === "off") {
    await audit(admin, orgId, tool, args, "denied", "Blocked by policy");
    return "That action is turned off for this business.";
  }
  // Deterministic spend budget (audit 2026-08-18): outbound customer contact is
  // hard-capped per org per day, in code — no prompt can override it. Guards
  // runaway automations and compliance exposure (A2P/WhatsApp volume).
  // reply_conversation belongs here too: it delivers a real SMS/WhatsApp/email
  // to a customer, so excluding it would let the agent walk around the cap by
  // replying in a thread instead of starting one.
  if (tool === "send_message" || tool === "place_call" || tool === "reply_conversation") {
    const cap = Number(Deno.env.get("OUTBOUND_DAILY_CAP") ?? "200");
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await admin
      .from("agent_audit_log")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .in("tool", ["send_message", "place_call", "reply_conversation"])
      .eq("status", "ok")
      .gte("created_at", dayAgo);
    if ((count ?? 0) >= cap) {
      await audit(admin, orgId, tool, args, "denied", `Daily outbound cap reached (${cap})`);
      return `Today's outbound limit (${cap} messages/calls) is reached for safety — try again tomorrow or raise the cap with Phoxta support.`;
    }
  }
  if (mode === "approve") {
    const title = actionTitle(tool, args);
    const before = await captureBefore(admin, orgId, tool, args);
    const queuedArgs = before ? { ...args, __before: before } : args;
    await admin.from("agent_actions").insert({ organization_id: orgId, tool, args: queuedArgs, title, requested_by: userId, status: "pending" });
    await audit(admin, orgId, tool, args, "pending", title);
    // Tell org owners/admins there's something to approve — previously the
    // queue filled silently and nothing surfaced it outside the Operator tab.
    try {
      const { data: admins } = await admin
        .from("organization_memberships")
        .select("user_id, role")
        .eq("organization_id", orgId)
        .in("role", ["owner", "admin"]);
      const { data: orgRow } = await admin.from("organizations").select("name").eq("id", orgId).maybeSingle();
      if (admins?.length) {
        await admin.from("notifications").insert(admins.map((m) => ({
          user_id: m.user_id,
          title: `Approval needed — ${orgRow?.name ?? "your business"}`,
          body: title,
          kind: "ai",
          link: `/dashboard/businesses/${orgId}/ops/agent/operator`,
        })));
      }
    } catch { /* best-effort */ }
    return `Queued for the owner's approval: ${title}. They can approve it in Agent → Operator.`;
  }
  try {
    const summary = await runWrite(admin, orgId, tool, args);
    await audit(admin, orgId, tool, args, "ok", summary);
    return summary;
  } catch (e) {
    await audit(admin, orgId, tool, args, "error", String((e as Error)?.message || e));
    return `Couldn't do that: ${(e as Error)?.message || e}`;
  }
}
