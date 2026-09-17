-- Wàfè — module: calendar (the family diary)
--
-- ONE table holds events; everything else the calendar draws — task deadlines,
-- milestones, assignments, bills, trips, birthdays — belongs to another module
-- and is joined in the app, never copied here. That is why there is no
-- wf_calendar_birthdays and no wf_calendar_deadlines: deleting the task has to
-- delete the deadline, and the only way to guarantee that is to never store it
-- twice.
--
-- WHO SEES WHAT, IN POSTGRES
--
--   parent  wf_can_see(space_id, created_by, visibility, shared_with) — so one
--           parent's private appointment is invisible to the other.
--   child   their own rows, rows they are invited to, and family/child rows
--           marked child_safe that name nobody in particular.
--   guest   ONLY rows they are invited to (or explicitly shared with, or
--           created themselves when a parent granted them calendar.manage).
--
-- Editing follows the brief's age bands: a parent edits anything, anybody else
-- edits only what they created, and only with the calendar.manage grant or a
-- teen/young-adult band.
--
-- Idempotent throughout: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_events (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  title            text not null,
  notes            text not null default '',
  start_at         timestamptz not null,
  end_at           timestamptz not null,
  all_day          boolean not null default false,
  location         text not null default '',
  kind             text not null default 'event'
                   check (kind in ('event','school','church','appointment','deadline','birthday','trip')),
  colour_member_id uuid references public.wf_members(id) on delete set null,
  -- { freq: weekly|fortnightly|monthly, weekday, monthDay, until }
  rrule            jsonb,
  reminder_minutes integer check (reminder_minutes is null or reminder_minutes between 0 and 20160),
  -- Ids only: the calendar never joins another module's tables.
  community_id     uuid,
  trip_id          uuid,
  cover_url        text,
  visibility       text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with      uuid[] not null default '{}',
  child_safe       boolean not null default true,
  created_by       uuid references public.wf_members(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_wf_events_space_start on public.wf_events(space_id, start_at);
create index if not exists idx_wf_events_trip on public.wf_events(trip_id) where trip_id is not null;

-- Who an event is for. No row at all = the whole family.
create table if not exists public.wf_event_members (
  event_id        uuid not null references public.wf_events(id) on delete cascade,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  required        boolean not null default true,
  primary key (event_id, member_id)
);
create index if not exists idx_wf_event_members_member on public.wf_event_members(member_id);
create index if not exists idx_wf_event_members_space on public.wf_event_members(space_id);

create table if not exists public.wf_event_rsvps (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  event_id        uuid not null references public.wf_events(id) on delete cascade,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  response        text not null default 'maybe' check (response in ('yes','no','maybe')),
  note            text not null default '',
  at              timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (event_id, member_id)
);
create index if not exists idx_wf_event_rsvps_event on public.wf_event_rsvps(event_id);

-- A subscribable feed. `revoked_at` is checked on every fetch, so revoking a
-- link stops the feed immediately rather than at the subscriber's next refresh.
create table if not exists public.wf_ics_tokens (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  member_id       uuid references public.wf_members(id) on delete cascade,
  token           text not null unique,
  scope           text not null default 'member' check (scope in ('member','space')),
  label           text not null default '',
  created_at      timestamptz not null default now(),
  revoked_at      timestamptz,
  last_synced_at  timestamptz
);
create index if not exists idx_wf_ics_tokens_space on public.wf_ics_tokens(space_id);

-- Sunday planning: the week the family looked at and said yes to.
create table if not exists public.wf_calendar_weeks (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  week_start      date not null,
  confirmed_by    uuid references public.wf_members(id) on delete set null,
  confirmed_at    timestamptz not null default now(),
  note            text not null default '',
  primary key (space_id, week_start)
);

-- Pre-loaded content: the rhythms most families start from.
create table if not exists public.wf_catalog_event_templates (
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  slug             text not null,
  title            text not null,
  kind             text not null default 'event',
  default_start    text not null default '09:00',
  duration_minutes integer not null default 60,
  freq             text check (freq in ('weekly','fortnightly','monthly')),
  weekday          integer check (weekday between 0 and 6),
  note             text not null default '',
  primary key (organization_id, slug)
);

-- ---------------------------------------------------------------------------
-- 2. Helpers — security definer so a policy can ask about attendance without
--    recursing through wf_event_members' own policy.
-- ---------------------------------------------------------------------------

create or replace function public.wf_event_invited(p_event uuid, p_space uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from wf_event_members em
    where em.event_id = p_event and em.member_id = wf_my_member(p_space)
  )
$$;

-- An event that names nobody is for the whole family.
create or replace function public.wf_event_open(p_event uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from wf_event_members em where em.event_id = p_event)
$$;

-- Per-member overrides live in wf_members.grants; policies need to read them.
create or replace function public.wf_has_grant(p_space uuid, p_cap text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select (m.grants ->> p_cap)::boolean from wf_members m
    where m.space_id = p_space and m.user_id = auth.uid() limit 1
  ), false)
$$;

-- The brief's editing rule, in one place.
create or replace function public.wf_event_editable(p_space uuid, p_created_by uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select wf_is_parent(p_space)
      or (p_created_by = wf_my_member(p_space)
          and (wf_has_grant(p_space, 'calendar.manage')
               or coalesce((select m.age_band from wf_members m where m.id = wf_my_member(p_space)), '') in ('teen','young-adult')))
$$;

-- ---------------------------------------------------------------------------
-- 3. Policies
-- ---------------------------------------------------------------------------

alter table public.wf_events              enable row level security;
alter table public.wf_event_members       enable row level security;
alter table public.wf_event_rsvps         enable row level security;
alter table public.wf_ics_tokens          enable row level security;
alter table public.wf_calendar_weeks      enable row level security;
alter table public.wf_catalog_event_templates enable row level security;

drop policy if exists wf_events_read on public.wf_events;
create policy wf_events_read on public.wf_events for select to authenticated
using (
  wf_is_member(space_id) and (
    case wf_my_role(space_id)
      when 'parent' then wf_can_see(space_id, created_by, visibility, shared_with)
      when 'child'  then created_by = wf_my_member(space_id)
                         or wf_event_invited(id, space_id)
                         or (child_safe and visibility in ('family','child') and wf_event_open(id))
      else               created_by = wf_my_member(space_id)
                         or wf_event_invited(id, space_id)
                         or (visibility = 'shared' and wf_my_member(space_id) = any (shared_with))
    end
  )
);

drop policy if exists wf_events_write on public.wf_events;
create policy wf_events_write on public.wf_events for insert to authenticated
with check (
  wf_is_member(space_id)
  and created_by = wf_my_member(space_id)
  and (wf_is_parent(space_id) or wf_my_role(space_id) = 'child' or wf_has_grant(space_id, 'calendar.manage'))
);

drop policy if exists wf_events_edit on public.wf_events;
create policy wf_events_edit on public.wf_events for update to authenticated
using (wf_event_editable(space_id, created_by));

drop policy if exists wf_events_del on public.wf_events;
create policy wf_events_del on public.wf_events for delete to authenticated
using (wf_event_editable(space_id, created_by));

-- Attendance is readable exactly when the event is: the sub-select is itself
-- filtered by wf_events_read.
drop policy if exists wf_event_members_read on public.wf_event_members;
create policy wf_event_members_read on public.wf_event_members for select to authenticated
using (exists (select 1 from public.wf_events e where e.id = event_id));

drop policy if exists wf_event_members_write on public.wf_event_members;
create policy wf_event_members_write on public.wf_event_members for insert to authenticated
with check (wf_is_member(space_id) and exists (select 1 from public.wf_events e where e.id = event_id and wf_event_editable(e.space_id, e.created_by)));

drop policy if exists wf_event_members_del on public.wf_event_members;
create policy wf_event_members_del on public.wf_event_members for delete to authenticated
using (exists (select 1 from public.wf_events e where e.id = event_id and wf_event_editable(e.space_id, e.created_by)));

-- RSVP: everyone on an event may see the answers; you answer for yourself,
-- and a parent may answer for a child.
drop policy if exists wf_event_rsvps_read on public.wf_event_rsvps;
create policy wf_event_rsvps_read on public.wf_event_rsvps for select to authenticated
using (exists (select 1 from public.wf_events e where e.id = event_id));

drop policy if exists wf_event_rsvps_write on public.wf_event_rsvps;
create policy wf_event_rsvps_write on public.wf_event_rsvps for insert to authenticated
with check (wf_is_member(space_id) and (member_id = wf_my_member(space_id) or wf_is_parent(space_id)) and (wf_event_invited(event_id, space_id) or wf_is_parent(space_id)));

drop policy if exists wf_event_rsvps_edit on public.wf_event_rsvps;
create policy wf_event_rsvps_edit on public.wf_event_rsvps for update to authenticated
using (member_id = wf_my_member(space_id) or wf_is_parent(space_id));

drop policy if exists wf_event_rsvps_del on public.wf_event_rsvps;
create policy wf_event_rsvps_del on public.wf_event_rsvps for delete to authenticated
using (member_id = wf_my_member(space_id) or wf_is_parent(space_id));

-- A feed is a credential: yours, or every one of them if you are a parent.
drop policy if exists wf_ics_tokens_read on public.wf_ics_tokens;
create policy wf_ics_tokens_read on public.wf_ics_tokens for select to authenticated
using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));

drop policy if exists wf_ics_tokens_write on public.wf_ics_tokens;
create policy wf_ics_tokens_write on public.wf_ics_tokens for insert to authenticated
with check (wf_is_member(space_id) and (wf_is_parent(space_id) or (scope = 'member' and member_id = wf_my_member(space_id))));

drop policy if exists wf_ics_tokens_edit on public.wf_ics_tokens;
create policy wf_ics_tokens_edit on public.wf_ics_tokens for update to authenticated
using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));

drop policy if exists wf_ics_tokens_del on public.wf_ics_tokens;
create policy wf_ics_tokens_del on public.wf_ics_tokens for delete to authenticated
using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));

drop policy if exists wf_calendar_weeks_read on public.wf_calendar_weeks;
create policy wf_calendar_weeks_read on public.wf_calendar_weeks for select to authenticated
using (wf_is_member(space_id));

drop policy if exists wf_calendar_weeks_write on public.wf_calendar_weeks;
create policy wf_calendar_weeks_write on public.wf_calendar_weeks for insert to authenticated
with check (wf_is_parent(space_id) or wf_has_grant(space_id, 'calendar.manage'));

drop policy if exists wf_calendar_weeks_edit on public.wf_calendar_weeks;
create policy wf_calendar_weeks_edit on public.wf_calendar_weeks for update to authenticated
using (wf_is_parent(space_id) or wf_has_grant(space_id, 'calendar.manage'));

drop policy if exists wf_calendar_weeks_del on public.wf_calendar_weeks;
create policy wf_calendar_weeks_del on public.wf_calendar_weeks for delete to authenticated
using (wf_is_parent(space_id) or wf_has_grant(space_id, 'calendar.manage'));

drop policy if exists wf_catalog_event_templates_read on public.wf_catalog_event_templates;
create policy wf_catalog_event_templates_read on public.wf_catalog_event_templates for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 4. The ICS feed endpoint's read path
-- ---------------------------------------------------------------------------
--
-- The feed is served by an edge function with the service role, so it must ask
-- the database the same question the app asks: is this token live, and what is
-- it scoped to? Everything else (rendering VCALENDAR) happens in the function,
-- from rows read fresh on every request — which is what makes a change visible
-- to a subscriber inside their refresh interval, and a revoked link dead on the
-- next fetch rather than at the end of a cache window.

create or replace function public.wf_ics_feed(p_token text)
returns table (space_id uuid, member_id uuid, scope text)
language sql volatile security definer set search_path = public as $$
  update wf_ics_tokens t set last_synced_at = now()
  where t.token = p_token and t.revoked_at is null
  returning t.space_id, t.member_id, t.scope
$$;
revoke execute on function public.wf_ics_feed(text) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Provisioning — the rhythms a new family starts from
-- ---------------------------------------------------------------------------

create or replace function public.wf_seed_calendar(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into wf_catalog_event_templates (organization_id, slug, title, kind, default_start, duration_minutes, freq, weekday, note) values
    (p_org, 'sunday-service',  'Sunday service',        'church',      '10:00', 105, 'weekly', 0, 'The anchor of the week.'),
    (p_org, 'midweek-study',   'Midweek Bible study',   'church',      '19:30',  90, 'weekly', 3, 'At ours, or wherever it is hosted.'),
    (p_org, 'family-planning', 'Family planning hour',  'event',       '20:00',  45, 'weekly', 0, 'Next week''s diary, the money, what we are praying for.'),
    (p_org, 'school-run',      'School run',            'school',      '08:15',  45, 'weekly', 1, 'Set one per school day and give it a colour.'),
    (p_org, 'co-op',           'Home-ed co-op',         'school',      '09:30', 180, 'weekly', 2, 'For families who home-educate.'),
    (p_org, 'swimming',        'Swimming lesson',       'school',      '09:00',  60, 'weekly', 6, 'Add the child as the colour.'),
    (p_org, 'date-night',      'Date night',            'event',       '19:00', 180, 'monthly', null, 'Share it between the parents; keep it off the children''s screens.'),
    (p_org, 'family-dinner',   'Family dinner',         'event',       '18:00',  60, 'weekly', 5, 'Phones in the basket.'),
    (p_org, 'club-ride',       'Club ride',             'event',       '07:00', 150, 'fortnightly', 6, ''),
    (p_org, 'grandparents',    'Call the grandparents', 'event',       '17:00',  30, 'weekly', 0, 'The children take turns leading it.')
  on conflict (organization_id, slug) do update
    set title = excluded.title, kind = excluded.kind, default_start = excluded.default_start,
        duration_minutes = excluded.duration_minutes, freq = excluded.freq, weekday = excluded.weekday, note = excluded.note;
end $$;
grant execute on function public.wf_seed_calendar(uuid) to authenticated;
