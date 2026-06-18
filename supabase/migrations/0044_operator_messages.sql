-- 0044: operator chat history — persists the owner's conversation with the AI
-- operator so it survives refresh/navigation (was previously in-memory only).
create table if not exists operator_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_operator_messages_org on operator_messages(organization_id, created_at);
alter table operator_messages enable row level security;
create policy operator_messages_all on operator_messages for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));
