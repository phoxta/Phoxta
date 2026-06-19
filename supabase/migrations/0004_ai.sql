-- Phoxta platform — 0004 AI assistant & usage metering
-- The intelligence layer: every business (organization) gets an AI assistant.
-- All model calls go through the `ai-gateway` Edge Function (server-side key,
-- per-org metering). These tables are the conversation store + usage ledger.
--
-- Writes to ai_messages / ai_usage come from the Edge Function (service role,
-- which bypasses RLS). Client roles only READ them, scoped to org membership.

-- ---------------------------------------------------------------------------
-- ai_conversations: one chat thread, owned by a business (organization)
-- ---------------------------------------------------------------------------
create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ai_conversations_org on ai_conversations(organization_id);

create trigger trg_ai_conversations_touch
  before update on ai_conversations
  for each row execute function public.app_touch_updated_at();

alter table ai_conversations enable row level security;

-- Any member of the business can see and start its conversations.
create policy ai_conversations_select on ai_conversations
  for select using (public.app_is_org_member(organization_id));
create policy ai_conversations_insert on ai_conversations
  for insert with check (public.app_is_org_member(organization_id) and user_id = auth.uid());
create policy ai_conversations_update on ai_conversations
  for update using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- ai_messages: turns in a conversation. organization_id is denormalised so RLS
-- is a single membership check (no join back to the conversation).
-- ---------------------------------------------------------------------------
create table if not exists ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null default '',
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_messages_conversation on ai_messages(conversation_id, created_at);

alter table ai_messages enable row level security;

-- Members read the transcript. Inserts are made by the gateway (service role),
-- so no client insert policy is exposed: the model's replies are authoritative.
create policy ai_messages_select on ai_messages
  for select using (public.app_is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- ai_usage: per-call token ledger, the basis for metering and billing.
-- ---------------------------------------------------------------------------
create table if not exists ai_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  conversation_id uuid references ai_conversations(id) on delete set null,
  model text not null default '',
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_cents numeric(12,4) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_usage_org_created on ai_usage(organization_id, created_at);

alter table ai_usage enable row level security;

-- Members can read their business's usage (for the assistant + billing views).
create policy ai_usage_select on ai_usage
  for select using (public.app_is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- app_org_ai_tokens_this_month: total tokens an org has spent this calendar
-- month. SECURITY DEFINER so members can read their own meter without exposing
-- the whole ledger; the gateway uses it (via service role) to enforce caps.
-- ---------------------------------------------------------------------------
create or replace function public.app_org_ai_tokens_this_month(p_org uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(input_tokens + output_tokens), 0)::bigint
  from ai_usage
  where organization_id = p_org
    and public.app_is_org_member(p_org)
    and created_at >= date_trunc('month', now());
$$;
grant execute on function public.app_org_ai_tokens_this_month(uuid) to authenticated;
