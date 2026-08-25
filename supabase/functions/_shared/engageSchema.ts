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
