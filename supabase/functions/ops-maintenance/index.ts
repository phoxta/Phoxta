// Phoxta — ops-maintenance: scheduled housekeeping for the operating consoles.
// Cron-secret only (x-cron-secret = CRON_SECRET or BILLING_CRON_SECRET) — no
// user path. Runs, in order:
//   1. app_expire_pending(): abandoned pending reservations/orders older than
//      24h are cancelled and their stock restored (original behaviour).
//   2. Round-robin routing: orgs whose escalation.routing.mode = 'round_robin'
//      get their unassigned open conversations spread across the team, with a
//      notification to each assignee.
//   3. SLA breach flagging: orgs whose escalation.sla.enabled = true get a
//      one-time notification per conversation that passed its first-response
//      target with no reply (dedupe via the sla_events table).
//
// SLA + routing policies live in agent_config.escalation (jsonb) under the
// `sla` / `routing` keys — the same shape the console reads (src/lib/ops/sla.ts).
// The sla_events table + app_set_member_role RPC are bootstrapped lazily over
// SUPABASE_DB_URL (`supabase db push` is unavailable here — same pattern as
// platform-posts) and recorded in supabase/migrations/0105_sla_routing.sql.
import { preflight, json } from "../_shared/cors.ts";
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const DDL = `
-- One row per (conversation, kind): the SLA cron flags a breach exactly once.
create table if not exists public.sla_events (
  conversation_id uuid not null references conversations(id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now(),
  primary key (conversation_id, kind)
);
-- Written only by the service role; no client path needs it, so RLS stays
-- enabled with no policies (deny-all to anon/authenticated).
alter table public.sla_events enable row level security;

-- Team roles: memberships have no UPDATE policy, so role changes go through a
-- definer RPC that re-checks authority server-side. The owner seat is immutable
-- and 'owner' is never grantable.
create or replace function public.app_set_member_role(p_org uuid, p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_caller_role text;
  v_target_role text;
begin
  if p_role not in ('admin','staff','viewer') then
    raise exception 'Role must be admin, staff or viewer.';
  end if;
  select role into v_caller_role from organization_memberships
    where organization_id = p_org and user_id = auth.uid();
  if v_caller_role is null or v_caller_role not in ('owner','admin') then
    raise exception 'Only an owner or admin can change roles.';
  end if;
  select role into v_target_role from organization_memberships
    where organization_id = p_org and user_id = p_user;
  if v_target_role is null then
    raise exception 'That person is not a member of this business.';
  end if;
  if v_target_role = 'owner' then
    raise exception 'The owner''s role cannot be changed.';
  end if;
  update organization_memberships set role = p_role
    where organization_id = p_org and user_id = p_user;
end;
$fn$;
grant execute on function public.app_set_member_role(uuid, uuid, text) to authenticated;
`;

let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) throw new Error("SUPABASE_DB_URL not available to this function.");
  const sql = postgres(dbUrl, { prepare: false });
  try {
    await sql.unsafe(DDL);
    schemaReady = true;
  } finally {
    await sql.end({ timeout: 3 });
  }
}

// ── Policy parsing (mirror of src/lib/ops/sla.ts, defaults hardened) ─────────
type SlaPolicy = { enabled: boolean; first_response_minutes: number };
type OrgPolicies = { orgId: string; sla: SlaPolicy; routing: "off" | "round_robin" };

// deno-lint-ignore no-explicit-any
function parsePolicies(orgId: string, escalation: any): OrgPolicies {
  const e = escalation ?? {};
  const frm = Number(e?.sla?.first_response_minutes);
  return {
    orgId,
    sla: {
      enabled: e?.sla?.enabled === true,
      first_response_minutes: Number.isFinite(frm) && frm > 0 ? Math.round(frm) : 60,
    },
    routing: e?.routing?.mode === "round_robin" ? "round_robin" : "off",
  };
}

const inboxLink = (orgId: string, convId?: string) =>
  `/dashboard/businesses/${orgId}/ops/inbox${convId ? `?c=${convId}` : ""}`;

const humanize = (ms: number) => {
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h}h` : `${Math.round(h / 24)}d`;
};

type MemberRow = { user_id: string; role: string; created_at: string };

async function listWorkers(admin: SupabaseClient, orgId: string): Promise<MemberRow[]> {
  const { data } = await admin
    .from("organization_memberships")
    .select("user_id, role, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });
  return ((data as MemberRow[] | null) ?? []).filter((m) => ["owner", "admin", "staff"].includes(m.role));
}

// ── Round-robin routing ──────────────────────────────────────────────────────
async function routeOrg(admin: SupabaseClient, orgId: string): Promise<number> {
  const workers = await listWorkers(admin, orgId);
  if (workers.length === 0) return 0;

  const { data: convs } = await admin
    .from("conversations")
    .select("id, customer_name, customer_phone")
    .eq("organization_id", orgId)
    .eq("is_test", false)
    .eq("status", "open")
    .is("assigned_to", null)
    .order("created_at", { ascending: true })
    .limit(50);
  const queue = (convs as { id: string; customer_name: string; customer_phone: string }[] | null) ?? [];
  if (queue.length === 0) return 0;

  // Stateless rotation cursor: continue after whoever was assigned most recently.
  const { data: last } = await admin
    .from("conversations")
    .select("assigned_to")
    .eq("organization_id", orgId)
    .not("assigned_to", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1);
  const lastId = (last as { assigned_to: string }[] | null)?.[0]?.assigned_to ?? null;
  const lastIdx = lastId ? workers.findIndex((w) => w.user_id === lastId) : -1;

  let cursor = (lastIdx + 1) % workers.length;
  const perAssignee = new Map<string, number>();
  let routed = 0;
  for (const conv of queue) {
    const assignee = workers[cursor].user_id;
    cursor = (cursor + 1) % workers.length;
    const { error } = await admin.from("conversations").update({ assigned_to: assignee }).eq("id", conv.id).is("assigned_to", null);
    if (error) continue;
    routed++;
    perAssignee.set(assignee, (perAssignee.get(assignee) ?? 0) + 1);
  }

  // One notification per assignee per run — not one per conversation.
  const rows = [...perAssignee.entries()].map(([userId, n]) => ({
    user_id: userId,
    title: n === 1 ? "A conversation was assigned to you" : `${n} conversations were assigned to you`,
    body: "Round-robin routing gave you new open conversations to answer.",
    kind: "info",
    link: inboxLink(orgId),
  }));
  if (rows.length) await admin.from("notifications").insert(rows);
  return routed;
}

// ── SLA first-response breaches ──────────────────────────────────────────────
async function flagSlaBreaches(admin: SupabaseClient, orgId: string, sla: SlaPolicy): Promise<number> {
  const now = Date.now();
  const cutoff = new Date(now - sla.first_response_minutes * 60_000).toISOString();
  // Snoozed conversations carry status 'snoozed', so the status filter also
  // pauses the clock for them; unsnoozing reopens and re-qualifies them.
  const { data: convs } = await admin
    .from("conversations")
    .select("id, customer_name, customer_phone, assigned_to, created_at")
    .eq("organization_id", orgId)
    .eq("is_test", false)
    .in("status", ["open", "escalated"])
    .is("first_response_at", null)
    .lt("created_at", cutoff)
    .limit(100);
  const overdue =
    (convs as { id: string; customer_name: string; customer_phone: string; assigned_to: string | null; created_at: string }[] | null) ?? [];
  if (overdue.length === 0) return 0;

  const { data: seen } = await admin
    .from("sla_events")
    .select("conversation_id")
    .eq("kind", "first_response_breach")
    .in("conversation_id", overdue.map((c) => c.id));
  const flagged = new Set(((seen as { conversation_id: string }[] | null) ?? []).map((r) => r.conversation_id));
  const fresh = overdue.filter((c) => !flagged.has(c.id));
  if (fresh.length === 0) return 0;

  // Mark first (upsert, ignore duplicates) so a concurrent run can't double-notify.
  const { error: markErr } = await admin
    .from("sla_events")
    .upsert(
      fresh.map((c) => ({ conversation_id: c.id, kind: "first_response_breach" })),
      { onConflict: "conversation_id,kind", ignoreDuplicates: true },
    );
  if (markErr) return 0;

  // Unassigned breaches escalate to every owner/admin; assigned ones to the assignee.
  const { data: mem } = await admin
    .from("organization_memberships")
    .select("user_id, role")
    .eq("organization_id", orgId)
    .in("role", ["owner", "admin"]);
  const admins = ((mem as { user_id: string }[] | null) ?? []).map((m) => m.user_id);

  const rows: { user_id: string; title: string; body: string; kind: string; link: string }[] = [];
  for (const c of fresh) {
    const who = c.customer_name || c.customer_phone || "A customer";
    const waited = humanize(now - new Date(c.created_at).getTime());
    const recipients = c.assigned_to ? [c.assigned_to] : admins;
    for (const userId of recipients) {
      rows.push({
        user_id: userId,
        title: "Response overdue",
        body: `${who} has waited ${waited} without a reply — the target is ${sla.first_response_minutes}m.`,
        kind: "info",
        link: inboxLink(orgId, c.id),
      });
    }
  }
  if (rows.length) await admin.from("notifications").insert(rows);
  return fresh.length;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const presented = req.headers.get("x-cron-secret");
    const cronSecrets = [Deno.env.get("CRON_SECRET"), Deno.env.get("BILLING_CRON_SECRET")].filter(Boolean);
    if (!presented || !cronSecrets.includes(presented)) return json({ error: "Cron only." }, 401);

    const admin = adminClient();
    const { data, error } = await admin.rpc("app_expire_pending");
    if (error) return json({ error: error.message }, 500);

    // SLA + routing. Fail-soft: housekeeping already ran, so policy work
    // reports its own error instead of failing the whole invocation.
    let routed = 0;
    let slaFlagged = 0;
    let policyError: string | null = null;
    try {
      await ensureSchema();
      const { data: cfgs, error: cfgErr } = await admin.from("agent_config").select("organization_id, escalation");
      if (cfgErr) throw new Error(cfgErr.message);
      const policies = (((cfgs as { organization_id: string; escalation: unknown }[] | null) ?? []))
        .map((c) => parsePolicies(c.organization_id, c.escalation))
        .filter((p) => p.sla.enabled || p.routing === "round_robin");
      // Routing first, so a breach on a freshly routed conversation notifies its assignee.
      for (const p of policies) {
        if (p.routing === "round_robin") routed += await routeOrg(admin, p.orgId);
      }
      for (const p of policies) {
        if (p.sla.enabled) slaFlagged += await flagSlaBreaches(admin, p.orgId, p.sla);
      }
    } catch (err) {
      policyError = String((err as Error)?.message || err);
    }

    return json({
      ok: true,
      ...(typeof data === "object" && data !== null ? data : { result: data }),
      routed,
      sla_flagged: slaFlagged,
      ...(policyError ? { policy_error: policyError } : {}),
    });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
