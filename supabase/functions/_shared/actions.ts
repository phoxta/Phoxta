// Write/action tools for the operator agent — guardrailed, org-scoped mutations.
// Execution is governed by per-tool policy: 'off' (blocked), 'approve' (queued for
// the owner), or 'auto' (run now). Every attempt is written to agent_audit_log.
import type { SupabaseClient } from "./supabaseAdmin.ts";
import type { Tool } from "./anthropic.ts";
import { getAccessToken, gmailSendRaw, createDoc, createEvent, appendSheet } from "./google.ts";
import { dispatch, placeAiCall } from "./dispatch.ts";

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
  { name: "set_ticket_status", description: "Update a ticket's status. Reference it by subject or id.", input_schema: { type: "object", properties: { ticket: { type: "string" }, status: { type: "string", enum: ["open", "pending", "resolved", "closed"] } }, required: ["ticket", "status"] } },

  // --- Marketing ---
  { name: "create_campaign", description: "Create a marketing campaign (draft). Give a name; optional channel (email/sms), subject, body and audience.", input_schema: { type: "object", properties: { name: { type: "string" }, channel: { type: "string", enum: ["email", "sms"] }, subject: { type: "string" }, body: { type: "string" }, audience: { type: "string" } }, required: ["name"] } },
  { name: "send_campaign", description: "Send a campaign to the business's contacts. Reference it by name or id.", input_schema: { type: "object", properties: { campaign: { type: "string" } }, required: ["campaign"] } },

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
    const r = await dispatch(channel, dest, a.subject ? String(a.subject) : "A message for you", String(a.message));
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
    case "set_ticket_status": return `Set ticket ${a.ticket} to ${a.status}`;
    case "create_campaign": return `Create campaign "${a.name}"`;
    case "send_campaign": return `Send campaign ${a.campaign}`;
    case "add_location": return `Add location "${a.name}"`;
    case "send_message": return `Send ${a.channel ?? "message"} to ${a.to}`;
    case "place_call": return `Call ${a.to}`;
    default: return tool;
  }
}

async function policyMode(admin: SupabaseClient, orgId: string, tool: string): Promise<"off" | "approve" | "auto"> {
  const { data } = await admin.from("agent_tool_policy").select("mode").eq("organization_id", orgId).eq("tool", tool).maybeSingle();
  return ((data as { mode?: string } | null)?.mode as "off" | "approve" | "auto") ?? "approve"; // safe default
}

async function audit(admin: SupabaseClient, orgId: string, tool: string, args: Json, status: string, summary: string) {
  await admin.from("agent_audit_log").insert({ organization_id: orgId, actor: "operator", tool, args, status, summary });
}

/** Governed execution used by the operator agent's tool runner. Returns a string for the model. */
export async function executeAction(admin: SupabaseClient, orgId: string, userId: string | null, tool: string, args: Json): Promise<string> {
  const mode = await policyMode(admin, orgId, tool);
  if (mode === "off") {
    await audit(admin, orgId, tool, args, "denied", "Blocked by policy");
    return "That action is turned off for this business.";
  }
  if (mode === "approve") {
    const title = actionTitle(tool, args);
    await admin.from("agent_actions").insert({ organization_id: orgId, tool, args, title, requested_by: userId, status: "pending" });
    await audit(admin, orgId, tool, args, "pending", title);
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
