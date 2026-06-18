-- 0040: operating-console messaging upgrade — real two-way send, AI-copilot
-- handoff, and inbox parity (notes, tags, assignment, snooze, CSAT, first-
-- response tracking, canned responses / WhatsApp templates, collision presence,
-- and WhatsApp as an outbound channel).

-- --- conversations: extra status + ops fields ------------------------------
alter table conversations drop constraint if exists conversations_status_check;
alter table conversations add constraint conversations_status_check
  check (status in ('open','handled','escalated','closed','snoozed'));

alter table conversations add column if not exists assigned_to uuid references auth.users(id) on delete set null;
alter table conversations add column if not exists tags text[] not null default '{}';
alter table conversations add column if not exists snoozed_until timestamptz;
alter table conversations add column if not exists first_response_at timestamptz;
alter table conversations add column if not exists csat_score integer;
alter table conversations add column if not exists csat_requested boolean not null default false;
create index if not exists idx_conversations_assigned on conversations(assigned_to);

-- --- conversation_messages: internal notes + delivery tracking -------------
alter table conversation_messages drop constraint if exists conversation_messages_role_check;
alter table conversation_messages add constraint conversation_messages_role_check
  check (role in ('customer','agent','human','system','note'));

alter table conversation_messages add column if not exists author_id uuid references auth.users(id) on delete set null;
alter table conversation_messages add column if not exists delivery_status text
  check (delivery_status in ('queued','sent','delivered','failed','undelivered','simulated'));
alter table conversation_messages add column if not exists provider_sid text not null default '';

-- --- canned responses (reusable replies) + WhatsApp templates --------------
create table if not exists canned_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null default '',
  shortcut text not null default '',
  body text not null default '',
  channel text not null default 'any' check (channel in ('any','sms','whatsapp','email','web')),
  is_whatsapp_template boolean not null default false,
  whatsapp_template_sid text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_canned_org on canned_responses(organization_id, created_at desc);
create trigger trg_canned_touch before update on canned_responses
  for each row execute function public.app_touch_updated_at();
alter table canned_responses enable row level security;
create policy canned_all on canned_responses for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- --- collision detection: who is viewing a conversation right now ----------
create table if not exists conversation_presence (
  conversation_id uuid not null references conversations(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists idx_presence_conv on conversation_presence(conversation_id, last_seen_at desc);
alter table conversation_presence enable row level security;
create policy presence_all on conversation_presence for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- --- WhatsApp as an outbound channel ---------------------------------------
alter table outbound_campaigns drop constraint if exists outbound_campaigns_channel_pref_check;
alter table outbound_campaigns add constraint outbound_campaigns_channel_pref_check
  check (channel_pref in ('call','sms','whatsapp','email'));
alter table outbound_tasks drop constraint if exists outbound_tasks_channel_check;
alter table outbound_tasks add constraint outbound_tasks_channel_check
  check (channel in ('call','sms','whatsapp','email'));

-- --- list org members (with names) for the assignment dropdown -------------
-- SECURITY DEFINER so it can read co-members' profiles (user_profiles RLS is
-- own-row only); guarded so only a member of the org may call it.
create or replace function public.app_org_members(p_org uuid)
returns table (user_id uuid, full_name text, role text)
language sql stable security definer set search_path = public as $$
  select m.user_id, coalesce(p.full_name, ''), m.role
  from organization_memberships m
  left join user_profiles p on p.user_id = m.user_id
  where m.organization_id = p_org
    and public.app_is_org_member(p_org)
  order by m.role, p.full_name;
$$;
grant execute on function public.app_org_members(uuid) to authenticated;
