-- Phoxta — 0007 AI-native foundation
-- Makes the operating layer AI-native (not AI-enabled): per-tenant RAG via
-- pgvector, an embedding queue fed by triggers, AI usage/eval governance,
-- intelligence columns the model writes back, and a durable workflow engine
-- whose steps (including AI actions) are observable and replayable.
--
-- All tables org-scoped + RLS (app_is_org_member). The vector match function is
-- service-role only: edge functions authorize membership, then retrieve.

create extension if not exists vector;

-- ===========================================================================
-- Per-tenant retrieval index (RAG). One table, hard org filter + RLS — so
-- cross-tenant retrieval is physically impossible (KB requirement).
-- ===========================================================================
create table if not exists ai_embeddings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  source_type text not null,           -- 'products' | 'cms_pages' | 'crm_contacts' | 'tickets'
  source_id uuid not null,
  content text not null,
  embedding vector(1536),              -- OpenAI text-embedding-3-small
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, source_type, source_id)
);
create index if not exists idx_ai_embeddings_hnsw on ai_embeddings using hnsw (embedding vector_cosine_ops);
create index if not exists idx_ai_embeddings_org on ai_embeddings(organization_id);

alter table ai_embeddings enable row level security;
create policy ai_embeddings_select on ai_embeddings for select
  using (public.app_is_org_member(organization_id));

-- Vector similarity search. SECURITY DEFINER + hard org filter; service-role only
-- (the calling edge function has already verified the user's membership).
create or replace function public.app_match_embeddings(
  p_org uuid,
  query_embedding vector(1536),
  match_count int default 6,
  p_source_types text[] default null
)
returns table (source_type text, source_id uuid, content text, similarity float)
language sql
stable
security definer
set search_path = public
as $$
  select e.source_type, e.source_id, e.content, 1 - (e.embedding <=> query_embedding) as similarity
  from ai_embeddings e
  where e.organization_id = p_org
    and e.embedding is not null
    and (p_source_types is null or e.source_type = any (p_source_types))
  order by e.embedding <=> query_embedding
  limit greatest(1, least(match_count, 20));
$$;
revoke all on function public.app_match_embeddings(uuid, vector, int, text[]) from public, anon, authenticated;
grant execute on function public.app_match_embeddings(uuid, vector, int, text[]) to service_role;

-- ===========================================================================
-- Embedding queue: triggers enqueue source rows; the embed-worker drains it.
-- ===========================================================================
create table if not exists ai_embedding_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  content text not null,
  status text not null default 'pending' check (status in ('pending','done','error')),
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_embed_queue_pending on ai_embedding_queue(status) where status = 'pending';
alter table ai_embedding_queue enable row level security;
-- No client policies: only the service-role worker reads/writes this queue.

create or replace function public.app_enqueue_embedding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_content text;
begin
  if tg_table_name = 'products' then
    v_content := coalesce(new.name, '') || E'\n' || coalesce(new.description, '');
  elsif tg_table_name = 'cms_pages' then
    if new.status <> 'published' then return new; end if;
    v_content := coalesce(new.title, '') || E'\n' || coalesce(new.body, '');
  elsif tg_table_name = 'crm_contacts' then
    v_content := coalesce(new.name, '') || ' ' || coalesce(new.company, '') || E'\n' || coalesce(new.notes, '');
  elsif tg_table_name = 'tickets' then
    v_content := coalesce(new.subject, '');
  else
    return new;
  end if;

  if length(trim(v_content)) = 0 then return new; end if;

  insert into ai_embedding_queue (organization_id, source_type, source_id, content)
  values (new.organization_id, tg_table_name, new.id, v_content);
  return new;
end;
$$;

create trigger trg_embed_products after insert or update on products
  for each row execute function public.app_enqueue_embedding();
create trigger trg_embed_cms_pages after insert or update on cms_pages
  for each row execute function public.app_enqueue_embedding();
create trigger trg_embed_crm_contacts after insert or update on crm_contacts
  for each row execute function public.app_enqueue_embedding();
create trigger trg_embed_tickets after insert or update on tickets
  for each row execute function public.app_enqueue_embedding();

-- ===========================================================================
-- AI usage / eval governance (Langfuse-lite). Extend the existing meter.
-- ===========================================================================
alter table ai_usage add column if not exists feature text not null default 'assistant';
alter table ai_usage add column if not exists tier text not null default 'balanced';
alter table ai_usage add column if not exists latency_ms integer not null default 0;
alter table ai_usage add column if not exists status text not null default 'ok';

-- ===========================================================================
-- Intelligence columns the model writes back into the domain rows.
-- ===========================================================================
alter table crm_contacts add column if not exists lead_score integer;
alter table crm_contacts add column if not exists churn_risk numeric(4,3);
alter table crm_contacts add column if not exists ai_summary text;
alter table crm_contacts add column if not exists scored_at timestamptz;

alter table tickets add column if not exists sentiment text;
alter table tickets add column if not exists category text;
alter table tickets add column if not exists ai_summary text;

-- ===========================================================================
-- Durable workflow engine: AI actions as observable, replayable steps.
-- ===========================================================================
create table if not exists workflow_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  automation_id uuid references automations(id) on delete set null,
  trigger text not null,
  status text not null default 'pending' check (status in ('pending','running','succeeded','failed')),
  input jsonb not null default '{}'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_workflow_runs_org on workflow_runs(organization_id, created_at desc);
create index if not exists idx_workflow_runs_pending on workflow_runs(status) where status = 'pending';
create trigger trg_workflow_runs_touch before update on workflow_runs
  for each row execute function public.app_touch_updated_at();

alter table workflow_runs enable row level security;
create policy workflow_runs_select on workflow_runs for select
  using (public.app_is_org_member(organization_id));
-- Inserts come from the trigger (definer) and the worker (service role); updates
-- from the worker (service role) — no client write policy.

-- Fan out a workflow run per active automation when a trigger event fires.
create or replace function public.app_on_automation_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trigger text;
  a record;
begin
  if tg_table_name = 'crm_contacts' then
    v_trigger := 'contact_created';
  elsif tg_table_name = 'orders' then
    if not (tg_op = 'UPDATE' and new.status = 'paid' and old.status is distinct from 'paid') then
      return new;
    end if;
    v_trigger := 'order_paid';
  elsif tg_table_name = 'bookings' then
    v_trigger := 'booking_created';
  elsif tg_table_name = 'tickets' then
    v_trigger := 'ticket_created';
  else
    return new;
  end if;

  for a in
    select id from automations
    where organization_id = new.organization_id and active and trigger = v_trigger
  loop
    insert into workflow_runs (organization_id, automation_id, trigger, input)
    values (new.organization_id, a.id, v_trigger, jsonb_build_object('source_id', new.id));
  end loop;
  return new;
end;
$$;

create trigger trg_automation_contact after insert on crm_contacts
  for each row execute function public.app_on_automation_trigger();
create trigger trg_automation_order after update on orders
  for each row execute function public.app_on_automation_trigger();
create trigger trg_automation_booking after insert on bookings
  for each row execute function public.app_on_automation_trigger();
create trigger trg_automation_ticket after insert on tickets
  for each row execute function public.app_on_automation_trigger();
