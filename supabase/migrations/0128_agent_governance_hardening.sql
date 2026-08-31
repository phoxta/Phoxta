-- Phoxta platform — 0128 agent governance hardening.
--
-- Closes the write-side holes the August 2026 governance audit found in the
-- agent's own tables, and gives the two cron legs (automation-run and the
-- autopilot) the columns and functions they need to be fair, bounded and
-- honest. Idempotent throughout: every statement can be re-run.
--
--   A1  agent_tool_policy: members READ, only owners/admins WRITE. A member could
--       previously flip any tool to 'auto' and then drive it through the operator
--       — the isAdmin downgrade in executeAction was checking a policy the same
--       member had just written.
--   A1  automations: an 'ai_task' row runs the owner's instruction through the
--       governed WRITE tools, unattended, at the tool's own policy. Creating or
--       editing one is therefore an admin act; the other automation kinds stay
--       member-writable as before.
--   A2  agent_audit_log: SELECT-only for members. Every write comes from an edge
--       function under the service role, so a member policy that allowed INSERT
--       only ever let a member forge rows — and the daily outbound cap is COUNTED
--       from this table, so forged 'ok' rows could exhaust a business's own cap
--       (or, deleted, lift it). actor_id / source record WHO and from WHICH leg.
--   A9  agent_memory: one note per (org, text) — the remember tool re-inserted
--       the same fact every time the owner repeated it.
--   P3/P9 automations: next_run_at / run_hour / timezone so a daily briefing
--       lands at 08:00 in the owner's zone rather than "whenever 20 hours have
--       passed", and created_by so the cron leg can run at the CREATOR's role.
--   A7  app_claim_objectives: per-tenant round-robin so one business with two
--       hundred objectives cannot take every slot of every tick; and
--       app_prune_objective_runs so the run log stops growing without bound.

-- ── A1: agent_tool_policy — members read, admins write ──────────────────────
drop policy if exists agent_policy_all on agent_tool_policy;
drop policy if exists agent_policy_read on agent_tool_policy;
drop policy if exists agent_policy_insert on agent_tool_policy;
drop policy if exists agent_policy_update on agent_tool_policy;
drop policy if exists agent_policy_delete on agent_tool_policy;
create policy agent_policy_read on agent_tool_policy for select
  using (public.app_is_org_member(organization_id));
create policy agent_policy_insert on agent_tool_policy for insert
  with check (public.app_is_org_admin(organization_id));
create policy agent_policy_update on agent_tool_policy for update
  using (public.app_is_org_admin(organization_id)) with check (public.app_is_org_admin(organization_id));
create policy agent_policy_delete on agent_tool_policy for delete
  using (public.app_is_org_admin(organization_id));

-- ── A1 / P3 / P9: automations — schedule columns, creator, ai_task admin-only ─
alter table automations add column if not exists created_by uuid default auth.uid();
alter table automations add column if not exists next_run_at timestamptz;
alter table automations add column if not exists run_hour int not null default 8;
alter table automations add column if not exists timezone text not null default 'UTC';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'automations_run_hour_check') then
    alter table automations add constraint automations_run_hour_check check (run_hour between 0 and 23);
  end if;
end $$;
-- The cron leg selects on this every five minutes; without the index it is a
-- sequential scan of every tenant's automations per tick.
create index if not exists idx_automations_due on automations(next_run_at) where active = true;

drop policy if exists automations_all on automations;
drop policy if exists automations_read on automations;
drop policy if exists automations_insert on automations;
drop policy if exists automations_update on automations;
drop policy if exists automations_delete on automations;
create policy automations_read on automations for select
  using (public.app_is_org_member(organization_id));
-- An 'ai_task' carries an instruction the agent will act on with WRITE tools.
-- The check is on the ROW being written, so a member can neither create one
-- nor turn an existing send_email automation into one.
create policy automations_insert on automations for insert
  with check (
    public.app_is_org_member(organization_id)
    and (action <> 'ai_task' or public.app_is_org_admin(organization_id))
  );
create policy automations_update on automations for update
  using (
    public.app_is_org_member(organization_id)
    and (action <> 'ai_task' or public.app_is_org_admin(organization_id))
  )
  with check (
    public.app_is_org_member(organization_id)
    and (action <> 'ai_task' or public.app_is_org_admin(organization_id))
  );
create policy automations_delete on automations for delete
  using (
    public.app_is_org_member(organization_id)
    and (action <> 'ai_task' or public.app_is_org_admin(organization_id))
  );

-- ── A2: agent_audit_log — service-role writes only; who and from where ───────
alter table agent_audit_log add column if not exists actor_id uuid;
alter table agent_audit_log add column if not exists source text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agent_audit_log_source_check') then
    alter table agent_audit_log add constraint agent_audit_log_source_check
      check (source is null or source in ('operator','autopilot','automation','approval','agent'));
  end if;
end $$;
drop policy if exists agent_audit_all on agent_audit_log;
drop policy if exists agent_audit_read on agent_audit_log;
create policy agent_audit_read on agent_audit_log for select
  using (public.app_is_org_member(organization_id));
-- No insert/update/delete policy on purpose: RLS is enabled, so with none the
-- only writer is the service role inside an edge function. That is what makes
-- the outbound-cap count in executeAction trustworthy.

-- ── A9: agent_memory — one note per (org, text) ──────────────────────────────
-- Existing duplicates keep the NEWEST copy (the one whose title the owner last
-- chose), so the unique index below can be built.
delete from agent_memory m
 using agent_memory newer
 where newer.organization_id = m.organization_id
   and lower(trim(newer.content)) = lower(trim(m.content))
   and newer.created_at > m.created_at;
create unique index if not exists uq_agent_memory_org_content
  on agent_memory (organization_id, lower(trim(content)));

-- ── A7: fair objective claiming ──────────────────────────────────────────────
-- Round-robin by tenant: every organisation's FIRST due objective is ranked
-- before any organisation's second, then by how overdue it is. FOR UPDATE is
-- not allowed alongside a window function, so the ranking is a plain CTE and
-- the lock is taken afterwards on the chosen ids; the re-check inside `locked`
-- drops a row another tick claimed between the two steps (its next_run_at has
-- moved forward), and SKIP LOCKED drops one being claimed right now.
create or replace function public.app_claim_objectives(p_limit int default 10)
returns setof agent_objectives
language plpgsql
security definer
set search_path = public
as $$
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
$$;
revoke execute on function public.app_claim_objectives(int) from public, anon, authenticated;

-- Deletes at most p_limit of the oldest run rows past p_days, so a tick that
-- finds a year of backlog spends a bounded amount of time on it and the rest
-- goes on the next ticks. Returns how many went.
create or replace function public.app_prune_objective_runs(p_days int default 30, p_limit int default 2000)
returns int
language plpgsql
security definer
set search_path = public
as $$
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
$$;
revoke execute on function public.app_prune_objective_runs(int, int) from public, anon, authenticated;
