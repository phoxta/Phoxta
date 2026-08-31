// Phoxta — objective-planner: the autopilot tick.
//
// Everything else the agent does is REACTIVE. A trigger fires, a task is
// queued, or someone types. This is the one thing that acts because time
// passed: every five minutes it takes the objectives that are due, works out
// whether each needs anything doing, and does it.
//
// FOUR RULES, AND THEY ARE THE WHOLE DESIGN.
//
// 1. IT DECIDES, IT DOES NOT EXECUTE. Every write goes through executeAction,
//    the same governed path the operator uses — so per-tool policy
//    (off/approve/auto), the approval queue, the outbound daily cap and the
//    audit log all apply unchanged. An autonomous loop with its own write path
//    would be a second, ungoverned way into the business, and the governance
//    would quietly stop meaning anything.
//
// 2. ONE ACTION PER TICK. The model is asked for the single next thing, not a
//    plan. A planner that returns five actions has to be trusted about all five
//    at once; a planner that returns one is checked against reality before it
//    is asked again. It also makes a runaway bounded by the tick rather than by
//    the model's appetite.
//
// 3. IT SEES WHAT IT ALREADY DID. Recent runs are in the prompt. Without that,
//    a five-minute loop chases the same unpaid invoice two hundred and
//    eighty-eight times a day — which is not a hypothetical failure mode, it is
//    the DEFAULT one.
//
// 4. THE CEILING IS IN THE DATABASE. app_claim_action increments and checks in
//    one statement, so two ticks cannot both squeeze past a limit with one
//    action left. A counter held in the worker would reset on every deploy.
//
// The tick is driven by cron on the Oracle box (/etc/cron.d/phoxta-worker-cron),
// same as the other background workers, and authorises off x-cron-secret.
import { preflight, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { adminClient, type SupabaseClient } from "../_shared/supabaseAdmin.ts";
import { callJson } from "../_shared/anthropic.ts";
import { modelFor } from "../_shared/models.ts";
import { WRITE_TOOLS, executeAction } from "../_shared/actions.ts";
import { meter } from "../_shared/meter.ts";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

// deno-lint-ignore no-explicit-any
type Json = any;

/** How many objectives one tick will think about. Bounded so a tenant with two
 *  hundred objectives cannot starve everyone else's tick. */
const PER_TICK = 10;
/** How much history the planner sees. Enough to recognise "I already did that"
 *  without turning every tick into a long prompt. */
const HISTORY = 12;
/** How many objectives one tick thinks about at once. A pool, not a stampede:
 *  each is an independent business, so one waiting on the model must not hold up
 *  the rest, but four bounds how many model calls a tick opens at once. */
const CONCURRENCY = 4;

/** ensureSchema() is idempotent but pointless to re-run on every five-minute
 *  tick — and its embedded create-or-replace would clobber a newer definition a
 *  migration applied between deploys. Latched for the life of the isolate. */
let schemaReady = false;

/* ── Schema bootstrap ──────────────────────────────────────────────────────
   `supabase db push` is unavailable against this project, so the migration in
   supabase/migrations/0112_autopilot.sql is applied here on first run, the same
   way ops-maintenance and platform-posts bootstrap theirs. Idempotent. */
async function ensureSchema(): Promise<string | null> {
  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) return "SUPABASE_DB_URL is not set";
  const sql = postgres(dbUrl, { prepare: false });
  try {
    await sql.unsafe(DDL);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  } finally {
    await sql.end({ timeout: 3 });
  }
}

/* ── The situation ─────────────────────────────────────────────────────────
   A deterministic snapshot rather than letting the model call read tools in a
   loop. Two reasons: a loop costs a round trip per question and the questions
   are always the same ones, and a planner that can browse can wander. These are
   the counts every vertical has; the goal text is what makes them mean
   something. */
async function snapshot(admin: SupabaseClient, orgId: string): Promise<Json> {
  const count = async (table: string, build: (q: Json) => Json) => {
    try {
      const { count, error } = await build(admin.from(table).select("id", { count: "exact", head: true }).eq("organization_id", orgId));
      // A missing table (a vertical with no bookings) legitimately errors, and
      // the planner must survive that as a zero. But a WRONG COLUMN errors the
      // same way, and swallowing it silently is how `bookings.starts_at` — the
      // column is `start_at` — reported 0 upcoming bookings on every tick
      // forever, so "confirm tomorrow's appointments" was a permanent no-op and
      // nobody could see why. Log the reason with the table name; still return 0.
      if (error) {
        console.warn(`[phoxta] objective-planner snapshot: ${table} count failed (${error.message}) — treating as 0`);
        return 0;
      }
      return count ?? 0;
    } catch (e) {
      console.warn(`[phoxta] objective-planner snapshot: ${table} threw (${e instanceof Error ? e.message : String(e)}) — treating as 0`);
      return 0;
    }
  };
  const soon = new Date(Date.now() + 7 * 864e5).toISOString();

  const [openConversations, unassigned, pendingOrders, unpaidInvoices, openTickets, upcomingBookings, newReviews] =
    await Promise.all([
      count("conversations", (q) => q.eq("status", "open")),
      count("conversations", (q) => q.eq("status", "open").is("assigned_to", null)),
      count("orders", (q) => q.eq("status", "pending")),
      count("invoices", (q) => q.in("status", ["sent", "overdue"])),
      count("tickets", (q) => q.neq("status", "closed")),
      count("bookings", (q) => q.gte("start_at", new Date().toISOString()).lte("start_at", soon)),
      count("reviews", (q) => q.gte("created_at", new Date(Date.now() - 3 * 864e5).toISOString())),
    ]);

  return { openConversations, unassigned, pendingOrders, unpaidInvoices, openTickets, upcomingBookings, newReviews };
}

/* ── One objective ─────────────────────────────────────────────────────────── */

async function think(admin: SupabaseClient, o: Json): Promise<{ outcome: string; reason: string; tool: string | null; args: Json; result: string; tokens: number }> {
  const orgId = o.organization_id as string;

  // Its own recent history, and how much of today's allowance it has spent.
  const [{ data: runs }, { data: org }, snap] = await Promise.all([
    admin.from("agent_objective_runs")
      .select("outcome, reason, tool, args, result, created_at")
      .eq("objective_id", o.id).order("created_at", { ascending: false }).limit(HISTORY),
    admin.from("organizations").select("name, vertical").eq("id", orgId).maybeSingle(),
    snapshot(admin, orgId),
  ]);

  const since = new Date(Date.now() - 864e5).toISOString();
  const { count: today } = await admin
    .from("agent_objective_runs").select("id", { count: "exact", head: true })
    .eq("objective_id", o.id).eq("outcome", "acted").gte("created_at", since);

  if ((today ?? 0) >= (o.max_actions_per_day ?? 20)) {
    return {
      outcome: "halted", tool: null, args: {}, tokens: 0, result: "",
      reason: `This objective has already taken its ${o.max_actions_per_day} actions for today.`,
    };
  }

  // The tools it may reach for. The objective can NARROW the set; it can never
  // widen it, because agent_tool_policy is still the authority and executeAction
  // re-checks every call regardless of what is offered here.
  const allowed = (o.tools as string[] | null)?.length
    ? WRITE_TOOLS.filter((t) => (o.tools as string[]).includes(t.name))
    : WRITE_TOOLS;

  const system = [
    "You are the autopilot for a small business. You run every few minutes, unprompted.",
    "You are given ONE standing objective, what you have already done about it, and a snapshot of the business.",
    "Decide the SINGLE next action, or decide that nothing needs doing.",
    "",
    "Doing nothing is the correct answer most of the time. An objective that never rests is inventing work,",
    "and inventing work for a business that did not ask for it is worse than doing nothing at all.",
    "",
    "Never repeat something you have already done in the history below unless the situation has clearly changed.",
    "Never contact the same person twice about the same thing.",
    "Respect the guardrails exactly; they come from the business owner and outrank the objective.",
    "",
    "Reply as JSON: {\"reason\": string, \"tool\": string|null, \"args\": object}",
    "`reason` is one sentence explaining the decision, including when the decision is to do nothing.",
    "`tool` is null when nothing needs doing.",
    "",
    "Tools available:",
    ...allowed.map((t) => `- ${t.name}: ${t.description ?? ""} ${JSON.stringify((t as Json).input_schema?.properties ?? {})}`),
  ].join("\n");

  const user = JSON.stringify({
    business: { name: org?.name ?? "", vertical: org?.vertical ?? null },
    objective: o.goal,
    guardrails: o.guardrails || "(none given)",
    actionsTakenToday: today ?? 0,
    actionsAllowedToday: o.max_actions_per_day,
    situation: snap,
    recentlyDone: (runs ?? []).map((r: Json) => ({
      at: r.created_at, outcome: r.outcome, reason: r.reason, tool: r.tool, args: r.args, result: r.result,
    })),
  });

  const t0 = Date.now();
  const { data, inTok, outTok, cacheWriteTok, cacheReadTok, model } = await callJson<{ reason?: string; tool?: string | null; args?: Json }>({
    model: modelFor("balanced"),
    system,
    user,
    maxTokens: 700,
  });
  // R2 — the autopilot spends the model budget like any other feature; it was the
  // one AI leg calling the model UNmetered, so its cost never reached ai_usage or
  // counted against the monthly cap. userId is null: a scheduled tick has nobody
  // behind it.
  await meter(admin, {
    organizationId: orgId, userId: null, model, feature: "autopilot", tier: "balanced",
    inTok: inTok ?? 0, outTok: outTok ?? 0, cacheWriteTok, cacheReadTok, latencyMs: Date.now() - t0,
  });

  const tokens = (inTok ?? 0) + (outTok ?? 0);
  const reason = String(data?.reason ?? "").slice(0, 500);
  const tool = data?.tool ? String(data.tool) : null;

  if (!tool) return { outcome: "noop", reason, tool: null, args: {}, result: "", tokens };

  // A tool the model invented, or one this objective is not allowed. Recorded
  // as a noop rather than an error: the loop is fine, the model simply
  // suggested something it cannot have.
  if (!allowed.some((t) => t.name === tool)) {
    return { outcome: "noop", reason: `${reason} (declined: ${tool} is not available to this objective)`, tool: null, args: {}, result: "", tokens };
  }

  // The ceiling, claimed in the database. Calls and emails are counted
  // separately from everything else, because a business happy with fifty emails
  // a day is very unlikely to be happy with fifty phone calls.
  const kind = tool === "place_call" ? "call" : tool === "send_message" || tool === "google_send_email" ? "email" : "action";
  const { data: allowedNow } = await admin.rpc("app_claim_action", { p_org: orgId, p_kind: kind });
  if (allowedNow === false) {
    return { outcome: "halted", reason: `${reason} (stopped: this business has reached its daily ${kind} limit)`, tool, args: data?.args ?? {}, result: "", tokens };
  }

  // Executed as the SYSTEM, not as a person: userId is null and isAdmin is
  // false, so any tool set to 'auto' is downgraded to 'approve'. Autopilot
  // therefore proposes rather than fires until an owner explicitly promotes a
  // tool — which is the safe direction for the default to fail in.
  const result = await executeAction(admin, orgId, null, tool, data?.args ?? {}, false);
  const queued = /queued for the owner/i.test(result);
  return { outcome: queued ? "queued" : "acted", reason, tool, args: data?.args ?? {}, result: result.slice(0, 1000), tokens };
}

/* ── The tick ──────────────────────────────────────────────────────────────── */

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const admin = adminClient();
  const beat = async (ok: boolean, detail: string) => {
    try { await admin.rpc("app_cron_beat", { p_worker: "objective-planner", p_ok: ok, p_detail: detail }); } catch { /* the tick still ran */ }
  };

  try {
    const who = await requireUser(req);
    if ("error" in who) return who.error;
    if (who.userId !== "cron") return json({ error: "This endpoint runs on the schedule." }, 403);

    // Once per isolate, not every tick (see schemaReady).
    if (!schemaReady) {
      const schemaError = await ensureSchema();
      if (schemaError) {
        await beat(false, `schema: ${schemaError}`);
        return json({ error: `Could not prepare the autopilot tables: ${schemaError}` }, 500);
      }
      schemaReady = true;
    }

    const { data: due, error } = await admin.rpc("app_claim_objectives", { p_limit: PER_TICK });
    if (error) {
      await beat(false, error.message);
      return json({ error: error.message }, 500);
    }

    const objectives = (due ?? []) as Json[];
    const tally: Record<string, number> = { acted: 0, queued: 0, noop: 0, halted: 0, failed: 0 };

    const processOne = async (o: Json): Promise<void> => {
      let row: Json;
      try {
        row = await think(admin, o);
      } catch (e) {
        // One objective failing must not take the tick down with it — the
        // others are unrelated businesses.
        console.error("objective failed", o.id, e);
        row = { outcome: "failed", reason: e instanceof Error ? e.message : String(e), tool: null, args: {}, result: "", tokens: 0 };
      }
      tally[row.outcome] = (tally[row.outcome] ?? 0) + 1;
      await admin.from("agent_objective_runs").insert({
        objective_id: o.id,
        organization_id: o.organization_id,
        outcome: row.outcome,
        reason: row.reason,
        tool: row.tool,
        args: row.args,
        result: row.result,
        tokens: row.tokens,
      });

      // An objective that fails repeatedly is stopped rather than left to fail
      // on every tick forever. It stays visible in the console with a reason.
      if (row.outcome === "failed") {
        const { count: fails } = await admin
          .from("agent_objective_runs").select("id", { count: "exact", head: true })
          .eq("objective_id", o.id).eq("outcome", "failed")
          .gte("created_at", new Date(Date.now() - 3600e3).toISOString());
        if ((fails ?? 0) >= 5) {
          await admin.from("agent_objectives")
            .update({ status: "stopped", halted_reason: `Stopped after repeated failures: ${row.reason}`.slice(0, 400) })
            .eq("id", o.id);
        }
      }
    };

    // A bounded pool rather than a sequential loop: the objectives are unrelated
    // businesses, and one waiting on the model must not stall the rest. `next` is
    // shared but incremented synchronously between awaits (single-threaded), so
    // no two workers take the same index.
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, objectives.length) }, async () => {
        while (next < objectives.length) {
          await processOne(objectives[next++]);
        }
      }),
    );

    // Bounded housekeeping, once per tick: keep the run log from growing without
    // end. It deletes at most a couple of thousand of the oldest rows past its
    // retention window, so a long backlog is spread over ticks rather than one.
    try {
      await admin.rpc("app_prune_objective_runs", {});
    } catch (e) {
      console.warn("[phoxta] objective run prune failed:", e instanceof Error ? e.message : String(e));
    }

    const detail = `${objectives.length} due · ${Object.entries(tally).filter(([, n]) => n).map(([k, n]) => `${k}:${n}`).join(" ") || "nothing to do"}`;
    await beat(true, detail);
    return json({ ok: true, considered: objectives.length, ...tally });
  } catch (e) {
    console.error("objective-planner", e);
    await beat(false, e instanceof Error ? e.message : String(e));
    return json({ error: "The autopilot tick failed." }, 500);
  }
});

/* ── DDL ────────────────────────────────────────────────────────────────────
   Mirrors supabase/migrations/0112_autopilot.sql. Kept as a string here only
   because db push is unavailable against this project; the migration file is
   the readable copy. */
const DDL = `
create table if not exists cron_heartbeats (
  worker text primary key,
  last_run_at timestamptz not null default now(),
  last_ok_at timestamptz,
  last_status text not null default 'ok',
  last_detail text not null default '',
  consecutive_failures int not null default 0,
  runs bigint not null default 0
);
alter table cron_heartbeats enable row level security;
drop policy if exists cron_heartbeats_read on cron_heartbeats;
create policy cron_heartbeats_read on cron_heartbeats for select
  using (public.app_is_platform_admin());

create or replace function public.app_cron_beat(p_worker text, p_ok boolean default true, p_detail text default '')
returns void language plpgsql security definer set search_path = public as $fn$
begin
  insert into cron_heartbeats (worker, last_run_at, last_ok_at, last_status, last_detail, consecutive_failures, runs)
  values (p_worker, now(), case when p_ok then now() end, case when p_ok then 'ok' else 'failed' end,
          left(coalesce(p_detail,''),500), case when p_ok then 0 else 1 end, 1)
  on conflict (worker) do update set
    last_run_at = now(),
    last_ok_at = case when p_ok then now() else cron_heartbeats.last_ok_at end,
    last_status = case when p_ok then 'ok' else 'failed' end,
    last_detail = left(coalesce(p_detail,''),500),
    consecutive_failures = case when p_ok then 0 else cron_heartbeats.consecutive_failures + 1 end,
    runs = cron_heartbeats.runs + 1;
end;
$fn$;

create table if not exists agent_objectives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  goal text not null,
  guardrails text not null default '',
  cadence_minutes int not null default 60 check (cadence_minutes >= 5),
  tools text[] not null default '{}',
  status text not null default 'paused' check (status in ('paused','active','stopped')),
  halted_reason text,
  max_actions_per_day int not null default 20 check (max_actions_per_day >= 0),
  last_run_at timestamptz,
  next_run_at timestamptz not null default now(),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_objectives_org on agent_objectives(organization_id, created_at desc);
create index if not exists idx_objectives_due on agent_objectives(next_run_at) where status = 'active';
alter table agent_objectives enable row level security;
drop policy if exists agent_objectives_all on agent_objectives;
create policy agent_objectives_all on agent_objectives for all
  using (public.app_is_org_member(organization_id)) with check (public.app_is_org_member(organization_id));

create table if not exists agent_objective_runs (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references agent_objectives(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  outcome text not null default 'noop' check (outcome in ('acted','queued','noop','halted','failed')),
  reason text not null default '',
  tool text,
  args jsonb not null default '{}'::jsonb,
  result text not null default '',
  tokens int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_objective_runs on agent_objective_runs(objective_id, created_at desc);
create index if not exists idx_objective_runs_org on agent_objective_runs(organization_id, created_at desc);
alter table agent_objective_runs enable row level security;
drop policy if exists agent_objective_runs_read on agent_objective_runs;
create policy agent_objective_runs_read on agent_objective_runs for select
  using (public.app_is_org_member(organization_id));

create table if not exists agent_budget (
  organization_id uuid not null references organizations(id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  actions int not null default 0,
  calls int not null default 0,
  emails int not null default 0,
  primary key (organization_id, day)
);
alter table agent_budget enable row level security;
drop policy if exists agent_budget_read on agent_budget;
create policy agent_budget_read on agent_budget for select
  using (public.app_is_org_member(organization_id));

alter table agent_config add column if not exists autopilot jsonb not null default '{}'::jsonb;

create or replace function public.app_claim_action(p_org uuid, p_kind text default 'action')
returns boolean language plpgsql security definer set search_path = public as $fn$
declare
  v_cfg jsonb; v_max_actions int; v_max_calls int; v_max_emails int; v_row agent_budget%ROWTYPE;
begin
  select coalesce(autopilot, '{}'::jsonb) into v_cfg from agent_config where organization_id = p_org;
  v_max_actions := coalesce((v_cfg->>'max_actions_per_day')::int, 100);
  v_max_calls   := coalesce((v_cfg->>'max_calls_per_day')::int, 10);
  v_max_emails  := coalesce((v_cfg->>'max_emails_per_day')::int, 50);
  insert into agent_budget (organization_id, day, actions, calls, emails)
  values (p_org, (now() at time zone 'utc')::date, 1,
          case when p_kind='call' then 1 else 0 end,
          case when p_kind='email' then 1 else 0 end)
  on conflict (organization_id, day) do update
    set actions = agent_budget.actions + 1,
        calls  = agent_budget.calls  + (case when p_kind='call'  then 1 else 0 end),
        emails = agent_budget.emails + (case when p_kind='email' then 1 else 0 end)
  returning * into v_row;
  if v_row.actions > v_max_actions then return false; end if;
  if p_kind = 'call'  and v_row.calls  > v_max_calls  then return false; end if;
  if p_kind = 'email' and v_row.emails > v_max_emails then return false; end if;
  return true;
end;
$fn$;

-- Per-tenant round-robin claim. MUST stay identical to migration 0128: this is
-- create-or-replaced on the first tick of every isolate, so a drift here silently
-- overwrites the migration's definition. The simple version this replaced ordered
-- purely by next_run_at, so one business with two hundred due objectives took
-- every slot of every tick and starved everyone else. Ranking by each tenant's
-- position then overdueness — before locking — gives every business its first
-- objective before any business's second. FOR UPDATE is not allowed alongside a
-- window function, so ranking is a plain CTE and the lock is taken afterwards on
-- the chosen ids; the re-check inside the locked CTE drops a row another tick
-- claimed in between (its next_run_at moved), and SKIP LOCKED drops one in flight.
create or replace function public.app_claim_objectives(p_limit int default 10)
returns setof agent_objectives language plpgsql security definer set search_path = public as $fn$
begin
  return query
  with ranked as (
    select id, next_run_at,
           row_number() over (partition by organization_id order by next_run_at, id) as rn
      from agent_objectives
     where status = 'active' and next_run_at <= now()
  ), picked as (
    select id from ranked order by rn, next_run_at limit greatest(1, p_limit)
  ), locked as (
    select o.id from agent_objectives o
     where o.id in (select id from picked) and o.status = 'active' and o.next_run_at <= now()
       for update skip locked
  )
  update agent_objectives o
     set next_run_at = now() + make_interval(mins => o.cadence_minutes),
         last_run_at = now()
   where o.id in (select id from locked)
  returning o.*;
end;
$fn$;

-- Bounded pruning of the run log (mirrors 0128). Deletes at most p_limit of the
-- oldest rows past p_days, so a tick that meets a year of backlog spends a bounded
-- amount of time and the rest goes on later ticks. Bootstrapped here because
-- db push is unavailable against this project, the same reason the tables are.
create or replace function public.app_prune_objective_runs(p_days int default 30, p_limit int default 2000)
returns int language plpgsql security definer set search_path = public as $fn$
declare
  v_n int;
begin
  with gone as (
    delete from agent_objective_runs
     where id in (
       select id from agent_objective_runs
        where created_at < now() - make_interval(days => greatest(1, p_days))
        order by created_at
        limit greatest(1, p_limit)
     )
    returning 1
  )
  select count(*) into v_n from gone;
  return coalesce(v_n, 0);
end;
$fn$;

-- These are the autopilot's internal machinery and only the service role
-- inside an edge function has any business calling them. Postgres grants
-- EXECUTE to PUBLIC by default, and SECURITY DEFINER then runs them as the
-- owner -- so without this block an anonymous caller could forge a heartbeat
-- (making a dead worker look alive, which defeats the point of monitoring it),
-- burn another tenant's daily action budget, or repeatedly advance everyone's
-- objectives so the autopilot never runs. Verified against the deployed
-- project, not assumed: app_cron_beat returned 204 to an anonymous request.
revoke execute on function public.app_cron_beat(text, boolean, text) from public, anon, authenticated;
revoke execute on function public.app_claim_action(uuid, text) from public, anon, authenticated;
revoke execute on function public.app_claim_objectives(int) from public, anon, authenticated;
revoke execute on function public.app_prune_objective_runs(int, int) from public, anon, authenticated;

-- Removes the two rows left by the security probe that found these grants
-- missing in the first place. Harmless and idempotent; kept in the record
-- because deleting monitoring rows silently would be worse than explaining
-- them.
delete from cron_heartbeats where worker like 'forged%';
`;
