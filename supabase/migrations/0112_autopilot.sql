-- Phoxta — autopilot: standing objectives, spend ceilings, and a pulse.
--
-- WHAT WAS MISSING. The agent could already act: 38 governed tools, per-tool
-- policy (off/approve/auto), an approval queue and an audit log. What it could
-- not do is act WITHOUT BEING ASKED. Everything was reactive — a trigger fired,
-- or a task was queued, or someone typed. Nothing owned a goal and revisited it.
--
-- Three tables turn that around:
--
--   agent_objectives      a standing goal the agent owns, with a cadence, a
--                         budget and a policy — "chase every unpaid invoice",
--                         "answer every review within two hours".
--   agent_objective_runs  what the planner decided each tick, and what came of
--                         it. This is what makes the loop idempotent: a planner
--                         that cannot see what it already did will chase the
--                         same invoice 288 times a day.
--   agent_budget          a DAILY ceiling per organisation, counted in actions
--                         rather than tokens. Autonomy without a hard stop is
--                         how an unattended loop places nine hundred calls
--                         overnight.
--
-- And one that has nothing to do with agents but everything to do with trusting
-- them:
--
--   cron_heartbeats       every scheduled worker records that it ran. The
--                         background loop moved hosts recently and the only
--                         reason anyone would have noticed it stopping is that
--                         a dashboard on the old host went quiet. A loop that
--                         is meant to run unattended has to say so.

/* ── The pulse ───────────────────────────────────────────────────────────── */

create table if not exists cron_heartbeats (
  worker text primary key,
  last_run_at timestamptz not null default now(),
  last_ok_at timestamptz,
  last_status text not null default 'ok',
  last_detail text not null default '',
  -- Reset on success. A worker failing every tick for an hour is a different
  -- problem from one that failed once, and the alert should know the difference.
  consecutive_failures int not null default 0,
  runs bigint not null default 0
);

-- Written only by the service role from inside the workers; no client writes.
-- Readable by platform admins, who are the people who need to see it.
alter table cron_heartbeats enable row level security;
drop policy if exists cron_heartbeats_read on cron_heartbeats;
create policy cron_heartbeats_read on cron_heartbeats for select
  using (public.app_is_platform_admin());

create or replace function public.app_cron_beat(
  p_worker text,
  p_ok boolean default true,
  p_detail text default ''
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into cron_heartbeats (worker, last_run_at, last_ok_at, last_status, last_detail, consecutive_failures, runs)
  values (
    p_worker, now(),
    case when p_ok then now() end,
    case when p_ok then 'ok' else 'failed' end,
    left(coalesce(p_detail, ''), 500),
    case when p_ok then 0 else 1 end,
    1
  )
  on conflict (worker) do update set
    last_run_at = now(),
    last_ok_at = case when p_ok then now() else cron_heartbeats.last_ok_at end,
    last_status = case when p_ok then 'ok' else 'failed' end,
    last_detail = left(coalesce(p_detail, ''), 500),
    consecutive_failures = case when p_ok then 0 else cron_heartbeats.consecutive_failures + 1 end,
    runs = cron_heartbeats.runs + 1;
end;
$$;

/* ── Standing goals ──────────────────────────────────────────────────────── */

create table if not exists agent_objectives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,

  -- What the agent is trying to achieve, in the owner's own words. This is the
  -- prompt the planner reasons against, so it is deliberately prose rather than
  -- a rule: "keep next week's calendar at least 70% booked" carries intent that
  -- a trigger row cannot.
  goal text not null,
  -- Anything it must not do. Kept separate from the goal so it survives a
  -- rewrite of the goal, and so it can be shown on its own in the console.
  guardrails text not null default '',

  -- How often the planner should think about it. Minutes, floored at the tick
  -- length: a five-minute loop cannot honour "every 60 seconds", and pretending
  -- otherwise makes the cadence a lie.
  cadence_minutes int not null default 60 check (cadence_minutes >= 5),

  -- Which tools this objective may reach for. Empty means "whatever policy
  -- already allows", which is the safe default because agent_tool_policy is
  -- still the authority — this narrows, it never widens.
  tools text[] not null default '{}',

  status text not null default 'paused'
    check (status in ('paused', 'active', 'stopped')),
  -- Stopped by the system rather than by a person: budget exhausted, too many
  -- consecutive failures. Recorded so the console can say WHY it stopped
  -- instead of showing a mysteriously idle objective.
  halted_reason text,

  -- The ceiling for this objective alone, on top of the org-wide one.
  max_actions_per_day int not null default 20 check (max_actions_per_day >= 0),

  last_run_at timestamptz,
  next_run_at timestamptz not null default now(),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_objectives_org on agent_objectives(organization_id, created_at desc);
-- The planner's own query: due, active, oldest first.
create index if not exists idx_objectives_due on agent_objectives(next_run_at)
  where status = 'active';

alter table agent_objectives enable row level security;
drop policy if exists agent_objectives_all on agent_objectives;
create policy agent_objectives_all on agent_objectives for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

/* ── What the planner did about them ─────────────────────────────────────── */

create table if not exists agent_objective_runs (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references agent_objectives(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,

  -- 'acted'   — it did something
  -- 'queued'  — policy said approve, so it is waiting on a human
  -- 'noop'    — it looked and there was nothing to do. The most common outcome
  --             by far, and worth recording: an objective that never noops
  --             is an objective that is inventing work.
  -- 'halted'  — a ceiling stopped it
  -- 'failed'  — the planner itself errored
  outcome text not null default 'noop'
    check (outcome in ('acted', 'queued', 'noop', 'halted', 'failed')),

  -- The planner's reasoning in one line, and what it actually ran. Both are
  -- shown in the console: an autonomous system that cannot explain a decision
  -- is one nobody will leave switched on.
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

/* ── The ceiling ─────────────────────────────────────────────────────────── */

-- One row per organisation per day. Counting in the database rather than in the
-- worker is deliberate: the worker is stateless and there may be more than one
-- of it, so a counter held in memory would reset on every deploy and every
-- concurrent tick, which is the same as having no ceiling at all.
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

-- Per-org daily ceilings, held on agent_config so they sit beside the rest of
-- the agent's settings rather than in a table of their own.
alter table agent_config add column if not exists autopilot jsonb not null default '{}'::jsonb;

/*
 * Claim one action against today's ceiling.
 *
 * Returns true if the action may proceed. The increment and the check happen in
 * the SAME statement so two ticks running at once cannot both pass a ceiling
 * with one action left — the failure mode that makes a "limit" advisory.
 *
 * `p_kind` is counted separately as well as against the total, because a
 * business that is happy with two hundred emails a day is very unlikely to be
 * happy with two hundred phone calls.
 */
create or replace function public.app_claim_action(
  p_org uuid,
  p_kind text default 'action'
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg jsonb;
  v_max_actions int;
  v_max_calls int;
  v_max_emails int;
  v_row agent_budget%rowtype;
begin
  select coalesce(autopilot, '{}'::jsonb) into v_cfg
  from agent_config where organization_id = p_org;

  -- Defaults chosen to be obviously survivable if nobody ever touches them.
  -- A ceiling that has to be configured before it protects anything protects
  -- nothing, because the accounts that most need it are the ones nobody has
  -- configured.
  v_max_actions := coalesce((v_cfg->>'max_actions_per_day')::int, 100);
  v_max_calls   := coalesce((v_cfg->>'max_calls_per_day')::int, 10);
  v_max_emails  := coalesce((v_cfg->>'max_emails_per_day')::int, 50);

  -- Counted in one statement. The insert carries the first action itself
  -- rather than landing on zero and being corrected afterwards: a second
  -- statement is a second chance for two concurrent ticks to interleave, which
  -- is exactly what this function exists to prevent.
  insert into agent_budget (organization_id, day, actions, calls, emails)
  values (
    p_org, (now() at time zone 'utc')::date, 1,
    case when p_kind = 'call'  then 1 else 0 end,
    case when p_kind = 'email' then 1 else 0 end
  )
  on conflict (organization_id, day) do update
    set actions = agent_budget.actions + 1,
        calls  = agent_budget.calls  + (case when p_kind = 'call'  then 1 else 0 end),
        emails = agent_budget.emails + (case when p_kind = 'email' then 1 else 0 end)
  returning * into v_row;

  if v_row.actions > v_max_actions then return false; end if;
  if p_kind = 'call'  and v_row.calls  > v_max_calls  then return false; end if;
  if p_kind = 'email' and v_row.emails > v_max_emails then return false; end if;
  return true;
end;
$$;

/*
 * The objectives due for a think, claimed atomically.
 *
 * next_run_at is pushed forward BEFORE the planner runs, not after. If the
 * planner crashes, the objective waits for its next slot instead of being
 * retried immediately and forever — a poisoned objective must not be able to
 * monopolise the tick.
 */
create or replace function public.app_claim_objectives(p_limit int default 10)
returns setof agent_objectives
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update agent_objectives o
     set next_run_at = now() + make_interval(mins => o.cadence_minutes),
         last_run_at = now()
   where o.id in (
     select id from agent_objectives
      where status = 'active' and next_run_at <= now()
      order by next_run_at
      limit greatest(1, p_limit)
      for update skip locked
   )
  returning o.*;
end;
$$;

-- These three are the autopilot's internal machinery and only the service role
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

-- Removes the two rows left by the security probe that found these grants
-- missing in the first place. Harmless and idempotent; kept in the record
-- because deleting monitoring rows silently would be worse than explaining
-- them.
delete from cron_heartbeats where worker like 'forged%';
