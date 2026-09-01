// Phoxta — telegram-miniapp: the API behind the in-chat console (Mini App).
//
// A Telegram Mini App is a web page launched inside the chat. It hands the page
// `initData`, signed by Telegram; the page sends that here with every call and
// we re-validate it, so there is no separate login and no session to steal — the
// signature proves who the Telegram user is on each request, and the link table
// says which Phoxta business that is. The page reuses the same governed operator
// and the same approval path as the bot and the dashboard.
import { preflight, json } from "../_shared/cors.ts";
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import { internalProofHeaders } from "../_shared/internalProof.ts";
import { validateInitData } from "../_shared/telegram.ts";
import { decideQueuedAction, actionTitle } from "../_shared/actions.ts";
import { isAdminRole } from "../_shared/auth.ts";

// deno-lint-ignore no-explicit-any
type Json = any;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

type Link = { user_id: string; organization_id: string };

async function todayStats(admin: SupabaseClient, orgId: string) {
  const start = new Date(); start.setUTCHours(0, 0, 0, 0);
  const iso = start.toISOString();
  const [orders, revenue, pendingOrders, waiting] = await Promise.all([
    admin.from("orders").select("id", { count: "exact", head: true }).eq("organization_id", orgId).gte("created_at", iso),
    admin.from("orders").select("total_cents").eq("organization_id", orgId).eq("status", "paid").gte("created_at", iso),
    admin.from("orders").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "pending"),
    admin.from("conversations").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "open"),
  ]);
  const money = ((revenue.data as Json[] ?? []).reduce((s, r) => s + (r.total_cents ?? 0), 0)) / 100;
  return { ordersToday: orders.count ?? 0, revenueToday: money, pendingOrders: pendingOrders.count ?? 0, openConversations: waiting.count ?? 0 };
}

async function pendingApprovals(admin: SupabaseClient, orgId: string) {
  const { data } = await admin.from("agent_actions")
    .select("id, tool, args, title, created_at").eq("organization_id", orgId).eq("status", "pending")
    .order("created_at", { ascending: false }).limit(20);
  return (data as Json[] ?? []).map((a) => ({ id: a.id, title: String(a.title ?? actionTitle(String(a.tool), a.args)) }));
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = await req.json().catch(() => ({})) as Json;
    const who = await validateInitData(String(body?.initData ?? ""), 24 * 3600);
    if (!who) return json({ error: "unauthorized" }, 401);

    const admin = adminClient();
    const { data: link } = await admin.from("telegram_links")
      .select("user_id, organization_id").eq("telegram_user_id", who.userId).maybeSingle();
    if (!link) return json({ error: "not_linked", message: "Connect this Telegram from your Phoxta dashboard first." }, 403);
    const L = link as Link;

    const { data: org } = await admin.from("organizations").select("name, currency, vertical").eq("id", L.organization_id).maybeSingle();
    const action = String(body?.action ?? "state");

    if (action === "state") {
      const [stats, approvals] = await Promise.all([todayStats(admin, L.organization_id), pendingApprovals(admin, L.organization_id)]);
      return json({ org: { name: (org as Json)?.name ?? "Your business", currency: (org as Json)?.currency ?? "" }, stats, approvals });
    }

    // Read views — the console's Orders and Products tabs. Writes still go
    // through the operator (the "chat" action) so governance is never bypassed;
    // these only READ, so they can query directly and stay snappy.
    if (action === "orders") {
      const { data } = await admin.from("orders")
        .select("id, customer_name, total_cents, currency, status, fulfillment_status, created_at")
        .eq("organization_id", L.organization_id).order("created_at", { ascending: false }).limit(20);
      return json({ orders: (data as Json[] ?? []).map((o) => ({
        id: o.id, customer: o.customer_name ?? "Customer", total: (o.total_cents ?? 0) / 100, currency: o.currency ?? "",
        status: o.status, fulfillment: o.fulfillment_status ?? null, at: o.created_at,
      })) });
    }
    if (action === "products") {
      const { data } = await admin.from("products")
        .select("id, name, price_cents, currency, stock, status")
        .eq("organization_id", L.organization_id).order("created_at", { ascending: false }).limit(30);
      return json({ products: (data as Json[] ?? []).map((p) => ({
        id: p.id, name: p.name, price: (p.price_cents ?? 0) / 100, currency: p.currency ?? "", stock: p.stock ?? null, status: p.status,
      })) });
    }

    if (action === "chat") {
      const message = String(body?.message ?? "").trim();
      if (!message) return json({ error: "empty" }, 400);
      const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-operator`, {
        method: "POST",
        headers: { "content-type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}`, ...(await internalProofHeaders()) },
        body: JSON.stringify({ organizationId: L.organization_id, internalUserId: L.user_id, message, stream: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return json({ error: data?.error ?? "failed", limitReached: data?.limitReached }, res.status);
      const approvals = await pendingApprovals(admin, L.organization_id);
      return json({ reply: String(data?.reply ?? ""), approvals });
    }

    if (action === "decide") {
      const role = await (async () => {
        const { data: m } = await admin.from("organization_memberships").select("role").eq("organization_id", L.organization_id).eq("user_id", L.user_id).maybeSingle();
        return String((m as Json)?.role ?? "member");
      })();
      if (!isAdminRole(role)) return json({ error: "forbidden", message: "Only an owner or admin can approve." }, 403);
      const decision = body?.decision === "reject" ? "reject" : "approve";
      const r = await decideQueuedAction(admin, L.organization_id, String(body?.actionId ?? ""), L.user_id, decision as "approve" | "reject");
      const approvals = await pendingApprovals(admin, L.organization_id);
      return json({ ...r, approvals });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
