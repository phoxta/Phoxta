-- Phoxta — 0129: the background pipeline claims its work instead of reading it.
--
-- WHY. Four workers (agent-worker, embed-worker, campaign-run, engage-run) ran
-- the same shape: SELECT the queued rows, then UPDATE each to "in progress".
-- Two ticks overlapping — the five-minute cron and a dashboard nudge, or a slow
-- tick and the next one — both SELECT the same rows before either UPDATE lands,
-- and the work is done twice. For an embedding that is wasted money; for an
-- appointment reminder, a marketing email or a journey message it is the same
-- customer told the same thing twice, which is the one mistake a scheduler
-- cannot take back. social-publish already had the right shape (0118/0122): a
-- SECURITY DEFINER update with FOR UPDATE SKIP LOCKED, so two claimants divide
-- the queue rather than share it. This gives the other four the same thing.
--
-- Every claim also stamps claimed_at and counts attempts, so a row a crashed
-- run left "in progress" is visible as stale and can be retried or given up
-- on, instead of sitting there for ever.
--
-- This file does NOT touch ai_embeddings (chunking lives in 0131); it does
-- alter ai_embedding_queue, which is the worker's own table.
--
-- Idempotent: every statement can be re-run.

-- ═══════════════════════════════════════════════════════════════════════════
-- outbound_tasks — agent-worker
-- ═══════════════════════════════════════════════════════════════════════════

alter table outbound_tasks add column if not exists claimed_at timestamptz;

-- Claim due tasks: queued → in_progress, one attempt counted, claimed_at set.
-- p_orgs narrows the claim to a member's own businesses (the dashboard nudge);
-- null is the scheduler's platform-wide sweep.
create or replace function public.app_claim_outbound_tasks(
  p_limit int default 20,
  p_orgs uuid[] default null
)
returns setof outbound_tasks
language sql
security definer
set search_path = public
as $$
  update outbound_tasks t
     set status = 'in_progress',
         attempts = t.attempts + 1,
         claimed_at = now()
   where t.id in (
     select t2.id
       from outbound_tasks t2
      where t2.status = 'queued'
        and t2.due_at <= now()
        and (p_orgs is null or t2.organization_id = any(p_orgs))
      order by t2.due_at
      limit greatest(1, least(coalesce(p_limit, 20), 100))
      for update skip locked
   )
  returning t.*;
$$;

-- The reaper. A task left in_progress for longer than p_stale_minutes was
-- abandoned by a run that died (a function timeout, a crash between the claim
-- and the write-back). Under three attempts it goes back on the queue; at three
-- it is failed with a reason, so a task that kills its worker every time cannot
-- do so for ever. in_progress was previously terminal-by-accident: nothing ever
-- looked at it again.
create or replace function public.app_reap_outbound_tasks(p_stale_minutes int default 10)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requeued int;
  v_failed int;
  v_cutoff timestamptz := now() - make_interval(mins => greatest(1, coalesce(p_stale_minutes, 10)));
begin
  update outbound_tasks
     set status = 'queued',
         outcome = 'retrying: a previous attempt did not finish'
   where status = 'in_progress'
     and coalesce(claimed_at, updated_at) < v_cutoff
     and attempts < 3;
  get diagnostics v_requeued = row_count;

  update outbound_tasks
     set status = 'failed',
         outcome = 'gave up after 3 attempts: the worker did not finish it'
   where status = 'in_progress'
     and coalesce(claimed_at, updated_at) < v_cutoff
     and attempts >= 3;
  get diagnostics v_failed = row_count;

  return jsonb_build_object('requeued', v_requeued, 'failed', v_failed);
end;
$$;

-- One reminder per booking, enforced. agent-worker checked "is there already a
-- reminder for this booking?" and then inserted — two overlapping runs both
-- see none and both insert. With the constraint the second insert is refused
-- (23505) and the worker treats that as "already there".
--
-- Guarded like idx_social_targets_once in 0122: if duplicates already exist the
-- index cannot be built, and an unguarded CREATE would take the whole migration
-- down with it.
do $$
begin
  if not exists (
    select 1 from outbound_tasks
     where payload ? 'booking_id'
     group by organization_id, type, payload->>'booking_id'
    having count(*) > 1
  ) then
    create unique index if not exists idx_outbound_tasks_one_per_booking
      on outbound_tasks (organization_id, type, (payload->>'booking_id'))
      where payload ? 'booking_id';
  else
    raise notice 'outbound_tasks has duplicate (organization_id, type, booking_id) rows; unique index skipped';
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ai_embedding_queue — embed-worker
-- ═══════════════════════════════════════════════════════════════════════════

alter table ai_embedding_queue add column if not exists attempts int not null default 0;
alter table ai_embedding_queue add column if not exists last_error text;
alter table ai_embedding_queue add column if not exists claimed_at timestamptz;

-- 'processing' is the claimed state. The original inline check (0007) allowed
-- only pending/done/error, so a claim had nowhere to put a row.
alter table ai_embedding_queue drop constraint if exists ai_embedding_queue_status_check;
alter table ai_embedding_queue
  add constraint ai_embedding_queue_status_check
  check (status in ('pending', 'processing', 'done', 'error'));

-- The claim reads by (status, created_at); the 0007 index covered status only.
create index if not exists idx_ai_embed_queue_claim
  on ai_embedding_queue (status, created_at)
  where status in ('pending', 'processing');

-- Claim: pending → processing, attempts counted. A row stuck in 'processing'
-- for ten minutes is a claim whose worker died, and is taken again. p_orgs
-- narrows to a member's businesses (the console nudge); null is the sweep.
create or replace function public.app_claim_embedding_jobs(
  p_limit int default 50,
  p_orgs uuid[] default null
)
returns setof ai_embedding_queue
language sql
security definer
set search_path = public
as $$
  update ai_embedding_queue q
     set status = 'processing',
         attempts = q.attempts + 1,
         claimed_at = now()
   where q.id in (
     select q2.id
       from ai_embedding_queue q2
      where (
              q2.status = 'pending'
              or (q2.status = 'processing' and q2.claimed_at < now() - interval '10 minutes')
            )
        and q2.attempts < 3
        and (p_orgs is null or q2.organization_id = any(p_orgs))
      order by q2.created_at
      limit greatest(1, least(coalesce(p_limit, 50), 200))
      for update skip locked
   )
  returning q.*;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- campaign_sends — campaign-run
-- ═══════════════════════════════════════════════════════════════════════════

alter table campaign_sends add column if not exists claimed_at timestamptz;

-- 'sending' is the claimed state; 0073's inline check did not allow it.
alter table campaign_sends drop constraint if exists campaign_sends_status_check;
alter table campaign_sends
  add constraint campaign_sends_status_check
  check (status in ('pending', 'sending', 'sent', 'failed', 'skipped'));

-- The rollup on campaigns counts 'sending' as unsettled; this index serves both
-- the claim and that count.
create index if not exists idx_campaign_sends_claim
  on campaign_sends (status, created_at)
  where status in ('pending', 'sending');

-- Claim: pending → sending. p_org narrows to one business (a member pressing
-- Send); null is the scheduler's sweep. No automatic retry of a stale 'sending'
-- row: a marketing email that MAY have gone out must not be sent again, so the
-- worker fails those with a reason instead (see campaign-run).
create or replace function public.app_claim_campaign_sends(
  p_limit int default 50,
  p_org uuid default null
)
returns setof campaign_sends
language sql
security definer
set search_path = public
as $$
  update campaign_sends s
     set status = 'sending',
         claimed_at = now()
   where s.id in (
     select s2.id
       from campaign_sends s2
      where s2.status = 'pending'
        and (p_org is null or s2.organization_id = p_org)
      order by s2.created_at
      limit greatest(1, least(coalesce(p_limit, 50), 200))
      for update skip locked
   )
  returning s.*;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- engage_runs — engage-run
-- ═══════════════════════════════════════════════════════════════════════════
-- Mirrored in functions/_shared/engageSchema.ts, which applies the same DDL
-- lazily over SUPABASE_DB_URL on every tick (the Engage schema has always been
-- managed that way — 0106 is its record). Keep the two in sync.

alter table public.engage_runs add column if not exists claimed_at timestamptz;

-- Claim due timers: waiting → active. advanceRun writes the final status back;
-- a run left 'active' with an old claimed_at is a wake whose worker died, and
-- engage-run puts it back to waiting so the timer fires again.
create or replace function public.app_claim_engage_runs(p_limit int default 100)
returns setof engage_runs
language sql
security definer
set search_path = public
as $$
  update engage_runs r
     set status = 'active',
         claimed_at = now(),
         updated_at = now()
   where r.id in (
     select r2.id
       from engage_runs r2
      where r2.status = 'waiting'
        and r2.wake_at is not null
        and r2.wake_at <= now()
      order by r2.wake_at
      limit greatest(1, least(coalesce(p_limit, 100), 500))
      for update skip locked
   )
  returning r.*;
$$;

-- One run per source event per journey, enforced. Enrolment checked for an
-- existing run with the same event key and then inserted; two overlapping
-- ticks both saw none. Now the second insert fails (23505) and the poller
-- treats it as "already enrolled". Guarded against pre-existing duplicates.
do $$
begin
  if not exists (
    select 1 from public.engage_runs
     where state ? 'event_key'
     group by flow_id, state->>'event_key'
    having count(*) > 1
  ) then
    create unique index if not exists idx_engage_runs_one_per_event
      on public.engage_runs (flow_id, (state->>'event_key'))
      where state ? 'event_key';
  else
    raise notice 'engage_runs has duplicate (flow_id, event_key) rows; unique index skipped';
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- gmail-sync — which mailboxes to read this tick
-- ═══════════════════════════════════════════════════════════════════════════
-- The cron leg walked every google_connections row in table order with no cap
-- and no deadline, so one slow mailbox at the top of the list starved the ones
-- below it every single tick. This orders connections by how long it has been
-- since their last SUCCESSFUL sync (never-synced first), so the worker can take
-- a bounded slice each tick and still reach every mailbox in turn.
create or replace function public.app_gmail_sync_queue(p_limit int default 8)
returns table (organization_id uuid, last_ok_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select c.organization_id,
         (select max(r.created_at)
            from email_sync_runs r
           where r.organization_id = c.organization_id
             and r.ok) as last_ok_at
    from google_connections c
   order by 2 asc nulls first, c.organization_id
   limit greatest(1, least(coalesce(p_limit, 8), 100));
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Grants
-- ═══════════════════════════════════════════════════════════════════════════
-- Functions are EXECUTE TO PUBLIC by default, and every one of these is
-- SECURITY DEFINER: without the revoke an anon caller could claim (and so
-- silently consume) another tenant's reminders, embeddings, campaign sends and
-- journey timers, or enumerate which businesses have Gmail connected. Only the
-- service role, from inside the workers, may call them.
revoke execute on function public.app_claim_outbound_tasks(int, uuid[]) from public, anon, authenticated;
revoke execute on function public.app_reap_outbound_tasks(int) from public, anon, authenticated;
revoke execute on function public.app_claim_embedding_jobs(int, uuid[]) from public, anon, authenticated;
revoke execute on function public.app_claim_campaign_sends(int, uuid) from public, anon, authenticated;
revoke execute on function public.app_claim_engage_runs(int) from public, anon, authenticated;
revoke execute on function public.app_gmail_sync_queue(int) from public, anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- organizations.timezone — content-plan schedules in the business's own zone
-- ═══════════════════════════════════════════════════════════════════════════
-- content-plan built scheduled_at as `${date}T${hour}:00:00` and let the Deno
-- runtime (UTC) parse it, so the hour the planner picked was written as UTC:
-- a 10:00 post for a New York shop went out at 06:00 its own time, and every
-- business was scheduled in UTC regardless of where it trades. The planner now
-- reads this zone, states it in its prompt, and converts the local wall-clock
-- hour to the correct UTC instant (Intl-based) before writing scheduled_at.
--
-- IANA name (e.g. 'America/New_York'); 'UTC' is the honest default for a
-- business that has not set one, and reproduces the previous behaviour exactly.
-- Idempotent, like every statement above.
alter table public.organizations add column if not exists timezone text default 'UTC';
