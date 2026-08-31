// Phoxta — Engage schema bootstrap (flows + journeys runtime).
// Idempotent DDL applied lazily over SUPABASE_DB_URL (`supabase db push` is not
// available in this environment — same pattern as platform-posts). Called by
// engage-run (member 'setup' leg + every cron tick) and available to any other
// function that needs the tables to exist. The DDL is mirrored in
// supabase/migrations/0106_engage.sql.
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const DDL = `
-- Flow/journey definitions authored in the console's Engage tab.
-- graph: {nodes:[{id,type,position,data}], edges:[{id,source,sourceHandle?,target}]}
create table if not exists public.engage_flows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  name text not null,
  kind text not null check (kind in ('flow','journey')),
  status text not null default 'draft' check (status in ('draft','live')),
  graph jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  last_cursor timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- One customer's walk through one flow. Writes are service-role only.
create table if not exists public.engage_runs (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null,
  organization_id uuid not null,
  contact_id uuid,
  conversation_id uuid,
  node_id text,
  status text not null default 'active' check (status in ('active','waiting','done','exited')),
  state jsonb not null default '{}'::jsonb,
  wake_at timestamptz,
  started_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Attribution: one row per message a flow/journey actually sent.
create table if not exists public.engage_touches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  flow_id uuid,
  run_id uuid,
  contact_id uuid,
  conversation_id uuid,
  channel text,
  kind text default 'send',
  created_at timestamptz default now()
);

create table if not exists public.engage_segments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  name text not null,
  filter jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_engage_flows_org on public.engage_flows(organization_id);
create index if not exists idx_engage_runs_flow_contact on public.engage_runs(flow_id, contact_id);
create index if not exists idx_engage_runs_conversation on public.engage_runs(conversation_id);
create index if not exists idx_engage_runs_wake on public.engage_runs(status, wake_at);
create index if not exists idx_engage_touches_org on public.engage_touches(organization_id, created_at desc);
create index if not exists idx_engage_segments_org on public.engage_segments(organization_id);

-- RLS: the same org-member idiom every tenant table uses (see crm_contacts /
-- conversations in 0006/0008): one 'for all' policy = select/insert/update/
-- delete for members. Runs + touches are member-READ only — the runtime (service
-- role, which bypasses RLS) is the sole writer.
alter table public.engage_flows enable row level security;
drop policy if exists engage_flows_all on public.engage_flows;
create policy engage_flows_all on public.engage_flows for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

alter table public.engage_segments enable row level security;
drop policy if exists engage_segments_all on public.engage_segments;
create policy engage_segments_all on public.engage_segments for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

alter table public.engage_runs enable row level security;
drop policy if exists engage_runs_read on public.engage_runs;
create policy engage_runs_read on public.engage_runs for select
  using (public.app_is_org_member(organization_id));

alter table public.engage_touches enable row level security;
drop policy if exists engage_touches_read on public.engage_touches;
create policy engage_touches_read on public.engage_touches for select
  using (public.app_is_org_member(organization_id));

grant select, insert, update, delete on public.engage_flows, public.engage_segments to authenticated;
grant select on public.engage_runs, public.engage_touches to authenticated;

-- collect_input{attribute}: 'email'/'phone'/'name' land on the real crm_contacts
-- columns; any other attribute needs an honest durable home — this jsonb bag.
alter table public.crm_contacts add column if not exists attributes jsonb not null default '{}'::jsonb;

drop trigger if exists trg_engage_flows_touch on public.engage_flows;
create trigger trg_engage_flows_touch before update on public.engage_flows
  for each row execute function public.app_touch_updated_at();

-- ── Claiming (mirrored in 0129_pipeline_claims.sql) ─────────────────────────
-- engage-run used to SELECT waiting runs whose timer had passed and advance
-- them; two overlapping ticks both read the same runs and both sent. The claim
-- is one statement: waiting → active, FOR UPDATE SKIP LOCKED, claimed_at set so
-- a wake whose worker died can be put back to waiting.
alter table public.engage_runs add column if not exists claimed_at timestamptz;

create or replace function public.app_claim_engage_runs(p_limit int default 100)
returns setof engage_runs
language sql
security definer
set search_path = public
as $fn$
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
$fn$;

-- SECURITY DEFINER + default EXECUTE TO PUBLIC would let an anon caller claim
-- (and so silently consume) every business's journey timers.
revoke execute on function public.app_claim_engage_runs(int) from public, anon, authenticated;

-- One run per source event per journey, enforced. Enrolment checked and then
-- inserted; two overlapping ticks both saw nothing. The second insert now fails
-- (23505) and the poller treats it as "already enrolled". Guarded against
-- pre-existing duplicates, which would make the CREATE fail and take the whole
-- bootstrap down with it.
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

-- Inbox live view + human take-over (mirrored in 0107_inbox_live.sql).
-- ai_paused: while true, respondCore and the flow runtime persist inbound
-- customer messages but never reply — the human who took over owns the thread.
alter table public.conversations add column if not exists ai_paused boolean not null default false;

-- The console's live watch streams these two tables; re-assert membership
-- idempotently (same guard as 0041/0107 — only add when missing).
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations') then
    alter publication supabase_realtime add table public.conversations;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_messages') then
    alter publication supabase_realtime add table public.conversation_messages;
  end if;
exception when duplicate_object then null;
end $$;
`;

let schemaReady = false;

/** Idempotent, memoized per edge-function instance. */
export async function ensureEngageSchema(): Promise<void> {
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
