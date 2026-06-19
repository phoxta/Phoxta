-- Phoxta — 0008 unified AI Agent
-- One configurable, RAG-grounded, tool-using agent per business ("one brain,
-- every touchpoint") that operates the business: omnichannel conversations with
-- unified memory, an outbound campaign engine, multi-location call routing, and
-- reporting. The agent acts by calling the operating backend (0006) as tools.
-- All org-scoped + RLS (app_is_org_member).

-- ===========================================================================
-- agent_config — one per business; the agent's persona, hours, capabilities.
-- ===========================================================================
create table if not exists agent_config (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  display_name text not null default 'AI Agent',
  persona text not null default 'A warm, professional front-desk assistant.',
  greeting text not null default 'Hi! Thanks for reaching out — how can I help today?',
  tone text not null default 'friendly',
  model_tier text not null default 'balanced' check (model_tier in ('cheap','balanced','complex')),
  business_hours jsonb not null default '{"tz":"UTC","open":"09:00","close":"17:00","days":[1,2,3,4,5]}'::jsonb,
  escalation jsonb not null default '{"to_email":"","on_intents":["complaint","refund"]}'::jsonb,
  capabilities jsonb not null default '{
    "call_center":true,"scheduling":true,"after_hours":true,"reminders":true,
    "nurturing":true,"instant_callback":true,"receptionist":true,"chatbot":true,
    "customer_service":true,"cold_calling":true,"lead_qualification":true,"upsell":true
  }'::jsonb,
  voice jsonb not null default '{}'::jsonb,
  public_key text not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_agent_config_public on agent_config(public_key);
create trigger trg_agent_config_touch before update on agent_config
  for each row execute function public.app_touch_updated_at();
alter table agent_config enable row level security;
create policy agent_config_all on agent_config for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- locations — multi-location call routing + centralized reporting.
-- ===========================================================================
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  zip text not null default '',
  phone text not null default '',
  service_types text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_locations_org on locations(organization_id);
alter table locations enable row level security;
create policy locations_all on locations for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- channels — connected touchpoints (web, sms, whatsapp, voice, ...).
-- ===========================================================================
create table if not exists channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type text not null check (type in ('web','sms','whatsapp','instagram','tiktok','yelp','voice')),
  label text not null default '',
  external_ref text not null default '',
  status text not null default 'simulated' check (status in ('connected','disconnected','simulated')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_channels_org on channels(organization_id);
alter table channels enable row level security;
create policy channels_all on channels for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- conversations — unified memory, keyed to a customer across every channel.
-- ===========================================================================
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  channel_type text not null default 'web',
  contact_id uuid references crm_contacts(id) on delete set null,
  location_id uuid references locations(id) on delete set null,
  customer_name text not null default '',
  customer_phone text not null default '',
  customer_email text not null default '',
  status text not null default 'open' check (status in ('open','handled','escalated','closed')),
  intent text,
  qualified boolean not null default false,
  lead_score integer,
  summary text not null default '',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_conversations_org on conversations(organization_id, last_message_at desc);
create index if not exists idx_conversations_contact on conversations(contact_id);
create trigger trg_conversations_touch before update on conversations
  for each row execute function public.app_touch_updated_at();
alter table conversations enable row level security;
create policy conversations_all on conversations for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

create table if not exists conversation_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer','agent','human','system')),
  channel_type text not null default 'web',
  body text not null default '',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_conversation_messages on conversation_messages(conversation_id, created_at);
alter table conversation_messages enable row level security;
create policy conversation_messages_all on conversation_messages for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- Outbound engine — campaigns + a task queue (cold call, upsell, nurture, ...).
-- ===========================================================================
create table if not exists outbound_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  type text not null default 'nurture'
    check (type in ('cold_call','sdr','upsell','cross_sell','nurture','reminder','instant_callback','after_hours')),
  channel_pref text not null default 'call' check (channel_pref in ('call','sms','email')),
  goal text not null default '',
  script text not null default '',
  audience jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','active','paused','done')),
  schedule jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_outbound_campaigns_org on outbound_campaigns(organization_id, created_at desc);
create trigger trg_outbound_campaigns_touch before update on outbound_campaigns
  for each row execute function public.app_touch_updated_at();
alter table outbound_campaigns enable row level security;
create policy outbound_campaigns_all on outbound_campaigns for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

create table if not exists outbound_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  campaign_id uuid references outbound_campaigns(id) on delete set null,
  type text not null default 'nurture',
  contact_id uuid references crm_contacts(id) on delete set null,
  conversation_id uuid references conversations(id) on delete set null,
  channel text not null default 'call' check (channel in ('call','sms','email')),
  to_ref text not null default '',
  customer_name text not null default '',
  status text not null default 'queued' check (status in ('queued','in_progress','done','failed','no_answer')),
  attempts integer not null default 0,
  due_at timestamptz not null default now(),
  outcome text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_outbound_tasks_due on outbound_tasks(status, due_at) where status = 'queued';
create index if not exists idx_outbound_tasks_org on outbound_tasks(organization_id, created_at desc);
create trigger trg_outbound_tasks_touch before update on outbound_tasks
  for each row execute function public.app_touch_updated_at();
alter table outbound_tasks enable row level security;
create policy outbound_tasks_all on outbound_tasks for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- call_logs — call-center reporting across branches.
-- ===========================================================================
create table if not exists call_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  location_id uuid references locations(id) on delete set null,
  direction text not null default 'inbound' check (direction in ('inbound','outbound')),
  from_number text not null default '',
  to_number text not null default '',
  duration_sec integer not null default 0,
  outcome text not null default 'completed',
  after_hours boolean not null default false,
  recording_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_call_logs_org on call_logs(organization_id, created_at desc);
alter table call_logs enable row level security;
create policy call_logs_all on call_logs for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- Routing + reporting helpers
-- ===========================================================================
-- Pick the best location for a caller by ZIP, then by service type. Service-role
-- only (the calling edge function has already authorized the org).
create or replace function public.app_route_location(p_org uuid, p_zip text, p_service text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from locations
  where organization_id = p_org and active
  order by
    (zip = coalesce(p_zip, '')) desc,
    (coalesce(p_service, '') = any (service_types)) desc,
    created_at asc
  limit 1;
$$;
revoke all on function public.app_route_location(uuid, text, text) from public, anon, authenticated;
grant execute on function public.app_route_location(uuid, text, text) to service_role;

-- One aggregate for the agent Overview / call-center reporting.
create or replace function public.app_org_agent_summary(p_org uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.app_is_org_member(p_org) then null else jsonb_build_object(
    'conversations',      (select count(*) from conversations where organization_id = p_org),
    'open',               (select count(*) from conversations where organization_id = p_org and status = 'open'),
    'escalated',          (select count(*) from conversations where organization_id = p_org and status = 'escalated'),
    'qualified_leads',    (select count(*) from conversations where organization_id = p_org and qualified),
    'after_hours_calls',  (select count(*) from call_logs where organization_id = p_org and after_hours),
    'calls',              (select count(*) from call_logs where organization_id = p_org),
    'bookings',           (select count(*) from bookings where organization_id = p_org),
    'outbound_queued',    (select count(*) from outbound_tasks where organization_id = p_org and status = 'queued'),
    'outbound_done',      (select count(*) from outbound_tasks where organization_id = p_org and status = 'done'),
    'locations',          (select count(*) from locations where organization_id = p_org and active),
    'calls_by_location',  (select coalesce(jsonb_object_agg(coalesce(l.name,'Unassigned'), c.n), '{}'::jsonb)
                            from (select location_id, count(*) n from call_logs where organization_id = p_org group by location_id) c
                            left join locations l on l.id = c.location_id)
  ) end;
$$;
grant execute on function public.app_org_agent_summary(uuid) to authenticated;

-- Index conversation summaries into the RAG memory so the agent can recall
-- across channels/sessions.
create or replace function public.app_enqueue_conversation_embedding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.summary, '') = '' then return new; end if;
  if tg_op = 'UPDATE' and new.summary is not distinct from old.summary then return new; end if;
  insert into ai_embedding_queue (organization_id, source_type, source_id, content)
  values (new.organization_id, 'conversations', new.id,
          coalesce(new.customer_name, '') || E'\n' || new.summary);
  return new;
end;
$$;
create trigger trg_embed_conversations after insert or update on conversations
  for each row execute function public.app_enqueue_conversation_embedding();
