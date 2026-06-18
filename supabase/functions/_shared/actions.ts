// Write/action tools for the operator agent — guardrailed, org-scoped mutations.
// Execution is governed by per-tool policy: 'off' (blocked), 'approve' (queued for
// the owner), or 'auto' (run now). Every attempt is written to agent_audit_log.
import type { SupabaseClient } from "./supabaseAdmin.ts";
import type { Tool } from "./anthropic.ts";
import { getAccessToken, gmailSendRaw, createDoc, createEvent } from "./google.ts";

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
