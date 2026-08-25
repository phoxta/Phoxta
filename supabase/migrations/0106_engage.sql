-- Phoxta — 0106 Engage: flow/journey runtime for the console's Engage tab.
--
-- Definitions (engage_flows.graph) are authored by the frontend editor; the
-- runtime lives in supabase/functions/engage-run (cron: timers + journey
-- triggers) and supabase/functions/agent-inbound (flows on inbound messages).
-- This file mirrors the lazy bootstrap in functions/_shared/engageSchema.ts,
-- which applies the same DDL over SUPABASE_DB_URL (`supabase db push` is not
-- available in this environment) — keep the two in sync.

-- ---------------------------------------------------------------------------
-- engage_flows: one automation definition. kind 'flow' = conversational
-- (runs on inbound messages); kind 'journey' = data-event driven (runs on
-- orders/reservations/tags via the cron poller, cursored by last_cursor).
-- graph: {nodes:[{id,type,position,data}], edges:[{id,source,sourceHandle?,target}]}
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- engage_runs: one customer's walk through one flow. status:
--   active  — mid-advance (transient)
--   waiting — parked on a reply (state.waiting_for='reply') or a timer (wake_at)
--   done    — reached end / walked off the graph
--   exited  — handed off (handoff_ai / handoff_human) or abandoned
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- engage_touches: attribution — one row per message a flow/journey actually
-- delivered (never stamped for skipped/unreachable sends).
-- ---------------------------------------------------------------------------
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

-- RLS: the same org-member idiom every tenant table uses (crm_contacts /
-- conversations in 0006/0008): one 'for all' policy = select/insert/update/
-- delete for members. Runs + touches are member-READ only — the runtime
-- (service role, which bypasses RLS) is the sole writer.
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
