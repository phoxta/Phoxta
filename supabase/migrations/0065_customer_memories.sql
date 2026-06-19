-- Phoxta platform — 0065 per-customer long-term memory ("memory bank").
-- Durable facts/preferences about a CONTACT that persist across conversations
-- and channels, so the one agent truly remembers a customer. Written by the
-- agent (service role) in the background summarize path; read into the prompt.
create table if not exists customer_memories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid references crm_contacts(id) on delete cascade,
  kind text not null default 'fact' check (kind in ('fact','preference','profile')),
  content text not null,
  source text,
  weight int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customer_memories_contact
  on customer_memories(organization_id, contact_id, weight desc, updated_at desc);

alter table customer_memories enable row level security;

-- Owners/members can read + curate their customers' memories (CRM/Knowledge UI);
-- the agent writes via the service role, which bypasses RLS.
drop policy if exists "members read customer_memories" on customer_memories;
create policy "members read customer_memories" on customer_memories
  for select using (app_is_org_member(organization_id));

drop policy if exists "members manage customer_memories" on customer_memories;
create policy "members manage customer_memories" on customer_memories
  for all using (app_is_org_member(organization_id)) with check (app_is_org_member(organization_id));
