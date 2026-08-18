// Phoxta — mcp-storefront: every tenant business as an MCP server.
// Minimal Streamable-HTTP MCP endpoint (JSON-RPC 2.0, stateless) so external
// AI agents (Claude, ChatGPT, shopping agents) can search a tenant's catalog,
// check availability, and look up orders — mapping 1:1 onto the anon RPCs the
// storefronts already use. Tenant is selected with ?host=<storefront host>.
// Deploy with --no-verify-jwt.
import { adminClient } from "../_shared/supabaseAdmin.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, mcp-session-id, mcp-protocol-version",
};

// deno-lint-ignore no-explicit-any
type Json = any;
const rpcResult = (id: Json, result: Json) => ({ jsonrpc: "2.0", id, result });
const rpcError = (id: Json, code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

const TOOLS = [
  {
    name: "search_products",
    description: "Search this store's catalog by keyword. Returns name, price, availability and product URL.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } }, required: [] },
  },
  {
    name: "get_product",
    description: "Get one product's full details by id.",
    inputSchema: { type: "object", properties: { product_id: { type: "string" } }, required: ["product_id"] },
  },
  {
    name: "check_availability",
    description: "For bookable resources (rentals, stays, experiences): per-day availability between two dates (YYYY-MM-DD).",
    inputSchema: { type: "object", properties: { product_id: { type: "string" }, start: { type: "string" }, end: { type: "string" } }, required: ["product_id", "start", "end"] },
  },
  {
    name: "order_status",
    description: "Look up an order's status. Requires the order reference AND the buyer's email (both must match).",
    inputSchema: { type: "object", properties: { order_id: { type: "string" }, email: { type: "string" } }, required: ["order_id", "email"] },
  },
  {
    name: "store_info",
    description: "The store's name, description, hours and contact details.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const host = (url.searchParams.get("host") ?? "").toLowerCase().trim();
  const admin = adminClient();
  const { data } = host ? await admin.rpc("app_resolve_domain", { p_host: host }) : { data: null };
  const org = Array.isArray(data) ? data[0] : data;

  if (req.method === "GET") {
    // Discovery aid for humans/agents hitting the URL directly.
    return new Response(JSON.stringify({ mcp: "streamable-http", store: org?.name ?? null, usage: "POST JSON-RPC 2.0; ?host=<storefront host> selects the store" }),
      { headers: { ...CORS, "Content-Type": "application/json" } });
  }

  let msg: Json;
  try { msg = await req.json(); } catch { return new Response("Bad JSON", { status: 400, headers: CORS }); }
  const id = msg?.id ?? null;
  const respond = (body: Json) => new Response(JSON.stringify(body), { headers: { ...CORS, "Content-Type": "application/json" } });

  if (!org?.organization_id) return respond(rpcError(id, -32602, "Unknown or missing ?host= — pass the storefront hostname."));
  const orgId = org.organization_id;
  const base = `https://${host}`;

  try {
    switch (msg.method) {
      case "initialize":
        return respond(rpcResult(id, {
          protocolVersion: msg.params?.protocolVersion ?? "2025-06-18",
          capabilities: { tools: {} },
          serverInfo: { name: `phoxta-storefront:${org.slug ?? host}`, version: "1.0.0" },
          instructions: `This is the storefront of ${org.name}. Discovery and lookups happen here; purchases complete on the store's own checkout at ${base} (the store is merchant of record).`,
        }));
      case "notifications/initialized":
        return new Response(null, { status: 202, headers: CORS });
      case "ping":
        return respond(rpcResult(id, {}));
      case "tools/list":
        return respond(rpcResult(id, { tools: TOOLS }));
      case "tools/call": {
        const tool = msg.params?.name;
        const args = msg.params?.arguments ?? {};
        const text = (obj: Json) => rpcResult(id, { content: [{ type: "text", text: JSON.stringify(obj, null, 1) }], isError: false });

        if (tool === "search_products") {
          const q = String(args.query ?? "").trim();
          const limit = Math.min(25, Math.max(1, Number(args.limit) || 10));
          let query = admin.from("products")
            .select("id, name, description, price_cents, currency, stock")
            .eq("organization_id", orgId).eq("status", "active").limit(limit);
          if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
          const { data: rows } = await query;
          return respond(text((rows ?? []).map((p) => ({
            id: p.id, name: p.name,
            price: `${(p.price_cents / 100).toFixed(2)} ${p.currency || "USD"}`,
            available: p.stock === null || p.stock > 0,
            url: `${base}/product/${p.id}`,
          }))));
        }
        if (tool === "get_product") {
          const { data: p } = await admin.from("products")
            .select("id, name, description, price_cents, currency, stock, image_url, metadata")
            .eq("organization_id", orgId).eq("id", String(args.product_id)).eq("status", "active").maybeSingle();
          if (!p) return respond(text({ error: "Product not found" }));
          return respond(text({ ...p, price: `${(p.price_cents / 100).toFixed(2)} ${p.currency || "USD"}`, url: `${base}/product/${p.id}`, checkout_hint: `Purchases complete at ${base}` }));
        }
        if (tool === "check_availability") {
          const { data: days, error } = await admin.rpc("app_resource_availability", {
            p_product: String(args.product_id),
            p_from: String(args.start), p_to: String(args.end),
          });
          if (error) return respond(text({ error: error.message }));
          return respond(text(days ?? []));
        }
        if (tool === "order_status") {
          const { data: o, error } = await admin.rpc("app_lookup_order", {
            p_org: orgId, p_ref: String(args.order_id), p_email: String(args.email ?? ""),
          });
          if (error) return respond(text({ error: "Order not found (reference and email must both match)." }));
          return respond(text(o ?? { error: "Order not found." }));
        }
        if (tool === "store_info") {
          return respond(text({
            name: org.name, url: base,
            profile: org.profile ?? {},
            note: "Ask about products, availability, or an existing order. Checkout happens on the store site.",
          }));
        }
        return respond(rpcError(id, -32602, `Unknown tool: ${tool}`));
      }
      default:
        return respond(rpcError(id, -32601, `Method not supported: ${msg.method}`));
    }
  } catch (err) {
    return respond(rpcError(id, -32603, String((err as Error)?.message || err)));
  }
});
