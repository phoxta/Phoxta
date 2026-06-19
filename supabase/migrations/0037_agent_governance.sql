-- Phoxta platform — 0037 agentic operator governance.
-- The existing AI framework already has read tools, RAG, model routing and token
-- metering. This adds the layer that makes WRITE actions safe to sell: a per-tool
-- policy (off / require-approval / auto), a human-in-the-loop approval queue, and
-- an audit log of every action the operator agent takes.

create table if not exists agent_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tool text not null,
  args jsonb not null default '{}'::jsonb,
  title text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected','executed','failed')),
  requested_by uuid,
  result text,
  error text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid
);
create index if not exists idx_agent_actions_org on agent_actions(organization_id, created_at desc);
alter table agent_actions enable row level security;
create policy agent_actions_all on agent_actions for all
  using (public.app_is_org_member(organization_id)) with check (public.app_is_org_member(organization_id));

create table if not exists agent_audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor text not null default 'operator',
  tool text not null,
  args jsonb not null default '{}'::jsonb,
  status text not null default 'ok',
  summary text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_agent_audit_org on agent_audit_log(organization_id, created_at desc);
alter table agent_audit_log enable row level security;
create policy agent_audit_all on agent_audit_log for all
  using (public.app_is_org_member(organization_id)) with check (public.app_is_org_member(organization_id));

create table if not exists agent_tool_policy (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tool text not null,
  mode text not null default 'approve' check (mode in ('off','approve','auto')),
  unique (organization_id, tool)
);
alter table agent_tool_policy enable row level security;
create policy agent_policy_all on agent_tool_policy for all
  using (public.app_is_org_member(organization_id)) with check (public.app_is_org_member(organization_id));
