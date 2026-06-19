-- Phoxta platform — 0039 agent memory. Durable per-tenant notes the operator agent
-- can store and recall (brand voice, owner preferences, recurring decisions, facts)
-- — complements RAG (which covers structured/content retrieval) with explicit
-- remembered facts that are injected into the agent's context each turn.
create table if not exists agent_memory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  scope text not null default 'business',
  title text not null default '',
  content text not null default '',
  source text not null default 'agent' check (source in ('agent','owner')),
  created_at timestamptz not null default now()
);
create index if not exists idx_agent_memory_org on agent_memory(organization_id, created_at desc);
alter table agent_memory enable row level security;
create policy agent_memory_all on agent_memory for all
  using (public.app_is_org_member(organization_id)) with check (public.app_is_org_member(organization_id));
