-- 0148_wafe.sql — Wàfè: the operating system for intentional family life.
--
-- ASSEMBLED FILE. Do not hand-edit: it is the concatenation of
--   businesses/wafe/sql/00-foundation.sql   (spaces, members, invites,
--                                            notifications, nudges, points and
--                                            the RLS helpers every module is
--                                            written in terms of)
--   businesses/wafe/sql/<id>.sql            (one fragment per module, in the
--                                            registry / nav order below)
-- followed by the real wf_seed_org() aggregate, the blueprint row and the demo
-- tenant. To change anything, edit the fragment and re-assemble.
--
-- MODULE ORDER
--   home, notifications, family, people, learning, books
--   bible, curricula, tasks, goals, projects, calendar
--   finance, travel, wardrobe, wellness, studio, moodboards
--   memories
--
-- THE MODEL
--   organization (a buyer's tenant) → wf_spaces (a family) → wf_members (people)
-- Every row carries organization_id + space_id; rows that belong to someone
-- also carry owner_member_id, visibility and shared_with, and are read through
-- wf_can_see(), so a child's session physically cannot select a parent's rows.
-- No fragment references another module's tables: modules join on ids in the
-- app, never in SQL.
--
-- Idempotent throughout: safe to re-run.


-- ===========================================================================
-- FOUNDATION — businesses/wafe/sql/00-foundation.sql
-- ===========================================================================
-- Wàfè — 00 foundation: spaces, members, invites, notifications, nudges, points.
--
-- This fragment is concatenated (with every module's sql/<id>.sql) into
-- supabase/migrations/0148_wafe.sql by the assembler, which also appends the
-- blueprint row and the demo tenant. Nothing here knows about any module.
--
-- THE MODEL
--
--   organization (tenant)  →  wf_spaces (a family)  →  wf_members (people)
--
-- One deployment serves every buyer of the Wàfè blueprint, so every row is
-- scoped by organization_id. Inside a tenant, a SPACE is one family (or
-- couple, or person) and is the unit of privacy. A MEMBER belongs to a space
-- with a ROLE — parent, child or guest — and may or may not be bound to an
-- auth account (a six-year-old has a member row and no login). The row bound
-- to auth.uid() decides what a session is allowed to do; the helpers below
-- (wf_my_member, wf_my_role, wf_is_member, wf_is_parent, wf_is_child,
-- wf_can_see) are what every module's policies are written in terms of, so a
-- child's session physically cannot read a parent's rows.
--
-- Visibility, for rows that carry it (see wf_can_see):
--   private — the owner member only
--   shared  — the owner plus the members listed in shared_with
--   family  — every parent and guest (children get nothing by default)
--   child   — written for children: everyone in the space
--
-- Idempotent throughout: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------
create table if not exists public.wf_spaces (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  tagline         text not null default '',
  -- "values" is a reserved word; PostgREST still returns it as plain `values`.
  "values"        text[] not null default '{}',
  mission         text not null default '',
  cover_url       text,
  currency        text not null default 'GBP',
  planning_day    integer not null default 7 check (planning_day between 1 and 7),
  timezone        text not null default 'Europe/London',
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_spaces_org on public.wf_spaces(organization_id);

create table if not exists public.wf_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete set null,
  name            text not null,
  relation        text not null default '',
  role            text not null default 'guest' check (role in ('parent','child','guest')),
  age_band       text not null default 'adult' check (age_band in ('little','junior','teen','young-adult','adult')),
  birthday        date,
  avatar_url      text,
  hue             text not null default 'sage',
  points          integer not null default 0,
  grants          jsonb not null default '{}'::jsonb,
  email           text,
  joined_at       timestamptz not null default now()
);
create index if not exists idx_wf_members_space on public.wf_members(space_id);
create index if not exists idx_wf_members_user on public.wf_members(user_id) where user_id is not null;
-- One account is one person in a family (a partial index because unbound
-- members — young children — all have a null user_id).
create unique index if not exists uq_wf_members_space_user on public.wf_members(space_id, user_id) where user_id is not null;

create table if not exists public.wf_invites (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  email           text not null,
  name            text not null,
  role            text not null default 'guest' check (role in ('parent','child','guest')),
  relation        text not null default '',
  code            text not null unique,
  status          text not null default 'pending' check (status in ('pending','accepted','expired')),
  invited_by      uuid references public.wf_members(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_invites_space on public.wf_invites(space_id);

create table if not exists public.wf_notifications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  kind            text not null default 'family',
  title           text not null,
  body            text not null default '',
  href            text,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_notifications_member on public.wf_notifications(member_id, created_at desc);

-- The follow-up engine computes nudges from state and raises each once; this
-- is the "already raised" set, keyed by the nudge's stable key.
create table if not exists public.wf_nudges (
  space_id  uuid not null references public.wf_spaces(id) on delete cascade,
  key       text not null,
  raised_at timestamptz not null default now(),
  primary key (space_id, key)
);

create table if not exists public.wf_point_log (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  delta           integer not null,
  reason          text not null default '',
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_point_log_member on public.wf_point_log(member_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Helpers — the vocabulary every policy is written in
-- ---------------------------------------------------------------------------
-- security definer so they can read wf_members from inside wf_members' own
-- policies without recursing; stable so the planner evaluates them once per
-- statement, not once per row.

create or replace function public.wf_my_member(p_space uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select m.id from wf_members m
  where m.space_id = p_space and m.user_id = auth.uid()
  limit 1
$$;

create or replace function public.wf_my_role(p_space uuid) returns text
language sql stable security definer set search_path = public as $$
  select m.role from wf_members m
  where m.space_id = p_space and m.user_id = auth.uid()
  limit 1
$$;

create or replace function public.wf_is_member(p_space uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from wf_members m where m.space_id = p_space and m.user_id = auth.uid())
$$;

create or replace function public.wf_is_parent(p_space uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from wf_members m where m.space_id = p_space and m.user_id = auth.uid() and m.role = 'parent')
$$;

create or replace function public.wf_is_child(p_space uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from wf_members m where m.space_id = p_space and m.user_id = auth.uid() and m.role = 'child')
$$;

-- May the session see a row owned by p_owner with this visibility?
--   not a member → no; 'child' → everyone; the owner → yes;
--   'shared' → listed in shared_with; 'family' → parents and guests;
--   'private' → only the owner (already handled) → no.
create or replace function public.wf_can_see(p_space uuid, p_owner uuid, p_visibility text, p_shared uuid[]) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_me   uuid;
  v_role text;
begin
  select m.id, m.role into v_me, v_role from wf_members m
  where m.space_id = p_space and m.user_id = auth.uid() limit 1;
  if v_me is null then return false; end if;
  if p_visibility = 'child' then return true; end if;
  if p_owner is not null and p_owner = v_me then return true; end if;
  if p_visibility = 'shared' then return v_me = any (coalesce(p_shared, '{}'::uuid[])); end if;
  if p_visibility = 'family' then return v_role in ('parent', 'guest'); end if;
  return false;
end $$;

grant execute on function public.wf_my_member(uuid) to authenticated;
grant execute on function public.wf_my_role(uuid) to authenticated;
grant execute on function public.wf_is_member(uuid) to authenticated;
grant execute on function public.wf_is_parent(uuid) to authenticated;
grant execute on function public.wf_is_child(uuid) to authenticated;
grant execute on function public.wf_can_see(uuid, uuid, text, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Row-level security
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['wf_spaces','wf_members','wf_invites','wf_notifications','wf_nudges','wf_point_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Spaces: members read, parents edit. Creation goes through wf_create_space.
drop policy if exists wf_spaces_read on public.wf_spaces;
create policy wf_spaces_read on public.wf_spaces for select to authenticated using (wf_is_member(id));
drop policy if exists wf_spaces_edit on public.wf_spaces;
create policy wf_spaces_edit on public.wf_spaces for update to authenticated using (wf_is_parent(id)) with check (wf_is_parent(id));

-- Members: everyone in the family sees the family; parents manage it; a
-- member may edit their own row (the trigger below keeps that to name,
-- avatar and birthday — never role, points or grants).
drop policy if exists wf_members_read on public.wf_members;
create policy wf_members_read on public.wf_members for select to authenticated using (wf_is_member(space_id));
drop policy if exists wf_members_insert on public.wf_members;
create policy wf_members_insert on public.wf_members for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_members_update on public.wf_members;
create policy wf_members_update on public.wf_members for update to authenticated
  using (wf_is_parent(space_id) or id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or id = wf_my_member(space_id));
drop policy if exists wf_members_delete on public.wf_members;
create policy wf_members_delete on public.wf_members for delete to authenticated using (wf_is_parent(space_id));

-- A non-parent editing their own row may only touch the personal columns.
-- Skipped when there is no session (the platform and the seed run as the
-- service role, which is not a member of anything).
create or replace function public.wf_members_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or wf_is_parent(new.space_id) then return new; end if;
  if new.role is distinct from old.role
     or new.points is distinct from old.points
     or new.grants is distinct from old.grants
     or new.user_id is distinct from old.user_id
     or new.space_id is distinct from old.space_id
     or new.organization_id is distinct from old.organization_id
     or new.relation is distinct from old.relation
     or new.age_band is distinct from old.age_band
     or new.email is distinct from old.email then
    raise exception 'Only a parent can change that' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_wf_members_guard on public.wf_members;
create trigger trg_wf_members_guard before update on public.wf_members
  for each row execute function public.wf_members_guard();

-- Invites are parents' business, start to finish.
drop policy if exists wf_invites_parent on public.wf_invites;
create policy wf_invites_parent on public.wf_invites for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- Notifications: you see and mark read your own. Any member may insert for a
-- member of the same space — the follow-up engine runs client-side as
-- whoever is signed in and most of what it raises is addressed to the
-- parents. Parents may of course notify anyone.
drop policy if exists wf_notifications_read on public.wf_notifications;
create policy wf_notifications_read on public.wf_notifications for select to authenticated using (member_id = wf_my_member(space_id));
drop policy if exists wf_notifications_update on public.wf_notifications;
create policy wf_notifications_update on public.wf_notifications for update to authenticated
  using (member_id = wf_my_member(space_id)) with check (member_id = wf_my_member(space_id));
drop policy if exists wf_notifications_insert on public.wf_notifications;
create policy wf_notifications_insert on public.wf_notifications for insert to authenticated
  with check (
    wf_is_member(space_id)
    and exists (select 1 from wf_members m where m.id = member_id and m.space_id = wf_notifications.space_id)
  );
drop policy if exists wf_notifications_delete on public.wf_notifications;
create policy wf_notifications_delete on public.wf_notifications for delete to authenticated using (member_id = wf_my_member(space_id));

-- Nudge keys: any member may read and record (the engine dedupes on them).
drop policy if exists wf_nudges_read on public.wf_nudges;
create policy wf_nudges_read on public.wf_nudges for select to authenticated using (wf_is_member(space_id));
drop policy if exists wf_nudges_insert on public.wf_nudges;
create policy wf_nudges_insert on public.wf_nudges for insert to authenticated with check (wf_is_member(space_id));

-- Points: the family sees the history; only parents award (or take) points.
drop policy if exists wf_point_log_read on public.wf_point_log;
create policy wf_point_log_read on public.wf_point_log for select to authenticated using (wf_is_member(space_id));
drop policy if exists wf_point_log_insert on public.wf_point_log;
create policy wf_point_log_insert on public.wf_point_log for insert to authenticated with check (wf_is_parent(space_id));

-- ---------------------------------------------------------------------------
-- 4. RPCs — the writes a session cannot do through RLS alone
-- ---------------------------------------------------------------------------

-- Create a family and make the caller its first parent. Insert policies
-- cannot express "the first member of a space that does not exist yet", so
-- this runs as definer and binds the row to auth.uid() itself.
create or replace function public.wf_create_space(
  p_org uuid, p_name text, p_tagline text, p_my_name text, p_my_relation text,
  p_values text[], p_mission text, p_currency text, p_timezone text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_space  uuid;
  v_member uuid;
  v_email  text;
begin
  if v_uid is null then raise exception 'Sign in to create a family' using errcode = '42501'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'A family needs a name'; end if;
  select u.email into v_email from auth.users u where u.id = v_uid;

  insert into wf_spaces (organization_id, name, tagline, "values", mission, currency, timezone)
  values (p_org, trim(p_name), coalesce(p_tagline, ''), coalesce(p_values, '{}'), coalesce(p_mission, ''),
          coalesce(nullif(p_currency, ''), 'GBP'), coalesce(nullif(p_timezone, ''), 'Europe/London'))
  returning id into v_space;

  insert into wf_members (organization_id, space_id, user_id, name, relation, role, age_band, email)
  values (p_org, v_space, v_uid, coalesce(nullif(trim(p_my_name), ''), split_part(coalesce(v_email, 'Me'), '@', 1)),
          coalesce(p_my_relation, ''), 'parent', 'adult', v_email)
  returning id into v_member;

  return jsonb_build_object('id', v_space, 'name', trim(p_name), 'role', 'parent', 'member_id', v_member);
end $$;
grant execute on function public.wf_create_space(uuid, text, text, text, text, text[], text, text, text) to authenticated;

-- Join a family with an invite code. The invite fixes the newcomer's name,
-- role and relation (a parent chose them); the account is bound here.
create or replace function public.wf_accept_invite(p_org uuid, p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_inv    wf_invites%rowtype;
  v_space  wf_spaces%rowtype;
  v_member uuid;
  v_email  text;
begin
  if v_uid is null then raise exception 'Sign in to accept an invitation' using errcode = '42501'; end if;
  select * into v_inv from wf_invites
  where organization_id = p_org and upper(code) = upper(trim(p_code)) and status = 'pending'
  limit 1;
  if v_inv.id is null then raise exception 'That invitation code is not valid any more'; end if;
  select * into v_space from wf_spaces where id = v_inv.space_id;
  select u.email into v_email from auth.users u where u.id = v_uid;

  -- Already in this family? Accept the invite and hand back the existing row.
  select id into v_member from wf_members where space_id = v_inv.space_id and user_id = v_uid;
  if v_member is null then
    insert into wf_members (organization_id, space_id, user_id, name, relation, role, age_band, email)
    values (p_org, v_inv.space_id, v_uid, v_inv.name, v_inv.relation, v_inv.role,
            case when v_inv.role = 'child' then 'teen' else 'adult' end, coalesce(v_email, v_inv.email))
    returning id into v_member;
  end if;
  update wf_invites set status = 'accepted' where id = v_inv.id;

  return jsonb_build_object('id', v_space.id, 'name', v_space.name,
                            'role', (select role from wf_members where id = v_member), 'member_id', v_member);
end $$;
grant execute on function public.wf_accept_invite(uuid, text) to authenticated;

-- The spaces this account belongs to in this tenant (the space switcher).
create or replace function public.wf_list_my_spaces(p_org uuid)
returns table (id uuid, name text, role text, member_id uuid)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, m.role, m.id as member_id
  from wf_members m
  join wf_spaces s on s.id = m.space_id
  where m.user_id = auth.uid() and s.organization_id = p_org
  order by m.joined_at
$$;
grant execute on function public.wf_list_my_spaces(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Realtime — the bell updates without a refresh
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'wf_notifications') then
      alter publication supabase_realtime add table public.wf_notifications;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Provision — a business created from this blueprint gets its content
-- ---------------------------------------------------------------------------
-- wf_seed_org is the aggregate: each module's sql appends a
-- `perform wf_seed_<id>(p_org);` and the assembler replaces this stub with
-- the full body. Kept here so the trigger below can exist on its own.
create or replace function public.wf_seed_org(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wf_seed_home(p_org);
  perform wf_seed_notifications(p_org);
  perform wf_seed_family(p_org);
  perform wf_seed_people(p_org);
  perform wf_seed_learning(p_org);
  perform wf_seed_books(p_org);
  perform wf_seed_bible(p_org);
  perform wf_seed_curricula(p_org);
  perform wf_seed_tasks(p_org);
  perform wf_seed_goals(p_org);
  perform wf_seed_projects(p_org);
  perform wf_seed_calendar(p_org);
  perform wf_seed_finance(p_org);
  perform wf_seed_travel(p_org);
  perform wf_seed_wardrobe(p_org);
  perform wf_seed_wellness(p_org);
  perform wf_seed_studio(p_org);
  perform wf_seed_moodboards(p_org);
  perform wf_seed_memories(p_org);
end $$;
grant execute on function public.wf_seed_org(uuid) to authenticated;

create or replace function public.wf_seed_on_provision() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.blueprint_id is not null
     and exists (select 1 from blueprints b where b.id = new.blueprint_id and b.slug = 'wafe') then
    perform wf_seed_org(new.id);
  end if;
  return new;
end $$;
drop trigger if exists trg_org_seed_wafe on organizations;
create trigger trg_org_seed_wafe after insert on organizations
  for each row execute function public.wf_seed_on_provision();


-- ===========================================================================
-- MODULE 1/19 — home (businesses/wafe/sql/home.sql)
-- ===========================================================================
-- Wàfè — home: briefings, check-ins, Sunday planning, the family timeline and
-- the attention items a family has dealt with.
--
-- Home stores the RITUAL, not the content: what the companion (or the
-- template) told you this morning, what you said at the evening check-in,
-- the three priorities Sunday planning set, the timeline entries "On this
-- day" reads, and which attention items have been ticked off. Everything
-- else on the dashboards belongs to another module and is read there.
--
-- Privacy, in one line per table: a briefing and a check-in belong to the
-- member they are about (parents may also read the family's, which is what
-- the aggregate check-in strip is); planning is parents only; the timeline
-- carries the standard visibility columns.
--
-- Idempotent throughout: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_home_briefings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  on_date         date not null,
  -- morning · midday · evening. "when" is reserved; the column is `slot`.
  slot            text not null default 'morning' check (slot in ('morning','midday','evening')),
  body            text not null default '',
  sources         jsonb not null default '[]'::jsonb,
  -- 'template' means the companion was unavailable and we wrote it ourselves.
  kind            text not null default 'template' check (kind in ('ai','template')),
  generated_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
-- One briefing per member per day per slot — generated once, then cached.
create unique index if not exists uq_wf_home_briefings on public.wf_home_briefings(space_id, member_id, on_date, slot);

create table if not exists public.wf_home_check_ins (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  on_date         date not null,
  mood            integer not null default 3 check (mood between 1 and 5),
  gratitude       text not null default '',
  prayer          text not null default '',
  questions       jsonb not null default '[]'::jsonb,
  -- [{taskId,title,action,toMemberId,toDate,note,applied}]
  decisions       jsonb not null default '[]'::jsonb,
  summary         text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- Exactly one row per member per day; a second submission updates it.
create unique index if not exists uq_wf_home_check_ins on public.wf_home_check_ins(space_id, member_id, on_date);

create table if not exists public.wf_home_reviews (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  space_id          uuid not null references public.wf_spaces(id) on delete cascade,
  -- Monday-anchored: the week this focus is FOR.
  week_start        date not null,
  host_member_id    uuid references public.wf_members(id) on delete set null,
  priorities        text[] not null default '{}',
  tasks_planned     integer not null default 0,
  tasks_done        integer not null default 0,
  spend_vs_budget   jsonb not null default '{}'::jsonb,
  goal_progress     jsonb not null default '{}'::jsonb,
  prayers_answered  integer not null default 0,
  notes             text not null default '',
  completed_at      timestamptz,
  created_at        timestamptz not null default now()
);
create unique index if not exists uq_wf_home_reviews on public.wf_home_reviews(space_id, week_start);

create table if not exists public.wf_home_milestones (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  on_date          date not null,
  title            text not null,
  body             text not null default '',
  href             text not null default '/create/memories',
  photo_url        text,
  member_ids       uuid[] not null default '{}',
  owner_member_id  uuid references public.wf_members(id) on delete set null,
  visibility       text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with      uuid[] not null default '{}',
  created_at       timestamptz not null default now()
);
-- "On this day" reads by month and day, across years.
create index if not exists idx_wf_home_milestones_md on public.wf_home_milestones(space_id, (extract(month from on_date)), (extract(day from on_date)));

create table if not exists public.wf_home_attention (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  -- "<moduleId>:<itemId>" — the stable key the panel computes.
  key              text not null,
  record_type      text not null default '',
  record_id        text not null default '',
  reason           text not null default '',
  resolved_at      timestamptz,
  resolved_by      uuid references public.wf_members(id) on delete set null,
  created_at       timestamptz not null default now()
);
create unique index if not exists uq_wf_home_attention on public.wf_home_attention(space_id, key);

-- Pre-loaded content: the three questions the evening check-in asks when the
-- companion is not available, per age band. Org-keyed, public read.
create table if not exists public.wf_catalog_reflection_prompts (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  slug             text not null,
  age_band         text not null default 'adult' check (age_band in ('little','junior','teen','young-adult','adult')),
  questions        text[] not null default '{}',
  created_at       timestamptz not null default now()
);
create unique index if not exists uq_wf_catalog_reflection_prompts on public.wf_catalog_reflection_prompts(organization_id, slug);

-- ---------------------------------------------------------------------------
-- 2. Row-level security
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['wf_home_briefings','wf_home_check_ins','wf_home_reviews','wf_home_milestones','wf_home_attention','wf_catalog_reflection_prompts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Briefings: yours, plus (for a parent) the family's — the parent dashboard
-- shows who has read theirs. Only you may write your own.
drop policy if exists wf_home_briefings_read on public.wf_home_briefings;
create policy wf_home_briefings_read on public.wf_home_briefings for select to authenticated
  using (member_id = wf_my_member(space_id) or wf_is_parent(space_id));
drop policy if exists wf_home_briefings_write on public.wf_home_briefings;
create policy wf_home_briefings_write on public.wf_home_briefings for insert to authenticated
  with check (wf_is_member(space_id) and member_id = wf_my_member(space_id));
drop policy if exists wf_home_briefings_edit on public.wf_home_briefings;
create policy wf_home_briefings_edit on public.wf_home_briefings for update to authenticated
  using (member_id = wf_my_member(space_id)) with check (member_id = wf_my_member(space_id));
drop policy if exists wf_home_briefings_del on public.wf_home_briefings;
create policy wf_home_briefings_del on public.wf_home_briefings for delete to authenticated
  using (member_id = wf_my_member(space_id) or wf_is_parent(space_id));

-- Check-ins: a parent sees the family's (the aggregate is the point); a child
-- and a guest see only their own, and nobody writes someone else's.
drop policy if exists wf_home_check_ins_read on public.wf_home_check_ins;
create policy wf_home_check_ins_read on public.wf_home_check_ins for select to authenticated
  using (member_id = wf_my_member(space_id) or wf_is_parent(space_id));
drop policy if exists wf_home_check_ins_write on public.wf_home_check_ins;
create policy wf_home_check_ins_write on public.wf_home_check_ins for insert to authenticated
  with check (wf_is_member(space_id) and member_id = wf_my_member(space_id));
drop policy if exists wf_home_check_ins_edit on public.wf_home_check_ins;
create policy wf_home_check_ins_edit on public.wf_home_check_ins for update to authenticated
  using (member_id = wf_my_member(space_id)) with check (member_id = wf_my_member(space_id));
drop policy if exists wf_home_check_ins_del on public.wf_home_check_ins;
create policy wf_home_check_ins_del on public.wf_home_check_ins for delete to authenticated
  using (member_id = wf_my_member(space_id) or wf_is_parent(space_id));

-- Sunday planning is the parents' record of the family's direction.
drop policy if exists wf_home_reviews_parent on public.wf_home_reviews;
create policy wf_home_reviews_parent on public.wf_home_reviews for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- The timeline carries visibility, so the standard helper decides.
drop policy if exists wf_home_milestones_read on public.wf_home_milestones;
create policy wf_home_milestones_read on public.wf_home_milestones for select to authenticated
  using (wf_can_see(space_id, owner_member_id, visibility, shared_with));
drop policy if exists wf_home_milestones_write on public.wf_home_milestones;
create policy wf_home_milestones_write on public.wf_home_milestones for insert to authenticated with check (wf_is_member(space_id));
drop policy if exists wf_home_milestones_edit on public.wf_home_milestones;
create policy wf_home_milestones_edit on public.wf_home_milestones for update to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));
drop policy if exists wf_home_milestones_del on public.wf_home_milestones;
create policy wf_home_milestones_del on public.wf_home_milestones for delete to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));

-- Attention: everyone reads what has been dealt with (the panel is shared);
-- parents decide.
drop policy if exists wf_home_attention_read on public.wf_home_attention;
create policy wf_home_attention_read on public.wf_home_attention for select to authenticated using (wf_is_member(space_id));
drop policy if exists wf_home_attention_parent on public.wf_home_attention;
create policy wf_home_attention_parent on public.wf_home_attention for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- The prompt catalogue is content, not data: everyone in the tenant reads it.
drop policy if exists wf_catalog_reflection_prompts_read on public.wf_catalog_reflection_prompts;
create policy wf_catalog_reflection_prompts_read on public.wf_catalog_reflection_prompts for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 3. Keep updated_at honest on the check-in upsert
-- ---------------------------------------------------------------------------
create or replace function public.wf_home_touch() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists trg_wf_home_check_ins_touch on public.wf_home_check_ins;
create trigger trg_wf_home_check_ins_touch before update on public.wf_home_check_ins
  for each row execute function public.wf_home_touch();

-- ---------------------------------------------------------------------------
-- 4. Provisioning content
-- ---------------------------------------------------------------------------
create or replace function public.wf_seed_home(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into wf_catalog_reflection_prompts (organization_id, slug, age_band, questions) values
    (p_org, 'evening-adult', 'adult', array[
      'What went well today?',
      'What was hard?',
      'What is one thing you want to carry into tomorrow?']),
    (p_org, 'evening-young-adult', 'young-adult', array[
      'What went well today?',
      'What was hard?',
      'What do you want tomorrow to look like?']),
    (p_org, 'evening-teen', 'teen', array[
      'What was the best bit of today?',
      'Was anything unfair or difficult?',
      'What are you hoping for tomorrow?']),
    (p_org, 'evening-junior', 'junior', array[
      'What made you happy today?',
      'What was tricky?',
      'What do you want to do tomorrow?']),
    (p_org, 'evening-little', 'little', array[
      'What made you smile today?',
      'Was anything sad?',
      'What shall we thank God for?'])
  on conflict (organization_id, slug) do update
    set age_band = excluded.age_band, questions = excluded.questions;
end $$;
grant execute on function public.wf_seed_home(uuid) to authenticated;


-- ===========================================================================
-- MODULE 2/19 — notifications (businesses/wafe/sql/notifications.sql)
-- ===========================================================================
-- Wàfè — notifications: the notification centre and the follow-up engine.
--
-- Five tables and one catalogue:
--   wf_notification_items   what the engine raised, per member
--   wf_notification_marks   snooze/acted overlay for the shell's own wf_notifications
--   wf_notification_prefs   channels, quiet hours, digest, muted categories
--   wf_follow_up_rules      what THIS family changed about a rule
--   wf_nudge_history        every attempt, delivered or not — the audit trail
--   wf_catalog_follow_up_rules  the rules the product ships with, per tenant
--
-- The privacy promises the app makes are enforced here as well, not only in
-- the client: a member reads their own inbox, a parent additionally reads
-- their children's, and nobody but a parent may read a row whose sensitivity
-- class is financial, health, documents, private or settings. The unique index
-- on idempotency_key is what makes "one nudge per rule, record, member and
-- window" true even when two tabs race.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_notification_items (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  rule_key         text,
  kind             text not null default 'family',
  sensitivity      text not null default 'general'
                     check (sensitivity in ('general','financial','health','documents','private','settings')),
  record_type      text,
  record_id        text,
  title            text not null,
  body             text not null default '',
  href             text,
  channel          text not null default 'in-app' check (channel in ('in-app','email','push')),
  idempotency_key  text not null,
  reminder_number  integer not null default 1,
  needs_attention  boolean not null default false,
  action           jsonb,
  action_outcome   text,
  read_at          timestamptz,
  snoozed_until    timestamptz,
  acted_at         timestamptz,
  deferred_until   timestamptz,
  digest_for       date,
  is_test          boolean not null default false,
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_notification_items_member on public.wf_notification_items(member_id, created_at desc);
create index if not exists idx_wf_notification_items_space on public.wf_notification_items(space_id, created_at desc);
-- One nudge per rule / record / member / window. This is the criterion.
create unique index if not exists uq_wf_notification_items_key on public.wf_notification_items(space_id, idempotency_key);

create table if not exists public.wf_notification_marks (
  notification_id  uuid primary key references public.wf_notifications(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  snoozed_until    timestamptz,
  acted_at         timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_notification_marks_member on public.wf_notification_marks(member_id);

create table if not exists public.wf_notification_prefs (
  member_id        uuid primary key references public.wf_members(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  channel_in_app   boolean not null default true,
  channel_email    boolean not null default false,
  channel_push     boolean not null default false,
  quiet_start      time not null default '21:30',
  quiet_end        time not null default '07:00',
  digest_mode      text not null default 'auto' check (digest_mode in ('off','auto','always')),
  digest_at        time not null default '18:00',
  muted_categories text[] not null default '{}',
  timezone         text not null default 'Europe/London',
  updated_at       timestamptz not null default now()
);
create index if not exists idx_wf_notification_prefs_space on public.wf_notification_prefs(space_id);

create table if not exists public.wf_follow_up_rules (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  rule_key         text not null,
  enabled          boolean,
  max_reminders    integer check (max_reminders between 0 and 9),
  recipient_role   text check (recipient_role in ('parents','assignee','owner','child','guest','everyone')),
  updated_at       timestamptz not null default now(),
  unique (space_id, rule_key)
);

create table if not exists public.wf_nudge_history (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  rule_key         text not null,
  record_id        text,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  reminder_number  integer not null default 1,
  outcome          text not null default 'delivered'
                     check (outcome in ('delivered','duplicate','held','digest','muted','parked','blocked')),
  note             text not null default '',
  sent_at          timestamptz not null default now()
);
create index if not exists idx_wf_nudge_history_lookup on public.wf_nudge_history(space_id, rule_key, member_id, sent_at desc);

-- Pre-loaded content: the rule catalogue every family in this tenant starts from.
create table if not exists public.wf_catalog_follow_up_rules (
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  rule_key         text not null,
  label            text not null,
  trigger_text     text not null default '',
  module_id        text not null default 'home',
  kind             text not null default 'family',
  sensitivity      text not null default 'general',
  recipient_role   text not null default 'parents',
  job              text not null default 'daily-07:00',
  window_unit      text not null default 'day' check (window_unit in ('day','week','once')),
  max_reminders    integer not null default 1,
  escalate_to      text,
  enabled          boolean not null default true,
  sort             integer not null default 0,
  primary key (organization_id, rule_key)
);

-- ---------------------------------------------------------------------------
-- 2. Row-level security
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['wf_notification_items','wf_notification_marks','wf_notification_prefs','wf_follow_up_rules','wf_nudge_history','wf_catalog_follow_up_rules'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- "My inbox, plus my children's if I am a parent" — and never a sensitive
-- class for anyone who is not a parent. One predicate, used by every policy
-- on the item and mark tables.
create or replace function public.wf_notif_mine(p_space uuid, p_member uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_me   uuid;
  v_role text;
begin
  select m.id, m.role into v_me, v_role from wf_members m
  where m.space_id = p_space and m.user_id = auth.uid() limit 1;
  if v_me is null then return false; end if;
  if v_me = p_member then return true; end if;
  if v_role <> 'parent' then return false; end if;
  return exists (select 1 from wf_members c where c.id = p_member and c.space_id = p_space and c.role = 'child');
end $$;
grant execute on function public.wf_notif_mine(uuid, uuid) to authenticated;

-- Items -----------------------------------------------------------------
drop policy if exists wf_notification_items_read on public.wf_notification_items;
create policy wf_notification_items_read on public.wf_notification_items for select to authenticated
  using (wf_notif_mine(space_id, member_id) and (sensitivity = 'general' or wf_is_parent(space_id)));
drop policy if exists wf_notification_items_insert on public.wf_notification_items;
create policy wf_notification_items_insert on public.wf_notification_items for insert to authenticated
  with check (
    wf_is_member(space_id)
    and exists (select 1 from wf_members m where m.id = member_id and m.space_id = wf_notification_items.space_id)
    -- The engine may never address a sensitive class to a child or a guest.
    and (sensitivity = 'general' or exists (select 1 from wf_members m where m.id = member_id and m.role = 'parent'))
  );
drop policy if exists wf_notification_items_update on public.wf_notification_items;
create policy wf_notification_items_update on public.wf_notification_items for update to authenticated
  using (wf_notif_mine(space_id, member_id)) with check (wf_notif_mine(space_id, member_id));
drop policy if exists wf_notification_items_delete on public.wf_notification_items;
create policy wf_notification_items_delete on public.wf_notification_items for delete to authenticated
  using (wf_notif_mine(space_id, member_id));

-- Marks (overlay on the shell's notifications) --------------------------
drop policy if exists wf_notification_marks_all on public.wf_notification_marks;
create policy wf_notification_marks_all on public.wf_notification_marks for all to authenticated
  using (wf_notif_mine(space_id, member_id)) with check (wf_notif_mine(space_id, member_id));

-- The centre lets a parent open a child's inbox and act on their behalf, so
-- the shell's own notifications need the same reach. (The foundation grants
-- each member only their own; this widens it to a parent's children.)
drop policy if exists wf_notifications_parent_read on public.wf_notifications;
create policy wf_notifications_parent_read on public.wf_notifications for select to authenticated
  using (wf_is_parent(space_id) and exists (select 1 from wf_members c where c.id = member_id and c.space_id = wf_notifications.space_id and c.role = 'child'));
drop policy if exists wf_notifications_parent_update on public.wf_notifications;
create policy wf_notifications_parent_update on public.wf_notifications for update to authenticated
  using (wf_is_parent(space_id) and exists (select 1 from wf_members c where c.id = member_id and c.space_id = wf_notifications.space_id and c.role = 'child'))
  with check (wf_is_parent(space_id));

-- Preferences: your own; a parent may set anyone's in the family ---------
drop policy if exists wf_notification_prefs_read on public.wf_notification_prefs;
create policy wf_notification_prefs_read on public.wf_notification_prefs for select to authenticated
  using (member_id = wf_my_member(space_id) or wf_is_parent(space_id));
drop policy if exists wf_notification_prefs_write on public.wf_notification_prefs;
create policy wf_notification_prefs_write on public.wf_notification_prefs for insert to authenticated
  with check (member_id = wf_my_member(space_id) or wf_is_parent(space_id));
drop policy if exists wf_notification_prefs_edit on public.wf_notification_prefs;
create policy wf_notification_prefs_edit on public.wf_notification_prefs for update to authenticated
  using (member_id = wf_my_member(space_id) or wf_is_parent(space_id))
  with check (member_id = wf_my_member(space_id) or wf_is_parent(space_id));

-- Children are in-app only, whatever is written to their row.
create or replace function public.wf_notification_prefs_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.channel_in_app := true;
  if exists (select 1 from wf_members m where m.id = new.member_id and m.role = 'child') then
    new.channel_email := false;
    new.channel_push  := false;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists trg_wf_notification_prefs_guard on public.wf_notification_prefs;
create trigger trg_wf_notification_prefs_guard before insert or update on public.wf_notification_prefs
  for each row execute function public.wf_notification_prefs_guard();

-- Rules: the family reads them, parents edit them ------------------------
drop policy if exists wf_follow_up_rules_read on public.wf_follow_up_rules;
create policy wf_follow_up_rules_read on public.wf_follow_up_rules for select to authenticated using (wf_is_member(space_id));
drop policy if exists wf_follow_up_rules_write on public.wf_follow_up_rules;
create policy wf_follow_up_rules_write on public.wf_follow_up_rules for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- History: parents see the family's, everyone sees their own -------------
drop policy if exists wf_nudge_history_read on public.wf_nudge_history;
create policy wf_nudge_history_read on public.wf_nudge_history for select to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_nudge_history_insert on public.wf_nudge_history;
create policy wf_nudge_history_insert on public.wf_nudge_history for insert to authenticated with check (wf_is_member(space_id));

-- The catalogue is product content: any signed-in member may read it.
drop policy if exists wf_catalog_follow_up_rules_read on public.wf_catalog_follow_up_rules;
create policy wf_catalog_follow_up_rules_read on public.wf_catalog_follow_up_rules for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 3. Realtime — the unread count moves without a refresh
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'wf_notification_items') then
      alter publication supabase_realtime add table public.wf_notification_items;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Seed — the rule catalogue this tenant starts from
-- ---------------------------------------------------------------------------
-- The defaults from the brief plus the four the completeness review added: a
-- Learning Hub plan item falling due, a newly assigned playlist or
-- reading-plan day, a Book-to-Course week opening, and a reward redemption
-- waiting for a parent's yes.
create or replace function public.wf_seed_notifications(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into wf_catalog_follow_up_rules
    (organization_id, rule_key, label, trigger_text, module_id, kind, sensitivity, recipient_role, job, window_unit, max_reminders, escalate_to, sort)
  values
    (p_org,'task.overdue','Task overdue','A task passes its due date and is still open','tasks','task','general','assignee','daily-07:00','day',3,'parents',1),
    (p_org,'task.due-tomorrow','Task due tomorrow','A task falls due the next day','tasks','task','general','assignee','daily-18:00','once',1,null,2),
    (p_org,'task.unassigned','Nobody owns this task','A task sits without an owner for two days','tasks','task','general','parents','daily-07:00','day',2,null,3),
    (p_org,'chore.streak-missed','Chore missed twice','A recurring chore is missed two days running','tasks','task','general','child','daily-18:00','day',2,'parents',4),
    (p_org,'habit.missed-2','Habit missed two days','A habit has no log for two days','wellness','wellness','general','owner','daily-18:00','day',2,null,5),
    (p_org,'wellness.appointment-2','Appointment in two days','A health appointment is 48 hours away','wellness','wellness','health','parents','daily-07:00','once',2,null,6),
    (p_org,'milestone.due-7','Milestone due in a week','A goal milestone is seven days out','goals','goal','general','owner','daily-07:00','once',2,'parents',7),
    (p_org,'goal.stalled-14','Goal has stalled','No milestone has moved on a goal for a fortnight','goals','goal','general','parents','weekly-sun-17:00','week',2,null,8),
    (p_org,'curricula.assignment-due','Curriculum assignment due','An assigned curriculum item falls due','curricula','learning','general','child','daily-07:00','day',3,'parents',9),
    (p_org,'project.blocked-7','Project blocked a week','A project has been marked blocked for seven days','projects','goal','general','owner','weekly-sun-17:00','week',2,'parents',10),
    (p_org,'learning.assigned-untouched-5','Assigned lesson untouched','An assigned lesson has not been opened for five days','learning','learning','general','child','daily-07:00','day',3,'parents',11),
    (p_org,'learning.plan-item-due','Learning plan item due today','A Learning Hub plan item falls due today','learning','learning','general','assignee','daily-07:00','day',2,null,12),
    (p_org,'learning.newly-assigned','Something new was assigned','A playlist, course or reading-plan day is assigned to a member','learning','learning','general','assignee','on-change','once',1,null,13),
    (p_org,'books.course-week-open','A course week opens','The next week of a Book-to-Course plan becomes available','books','learning','general','assignee','weekly-sun-17:00','week',1,null,14),
    (p_org,'books.reading-plan-behind','Reading plan slipping','A reading plan is three days behind its schedule','books','learning','general','owner','weekly-sun-17:00','week',2,null,15),
    (p_org,'bible.plan-day','Today''s reading','A Bible reading-plan day is due','bible','prayer','general','assignee','daily-07:00','day',1,null,16),
    (p_org,'prayer.request-added','A prayer request was added','Someone adds a request to the prayer wall','bible','prayer','general','everyone','on-change','once',1,null,17),
    (p_org,'prayer.unanswered-30','Prayer unanswered a month','A prayer request has had no update for thirty days','bible','prayer','general','owner','weekly-sun-17:00','once',2,null,18),
    (p_org,'bill.due-3','Bill due in three days','A recurring bill is due within three days','finance','finance','financial','parents','daily-07:00','day',3,null,19),
    (p_org,'budget.threshold-80','Budget past 80%','An envelope crosses 80% of its monthly allowance','finance','finance','financial','parents','daily-07:00','week',2,null,20),
    (p_org,'purchase.approval-pending','Purchase waiting for approval','A purchase request needs a parent''s decision','finance','finance','financial','parents','hourly','day',3,null,21),
    (p_org,'reward.redemption-pending','Reward redemption waiting','A child asks to redeem points for a reward','family','family','general','parents','hourly','day',3,null,22),
    (p_org,'event.tomorrow','Something on tomorrow','An event the member is on is one day away','calendar','event','general','assignee','daily-18:00','once',1,null,23),
    (p_org,'event.rsvp-missing','RSVP still missing','An invitation has no answer two days before','calendar','event','general','assignee','daily-07:00','day',3,null,24),
    (p_org,'trip.countdown-14','Trip in a fortnight','A trip is fourteen days away','travel','travel','general','everyone','daily-07:00','once',1,null,25),
    (p_org,'travel.packing-ready','Packing lists ready','The packing lists for a trip are generated or change','travel','travel','general','everyone','on-change','once',2,null,26),
    (p_org,'birthday.in-7','Birthday in a week','A member''s birthday is seven days away','notifications','family','general','parents','daily-07:00','once',1,null,27),
    (p_org,'celebrate.badge-earned','Somebody earned something','A child earns a badge or finishes a plan','family','celebrate','general','everyone','on-change','once',1,null,28),
    (p_org,'memories.on-this-day','On this day','A memory from a past year falls on today''s date','memories','family','general','everyone','daily-07:00','day',1,null,29),
    (p_org,'checkin.evening','Evening check-in still open','The evening check-in has not been done by 21:00','home','briefing','general','parents','daily-18:00','day',2,null,30)
  on conflict (organization_id, rule_key) do update set
    label = excluded.label,
    trigger_text = excluded.trigger_text,
    module_id = excluded.module_id,
    kind = excluded.kind,
    sensitivity = excluded.sensitivity,
    recipient_role = excluded.recipient_role,
    job = excluded.job,
    window_unit = excluded.window_unit,
    max_reminders = excluded.max_reminders,
    escalate_to = excluded.escalate_to,
    sort = excluded.sort;
end $$;
grant execute on function public.wf_seed_notifications(uuid) to authenticated;

-- The assembler appends this to wf_seed_org(p_org):
--   perform wf_seed_notifications(p_org);


-- ===========================================================================
-- MODULE 3/19 — family (businesses/wafe/sql/family.sql)
-- ===========================================================================
-- Wàfè — family: the trust boundary.
--
-- The space, its members and its invitations already live in 00-foundation.sql
-- because every module needs them. This fragment adds what sits AROUND that
-- core and belongs to nobody else: the values and the index of what points at
-- them, the mission's versions, the named things a guest is granted, the
-- per-member permission overrides, the rhythms and plan, the AI meter, the
-- parent PIN, and the audit log that proves every one of those changes.
--
-- Two rules run through the policies:
--   1. Only a parent may write anything here (wf_is_parent), and only a parent
--      may read the audit log, the value index, the exports and the handovers.
--   2. A guest's row of wf_family_shares is the whole of that guest's product,
--      so a member may read their own shares and nothing else.
--
-- The PIN lives in its own parents-only table and is compared inside a
-- security-definer function, so a child's session can prove a PIN without ever
-- being able to read it. Idempotent throughout: safe to re-run.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_family_values (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  name            text not null,
  meaning         text not null default '',
  position        integer not null default 0,
  archived_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_family_values_space on public.wf_family_values(space_id, position);

-- What already points at a value. A value with rows here is archived, never
-- deleted; modules that tag a record with a value keep this index honest.
create table if not exists public.wf_family_value_links (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  value_id        uuid not null references public.wf_family_values(id) on delete cascade,
  module_id       text not null,
  label           text not null default '',
  href            text not null default '',
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_family_value_links_value on public.wf_family_value_links(value_id);

create table if not exists public.wf_family_missions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  mission          text not null,
  vision           text not null default '',
  legacy           text not null default '',
  author_member_id uuid references public.wf_members(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_family_missions_space on public.wf_family_missions(space_id, created_at desc);

-- The named objects a guest may see. This is the entirety of a guest's
-- product: no row here, nothing rendered and nothing fetchable.
create table if not exists public.wf_family_shares (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  -- A member, or an invitation that has not been accepted yet (things get
  -- shared with people before they arrive), so this is deliberately not a FK.
  member_id       uuid not null,
  object_type     text not null check (object_type in ('trip','board','course','wall','album','event','session')),
  object_id       text not null,
  label           text not null default '',
  href            text not null default '',
  level           text not null default 'view' check (level in ('view','contribute')),
  granted_by      uuid references public.wf_members(id) on delete set null,
  granted_at      timestamptz not null default now(),
  expires_at      timestamptz
);
create unique index if not exists uq_wf_family_shares on public.wf_family_shares(space_id, member_id, object_id);
create index if not exists idx_wf_family_shares_member on public.wf_family_shares(member_id);

-- Per-member extras the core member row has no business carrying: the guest
-- tag, the child-mode flag, and the permission OVERRIDES that survive a band
-- change (the band supplies defaults; these are the parent's own decisions).
create table if not exists public.wf_family_member_meta (
  member_id       uuid primary key references public.wf_members(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  guest_tag       text check (guest_tag in ('relative','friend','mentor')),
  child_mode      boolean not null default false,
  overrides       jsonb not null default '{}'::jsonb,
  updated_at      timestamptz not null default now()
);
create index if not exists idx_wf_family_member_meta_space on public.wf_family_member_meta(space_id);

create table if not exists public.wf_family_settings (
  space_id                 uuid primary key references public.wf_spaces(id) on delete cascade,
  organization_id          uuid not null references public.organizations(id) on delete cascade,
  week_start               integer not null default 1 check (week_start between 1 and 7),
  briefing_hour            integer not null default 7 check (briefing_hour between 0 and 23),
  checkin_hour             integer not null default 19 check (checkin_hour between 0 and 23),
  grace_days               integer[] not null default '{7}',
  purchase_approval_cents  integer not null default 25000,
  plan                     text not null default 'seed' check (plan in ('seed','household','legacy')),
  quiet_from               text not null default '21:00',
  quiet_to                 text not null default '07:00',
  digest_above             integer not null default 5,
  notify_push              boolean not null default true,
  notify_email             boolean not null default true,
  -- The companion's monthly meter, reset by month rather than by cron.
  ai_month                 text not null default to_char(now(), 'YYYY-MM'),
  ai_calls                 integer not null default 0,
  ai_images                integer not null default 0,
  ai_media_mb              integer not null default 0,
  ai_reels                 integer not null default 0
);

-- The parent PIN, alone, in a parents-only table. Compared inside
-- wf_family_check_pin so a child can prove one without reading it.
create table if not exists public.wf_family_secrets (
  space_id   uuid primary key references public.wf_spaces(id) on delete cascade,
  pin_hash   text,
  updated_at timestamptz not null default now()
);

create table if not exists public.wf_family_audit (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  actor_member_id  uuid references public.wf_members(id) on delete set null,
  action           text not null check (action in ('member','role','band','permission','share','invite','values','mission','settings','childmode','export','space')),
  target_type      text not null default '',
  target_id        text not null default '',
  summary          text not null,
  before_text      text,
  after_text       text,
  at               timestamptz not null default now()
);
create index if not exists idx_wf_family_audit_space on public.wf_family_audit(space_id, at desc);

create table if not exists public.wf_family_exports (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  requested_by    uuid references public.wf_members(id) on delete set null,
  requested_at    timestamptz not null default now(),
  status          text not null default 'queued' check (status in ('queued','ready','failed')),
  ready_at        timestamptz,
  bytes           bigint,
  note            text not null default ''
);
create index if not exists idx_wf_family_exports_space on public.wf_family_exports(space_id, requested_at desc);

-- What happened to a member's work when they left: their access ended at
-- once, their open tasks passed to the owner, their authored history stayed.
create table if not exists public.wf_family_handovers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  member_id       uuid not null,
  member_name     text not null,
  to_member_id    uuid references public.wf_members(id) on delete set null,
  open_tasks      integer not null default 0,
  at              timestamptz not null default now()
);
create index if not exists idx_wf_family_handovers_space on public.wf_family_handovers(space_id, at desc);

-- ---------------------------------------------------------------------------
-- 2. Row-level security
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'wf_family_values','wf_family_value_links','wf_family_missions','wf_family_shares',
    'wf_family_member_meta','wf_family_settings','wf_family_secrets','wf_family_audit',
    'wf_family_exports','wf_family_handovers'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Values and the mission are the family's public face: everyone reads them,
-- parents write them.
drop policy if exists wf_family_values_read on public.wf_family_values;
create policy wf_family_values_read on public.wf_family_values for select to authenticated using (wf_is_member(space_id));
drop policy if exists wf_family_values_write on public.wf_family_values;
create policy wf_family_values_write on public.wf_family_values for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_family_missions_read on public.wf_family_missions;
create policy wf_family_missions_read on public.wf_family_missions for select to authenticated using (wf_is_member(space_id));
drop policy if exists wf_family_missions_write on public.wf_family_missions;
create policy wf_family_missions_write on public.wf_family_missions for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- The value index tells a parent what would break; nobody else needs it.
drop policy if exists wf_family_value_links_parent on public.wf_family_value_links;
create policy wf_family_value_links_parent on public.wf_family_value_links for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- A member reads the things shared WITH THEM; a parent reads and writes all.
drop policy if exists wf_family_shares_read on public.wf_family_shares;
create policy wf_family_shares_read on public.wf_family_shares for select to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_family_shares_write on public.wf_family_shares;
create policy wf_family_shares_write on public.wf_family_shares for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- A member may read their own meta (their band overrides and child-mode flag);
-- only a parent may write any of it — that is acceptance criterion 1.
drop policy if exists wf_family_member_meta_read on public.wf_family_member_meta;
create policy wf_family_member_meta_read on public.wf_family_member_meta for select to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_family_member_meta_write on public.wf_family_member_meta;
create policy wf_family_member_meta_write on public.wf_family_member_meta for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- Rhythms are shared (the briefing hour is everybody's); parents change them.
drop policy if exists wf_family_settings_read on public.wf_family_settings;
create policy wf_family_settings_read on public.wf_family_settings for select to authenticated using (wf_is_member(space_id));
drop policy if exists wf_family_settings_write on public.wf_family_settings;
create policy wf_family_settings_write on public.wf_family_settings for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- Parents only, all four.
drop policy if exists wf_family_secrets_parent on public.wf_family_secrets;
create policy wf_family_secrets_parent on public.wf_family_secrets for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_family_audit_parent on public.wf_family_audit;
create policy wf_family_audit_parent on public.wf_family_audit for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_family_exports_parent on public.wf_family_exports;
create policy wf_family_exports_parent on public.wf_family_exports for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_family_handovers_parent on public.wf_family_handovers;
create policy wf_family_handovers_parent on public.wf_family_handovers for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- ---------------------------------------------------------------------------
-- 3. Functions — the PIN, the meter, and deleting a family
-- ---------------------------------------------------------------------------

-- Is a PIN set at all? A child may ask (it decides whether the exit screen
-- offers "ask a parent" or "set one first"), but may never read the hash.
create or replace function public.wf_family_pin_set(p_space uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select wf_is_member(p_space) and exists (
    select 1 from wf_family_secrets s where s.space_id = p_space and coalesce(s.pin_hash, '') <> ''
  )
$$;
grant execute on function public.wf_family_pin_set(uuid) to authenticated;

create or replace function public.wf_family_set_pin(p_space uuid, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not wf_is_parent(p_space) then raise exception 'Only a parent can set the PIN' using errcode = '42501'; end if;
  if p_pin !~ '^\d{4,8}$' then raise exception 'A PIN is four to eight digits'; end if;
  insert into wf_family_secrets (space_id, pin_hash, updated_at)
  values (p_space, extensions.crypt(p_pin, extensions.gen_salt('bf')), now())
  on conflict (space_id) do update set pin_hash = excluded.pin_hash, updated_at = now();
end $$;
grant execute on function public.wf_family_set_pin(uuid, text) to authenticated;

-- Exiting child mode: a child may ASK whether a PIN is right and never see it.
create or replace function public.wf_family_check_pin(p_space uuid, p_pin text) returns boolean
language plpgsql stable security definer set search_path = public, extensions as $$
declare v_hash text;
begin
  if not wf_is_member(p_space) then return false; end if;
  select pin_hash into v_hash from wf_family_secrets where space_id = p_space;
  if v_hash is null or v_hash = '' then return false; end if;
  return v_hash = extensions.crypt(p_pin, v_hash);
end $$;
grant execute on function public.wf_family_check_pin(uuid, text) to authenticated;

-- Leaving child mode. The meta table is parent-write, so this definer
-- function checks the PIN and then clears the CALLER's own flag and nothing
-- else — a child can let themselves out with a parent standing there, and can
-- never touch a sibling's device.
create or replace function public.wf_family_exit_child_mode(p_space uuid, p_pin text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me   uuid;
  v_hash text;
begin
  v_me := wf_my_member(p_space);
  if v_me is null then return false; end if;
  select pin_hash into v_hash from wf_family_secrets where space_id = p_space;
  if v_hash is null or v_hash = '' or v_hash <> extensions.crypt(p_pin, v_hash) then return false; end if;

  insert into wf_family_member_meta (member_id, organization_id, space_id, child_mode)
  select v_me, m.organization_id, p_space, false from wf_members m where m.id = v_me
  on conflict (member_id) do update set child_mode = false, updated_at = now();

  insert into wf_family_audit (organization_id, space_id, actor_member_id, action, target_type, target_id, summary, before_text, after_text)
  select m.organization_id, p_space, v_me, 'childmode', 'member', v_me::text,
         'Child mode unlocked with the parent PIN by ' || m.name, 'on', 'off'
  from wf_members m where m.id = v_me;
  return true;
end $$;
grant execute on function public.wf_family_exit_child_mode(uuid, text) to authenticated;

-- The AI meter: one atomic bump, rolling itself over on the first call of a
-- new month, so the cap is monthly without a scheduled job.
create or replace function public.wf_family_note_ai(p_space uuid, p_month text, p_kind text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not wf_is_member(p_space) then raise exception 'Not your family' using errcode = '42501'; end if;
  insert into wf_family_settings (space_id, organization_id, ai_month)
  select p_space, s.organization_id, p_month from wf_spaces s where s.id = p_space
  on conflict (space_id) do nothing;

  update wf_family_settings
     set ai_month  = p_month,
         ai_calls  = case when ai_month = p_month then ai_calls else 0 end + case when p_kind in ('call','image') then 1 else 0 end,
         ai_images = case when ai_month = p_month then ai_images else 0 end + case when p_kind = 'image' then 1 else 0 end,
         ai_reels  = case when ai_month = p_month then ai_reels else 0 end + case when p_kind = 'reel' then 1 else 0 end
   where space_id = p_space;
end $$;
grant execute on function public.wf_family_note_ai(uuid, text, text) to authenticated;

-- Delete the family. Every wf_ table cascades from wf_spaces, so one delete
-- is the whole space; the client sweeps the storage bucket first. Callable
-- only by a parent, and the UI only calls it after re-authentication.
create or replace function public.wf_family_delete_space(p_space uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not wf_is_parent(p_space) then raise exception 'Only a parent can delete the family' using errcode = '42501'; end if;
  delete from wf_family_shares where space_id = p_space;
  delete from wf_spaces where id = p_space;
end $$;
grant execute on function public.wf_family_delete_space(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Catalogue — the values a new family is offered, and the plans
-- ---------------------------------------------------------------------------
-- Pre-loaded content, public-read, keyed by organisation like every other
-- wf_catalog_* table. A brand-new space starts from these words rather than an
-- empty box (the brief: "value before configuration").

create table if not exists public.wf_catalog_values (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug            text not null,
  name            text not null,
  meaning         text not null default '',
  position        integer not null default 0
);
create unique index if not exists uq_wf_catalog_values on public.wf_catalog_values(organization_id, slug);

create table if not exists public.wf_catalog_plans (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug            text not null check (slug in ('seed','household','legacy')),
  name            text not null,
  price_cents     integer not null default 0,
  ai_calls        integer not null default 60,
  images          integer not null default 0,
  media_gb        integer not null default 1,
  reels           integer not null default 1,
  members         integer not null default 6,
  blurb           text not null default '',
  position        integer not null default 0
);
create unique index if not exists uq_wf_catalog_plans on public.wf_catalog_plans(organization_id, slug);

do $$
declare t text;
begin
  foreach t in array array['wf_catalog_values','wf_catalog_plans'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_read', t);
  end loop;
end $$;

create or replace function public.wf_seed_family(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into wf_catalog_values (organization_id, slug, name, meaning, position) values
    (p_org, 'faith',       'Faith',       'God first, out loud, on ordinary Tuesdays and not only on Sundays.', 0),
    (p_org, 'love',        'Love',        'We are for each other. We say the kind thing before we say the clever one.', 1),
    (p_org, 'diligence',   'Diligence',   'Finish what you start, and do it well enough to sign your name to it.', 2),
    (p_org, 'generosity',  'Generosity',  'Our table has one more chair than we need, and our giving is planned, not left over.', 3),
    (p_org, 'joy',         'Joy',         'Music in the kitchen. We laugh in this house.', 4),
    (p_org, 'hospitality', 'Hospitality', 'The door opens before the house is tidy.', 5),
    (p_org, 'courage',     'Courage',     'We do the hard, right thing while it is still small.', 6),
    (p_org, 'honesty',     'Honesty',     'We tell the truth kindly, and early.', 7),
    (p_org, 'rest',        'Rest',        'One day a week we stop, on purpose, together.', 8),
    (p_org, 'learning',    'Learning',    'Curiosity out loud: questions are welcome at this table.', 9)
  on conflict (organization_id, slug) do update
    set name = excluded.name, meaning = excluded.meaning, position = excluded.position;

  insert into wf_catalog_plans (organization_id, slug, name, price_cents, ai_calls, images, media_gb, reels, members, blurb, position) values
    (p_org, 'seed',      'Seed',      0,    60,   0,   1,   1,  6,  'The whole loop, free: briefing, check-in, Sunday planning. The companion writes from a template when the allowance is spent, and pictures are typographic.', 0),
    (p_org, 'household', 'Household', 900,  600,  40,  25,  8,  12, 'For a family running on Wàfè: a companion that answers all month, generated pictures in the studio, room for the photos.', 1),
    (p_org, 'legacy',    'Legacy',    1900, 2500, 200, 100, 30, 25, 'Grandparents, mentors and a decade of memories: the largest allowance, the archive, and every guest you want to bring in.', 2)
  on conflict (organization_id, slug) do update
    set name = excluded.name, price_cents = excluded.price_cents, ai_calls = excluded.ai_calls, images = excluded.images,
        media_gb = excluded.media_gb, reels = excluded.reels, members = excluded.members, blurb = excluded.blurb, position = excluded.position;
end $$;
grant execute on function public.wf_seed_family(uuid) to authenticated;


-- ===========================================================================
-- MODULE 4/19 — people (businesses/wafe/sql/people.sql)
-- ===========================================================================
-- Wàfè — module: people (relatives, friends, communities, mentors)
--
-- The relational world of a family, and the sharpest privacy problem in the
-- product: a nine-year-old may know that Aunty Bisi's birthday is on the 30th
-- and must never be able to read her address, her phone number or what her
-- mother wrote about her marriage.
--
-- COLUMN-LEVEL PRIVACY, ENFORCED IN POSTGRES
--
--   wf_people           parents (and a guest's own row) only — children are
--                       excluded from the base table outright.
--   wf_people_child     a redacting view: id, name, relationship, kind, photo,
--                       birthday, tags. No phone, no address, no notes, no
--                       prayer needs, no gift ideas, no contact history. This
--                       is the ONLY people relation a child's session reads,
--                       so "children never see contact details" is a fact
--                       about the database, not about the client.
--   wf_mentor_sessions  parents, and the members on the session (a mentor
--                       guest sees their own sessions and nothing else).
--   wf_mentor_sessions_v the same rows with `notes` blanked unless
--                       wf_can_see() says this member may read them — which
--                       is how a session note that defaults to Private stays
--                       private from the other parent and from the mentor.
--
-- Money lives in wf_community_giving and is parent-only, full stop.
--
-- Idempotent throughout: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_people (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  space_id          uuid not null references public.wf_spaces(id) on delete cascade,
  name              text not null,
  relationship      text not null default '',
  kind              text not null default 'other' check (kind in ('relative','friend','neighbour','other')),
  photo_url         text,
  birthday          date,
  anniversary       date,
  address           text not null default '',
  phone             text not null default '',
  email             text not null default '',
  notes             text not null default '',
  prayer_needs      text not null default '',
  gift_ideas        jsonb not null default '[]'::jsonb,
  cadence           text not null default 'none' check (cadence in ('weekly','monthly','quarterly','none')),
  last_contacted_at timestamptz,
  linked_member_id  uuid references public.wf_members(id) on delete set null,
  tags              text[] not null default '{}',
  visibility        text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with       uuid[] not null default '{}',
  owner_member_id   uuid references public.wf_members(id) on delete set null,
  -- Set when the contact was converted into a scoped guest invitation.
  invite_code       text,
  shared_objects    text[] not null default '{}',
  created_at        timestamptz not null default now()
);
create index if not exists idx_wf_people_space on public.wf_people(space_id);
create index if not exists idx_wf_people_birthday on public.wf_people(space_id, birthday) where birthday is not null;

create table if not exists public.wf_contact_log (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  person_id       uuid not null references public.wf_people(id) on delete cascade,
  at              timestamptz not null default now(),
  channel         text not null default 'other' check (channel in ('call','visit','message','video','other')),
  note            text not null default '',
  by_member_id    uuid references public.wf_members(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_contact_log_person on public.wf_contact_log(person_id, at desc);

create table if not exists public.wf_communities (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null references public.organizations(id) on delete cascade,
  space_id                uuid not null references public.wf_spaces(id) on delete cascade,
  name                    text not null,
  type                    text not null default 'other' check (type in ('church','coop','club','school','other')),
  meeting_rhythm          text not null default '',
  meets_where             text not null default '',
  link                    text not null default '',
  photo_url               text,
  roles_held              text[] not null default '{}',
  contacts                jsonb not null default '[]'::jsonb,
  giving_commitment_cents integer not null default 0,
  giving_frequency        text not null default 'none' check (giving_frequency in ('weekly','monthly','quarterly','yearly','none')),
  member_ids              uuid[] not null default '{}',
  linked_event_ids        uuid[] not null default '{}',
  shared_with_guests      boolean not null default false,
  notes                   text not null default '',
  created_at              timestamptz not null default now()
);
create index if not exists idx_wf_communities_space on public.wf_communities(space_id);

-- A commitment is only giving once it is paid; this is the row the Giving
-- record folds in. Parents only, like every money table in Wàfè.
create table if not exists public.wf_community_giving (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  community_id    uuid not null references public.wf_communities(id) on delete cascade,
  community_name  text not null default '',
  amount_cents    integer not null check (amount_cents > 0),
  paid_at         timestamptz not null default now(),
  note            text not null default '',
  by_member_id    uuid references public.wf_members(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_community_giving_space on public.wf_community_giving(space_id, paid_at desc);

create table if not exists public.wf_mentors (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  space_id           uuid not null references public.wf_spaces(id) on delete cascade,
  person_id          uuid not null references public.wf_people(id) on delete cascade,
  -- Set when the mentor also holds a guest seat in the family.
  member_id          uuid references public.wf_members(id) on delete set null,
  area               text not null default 'other' check (area in ('faith','career','marriage','music','other')),
  title              text not null default '',
  mentee_member_ids  uuid[] not null default '{}',
  next_session_at    timestamptz,
  created_at         timestamptz not null default now()
);
create unique index if not exists uq_wf_mentors_person on public.wf_mentors(space_id, person_id);

create table if not exists public.wf_mentor_sessions (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  space_id              uuid not null references public.wf_spaces(id) on delete cascade,
  mentor_id             uuid not null references public.wf_mentors(id) on delete cascade,
  date                  timestamptz not null default now(),
  participants          uuid[] not null default '{}',
  agenda                text not null default '',
  notes                 text not null default '',
  -- The brief: notes default to Private for the parent who wrote them.
  notes_visibility      text not null default 'private' check (notes_visibility in ('private','shared','family','child')),
  notes_shared_with     uuid[] not null default '{}',
  owner_member_id       uuid references public.wf_members(id) on delete set null,
  questions_before_next text[] not null default '{}',
  next_session_at       timestamptz,
  created_at            timestamptz not null default now()
);
create index if not exists idx_wf_mentor_sessions_mentor on public.wf_mentor_sessions(mentor_id, date desc);

-- The rows Tasks adopts: everything a task needs, plus the session it came
-- from, so a task can link back to the conversation that produced it.
create table if not exists public.wf_follow_ups (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  session_id      uuid not null references public.wf_mentor_sessions(id) on delete cascade,
  mentor_id       uuid not null references public.wf_mentors(id) on delete cascade,
  title           text not null,
  member_id       uuid references public.wf_members(id) on delete set null,
  due_at          timestamptz not null default now(),
  done            boolean not null default false,
  -- Set by the tasks module once it has adopted this follow-up as a task row.
  task_id         uuid,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_follow_ups_session on public.wf_follow_ups(session_id);
create index if not exists idx_wf_follow_ups_space on public.wf_follow_ups(space_id, done, due_at);

-- A gift idea handed to the purchase pipeline: Finance reads these as wishes
-- with `for_person_name` as the recipient.
create table if not exists public.wf_gift_requests (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  person_id       uuid not null references public.wf_people(id) on delete cascade,
  gift_idea_id    text not null,
  title           text not null,
  for_person_name text not null default '',
  occasion        text not null default '',
  est_cents       integer not null default 0,
  status          text not null default 'pending' check (status in ('pending','approved','bought','declined')),
  note            text not null default '',
  requested_by    uuid references public.wf_members(id) on delete set null,
  requested_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_gift_requests_space on public.wf_gift_requests(space_id, status);

-- Pre-loaded content: message templates so a family is never handed a blank
-- box at 08:00 on somebody's birthday, whether or not the companion answers.
create table if not exists public.wf_catalog_message_templates (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug            text not null,
  occasion        text not null,
  tone            text not null default 'warm',
  body            text not null,
  created_at      timestamptz not null default now()
);
create unique index if not exists uq_wf_catalog_message_templates on public.wf_catalog_message_templates(organization_id, slug);

-- ---------------------------------------------------------------------------
-- 2. Row-level security
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['wf_people','wf_contact_log','wf_communities','wf_community_giving',
                           'wf_mentors','wf_mentor_sessions','wf_follow_ups','wf_gift_requests',
                           'wf_catalog_message_templates'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- People. A child's session gets NOTHING from this table; they read the view
-- below. A guest gets their own row (the record the family keeps about them)
-- and nothing else.
drop policy if exists wf_people_read on public.wf_people;
create policy wf_people_read on public.wf_people for select to authenticated using (
  (wf_is_parent(space_id) and wf_can_see(space_id, owner_member_id, visibility, shared_with))
  or (linked_member_id is not null and linked_member_id = wf_my_member(space_id))
);
drop policy if exists wf_people_write on public.wf_people;
create policy wf_people_write on public.wf_people for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_people_edit on public.wf_people;
create policy wf_people_edit on public.wf_people for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_people_del on public.wf_people;
create policy wf_people_del on public.wf_people for delete to authenticated using (wf_is_parent(space_id));

-- Contact history, gift ideas in the base table, prayer needs: parents only,
-- so the log follows the table it belongs to.
drop policy if exists wf_contact_log_parent on public.wf_contact_log;
create policy wf_contact_log_parent on public.wf_contact_log for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- Communities: the family sees them (children included — they go to them);
-- guests see the ones the family marked shared. Parents manage.
drop policy if exists wf_communities_read on public.wf_communities;
create policy wf_communities_read on public.wf_communities for select to authenticated using (
  wf_is_member(space_id) and (wf_my_role(space_id) <> 'guest' or shared_with_guests)
);
drop policy if exists wf_communities_write on public.wf_communities;
create policy wf_communities_write on public.wf_communities for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_communities_edit on public.wf_communities;
create policy wf_communities_edit on public.wf_communities for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_communities_del on public.wf_communities;
create policy wf_communities_del on public.wf_communities for delete to authenticated using (wf_is_parent(space_id));

-- Money: parents, full stop.
drop policy if exists wf_community_giving_parent on public.wf_community_giving;
create policy wf_community_giving_parent on public.wf_community_giving for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- Mentors: parents see all; a child sees the mentors who mentor THEM; a
-- mentor guest sees their own record.
drop policy if exists wf_mentors_read on public.wf_mentors;
create policy wf_mentors_read on public.wf_mentors for select to authenticated using (
  wf_is_parent(space_id)
  or wf_my_member(space_id) = any (mentee_member_ids)
  or (member_id is not null and member_id = wf_my_member(space_id))
);
drop policy if exists wf_mentors_write on public.wf_mentors;
create policy wf_mentors_write on public.wf_mentors for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_mentors_edit on public.wf_mentors;
create policy wf_mentors_edit on public.wf_mentors for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_mentors_del on public.wf_mentors;
create policy wf_mentors_del on public.wf_mentors for delete to authenticated using (wf_is_parent(space_id));

-- Sessions: parents; the members in the room; the mentor whose sessions they
-- are. Note this is ROW access — the notes column is decided separately by
-- the view below.
drop policy if exists wf_mentor_sessions_read on public.wf_mentor_sessions;
create policy wf_mentor_sessions_read on public.wf_mentor_sessions for select to authenticated using (
  wf_is_parent(space_id)
  or wf_my_member(space_id) = any (participants)
  or exists (select 1 from public.wf_mentors m where m.id = mentor_id and m.member_id = wf_my_member(space_id))
);
drop policy if exists wf_mentor_sessions_write on public.wf_mentor_sessions;
create policy wf_mentor_sessions_write on public.wf_mentor_sessions for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_mentor_sessions_edit on public.wf_mentor_sessions;
create policy wf_mentor_sessions_edit on public.wf_mentor_sessions for update to authenticated
  using (wf_is_parent(space_id) and (notes_visibility <> 'private' or owner_member_id is null or owner_member_id = wf_my_member(space_id)))
  with check (wf_is_parent(space_id));
drop policy if exists wf_mentor_sessions_del on public.wf_mentor_sessions;
create policy wf_mentor_sessions_del on public.wf_mentor_sessions for delete to authenticated
  using (wf_is_parent(space_id) and (owner_member_id is null or owner_member_id = wf_my_member(space_id)));

-- Follow-ups: parents, the person they are for, and whoever can see the session.
drop policy if exists wf_follow_ups_read on public.wf_follow_ups;
create policy wf_follow_ups_read on public.wf_follow_ups for select to authenticated using (
  wf_is_parent(space_id)
  or member_id = wf_my_member(space_id)
  or exists (select 1 from public.wf_mentors m where m.id = mentor_id and m.member_id = wf_my_member(space_id))
);
drop policy if exists wf_follow_ups_write on public.wf_follow_ups;
create policy wf_follow_ups_write on public.wf_follow_ups for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_follow_ups_edit on public.wf_follow_ups;
create policy wf_follow_ups_edit on public.wf_follow_ups for update to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_follow_ups_del on public.wf_follow_ups;
create policy wf_follow_ups_del on public.wf_follow_ups for delete to authenticated using (wf_is_parent(space_id));

-- Gift requests are purchases in waiting: parents only.
drop policy if exists wf_gift_requests_parent on public.wf_gift_requests;
create policy wf_gift_requests_parent on public.wf_gift_requests for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- Catalogue: readable by anyone signed in, written by the seed function only.
drop policy if exists wf_catalog_message_templates_read on public.wf_catalog_message_templates;
create policy wf_catalog_message_templates_read on public.wf_catalog_message_templates for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 3. The two redacting views
-- ---------------------------------------------------------------------------

-- What a CHILD may hold about a relative or a friend: a name, a face and a
-- birthday. Deliberately a definer view (no security_invoker) because the
-- base table's policy excludes children entirely — the guard is the WHERE
-- clause here, and it is the whole of it. Anything added to this select list
-- is added to what a nine-year-old can read, so add nothing lightly.
drop view if exists public.wf_people_child;
create view public.wf_people_child with (security_barrier = true) as
select p.id,
       p.space_id,
       p.name,
       p.relationship,
       p.kind,
       p.photo_url,
       p.birthday,
       p.tags,
       p.linked_member_id,
       p.created_at
from public.wf_people p
where wf_is_member(p.space_id)
  and wf_my_role(p.space_id) = 'child'
  and p.visibility in ('family','child')
  and (
    p.kind in ('relative','friend')
    -- …and the child's own mentors, so their mentor page can name them.
    or exists (select 1 from public.wf_mentors m
               where m.person_id = p.id and wf_my_member(p.space_id) = any (m.mentee_member_ids))
  );
grant select on public.wf_people_child to authenticated;

-- Sessions with the notes column decided per reader. security_invoker so the
-- row policy above still applies; the CASE is the column-level rule, which is
-- what makes "notes default to Private for the parent who wrote them" true of
-- the other parent and of the mentor as well as of the client.
drop view if exists public.wf_mentor_sessions_v;
create view public.wf_mentor_sessions_v with (security_invoker = true, security_barrier = true) as
select s.id,
       s.space_id,
       s.mentor_id,
       s.date,
       s.participants,
       s.agenda,
       case when wf_can_see(s.space_id, s.owner_member_id, s.notes_visibility, s.notes_shared_with)
            then s.notes else '' end as notes,
       not wf_can_see(s.space_id, s.owner_member_id, s.notes_visibility, s.notes_shared_with) as notes_withheld,
       s.notes_visibility,
       s.notes_shared_with,
       s.owner_member_id,
       s.questions_before_next,
       s.next_session_at,
       s.created_at
from public.wf_mentor_sessions s;
grant select on public.wf_mentor_sessions_v to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Provisioning — the message-template catalogue
-- ---------------------------------------------------------------------------
create or replace function public.wf_seed_people(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into wf_catalog_message_templates (organization_id, slug, occasion, tone, body) values
    (p_org, 'birthday-warm', 'birthday', 'warm',
     'Happy birthday, {{name}}! We thank God for you today — for who you are and for everything you have been to this family. Have a beautiful day, and know you are prayed for.'),
    (p_org, 'birthday-short', 'birthday', 'short',
     'Happy birthday {{name}}! Thinking of you today and praying it is a lovely one. With love from all of us.'),
    (p_org, 'birthday-child', 'birthday', 'child',
     'Happy birthday {{name}}!! I hope you get cake. Love from {{me}} xx'),
    (p_org, 'anniversary-warm', 'anniversary', 'warm',
     'Happy anniversary, {{name}}! {{years}} years — what a gift to watch you keep choosing each other. Praying for many more, and thanking God for you both.'),
    (p_org, 'condolence', 'condolence', 'gentle',
     'We were so sorry to hear about {{subject}}. There are no right words. We are praying for you, and we are here — for a meal, a lift, or just to sit with you.'),
    (p_org, 'thinking-of-you', 'checkin', 'warm',
     'Hello {{name}} — you have been on our minds this week. No news needed, we just wanted you to know we are thinking of you and praying for you.'),
    (p_org, 'thank-you', 'thanks', 'warm',
     'Thank you, {{name}}. Truly. What you did did not go unnoticed and it made a real difference to us.')
  on conflict (organization_id, slug) do update
    set occasion = excluded.occasion, tone = excluded.tone, body = excluded.body;
end $$;
grant execute on function public.wf_seed_people(uuid) to authenticated;


-- ===========================================================================
-- MODULE 5/19 — learning (businesses/wafe/sql/learning.sql)
-- ===========================================================================
-- Wàfè — learning: the Learning Hub (saved YouTube lessons, playlists, notes,
-- summaries, plans, completions and the action items a summary produces).
--
-- Idempotent. Depends only on 00-foundation (wf_spaces, wf_members and the
-- helpers wf_is_member / wf_is_parent / wf_my_member / wf_can_see); it never
-- references another module's tables.
--
-- THE PRIVACY MODEL, in one paragraph: a playlist carries a visibility and a
-- child_safe flag, and both matter. `wf_can_see` decides the adult question
-- (private → the owner, shared → shared_with, family → parents and guests);
-- child_safe is the extra gate a child's session must also pass, which is why
-- the read policies below name wf_is_child explicitly. A video reaches a child
-- only through a playlist they can see, so Tunde's private cycling course is
-- not merely hidden in the UI — it is unreadable.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_learning_videos (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  space_id           uuid not null references public.wf_spaces(id) on delete cascade,
  youtube_id         text not null,
  url                text not null default '',
  title              text not null,
  channel            text not null default '',
  thumbnail_url      text not null default '',
  duration_s         integer not null default 0 check (duration_s >= 0),
  description        text not null default '',
  captions_available boolean not null default false,
  child_safe         boolean not null default false,
  value_id           text,
  transcript         text not null default '',
  transcript_source  text check (transcript_source in ('captions','ai_from_description')),
  added_by           uuid references public.wf_members(id) on delete set null,
  created_at         timestamptz not null default now()
);
create unique index if not exists uq_wf_learning_videos on public.wf_learning_videos(space_id, youtube_id);
create index if not exists idx_wf_learning_videos_space on public.wf_learning_videos(space_id);

-- One summary per video. `source` is what the screen labels it with, and the
-- app never shows a summary without it.
create table if not exists public.wf_learning_summaries (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  space_id           uuid not null references public.wf_spaces(id) on delete cascade,
  video_id           uuid not null unique references public.wf_learning_videos(id) on delete cascade,
  source             text not null default 'ai_from_description' check (source in ('captions','ai_from_description')),
  summary            text not null default '',
  takeaways          text[] not null default '{}',
  action_items       text[] not null default '{}',
  discussion_prompts text[] not null default '{}',
  for_kids           text,
  suggested_band     text not null default 'junior' check (suggested_band in ('little','junior','teen','young-adult','adult')),
  model              text,
  cost_cents         integer not null default 0,
  created_at         timestamptz not null default now()
);

create table if not exists public.wf_learning_playlists (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  name            text not null,
  note            text not null default '',
  owner_member_id uuid references public.wf_members(id) on delete set null,
  visibility      text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with     uuid[] not null default '{}',
  child_safe      boolean not null default false,
  cover_url       text,
  value_id        text,
  assigned_to     uuid[] not null default '{}',
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_learning_playlists_space on public.wf_learning_playlists(space_id);

create table if not exists public.wf_learning_playlist_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  playlist_id     uuid not null references public.wf_learning_playlists(id) on delete cascade,
  video_id        uuid not null references public.wf_learning_videos(id) on delete cascade,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  unique (playlist_id, video_id)
);
create index if not exists idx_wf_learning_items_playlist on public.wf_learning_playlist_items(playlist_id, sort_order);

create table if not exists public.wf_learning_notes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  video_id        uuid not null references public.wf_learning_videos(id) on delete cascade,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  timestamp_s     integer not null default 0 check (timestamp_s >= 0),
  text            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_learning_notes_video on public.wf_learning_notes(video_id, timestamp_s);

create table if not exists public.wf_learning_plans (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  space_id            uuid not null references public.wf_spaces(id) on delete cascade,
  name                text not null,
  objective           text not null default '',
  cadence             text not null default 'weekly' check (cadence in ('daily','twice-weekly','weekly')),
  assignee_member_ids uuid[] not null default '{}',
  -- Goals live in another module; we keep the id and join in the app.
  goal_id             uuid,
  value_id            text,
  start_date          date not null default current_date,
  end_date            date,
  playlist_id         uuid references public.wf_learning_playlists(id) on delete set null,
  owner_member_id     uuid references public.wf_members(id) on delete set null,
  visibility          text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with         uuid[] not null default '{}',
  created_at          timestamptz not null default now()
);
create index if not exists idx_wf_learning_plans_space on public.wf_learning_plans(space_id);

create table if not exists public.wf_learning_plan_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  plan_id         uuid not null references public.wf_learning_plans(id) on delete cascade,
  item_type       text not null default 'video' check (item_type in ('video','activity')),
  item_id         uuid references public.wf_learning_videos(id) on delete cascade,
  title           text not null default '',
  minutes         integer not null default 10 check (minutes between 1 and 240),
  week            integer not null default 1 check (week between 1 and 52),
  sort_order      integer not null default 0,
  due_date        date,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_learning_plan_items_plan on public.wf_learning_plan_items(plan_id, week, sort_order);

-- Completion is written at 80 % watched or by a parent's hand — the app
-- enforces the rule and the check keeps the column honest either way.
create table if not exists public.wf_learning_completions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  item_type       text not null default 'video' check (item_type in ('video','plan-item')),
  item_id         uuid not null,
  progress_pct    integer not null default 0 check (progress_pct between 0 and 100),
  completed_at    timestamptz,
  marked_by       uuid references public.wf_members(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (member_id, item_type, item_id),
  constraint wf_learning_completion_rule check (completed_at is null or progress_pct >= 80 or marked_by is not null)
);
create index if not exists idx_wf_learning_completions_space on public.wf_learning_completions(space_id, member_id);

-- Action items a summary produced. They belong to learning (a module never
-- writes another module's tables); the shared dashboard is what puts them on
-- the family's "today" next to everything else.
create table if not exists public.wf_learning_tasks (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  video_id        uuid not null references public.wf_learning_videos(id) on delete cascade,
  title           text not null,
  member_id       uuid references public.wf_members(id) on delete set null,
  due_date        date not null default current_date,
  done_at         timestamptz,
  created_by      uuid references public.wf_members(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_learning_tasks_space on public.wf_learning_tasks(space_id, due_date);

-- Pre-loaded starter lessons every new family gets, keyed by tenant.
create table if not exists public.wf_catalog_lessons (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug            text not null,
  collection      text not null default 'Starter lessons',
  youtube_id      text not null,
  title           text not null,
  channel         text not null default '',
  duration_s      integer not null default 0,
  description     text not null default '',
  child_safe      boolean not null default true,
  value_id        text,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  unique (organization_id, slug)
);

-- ---------------------------------------------------------------------------
-- 2. Row-level security
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'wf_learning_videos','wf_learning_summaries','wf_learning_playlists','wf_learning_playlist_items',
    'wf_learning_notes','wf_learning_plans','wf_learning_plan_items','wf_learning_completions',
    'wf_learning_tasks','wf_catalog_lessons'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Is this video reachable by the session? Parents: always. Children: only a
-- child-safe video that sits in a playlist they can see (or one they saved).
create or replace function public.wf_learning_can_see_video(p_video uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v record;
begin
  select v2.space_id, v2.child_safe, v2.added_by into v
  from wf_learning_videos v2 where v2.id = p_video;
  if v.space_id is null or not wf_is_member(v.space_id) then return false; end if;
  if wf_is_parent(v.space_id) then return true; end if;
  if v.added_by is not null and v.added_by = wf_my_member(v.space_id) then return true; end if;
  if not v.child_safe then return false; end if;
  return exists (
    select 1 from wf_learning_playlist_items i
    join wf_learning_playlists p on p.id = i.playlist_id
    where i.video_id = p_video
      and p.child_safe
      and (
        wf_can_see(p.space_id, p.owner_member_id, p.visibility, p.shared_with)
        or wf_my_member(p.space_id) = any (p.assigned_to)
      )
  );
end $$;
grant execute on function public.wf_learning_can_see_video(uuid) to authenticated;

-- Videos
drop policy if exists wf_learning_videos_read on public.wf_learning_videos;
create policy wf_learning_videos_read on public.wf_learning_videos for select to authenticated
  using (wf_is_parent(space_id) or added_by = wf_my_member(space_id) or (child_safe and wf_learning_can_see_video(id)));
-- Importing means reaching YouTube: parents only, in the API as in the UI.
drop policy if exists wf_learning_videos_write on public.wf_learning_videos;
create policy wf_learning_videos_write on public.wf_learning_videos for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_learning_videos_edit on public.wf_learning_videos;
create policy wf_learning_videos_edit on public.wf_learning_videos for update to authenticated
  using (wf_is_parent(space_id) or added_by = wf_my_member(space_id)) with check (wf_is_parent(space_id) or added_by = wf_my_member(space_id));
drop policy if exists wf_learning_videos_del on public.wf_learning_videos;
create policy wf_learning_videos_del on public.wf_learning_videos for delete to authenticated
  using (wf_is_parent(space_id) or added_by = wf_my_member(space_id));

-- Summaries follow their video.
drop policy if exists wf_learning_summaries_read on public.wf_learning_summaries;
create policy wf_learning_summaries_read on public.wf_learning_summaries for select to authenticated using (wf_learning_can_see_video(video_id));
drop policy if exists wf_learning_summaries_write on public.wf_learning_summaries;
create policy wf_learning_summaries_write on public.wf_learning_summaries for insert to authenticated with check (wf_is_member(space_id) and wf_learning_can_see_video(video_id));
drop policy if exists wf_learning_summaries_edit on public.wf_learning_summaries;
create policy wf_learning_summaries_edit on public.wf_learning_summaries for update to authenticated using (wf_is_member(space_id)) with check (wf_is_member(space_id));
drop policy if exists wf_learning_summaries_del on public.wf_learning_summaries;
create policy wf_learning_summaries_del on public.wf_learning_summaries for delete to authenticated using (wf_is_parent(space_id));

-- Playlists: the adult rule plus the child-safe gate.
drop policy if exists wf_learning_playlists_read on public.wf_learning_playlists;
create policy wf_learning_playlists_read on public.wf_learning_playlists for select to authenticated
  using (
    (wf_can_see(space_id, owner_member_id, visibility, shared_with) or wf_my_member(space_id) = any (assigned_to))
    and (child_safe or not wf_is_child(space_id) or owner_member_id = wf_my_member(space_id))
  );
drop policy if exists wf_learning_playlists_write on public.wf_learning_playlists;
create policy wf_learning_playlists_write on public.wf_learning_playlists for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_learning_playlists_edit on public.wf_learning_playlists;
create policy wf_learning_playlists_edit on public.wf_learning_playlists for update to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id)) with check (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));
drop policy if exists wf_learning_playlists_del on public.wf_learning_playlists;
create policy wf_learning_playlists_del on public.wf_learning_playlists for delete to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));

-- Playlist items are readable when the playlist is.
drop policy if exists wf_learning_items_read on public.wf_learning_playlist_items;
create policy wf_learning_items_read on public.wf_learning_playlist_items for select to authenticated
  using (exists (select 1 from wf_learning_playlists p where p.id = playlist_id));
drop policy if exists wf_learning_items_write on public.wf_learning_playlist_items;
create policy wf_learning_items_write on public.wf_learning_playlist_items for insert to authenticated
  with check (exists (select 1 from wf_learning_playlists p where p.id = playlist_id and (wf_is_parent(p.space_id) or p.owner_member_id = wf_my_member(p.space_id))));
drop policy if exists wf_learning_items_del on public.wf_learning_playlist_items;
create policy wf_learning_items_del on public.wf_learning_playlist_items for delete to authenticated
  using (exists (select 1 from wf_learning_playlists p where p.id = playlist_id and (wf_is_parent(p.space_id) or p.owner_member_id = wf_my_member(p.space_id))));

-- Notes are personal: yours, or (for a parent) the family's.
drop policy if exists wf_learning_notes_read on public.wf_learning_notes;
create policy wf_learning_notes_read on public.wf_learning_notes for select to authenticated
  using (member_id = wf_my_member(space_id) or wf_is_parent(space_id));
drop policy if exists wf_learning_notes_write on public.wf_learning_notes;
create policy wf_learning_notes_write on public.wf_learning_notes for insert to authenticated
  with check (wf_is_member(space_id) and member_id = wf_my_member(space_id) and wf_learning_can_see_video(video_id));
drop policy if exists wf_learning_notes_edit on public.wf_learning_notes;
create policy wf_learning_notes_edit on public.wf_learning_notes for update to authenticated
  using (member_id = wf_my_member(space_id)) with check (member_id = wf_my_member(space_id));
drop policy if exists wf_learning_notes_del on public.wf_learning_notes;
create policy wf_learning_notes_del on public.wf_learning_notes for delete to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));

-- Plans: parents own them; an assignee reads their own.
drop policy if exists wf_learning_plans_read on public.wf_learning_plans;
create policy wf_learning_plans_read on public.wf_learning_plans for select to authenticated
  using (wf_can_see(space_id, owner_member_id, visibility, shared_with) or wf_my_member(space_id) = any (assignee_member_ids));
drop policy if exists wf_learning_plans_write on public.wf_learning_plans;
create policy wf_learning_plans_write on public.wf_learning_plans for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_learning_plans_edit on public.wf_learning_plans;
create policy wf_learning_plans_edit on public.wf_learning_plans for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_learning_plans_del on public.wf_learning_plans;
create policy wf_learning_plans_del on public.wf_learning_plans for delete to authenticated using (wf_is_parent(space_id));

drop policy if exists wf_learning_plan_items_read on public.wf_learning_plan_items;
create policy wf_learning_plan_items_read on public.wf_learning_plan_items for select to authenticated
  using (exists (select 1 from wf_learning_plans p where p.id = plan_id));
drop policy if exists wf_learning_plan_items_write on public.wf_learning_plan_items;
create policy wf_learning_plan_items_write on public.wf_learning_plan_items for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_learning_plan_items_edit on public.wf_learning_plan_items;
create policy wf_learning_plan_items_edit on public.wf_learning_plan_items for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_learning_plan_items_del on public.wf_learning_plan_items;
create policy wf_learning_plan_items_del on public.wf_learning_plan_items for delete to authenticated using (wf_is_parent(space_id));

-- Completions: parents see the family's, everyone sees their own, and nobody
-- writes someone else's progress except a parent marking it.
drop policy if exists wf_learning_completions_read on public.wf_learning_completions;
create policy wf_learning_completions_read on public.wf_learning_completions for select to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_learning_completions_write on public.wf_learning_completions;
create policy wf_learning_completions_write on public.wf_learning_completions for insert to authenticated
  with check (wf_is_member(space_id) and (member_id = wf_my_member(space_id) or wf_is_parent(space_id)));
drop policy if exists wf_learning_completions_edit on public.wf_learning_completions;
create policy wf_learning_completions_edit on public.wf_learning_completions for update to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id)) with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_learning_completions_del on public.wf_learning_completions;
create policy wf_learning_completions_del on public.wf_learning_completions for delete to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));

-- Action items
drop policy if exists wf_learning_tasks_read on public.wf_learning_tasks;
create policy wf_learning_tasks_read on public.wf_learning_tasks for select to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_learning_tasks_write on public.wf_learning_tasks;
create policy wf_learning_tasks_write on public.wf_learning_tasks for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_learning_tasks_edit on public.wf_learning_tasks;
create policy wf_learning_tasks_edit on public.wf_learning_tasks for update to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id)) with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_learning_tasks_del on public.wf_learning_tasks;
create policy wf_learning_tasks_del on public.wf_learning_tasks for delete to authenticated using (wf_is_parent(space_id));

-- The starter catalogue is readable by anyone signed in to the tenant.
drop policy if exists wf_catalog_lessons_read on public.wf_catalog_lessons;
create policy wf_catalog_lessons_read on public.wf_catalog_lessons for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 3. Pre-loaded content for a new business
-- ---------------------------------------------------------------------------
-- Real, public, captioned lessons a family can start from on day one.
create or replace function public.wf_seed_learning(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into wf_catalog_lessons (organization_id, slug, collection, youtube_id, title, channel, duration_s, description, child_safe, value_id, sort_order)
  values
    (p_org, 'money-tricks',   'Money & Generosity', 'DOisAG9yoNk', '3 psychological tricks to help you save money | The Way We Work, a TED series', 'TED', 348, 'Three small changes that make saving automatic.', true, 'Generosity', 1),
    (p_org, 'money-giving',   'Money & Generosity', 'EG8V8UIXXQM', 'How to start spending, saving, and giving better | David Delisle | TEDxVictoria', 'TEDx Talks', 796, 'Spend, save, give — three jars and a real choice.', true, 'Generosity', 2),
    (p_org, 'money-dollar',   'Money & Generosity', 'XNu5ppFZbHo', 'What gives a dollar bill its value? - Doug Levinson', 'TED-Ed', 231, 'Why a piece of paper is worth anything at all.', true, null, 3),
    (p_org, 'money-compound', 'Money & Generosity', 'Rm6UdfRs3gw', 'Compound interest introduction | Khan Academy', 'Khan Academy', 397, 'Compound interest drawn by hand, one year at a time.', true, 'Diligence', 4),
    (p_org, 'money-generous', 'Money & Generosity', '62CliEkRCso', 'This Lie Can Keep You From Living Generously', 'BibleProject', 312, 'Generosity as abundance rather than scarcity.', true, 'Generosity', 5),
    (p_org, 'kids-water',     'Wonder & Wild',      'z5G4NCwWUxY', 'The Great Aqua Adventure: Crash Course Kids #24.1', 'Crash Course Kids', 268, 'Where a raindrop goes next.', true, null, 6),
    (p_org, 'kids-engineer',  'Wonder & Wild',      'owHF9iLyxic', 'What''s an Engineer? Crash Course Kids #12.1', 'Crash Course Kids', 270, 'What engineers actually do all day.', true, 'Diligence', 7),
    (p_org, 'kids-process',   'Wonder & Wild',      'fxJWin195kU', 'The Engineering Process: Crash Course Kids #12.2', 'Crash Course Kids', 317, 'Define, plan, build, test, improve.', true, 'Diligence', 8),
    (p_org, 'kids-volcano',   'Wonder & Wild',      '0jKoOUZ1GBM', 'Every Kind of Volcano | SciShow Kids', 'SciShow Kids', 503, 'Shield, cinder cone and composite volcanoes.', true, 'Joy', 9),
    (p_org, 'kids-sleep',     'Wonder & Wild',      '_aAmaCeq9v4', 'Why Do We Need Sleep?', 'SciShow Kids', 213, 'Bedtime, explained by someone who is not their mother.', true, null, 10)
  on conflict (organization_id, slug) do update
    set title = excluded.title,
        channel = excluded.channel,
        duration_s = excluded.duration_s,
        description = excluded.description,
        child_safe = excluded.child_safe,
        value_id = excluded.value_id,
        sort_order = excluded.sort_order;
end $$;
grant execute on function public.wf_seed_learning(uuid) to authenticated;


-- ===========================================================================
-- MODULE 6/19 — books (businesses/wafe/sql/books.sql)
-- ===========================================================================
-- Wàfè — books: the family library and the book-to-course engine.
--
-- Eight tables and one settings row. The shelf (wf_books) carries the standard
-- visibility columns, so wf_can_see() decides on its own that a child never
-- receives a parent's private reading. Everything downstream — progress,
-- plans, courses, weeks, items, attempts — is reachable only through a book
-- the caller can already see, which is exactly how the app filters it.
--
-- THE GUEST RULE. A mentor guest is given ONE course and nothing else in this
-- module: no shelf, no plans, no progress, no attempts. That is enforced here,
-- not in the client: wf_courses' read policy admits a guest only when their
-- member id is in shared_with_guest_ids, and wf_books admits the book behind
-- such a course (a course without its book is not readable). Guests are also
-- read-only throughout — there is no insert/update/delete policy that a guest
-- can satisfy anywhere in this file.
--
-- Idempotent throughout: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_books (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  title            text not null,
  author           text not null default '',
  format           text not null default 'physical' check (format in ('ebook','physical','audio')),
  cover_url        text,
  owner_member_id  uuid references public.wf_members(id) on delete set null,
  status           text not null default 'want' check (status in ('want','reading','done')),
  -- Pages, or minutes when format = 'audio'.
  pages            integer not null default 0 check (pages >= 0),
  rating           integer not null default 0 check (rating between 0 and 5),
  notes            text not null default '',
  tags             text[] not null default '{}',
  visibility       text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with      uuid[] not null default '{}',
  -- A family value ("Faith"), free text so a space can rename its own values.
  value_label      text,
  -- The goal this reading feeds. No FK: Goals is another module's table, and
  -- modules never reference each other's tables (CONTRACT.md).
  goal_id          text,
  goal_label       text,
  started_at       date,
  finished_at      date,
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_books_space on public.wf_books(space_id, status);
create index if not exists idx_wf_books_owner on public.wf_books(owner_member_id);

create table if not exists public.wf_reading_progress (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  book_id          uuid not null references public.wf_books(id) on delete cascade,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  page             integer,
  pct              integer not null default 0 check (pct between 0 and 100),
  updated_at       timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (book_id, member_id)
);
create index if not exists idx_wf_reading_progress_book on public.wf_reading_progress(book_id);

create table if not exists public.wf_reading_plans (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  space_id             uuid not null references public.wf_spaces(id) on delete cascade,
  book_id              uuid not null references public.wf_books(id) on delete cascade,
  pace_unit            text not null default 'pages' check (pace_unit in ('pages','chapters','minutes')),
  pace_amount          integer not null default 10 check (pace_amount > 0),
  days_per_week        integer not null default 7 check (days_per_week between 1 and 7),
  assignee_member_ids  uuid[] not null default '{}',
  start_date           date not null default current_date,
  end_date             date not null default current_date,
  goal_id              text,
  created_at           timestamptz not null default now()
);
create index if not exists idx_wf_reading_plans_space on public.wf_reading_plans(space_id);

create table if not exists public.wf_courses (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete cascade,
  space_id               uuid not null references public.wf_spaces(id) on delete cascade,
  book_id                uuid not null references public.wf_books(id) on delete cascade,
  title                  text not null,
  weeks                  integer not null default 4 check (weeks between 1 and 12),
  status                 text not null default 'draft' check (status in ('draft','published')),
  generated_by           uuid references public.wf_members(id) on delete set null,
  model                  text,
  cost_cents             integer not null default 0,
  shared_with_guest_ids  uuid[] not null default '{}',
  child_safe             boolean not null default false,
  audience               text not null default '',
  enrolled               uuid[] not null default '{}',
  unit_id                uuid,
  created_at             timestamptz not null default now()
);
create index if not exists idx_wf_courses_space on public.wf_courses(space_id, status);
create index if not exists idx_wf_courses_book on public.wf_courses(book_id);

create table if not exists public.wf_course_weeks (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  space_id              uuid not null references public.wf_spaces(id) on delete cascade,
  course_id             uuid not null references public.wf_courses(id) on delete cascade,
  week                  integer not null default 1 check (week between 1 and 12),
  theme                 text not null default '',
  chapters              text not null default '',
  discussion_questions  text[] not null default '{}',
  family_activity       text not null default '',
  -- [{ q, options[], answer, why }]
  quiz                  jsonb not null default '[]'::jsonb,
  created_at            timestamptz not null default now(),
  unique (course_id, week)
);
create index if not exists idx_wf_course_weeks_course on public.wf_course_weeks(course_id, week);

create table if not exists public.wf_course_items (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  course_week_id   uuid not null references public.wf_course_weeks(id) on delete cascade,
  type             text not null default 'read' check (type in ('read','discuss','activity','quiz','note')),
  title            text not null,
  item_order       integer not null default 1,
  -- Members who have ticked this off; a week is done for a member when every
  -- item on it holds their id.
  done_by          uuid[] not null default '{}',
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_course_items_week on public.wf_course_items(course_week_id, item_order);

create table if not exists public.wf_quiz_attempts (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  course_id        uuid not null references public.wf_courses(id) on delete cascade,
  course_week_id   uuid not null references public.wf_course_weeks(id) on delete cascade,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  answers          integer[] not null default '{}',
  score            integer not null default 0,
  total            integer not null default 0,
  attempted_at     timestamptz not null default now()
);
create index if not exists idx_wf_quiz_attempts_week on public.wf_quiz_attempts(course_week_id, member_id);

-- A course exported for Curricula. Modules never write each other's rows, so
-- the export is materialised here in the shape Curricula reads, and Curricula
-- picks it up from the books slice.
create table if not exists public.wf_course_units (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  course_id        uuid not null unique references public.wf_courses(id) on delete cascade,
  book_id          uuid not null references public.wf_books(id) on delete cascade,
  title            text not null,
  subject          text not null default 'Reading',
  weeks            integer not null default 4,
  member_ids       uuid[] not null default '{}',
  -- [{ id, week, title, href }] — each assignment links back to the week.
  assignments      jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now()
);

create table if not exists public.wf_book_settings (
  space_id         uuid primary key references public.wf_spaces(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  year_goal        integer not null default 12 check (year_goal >= 0),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------------

-- True when the caller is a guest who was explicitly given this course.
create or replace function public.wf_book_course_shared(p_course uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wf_courses c
    where c.id = p_course
      and c.status = 'published'
      and wf_my_member(c.space_id) = any (c.shared_with_guest_ids)
  );
$$;

-- True when the caller may read this book: the ordinary visibility rule, or
-- because a course built on it was shared with them.
create or replace function public.wf_book_readable(p_book uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wf_books b
    where b.id = p_book
      and (
        wf_can_see(b.space_id, b.owner_member_id, b.visibility, b.shared_with)
        or exists (select 1 from public.wf_courses c where c.book_id = b.id and wf_book_course_shared(c.id))
      )
  );
$$;

-- True when the caller may read this course: a member of the family whose
-- book they can see, or the guest it was shared with.
create or replace function public.wf_course_readable(p_course uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wf_courses c join public.wf_books b on b.id = c.book_id
    where c.id = p_course
      and (
        (wf_is_member(c.space_id) and wf_can_see(b.space_id, b.owner_member_id, b.visibility, b.shared_with))
        or wf_book_course_shared(c.id)
      )
  );
$$;

grant execute on function public.wf_book_course_shared(uuid) to authenticated;
grant execute on function public.wf_book_readable(uuid) to authenticated;
grant execute on function public.wf_course_readable(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Row-level security
-- ---------------------------------------------------------------------------

alter table public.wf_books           enable row level security;
alter table public.wf_reading_progress enable row level security;
alter table public.wf_reading_plans   enable row level security;
alter table public.wf_courses         enable row level security;
alter table public.wf_course_weeks    enable row level security;
alter table public.wf_course_items    enable row level security;
alter table public.wf_quiz_attempts   enable row level security;
alter table public.wf_course_units    enable row level security;
alter table public.wf_book_settings   enable row level security;

drop policy if exists wf_books_read  on public.wf_books;
drop policy if exists wf_books_write on public.wf_books;
drop policy if exists wf_books_edit  on public.wf_books;
drop policy if exists wf_books_del   on public.wf_books;
create policy wf_books_read  on public.wf_books for select to authenticated
  using (wf_can_see(space_id, owner_member_id, visibility, shared_with)
         or exists (select 1 from public.wf_courses c where c.book_id = wf_books.id and wf_book_course_shared(c.id)));
create policy wf_books_write on public.wf_books for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_books_edit  on public.wf_books for update to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));
create policy wf_books_del   on public.wf_books for delete to authenticated using (wf_is_parent(space_id));

drop policy if exists wf_reading_progress_read  on public.wf_reading_progress;
drop policy if exists wf_reading_progress_write on public.wf_reading_progress;
drop policy if exists wf_reading_progress_edit  on public.wf_reading_progress;
drop policy if exists wf_reading_progress_del   on public.wf_reading_progress;
create policy wf_reading_progress_read  on public.wf_reading_progress for select to authenticated
  using (wf_is_member(space_id) and wf_book_readable(book_id));
create policy wf_reading_progress_write on public.wf_reading_progress for insert to authenticated
  with check (wf_is_member(space_id) and (wf_is_parent(space_id) or member_id = wf_my_member(space_id)));
create policy wf_reading_progress_edit  on public.wf_reading_progress for update to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
create policy wf_reading_progress_del   on public.wf_reading_progress for delete to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));

drop policy if exists wf_reading_plans_read  on public.wf_reading_plans;
drop policy if exists wf_reading_plans_write on public.wf_reading_plans;
drop policy if exists wf_reading_plans_edit  on public.wf_reading_plans;
drop policy if exists wf_reading_plans_del   on public.wf_reading_plans;
create policy wf_reading_plans_read  on public.wf_reading_plans for select to authenticated
  using (wf_is_member(space_id) and wf_book_readable(book_id)
         and (wf_is_parent(space_id) or wf_my_member(space_id) = any (assignee_member_ids)));
create policy wf_reading_plans_write on public.wf_reading_plans for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_reading_plans_edit  on public.wf_reading_plans for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
create policy wf_reading_plans_del   on public.wf_reading_plans for delete to authenticated using (wf_is_parent(space_id));

drop policy if exists wf_courses_read  on public.wf_courses;
drop policy if exists wf_courses_write on public.wf_courses;
drop policy if exists wf_courses_edit  on public.wf_courses;
drop policy if exists wf_courses_del   on public.wf_courses;
create policy wf_courses_read  on public.wf_courses for select to authenticated using (wf_course_readable(id));
create policy wf_courses_write on public.wf_courses for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_courses_edit  on public.wf_courses for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
create policy wf_courses_del   on public.wf_courses for delete to authenticated using (wf_is_parent(space_id));

drop policy if exists wf_course_weeks_read  on public.wf_course_weeks;
drop policy if exists wf_course_weeks_write on public.wf_course_weeks;
drop policy if exists wf_course_weeks_edit  on public.wf_course_weeks;
drop policy if exists wf_course_weeks_del   on public.wf_course_weeks;
create policy wf_course_weeks_read  on public.wf_course_weeks for select to authenticated using (wf_course_readable(course_id));
create policy wf_course_weeks_write on public.wf_course_weeks for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_course_weeks_edit  on public.wf_course_weeks for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
create policy wf_course_weeks_del   on public.wf_course_weeks for delete to authenticated using (wf_is_parent(space_id));

-- Items are the one place a child writes: ticking their own box. The policy
-- allows a member of the family to update an item on a course they are
-- enrolled in; a guest satisfies neither branch, so a shared course stays
-- read-only for them.
drop policy if exists wf_course_items_read  on public.wf_course_items;
drop policy if exists wf_course_items_write on public.wf_course_items;
drop policy if exists wf_course_items_edit  on public.wf_course_items;
drop policy if exists wf_course_items_del   on public.wf_course_items;
create policy wf_course_items_read  on public.wf_course_items for select to authenticated
  using (exists (select 1 from public.wf_course_weeks w where w.id = course_week_id and wf_course_readable(w.course_id)));
create policy wf_course_items_write on public.wf_course_items for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_course_items_edit  on public.wf_course_items for update to authenticated
  using (wf_is_parent(wf_course_items.space_id)
         or exists (select 1 from public.wf_course_weeks w join public.wf_courses c on c.id = w.course_id
                    where w.id = wf_course_items.course_week_id and wf_my_member(wf_course_items.space_id) = any (c.enrolled)))
  with check (wf_is_parent(wf_course_items.space_id)
         or exists (select 1 from public.wf_course_weeks w join public.wf_courses c on c.id = w.course_id
                    where w.id = wf_course_items.course_week_id and wf_my_member(wf_course_items.space_id) = any (c.enrolled)));
create policy wf_course_items_del   on public.wf_course_items for delete to authenticated using (wf_is_parent(space_id));

drop policy if exists wf_quiz_attempts_read  on public.wf_quiz_attempts;
drop policy if exists wf_quiz_attempts_write on public.wf_quiz_attempts;
drop policy if exists wf_quiz_attempts_del   on public.wf_quiz_attempts;
create policy wf_quiz_attempts_read  on public.wf_quiz_attempts for select to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
create policy wf_quiz_attempts_write on public.wf_quiz_attempts for insert to authenticated
  with check (wf_is_member(space_id) and (wf_is_parent(space_id) or member_id = wf_my_member(space_id))
              and exists (select 1 from public.wf_courses c where c.id = course_id
                          and (wf_is_parent(space_id) or wf_my_member(space_id) = any (c.enrolled))));
create policy wf_quiz_attempts_del   on public.wf_quiz_attempts for delete to authenticated using (wf_is_parent(space_id));

drop policy if exists wf_course_units_read  on public.wf_course_units;
drop policy if exists wf_course_units_write on public.wf_course_units;
drop policy if exists wf_course_units_edit  on public.wf_course_units;
drop policy if exists wf_course_units_del   on public.wf_course_units;
create policy wf_course_units_read  on public.wf_course_units for select to authenticated using (wf_is_member(space_id));
create policy wf_course_units_write on public.wf_course_units for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_course_units_edit  on public.wf_course_units for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
create policy wf_course_units_del   on public.wf_course_units for delete to authenticated using (wf_is_parent(space_id));

drop policy if exists wf_book_settings_read  on public.wf_book_settings;
drop policy if exists wf_book_settings_write on public.wf_book_settings;
drop policy if exists wf_book_settings_edit  on public.wf_book_settings;
create policy wf_book_settings_read  on public.wf_book_settings for select to authenticated using (wf_is_member(space_id));
create policy wf_book_settings_write on public.wf_book_settings for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_book_settings_edit  on public.wf_book_settings for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- ---------------------------------------------------------------------------
-- 4. Pre-loaded catalogue: course templates every tenant starts with
-- ---------------------------------------------------------------------------

create table if not exists public.wf_catalog_book_courses (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  slug             text not null,
  title            text not null,
  author           text not null default '',
  audience         text not null default '',
  child_safe       boolean not null default true,
  -- [{ week, theme, chapters, discussionQuestions[], familyActivity, quiz[] }]
  weeks            jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now(),
  unique (organization_id, slug)
);
alter table public.wf_catalog_book_courses enable row level security;
drop policy if exists wf_catalog_book_courses_read on public.wf_catalog_book_courses;
create policy wf_catalog_book_courses_read on public.wf_catalog_book_courses for select to authenticated using (true);

/**
 * Seed the catalogue for a tenant. Idempotent: re-running updates in place, so
 * an operator can improve a template and every new family gets the better one.
 */
create or replace function public.wf_seed_books(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.wf_catalog_book_courses (organization_id, slug, title, author, audience, child_safe, weeks)
  values
    (p_org, 'household-rhythms', 'Household rhythms — four weeks', 'Adapted from the family-habits tradition',
     'The whole family, read aloud after Sunday lunch.', true,
     '[{"week":1,"theme":"Waking: what we do first","chapters":"Introduction and chapters 1-2",
        "discussionQuestions":["What is the first thing each of us does in the morning?","What one sentence could we say before anyone leaves the house?","Which morning habit would we not want to pass on?"],
        "familyActivity":"Write our morning sentence on a card and tape it inside the front door.","quiz":[]},
       {"week":2,"theme":"Mealtimes: the table as a welcome","chapters":"Chapters 3-4",
        "discussionQuestions":["When did we last eat with nobody holding a phone?","Who could we invite this month who has never been?","What would we like said before we eat?"],
        "familyActivity":"Invite one person outside the family to Sunday lunch.","quiz":[]},
       {"week":3,"theme":"Screens, work and rest","chapters":"Chapters 5-6",
        "discussionQuestions":["What does each of us reach for when we are bored?","What would a good screen-free morning look like?","What do we do with a day off?"],
        "familyActivity":"A screen-free Saturday morning, out of the house.","quiz":[]},
       {"week":4,"theme":"Bedtime: blessing and forgiveness","chapters":"Chapters 7-8",
        "discussionQuestions":["What do we want the last words of the day to be?","How do we say sorry here, and how quickly?","Which habit are we keeping?"],
        "familyActivity":"Write a bedtime blessing for each child in their own words.","quiz":[]}]'::jsonb),
    (p_org, 'read-a-novel-together', 'Read a novel together — four weeks', 'Any novel',
     'A teenager and a parent reading the same book.', true,
     '[{"week":1,"theme":"Who is this about?","chapters":"First quarter",
        "discussionQuestions":["Whose story is this?","What does the main character want?","What is in the way?"],
        "familyActivity":"Each write one sentence predicting the ending, and seal it.","quiz":[]},
       {"week":2,"theme":"What changes","chapters":"Second quarter",
        "discussionQuestions":["What has the character learned?","Who has been let down?","What would we have done?"],
        "familyActivity":"Cook something the characters would eat.","quiz":[]},
       {"week":3,"theme":"The hardest part","chapters":"Third quarter",
        "discussionQuestions":["Where does it turn?","What does the author want us to feel here?","Is anyone right?"],
        "familyActivity":"Read the hardest page aloud to each other.","quiz":[]},
       {"week":4,"theme":"What it was for","chapters":"Final quarter",
        "discussionQuestions":["Open the sealed predictions — who was closest?","What will we remember in a year?","Who should read it next?"],
        "familyActivity":"Write the book a one-line review for the shelf.","quiz":[]}]'::jsonb)
  on conflict (organization_id, slug) do update
    set title = excluded.title,
        author = excluded.author,
        audience = excluded.audience,
        child_safe = excluded.child_safe,
        weeks = excluded.weeks;
end;
$$;

grant execute on function public.wf_seed_books(uuid) to authenticated;


-- ===========================================================================
-- MODULE 7/19 — bible (businesses/wafe/sql/bible.sql)
-- ===========================================================================
-- Wàfè — bible: studies and sessions, reading plans and their days, memory
-- verses with a 1-3-7-14-30 review ladder, the prayer wall, the private prayer
-- lists and the answered-prayer archive.
--
-- Idempotent. Depends only on 00-foundation (wf_spaces, wf_members and the
-- helpers wf_is_member / wf_is_parent / wf_is_child / wf_my_member / wf_my_role /
-- wf_can_see); it never references another module's tables.
--
-- THE PRIVACY MODEL, in one paragraph. A prayer carries a visibility, a
-- sensitivity, a child-safe flag, a tag set and a "share with guests" flag,
-- and all five matter. Private is absolute — the author, nobody else, ever,
-- which is why the read policy tests it before anything else. A child reaches
-- a prayer only when it is child-safe, of general sensitivity, and every tag
-- on it is in the closed child-safe tag list (money worry and adult work
-- pressure are not a nine-year-old's to carry). A guest reaches the wall only
-- when the family granted them the wall object AND the individual request was
-- marked shared with guests; a guest who was granted nothing gets an empty
-- result set, not a filtered one. The app applies the same rules in
-- `derive.visibleTo`, but this file is what makes them true.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_bible_studies (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  space_id            uuid not null references public.wf_spaces(id) on delete cascade,
  title               text not null,
  type                text not null default 'custom' check (type in ('preloaded','custom','topical')),
  description         text not null default '',
  child_safe          boolean not null default false,
  assignee_member_ids uuid[] not null default '{}',
  -- A family value ("Faith", "Generosity"), kept as a label: values live on
  -- the space, not in a table of their own.
  value_id            text,
  cover_url           text,
  minutes             integer not null default 15 check (minutes between 5 and 180),
  owner_member_id     uuid references public.wf_members(id) on delete set null,
  visibility          text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with         uuid[] not null default '{}',
  created_at          timestamptz not null default now()
);
create index if not exists idx_wf_bible_studies_space on public.wf_bible_studies(space_id);

create table if not exists public.wf_bible_sessions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  study_id        uuid not null references public.wf_bible_studies(id) on delete cascade,
  session_order   integer not null default 1 check (session_order between 1 and 400),
  passage         text not null,
  passage_text    text not null default '',
  devotional      text not null default '',
  questions       text[] not null default '{}',
  prayer_focus    text not null default '',
  created_at      timestamptz not null default now(),
  unique (study_id, session_order)
);
create index if not exists idx_wf_bible_sessions_study on public.wf_bible_sessions(study_id, session_order);

-- One row per person per session finished. The unique key is what makes
-- "complete" idempotent and what Curricula counts.
create table if not exists public.wf_bible_session_done (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  study_id        uuid not null references public.wf_bible_studies(id) on delete cascade,
  session_id      uuid not null references public.wf_bible_sessions(id) on delete cascade,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  done_on         date not null default current_date,
  created_at      timestamptz not null default now(),
  unique (session_id, member_id)
);
create index if not exists idx_wf_bible_done_space on public.wf_bible_session_done(space_id, member_id);

create table if not exists public.wf_bible_plans (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  space_id            uuid not null references public.wf_spaces(id) on delete cascade,
  title               text not null,
  start_date          date not null default current_date,
  translation         text not null default 'WEB',
  assignee_member_ids uuid[] not null default '{}',
  -- Exactly one plan feeds the daily scripture; the partial index enforces it.
  active              boolean not null default true,
  owner_member_id     uuid references public.wf_members(id) on delete set null,
  created_at          timestamptz not null default now()
);
create unique index if not exists uq_wf_bible_plan_active on public.wf_bible_plans(space_id) where active;
create index if not exists idx_wf_bible_plans_space on public.wf_bible_plans(space_id);

create table if not exists public.wf_bible_plan_days (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  plan_id         uuid not null references public.wf_bible_plans(id) on delete cascade,
  day_number      integer not null check (day_number between 1 and 400),
  passage         text not null,
  passage_text    text not null default '',
  created_at      timestamptz not null default now(),
  unique (plan_id, day_number)
);
create index if not exists idx_wf_bible_plan_days on public.wf_bible_plan_days(plan_id, day_number);

create table if not exists public.wf_memory_verses (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  reference       text not null,
  text            text not null,
  -- A little one learns by hearing it: the card reads itself aloud.
  read_aloud      boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_memory_verses_member on public.wf_memory_verses(space_id, member_id);

-- One row per scheduled review. The row with reviewed_at null is the card that
-- is (or becomes) due; answering it stamps the result and inserts the next.
create table if not exists public.wf_verse_reviews (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  verse_id        uuid not null references public.wf_memory_verses(id) on delete cascade,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  due_at          date not null default current_date,
  interval_days   integer not null default 1 check (interval_days between 1 and 365),
  step            integer not null default 0 check (step between 0 and 4),
  result          text check (result in ('knew','again')),
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  constraint wf_verse_review_answered check ((result is null) = (reviewed_at is null))
);
create index if not exists idx_wf_verse_reviews_due on public.wf_verse_reviews(space_id, member_id, due_at) where reviewed_at is null;

create table if not exists public.wf_prayers (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  space_id           uuid not null references public.wf_spaces(id) on delete cascade,
  owner_member_id    uuid references public.wf_members(id) on delete set null,
  title              text not null,
  detail             text not null default '',
  tags               text[] not null default '{}',
  visibility         text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with        uuid[] not null default '{}',
  sensitivity        text not null default 'general' check (sensitivity in ('general','health','financial','private')),
  status             text not null default 'open' check (status in ('open','answered')),
  answered_at        date,
  testimony          text not null default '',
  child_safe         boolean not null default false,
  -- Opt-in: a family prayer is not automatically a guest's business.
  shared_with_guests boolean not null default false,
  from_guest         boolean not null default false,
  created_at         timestamptz not null default now(),
  constraint wf_prayer_answered check ((status = 'answered') = (answered_at is not null)),
  -- A private prayer is nobody's business but its author's, and the row says so.
  constraint wf_prayer_private check (visibility <> 'private' or (not shared_with_guests and not child_safe))
);
create index if not exists idx_wf_prayers_space on public.wf_prayers(space_id, status);

create table if not exists public.wf_prayer_reactions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  prayer_id       uuid not null references public.wf_prayers(id) on delete cascade,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  type            text not null default 'prayed' check (type in ('prayed')),
  -- The streak is counted in days, not moments: one row per person per day.
  prayed_on       date not null default current_date,
  created_at      timestamptz not null default now(),
  unique (prayer_id, member_id, prayed_on)
);
create index if not exists idx_wf_prayer_reactions on public.wf_prayer_reactions(space_id, member_id, prayed_on);

-- An answered prayer, materialised for the family timeline. Home reads it from
-- this module's slice; a module never writes another module's tables.
create table if not exists public.wf_prayer_milestones (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  prayer_id       uuid not null unique references public.wf_prayers(id) on delete cascade,
  happened_on     date not null default current_date,
  title           text not null,
  body            text not null default '',
  member_ids      uuid[] not null default '{}',
  owner_member_id uuid references public.wf_members(id) on delete set null,
  visibility      text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with     uuid[] not null default '{}',
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_prayer_milestones on public.wf_prayer_milestones(space_id, happened_on desc);

-- One row per space: who was granted the wall object, which days are grace
-- days, and the rolling family verse list the daily scripture falls back to.
create table if not exists public.wf_bible_settings (
  space_id        uuid primary key references public.wf_spaces(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  wall_guest_ids  uuid[] not null default '{}',
  grace_days      date[] not null default '{}',
  rolling_verses  jsonb not null default '[]'::jsonb,
  updated_at      timestamptz not null default now()
);

-- The pre-loaded study library every new family starts from, keyed by tenant.
create table if not exists public.wf_catalog_studies (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug            text not null,
  title           text not null,
  type            text not null default 'preloaded' check (type in ('preloaded','custom','topical')),
  description     text not null default '',
  child_safe      boolean not null default false,
  value_id        text,
  minutes         integer not null default 15,
  cover_url       text,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.wf_catalog_study_sessions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  study_slug      text not null,
  session_order   integer not null,
  passage         text not null,
  passage_text    text not null default '',
  devotional      text not null default '',
  questions       text[] not null default '{}',
  prayer_focus    text not null default '',
  unique (organization_id, study_slug, session_order)
);

-- ---------------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------------

-- The closed child-safe tag set. Keeping it here rather than judging each
-- prayer is what makes the child wall filter a fact of the product rather than
-- an opinion typed in by whoever posted.
create or replace function public.wf_bible_child_safe_tags(p_tags text[]) returns boolean
language sql immutable as $$
  select coalesce(p_tags, '{}') <@ array['family','health','school','church','mission','travel','thanks']::text[];
$$;
grant execute on function public.wf_bible_child_safe_tags(text[]) to authenticated;

-- Was this session's member granted the prayer wall object?
create or replace function public.wf_bible_wall_granted(p_space uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare granted boolean;
begin
  if not wf_is_member(p_space) then return false; end if;
  select wf_my_member(p_space) = any (s.wall_guest_ids) into granted
  from wf_bible_settings s where s.space_id = p_space;
  return coalesce(granted, false);
end $$;
grant execute on function public.wf_bible_wall_granted(uuid) to authenticated;

-- The whole rule for one prayer, in one place, so read/update/delete and the
-- reaction table cannot drift from each other.
create or replace function public.wf_bible_can_see_prayer(
  p_space uuid, p_owner uuid, p_visibility text, p_shared uuid[],
  p_child_safe boolean, p_sensitivity text, p_tags text[], p_guests boolean
) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare me uuid;
begin
  if not wf_is_member(p_space) then return false; end if;
  me := wf_my_member(p_space);
  if p_owner is not null and p_owner = me then return true; end if;
  if p_visibility = 'private' then return false; end if;
  if p_visibility = 'shared' then return me = any (p_shared); end if;
  if wf_is_child(p_space) then
    return p_child_safe and p_sensitivity = 'general' and wf_bible_child_safe_tags(p_tags);
  end if;
  if wf_is_parent(p_space) then return true; end if;
  -- Everyone left is a guest: the grant AND the per-request flag (AC4, AC8).
  return p_guests and wf_bible_wall_granted(p_space);
end $$;
grant execute on function public.wf_bible_can_see_prayer(uuid, uuid, text, uuid[], boolean, text, text[], boolean) to authenticated;

-- A child may open a study only when it is child-safe and assigned to them.
create or replace function public.wf_bible_can_see_study(p_study uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare st record;
begin
  select s.space_id, s.child_safe, s.assignee_member_ids into st from wf_bible_studies s where s.id = p_study;
  if st.space_id is null or not wf_is_member(st.space_id) then return false; end if;
  if wf_is_parent(st.space_id) then return true; end if;
  if wf_is_child(st.space_id) then
    return st.child_safe and wf_my_member(st.space_id) = any (st.assignee_member_ids);
  end if;
  -- Guests are not given studies; a mentor is given a session, by hand.
  return false;
end $$;
grant execute on function public.wf_bible_can_see_study(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Row-level security
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'wf_bible_studies','wf_bible_sessions','wf_bible_session_done','wf_bible_plans','wf_bible_plan_days',
    'wf_memory_verses','wf_verse_reviews','wf_prayers','wf_prayer_reactions','wf_prayer_milestones',
    'wf_bible_settings','wf_catalog_studies','wf_catalog_study_sessions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Studies -------------------------------------------------------------------
drop policy if exists wf_bible_studies_read on public.wf_bible_studies;
create policy wf_bible_studies_read on public.wf_bible_studies for select to authenticated
  using (wf_bible_can_see_study(id));
drop policy if exists wf_bible_studies_write on public.wf_bible_studies;
create policy wf_bible_studies_write on public.wf_bible_studies for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_bible_studies_edit on public.wf_bible_studies;
create policy wf_bible_studies_edit on public.wf_bible_studies for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_bible_studies_del on public.wf_bible_studies;
create policy wf_bible_studies_del on public.wf_bible_studies for delete to authenticated using (wf_is_parent(space_id));

-- Sessions follow their study.
drop policy if exists wf_bible_sessions_read on public.wf_bible_sessions;
create policy wf_bible_sessions_read on public.wf_bible_sessions for select to authenticated using (wf_bible_can_see_study(study_id));
drop policy if exists wf_bible_sessions_write on public.wf_bible_sessions;
create policy wf_bible_sessions_write on public.wf_bible_sessions for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_bible_sessions_edit on public.wf_bible_sessions;
create policy wf_bible_sessions_edit on public.wf_bible_sessions for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_bible_sessions_del on public.wf_bible_sessions;
create policy wf_bible_sessions_del on public.wf_bible_sessions for delete to authenticated using (wf_is_parent(space_id));

-- Completions: parents see the family's, everyone sees their own, and nobody
-- ticks a box for someone else except a parent.
drop policy if exists wf_bible_done_read on public.wf_bible_session_done;
create policy wf_bible_done_read on public.wf_bible_session_done for select to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_bible_done_write on public.wf_bible_session_done;
create policy wf_bible_done_write on public.wf_bible_session_done for insert to authenticated
  with check (wf_is_member(space_id) and (member_id = wf_my_member(space_id) or wf_is_parent(space_id)) and wf_bible_can_see_study(study_id));
drop policy if exists wf_bible_done_edit on public.wf_bible_session_done;
create policy wf_bible_done_edit on public.wf_bible_session_done for update to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id)) with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_bible_done_del on public.wf_bible_session_done;
create policy wf_bible_done_del on public.wf_bible_session_done for delete to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));

-- Reading plans: the household reads them; parents write them.
drop policy if exists wf_bible_plans_read on public.wf_bible_plans;
create policy wf_bible_plans_read on public.wf_bible_plans for select to authenticated using (wf_is_member(space_id));
drop policy if exists wf_bible_plans_write on public.wf_bible_plans;
create policy wf_bible_plans_write on public.wf_bible_plans for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_bible_plans_edit on public.wf_bible_plans;
create policy wf_bible_plans_edit on public.wf_bible_plans for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_bible_plans_del on public.wf_bible_plans;
create policy wf_bible_plans_del on public.wf_bible_plans for delete to authenticated using (wf_is_parent(space_id));

drop policy if exists wf_bible_plan_days_read on public.wf_bible_plan_days;
create policy wf_bible_plan_days_read on public.wf_bible_plan_days for select to authenticated using (wf_is_member(space_id));
drop policy if exists wf_bible_plan_days_write on public.wf_bible_plan_days;
create policy wf_bible_plan_days_write on public.wf_bible_plan_days for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_bible_plan_days_edit on public.wf_bible_plan_days;
create policy wf_bible_plan_days_edit on public.wf_bible_plan_days for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_bible_plan_days_del on public.wf_bible_plan_days;
create policy wf_bible_plan_days_del on public.wf_bible_plan_days for delete to authenticated using (wf_is_parent(space_id));

-- Memory verses are personal: yours, or (for a parent) the family's.
drop policy if exists wf_memory_verses_read on public.wf_memory_verses;
create policy wf_memory_verses_read on public.wf_memory_verses for select to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_memory_verses_write on public.wf_memory_verses;
create policy wf_memory_verses_write on public.wf_memory_verses for insert to authenticated
  with check (wf_is_member(space_id) and (member_id = wf_my_member(space_id) or wf_is_parent(space_id)));
drop policy if exists wf_memory_verses_edit on public.wf_memory_verses;
create policy wf_memory_verses_edit on public.wf_memory_verses for update to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id)) with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_memory_verses_del on public.wf_memory_verses;
create policy wf_memory_verses_del on public.wf_memory_verses for delete to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));

drop policy if exists wf_verse_reviews_read on public.wf_verse_reviews;
create policy wf_verse_reviews_read on public.wf_verse_reviews for select to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_verse_reviews_write on public.wf_verse_reviews;
create policy wf_verse_reviews_write on public.wf_verse_reviews for insert to authenticated
  with check (wf_is_member(space_id) and (member_id = wf_my_member(space_id) or wf_is_parent(space_id)));
drop policy if exists wf_verse_reviews_edit on public.wf_verse_reviews;
create policy wf_verse_reviews_edit on public.wf_verse_reviews for update to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id)) with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_verse_reviews_del on public.wf_verse_reviews;
create policy wf_verse_reviews_del on public.wf_verse_reviews for delete to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));

-- Prayer: the one rule, applied everywhere ----------------------------------
drop policy if exists wf_prayers_read on public.wf_prayers;
create policy wf_prayers_read on public.wf_prayers for select to authenticated
  using (wf_bible_can_see_prayer(space_id, owner_member_id, visibility, shared_with, child_safe, sensitivity, tags, shared_with_guests));

-- Posting: family members always; a guest only with the wall grant, only as
-- themselves, and only onto the wall (never as a private family note).
drop policy if exists wf_prayers_write on public.wf_prayers;
create policy wf_prayers_write on public.wf_prayers for insert to authenticated
  with check (
    wf_is_member(space_id)
    and owner_member_id = wf_my_member(space_id)
    and (
      wf_my_role(space_id) <> 'guest'
      or (wf_bible_wall_granted(space_id) and visibility = 'family' and from_guest and shared_with_guests)
    )
  );

drop policy if exists wf_prayers_edit on public.wf_prayers;
create policy wf_prayers_edit on public.wf_prayers for update to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));
drop policy if exists wf_prayers_del on public.wf_prayers;
create policy wf_prayers_del on public.wf_prayers for delete to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));

-- "I prayed" is readable when the prayer is, and writable only as yourself.
drop policy if exists wf_prayer_reactions_read on public.wf_prayer_reactions;
create policy wf_prayer_reactions_read on public.wf_prayer_reactions for select to authenticated
  using (exists (select 1 from wf_prayers p where p.id = prayer_id));
drop policy if exists wf_prayer_reactions_write on public.wf_prayer_reactions;
create policy wf_prayer_reactions_write on public.wf_prayer_reactions for insert to authenticated
  with check (
    wf_is_member(space_id)
    and member_id = wf_my_member(space_id)
    and (wf_my_role(space_id) <> 'guest' or wf_bible_wall_granted(space_id))
    and exists (select 1 from wf_prayers p where p.id = prayer_id)
  );
drop policy if exists wf_prayer_reactions_del on public.wf_prayer_reactions;
create policy wf_prayer_reactions_del on public.wf_prayer_reactions for delete to authenticated
  using (member_id = wf_my_member(space_id) or wf_is_parent(space_id));

-- The archive follows the prayer it came from.
drop policy if exists wf_prayer_milestones_read on public.wf_prayer_milestones;
create policy wf_prayer_milestones_read on public.wf_prayer_milestones for select to authenticated
  using (exists (select 1 from wf_prayers p where p.id = prayer_id));
drop policy if exists wf_prayer_milestones_write on public.wf_prayer_milestones;
create policy wf_prayer_milestones_write on public.wf_prayer_milestones for insert to authenticated
  with check (wf_is_member(space_id) and exists (select 1 from wf_prayers p where p.id = prayer_id and (wf_is_parent(p.space_id) or p.owner_member_id = wf_my_member(p.space_id))));
drop policy if exists wf_prayer_milestones_edit on public.wf_prayer_milestones;
create policy wf_prayer_milestones_edit on public.wf_prayer_milestones for update to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id)) with check (wf_is_member(space_id));
drop policy if exists wf_prayer_milestones_del on public.wf_prayer_milestones;
create policy wf_prayer_milestones_del on public.wf_prayer_milestones for delete to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));

-- Settings: everyone reads (a guest needs to know they hold the grant),
-- parents write.
drop policy if exists wf_bible_settings_read on public.wf_bible_settings;
create policy wf_bible_settings_read on public.wf_bible_settings for select to authenticated using (wf_is_member(space_id));
drop policy if exists wf_bible_settings_write on public.wf_bible_settings;
create policy wf_bible_settings_write on public.wf_bible_settings for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_bible_settings_edit on public.wf_bible_settings;
create policy wf_bible_settings_edit on public.wf_bible_settings for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_bible_settings_del on public.wf_bible_settings;
create policy wf_bible_settings_del on public.wf_bible_settings for delete to authenticated using (wf_is_parent(space_id));

-- The pre-loaded library is readable by anyone signed in to the tenant.
drop policy if exists wf_catalog_studies_read on public.wf_catalog_studies;
create policy wf_catalog_studies_read on public.wf_catalog_studies for select to authenticated using (true);
drop policy if exists wf_catalog_study_sessions_read on public.wf_catalog_study_sessions;
create policy wf_catalog_study_sessions_read on public.wf_catalog_study_sessions for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 4. Pre-loaded content for a new business
-- ---------------------------------------------------------------------------
-- Public-domain scripture (World English Bible) and devotionals written for
-- this product, so a family that signs up on a Tuesday has something to read
-- on Wednesday morning without generating a thing.
create or replace function public.wf_seed_bible(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into wf_catalog_studies (organization_id, slug, title, type, description, child_safe, value_id, minutes, sort_order)
  values
    (p_org, 'mark',        'The Gospel of Mark, scene by scene',       'preloaded', 'Six sittings in the fastest of the gospels: a man in a hurry, and the people he stopped for.', false, 'Faith', 15, 1),
    (p_org, 'psalms',      'Psalms for anxious hearts',                'preloaded', 'Five psalms for the nights when the mind will not settle.', true, 'Faith', 12, 2),
    (p_org, 'fruit',       'Fruit of the Spirit, for children',        'preloaded', 'Nine short sessions, one for each fruit: a verse, a picture and something to try before bedtime.', true, 'Love', 10, 3),
    (p_org, 'parables',    'Parables for children',                    'preloaded', 'Five stories Jesus told, with a question a five-year-old can answer and one a ten-year-old cannot.', true, 'Joy', 10, 4),
    (p_org, 'proverbs',    'Proverbs: a chapter a day',                'preloaded', 'Wisdom for the household — money, words, work and friendship.', false, 'Diligence', 12, 5),
    (p_org, 'stewardship', 'Stewardship: what we do with what we have','topical',   'Four sessions on money and generosity — best done with the budget open in front of you.', false, 'Generosity', 20, 6)
  on conflict (organization_id, slug) do update
    set title = excluded.title,
        description = excluded.description,
        child_safe = excluded.child_safe,
        value_id = excluded.value_id,
        minutes = excluded.minutes,
        sort_order = excluded.sort_order;

  insert into wf_catalog_study_sessions (organization_id, study_slug, session_order, passage, passage_text, devotional, questions, prayer_focus)
  values
    (p_org, 'mark', 1, 'Mark 1:16-18', 'Passing along by the sea of Galilee, he saw Simon and Andrew casting a net. Jesus said to them, "Come after me, and I will make you into fishers for men." Immediately they left their nets, and followed him.',
      'Mark never says how long they thought about it. A man calls, and a working life turns on its heel — mid-shift, hands wet, not on a quiet retreat.',
      array['What were you in the middle of the last time you sensed you were being asked something?','What would leaving the nets cost in our house this month?'],
      'That we would answer quickly when we are sure, and honestly when we are not.'),
    (p_org, 'mark', 2, 'Mark 1:35', 'Early in the morning, while it was still dark, he rose up and went out, and departed into a deserted place, and prayed there.',
      'The busiest day so far is followed by the earliest morning. Rest and prayer were not what was left over; they were what everything else was built on.',
      array['What is the first thing our household actually does in the morning?','Where is the deserted place in a house of five?'],
      'For one quiet quarter of an hour tomorrow, before the noise.'),
    (p_org, 'psalms', 1, 'Psalm 34:18', 'Yahweh is near to those who have a broken heart, and saves those who have a crushed spirit.',
      'Nearness is the promise, not immediate rescue. The psalm does not tell you to cheer up; it tells you where God is standing while you are not cheerful.',
      array['What would it change to believe God is near rather than disappointed?','Who do you know with a crushed spirit this week?'],
      'For nearness, in the exact place it hurts.'),
    (p_org, 'fruit', 1, 'Galatians 5:22', 'But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faith, gentleness, and self-control.',
      'Fruit grows slowly and it grows on the inside first. Nobody shouts at an apple tree to hurry up.',
      array['Which fruit is easiest for you?','Which one is hardest?'],
      'That God would grow love in us this week.'),
    (p_org, 'parables', 1, 'Luke 15:4-6', 'Which of you men, if you had one hundred sheep and lost one of them, would not leave the ninety-nine and go after the one that was lost, until he found it?',
      'Ninety-nine is a very good score. The shepherd does not think so. This is a story about being counted, not about being useful.',
      array['Have you ever been lost? What did it feel like?','Why does the shepherd carry the sheep home instead of making it walk?'],
      'Thank you that you count us one by one.'),
    (p_org, 'proverbs', 1, 'Proverbs 3:5-6', 'Trust in Yahweh with all your heart, and do not lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.',
      'Not "do not think" — "do not lean". Understanding is a good tool and a poor crutch.',
      array['Where are we leaning hardest at the moment?','What decision are we making on our own understanding alone?'],
      'For a straight path through this month''s decisions.'),
    (p_org, 'stewardship', 1, 'Luke 16:10', 'He who is faithful in a very little is faithful also in much. He who is dishonest in a very little is also dishonest in much.',
      'The small sums are the training ground. How a household handles forty pounds tells you what it will do with forty thousand.',
      array['What is our very little at the moment?','Where are we being slightly dishonest with ourselves in the budget?'],
      'For faithfulness in the small numbers.')
  on conflict (organization_id, study_slug, session_order) do update
    set passage = excluded.passage,
        passage_text = excluded.passage_text,
        devotional = excluded.devotional,
        questions = excluded.questions,
        prayer_focus = excluded.prayer_focus;
end $$;
grant execute on function public.wf_seed_bible(uuid) to authenticated;


-- ===========================================================================
-- MODULE 8/19 — curricula (businesses/wafe/sql/curricula.sql)
-- ===========================================================================
-- Wàfè — curricula: the children's school half of Grow.
--
-- Ten tables and two catalogue tables. The shape follows the module: a SUBJECT
-- belongs to exactly one child, holds UNITS, and a unit holds ASSIGNMENTS;
-- a submission and a grade hang off an assignment; badges, milestones and the
-- monthly character track sit alongside.
--
-- THE GRADE RULE, and it is enforced here rather than in the client: a child's
-- select on wf_grades returns a row only when the parent has set
-- visible_to_child. The mark exists, the average a parent sees includes it,
-- and the child's slice simply does not contain it — so no screen has to
-- remember to hide anything.
--
-- THE SIBLING RULE: every child-scoped read is `wf_is_parent(space_id) or
-- <the child column> = wf_my_member(space_id)`. A child cannot fetch a
-- sibling's subjects, work, marks, badges or milestones, and there is no
-- leaderboard to build out of them.
--
-- Guests hold neither curricula capability and satisfy no policy in this file.
--
-- Idempotent throughout: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_subjects (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  space_id           uuid not null references public.wf_spaces(id) on delete cascade,
  -- Every subject belongs to one child. Dami's Chemistry is not Tobi's Science.
  child_member_id    uuid not null references public.wf_members(id) on delete cascade,
  name               text not null,
  colour             text not null default 'grow'
                       check (colour in ('grow','execute','live','create','terra','ochre','plum','sage','mint')),
  term               text not null default '',
  target_hours_week  integer not null default 0 check (target_hours_week between 0 and 60),
  kind               text not null default 'home-ed' check (kind in ('home-ed','school','exam')),
  note               text not null default '',
  photo_url          text,
  archived           boolean not null default false,
  created_at         timestamptz not null default now()
);
create index if not exists idx_wf_subjects_space on public.wf_subjects(space_id, archived);
create index if not exists idx_wf_subjects_child on public.wf_subjects(child_member_id);

create table if not exists public.wf_curriculum_units (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  space_id          uuid not null references public.wf_spaces(id) on delete cascade,
  subject_id        uuid not null references public.wf_subjects(id) on delete cascade,
  title             text not null,
  summary           text not null default '',
  unit_order        integer not null default 1,
  -- A unit exported from the Library keeps a link back to the course it came
  -- from. Deliberately NOT a foreign key: Books is another module's table and
  -- modules never reference each other's tables (CONTRACT.md).
  source_course_id  text,
  source_href       text,
  source_label      text,
  created_at        timestamptz not null default now()
);
create index if not exists idx_wf_curriculum_units_subject on public.wf_curriculum_units(subject_id, unit_order);

create table if not exists public.wf_assignments (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  space_id           uuid not null references public.wf_spaces(id) on delete cascade,
  unit_id            uuid not null references public.wf_curriculum_units(id) on delete cascade,
  -- Denormalised from the unit's subject so a feed row never walks the tree,
  -- and so the row can be filtered by RLS without a join.
  subject_id         uuid not null references public.wf_subjects(id) on delete cascade,
  child_member_id    uuid not null references public.wf_members(id) on delete cascade,
  title              text not null,
  instructions       text not null default '',
  due_date           date not null default current_date,
  status             text not null default 'not-started'
                       check (status in ('not-started','in-progress','submitted','graded')),
  sprouts            integer not null default 10 check (sprouts >= 0),
  linked_item_type   text not null default 'none' check (linked_item_type in ('lesson','book','bible','project','none')),
  linked_item_title  text,
  linked_href        text,
  attachments        text[] not null default '{}',
  -- The Little band's tiles are pictures and read-aloud, never text.
  picture_led        boolean not null default false,
  -- Set once the Sprouts have been paid, so they are never paid twice.
  credited_at        timestamptz,
  created_at         timestamptz not null default now()
);
create index if not exists idx_wf_assignments_child on public.wf_assignments(child_member_id, due_date);
create index if not exists idx_wf_assignments_unit on public.wf_assignments(unit_id);
create index if not exists idx_wf_assignments_status on public.wf_assignments(space_id, status);

create table if not exists public.wf_submissions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  assignment_id    uuid not null references public.wf_assignments(id) on delete cascade,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  text             text not null default '',
  media_urls       text[] not null default '{}',
  submitted_at     timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (assignment_id, member_id)
);
create index if not exists idx_wf_submissions_assignment on public.wf_submissions(assignment_id);

create table if not exists public.wf_grades (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  space_id           uuid not null references public.wf_spaces(id) on delete cascade,
  assignment_id      uuid not null references public.wf_assignments(id) on delete cascade unique,
  score              integer not null default 0 check (score between 0 and 100),
  letter             text not null default '',
  -- [{ criterion, score, max }]
  rubric             jsonb not null default '[]'::jsonb,
  comment            text not null default '',
  graded_by          uuid references public.wf_members(id) on delete set null,
  graded_at          timestamptz not null default now(),
  -- The child sees the mark only when a parent releases it.
  visible_to_child   boolean not null default false,
  created_at         timestamptz not null default now()
);
create index if not exists idx_wf_grades_space on public.wf_grades(space_id);

create table if not exists public.wf_badges (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  space_id          uuid not null references public.wf_spaces(id) on delete cascade,
  name              text not null,
  kind              text not null default 'skill' check (kind in ('skill','virtue')),
  virtue_or_skill   text not null default '',
  subject_id        uuid references public.wf_subjects(id) on delete set null,
  criteria          text not null default '',
  icon              text not null default '🏅',
  levels            text[] not null default '{Bronze,Silver,Gold}',
  created_at        timestamptz not null default now()
);
create index if not exists idx_wf_badges_space on public.wf_badges(space_id);

create table if not exists public.wf_badge_awards (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  space_id          uuid not null references public.wf_spaces(id) on delete cascade,
  badge_id          uuid not null references public.wf_badges(id) on delete cascade,
  member_id         uuid not null references public.wf_members(id) on delete cascade,
  level             text not null default 'Bronze',
  note              text not null default '',
  awarded_by        uuid references public.wf_members(id) on delete set null,
  awarded_at        timestamptz not null default now(),
  created_at        timestamptz not null default now()
);
create index if not exists idx_wf_badge_awards_member on public.wf_badge_awards(member_id, awarded_at desc);

create table if not exists public.wf_dev_milestones (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  space_id          uuid not null references public.wf_spaces(id) on delete cascade,
  member_id         uuid not null references public.wf_members(id) on delete cascade,
  band              text not null default 'junior' check (band in ('little','junior','teen','young-adult','adult')),
  title             text not null,
  note              text not null default '',
  progress_pct      integer not null default 0 check (progress_pct between 0 and 100),
  achieved_at       date,
  photo_url         text,
  -- Set when the family has marked the celebration, so the card stops asking.
  celebrated_at     timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists idx_wf_dev_milestones_member on public.wf_dev_milestones(member_id);

create table if not exists public.wf_character_tracks (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  space_id          uuid not null references public.wf_spaces(id) on delete cascade,
  -- YYYY-MM. One track a month per family.
  month             text not null check (month ~ '^\d{4}-\d{2}$'),
  virtue            text not null,
  -- One of the space's own values, kept as text so a family can rename them.
  value_label       text not null default '',
  intro             text not null default '',
  challenges        text[] not null default '{}',
  sprouts           integer not null default 10 check (sprouts >= 0),
  created_at        timestamptz not null default now(),
  unique (space_id, month)
);

create table if not exists public.wf_character_logs (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  space_id          uuid not null references public.wf_spaces(id) on delete cascade,
  track_id          uuid not null references public.wf_character_tracks(id) on delete cascade,
  member_id         uuid not null references public.wf_members(id) on delete cascade,
  date              date not null default current_date,
  challenge_index   integer not null default 0 check (challenge_index >= 0),
  reflection        text not null default '',
  sprouts           integer not null default 10 check (sprouts >= 0),
  created_at        timestamptz not null default now(),
  -- One challenge a day per child: the ritual is daily, not a grind.
  unique (track_id, member_id, date)
);
create index if not exists idx_wf_character_logs_member on public.wf_character_logs(member_id, date desc);

-- Pre-loaded content, keyed by organisation and readable by anyone signed in:
-- a starter badge catalogue and a set of monthly character tracks a family can
-- adopt on the day they sign up.
create table if not exists public.wf_catalog_badges (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  slug              text not null,
  name              text not null,
  kind              text not null default 'skill' check (kind in ('skill','virtue')),
  virtue_or_skill   text not null default '',
  criteria          text not null default '',
  icon              text not null default '🏅',
  levels            text[] not null default '{Bronze,Silver,Gold}',
  created_at        timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.wf_catalog_character_tracks (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  slug              text not null,
  virtue            text not null,
  intro             text not null default '',
  challenges        text[] not null default '{}',
  created_at        timestamptz not null default now(),
  unique (organization_id, slug)
);

-- ---------------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------------

-- True when the caller may read this subject: a parent in its space, or the
-- child whose subject it is.
create or replace function public.wf_subject_readable(p_subject uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wf_subjects s
    where s.id = p_subject
      and (wf_is_parent(s.space_id) or s.child_member_id = wf_my_member(s.space_id))
  );
$$;

-- True when the caller may read this assignment (same rule, denormalised).
create or replace function public.wf_assignment_mine(p_assignment uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wf_assignments a
    where a.id = p_assignment and a.child_member_id = wf_my_member(a.space_id)
  );
$$;

grant execute on function public.wf_subject_readable(uuid) to authenticated;
grant execute on function public.wf_assignment_mine(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Row-level security
-- ---------------------------------------------------------------------------

alter table public.wf_subjects                 enable row level security;
alter table public.wf_curriculum_units         enable row level security;
alter table public.wf_assignments              enable row level security;
alter table public.wf_submissions              enable row level security;
alter table public.wf_grades                   enable row level security;
alter table public.wf_badges                   enable row level security;
alter table public.wf_badge_awards             enable row level security;
alter table public.wf_dev_milestones           enable row level security;
alter table public.wf_character_tracks         enable row level security;
alter table public.wf_character_logs           enable row level security;
alter table public.wf_catalog_badges           enable row level security;
alter table public.wf_catalog_character_tracks enable row level security;

-- subjects ------------------------------------------------------------------
drop policy if exists wf_subjects_read  on public.wf_subjects;
drop policy if exists wf_subjects_write on public.wf_subjects;
drop policy if exists wf_subjects_edit  on public.wf_subjects;
drop policy if exists wf_subjects_del   on public.wf_subjects;
create policy wf_subjects_read  on public.wf_subjects for select to authenticated
  using (wf_is_parent(space_id) or child_member_id = wf_my_member(space_id));
create policy wf_subjects_write on public.wf_subjects for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_subjects_edit  on public.wf_subjects for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
create policy wf_subjects_del   on public.wf_subjects for delete to authenticated using (wf_is_parent(space_id));

-- units ---------------------------------------------------------------------
drop policy if exists wf_curriculum_units_read  on public.wf_curriculum_units;
drop policy if exists wf_curriculum_units_write on public.wf_curriculum_units;
drop policy if exists wf_curriculum_units_edit  on public.wf_curriculum_units;
drop policy if exists wf_curriculum_units_del   on public.wf_curriculum_units;
create policy wf_curriculum_units_read  on public.wf_curriculum_units for select to authenticated
  using (wf_subject_readable(subject_id));
create policy wf_curriculum_units_write on public.wf_curriculum_units for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_curriculum_units_edit  on public.wf_curriculum_units for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
create policy wf_curriculum_units_del   on public.wf_curriculum_units for delete to authenticated using (wf_is_parent(space_id));

-- assignments ---------------------------------------------------------------
-- A child may move their OWN work along (not-started → in-progress →
-- submitted); only a parent may write 'graded', which the app does through
-- gradeAssignment. The child's update is bounded by the using/with-check pair.
drop policy if exists wf_assignments_read  on public.wf_assignments;
drop policy if exists wf_assignments_write on public.wf_assignments;
drop policy if exists wf_assignments_edit  on public.wf_assignments;
drop policy if exists wf_assignments_del   on public.wf_assignments;
create policy wf_assignments_read  on public.wf_assignments for select to authenticated
  using (wf_is_parent(space_id) or child_member_id = wf_my_member(space_id));
create policy wf_assignments_write on public.wf_assignments for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_assignments_edit  on public.wf_assignments for update to authenticated
  using (wf_is_parent(space_id) or child_member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or (child_member_id = wf_my_member(space_id) and status <> 'graded'));
create policy wf_assignments_del   on public.wf_assignments for delete to authenticated using (wf_is_parent(space_id));

-- submissions ---------------------------------------------------------------
drop policy if exists wf_submissions_read  on public.wf_submissions;
drop policy if exists wf_submissions_write on public.wf_submissions;
drop policy if exists wf_submissions_edit  on public.wf_submissions;
drop policy if exists wf_submissions_del   on public.wf_submissions;
create policy wf_submissions_read  on public.wf_submissions for select to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
create policy wf_submissions_write on public.wf_submissions for insert to authenticated
  with check (wf_is_member(space_id) and (wf_is_parent(space_id) or member_id = wf_my_member(space_id)));
create policy wf_submissions_edit  on public.wf_submissions for update to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
create policy wf_submissions_del   on public.wf_submissions for delete to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));

-- grades --------------------------------------------------------------------
-- The rule the whole module turns on: a child's select returns a mark only
-- once a parent has released it.
drop policy if exists wf_grades_read  on public.wf_grades;
drop policy if exists wf_grades_write on public.wf_grades;
drop policy if exists wf_grades_edit  on public.wf_grades;
drop policy if exists wf_grades_del   on public.wf_grades;
create policy wf_grades_read  on public.wf_grades for select to authenticated
  using (wf_is_parent(space_id) or (visible_to_child and wf_assignment_mine(assignment_id)));
create policy wf_grades_write on public.wf_grades for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_grades_edit  on public.wf_grades for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
create policy wf_grades_del   on public.wf_grades for delete to authenticated using (wf_is_parent(space_id));

-- badges --------------------------------------------------------------------
-- The catalogue is written FOR the children, so every member of the family can
-- read it: knowing what can be earned is the point of it.
drop policy if exists wf_badges_read  on public.wf_badges;
drop policy if exists wf_badges_write on public.wf_badges;
drop policy if exists wf_badges_edit  on public.wf_badges;
drop policy if exists wf_badges_del   on public.wf_badges;
create policy wf_badges_read  on public.wf_badges for select to authenticated using (wf_is_member(space_id));
create policy wf_badges_write on public.wf_badges for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_badges_edit  on public.wf_badges for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
create policy wf_badges_del   on public.wf_badges for delete to authenticated using (wf_is_parent(space_id));

-- awards --------------------------------------------------------------------
-- Own awards only: there is no sibling leaderboard to assemble.
drop policy if exists wf_badge_awards_read  on public.wf_badge_awards;
drop policy if exists wf_badge_awards_write on public.wf_badge_awards;
drop policy if exists wf_badge_awards_edit  on public.wf_badge_awards;
drop policy if exists wf_badge_awards_del   on public.wf_badge_awards;
create policy wf_badge_awards_read  on public.wf_badge_awards for select to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
create policy wf_badge_awards_write on public.wf_badge_awards for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_badge_awards_edit  on public.wf_badge_awards for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
create policy wf_badge_awards_del   on public.wf_badge_awards for delete to authenticated using (wf_is_parent(space_id));

-- milestones ----------------------------------------------------------------
-- A child may mark their own celebration; everything else is a parent's.
drop policy if exists wf_dev_milestones_read  on public.wf_dev_milestones;
drop policy if exists wf_dev_milestones_write on public.wf_dev_milestones;
drop policy if exists wf_dev_milestones_edit  on public.wf_dev_milestones;
drop policy if exists wf_dev_milestones_del   on public.wf_dev_milestones;
create policy wf_dev_milestones_read  on public.wf_dev_milestones for select to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
create policy wf_dev_milestones_write on public.wf_dev_milestones for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_dev_milestones_edit  on public.wf_dev_milestones for update to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
create policy wf_dev_milestones_del   on public.wf_dev_milestones for delete to authenticated using (wf_is_parent(space_id));

-- character tracks ----------------------------------------------------------
drop policy if exists wf_character_tracks_read  on public.wf_character_tracks;
drop policy if exists wf_character_tracks_write on public.wf_character_tracks;
drop policy if exists wf_character_tracks_edit  on public.wf_character_tracks;
drop policy if exists wf_character_tracks_del   on public.wf_character_tracks;
create policy wf_character_tracks_read  on public.wf_character_tracks for select to authenticated using (wf_is_member(space_id));
create policy wf_character_tracks_write on public.wf_character_tracks for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_character_tracks_edit  on public.wf_character_tracks for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
create policy wf_character_tracks_del   on public.wf_character_tracks for delete to authenticated using (wf_is_parent(space_id));

-- character logs ------------------------------------------------------------
drop policy if exists wf_character_logs_read  on public.wf_character_logs;
drop policy if exists wf_character_logs_write on public.wf_character_logs;
drop policy if exists wf_character_logs_edit  on public.wf_character_logs;
drop policy if exists wf_character_logs_del   on public.wf_character_logs;
create policy wf_character_logs_read  on public.wf_character_logs for select to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
create policy wf_character_logs_write on public.wf_character_logs for insert to authenticated
  with check (wf_is_member(space_id) and (wf_is_parent(space_id) or member_id = wf_my_member(space_id)));
create policy wf_character_logs_edit  on public.wf_character_logs for update to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
create policy wf_character_logs_del   on public.wf_character_logs for delete to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));

-- catalogue -----------------------------------------------------------------
drop policy if exists wf_catalog_badges_read on public.wf_catalog_badges;
create policy wf_catalog_badges_read on public.wf_catalog_badges for select to authenticated using (true);
drop policy if exists wf_catalog_character_tracks_read on public.wf_catalog_character_tracks;
create policy wf_catalog_character_tracks_read on public.wf_catalog_character_tracks for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 4. Pre-loaded content
-- ---------------------------------------------------------------------------

create or replace function public.wf_seed_curricula(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.wf_catalog_badges (organization_id, slug, name, kind, virtue_or_skill, criteria, icon)
  values
    (p_org, 'reader',        'Reader',        'skill',  'Reading',   'Finish twelve books, or read aloud every day for a month.', '📚'),
    (p_org, 'mathlete',      'Mathlete',      'skill',  'Maths',     'Average 80% or better across a term of maths.', '➗'),
    (p_org, 'scientist',     'Scientist',     'skill',  'Science',   'Plan, run and write up an investigation on your own.', '🔬'),
    (p_org, 'memory-master', 'Memory Master', 'skill',  'Scripture', 'Say twenty memory verses from memory, references and all.', '🧠'),
    (p_org, 'wordsmith',     'Wordsmith',     'skill',  'Writing',   'Write something a stranger would want to read.', '✍️'),
    (p_org, 'linguist',      'Linguist',      'skill',  'Language',  'Hold a five-minute conversation in another language with an elder.', '🗣️'),
    (p_org, 'coder',         'Coder',         'skill',  'Computing', 'Write a program someone else in the house actually uses.', '💻'),
    (p_org, 'musician',      'Musician',      'skill',  'Music',     'Play a piece all the way through, in front of people, without stopping.', '🎹'),
    (p_org, 'helper',        'Helper',        'virtue', 'Service',   'Do the job nobody asked you to do, three weeks running.', '🤝'),
    (p_org, 'kindness',      'Kindness',      'virtue', 'Love',      'Someone outside this house tells us you were kind to them.', '💛'),
    (p_org, 'diligence',     'Diligence',     'virtue', 'Diligence', 'Finish what you start, when it stopped being fun.', '🌱'),
    (p_org, 'courage',       'Courage',       'virtue', 'Courage',   'Do the thing you were afraid of, and tell us about it after.', '🦁')
  on conflict (organization_id, slug) do update
    set name = excluded.name, kind = excluded.kind, virtue_or_skill = excluded.virtue_or_skill,
        criteria = excluded.criteria, icon = excluded.icon;

  insert into public.wf_catalog_character_tracks (organization_id, slug, virtue, intro, challenges)
  values
    (p_org, 'diligence', 'Diligence',
     'One small thing a day — finished, not started.',
     array[
       'Make your bed before breakfast.','Finish your work before you open a screen.','Put every shoe in the rack, not near it.',
       'Do one job nobody asked you to do.','Read for ten minutes without stopping.','Clear the table after supper without being asked.',
       'Practise the hard thing twice.','Write neatly, even on the rough page.','Finish before you rest.',
       'Help someone younger for five minutes.','Start the thing you have been putting off.','Check your work before you say you are done.',
       'Put your things away where they live.','Do today''s jobs today.','Say what you will do, then do it.',
       'Work for twenty minutes with the door shut.','Redo the question you got wrong.','Do your chore before you are reminded.',
       'Finish the last page, not the last paragraph.','Tidy one drawer nobody can see.','Ask for help before you give up.',
       'Learn one thing by heart.','Do the washing-up properly, corners and all.','Get ready for tomorrow tonight.',
       'Work when nobody is watching.','Keep going for five more minutes.','Put the tools back the way you found them.',
       'Do the boring bit first.','Finish what you started this month.','Tell someone what you finished this month.'
     ]),
    (p_org, 'kindness', 'Kindness',
     'Kindness is a habit before it is a feeling.',
     array[
       'Say good morning to everyone before you speak about anything else.','Let someone else choose.','Give a real compliment.',
       'Do a sibling''s chore without telling them.','Ask someone how they slept, and listen.','Sit next to the person on their own.',
       'Say sorry first.','Write a note and leave it where it will be found.','Share the last one.',
       'Speak well of someone who is not in the room.','Hold the door and mean it.','Ask a neighbour if they need anything.',
       'Forgive quickly and say so.','Play the game the little one wants to play.','Thank someone who is never thanked.'
     ]),
    (p_org, 'generosity', 'Generosity',
     'Giving away time, money and the best seat.',
     array[
       'Give away something you still like.','Do a job for someone else, for free.','Put something in the offering yourself.',
       'Share the last one.','Write a thank-you note.','Invite someone in.','Give the best seat away.',
       'Pay for someone smaller than you.','Lend the thing you were saving.','Give an hour to someone who is lonely.'
     ]),
    (p_org, 'courage', 'Courage',
     'Doing the right and frightening thing, in small doses.',
     array[
       'Say the true thing kindly.','Try the thing you might be bad at.','Ask the question in front of everybody.',
       'Own up before you are caught.','Stand next to the one being left out.','Go first.',
       'Say no to something you know is wrong.','Read aloud without practising.','Tell a parent what is actually worrying you.',
       'Do the hard conversation today.'
     ])
  on conflict (organization_id, slug) do update
    set virtue = excluded.virtue, intro = excluded.intro, challenges = excluded.challenges;
end;
$$;

grant execute on function public.wf_seed_curricula(uuid) to authenticated;


-- ===========================================================================
-- MODULE 9/19 — tasks (businesses/wafe/sql/tasks.sql)
-- ===========================================================================
-- Wàfè — tasks: everything the family must do (list, board and calendar),
-- recurring chores worth Sprouts, the chore rota, the Sprouts ledger and the
-- rewards a child can spend them on.
--
-- Idempotent. Depends only on 00-foundation (wf_spaces, wf_members and the
-- helpers wf_is_member / wf_is_parent / wf_my_member / wf_can_see). Goals,
-- milestones, projects, trips and curricula live in other modules: we keep
-- their ids and join in the app, never across a schema boundary.
--
-- THE PRIVACY MODEL, in one paragraph: a task carries a visibility, a
-- shared_with list and a child_safe flag, and being ASSIGNED something is
-- itself a share — you cannot be asked to do a job you may not read. So the
-- read policy is wf_can_see(...) OR "my member id is in assignee_member_ids",
-- and a child additionally reaches a plain 'family' row only when it is a
-- child-safe chore (the family chores board). A guest therefore sees exactly
-- the tasks a parent handed them, and Ìfẹ́'s private client work is unreadable
-- to everyone else, parents included.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_tasks (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  space_id            uuid not null references public.wf_spaces(id) on delete cascade,
  title               text not null,
  notes               text not null default '',
  assignee_member_ids uuid[] not null default '{}',
  due_at              timestamptz,
  all_day             boolean not null default true,
  priority            text not null default 'normal' check (priority in ('low','normal','high')),
  scope               text not null default 'family' check (scope in ('me','us','family')),
  kind                text not null default 'task' check (kind in ('task','chore','errand','maintenance')),
  -- Ids owned by other modules; deliberately not foreign keys.
  goal_id             text,
  goal_label          text not null default '',
  milestone_id        text,
  milestone_label     text not null default '',
  project_id          text,
  trip_id             text,
  curriculum_id       text,
  value_id            text,
  status              text not null default 'todo' check (status in ('todo','doing','done','waiting')),
  kanban_order        integer not null default 0,
  -- The recurrence rule, as {freq, interval, weekday, monthDay}.
  rrule               jsonb,
  is_chore            boolean not null default false,
  sprouts             integer not null default 0 check (sprouts >= 0),
  needs_proof         boolean not null default false,
  proof_url           text,
  proof_submitted_at  timestamptz,
  proof_approved_by   uuid references public.wf_members(id) on delete set null,
  source_type         text not null default 'manual' check (source_type in ('manual','recurrence','rota','purchase','wardrobe','briefing','ai')),
  source_id           text,
  dropped_reason      text,
  reminders_sent      integer not null default 0 check (reminders_sent >= 0),
  owner_member_id     uuid references public.wf_members(id) on delete set null,
  visibility          text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with         uuid[] not null default '{}',
  child_safe          boolean not null default false,
  done_at             timestamptz,
  done_by             uuid references public.wf_members(id) on delete set null,
  created_by          uuid references public.wf_members(id) on delete set null,
  created_at          timestamptz not null default now()
);
create index if not exists idx_wf_tasks_space on public.wf_tasks(space_id, due_at);
create index if not exists idx_wf_tasks_status on public.wf_tasks(space_id, status, kanban_order);
create index if not exists idx_wf_tasks_assignees on public.wf_tasks using gin (assignee_member_ids);

create table if not exists public.wf_task_checklist (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  task_id         uuid not null references public.wf_tasks(id) on delete cascade,
  item            text not null,
  done            boolean not null default false,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_task_checklist_task on public.wf_task_checklist(task_id, sort_order);

create table if not exists public.wf_chore_rotas (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  name            text not null,
  chore_task_id   uuid not null references public.wf_tasks(id) on delete cascade,
  member_ids      uuid[] not null default '{}',
  rotation        text not null default 'weekly' check (rotation in ('weekly','fortnightly')),
  current_index   integer not null default 0 check (current_index >= 0),
  next_rotate_at  date not null default current_date,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_chore_rotas_space on public.wf_chore_rotas(space_id);

-- Every movement of Sprouts, with the record that caused it. Append-only by
-- policy: there is no update and no delete, so a balance can always be
-- explained by adding the rows up.
create table if not exists public.wf_sprouts_ledger (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  delta           integer not null,
  source_type     text not null default 'chore' check (source_type in ('chore','reward','adjustment','opening')),
  source_id       text,
  note            text not null default '',
  at              timestamptz not null default now()
);
create index if not exists idx_wf_sprouts_member on public.wf_sprouts_ledger(member_id, at desc);

create table if not exists public.wf_rewards (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  name            text not null,
  note            text not null default '',
  cost_sprouts    integer not null check (cost_sprouts > 0),
  kind            text not null default 'treat' check (kind in ('treat','screen','outing','money','privilege')),
  image_url       text,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_rewards_space on public.wf_rewards(space_id, cost_sprouts);

create table if not exists public.wf_redemptions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  reward_id       uuid not null references public.wf_rewards(id) on delete cascade,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  status          text not null default 'requested' check (status in ('requested','approved','declined','fulfilled')),
  cost_sprouts    integer not null default 0,
  decided_by      uuid references public.wf_members(id) on delete set null,
  note            text not null default '',
  at              timestamptz not null default now(),
  decided_at      timestamptz
);
create index if not exists idx_wf_redemptions_space on public.wf_redemptions(space_id, status);

-- ---------------------------------------------------------------------------
-- 2. Row-level security
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['wf_tasks','wf_task_checklist','wf_chore_rotas','wf_sprouts_ledger','wf_rewards','wf_redemptions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- May the session see this task? The standard visibility rule, widened by
-- assignment (you can read what you were asked to do) and narrowed for a
-- child, who reaches a plain 'family' row only when it is a child-safe chore.
create or replace function public.wf_task_visible(
  p_space uuid, p_owner uuid, p_visibility text, p_shared uuid[],
  p_assignees uuid[], p_is_chore boolean, p_child_safe boolean
) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_me   uuid;
  v_role text;
begin
  select m.id, m.role into v_me, v_role from wf_members m
  where m.space_id = p_space and m.user_id = auth.uid() limit 1;
  if v_me is null then return false; end if;
  if v_me = any (coalesce(p_assignees, '{}'::uuid[])) then return true; end if;
  if p_owner is not null and p_owner = v_me then return true; end if;
  if p_visibility = 'child' then return true; end if;
  if p_visibility = 'shared' then return v_me = any (coalesce(p_shared, '{}'::uuid[])); end if;
  if p_visibility = 'family' then
    if v_role = 'child' then return coalesce(p_is_chore, false) and coalesce(p_child_safe, false); end if;
    -- A guest is not a household member: 'family' is not enough on its own.
    return v_role = 'parent';
  end if;
  return false;
end $$;
grant execute on function public.wf_task_visible(uuid, uuid, text, uuid[], uuid[], boolean, boolean) to authenticated;

drop policy if exists wf_tasks_read on public.wf_tasks;
create policy wf_tasks_read on public.wf_tasks for select to authenticated
  using (wf_task_visible(space_id, owner_member_id, visibility, shared_with, assignee_member_ids, is_chore, child_safe));

-- Guests never create work; parents and children do (a child's own, which the
-- app constrains to themselves and the trigger below enforces).
drop policy if exists wf_tasks_write on public.wf_tasks;
create policy wf_tasks_write on public.wf_tasks for insert to authenticated
  with check (wf_is_member(space_id) and wf_my_role(space_id) in ('parent','child'));

-- Editing: parents, the owner, the creator — or an assignee, whose edit the
-- trigger keeps to ticking the job off.
drop policy if exists wf_tasks_edit on public.wf_tasks;
create policy wf_tasks_edit on public.wf_tasks for update to authenticated
  using (
    wf_is_parent(space_id)
    or owner_member_id = wf_my_member(space_id)
    or created_by = wf_my_member(space_id)
    or wf_my_member(space_id) = any (assignee_member_ids)
  )
  with check (
    wf_is_parent(space_id)
    or owner_member_id = wf_my_member(space_id)
    or created_by = wf_my_member(space_id)
    or wf_my_member(space_id) = any (assignee_member_ids)
  );

drop policy if exists wf_tasks_del on public.wf_tasks;
create policy wf_tasks_del on public.wf_tasks for delete to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id) or created_by = wf_my_member(space_id));

-- An assignee who is not a parent, the owner or the creator may move the job
-- along and nothing else: no reassigning, no repricing a chore, no approving
-- their own photo. This is what makes "a guest can complete" safe.
create or replace function public.wf_tasks_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_me uuid;
begin
  if auth.uid() is null or wf_is_parent(new.space_id) then return new; end if;
  v_me := wf_my_member(new.space_id);
  if v_me is not null and (old.owner_member_id = v_me or old.created_by = v_me) then
    -- Their own task: they may edit it, but not price a chore or bless a photo.
    if new.sprouts is distinct from old.sprouts
       or new.proof_approved_by is distinct from old.proof_approved_by then
      raise exception 'Only a parent can do that' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.assignee_member_ids is distinct from old.assignee_member_ids
     or new.sprouts is distinct from old.sprouts
     or new.is_chore is distinct from old.is_chore
     or new.needs_proof is distinct from old.needs_proof
     or new.visibility is distinct from old.visibility
     or new.shared_with is distinct from old.shared_with
     or new.child_safe is distinct from old.child_safe
     or new.title is distinct from old.title
     or new.due_at is distinct from old.due_at
     or new.proof_approved_by is distinct from old.proof_approved_by
     or new.reminders_sent is distinct from old.reminders_sent then
    raise exception 'You can tick this off, but not change it' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_wf_tasks_guard on public.wf_tasks;
create trigger trg_wf_tasks_guard before update on public.wf_tasks
  for each row execute function public.wf_tasks_guard();

-- Checklist items live and die with their task.
drop policy if exists wf_task_checklist_read on public.wf_task_checklist;
create policy wf_task_checklist_read on public.wf_task_checklist for select to authenticated
  using (exists (select 1 from wf_tasks t where t.id = task_id
                 and wf_task_visible(t.space_id, t.owner_member_id, t.visibility, t.shared_with, t.assignee_member_ids, t.is_chore, t.child_safe)));
drop policy if exists wf_task_checklist_write on public.wf_task_checklist;
create policy wf_task_checklist_write on public.wf_task_checklist for insert to authenticated with check (wf_is_member(space_id));
drop policy if exists wf_task_checklist_edit on public.wf_task_checklist;
create policy wf_task_checklist_edit on public.wf_task_checklist for update to authenticated
  using (exists (select 1 from wf_tasks t where t.id = task_id
                 and (wf_is_parent(t.space_id) or t.owner_member_id = wf_my_member(t.space_id) or wf_my_member(t.space_id) = any (t.assignee_member_ids))));
drop policy if exists wf_task_checklist_del on public.wf_task_checklist;
create policy wf_task_checklist_del on public.wf_task_checklist for delete to authenticated
  using (exists (select 1 from wf_tasks t where t.id = task_id and (wf_is_parent(t.space_id) or t.owner_member_id = wf_my_member(t.space_id))));

-- The rota: the family reads it (whose turn it is, is family news); parents run it.
drop policy if exists wf_chore_rotas_read on public.wf_chore_rotas;
create policy wf_chore_rotas_read on public.wf_chore_rotas for select to authenticated using (wf_is_member(space_id) and wf_my_role(space_id) in ('parent','child'));
drop policy if exists wf_chore_rotas_write on public.wf_chore_rotas;
create policy wf_chore_rotas_write on public.wf_chore_rotas for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_chore_rotas_edit on public.wf_chore_rotas;
create policy wf_chore_rotas_edit on public.wf_chore_rotas for update to authenticated
  using (wf_is_parent(space_id) or wf_my_member(space_id) = any (member_ids))
  with check (wf_is_parent(space_id) or wf_my_member(space_id) = any (member_ids));
drop policy if exists wf_chore_rotas_del on public.wf_chore_rotas;
create policy wf_chore_rotas_del on public.wf_chore_rotas for delete to authenticated using (wf_is_parent(space_id));

-- The Sprouts ledger: a child sees their own, parents see everyone's. Insert
-- only — there is no update and no delete policy, so the audit trail cannot be
-- rewritten, only added to (AC 5).
drop policy if exists wf_sprouts_ledger_read on public.wf_sprouts_ledger;
create policy wf_sprouts_ledger_read on public.wf_sprouts_ledger for select to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_sprouts_ledger_write on public.wf_sprouts_ledger;
create policy wf_sprouts_ledger_write on public.wf_sprouts_ledger for insert to authenticated
  with check (
    wf_is_member(space_id)
    and (
      -- A parent may credit or deduct anything.
      wf_is_parent(space_id)
      -- Anyone else may only credit themselves for a chore they were given
      -- and have finished, and only what that chore is worth.
      or (
        source_type = 'chore'
        and member_id = wf_my_member(space_id)
        and delta > 0
        and exists (
          select 1 from wf_tasks t
          where t.id::text = source_id and t.space_id = wf_sprouts_ledger.space_id
            and t.status = 'done' and t.is_chore and t.sprouts = delta
            and wf_my_member(t.space_id) = any (t.assignee_member_ids)
            and (not t.needs_proof or t.proof_approved_by is not null)
        )
      )
    )
  );

-- Rewards: the family reads the catalogue, parents keep it.
drop policy if exists wf_rewards_read on public.wf_rewards;
create policy wf_rewards_read on public.wf_rewards for select to authenticated using (wf_is_member(space_id) and wf_my_role(space_id) in ('parent','child'));
drop policy if exists wf_rewards_parent on public.wf_rewards;
create policy wf_rewards_parent on public.wf_rewards for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- Redemptions: a child asks for their own; only a parent decides (AC 10).
drop policy if exists wf_redemptions_read on public.wf_redemptions;
create policy wf_redemptions_read on public.wf_redemptions for select to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_redemptions_write on public.wf_redemptions;
create policy wf_redemptions_write on public.wf_redemptions for insert to authenticated
  with check (wf_is_member(space_id) and wf_my_role(space_id) in ('parent','child') and member_id = wf_my_member(space_id) and status = 'requested');
drop policy if exists wf_redemptions_edit on public.wf_redemptions;
create policy wf_redemptions_edit on public.wf_redemptions for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_redemptions_del on public.wf_redemptions;
create policy wf_redemptions_del on public.wf_redemptions for delete to authenticated
  using (wf_is_parent(space_id) or (member_id = wf_my_member(space_id) and status = 'requested'));

-- ---------------------------------------------------------------------------
-- 3. Pre-loaded content — starter chores and rewards, per tenant
-- ---------------------------------------------------------------------------
-- A family that has just signed up should not face two empty screens. These
-- are suggestions the New chore / New reward dialogs offer; nothing is copied
-- into a space until somebody chooses it.

create table if not exists public.wf_catalog_chores (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug            text not null,
  title           text not null,
  note            text not null default '',
  band            text not null default 'junior' check (band in ('little','junior','teen','young-adult','adult')),
  sprouts         integer not null default 5 check (sprouts >= 0),
  needs_proof     boolean not null default false,
  cadence         text not null default 'daily' check (cadence in ('daily','weekly','monthly')),
  unique (organization_id, slug)
);

create table if not exists public.wf_catalog_rewards (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug            text not null,
  name            text not null,
  note            text not null default '',
  cost_sprouts    integer not null default 50 check (cost_sprouts > 0),
  kind            text not null default 'treat' check (kind in ('treat','screen','outing','money','privilege')),
  unique (organization_id, slug)
);

do $$
declare t text;
begin
  foreach t in array array['wf_catalog_chores','wf_catalog_rewards'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select on public.%I to authenticated, anon', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select using (true)', t || '_read', t);
  end loop;
end $$;

create or replace function public.wf_seed_tasks(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into wf_catalog_chores (organization_id, slug, title, note, band, sprouts, needs_proof, cadence) values
    (p_org, 'tidy-shoes',    'Tidy the shoe rack',      'Everyone''s shoes in pairs, nothing on the floor.', 'little',      5,  true,  'weekly'),
    (p_org, 'lay-table',     'Lay the table',           'Before dinner, every night.',                        'little',      5,  false, 'daily'),
    (p_org, 'feed-the-pet',  'Feed the pet',            'Food and fresh water.',                              'junior',      10, false, 'daily'),
    (p_org, 'dishwasher',    'Empty the dishwasher',    'A good one for a rota.',                             'junior',      10, false, 'daily'),
    (p_org, 'hoover',        'Hoover the front room',   'Under the sofa too.',                                'junior',      20, true,  'weekly'),
    (p_org, 'bins',          'Bins out',                'Check which bin it is this week.',                   'teen',        15, false, 'weekly'),
    (p_org, 'tidy-room',     'Tidy your room',          'Floor clear, bed made.',                             'teen',        10, true,  'weekly'),
    (p_org, 'batch-cook',    'Help with the batch cook','An hour on Sunday afternoon.',                        'young-adult', 25, false, 'weekly')
  on conflict (organization_id, slug) do update
    set title = excluded.title, note = excluded.note, band = excluded.band,
        sprouts = excluded.sprouts, needs_proof = excluded.needs_proof, cadence = excluded.cadence;

  insert into wf_catalog_rewards (organization_id, slug, name, note, cost_sprouts, kind) values
    (p_org, 'screen-30',   'Extra 30 minutes screen time', 'One evening, after everything else is done.', 40,  'screen'),
    (p_org, 'pick-dinner', 'Choose Friday''s dinner',      'Anything somebody can cook.',                 60,  'privilege'),
    (p_org, 'bake',        'Bake together on Saturday',    'You pick what we make.',                      80,  'treat'),
    (p_org, 'pocket-money','Five into your account',       'Straight into your envelope.',                100, 'money'),
    (p_org, 'cinema',      'Saturday cinema',              'A ticket, a drink and popcorn.',              150, 'outing'),
    (p_org, 'day-out',     'A day out of your choosing',   'Within reason, and within a Saturday.',       300, 'outing')
  on conflict (organization_id, slug) do update
    set name = excluded.name, note = excluded.note, cost_sprouts = excluded.cost_sprouts, kind = excluded.kind;
end $$;
grant execute on function public.wf_seed_tasks(uuid) to authenticated;


-- ===========================================================================
-- MODULE 10/19 — goals (businesses/wafe/sql/goals.sql)
-- ===========================================================================
-- Wàfè — goals: the vision blueprint, goals with milestones, the OKR roadmap,
-- the measured numbers, celebrations, reviews and the nightly connection metrics.
--
-- Nine tables, one view and two helper functions. The interesting rules are
-- enforced here rather than in the client:
--
--   THE CHILD RULE. wf_can_see() already keeps a 'family' row away from a
--   child, so `select * from wf_goals` as a child returns their own goals and
--   the ones a parent explicitly marked 'child' — never a family goal's title,
--   never its description, never a number. A child still has to be able to see
--   that the family is saving for a house, so there is exactly one door for
--   that: the view wf_goals_child_safe, which returns child_safe_summary and a
--   computed percentage and NOTHING ELSE. There is no path by which a child's
--   session reads `title`, `description`, `why` or an amount on a goal that is
--   not theirs. That is the RLS test in the spec, and it is a single view.
--
--   THE PRIVATE-ME RULE. A 'me' goal with visibility 'private' is readable by
--   its owner alone — a parent has no override, because wf_can_see gives none.
--   Tunde's 100 km ride is genuinely invisible to Ìfẹ́.
--
--   PROGRESS IS COMPUTED. wf_goal_pct() counts milestones, or measures the
--   latest reading against its target, and only falls back to the stored
--   progress_pct when there is nothing to count and nothing to measure. The
--   view and any report use it, so the database agrees with the app.
--
-- Idempotent throughout: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

-- The vision blueprint. Never edited: a new version is inserted, and the app
-- diffs consecutive versions. The values snapshot is kept per version so the
-- diff can show a value being added the same season a five-year line changed.
create table if not exists public.wf_blueprints (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  version          integer not null default 1 check (version > 0),
  values_snapshot  text[] not null default '{}',
  mission          text not null default '',
  vision           text not null default '',
  -- [{ pillar, text, why }]
  goals_1y         jsonb not null default '[]'::jsonb,
  goals_3y         jsonb not null default '[]'::jsonb,
  goals_5y         jsonb not null default '[]'::jsonb,
  note             text not null default '',
  author_member_id uuid references public.wf_members(id) on delete set null,
  created_at       timestamptz not null default now(),
  unique (space_id, version)
);
create index if not exists idx_wf_blueprints_space on public.wf_blueprints(space_id, version desc);

create table if not exists public.wf_goals (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  space_id            uuid not null references public.wf_spaces(id) on delete cascade,
  title               text not null,
  -- What a child is told instead of the title. Never money, never detail.
  child_safe_summary  text not null default '',
  scope               text not null default 'family' check (scope in ('me','us','family')),
  owner_member_id     uuid references public.wf_members(id) on delete set null,
  pillar              text not null default 'execute'
                        check (pillar in ('faith','grow','execute','live','create','home','money','health')),
  -- A family value ("Diligence"), free text so a space can rename its values.
  value_label         text,
  horizon             text not null default 'year' check (horizon in ('quarter','year','multi-year')),
  target_date         date not null default current_date,
  status              text not null default 'active' check (status in ('active','paused','done')),
  description         text not null default '',
  why                 text not null default '',
  progress_mode       text not null default 'milestones' check (progress_mode in ('milestones','metric','manual')),
  -- Only consulted when there is nothing to count and nothing to measure.
  progress_pct        integer not null default 0 check (progress_pct between 0 and 100),
  -- The number this goal is measured by. Not an FK: the reading series lives in
  -- wf_goal_metrics and is written by whoever owns the number.
  metric_ref          text,
  cover_url           text,
  visibility          text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with         uuid[] not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  completed_at        timestamptz
);
create index if not exists idx_wf_goals_space on public.wf_goals(space_id, status);
create index if not exists idx_wf_goals_owner on public.wf_goals(owner_member_id);
create index if not exists idx_wf_goals_target on public.wf_goals(space_id, target_date);

create table if not exists public.wf_goal_milestones (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  goal_id          uuid not null references public.wf_goals(id) on delete cascade,
  title            text not null,
  due_date         date,
  item_order       integer not null default 1,
  -- Null until it is ticked; the timestamp is what "no progress in 21 days" reads.
  done_at          timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_goal_milestones_goal on public.wf_goal_milestones(goal_id, item_order);

create table if not exists public.wf_okrs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  -- "2026-Q3"
  quarter          text not null check (quarter ~ '^[0-9]{4}-Q[1-4]$'),
  objective        text not null,
  goal_ids         uuid[] not null default '{}',
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_okrs_space on public.wf_okrs(space_id, quarter);

create table if not exists public.wf_key_results (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  okr_id           uuid not null references public.wf_okrs(id) on delete cascade,
  text             text not null,
  target           numeric not null default 1,
  current_value    numeric not null default 0,
  unit             text not null default '',
  item_order       integer not null default 1
);
create index if not exists idx_wf_key_results_okr on public.wf_key_results(okr_id, item_order);

-- A series of readings, not a single value: the goal then has a history, and
-- "nothing has moved in three weeks" is a fact rather than a guess.
create table if not exists public.wf_goal_metrics (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  metric_ref       text not null,
  label            text not null default '',
  source           text not null default 'manual' check (source in ('finance-fund','books','tasks','manual')),
  unit             text not null default 'count' check (unit in ('cents','count','km','pct')),
  target           numeric not null default 1,
  current_value    numeric not null default 0,
  read_at          timestamptz not null default now(),
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_goal_metrics_ref on public.wf_goal_metrics(space_id, metric_ref, read_at desc);

create table if not exists public.wf_celebrations (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  goal_id          uuid not null references public.wf_goals(id) on delete cascade,
  date             date not null default current_date,
  photo_url        text,
  reflection       text not null default '',
  -- The one line the shareable card carries.
  card_line        text not null default '',
  member_ids       uuid[] not null default '{}',
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_celebrations_space on public.wf_celebrations(space_id, date desc);

create table if not exists public.wf_goal_reviews (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  kind             text not null default 'sunday' check (kind in ('sunday','quarter')),
  -- "2026-09-06" for a Sunday, "2026-Q3" for a quarter.
  period           text not null,
  notes            text not null default '',
  focus_goal_ids   uuid[] not null default '{}',
  author_member_id uuid references public.wf_members(id) on delete set null,
  created_at       timestamptz not null default now(),
  unique (space_id, kind, period)
);

-- The connection metrics, stored nightly: how much of what the household does
-- is attached to something they said mattered.
create table if not exists public.wf_goal_connection (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid not null references public.organizations(id) on delete cascade,
  space_id                  uuid not null references public.wf_spaces(id) on delete cascade,
  date                      date not null default current_date,
  tasks_with_goal_pct       integer not null default 0 check (tasks_with_goal_pct between 0 and 100),
  goals_with_milestone_pct  integer not null default 0 check (goals_with_milestone_pct between 0 and 100),
  tasks_counted             integer not null default 0,
  goals_counted             integer not null default 0,
  created_at                timestamptz not null default now(),
  unique (space_id, date)
);
create index if not exists idx_wf_goal_connection_space on public.wf_goal_connection(space_id, date desc);

-- Pre-loaded starter goals, one per value, offered on a fresh space.
create table if not exists public.wf_catalog_goal_starters (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  slug             text not null,
  value_label      text not null,
  pillar           text not null,
  title            text not null,
  child_safe       text not null default '',
  why              text not null default '',
  horizon          text not null default 'year',
  -- [{ title, inDays }]
  milestones       jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now(),
  unique (organization_id, slug)
);

-- ---------------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------------

-- Progress, computed: milestones first, then the latest reading of the linked
-- number, and only then the stored percentage.
create or replace function public.wf_goal_pct(p_goal uuid) returns integer
language plpgsql stable security definer set search_path = public as $$
declare
  v_total  integer;
  v_done   integer;
  v_ref    text;
  v_pct    integer;
  v_cur    numeric;
  v_target numeric;
begin
  select count(*), count(*) filter (where done_at is not null)
    into v_total, v_done
    from wf_goal_milestones where goal_id = p_goal;
  if v_total > 0 then
    return round(100.0 * v_done / v_total);
  end if;

  select metric_ref, progress_pct into v_ref, v_pct from wf_goals where id = p_goal;
  if v_ref is not null then
    select m.current_value, m.target into v_cur, v_target
      from wf_goal_metrics m
      join wf_goals g on g.id = p_goal and g.space_id = m.space_id
     where m.metric_ref = v_ref
     order by m.read_at desc limit 1;
    if v_target is not null and v_target > 0 then
      return least(100, greatest(0, round(100.0 * v_cur / v_target)::integer));
    end if;
  end if;

  return coalesce(v_pct, 0);
end $$;

-- May the caller read this goal at all (the ordinary visibility rule)?
create or replace function public.wf_goal_readable(p_goal uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wf_goals g
    where g.id = p_goal
      and wf_can_see(g.space_id, g.owner_member_id, g.visibility, g.shared_with)
  );
$$;

-- Does this objective pull on a goal the caller owns? (So a young adult sees
-- the objective their own goal sits under, and nothing else.)
create or replace function public.wf_okr_mine(p_okr uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wf_okrs o
    join public.wf_goals g on g.id = any (o.goal_ids)
    where o.id = p_okr and g.owner_member_id = wf_my_member(o.space_id)
  );
$$;

grant execute on function public.wf_goal_pct(uuid) to authenticated;
grant execute on function public.wf_goal_readable(uuid) to authenticated;
grant execute on function public.wf_okr_mine(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Row-level security
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['wf_blueprints','wf_goals','wf_goal_milestones','wf_okrs','wf_key_results',
                           'wf_goal_metrics','wf_celebrations','wf_goal_reviews','wf_goal_connection',
                           'wf_catalog_goal_starters'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Blueprints: the whole family reads the vision; parents write versions.
drop policy if exists wf_blueprints_read on public.wf_blueprints;
drop policy if exists wf_blueprints_write on public.wf_blueprints;
drop policy if exists wf_blueprints_del on public.wf_blueprints;
create policy wf_blueprints_read  on public.wf_blueprints for select to authenticated using (wf_is_member(space_id));
create policy wf_blueprints_write on public.wf_blueprints for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_blueprints_del   on public.wf_blueprints for delete to authenticated using (wf_is_parent(space_id));
-- No update policy on purpose: history is written, never rewritten.

-- Goals: the ordinary visibility rule, so a child gets their own and the ones
-- explicitly marked for children, and a private 'me' goal is the owner's alone.
drop policy if exists wf_goals_read  on public.wf_goals;
drop policy if exists wf_goals_write on public.wf_goals;
drop policy if exists wf_goals_edit  on public.wf_goals;
drop policy if exists wf_goals_del   on public.wf_goals;
create policy wf_goals_read  on public.wf_goals for select to authenticated
  using (wf_can_see(space_id, owner_member_id, visibility, shared_with));
create policy wf_goals_write on public.wf_goals for insert to authenticated
  with check (
    wf_is_member(space_id)
    and (wf_is_parent(space_id) or (scope = 'me' and owner_member_id = wf_my_member(space_id)))
  );
create policy wf_goals_edit  on public.wf_goals for update to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or (scope = 'me' and owner_member_id = wf_my_member(space_id)));
create policy wf_goals_del   on public.wf_goals for delete to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));

-- Milestones follow their goal, in both directions.
drop policy if exists wf_goal_milestones_read  on public.wf_goal_milestones;
drop policy if exists wf_goal_milestones_write on public.wf_goal_milestones;
drop policy if exists wf_goal_milestones_edit  on public.wf_goal_milestones;
drop policy if exists wf_goal_milestones_del   on public.wf_goal_milestones;
create policy wf_goal_milestones_read  on public.wf_goal_milestones for select to authenticated
  using (wf_is_member(space_id) and wf_goal_readable(goal_id));
create policy wf_goal_milestones_write on public.wf_goal_milestones for insert to authenticated
  with check (wf_is_member(space_id) and exists (
    select 1 from public.wf_goals g where g.id = goal_id
      and (wf_is_parent(g.space_id) or g.owner_member_id = wf_my_member(g.space_id))));
create policy wf_goal_milestones_edit  on public.wf_goal_milestones for update to authenticated
  using (exists (select 1 from public.wf_goals g where g.id = goal_id
      and (wf_is_parent(g.space_id) or g.owner_member_id = wf_my_member(g.space_id))));
create policy wf_goal_milestones_del   on public.wf_goal_milestones for delete to authenticated
  using (exists (select 1 from public.wf_goals g where g.id = goal_id
      and (wf_is_parent(g.space_id) or g.owner_member_id = wf_my_member(g.space_id))));

-- OKRs: parents run the roadmap; a member sees an objective only when one of
-- their own goals is under it.
drop policy if exists wf_okrs_read on public.wf_okrs;
drop policy if exists wf_okrs_all  on public.wf_okrs;
create policy wf_okrs_read on public.wf_okrs for select to authenticated
  using (wf_is_parent(space_id) or (wf_is_member(space_id) and wf_okr_mine(id)));
create policy wf_okrs_all  on public.wf_okrs for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_key_results_read on public.wf_key_results;
drop policy if exists wf_key_results_all  on public.wf_key_results;
create policy wf_key_results_read on public.wf_key_results for select to authenticated
  using (wf_is_parent(space_id) or (wf_is_member(space_id) and wf_okr_mine(okr_id)));
create policy wf_key_results_all  on public.wf_key_results for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- Measured numbers: parents, or the owner of the goal the number belongs to —
-- and never a money amount to a child, whatever they own.
drop policy if exists wf_goal_metrics_read  on public.wf_goal_metrics;
drop policy if exists wf_goal_metrics_write on public.wf_goal_metrics;
drop policy if exists wf_goal_metrics_del   on public.wf_goal_metrics;
create policy wf_goal_metrics_read on public.wf_goal_metrics for select to authenticated
  using (
    wf_is_parent(space_id)
    or (
      wf_is_member(space_id)
      and unit <> 'cents'
      and exists (select 1 from public.wf_goals g
                  where g.space_id = wf_goal_metrics.space_id
                    and g.metric_ref = wf_goal_metrics.metric_ref
                    and g.owner_member_id = wf_my_member(g.space_id))
    )
  );
create policy wf_goal_metrics_write on public.wf_goal_metrics for insert to authenticated
  with check (
    wf_is_parent(space_id)
    or (wf_is_member(space_id) and exists (
          select 1 from public.wf_goals g
          where g.space_id = wf_goal_metrics.space_id
            and g.metric_ref = wf_goal_metrics.metric_ref
            and g.owner_member_id = wf_my_member(g.space_id)))
  );
create policy wf_goal_metrics_del on public.wf_goal_metrics for delete to authenticated using (wf_is_parent(space_id));
-- No update policy: a reading is a fact with a timestamp. Record a new one.

-- Celebrations are the family timeline: everyone in the house reads them.
drop policy if exists wf_celebrations_read  on public.wf_celebrations;
drop policy if exists wf_celebrations_write on public.wf_celebrations;
drop policy if exists wf_celebrations_edit  on public.wf_celebrations;
drop policy if exists wf_celebrations_del   on public.wf_celebrations;
create policy wf_celebrations_read  on public.wf_celebrations for select to authenticated using (wf_is_member(space_id));
create policy wf_celebrations_write on public.wf_celebrations for insert to authenticated
  with check (wf_is_member(space_id) and exists (
    select 1 from public.wf_goals g where g.id = goal_id
      and (wf_is_parent(g.space_id) or g.owner_member_id = wf_my_member(g.space_id))));
create policy wf_celebrations_edit  on public.wf_celebrations for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
create policy wf_celebrations_del   on public.wf_celebrations for delete to authenticated using (wf_is_parent(space_id));

-- Reviews and connection metrics are parents' business, start to finish.
drop policy if exists wf_goal_reviews_parent on public.wf_goal_reviews;
create policy wf_goal_reviews_parent on public.wf_goal_reviews for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_goal_connection_parent on public.wf_goal_connection;
create policy wf_goal_connection_parent on public.wf_goal_connection for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- The starter catalogue is content, not data: anyone signed in may read it.
drop policy if exists wf_catalog_goal_starters_read on public.wf_catalog_goal_starters;
create policy wf_catalog_goal_starters_read on public.wf_catalog_goal_starters for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 4. The one door a child has onto the family's goals
-- ---------------------------------------------------------------------------
-- child_safe_summary and a computed percentage. No title, no description, no
-- "why", no metric_ref, no amount, no owner. A child's session can select
-- everything this view has and still learn nothing it should not.

drop view if exists public.wf_goals_child_safe;
create view public.wf_goals_child_safe as
  select g.id,
         g.space_id,
         g.child_safe_summary,
         g.pillar,
         g.status,
         g.horizon,
         g.target_date,
         g.scope,
         wf_goal_pct(g.id) as pct
    from public.wf_goals g
   where wf_is_member(g.space_id)
     and g.scope <> 'me'
     and g.visibility in ('family', 'child')
     and coalesce(nullif(btrim(g.child_safe_summary), ''), null) is not null;

grant select on public.wf_goals_child_safe to authenticated;

comment on view public.wf_goals_child_safe is
  'Family goals as a child may see them: the child-safe summary and a computed percentage, never the title or any amount.';

-- ---------------------------------------------------------------------------
-- 5. Pre-loaded content for a new business on this blueprint
-- ---------------------------------------------------------------------------

create or replace function public.wf_seed_goals(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.wf_catalog_goal_starters (organization_id, slug, value_label, pillar, title, child_safe, why, horizon, milestones)
  values
    (p_org, 'read-a-gospel', 'Faith', 'faith', 'Read a whole gospel together',
     'We''re reading a Bible book together',
     'So the children have heard a whole story rather than the famous bits.', 'quarter',
     '[{"title":"Agree the evenings and the pace","inDays":7},
       {"title":"First quarter of the book","inDays":28},
       {"title":"Halfway, and one meal to talk about it","inDays":56},
       {"title":"Finish it, and write down what stuck","inDays":90}]'::jsonb),
    (p_org, 'one-table-a-week', 'Love', 'live', 'One meal a week with everybody at the table',
     'One dinner a week, all of us together',
     'It is the cheapest thing on this list and the one the children will remember.', 'quarter',
     '[{"title":"Pick the night and put it in the calendar","inDays":3},
       {"title":"Four weeks in a row","inDays":30},
       {"title":"Invite someone from outside the family","inDays":60}]'::jsonb),
    (p_org, 'emergency-fund', 'Diligence', 'money', 'Build an emergency fund',
     'We''re putting money aside for surprises',
     'The boiler, the car and the roof will all happen. Better to them than to our peace.', 'year',
     '[{"title":"Agree the target and open the account","inDays":7},
       {"title":"A standing order that leaves on payday","inDays":14},
       {"title":"Halfway","inDays":180},
       {"title":"Fully funded","inDays":365}]'::jsonb),
    (p_org, 'give-on-purpose', 'Generosity', 'faith', 'Give on purpose, not on impulse',
     'We''re saving up to help people',
     'Because generosity that waits for a spare moment never happens.', 'year',
     '[{"title":"Decide the share and who it goes to","inDays":14},
       {"title":"Set it up so it leaves before we see it","inDays":21},
       {"title":"Review it at the half-year","inDays":180}]'::jsonb),
    (p_org, 'something-we-made', 'Joy', 'create', 'Make one thing together this year',
     'We''re making something together',
     'A recording, a garden bed, a recipe book — something the children can point at.', 'year',
     '[{"title":"Choose it together","inDays":14},
       {"title":"Start it","inDays":45},
       {"title":"Finish it and show somebody","inDays":300}]'::jsonb),
    (p_org, 'settle-the-school-year', 'Diligence', 'execute', 'Begin the school year prepared',
     'Getting everything ready for school',
     'The first fortnight sets the tone for the other eleven months.', 'quarter',
     '[{"title":"Research and settle the plan","inDays":14},
       {"title":"Applications and forms in","inDays":30},
       {"title":"Uniform, shoes and supplies","inDays":45},
       {"title":"Agree the mornings and the bedtimes","inDays":60}]'::jsonb),
    (p_org, 'move-every-week', 'Diligence', 'health', 'Everybody moves three times a week',
     'We''re all getting stronger',
     'Two parents who can still keep up in ten years, three children who swim.', 'year',
     '[{"title":"Pick what each of us is doing","inDays":7},
       {"title":"Four weeks without missing","inDays":30},
       {"title":"One thing we do together outdoors","inDays":90}]'::jsonb)
  on conflict (organization_id, slug) do update
    set value_label = excluded.value_label,
        pillar      = excluded.pillar,
        title       = excluded.title,
        child_safe  = excluded.child_safe,
        why         = excluded.why,
        horizon     = excluded.horizon,
        milestones  = excluded.milestones;
end;
$$;

grant execute on function public.wf_seed_goals(uuid) to authenticated;


-- ===========================================================================
-- MODULE 11/19 — projects (businesses/wafe/sql/projects.sql)
-- ===========================================================================
-- Wàfè — projects: the projects themselves, their boards, costs, research
-- vault (clips + rich notes), weighted comparisons and decision records.
--
-- Idempotent. Depends only on 00-foundation (wf_spaces, wf_members and the
-- helpers wf_is_member / wf_is_parent / wf_is_child / wf_my_member /
-- wf_can_see); it never references another module's tables. A task that
-- belongs to a project carries this project's id in the Tasks module and is
-- joined in the app — there is no foreign key across the seam.
--
-- THE PRIVACY MODEL, in one paragraph: a project is reachable by a parent
-- always, by a child only when they are on it AND it is child_safe, and by a
-- guest only when it was explicitly shared with them (visibility 'shared' with
-- their member id in shared_with) — "granted named objects, never modules".
-- Everything hanging off a project inherits that reachability, and notes add
-- one more gate: anything classed other than 'general' is parents-only, so a
-- child on the sixth-form project reads the open-evening notes and not the
-- bursary maths. ARCHIVED IS READ-ONLY: every write policy below requires
-- wf_project_open(), and the project row itself is guarded by a trigger, so an
-- archived project cannot be edited by anyone, parents included.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_projects (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete cascade,
  space_id               uuid not null references public.wf_spaces(id) on delete cascade,
  title                  text not null,
  summary                text not null default '',
  kind                   text not null default 'family' check (kind in ('home','family','school','business','trip','creative')),
  status                 text not null default 'planning' check (status in ('planning','active','paused','done')),
  owner_member_id        uuid references public.wf_members(id) on delete set null,
  start_date             date not null default current_date,
  end_date               date,
  cover_url              text,
  budget_cents           integer check (budget_cents is null or budget_cents >= 0),
  -- The Finance module's stable category key ("housing", "education", …).
  finance_category_id    text,
  finance_category_label text not null default '',
  -- Ids into other modules; joined in the app, never by a foreign key.
  goal_id                uuid,
  goal_label             text not null default '',
  trip_id                uuid,
  value_id               text,
  tags                   text[] not null default '{}',
  visibility             text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with            uuid[] not null default '{}',
  child_safe             boolean not null default true,
  archived               boolean not null default false,
  archived_at            timestamptz,
  -- The decision shown on the header; set after the decision row exists.
  decision_id            uuid,
  created_at             timestamptz not null default now()
);
create index if not exists idx_wf_projects_space on public.wf_projects(space_id, archived);

create table if not exists public.wf_project_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  project_id      uuid not null references public.wf_projects(id) on delete cascade,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  role            text not null default 'member' check (role in ('owner','member','watcher')),
  created_at      timestamptz not null default now(),
  unique (project_id, member_id)
);
create index if not exists idx_wf_project_members_project on public.wf_project_members(project_id);

-- The board. A card is the project's own row; a Task that names this project
-- is shown beside these without either module writing the other's table.
create table if not exists public.wf_project_cards (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  space_id            uuid not null references public.wf_spaces(id) on delete cascade,
  project_id          uuid not null references public.wf_projects(id) on delete cascade,
  title               text not null,
  notes               text not null default '',
  assignee_member_ids uuid[] not null default '{}',
  due_at              timestamptz,
  status              text not null default 'todo' check (status in ('todo','doing','done')),
  card_order          integer not null default 0,
  checklist           jsonb not null default '[]'::jsonb,
  child_safe          boolean not null default true,
  done_at             timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists idx_wf_project_cards_project on public.wf_project_cards(project_id, status, card_order);

-- Money booked against the project: quotes, deposits, invoices. Parents only.
create table if not exists public.wf_project_costs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  project_id      uuid not null references public.wf_projects(id) on delete cascade,
  label           text not null,
  amount_cents    integer not null default 0 check (amount_cents >= 0),
  paid_on         date not null default current_date,
  stage           text not null default 'quote' check (stage in ('quote','deposit','paid')),
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_project_costs_project on public.wf_project_costs(project_id, paid_on desc);

-- The research vault. `snapshot_text` is the readable copy of the page, kept
-- with the row so the clip still reads when the page is gone, and
-- `snapshot_source` says where it came from — we never present a snapshot
-- without saying how it was captured.
create table if not exists public.wf_project_clips (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  project_id      uuid references public.wf_projects(id) on delete set null,
  folder          text not null default 'Inbox',
  url             text not null,
  title           text not null default '',
  excerpt         text not null default '',
  image_url       text,
  snapshot_text   text not null default '',
  snapshot_source text not null default 'selection' check (snapshot_source in ('selection','companion','typed')),
  tags            text[] not null default '{}',
  saved_by        uuid references public.wf_members(id) on delete set null,
  visibility      text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with     uuid[] not null default '{}',
  child_safe      boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_project_clips_space on public.wf_project_clips(space_id, created_at desc);
create index if not exists idx_wf_project_clips_project on public.wf_project_clips(project_id);

create table if not exists public.wf_project_notes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  project_id      uuid references public.wf_projects(id) on delete set null,
  folder          text not null default 'Inbox',
  title           text not null,
  -- Blocks: [{id, type: h|p|ul|todo|quote, text, done}]
  blocks          jsonb not null default '[]'::jsonb,
  tags            text[] not null default '{}',
  sensitivity     text not null default 'general' check (sensitivity in ('general','financial','health','documents','private')),
  owner_member_id uuid references public.wf_members(id) on delete set null,
  visibility      text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with     uuid[] not null default '{}',
  child_safe      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_wf_project_notes_space on public.wf_project_notes(space_id, updated_at desc);
create index if not exists idx_wf_project_notes_project on public.wf_project_notes(project_id);

create table if not exists public.wf_project_comparisons (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  project_id      uuid not null references public.wf_projects(id) on delete cascade,
  title           text not null,
  -- criteria: [{key,label,weight 1-5}] · options: [{key,label,note,link}]
  criteria        jsonb not null default '[]'::jsonb,
  options         jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_project_comparisons_project on public.wf_project_comparisons(project_id);

create table if not exists public.wf_project_scores (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  comparison_id   uuid not null references public.wf_project_comparisons(id) on delete cascade,
  option_key      text not null,
  criterion_key   text not null,
  score           integer not null default 0 check (score between 0 and 10),
  created_at      timestamptz not null default now(),
  unique (comparison_id, option_key, criterion_key)
);
create index if not exists idx_wf_project_scores_comparison on public.wf_project_scores(comparison_id);

create table if not exists public.wf_project_decisions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  project_id      uuid not null references public.wf_projects(id) on delete cascade,
  comparison_id   uuid references public.wf_project_comparisons(id) on delete set null,
  decision        text not null,
  because         text not null default '',
  decided_by      uuid references public.wf_members(id) on delete set null,
  decided_at      timestamptz not null default now()
);
create index if not exists idx_wf_project_decisions_project on public.wf_project_decisions(project_id, decided_at desc);

-- Starter project templates every new family gets, keyed by tenant.
create table if not exists public.wf_catalog_project_templates (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug            text not null,
  title           text not null,
  kind            text not null default 'family',
  summary         text not null default '',
  cards           text[] not null default '{}',
  criteria        text[] not null default '{}',
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  unique (organization_id, slug)
);

-- ---------------------------------------------------------------------------
-- 2. Reachability helpers
-- ---------------------------------------------------------------------------

-- May this session see the project at all? Parent: always. Child: only a
-- child-safe project they are on. Guest: only one explicitly shared with them.
create or replace function public.wf_project_visible(p_project uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  p record;
  me uuid;
begin
  select pr.space_id, pr.owner_member_id, pr.visibility, pr.shared_with, pr.child_safe
    into p from wf_projects pr where pr.id = p_project;
  if p.space_id is null or not wf_is_member(p.space_id) then return false; end if;
  if wf_is_parent(p.space_id) then return true; end if;
  me := wf_my_member(p.space_id);
  if p.owner_member_id = me then return true; end if;
  if wf_is_child(p.space_id) then
    if not p.child_safe then return false; end if;
    if not exists (select 1 from wf_project_members m where m.project_id = p_project and m.member_id = me) then return false; end if;
    return wf_can_see(p.space_id, p.owner_member_id, p.visibility, p.shared_with);
  end if;
  -- A guest holds granted objects only: explicitly shared, nothing else.
  return p.visibility = 'shared' and me = any (p.shared_with);
end $$;
grant execute on function public.wf_project_visible(uuid) to authenticated;

-- Is the project still open for writing? Archived is read-only for everyone.
create or replace function public.wf_project_open(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select not pr.archived from wf_projects pr where pr.id = p_project), false);
$$;
grant execute on function public.wf_project_open(uuid) to authenticated;

-- May this session add and move work inside the project?
create or replace function public.wf_project_can_work(p_project uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  p record;
  me uuid;
begin
  select pr.space_id, pr.archived, pr.owner_member_id into p from wf_projects pr where pr.id = p_project;
  if p.space_id is null or p.archived or not wf_is_member(p.space_id) then return false; end if;
  if wf_is_parent(p.space_id) then return true; end if;
  me := wf_my_member(p.space_id);
  if p.owner_member_id = me then return true; end if;
  -- Guests never write; children write only on a project they are on.
  if not wf_is_child(p.space_id) then return false; end if;
  -- A watcher reads the project; only the owner and its members work on it.
  return exists (select 1 from wf_project_members m where m.project_id = p_project and m.member_id = me and m.role <> 'watcher');
end $$;
grant execute on function public.wf_project_can_work(uuid) to authenticated;

-- May this session run the project row itself (rename, re-scope, decide)?
create or replace function public.wf_project_can_run(p_project uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  p record;
begin
  select pr.space_id, pr.archived, pr.owner_member_id into p from wf_projects pr where pr.id = p_project;
  if p.space_id is null or not wf_is_member(p.space_id) then return false; end if;
  return wf_is_parent(p.space_id) or p.owner_member_id = wf_my_member(p.space_id);
end $$;
grant execute on function public.wf_project_can_run(uuid) to authenticated;

-- Archived means read-only: the only update an archived project accepts is
-- the one that un-archives it.
create or replace function public.wf_projects_archive_guard() returns trigger
language plpgsql as $$
begin
  if old.archived and new.archived then
    if (to_jsonb(new) - 'archived' - 'archived_at') is distinct from (to_jsonb(old) - 'archived' - 'archived_at') then
      raise exception 'This project is archived. Restore it before making changes.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists wf_projects_archive_guard on public.wf_projects;
create trigger wf_projects_archive_guard before update on public.wf_projects
  for each row execute function public.wf_projects_archive_guard();

-- ---------------------------------------------------------------------------
-- 3. Row-level security
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'wf_projects','wf_project_members','wf_project_cards','wf_project_costs',
    'wf_project_clips','wf_project_notes','wf_project_comparisons','wf_project_scores',
    'wf_project_decisions','wf_catalog_project_templates'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Projects
drop policy if exists wf_projects_read on public.wf_projects;
create policy wf_projects_read on public.wf_projects for select to authenticated using (wf_project_visible(id));
-- A parent may create any project; a young adult may own one of their own.
drop policy if exists wf_projects_write on public.wf_projects;
create policy wf_projects_write on public.wf_projects for insert to authenticated with check (
  wf_is_parent(space_id)
  or (owner_member_id = wf_my_member(space_id)
      and exists (select 1 from wf_members m where m.id = wf_my_member(space_id) and m.role = 'child' and m.age_band = 'young-adult'))
);
drop policy if exists wf_projects_edit on public.wf_projects;
create policy wf_projects_edit on public.wf_projects for update to authenticated
  using (wf_project_can_run(id)) with check (wf_project_can_run(id));
drop policy if exists wf_projects_del on public.wf_projects;
create policy wf_projects_del on public.wf_projects for delete to authenticated using (wf_project_can_run(id));

-- Project members follow their project.
drop policy if exists wf_project_members_read on public.wf_project_members;
create policy wf_project_members_read on public.wf_project_members for select to authenticated using (wf_project_visible(project_id));
drop policy if exists wf_project_members_write on public.wf_project_members;
create policy wf_project_members_write on public.wf_project_members for insert to authenticated with check (wf_project_can_run(project_id) and wf_project_open(project_id));
drop policy if exists wf_project_members_edit on public.wf_project_members;
create policy wf_project_members_edit on public.wf_project_members for update to authenticated
  using (wf_project_can_run(project_id) and wf_project_open(project_id)) with check (wf_project_can_run(project_id));
drop policy if exists wf_project_members_del on public.wf_project_members;
create policy wf_project_members_del on public.wf_project_members for delete to authenticated using (wf_project_can_run(project_id) and wf_project_open(project_id));

-- Board cards: visible with the project, and a child sees only the child-safe
-- ones. Writing needs an open project and a place on it.
drop policy if exists wf_project_cards_read on public.wf_project_cards;
create policy wf_project_cards_read on public.wf_project_cards for select to authenticated
  using (wf_project_visible(project_id) and (child_safe or not wf_is_child(space_id)));
drop policy if exists wf_project_cards_write on public.wf_project_cards;
create policy wf_project_cards_write on public.wf_project_cards for insert to authenticated with check (wf_project_can_work(project_id));
drop policy if exists wf_project_cards_edit on public.wf_project_cards;
create policy wf_project_cards_edit on public.wf_project_cards for update to authenticated
  using (wf_project_can_work(project_id)) with check (wf_project_can_work(project_id));
drop policy if exists wf_project_cards_del on public.wf_project_cards;
create policy wf_project_cards_del on public.wf_project_cards for delete to authenticated using (wf_project_can_work(project_id));

-- Costs are money: parents only, both ways.
drop policy if exists wf_project_costs_read on public.wf_project_costs;
create policy wf_project_costs_read on public.wf_project_costs for select to authenticated using (wf_is_parent(space_id));
drop policy if exists wf_project_costs_write on public.wf_project_costs;
create policy wf_project_costs_write on public.wf_project_costs for insert to authenticated with check (wf_is_parent(space_id) and wf_project_open(project_id));
drop policy if exists wf_project_costs_edit on public.wf_project_costs;
create policy wf_project_costs_edit on public.wf_project_costs for update to authenticated
  using (wf_is_parent(space_id) and wf_project_open(project_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_project_costs_del on public.wf_project_costs;
create policy wf_project_costs_del on public.wf_project_costs for delete to authenticated using (wf_is_parent(space_id) and wf_project_open(project_id));

-- Clips: yours always; otherwise the project's reachability plus the adult
-- visibility rule, and the child-safe gate on top for a child's session.
drop policy if exists wf_project_clips_read on public.wf_project_clips;
create policy wf_project_clips_read on public.wf_project_clips for select to authenticated
  using (
    wf_is_member(space_id)
    and (
      saved_by = wf_my_member(space_id)
      or (
        (project_id is null or wf_project_visible(project_id))
        and wf_can_see(space_id, saved_by, visibility, shared_with)
        and (child_safe or not wf_is_child(space_id))
        and (project_id is not null or wf_is_parent(space_id))
      )
    )
  );
drop policy if exists wf_project_clips_write on public.wf_project_clips;
create policy wf_project_clips_write on public.wf_project_clips for insert to authenticated
  with check (wf_is_member(space_id) and wf_my_role(space_id) <> 'guest' and saved_by = wf_my_member(space_id) and (project_id is null or wf_project_can_work(project_id)));
drop policy if exists wf_project_clips_edit on public.wf_project_clips;
create policy wf_project_clips_edit on public.wf_project_clips for update to authenticated
  using ((wf_is_parent(space_id) or saved_by = wf_my_member(space_id)) and (project_id is null or wf_project_open(project_id)))
  with check (wf_is_parent(space_id) or saved_by = wf_my_member(space_id));
drop policy if exists wf_project_clips_del on public.wf_project_clips;
create policy wf_project_clips_del on public.wf_project_clips for delete to authenticated
  using ((wf_is_parent(space_id) or saved_by = wf_my_member(space_id)) and (project_id is null or wf_project_open(project_id)));

-- Notes carry a sensitivity class as well as a visibility. Anything but
-- 'general' is parents-only, whatever the visibility says (AC 6).
drop policy if exists wf_project_notes_read on public.wf_project_notes;
create policy wf_project_notes_read on public.wf_project_notes for select to authenticated
  using (
    wf_is_member(space_id)
    and (
      wf_is_parent(space_id)
      or owner_member_id = wf_my_member(space_id)
      or (
        sensitivity = 'general'
        and (project_id is null or wf_project_visible(project_id))
        and wf_can_see(space_id, owner_member_id, visibility, shared_with)
        and (child_safe or not wf_is_child(space_id))
        and (project_id is not null or wf_is_parent(space_id))
      )
    )
  );
drop policy if exists wf_project_notes_write on public.wf_project_notes;
create policy wf_project_notes_write on public.wf_project_notes for insert to authenticated
  with check (
    wf_is_member(space_id) and wf_my_role(space_id) <> 'guest'
    and owner_member_id = wf_my_member(space_id)
    and (sensitivity = 'general' or wf_is_parent(space_id))
    and (project_id is null or wf_project_can_work(project_id))
  );
drop policy if exists wf_project_notes_edit on public.wf_project_notes;
create policy wf_project_notes_edit on public.wf_project_notes for update to authenticated
  using ((wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id)) and (project_id is null or wf_project_open(project_id)))
  with check ((wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id)) and (sensitivity = 'general' or wf_is_parent(space_id)));
drop policy if exists wf_project_notes_del on public.wf_project_notes;
create policy wf_project_notes_del on public.wf_project_notes for delete to authenticated
  using ((wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id)) and (project_id is null or wf_project_open(project_id)));

-- Comparisons and their scores follow the project.
drop policy if exists wf_project_comparisons_read on public.wf_project_comparisons;
create policy wf_project_comparisons_read on public.wf_project_comparisons for select to authenticated using (wf_project_visible(project_id));
drop policy if exists wf_project_comparisons_write on public.wf_project_comparisons;
create policy wf_project_comparisons_write on public.wf_project_comparisons for insert to authenticated with check (wf_project_can_work(project_id));
drop policy if exists wf_project_comparisons_edit on public.wf_project_comparisons;
create policy wf_project_comparisons_edit on public.wf_project_comparisons for update to authenticated
  using (wf_project_can_work(project_id)) with check (wf_project_can_work(project_id));
drop policy if exists wf_project_comparisons_del on public.wf_project_comparisons;
create policy wf_project_comparisons_del on public.wf_project_comparisons for delete to authenticated using (wf_project_can_work(project_id));

drop policy if exists wf_project_scores_read on public.wf_project_scores;
create policy wf_project_scores_read on public.wf_project_scores for select to authenticated
  using (exists (select 1 from wf_project_comparisons c where c.id = comparison_id and wf_project_visible(c.project_id)));
drop policy if exists wf_project_scores_write on public.wf_project_scores;
create policy wf_project_scores_write on public.wf_project_scores for insert to authenticated
  with check (exists (select 1 from wf_project_comparisons c where c.id = comparison_id and wf_project_can_work(c.project_id)));
drop policy if exists wf_project_scores_edit on public.wf_project_scores;
create policy wf_project_scores_edit on public.wf_project_scores for update to authenticated
  using (exists (select 1 from wf_project_comparisons c where c.id = comparison_id and wf_project_can_work(c.project_id)))
  with check (exists (select 1 from wf_project_comparisons c where c.id = comparison_id and wf_project_can_work(c.project_id)));
drop policy if exists wf_project_scores_del on public.wf_project_scores;
create policy wf_project_scores_del on public.wf_project_scores for delete to authenticated
  using (exists (select 1 from wf_project_comparisons c where c.id = comparison_id and wf_project_can_work(c.project_id)));

-- Decision records are the point of the module: readable with the project,
-- written by whoever may run it.
drop policy if exists wf_project_decisions_read on public.wf_project_decisions;
create policy wf_project_decisions_read on public.wf_project_decisions for select to authenticated using (wf_project_visible(project_id));
drop policy if exists wf_project_decisions_write on public.wf_project_decisions;
create policy wf_project_decisions_write on public.wf_project_decisions for insert to authenticated
  with check (wf_project_can_run(project_id) and wf_project_open(project_id));
drop policy if exists wf_project_decisions_edit on public.wf_project_decisions;
create policy wf_project_decisions_edit on public.wf_project_decisions for update to authenticated
  using (wf_project_can_run(project_id) and wf_project_open(project_id)) with check (wf_project_can_run(project_id));
drop policy if exists wf_project_decisions_del on public.wf_project_decisions;
create policy wf_project_decisions_del on public.wf_project_decisions for delete to authenticated
  using (wf_project_can_run(project_id) and wf_project_open(project_id));

-- The starter catalogue is readable by anyone signed in to the tenant.
drop policy if exists wf_catalog_project_templates_read on public.wf_catalog_project_templates;
create policy wf_catalog_project_templates_read on public.wf_catalog_project_templates for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 4. Pre-loaded content for a new business
-- ---------------------------------------------------------------------------
-- The projects most families actually run, with the board they usually need
-- and the criteria they usually argue about. A new family starts from these
-- rather than from an empty page.
create or replace function public.wf_seed_projects(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into wf_catalog_project_templates (organization_id, slug, title, kind, summary, cards, criteria, sort_order)
  values
    (p_org, 'kitchen-refresh', 'Kitchen refresh', 'home',
     'Measure, quote, choose, and survive six weeks of microwave dinners.',
     array['Measure up and draw the plan','Get three quotes','Score the fitters together','Choose the fitter and sign','Pay the deposit','Empty the cupboards','Choose the worktop','Book the electrician','Order handles and taps','Arrange a skip','Snagging walk-through'],
     array['Lead time','Reviews','Price','Warranty'], 1),
    (p_org, 'school-search', 'School or sixth-form search', 'school',
     'Every option within a sane journey, scored on what your family actually cares about.',
     array['List every option in range','Book the open evenings','Visit them','Score them together','Check the journey at rush hour','Submit the application','Write the decision down'],
     array['Results in the subjects that matter','Journey','Pastoral care','Costs and bursaries','Where leavers go'], 2),
    (p_org, 'science-fair', 'A child''s science fair', 'school',
     'One question, one fair test, one poster they can talk through without reading it.',
     array['Pick the question','Build the model','Run the test three times','Draw the results chart','Make the poster','Practise saying it out loud'],
     array['How interesting','How safe','How cheap'], 3),
    (p_org, 'trip-planning', 'A big trip', 'trip',
     'Flights, documents, and what you carry for the people at the other end.',
     array['Book the flights','Check every passport''s expiry','Vaccinations and certificates','Ask what to bring','Arrange the time off','Pack'],
     array['Cost','Dates that work','Who we see','Journey'], 4),
    (p_org, 'client-sprint', 'A client project', 'business',
     'For the parent who works for themselves: brief, routes, delivery, invoice.',
     array['Discovery call and brief','Competitor sweep','Three routes','Present the routes','Artwork and handover','Invoice on delivery'],
     array['Fee','Fit with what we do','Timeline','Chance of repeat work'], 5),
    (p_org, 'buy-a-car', 'Choosing a car', 'family',
     'Three options, six criteria, and a decision you can explain in a year.',
     array['Set the budget','Shortlist three','Test drive each','Check the history','Score them','Decide and write it down'],
     array['Running cost','Boot and seats','Safety','Reliability','Price'], 6)
  on conflict (organization_id, slug) do update
    set title = excluded.title,
        kind = excluded.kind,
        summary = excluded.summary,
        cards = excluded.cards,
        criteria = excluded.criteria,
        sort_order = excluded.sort_order;
end $$;
grant execute on function public.wf_seed_projects(uuid) to authenticated;


-- ===========================================================================
-- MODULE 12/19 — calendar (businesses/wafe/sql/calendar.sql)
-- ===========================================================================
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


-- ===========================================================================
-- MODULE 13/19 — finance (businesses/wafe/sql/finance.sql)
-- ===========================================================================
-- Wàfè — finance: accounts, budget categories, the ledger, bills and their
-- payments, budget alerts, the purchase pipeline (wishes, approvals, the
-- "Buy X" job), personal envelopes, savings pots and the module's settings.
--
-- Idempotent. Depends only on 00-foundation (wf_spaces, wf_members and the
-- helpers wf_is_member / wf_is_parent / wf_my_member); it never references
-- another module's tables. A goal a savings pot measures keeps the Goals
-- module's id in `goal_id` and is joined in the app — there is no foreign key
-- across the seam.
--
-- THE PRIVACY MODEL, in one paragraph. Money is parents-only, and that line is
-- drawn in the database, not the UI: every table below reads and writes under
-- wf_is_parent(space_id). There are exactly three deliberate exceptions, and
-- each of them is something that genuinely belongs to the person rather than
-- to the household:
--
--   1. WISHES. Anyone in the family may ask for something, and may see their
--      OWN asks and what was decided — and nobody else's. That is what makes
--      the child's wish form real rather than a form that posts into a void.
--   2. ENVELOPES. A young adult with an envelope reads their own envelope row
--      and the ledger rows tagged with it. Their £25 is theirs to see; the
--      family's £4,200 is not.
--   3. BUDGET CATEGORIES. A parent may grant `finance.view` to a teenager
--      (the permission matrix has it, and Dami has it) — that grant, and only
--      that grant, opens the CATEGORY table for reading. It opens nothing
--      else: there is still no ledger, no bill, no pipeline, no pot detail.
--
-- Everything else — the ledger, the bills, the alerts, the approvals, the
-- pots, the settings — returns zero rows to a child or a guest at the API.
--
-- REPORTING CURRENCY. `amount_cents` is what left the account, in `currency`;
-- `amount_home_cents` is the same money in the SPACE's currency at `fx_rate`,
-- stamped once on the day. Every total the product shows adds
-- `amount_home_cents`, so a naira deposit on the Lagos house and a pound of
-- groceries are comparable and the giving percentage stays honest.

-- ---------------------------------------------------------------------------
-- 1. Helpers
-- ---------------------------------------------------------------------------

-- Parent, or a member a parent has explicitly granted `finance.view`.
create or replace function public.wf_finance_can_view(p_space uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wf_members m
    where m.space_id = p_space and m.user_id = auth.uid()
      and (m.role = 'parent' or coalesce((m.grants ->> 'finance.view')::boolean, false))
  );
$$;
grant execute on function public.wf_finance_can_view(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_finance_accounts (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  space_id              uuid not null references public.wf_spaces(id) on delete cascade,
  name                  text not null,
  kind                  text not null default 'bank' check (kind in ('cash','bank','savings','mobile_money')),
  currency              text not null default 'GBP',
  opening_balance_cents integer not null default 0,
  active                boolean not null default true,
  created_at            timestamptz not null default now()
);
create index if not exists idx_wf_fin_accounts_space on public.wf_finance_accounts(space_id);

-- A category with a monthly limit IS a budget. The ids are stable across the
-- product ("groceries", "tithes", …) because other modules name them, so the
-- primary key is text rather than a uuid.
create table if not exists public.wf_finance_categories (
  id                   text not null,
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  space_id             uuid not null references public.wf_spaces(id) on delete cascade,
  name                 text not null,
  kind                 text not null default 'expense' check (kind in ('income','expense')),
  monthly_budget_cents integer not null default 0 check (monthly_budget_cents >= 0),
  is_giving            boolean not null default false,
  is_food              boolean not null default false,
  is_savings           boolean not null default false,
  colour               text not null default 'sage',
  sort_order           integer not null default 0,
  active               boolean not null default true,
  created_at           timestamptz not null default now(),
  primary key (space_id, id)
);

create table if not exists public.wf_finance_entries (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  space_id          uuid not null references public.wf_spaces(id) on delete cascade,
  entry_date        date not null default current_date,
  kind              text not null default 'expense' check (kind in ('income','expense')),
  amount_cents      integer not null check (amount_cents >= 0),
  currency          text not null default 'GBP',
  fx_rate           numeric(18,8) not null default 1 check (fx_rate > 0),
  amount_home_cents integer not null check (amount_home_cents >= 0),
  category_id       text not null default 'other',
  account_id        uuid references public.wf_finance_accounts(id) on delete set null,
  member_id         uuid references public.wf_members(id) on delete set null,
  value_id          text,
  payee             text not null default '',
  note              text not null default '',
  receipt_url       text,
  recipient         text not null default '',
  bill_id           uuid,
  envelope_id       uuid,
  wish_id           uuid,
  savings_goal_id   uuid,
  created_by        uuid references public.wf_members(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index if not exists idx_wf_fin_entries_space_date on public.wf_finance_entries(space_id, entry_date desc);
create index if not exists idx_wf_fin_entries_category on public.wf_finance_entries(space_id, category_id, entry_date);
create index if not exists idx_wf_fin_entries_envelope on public.wf_finance_entries(envelope_id) where envelope_id is not null;

create table if not exists public.wf_finance_bills (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  name            text not null,
  amount_cents    integer not null default 0 check (amount_cents >= 0),
  category_id     text not null default 'home',
  account_id      uuid references public.wf_finance_accounts(id) on delete set null,
  due_day         integer not null default 1 check (due_day between 1 and 28),
  freq            text not null default 'monthly' check (freq in ('monthly','quarterly','yearly')),
  autopay         boolean not null default false,
  active          boolean not null default true,
  -- Rule 12: three reminders, then it parks in Needs attention.
  reminders_sent  integer not null default 0 check (reminders_sent >= 0),
  note            text not null default '',
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_fin_bills_space on public.wf_finance_bills(space_id, active);

create table if not exists public.wf_finance_bill_payments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  bill_id         uuid not null references public.wf_finance_bills(id) on delete cascade,
  -- 'YYYY-MM': one payment per bill per period, and the database says so.
  month           text not null check (month ~ '^\d{4}-\d{2}$'),
  paid_at         timestamptz not null default now(),
  ledger_entry_id uuid references public.wf_finance_entries(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (bill_id, month)
);

-- One row per category per threshold per month: the row IS the "fired once"
-- guarantee, so a re-run of the checker inserts nothing.
create table if not exists public.wf_finance_alerts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  category_id     text not null,
  month           text not null check (month ~ '^\d{4}-\d{2}$'),
  threshold       integer not null check (threshold in (80, 100)),
  spent_cents     integer not null default 0,
  budget_cents    integer not null default 0,
  fired_at        timestamptz not null default now(),
  seen_at         timestamptz,
  unique (space_id, category_id, month, threshold)
);

create table if not exists public.wf_finance_wishes (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  name             text not null,
  link             text not null default '',
  price_cents      integer not null default 0 check (price_cents >= 0),
  requested_by     uuid not null references public.wf_members(id) on delete cascade,
  reason           text not null default '',
  category_id      text not null default 'other',
  status           text not null default 'requested' check (status in ('requested','approved','deferred','declined','planned','bought')),
  priority         text not null default 'normal' check (priority in ('low','normal','high')),
  planned_month    text check (planned_month is null or planned_month ~ '^\d{4}-\d{2}$'),
  decision_comment text not null default '',
  buy_task_id      uuid,
  ledger_entry_id  uuid references public.wf_finance_entries(id) on delete set null,
  image_url        text,
  source_type      text not null default 'manual' check (source_type in ('manual','child-wish','wardrobe','project','travel')),
  source_id        uuid,
  created_at       timestamptz not null default now(),
  decided_at       timestamptz,
  bought_at        timestamptz
);
create index if not exists idx_wf_fin_wishes_space on public.wf_finance_wishes(space_id, status);
create index if not exists idx_wf_fin_wishes_member on public.wf_finance_wishes(requested_by);

-- One parent, one vote: the unique key is what makes "two DISTINCT parents"
-- true even if somebody clicks approve twice.
create table if not exists public.wf_finance_wish_approvals (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  wish_id          uuid not null references public.wf_finance_wishes(id) on delete cascade,
  parent_member_id uuid not null references public.wf_members(id) on delete cascade,
  decision         text not null check (decision in ('approve','defer','decline')),
  comment          text not null default '',
  decided_at       timestamptz not null default now(),
  unique (wish_id, parent_member_id)
);

-- The job an approval creates. It lives here rather than in wf_tasks because a
-- module never writes another module's rows; the dashboard surfaces it on the
-- assignee's Today, which is where a job is felt.
create table if not exists public.wf_finance_buy_tasks (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  space_id           uuid not null references public.wf_spaces(id) on delete cascade,
  wish_id            uuid not null references public.wf_finance_wishes(id) on delete cascade,
  title              text not null,
  assignee_member_id uuid references public.wf_members(id) on delete set null,
  due_date           date not null default current_date,
  done               boolean not null default false,
  created_by         uuid references public.wf_members(id) on delete set null,
  created_at         timestamptz not null default now(),
  done_at            timestamptz
);
create index if not exists idx_wf_fin_buy_tasks_space on public.wf_finance_buy_tasks(space_id, done);

create table if not exists public.wf_finance_envelopes (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  space_id             uuid not null references public.wf_spaces(id) on delete cascade,
  member_id            uuid not null references public.wf_members(id) on delete cascade,
  monthly_amount_cents integer not null default 0 check (monthly_amount_cents >= 0),
  balance_cents        integer not null default 0,
  granted_by           uuid references public.wf_members(id) on delete set null,
  note                 text not null default '',
  last_topped_up       text not null default '',
  created_at           timestamptz not null default now(),
  unique (space_id, member_id)
);

create table if not exists public.wf_finance_savings_goals (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  name            text not null,
  -- The Goals module's goal this pot measures. Joined in the app.
  goal_id         uuid,
  goal_label      text not null default '',
  target_cents    integer not null default 0 check (target_cents >= 0),
  current_cents   integer not null default 0,
  account_id      uuid references public.wf_finance_accounts(id) on delete set null,
  note            text not null default '',
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_fin_pots_space on public.wf_finance_savings_goals(space_id);

create table if not exists public.wf_finance_settings (
  space_id                 uuid primary key references public.wf_spaces(id) on delete cascade,
  organization_id          uuid not null references public.organizations(id) on delete cascade,
  currency                 text not null default 'GBP',
  -- Above this, a purchase needs two different parents to say yes.
  approval_threshold_cents integer not null default 30000 check (approval_threshold_cents >= 0),
  -- Minutes of idle before a money write asks "is it still you?".
  reauth_minutes           integer not null default 15 check (reauth_minutes between 1 and 240),
  fx_rates                 jsonb not null default '{}'::jsonb,
  tithe_pct                numeric(5,2) not null default 10,
  note                     text not null default '',
  updated_at               timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Row-level security
-- ---------------------------------------------------------------------------

alter table public.wf_finance_accounts       enable row level security;
alter table public.wf_finance_categories     enable row level security;
alter table public.wf_finance_entries        enable row level security;
alter table public.wf_finance_bills          enable row level security;
alter table public.wf_finance_bill_payments  enable row level security;
alter table public.wf_finance_alerts         enable row level security;
alter table public.wf_finance_wishes         enable row level security;
alter table public.wf_finance_wish_approvals enable row level security;
alter table public.wf_finance_buy_tasks      enable row level security;
alter table public.wf_finance_envelopes      enable row level security;
alter table public.wf_finance_savings_goals  enable row level security;
alter table public.wf_finance_settings       enable row level security;

-- Parents only, full stop.
drop policy if exists wf_fin_accounts_all on public.wf_finance_accounts;
create policy wf_fin_accounts_all on public.wf_finance_accounts for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_fin_bills_all on public.wf_finance_bills;
create policy wf_fin_bills_all on public.wf_finance_bills for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_fin_bill_payments_all on public.wf_finance_bill_payments;
create policy wf_fin_bill_payments_all on public.wf_finance_bill_payments for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_fin_alerts_all on public.wf_finance_alerts;
create policy wf_fin_alerts_all on public.wf_finance_alerts for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_fin_approvals_all on public.wf_finance_wish_approvals;
create policy wf_fin_approvals_all on public.wf_finance_wish_approvals for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_fin_buy_tasks_all on public.wf_finance_buy_tasks;
create policy wf_fin_buy_tasks_all on public.wf_finance_buy_tasks for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_fin_pots_all on public.wf_finance_savings_goals;
create policy wf_fin_pots_all on public.wf_finance_savings_goals for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_fin_settings_all on public.wf_finance_settings;
create policy wf_fin_settings_all on public.wf_finance_settings for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- Categories: parents write; a member granted finance.view may READ them, and
-- nothing else. That grant buys a budget overview, never a ledger.
drop policy if exists wf_fin_categories_read on public.wf_finance_categories;
create policy wf_fin_categories_read on public.wf_finance_categories for select to authenticated
  using (wf_finance_can_view(space_id));
drop policy if exists wf_fin_categories_write on public.wf_finance_categories;
create policy wf_fin_categories_write on public.wf_finance_categories for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_fin_categories_edit on public.wf_finance_categories;
create policy wf_fin_categories_edit on public.wf_finance_categories for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_fin_categories_del on public.wf_finance_categories;
create policy wf_fin_categories_del on public.wf_finance_categories for delete to authenticated using (wf_is_parent(space_id));

-- The ledger: parents, plus a young adult's OWN envelope rows and nothing else.
drop policy if exists wf_fin_entries_read on public.wf_finance_entries;
create policy wf_fin_entries_read on public.wf_finance_entries for select to authenticated
  using (
    wf_is_parent(space_id)
    or (
      envelope_id is not null
      and exists (
        select 1 from public.wf_finance_envelopes e
        where e.id = wf_finance_entries.envelope_id and e.member_id = wf_my_member(space_id)
      )
    )
  );
drop policy if exists wf_fin_entries_write on public.wf_finance_entries;
create policy wf_fin_entries_write on public.wf_finance_entries for insert to authenticated
  with check (
    wf_is_parent(space_id)
    or (
      envelope_id is not null
      and exists (
        select 1 from public.wf_finance_envelopes e
        where e.id = envelope_id and e.member_id = wf_my_member(space_id)
      )
    )
  );
drop policy if exists wf_fin_entries_edit on public.wf_finance_entries;
create policy wf_fin_entries_edit on public.wf_finance_entries for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_fin_entries_del on public.wf_finance_entries;
create policy wf_fin_entries_del on public.wf_finance_entries for delete to authenticated using (wf_is_parent(space_id));

-- The budget overview a `finance.view` grant buys, and the ONLY way a
-- non-parent ever reaches the ledger: aggregated in the database, one row per
-- category, so nothing itemised crosses the wire. The demo sums the same
-- numbers in memory, so both modes show a teenager the same overview.
create or replace function public.wf_finance_month_summary(p_space uuid, p_month text)
returns table (category_id text, spent_cents bigint, income_cents bigint)
language sql security definer set search_path = public stable as $$
  select e.category_id,
         coalesce(sum(case when e.kind = 'expense' then e.amount_home_cents else 0 end), 0)::bigint,
         coalesce(sum(case when e.kind = 'income'  then e.amount_home_cents else 0 end), 0)::bigint
  from public.wf_finance_entries e
  where e.space_id = p_space
    and to_char(e.entry_date, 'YYYY-MM') = p_month
    and public.wf_finance_can_view(p_space)
  group by e.category_id;
$$;
grant execute on function public.wf_finance_month_summary(uuid, text) to authenticated;

-- Wishes: anyone may ask, and see their own asks and the answer. Parents see
-- the whole pipeline and are the only ones who may decide it.
drop policy if exists wf_fin_wishes_read on public.wf_finance_wishes;
create policy wf_fin_wishes_read on public.wf_finance_wishes for select to authenticated
  using (wf_is_parent(space_id) or requested_by = wf_my_member(space_id));
drop policy if exists wf_fin_wishes_write on public.wf_finance_wishes;
create policy wf_fin_wishes_write on public.wf_finance_wishes for insert to authenticated
  with check (wf_is_member(space_id) and (wf_is_parent(space_id) or requested_by = wf_my_member(space_id)));
drop policy if exists wf_fin_wishes_edit on public.wf_finance_wishes;
create policy wf_fin_wishes_edit on public.wf_finance_wishes for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_fin_wishes_del on public.wf_finance_wishes;
create policy wf_fin_wishes_del on public.wf_finance_wishes for delete to authenticated
  using (wf_is_parent(space_id) or (requested_by = wf_my_member(space_id) and status = 'requested'));

-- A child may ask, but never decide: only a parent may change the status.
create or replace function public.wf_finance_wish_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or wf_is_parent(new.space_id) then return new; end if;
  new.status           := 'requested';
  new.decision_comment := '';
  new.buy_task_id      := null;
  new.ledger_entry_id  := null;
  new.planned_month    := null;
  new.requested_by     := wf_my_member(new.space_id);
  return new;
end $$;
drop trigger if exists wf_finance_wish_guard_ins on public.wf_finance_wishes;
create trigger wf_finance_wish_guard_ins before insert on public.wf_finance_wishes
  for each row execute function public.wf_finance_wish_guard();

-- Envelopes: a parent runs them; the person they belong to reads their own and
-- may spend it down (the balance is the only column they may move).
drop policy if exists wf_fin_envelopes_read on public.wf_finance_envelopes;
create policy wf_fin_envelopes_read on public.wf_finance_envelopes for select to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_fin_envelopes_write on public.wf_finance_envelopes;
create policy wf_fin_envelopes_write on public.wf_finance_envelopes for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_fin_envelopes_edit on public.wf_finance_envelopes;
create policy wf_fin_envelopes_edit on public.wf_finance_envelopes for update to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_fin_envelopes_del on public.wf_finance_envelopes;
create policy wf_fin_envelopes_del on public.wf_finance_envelopes for delete to authenticated using (wf_is_parent(space_id));

create or replace function public.wf_finance_envelope_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or wf_is_parent(new.space_id) then return new; end if;
  -- The owner may spend it down. They may not top it up or move the allowance.
  new.monthly_amount_cents := old.monthly_amount_cents;
  new.last_topped_up       := old.last_topped_up;
  new.member_id            := old.member_id;
  new.granted_by           := old.granted_by;
  if new.balance_cents > old.balance_cents then
    raise exception 'Only a parent can add to an envelope';
  end if;
  return new;
end $$;
drop trigger if exists wf_finance_envelope_guard_upd on public.wf_finance_envelopes;
create trigger wf_finance_envelope_guard_upd before update on public.wf_finance_envelopes
  for each row execute function public.wf_finance_envelope_guard();

-- ---------------------------------------------------------------------------
-- 4. Pre-loaded content: the starter budget every new family gets
-- ---------------------------------------------------------------------------

-- The category ids other modules name ("groceries" for Wellness, "home" for
-- Projects) exist from the first minute, so a family never meets an empty
-- budget screen and no other module has to cope with a missing key.
create table if not exists public.wf_catalog_finance_categories (
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  id                   text not null,
  name                 text not null,
  kind                 text not null default 'expense',
  monthly_budget_cents integer not null default 0,
  is_giving            boolean not null default false,
  is_food              boolean not null default false,
  is_savings           boolean not null default false,
  colour               text not null default 'sage',
  sort_order           integer not null default 0,
  primary key (organization_id, id)
);
alter table public.wf_catalog_finance_categories enable row level security;
drop policy if exists wf_catalog_finance_read on public.wf_catalog_finance_categories;
create policy wf_catalog_finance_read on public.wf_catalog_finance_categories for select to authenticated using (true);

create or replace function public.wf_seed_finance(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.wf_catalog_finance_categories (organization_id, id, name, kind, monthly_budget_cents, is_giving, is_food, is_savings, colour, sort_order)
  values
    (p_org, 'income',      'Salary',            'income',  0, false, false, false, 'sage',  0),
    (p_org, 'consultancy', 'Other income',      'income',  0, false, false, false, 'mint',  1),
    (p_org, 'housing',     'Housing',           'expense', 0, false, false, false, 'brand', 2),
    (p_org, 'groceries',   'Groceries',         'expense', 0, false, true,  false, 'mint',  3),
    (p_org, 'tithes',      'Tithe',             'expense', 0, true,  false, false, 'live',  4),
    (p_org, 'giving',      'Giving & gifts',    'expense', 0, true,  false, false, 'ochre', 5),
    (p_org, 'savings',     'Savings',           'expense', 0, false, false, true,  'sage',  6),
    (p_org, 'transport',   'Transport',         'expense', 0, false, false, false, 'terra', 7),
    (p_org, 'education',   'Education',         'expense', 0, false, false, false, 'plum',  8),
    (p_org, 'home',        'Home & bills',      'expense', 0, false, false, false, 'brand', 9),
    (p_org, 'health',      'Health',            'expense', 0, false, false, false, 'mint',  10),
    (p_org, 'fun',         'Fun & eating out',  'expense', 0, false, false, false, 'ochre', 11),
    (p_org, 'holidays',    'Holidays & travel', 'expense', 0, false, false, false, 'plum',  12),
    (p_org, 'other',       'Everything else',   'expense', 0, false, false, false, 'sage',  13)
  on conflict (organization_id, id) do update
    set name = excluded.name, kind = excluded.kind, is_giving = excluded.is_giving,
        is_food = excluded.is_food, is_savings = excluded.is_savings,
        colour = excluded.colour, sort_order = excluded.sort_order;
end $$;
grant execute on function public.wf_seed_finance(uuid) to authenticated;

-- Copy the catalogue into a brand-new space, so the ids are live from day one.
create or replace function public.wf_finance_bootstrap_space(p_org uuid, p_space uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.wf_seed_finance(p_org);
  insert into public.wf_finance_categories (id, organization_id, space_id, name, kind, monthly_budget_cents, is_giving, is_food, is_savings, colour, sort_order)
  select c.id, p_org, p_space, c.name, c.kind, c.monthly_budget_cents, c.is_giving, c.is_food, c.is_savings, c.colour, c.sort_order
  from public.wf_catalog_finance_categories c
  where c.organization_id = p_org
  on conflict (space_id, id) do nothing;

  insert into public.wf_finance_accounts (organization_id, space_id, name, kind, currency)
  select p_org, p_space, 'Everyday current account', 'bank', coalesce(s.currency, 'GBP')
  from public.wf_spaces s where s.id = p_space
  and not exists (select 1 from public.wf_finance_accounts a where a.space_id = p_space);

  insert into public.wf_finance_settings (space_id, organization_id, currency)
  select p_space, p_org, coalesce(s.currency, 'GBP') from public.wf_spaces s where s.id = p_space
  on conflict (space_id) do nothing;
end $$;
grant execute on function public.wf_finance_bootstrap_space(uuid, uuid) to authenticated;


-- ===========================================================================
-- MODULE 14/19 — travel (businesses/wafe/sql/travel.sql)
-- ===========================================================================
-- Wàfè — module: travel (trips, itineraries, bookings, papers, packing, the run-up)
--
-- Ten tables, one idea: a TRIP is the object a family shares, and everything
-- else hangs off it. Reachability is decided once — "am I on this trip, or was
-- it named to me?" — and every child table asks the trip that question rather
-- than repeating the rule.
--
-- WHO SEES WHAT, IN POSTGRES (the app's filter mirrors this; the database is
-- the one that is load-bearing)
--
--   wf_trips            a parent sees every trip in the space. Anybody else
--                       sees a trip only when they are ON it (a traveller or a
--                       host row) or explicitly named in shared_with. A plain
--                       'family' trip grants a guest nothing: guests are
--                       granted named objects, never modules.
--   wf_trip_travellers  · wf_itinerary_days · wf_itinerary_items ·
--   wf_trip_checklist   readable by anyone who can reach the trip.
--   wf_trip_bookings    the same, EXCEPT rows whose sensitivity is 'financial'
--                       or 'documents' — those are parents only, because a
--                       booking reference and a price are not a child's
--                       business.
--   wf_travel_docs      PARENTS ONLY, for select as well as write (AC 4). A
--                       child's or a guest's session cannot fetch a passport
--                       row even with a hand-written query; the app never
--                       masks a document, it never receives one.
--   wf_packing_lists    a parent sees every list; anybody else sees their own,
--   wf_packing_items    and only for a trip they can reach (AC 2).
--   wf_trip_expenses    parents only — money is a parent's business, and the
--                       ledger the Finance module reads is built from these
--                       rows in the app (AC 7).
--
-- MONEY. Costs are integer minor units. A trip carries the destination's
-- currency and the rate used, and every expense stores what was spent
-- (amount_cents + currency + fx_rate) beside the converted amount in the
-- family's own currency (home_cents). Only home_cents is ever summed, so the
-- budget and giving percentages stay single-currency exactly as they assume.
--
-- MAPS are deep links, not embeds: the app's content-security policy admits no
-- tile server, so an itinerary item stores a place (an address a maps app can
-- find) and, where known, coords ('lat,lng') — the link is built in the app.
--
-- Idempotent throughout: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_trips (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete cascade,
  space_id               uuid not null references public.wf_spaces(id) on delete cascade,
  title                  text not null,
  destination            text not null default '',
  country_code           text not null default 'GB',
  kind                   text not null default 'holiday'
                         check (kind in ('holiday','visit','school-trip','day-out')),
  status                 text not null default 'planning'
                         check (status in ('dreaming','planning','booked','done')),
  start_date             date,
  end_date               date,
  cover_url              text,
  notes                  text not null default '',
  -- Minor units in the SPACE's currency. Null = we have not set a budget.
  budget_cents           integer check (budget_cents is null or budget_cents >= 0),
  -- The Finance module's stable budget key this trip's spending posts to.
  finance_category_id    text not null default 'fun',
  finance_category_label text not null default 'Trips & holidays',
  -- What money looks like at the destination.
  local_currency         text not null default 'GBP',
  fx_rate                numeric(14,6) not null default 1 check (fx_rate > 0),
  -- A family value this trip serves, by label ("Love", "Joy").
  value_id               text,
  -- The Memories album opened when we came home. An id only: no join.
  album_id               uuid,
  album_title            text not null default '',
  template               text not null default 'city'
                         check (template in ('warm','cold','city','beach','school-trip','day-out')),
  visibility             text not null default 'family'
                         check (visibility in ('private','shared','family','child')),
  shared_with            uuid[] not null default '{}',
  created_by             uuid references public.wf_members(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index if not exists idx_wf_trips_space_start on public.wf_trips(space_id, start_date);
create index if not exists idx_wf_trips_status on public.wf_trips(space_id, status);

-- Who is going. A HOST receives us and sees the plan without packing for it,
-- which is exactly Mama Fọláké's relationship to Christmas in Lagos.
create table if not exists public.wf_trip_travellers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  trip_id         uuid not null references public.wf_trips(id) on delete cascade,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  role            text not null default 'traveller' check (role in ('traveller','host')),
  -- A document fact: stripped from a child's and a guest's slice in the app,
  -- and unreadable to them here (see the policy below).
  passport_expiry date,
  notes           text not null default '',
  created_at      timestamptz not null default now(),
  unique (trip_id, member_id)
);
create index if not exists idx_wf_trip_travellers_member on public.wf_trip_travellers(member_id);
create index if not exists idx_wf_trip_travellers_space on public.wf_trip_travellers(space_id);

create table if not exists public.wf_itinerary_days (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  trip_id         uuid not null references public.wf_trips(id) on delete cascade,
  day_date        date not null,
  title           text not null default '',
  notes           text not null default '',
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_itinerary_days_trip on public.wf_itinerary_days(trip_id, day_date);
create index if not exists idx_wf_itinerary_days_space on public.wf_itinerary_days(space_id);

create table if not exists public.wf_itinerary_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  trip_id         uuid not null references public.wf_trips(id) on delete cascade,
  day_id          uuid not null references public.wf_itinerary_days(id) on delete cascade,
  -- Null means "sometime today", which a family's day often is.
  at_time         time,
  title           text not null,
  -- An address or a place name — whatever a maps app can find.
  place           text not null default '',
  -- 'lat,lng' when we know it; the deep link prefers it over the address.
  coords          text,
  notes           text not null default '',
  booking_ref     text not null default '',
  -- In the trip's LOCAL currency (see the money note at the top).
  cost_cents      integer not null default 0 check (cost_cents >= 0),
  item_order      integer not null default 0,
  done            boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_itinerary_items_day on public.wf_itinerary_items(day_id, item_order);
create index if not exists idx_wf_itinerary_items_space on public.wf_itinerary_items(space_id);

create table if not exists public.wf_trip_bookings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  trip_id         uuid not null references public.wf_trips(id) on delete cascade,
  kind            text not null default 'other'
                  check (kind in ('flight','stay','car','transport','ticket','insurance','other')),
  provider        text not null,
  reference       text not null default '',
  start_at        timestamptz not null,
  end_at          timestamptz,
  -- Home currency, minor units.
  cost_cents      integer not null default 0 check (cost_cents >= 0),
  link            text not null default '',
  image_url       text,
  confirmed       boolean not null default false,
  sensitivity     text not null default 'general' check (sensitivity in ('general','financial','documents')),
  notes           text not null default '',
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_trip_bookings_trip on public.wf_trip_bookings(trip_id, start_at);
create index if not exists idx_wf_trip_bookings_space on public.wf_trip_bookings(space_id);

-- Passports, visas, certificates. PARENTS ONLY at the policy — this is AC 4,
-- and it is enforced by the database rather than by the screen.
create table if not exists public.wf_travel_docs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  -- Null for a document that is not about one trip (a passport is a fact
  -- about a person, not about a holiday).
  trip_id         uuid references public.wf_trips(id) on delete cascade,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  kind            text not null default 'other'
                  check (kind in ('passport','visa','insurance','ticket','vaccination','licence','other')),
  label           text not null default '',
  -- The app shows the last four characters and never the whole number.
  doc_number      text not null default '',
  expires_at      date,
  image_url       text,
  notes           text not null default '',
  sensitivity     text not null default 'documents' check (sensitivity = 'documents'),
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_travel_docs_space on public.wf_travel_docs(space_id, expires_at);
create index if not exists idx_wf_travel_docs_member on public.wf_travel_docs(member_id);

create table if not exists public.wf_packing_lists (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  trip_id         uuid not null references public.wf_trips(id) on delete cascade,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  template        text not null default 'city'
                  check (template in ('warm','cold','city','beach','school-trip','day-out')),
  -- Null until it has been generated; that is what "4 of 6 made" counts.
  generated_at    timestamptz,
  created_at      timestamptz not null default now(),
  unique (trip_id, member_id)
);
create index if not exists idx_wf_packing_lists_space on public.wf_packing_lists(space_id);
create index if not exists idx_wf_packing_lists_member on public.wf_packing_lists(member_id);

create table if not exists public.wf_packing_items (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  space_id          uuid not null references public.wf_spaces(id) on delete cascade,
  list_id           uuid not null references public.wf_packing_lists(id) on delete cascade,
  item              text not null,
  qty               integer not null default 1 check (qty > 0),
  category          text not null default 'other'
                    check (category in ('clothes','toiletries','documents','tech','medical','gifts','kids','other')),
  -- AC 9 — a packed thing can point at the real garment in the Wardrobe. An
  -- id and a label only: this module never joins another module's tables.
  wardrobe_item_id  uuid,
  wardrobe_label    text not null default '',
  checked           boolean not null default false,
  item_order        integer not null default 0,
  created_at        timestamptz not null default now()
);
create index if not exists idx_wf_packing_items_list on public.wf_packing_items(list_id, item_order);
create index if not exists idx_wf_packing_items_space on public.wf_packing_items(space_id);

-- The run-up, stored as an OFFSET from departure (T-14, T-7, T-3, T-1, T-0) so
-- that moving the flight moves the whole run-up with it.
create table if not exists public.wf_trip_checklist (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  trip_id          uuid not null references public.wf_trips(id) on delete cascade,
  item             text not null,
  note             text not null default '',
  due_offset_days  integer not null default 7 check (due_offset_days >= 0),
  owner_member_id  uuid references public.wf_members(id) on delete set null,
  done_at          timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_trip_checklist_trip on public.wf_trip_checklist(trip_id, due_offset_days desc);
create index if not exists idx_wf_trip_checklist_space on public.wf_trip_checklist(space_id);

-- AC 7 — what the trip actually cost. The app posts these to the family ledger
-- under the trip's finance_category_id; home_cents is the only column summed.
create table if not exists public.wf_trip_expenses (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  space_id            uuid not null references public.wf_spaces(id) on delete cascade,
  trip_id             uuid not null references public.wf_trips(id) on delete cascade,
  label               text not null,
  -- As spent, in `currency`.
  amount_cents        integer not null default 0,
  currency            text not null default 'GBP',
  -- 1 home unit = fx_rate units of `currency`; 1 when they are the same.
  fx_rate             numeric(14,6) not null default 1 check (fx_rate > 0),
  -- The converted amount in the space's currency.
  home_cents          integer not null default 0,
  finance_category_id text not null default 'fun',
  member_id           uuid references public.wf_members(id) on delete set null,
  spent_on            date not null default current_date,
  note                text not null default '',
  posted_at           timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists idx_wf_trip_expenses_trip on public.wf_trip_expenses(trip_id, spent_on desc);
create index if not exists idx_wf_trip_expenses_space on public.wf_trip_expenses(space_id);

-- ---------------------------------------------------------------------------
-- 2. Row-level security
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'wf_trips','wf_trip_travellers','wf_itinerary_days','wf_itinerary_items',
    'wf_trip_bookings','wf_travel_docs','wf_packing_lists','wf_packing_items',
    'wf_trip_checklist','wf_trip_expenses'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Can this session reach the trip at all? Parents always. Anybody else only by
-- being ON it (traveller or host) or by being named in shared_with — "granted
-- named objects, never modules". A plain 'family' trip is family business
-- until somebody shares it, so it grants a guest nothing.
create or replace function public.wf_trip_reachable(p_trip uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_trip  record;
  v_me    uuid;
  v_role  text;
begin
  select t.space_id, t.visibility, t.shared_with, t.created_by
    into v_trip from wf_trips t where t.id = p_trip;
  if not found then return false; end if;

  select m.id, m.role into v_me, v_role
  from wf_members m where m.space_id = v_trip.space_id and m.user_id = auth.uid() limit 1;
  if v_me is null then return false; end if;
  if v_role = 'parent' then return true; end if;

  if exists (select 1 from wf_trip_travellers tv where tv.trip_id = p_trip and tv.member_id = v_me) then
    return true;
  end if;
  if v_trip.created_by = v_me then return true; end if;
  if v_trip.visibility = 'shared' then return v_me = any (coalesce(v_trip.shared_with, '{}'::uuid[])); end if;
  if v_trip.visibility = 'child' then return v_role = 'child'; end if;
  return false;
end $$;
grant execute on function public.wf_trip_reachable(uuid) to authenticated;

-- Trips ---------------------------------------------------------------------
drop policy if exists wf_trips_read on public.wf_trips;
create policy wf_trips_read on public.wf_trips for select to authenticated
  using (
    wf_is_parent(space_id)
    or created_by = wf_my_member(space_id)
    or exists (select 1 from wf_trip_travellers tv where tv.trip_id = id and tv.member_id = wf_my_member(space_id))
    or (visibility = 'shared' and wf_my_member(space_id) = any (shared_with))
    or (visibility = 'child' and wf_my_role(space_id) = 'child')
  );

drop policy if exists wf_trips_write on public.wf_trips;
create policy wf_trips_write on public.wf_trips for insert to authenticated
  with check (wf_is_parent(space_id));

drop policy if exists wf_trips_edit on public.wf_trips;
create policy wf_trips_edit on public.wf_trips for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_trips_del on public.wf_trips;
create policy wf_trips_del on public.wf_trips for delete to authenticated
  using (wf_is_parent(space_id));

-- Travellers ----------------------------------------------------------------
-- Everyone on a trip can see who else is coming; only a parent may change the
-- party. passport_expiry is a document fact, so a non-parent gets the row
-- through the app's filter with that column blanked — and the column itself is
-- only ever WRITTEN by a parent.
drop policy if exists wf_trip_travellers_read on public.wf_trip_travellers;
create policy wf_trip_travellers_read on public.wf_trip_travellers for select to authenticated
  using (wf_trip_reachable(trip_id));

drop policy if exists wf_trip_travellers_parent on public.wf_trip_travellers;
create policy wf_trip_travellers_parent on public.wf_trip_travellers for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- Itinerary -----------------------------------------------------------------
drop policy if exists wf_itinerary_days_read on public.wf_itinerary_days;
create policy wf_itinerary_days_read on public.wf_itinerary_days for select to authenticated
  using (wf_trip_reachable(trip_id));

drop policy if exists wf_itinerary_days_parent on public.wf_itinerary_days;
create policy wf_itinerary_days_parent on public.wf_itinerary_days for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_itinerary_items_read on public.wf_itinerary_items;
create policy wf_itinerary_items_read on public.wf_itinerary_items for select to authenticated
  using (wf_trip_reachable(trip_id));

drop policy if exists wf_itinerary_items_write on public.wf_itinerary_items;
create policy wf_itinerary_items_write on public.wf_itinerary_items for insert to authenticated
  with check (wf_is_parent(space_id));

-- A child on the trip may tick a stop off as it happens; a guest is read-only
-- (the source matrix gives a guest "view"), and a parent may edit anything.
drop policy if exists wf_itinerary_items_edit on public.wf_itinerary_items;
create policy wf_itinerary_items_edit on public.wf_itinerary_items for update to authenticated
  using (wf_is_parent(space_id) or (wf_my_role(space_id) = 'child' and wf_trip_reachable(trip_id)))
  with check (wf_is_parent(space_id) or (wf_my_role(space_id) = 'child' and wf_trip_reachable(trip_id)));

drop policy if exists wf_itinerary_items_del on public.wf_itinerary_items;
create policy wf_itinerary_items_del on public.wf_itinerary_items for delete to authenticated
  using (wf_is_parent(space_id));

-- Bookings ------------------------------------------------------------------
-- General bookings are readable by everyone on the trip (the app strips the
-- reference and the price for a child or a guest). Financial and documents
-- bookings stop at the parents, here, not in the screen.
drop policy if exists wf_trip_bookings_read on public.wf_trip_bookings;
create policy wf_trip_bookings_read on public.wf_trip_bookings for select to authenticated
  using (wf_is_parent(space_id) or (sensitivity = 'general' and wf_trip_reachable(trip_id)));

drop policy if exists wf_trip_bookings_parent on public.wf_trip_bookings;
create policy wf_trip_bookings_parent on public.wf_trip_bookings for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- Papers --------------------------------------------------------------------
-- AC 4, in one line: parents only, for every verb. A child's or a guest's
-- session receives an empty set, not a masked row.
drop policy if exists wf_travel_docs_parent on public.wf_travel_docs;
create policy wf_travel_docs_parent on public.wf_travel_docs for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- Packing -------------------------------------------------------------------
-- AC 2 — a guest traveller reads the itinerary and their OWN list. A parent
-- sees every list; nobody else sees anybody else's.
drop policy if exists wf_packing_lists_read on public.wf_packing_lists;
create policy wf_packing_lists_read on public.wf_packing_lists for select to authenticated
  using (
    wf_is_parent(space_id)
    or (member_id = wf_my_member(space_id) and wf_trip_reachable(trip_id))
  );

drop policy if exists wf_packing_lists_write on public.wf_packing_lists;
create policy wf_packing_lists_write on public.wf_packing_lists for insert to authenticated
  with check (wf_is_parent(space_id));

drop policy if exists wf_packing_lists_edit on public.wf_packing_lists;
create policy wf_packing_lists_edit on public.wf_packing_lists for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_packing_lists_del on public.wf_packing_lists;
create policy wf_packing_lists_del on public.wf_packing_lists for delete to authenticated
  using (wf_is_parent(space_id));

drop policy if exists wf_packing_items_read on public.wf_packing_items;
create policy wf_packing_items_read on public.wf_packing_items for select to authenticated
  using (exists (
    select 1 from wf_packing_lists l
    where l.id = list_id
      and (wf_is_parent(l.space_id) or (l.member_id = wf_my_member(l.space_id) and wf_trip_reachable(l.trip_id)))
  ));

-- A child adds to and ticks their own bag (the one write children have here).
-- A guest is read-only unless a parent handed them travel.manage, which lives
-- in the app's grants — so at the database a guest simply cannot write.
drop policy if exists wf_packing_items_write on public.wf_packing_items;
create policy wf_packing_items_write on public.wf_packing_items for insert to authenticated
  with check (exists (
    select 1 from wf_packing_lists l
    where l.id = list_id
      and (wf_is_parent(l.space_id)
           or (wf_my_role(l.space_id) = 'child' and l.member_id = wf_my_member(l.space_id)))
  ));

-- AC 8's server half: the tick a child makes on a plane replays into this.
drop policy if exists wf_packing_items_edit on public.wf_packing_items;
create policy wf_packing_items_edit on public.wf_packing_items for update to authenticated
  using (exists (
    select 1 from wf_packing_lists l
    where l.id = list_id
      and (wf_is_parent(l.space_id)
           or (wf_my_role(l.space_id) = 'child' and l.member_id = wf_my_member(l.space_id)))
  ))
  with check (exists (
    select 1 from wf_packing_lists l
    where l.id = list_id
      and (wf_is_parent(l.space_id)
           or (wf_my_role(l.space_id) = 'child' and l.member_id = wf_my_member(l.space_id)))
  ));

drop policy if exists wf_packing_items_del on public.wf_packing_items;
create policy wf_packing_items_del on public.wf_packing_items for delete to authenticated
  using (exists (
    select 1 from wf_packing_lists l
    where l.id = list_id
      and (wf_is_parent(l.space_id)
           or (wf_my_role(l.space_id) = 'child' and l.member_id = wf_my_member(l.space_id)))
  ));

-- The run-up ----------------------------------------------------------------
-- Everyone on the trip can read it (it is reassuring to see the list shrink);
-- a parent edits anything, and the person a line was given to may tick theirs.
drop policy if exists wf_trip_checklist_read on public.wf_trip_checklist;
create policy wf_trip_checklist_read on public.wf_trip_checklist for select to authenticated
  using (wf_trip_reachable(trip_id));

drop policy if exists wf_trip_checklist_write on public.wf_trip_checklist;
create policy wf_trip_checklist_write on public.wf_trip_checklist for insert to authenticated
  with check (wf_is_parent(space_id));

drop policy if exists wf_trip_checklist_edit on public.wf_trip_checklist;
create policy wf_trip_checklist_edit on public.wf_trip_checklist for update to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));

drop policy if exists wf_trip_checklist_del on public.wf_trip_checklist;
create policy wf_trip_checklist_del on public.wf_trip_checklist for delete to authenticated
  using (wf_is_parent(space_id));

-- Money ---------------------------------------------------------------------
drop policy if exists wf_trip_expenses_parent on public.wf_trip_expenses;
create policy wf_trip_expenses_parent on public.wf_trip_expenses for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- ---------------------------------------------------------------------------
-- 3. Pre-loaded content — packing templates and the run-up, per tenant
-- ---------------------------------------------------------------------------
-- A family that has just added its first trip should not face an empty list.
-- These are the rows the "generate" button copies FROM; nothing is written
-- into a space until somebody asks for it.

create table if not exists public.wf_catalog_packing (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug            text not null,
  template        text not null default 'city'
                  check (template in ('warm','cold','city','beach','school-trip','day-out')),
  item            text not null,
  qty             integer not null default 1 check (qty > 0),
  category        text not null default 'other'
                  check (category in ('clothes','toiletries','documents','tech','medical','gifts','kids','other')),
  -- Which age bands the line applies to; empty = everyone.
  bands           text[] not null default '{}',
  -- Multiply qty by the number of nights (socks, pants, t-shirts).
  per_night       boolean not null default false,
  sort            integer not null default 0,
  unique (organization_id, slug)
);

create table if not exists public.wf_catalog_trip_checklist (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug            text not null,
  -- 'international' | 'domestic' | 'school-trip' | 'day-out'
  scope           text not null default 'international',
  item            text not null,
  note            text not null default '',
  due_offset_days integer not null default 7 check (due_offset_days >= 0),
  sort            integer not null default 0,
  unique (organization_id, slug)
);

do $$
declare t text;
begin
  foreach t in array array['wf_catalog_packing','wf_catalog_trip_checklist'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select on public.%I to authenticated, anon', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select using (true)', t || '_read', t);
  end loop;
end $$;

create or replace function public.wf_seed_travel(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into wf_catalog_packing (organization_id, slug, template, item, qty, category, bands, per_night, sort) values
    (p_org, 'warm-tshirts',   'warm', 'T-shirts',                    1, 'clothes',    '{}',                              true,  10),
    (p_org, 'warm-shorts',    'warm', 'Shorts',                      3, 'clothes',    '{}',                              false, 20),
    (p_org, 'warm-sun-hat',   'warm', 'Sun hat',                     1, 'clothes',    '{}',                              false, 30),
    (p_org, 'warm-suncream',  'warm', 'Sun cream (factor 50)',       1, 'toiletries', '{}',                              false, 40),
    (p_org, 'warm-mozzie',    'warm', 'Mosquito spray',              1, 'medical',    '{}',                              false, 50),
    (p_org, 'warm-adapter',   'warm', 'Plug adapters',               2, 'tech',       '{adult,young-adult}',             false, 60),
    (p_org, 'warm-meds',      'warm', 'Paracetamol and plasters',    1, 'medical',    '{adult}',                         false, 70),
    (p_org, 'warm-gifts',     'warm', 'Gifts for the family there',  1, 'gifts',      '{adult,young-adult}',             false, 80),
    (p_org, 'warm-toy',       'warm', 'One special toy',             1, 'kids',       '{little,junior}',                 false, 90),
    (p_org, 'cold-thermals',  'cold', 'Thermals',                    2, 'clothes',    '{}',                              false, 10),
    (p_org, 'cold-waterproof','cold', 'Waterproof coat',             1, 'clothes',    '{}',                              false, 20),
    (p_org, 'cold-boots',     'cold', 'Wellies or walking boots',    1, 'clothes',    '{}',                              false, 30),
    (p_org, 'cold-hat',       'cold', 'Hat, scarf and gloves',       1, 'clothes',    '{}',                              false, 40),
    (p_org, 'cold-socks',     'cold', 'Thick socks',                 1, 'clothes',    '{}',                              true,  50),
    (p_org, 'city-shoes',     'city', 'Comfortable shoes',           1, 'clothes',    '{}',                              false, 10),
    (p_org, 'city-smart',     'city', 'One smart outfit',            1, 'clothes',    '{}',                              false, 20),
    (p_org, 'city-daybag',    'city', 'Day bag',                     1, 'other',      '{}',                              false, 30),
    (p_org, 'city-charger',   'city', 'Charger and power bank',      1, 'tech',       '{teen,young-adult,adult}',        false, 40),
    (p_org, 'beach-swim',     'beach','Swimming things',             2, 'clothes',    '{}',                              false, 10),
    (p_org, 'beach-towel',    'beach','Beach towel',                 1, 'other',      '{}',                              false, 20),
    (p_org, 'beach-bucket',   'beach','Bucket and spade',            1, 'kids',       '{little,junior}',                 false, 30),
    (p_org, 'school-kit',     'school-trip','The school kit list, named', 1, 'other',  '{}',                             false, 10),
    (p_org, 'school-bag',     'school-trip','Day rucksack',          1, 'other',      '{}',                              false, 20),
    (p_org, 'day-snacks',     'day-out','Snacks and water',          1, 'other',      '{}',                              false, 10),
    (p_org, 'day-spare',      'day-out','A change of clothes',       1, 'clothes',    '{little,junior}',                 false, 20)
  on conflict (organization_id, slug) do update
    set template = excluded.template, item = excluded.item, qty = excluded.qty,
        category = excluded.category, bands = excluded.bands, per_night = excluded.per_night, sort = excluded.sort;

  insert into wf_catalog_trip_checklist (organization_id, slug, scope, item, note, due_offset_days, sort) values
    (p_org, 'passports',   'international', 'Check every passport is valid six months past our return', 'The rule that catches families out. Renewals take four to six weeks.', 14, 10),
    (p_org, 'visas',       'international', 'Confirm visas, entry forms and the address we''re staying at', 'Landing cards ask for an address and a phone number.',              14, 20),
    (p_org, 'insurance',   'international', 'Travel insurance for everyone travelling',                 'One policy for the whole party, with the medical cover checked.',      14, 30),
    (p_org, 'jabs',        'international', 'Ask the GP about vaccinations',                            'Some courses have to start two weeks out.',                            14, 40),
    (p_org, 'currency',    'international', 'Order currency and tell the bank we''re travelling',       'So the cards don''t stop working on day one.',                          7, 50),
    (p_org, 'neighbour',   'international', 'Ask a neighbour to keep an eye on the house',              'A key, the bins, and a light on in the evening.',                        7, 60),
    (p_org, 'deliveries',  'international', 'Pause the deliveries and the milk',                        'Nothing says ''empty house'' like a doorstep of parcels.',               3, 70),
    (p_org, 'check-in',    'international', 'Check in online and pick seats together',                  'Twenty-four hours before, and the children sit with a parent.',          1, 80),
    (p_org, 'charge',      'international', 'Charge everything and pack the chargers last',             'Phones, tablets, the power bank, the camera.',                           0, 90),
    (p_org, 'balance',     'domestic',      'Pay the balance and print the directions',                 'Signal is a rumour up there.',                                          14, 10),
    (p_org, 'car',         'domestic',      'Service the car and check the tyres',                      'Long drive, full boot.',                                                 7, 20),
    (p_org, 'first-night', 'domestic',      'Food shop for the first night',                            'Arriving hungry to an empty fridge is a rite of passage we can skip.',   1, 30),
    (p_org, 'consent',     'school-trip',   'Return the consent form and pay the balance',              'The school''s deadline, not ours.',                                     14, 10),
    (p_org, 'name-things', 'school-trip',   'Name every single thing on the kit list',                  'Everything comes home or nothing does.',                                 7, 20),
    (p_org, 'coach',       'school-trip',   'Set the alarm for the coach',                              'Early. Earlier than that.',                                              0, 30),
    (p_org, 'tickets',     'day-out',       'Book the tickets',                                         'Cheaper online, and no queue.',                                          3, 10),
    (p_org, 'weather',     'day-out',       'Check the weather and pack accordingly',                   'Wellies or sun cream, rarely neither.',                                  1, 20)
  on conflict (organization_id, slug) do update
    set scope = excluded.scope, item = excluded.item, note = excluded.note,
        due_offset_days = excluded.due_offset_days, sort = excluded.sort;
end $$;
grant execute on function public.wf_seed_travel(uuid) to authenticated;


-- ===========================================================================
-- MODULE 15/19 — wardrobe (businesses/wafe/sql/wardrobe.sql)
-- ===========================================================================
-- Wàfè — wardrobe: the digital closet, the outfit builder, the attire schedule
-- and the outgrown pipeline.
--
-- Nine tables and one catalogue. The garment table (wf_wardrobe_items) carries
-- the standard visibility columns, so wf_can_see() already keeps one parent's
-- private rows from the other. On top of that this module adds ONE extra rule
-- that the app cannot be trusted to enforce alone:
--
--   A CHILD SEES ONLY THEIR OWN CLOSET AND THEIR OWN WEEK.
--
-- That is the module's whole permissions spec ("child — own closet and own
-- schedule"), and it is written into every read policy here rather than into a
-- filter in the client: wf_is_child(space_id) narrows the row to
-- owner_member_id = wf_my_member(space_id). A nine-year-old with a session and
-- a REST client gets their own jumpers and nothing else.
--
-- The outgrown pipeline (wishes, donate jobs, giving) is PARENTS ONLY, with one
-- deliberate exception: a child may read a replacement wish raised FOR them, so
-- "new shoes are on the way" is a thing the app can tell them. Nothing about the
-- charity bag or the giving ledger is theirs.
--
-- Idempotent throughout: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_wardrobe_items (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  name             text not null,
  owner_member_id  uuid not null references public.wf_members(id) on delete cascade,
  category         text not null default 'top'
                     check (category in ('top','bottom','dress','outerwear','shoes','accessory','uniform','traditional','sleepwear','sportswear')),
  colour           text not null default 'black'
                     check (colour in ('black','white','grey','navy','blue','green','red','pink','purple','yellow','orange','brown','beige','gold','multi')),
  season           text not null default 'all' check (season in ('all','spring','summer','autumn','winter')),
  -- As the label reads: "Age 9-10", "UK 12", "Size 3". Free text on purpose.
  size             text not null default '',
  brand            text not null default '',
  occasions        text[] not null default '{everyday}',
  -- A public `catalog` bucket URL live; a compressed data URL in the demo.
  -- Uploads are capped at 300 KB client-side before they ever reach here.
  image_url        text,
  status           text not null default 'in-use' check (status in ('in-use','outgrown','donate','handed-down')),
  favourite        boolean not null default false,
  in_laundry       boolean not null default false,
  last_worn        date,
  wear_count       integer not null default 0 check (wear_count >= 0),
  care_notes       text not null default '',
  notes            text not null default '',
  visibility       text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with      uuid[] not null default '{}',
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_wardrobe_items_space on public.wf_wardrobe_items(space_id, status);
create index if not exists idx_wf_wardrobe_items_owner on public.wf_wardrobe_items(owner_member_id);

create table if not exists public.wf_outfits (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  name             text not null,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  occasion         text not null default 'everyday'
                     check (occasion in ('everyday','school','church','sport','party','travel','formal','play')),
  image_url        text,
  notes            text not null default '',
  -- The quick-fill target: "school uniform" fills a whole week from this one.
  is_uniform       boolean not null default false,
  last_worn        date,
  created_by       uuid references public.wf_members(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_outfits_space on public.wf_outfits(space_id, member_id);

-- The pieces of an outfit, in the order they were laid out. `position_json` is
-- reserved for a free-placement canvas; the shipped builder lays pieces out in
-- slot order and writes only `position`.
create table if not exists public.wf_outfit_items (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  outfit_id        uuid not null references public.wf_outfits(id) on delete cascade,
  item_id          uuid not null references public.wf_wardrobe_items(id) on delete cascade,
  position         integer not null default 0,
  position_json    jsonb,
  created_at       timestamptz not null default now(),
  unique (outfit_id, item_id)
);
create index if not exists idx_wf_outfit_items_outfit on public.wf_outfit_items(outfit_id, position);
create index if not exists idx_wf_outfit_items_item on public.wf_outfit_items(item_id);

create table if not exists public.wf_attire_schedule (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  date             date not null,
  outfit_id        uuid not null references public.wf_outfits(id) on delete cascade,
  -- "Church", "Co-op", "Swimming" — what the day is, in the family's words.
  event_label      text not null default '',
  note             text not null default '',
  worn_at          timestamptz,
  created_at       timestamptz not null default now(),
  -- One outfit per person per day: laying out two is not a plan.
  unique (space_id, member_id, date)
);
create index if not exists idx_wf_attire_schedule_day on public.wf_attire_schedule(space_id, date);

create table if not exists public.wf_wardrobe_capsules (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  name             text not null default 'Capsule',
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  -- The Travel module's trip. No FK: modules never reference each other's
  -- tables (CONTRACT.md); the label carries the meaning when the id is null.
  trip_id          text,
  trip_label       text not null default '',
  season           text not null default 'all' check (season in ('all','spring','summer','autumn','winter')),
  item_ids         uuid[] not null default '{}',
  notes            text not null default '',
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_wardrobe_capsules_space on public.wf_wardrobe_capsules(space_id, member_id);

create table if not exists public.wf_handdowns (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  -- Set null rather than cascade: the history of a coat outlives the coat.
  item_id          uuid references public.wf_wardrobe_items(id) on delete set null,
  item_name        text not null default '',
  from_member_id   uuid references public.wf_members(id) on delete set null,
  to_member_id     uuid references public.wf_members(id) on delete set null,
  note             text not null default '',
  at               timestamptz not null default now()
);
create index if not exists idx_wf_handdowns_space on public.wf_handdowns(space_id, at desc);

create table if not exists public.wf_wardrobe_wishes (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  item_id          uuid references public.wf_wardrobe_items(id) on delete set null,
  name             text not null,
  for_member_id    uuid not null references public.wf_members(id) on delete cascade,
  size             text not null default '',
  price_cents      integer not null default 0 check (price_cents >= 0),
  note             text not null default '',
  status           text not null default 'open' check (status in ('open','sent','bought')),
  created_by       uuid references public.wf_members(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_wardrobe_wishes_space on public.wf_wardrobe_wishes(space_id, status);

create table if not exists public.wf_wardrobe_donations (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  space_id            uuid not null references public.wf_spaces(id) on delete cascade,
  title               text not null,
  item_ids            uuid[] not null default '{}',
  charity             text not null default '',
  due_date            date not null default current_date,
  assignee_member_id  uuid references public.wf_members(id) on delete set null,
  note                text not null default '',
  done_at             timestamptz,
  giving_entry_id     uuid,
  created_by          uuid references public.wf_members(id) on delete set null,
  created_at          timestamptz not null default now()
);
create index if not exists idx_wf_wardrobe_donations_space on public.wf_wardrobe_donations(space_id, due_date);

create table if not exists public.wf_wardrobe_giving (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  donation_id      uuid references public.wf_wardrobe_donations(id) on delete cascade,
  label            text not null default '',
  item_count       integer not null default 0 check (item_count >= 0),
  -- Minor units in the space's currency, like every other amount in Wàfè.
  amount_cents     integer not null default 0 check (amount_cents >= 0),
  date             date not null default current_date,
  member_id        uuid references public.wf_members(id) on delete set null,
  note             text not null default '',
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_wardrobe_giving_space on public.wf_wardrobe_giving(space_id, date desc);

-- ---------------------------------------------------------------------------
-- 2. Row-level security
-- ---------------------------------------------------------------------------

alter table public.wf_wardrobe_items     enable row level security;
alter table public.wf_outfits            enable row level security;
alter table public.wf_outfit_items       enable row level security;
alter table public.wf_attire_schedule    enable row level security;
alter table public.wf_wardrobe_capsules  enable row level security;
alter table public.wf_handdowns          enable row level security;
alter table public.wf_wardrobe_wishes    enable row level security;
alter table public.wf_wardrobe_donations enable row level security;
alter table public.wf_wardrobe_giving    enable row level security;

-- Table privileges: RLS decides which ROWS, this decides whether the role may
-- reach the table at all. Without it every policy above is moot.
do $$
declare t text;
begin
  foreach t in array array[
    'wf_wardrobe_items','wf_outfits','wf_outfit_items','wf_attire_schedule',
    'wf_wardrobe_capsules','wf_handdowns','wf_wardrobe_wishes',
    'wf_wardrobe_donations','wf_wardrobe_giving'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Garments: wf_can_see for adults, own-closet-only for a child, never a guest.
drop policy if exists wf_wardrobe_items_read on public.wf_wardrobe_items;
create policy wf_wardrobe_items_read on public.wf_wardrobe_items for select to authenticated
  using (
    case
      when wf_is_child(space_id) then owner_member_id = wf_my_member(space_id)
      when wf_is_parent(space_id) then wf_can_see(space_id, owner_member_id, visibility, shared_with)
      else false
    end
  );
drop policy if exists wf_wardrobe_items_write on public.wf_wardrobe_items;
create policy wf_wardrobe_items_write on public.wf_wardrobe_items for insert to authenticated
  with check (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));
drop policy if exists wf_wardrobe_items_edit on public.wf_wardrobe_items;
create policy wf_wardrobe_items_edit on public.wf_wardrobe_items for update to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));
drop policy if exists wf_wardrobe_items_del on public.wf_wardrobe_items;
create policy wf_wardrobe_items_del on public.wf_wardrobe_items for delete to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));

-- Outfits and the pieces in them follow the outfit's member.
drop policy if exists wf_outfits_read on public.wf_outfits;
create policy wf_outfits_read on public.wf_outfits for select to authenticated
  using (wf_is_parent(space_id) or (wf_is_child(space_id) and member_id = wf_my_member(space_id)));
drop policy if exists wf_outfits_write on public.wf_outfits;
create policy wf_outfits_write on public.wf_outfits for insert to authenticated
  with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_outfits_edit on public.wf_outfits;
create policy wf_outfits_edit on public.wf_outfits for update to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_outfits_del on public.wf_outfits;
create policy wf_outfits_del on public.wf_outfits for delete to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));

create or replace function public.wf_outfit_mine(p_outfit uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wf_outfits o
    where o.id = p_outfit
      and (wf_is_parent(o.space_id) or (wf_is_member(o.space_id) and o.member_id = wf_my_member(o.space_id)))
  );
$$;

drop policy if exists wf_outfit_items_read on public.wf_outfit_items;
create policy wf_outfit_items_read on public.wf_outfit_items for select to authenticated using (wf_outfit_mine(outfit_id));
drop policy if exists wf_outfit_items_write on public.wf_outfit_items;
create policy wf_outfit_items_write on public.wf_outfit_items for insert to authenticated with check (wf_outfit_mine(outfit_id));
drop policy if exists wf_outfit_items_edit on public.wf_outfit_items;
create policy wf_outfit_items_edit on public.wf_outfit_items for update to authenticated using (wf_outfit_mine(outfit_id)) with check (wf_outfit_mine(outfit_id));
drop policy if exists wf_outfit_items_del on public.wf_outfit_items;
create policy wf_outfit_items_del on public.wf_outfit_items for delete to authenticated using (wf_outfit_mine(outfit_id));

-- The week: a child owns their own days and no one else's.
drop policy if exists wf_attire_schedule_read on public.wf_attire_schedule;
create policy wf_attire_schedule_read on public.wf_attire_schedule for select to authenticated
  using (wf_is_parent(space_id) or (wf_is_child(space_id) and member_id = wf_my_member(space_id)));
drop policy if exists wf_attire_schedule_write on public.wf_attire_schedule;
create policy wf_attire_schedule_write on public.wf_attire_schedule for insert to authenticated
  with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_attire_schedule_edit on public.wf_attire_schedule;
create policy wf_attire_schedule_edit on public.wf_attire_schedule for update to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_attire_schedule_del on public.wf_attire_schedule;
create policy wf_attire_schedule_del on public.wf_attire_schedule for delete to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));

-- Capsules: a child may read their own (it is their suitcase); parents write.
drop policy if exists wf_wardrobe_capsules_read on public.wf_wardrobe_capsules;
create policy wf_wardrobe_capsules_read on public.wf_wardrobe_capsules for select to authenticated
  using (wf_is_parent(space_id) or (wf_is_child(space_id) and member_id = wf_my_member(space_id)));
drop policy if exists wf_wardrobe_capsules_write on public.wf_wardrobe_capsules;
create policy wf_wardrobe_capsules_write on public.wf_wardrobe_capsules for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_wardrobe_capsules_edit on public.wf_wardrobe_capsules;
create policy wf_wardrobe_capsules_edit on public.wf_wardrobe_capsules for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_wardrobe_capsules_del on public.wf_wardrobe_capsules;
create policy wf_wardrobe_capsules_del on public.wf_wardrobe_capsules for delete to authenticated using (wf_is_parent(space_id));

-- Hand-me-downs: a child sees the ones they gave or received.
drop policy if exists wf_handdowns_read on public.wf_handdowns;
create policy wf_handdowns_read on public.wf_handdowns for select to authenticated
  using (
    wf_is_parent(space_id)
    or (wf_is_child(space_id) and (to_member_id = wf_my_member(space_id) or from_member_id = wf_my_member(space_id)))
  );
drop policy if exists wf_handdowns_write on public.wf_handdowns;
create policy wf_handdowns_write on public.wf_handdowns for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_handdowns_del on public.wf_handdowns;
create policy wf_handdowns_del on public.wf_handdowns for delete to authenticated using (wf_is_parent(space_id));

-- Replacements: parents own them; a child may READ the one raised for them.
drop policy if exists wf_wardrobe_wishes_read on public.wf_wardrobe_wishes;
create policy wf_wardrobe_wishes_read on public.wf_wardrobe_wishes for select to authenticated
  using (wf_is_parent(space_id) or (wf_is_child(space_id) and for_member_id = wf_my_member(space_id)));
drop policy if exists wf_wardrobe_wishes_write on public.wf_wardrobe_wishes;
create policy wf_wardrobe_wishes_write on public.wf_wardrobe_wishes for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_wardrobe_wishes_edit on public.wf_wardrobe_wishes;
create policy wf_wardrobe_wishes_edit on public.wf_wardrobe_wishes for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_wardrobe_wishes_del on public.wf_wardrobe_wishes;
create policy wf_wardrobe_wishes_del on public.wf_wardrobe_wishes for delete to authenticated using (wf_is_parent(space_id));

-- The charity bag and the giving ledger are parents only, full stop.
drop policy if exists wf_wardrobe_donations_read on public.wf_wardrobe_donations;
create policy wf_wardrobe_donations_read on public.wf_wardrobe_donations for select to authenticated using (wf_is_parent(space_id));
drop policy if exists wf_wardrobe_donations_write on public.wf_wardrobe_donations;
create policy wf_wardrobe_donations_write on public.wf_wardrobe_donations for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_wardrobe_donations_edit on public.wf_wardrobe_donations;
create policy wf_wardrobe_donations_edit on public.wf_wardrobe_donations for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_wardrobe_donations_del on public.wf_wardrobe_donations;
create policy wf_wardrobe_donations_del on public.wf_wardrobe_donations for delete to authenticated using (wf_is_parent(space_id));

drop policy if exists wf_wardrobe_giving_read on public.wf_wardrobe_giving;
create policy wf_wardrobe_giving_read on public.wf_wardrobe_giving for select to authenticated using (wf_is_parent(space_id));
drop policy if exists wf_wardrobe_giving_write on public.wf_wardrobe_giving;
create policy wf_wardrobe_giving_write on public.wf_wardrobe_giving for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_wardrobe_giving_edit on public.wf_wardrobe_giving;
create policy wf_wardrobe_giving_edit on public.wf_wardrobe_giving for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_wardrobe_giving_del on public.wf_wardrobe_giving;
create policy wf_wardrobe_giving_del on public.wf_wardrobe_giving for delete to authenticated using (wf_is_parent(space_id));

-- ---------------------------------------------------------------------------
-- 3. Pre-loaded content: capsule and uniform kits
-- ---------------------------------------------------------------------------

create table if not exists public.wf_catalog_wardrobe_kits (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  slug             text not null,
  title            text not null,
  kind             text not null default 'capsule' check (kind in ('capsule','uniform','care')),
  climate          text not null default '',
  audience         text not null default '',
  -- [{ category, colour, season, note }] — a starting list, not a shopping list.
  pieces           jsonb not null default '[]'::jsonb,
  note             text not null default '',
  created_at       timestamptz not null default now(),
  unique (organization_id, slug)
);
alter table public.wf_catalog_wardrobe_kits enable row level security;
drop policy if exists wf_catalog_wardrobe_kits_read on public.wf_catalog_wardrobe_kits;
create policy wf_catalog_wardrobe_kits_read on public.wf_catalog_wardrobe_kits for select to authenticated using (true);
grant select on public.wf_catalog_wardrobe_kits to authenticated;

/**
 * Seed the wardrobe catalogue for a tenant. Idempotent: re-running updates in
 * place, so an operator can improve a kit and every new family gets the better
 * one. These are starting points a family edits, never a list to buy.
 */
create or replace function public.wf_seed_wardrobe(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.wf_catalog_wardrobe_kits (organization_id, slug, title, kind, climate, audience, pieces, note)
  values
    (p_org, 'hot-country-child', 'Hot country, one child, ten days', 'capsule', 'hot and humid', 'A child travelling to family in West Africa or the Caribbean.',
     '[{"category":"traditional","colour":"multi","season":"summer","note":"One outfit for church or the thanksgiving service"},
       {"category":"top","colour":"white","season":"summer","note":"Five light tops; cotton, not polyester"},
       {"category":"bottom","colour":"beige","season":"summer","note":"Two pairs of shorts and one long pair for mosquitoes"},
       {"category":"dress","colour":"blue","season":"summer","note":"One dress or smart shirt for photographs"},
       {"category":"sportswear","colour":"blue","season":"summer","note":"Swimming costume"},
       {"category":"shoes","colour":"white","season":"all","note":"Trainers on the plane, sandals in the case"},
       {"category":"accessory","colour":"yellow","season":"summer","note":"Sun hat"}]'::jsonb,
     'Pack light and wash there. Everything dries overnight.'),
    (p_org, 'uk-winter-child', 'A British winter, one child', 'capsule', 'cold and wet', 'Half term, a school trip, or a week at the grandparents.',
     '[{"category":"outerwear","colour":"navy","season":"winter","note":"One padded, waterproof coat with a hood"},
       {"category":"top","colour":"grey","season":"winter","note":"Three long-sleeved tops and one fleece"},
       {"category":"bottom","colour":"blue","season":"winter","note":"Two pairs of trousers; jeans dry slowly"},
       {"category":"shoes","colour":"black","season":"winter","note":"Wellingtons and one pair of dry shoes"},
       {"category":"accessory","colour":"red","season":"winter","note":"Hat, gloves, and a spare pair of gloves"},
       {"category":"sleepwear","colour":"blue","season":"winter","note":"Warm pyjamas"}]'::jsonb,
     'Two of everything that touches skin, one of everything that does not.'),
    (p_org, 'school-week', 'A school week, laid out', 'uniform', '', 'Any child in uniform.',
     '[{"category":"uniform","colour":"white","season":"all","note":"Five shirts or polo shirts — one per day, no midweek wash"},
       {"category":"uniform","colour":"grey","season":"all","note":"Two pairs of trousers, skirts or pinafores"},
       {"category":"uniform","colour":"navy","season":"autumn","note":"Two jumpers or cardigans, both name-taped"},
       {"category":"shoes","colour":"black","season":"all","note":"One pair of school shoes, checked for size each term"},
       {"category":"sportswear","colour":"navy","season":"all","note":"PE kit in its own bag, home on Fridays"}]'::jsonb,
     'Name tapes inside the collar, not the label — labels get cut out.'),
    (p_org, 'sunday-best', 'Sunday best, whole family', 'capsule', '', 'Church, a naming ceremony, a wedding.',
     '[{"category":"traditional","colour":"multi","season":"all","note":"One traditional outfit per person, pressed the night before"},
       {"category":"shoes","colour":"brown","season":"all","note":"Polished shoes; check the children''s sizes in September and January"},
       {"category":"accessory","colour":"gold","season":"all","note":"Head wrap, tie or scarf that ties the family photograph together"}]'::jsonb,
     'Lay it out on Saturday night. Sunday morning is not the time to discover a missing shoe.'),
    (p_org, 'care-basics', 'Getting three more years out of it', 'care', '', 'Anyone handing clothes down.',
     '[{"category":"uniform","colour":"white","season":"all","note":"Wash at 30°, and treat the collar before it goes in"},
       {"category":"traditional","colour":"multi","season":"all","note":"Hand wash cold, line dry in the shade — sun takes ankara colour out"},
       {"category":"outerwear","colour":"navy","season":"winter","note":"Reproof a waterproof once a year; it is not worn out, it is wetted out"},
       {"category":"shoes","colour":"black","season":"all","note":"Stuff shoes with paper overnight; they last a whole size longer"}]'::jsonb,
     'A garment handed down twice is a garment bought a third as often.')
  on conflict (organization_id, slug) do update
    set title = excluded.title,
        kind = excluded.kind,
        climate = excluded.climate,
        audience = excluded.audience,
        pieces = excluded.pieces,
        note = excluded.note;
end;
$$;

grant execute on function public.wf_seed_wardrobe(uuid) to authenticated;
grant execute on function public.wf_outfit_mine(uuid) to authenticated;


-- ===========================================================================
-- MODULE 16/19 — wellness (businesses/wafe/sql/wellness.sql)
-- ===========================================================================
-- Wàfè — module: wellness (health, habits, fitness & food)
--
-- WHO SEES WHAT, IN POSTGRES
--
--   habits, logs, freezes,   parent: the whole household.
--   workouts, workout logs,  child:  their own rows, plus plans and sessions
--   wellness goals,                  that belong to nobody in particular (the
--   challenge entries                family walk).
--
--   health notes             PARENTS ONLY — or the member themselves when a
--                            parent has granted them 'wellness.manage'. This
--                            is the module's sharpest line (AC 4) and it is
--                            drawn here, at the API, not in the client: a
--                            child's `select * from wf_health_notes` returns
--                            their own row or nothing at all.
--
--   recipes, meal plans,     every member reads (a child needs to know what is
--   meal slots                for dinner); parents write. Recipes that are not
--                            child_safe are hidden from children.
--
--   grocery lists and items  PARENTS ONLY. What the shopping costs is money,
--                            and money in Wàfè stops at the parents.
--
--   challenges               every member reads; parents write.
--
-- SPROUTS ARE NOT WRITTEN HERE. Completing a challenge or keeping a habit
-- returns what was earned and the app credits wf_members.points through the
-- core repo — one ledger, one writer (AC 7).
--
-- Idempotent throughout: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_habits (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  owner_member_id  uuid references public.wf_members(id) on delete set null,
  name             text not null,
  kind             text not null default 'custom'
                   check (kind in ('water','exercise','sleep','nutrition','reading','screens','prayer','custom')),
  target           numeric not null default 1 check (target > 0),
  unit             text not null default '',
  -- After this, an unlogged habit raises exactly one nudge (AC 1).
  checkin_time     text not null default '20:00',
  value_id         text,
  -- ISO weekdays this habit rests: no streak break, no count, no nudge (AC 2).
  grace_days       smallint[] not null default '{}',
  sprouts          integer not null default 0 check (sprouts >= 0),
  note             text not null default '',
  active           boolean not null default true,
  visibility       text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with      uuid[] not null default '{}',
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_habits_space_member on public.wf_habits(space_id, member_id);

create table if not exists public.wf_habit_logs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  habit_id         uuid not null references public.wf_habits(id) on delete cascade,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  owner_member_id  uuid references public.wf_members(id) on delete set null,
  date             date not null,
  value            numeric not null default 1,
  logged_at        timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (habit_id, date)
);
create index if not exists idx_wf_habit_logs_habit on public.wf_habit_logs(habit_id, date desc);

-- One per habit per week. Neither breaks a streak nor counts towards it (AC 2).
create table if not exists public.wf_streak_freezes (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  habit_id         uuid not null references public.wf_habits(id) on delete cascade,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  owner_member_id  uuid references public.wf_members(id) on delete set null,
  week_start       date not null,
  used_on          date not null,
  reason           text not null default '',
  at               timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (habit_id, week_start)
);

create table if not exists public.wf_workout_plans (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  -- null = the whole family (the Saturday walk).
  member_id        uuid references public.wf_members(id) on delete cascade,
  owner_member_id  uuid references public.wf_members(id) on delete set null,
  name             text not null,
  template_id      text,
  focus            text not null default 'strength' check (focus in ('strength','cardio','mobility','family','kids')),
  goal_id          uuid,
  goal_label       text not null default '',
  weeks            integer not null default 4 check (weeks between 1 and 26),
  start_date       date not null,
  note             text not null default '',
  active           boolean not null default true,
  created_by       uuid references public.wf_members(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_workout_plans_space on public.wf_workout_plans(space_id);

-- A dated session. This is the row a calendar overlays; nothing is copied into
-- wf_events, because deleting the plan has to delete the sessions with it.
create table if not exists public.wf_workouts (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  plan_id          uuid references public.wf_workout_plans(id) on delete cascade,
  member_id        uuid references public.wf_members(id) on delete cascade,
  owner_member_id  uuid references public.wf_members(id) on delete set null,
  date             date not null,
  title            text not null,
  focus            text not null default 'strength' check (focus in ('strength','cardio','mobility','family','kids')),
  week             integer not null default 1,
  duration_min     integer not null default 20 check (duration_min > 0),
  exercises        jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_workouts_space_date on public.wf_workouts(space_id, date);

create table if not exists public.wf_workout_logs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  workout_id       uuid references public.wf_workouts(id) on delete cascade,
  plan_id          uuid references public.wf_workout_plans(id) on delete set null,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  owner_member_id  uuid references public.wf_members(id) on delete set null,
  date             date not null,
  title            text not null default '',
  duration_min     integer not null default 20 check (duration_min > 0),
  sets             text[] not null default '{}',
  feel             text not null default 'good' check (feel in ('easy','good','tough')),
  notes            text not null default '',
  logged_at        timestamptz not null default now(),
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_workout_logs_member on public.wf_workout_logs(member_id, date desc);

-- The most private table in the module. One row per member, parents only.
create table if not exists public.wf_health_notes (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  owner_member_id  uuid references public.wf_members(id) on delete set null,
  allergies        text not null default '',
  medications      text not null default '',
  conditions       text not null default '',
  gp               text not null default '',
  dentist          text not null default '',
  nhs_number       text not null default '',
  appointments     jsonb not null default '[]'::jsonb,
  vaccinations     jsonb not null default '[]'::jsonb,
  measurements     jsonb not null default '[]'::jsonb,
  notes            text not null default '',
  -- The sensitivity class the brief excludes from every child and guest pack.
  sensitivity      text not null default 'health' check (sensitivity = 'health'),
  updated_by       uuid references public.wf_members(id) on delete set null,
  updated_at       timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (space_id, member_id)
);

create table if not exists public.wf_recipes (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  space_id            uuid not null references public.wf_spaces(id) on delete cascade,
  name                text not null,
  blurb               text not null default '',
  image_url           text,
  -- [{ item, qty, priceEstimateCents }]
  ingredients         jsonb not null default '[]'::jsonb,
  steps               text[] not null default '{}',
  servings            integer not null default 4 check (servings > 0),
  minutes             integer not null default 30 check (minutes > 0),
  cost_estimate_cents integer not null default 0 check (cost_estimate_cents >= 0),
  child_safe          boolean not null default true,
  tags                text[] not null default '{}',
  created_by          uuid references public.wf_members(id) on delete set null,
  created_at          timestamptz not null default now()
);
create index if not exists idx_wf_recipes_space on public.wf_recipes(space_id);

create table if not exists public.wf_meal_plans (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  week_start       date not null,
  note             text not null default '',
  created_by       uuid references public.wf_members(id) on delete set null,
  created_at       timestamptz not null default now(),
  unique (space_id, week_start)
);

create table if not exists public.wf_meal_slots (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  plan_id          uuid not null references public.wf_meal_plans(id) on delete cascade,
  date             date not null,
  slot             text not null check (slot in ('breakfast','lunch','dinner')),
  recipe_id        uuid references public.wf_recipes(id) on delete set null,
  -- Stamped, so a child sees "Jollof rice" without reading the recipe row.
  title            text not null default '',
  cook_member_id   uuid references public.wf_members(id) on delete set null,
  note             text not null default '',
  created_at       timestamptz not null default now(),
  unique (plan_id, date, slot)
);
create index if not exists idx_wf_meal_slots_space_date on public.wf_meal_slots(space_id, date);

create table if not exists public.wf_grocery_lists (
  id                          uuid primary key default gen_random_uuid(),
  organization_id             uuid not null references public.organizations(id) on delete cascade,
  space_id                    uuid not null references public.wf_spaces(id) on delete cascade,
  plan_id                     uuid not null references public.wf_meal_plans(id) on delete cascade,
  week_start                  date not null,
  total_estimate_cents        integer not null default 0 check (total_estimate_cents >= 0),
  -- What Finance last said was left in the food envelope (AC 3). Copied, not
  -- joined: wellness never reads another module's tables.
  food_budget_remaining_cents integer not null default 0 check (food_budget_remaining_cents >= 0),
  budget_checked_at           timestamptz not null default now(),
  created_by                  uuid references public.wf_members(id) on delete set null,
  created_at                  timestamptz not null default now(),
  unique (space_id, plan_id)
);

create table if not exists public.wf_grocery_items (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  space_id            uuid not null references public.wf_spaces(id) on delete cascade,
  list_id             uuid not null references public.wf_grocery_lists(id) on delete cascade,
  item                text not null,
  qty                 text not null default '',
  price_estimate_cents integer not null default 0 check (price_estimate_cents >= 0),
  checked             boolean not null default false,
  -- Which recipe put it on the list; null = added by hand and never rebuilt.
  recipe_id           uuid references public.wf_recipes(id) on delete set null,
  created_at          timestamptz not null default now()
);
create index if not exists idx_wf_grocery_items_list on public.wf_grocery_items(list_id);

create table if not exists public.wf_challenges (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  space_id             uuid not null references public.wf_spaces(id) on delete cascade,
  name                 text not null,
  blurb                text not null default '',
  metric               text not null default 'days' check (metric in ('steps','minutes','glasses','days')),
  target               integer not null default 1 check (target > 0),
  start_date           date not null,
  end_date             date not null,
  sprouts              integer not null default 0 check (sprouts >= 0),
  member_ids           uuid[] not null default '{}',
  completed_at         timestamptz,
  -- Sprouts are credited once, and this is the proof.
  credited_member_ids  uuid[] not null default '{}',
  created_by           uuid references public.wf_members(id) on delete set null,
  created_at           timestamptz not null default now()
);

create table if not exists public.wf_challenge_entries (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  challenge_id     uuid not null references public.wf_challenges(id) on delete cascade,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  owner_member_id  uuid references public.wf_members(id) on delete set null,
  date             date not null,
  value            numeric not null default 0,
  at               timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (challenge_id, member_id, date)
);

create table if not exists public.wf_wellness_goals (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  member_id        uuid references public.wf_members(id) on delete cascade,
  owner_member_id  uuid references public.wf_members(id) on delete set null,
  name             text not null,
  goal_id          uuid,
  goal_label       text not null default '',
  target           numeric not null default 1 check (target > 0),
  current          numeric not null default 0,
  unit             text not null default '',
  due_date         date,
  note             text not null default '',
  created_at       timestamptz not null default now()
);

-- Pre-loaded content: the named routine catalogue (src/modules/wellness/templates.ts).
create table if not exists public.wf_catalog_workouts (
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  slug             text not null,
  name             text not null,
  blurb            text not null default '',
  focus            text not null default 'strength' check (focus in ('strength','cardio','mobility','family','kids')),
  band             text not null default 'adult' check (band in ('adult','teen','child','family')),
  weeks            integer not null default 6 check (weeks between 1 and 26),
  image_url        text not null default '',
  -- [{ title, weekday, durationMin, exercises: [{ name, sets, reps, minutes, note }] }]
  sessions         jsonb not null default '[]'::jsonb,
  primary key (organization_id, slug)
);

-- ---------------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------------

-- A parent, or a member a parent has widened with 'wellness.manage'. The one
-- exception to "wellness is mine and nobody else's".
create or replace function public.wf_wellness_manages(p_space uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select wf_is_parent(p_space)
      or coalesce((
           select (m.grants ->> 'wellness.manage')::boolean
           from wf_members m
           where m.space_id = p_space and m.user_id = auth.uid()
           limit 1
         ), false)
$$;

-- Mine, a household row that belongs to nobody in particular, or a parent's reach.
create or replace function public.wf_wellness_mine(p_space uuid, p_member uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select wf_wellness_manages(p_space) or p_member is null or p_member = wf_my_member(p_space)
$$;

-- ---------------------------------------------------------------------------
-- 3. Policies
-- ---------------------------------------------------------------------------

alter table public.wf_habits            enable row level security;
alter table public.wf_habit_logs        enable row level security;
alter table public.wf_streak_freezes    enable row level security;
alter table public.wf_workout_plans     enable row level security;
alter table public.wf_workouts          enable row level security;
alter table public.wf_workout_logs      enable row level security;
alter table public.wf_health_notes      enable row level security;
alter table public.wf_recipes           enable row level security;
alter table public.wf_meal_plans        enable row level security;
alter table public.wf_meal_slots        enable row level security;
alter table public.wf_grocery_lists     enable row level security;
alter table public.wf_grocery_items     enable row level security;
alter table public.wf_challenges        enable row level security;
alter table public.wf_challenge_entries enable row level security;
alter table public.wf_wellness_goals    enable row level security;
alter table public.wf_catalog_workouts  enable row level security;

-- -- habits, logs, freezes ---------------------------------------------------

drop policy if exists wf_habits_read on public.wf_habits;
create policy wf_habits_read on public.wf_habits for select to authenticated
using (wf_is_member(space_id) and wf_my_role(space_id) <> 'guest' and wf_wellness_mine(space_id, member_id));

drop policy if exists wf_habits_write on public.wf_habits;
create policy wf_habits_write on public.wf_habits for insert to authenticated
with check (wf_is_member(space_id) and wf_my_role(space_id) <> 'guest' and wf_wellness_mine(space_id, member_id));

drop policy if exists wf_habits_edit on public.wf_habits;
create policy wf_habits_edit on public.wf_habits for update to authenticated
using (wf_wellness_mine(space_id, member_id));

drop policy if exists wf_habits_del on public.wf_habits;
create policy wf_habits_del on public.wf_habits for delete to authenticated
using (wf_wellness_mine(space_id, member_id));

drop policy if exists wf_habit_logs_read on public.wf_habit_logs;
create policy wf_habit_logs_read on public.wf_habit_logs for select to authenticated
using (wf_is_member(space_id) and wf_my_role(space_id) <> 'guest' and wf_wellness_mine(space_id, member_id));

drop policy if exists wf_habit_logs_write on public.wf_habit_logs;
create policy wf_habit_logs_write on public.wf_habit_logs for insert to authenticated
with check (wf_is_member(space_id) and wf_wellness_mine(space_id, member_id));

drop policy if exists wf_habit_logs_edit on public.wf_habit_logs;
create policy wf_habit_logs_edit on public.wf_habit_logs for update to authenticated
using (wf_wellness_mine(space_id, member_id));

drop policy if exists wf_habit_logs_del on public.wf_habit_logs;
create policy wf_habit_logs_del on public.wf_habit_logs for delete to authenticated
using (wf_wellness_mine(space_id, member_id));

drop policy if exists wf_streak_freezes_read on public.wf_streak_freezes;
create policy wf_streak_freezes_read on public.wf_streak_freezes for select to authenticated
using (wf_is_member(space_id) and wf_my_role(space_id) <> 'guest' and wf_wellness_mine(space_id, member_id));

drop policy if exists wf_streak_freezes_write on public.wf_streak_freezes;
create policy wf_streak_freezes_write on public.wf_streak_freezes for insert to authenticated
with check (wf_is_member(space_id) and wf_wellness_mine(space_id, member_id));

drop policy if exists wf_streak_freezes_del on public.wf_streak_freezes;
create policy wf_streak_freezes_del on public.wf_streak_freezes for delete to authenticated
using (wf_wellness_mine(space_id, member_id));

-- -- workouts ----------------------------------------------------------------

drop policy if exists wf_workout_plans_read on public.wf_workout_plans;
create policy wf_workout_plans_read on public.wf_workout_plans for select to authenticated
using (wf_is_member(space_id) and wf_my_role(space_id) <> 'guest' and wf_wellness_mine(space_id, member_id));

drop policy if exists wf_workout_plans_write on public.wf_workout_plans;
create policy wf_workout_plans_write on public.wf_workout_plans for insert to authenticated
with check (wf_is_member(space_id) and wf_wellness_mine(space_id, member_id));

drop policy if exists wf_workout_plans_edit on public.wf_workout_plans;
create policy wf_workout_plans_edit on public.wf_workout_plans for update to authenticated
using (wf_wellness_mine(space_id, member_id));

drop policy if exists wf_workout_plans_del on public.wf_workout_plans;
create policy wf_workout_plans_del on public.wf_workout_plans for delete to authenticated
using (wf_wellness_mine(space_id, member_id));

drop policy if exists wf_workouts_read on public.wf_workouts;
create policy wf_workouts_read on public.wf_workouts for select to authenticated
using (wf_is_member(space_id) and wf_my_role(space_id) <> 'guest' and wf_wellness_mine(space_id, member_id));

drop policy if exists wf_workouts_write on public.wf_workouts;
create policy wf_workouts_write on public.wf_workouts for insert to authenticated
with check (wf_is_member(space_id) and wf_wellness_mine(space_id, member_id));

drop policy if exists wf_workouts_edit on public.wf_workouts;
create policy wf_workouts_edit on public.wf_workouts for update to authenticated
using (wf_wellness_mine(space_id, member_id));

drop policy if exists wf_workouts_del on public.wf_workouts;
create policy wf_workouts_del on public.wf_workouts for delete to authenticated
using (wf_wellness_mine(space_id, member_id));

drop policy if exists wf_workout_logs_read on public.wf_workout_logs;
create policy wf_workout_logs_read on public.wf_workout_logs for select to authenticated
using (wf_is_member(space_id) and wf_my_role(space_id) <> 'guest' and wf_wellness_mine(space_id, member_id));

drop policy if exists wf_workout_logs_write on public.wf_workout_logs;
create policy wf_workout_logs_write on public.wf_workout_logs for insert to authenticated
with check (wf_is_member(space_id) and wf_wellness_mine(space_id, member_id));

drop policy if exists wf_workout_logs_edit on public.wf_workout_logs;
create policy wf_workout_logs_edit on public.wf_workout_logs for update to authenticated
using (wf_wellness_mine(space_id, member_id));

drop policy if exists wf_workout_logs_del on public.wf_workout_logs;
create policy wf_workout_logs_del on public.wf_workout_logs for delete to authenticated
using (wf_wellness_mine(space_id, member_id));

-- -- health notes: the sharpest line in the module (AC 4) ---------------------
--
-- A parent reads every note. Anybody else reads their OWN note and only when a
-- parent has granted them 'wellness.manage'. There is no third case, and no
-- clause here mentions visibility or shared_with — a health note is not a
-- thing you share by ticking a box.

drop policy if exists wf_health_notes_read on public.wf_health_notes;
create policy wf_health_notes_read on public.wf_health_notes for select to authenticated
using (
  wf_is_parent(space_id)
  or (member_id = wf_my_member(space_id) and wf_wellness_manages(space_id))
);

drop policy if exists wf_health_notes_write on public.wf_health_notes;
create policy wf_health_notes_write on public.wf_health_notes for insert to authenticated
with check (
  wf_is_parent(space_id)
  or (member_id = wf_my_member(space_id) and wf_wellness_manages(space_id))
);

drop policy if exists wf_health_notes_edit on public.wf_health_notes;
create policy wf_health_notes_edit on public.wf_health_notes for update to authenticated
using (
  wf_is_parent(space_id)
  or (member_id = wf_my_member(space_id) and wf_wellness_manages(space_id))
);

drop policy if exists wf_health_notes_del on public.wf_health_notes;
create policy wf_health_notes_del on public.wf_health_notes for delete to authenticated
using (wf_is_parent(space_id));

-- -- food: everyone reads what is for dinner, parents write ------------------

drop policy if exists wf_recipes_read on public.wf_recipes;
create policy wf_recipes_read on public.wf_recipes for select to authenticated
using (wf_is_member(space_id) and (wf_my_role(space_id) <> 'child' or child_safe));

drop policy if exists wf_recipes_write on public.wf_recipes;
create policy wf_recipes_write on public.wf_recipes for insert to authenticated
with check (wf_wellness_manages(space_id));

drop policy if exists wf_recipes_edit on public.wf_recipes;
create policy wf_recipes_edit on public.wf_recipes for update to authenticated
using (wf_wellness_manages(space_id));

drop policy if exists wf_recipes_del on public.wf_recipes;
create policy wf_recipes_del on public.wf_recipes for delete to authenticated
using (wf_wellness_manages(space_id));

drop policy if exists wf_meal_plans_read on public.wf_meal_plans;
create policy wf_meal_plans_read on public.wf_meal_plans for select to authenticated using (wf_is_member(space_id));

drop policy if exists wf_meal_plans_write on public.wf_meal_plans;
create policy wf_meal_plans_write on public.wf_meal_plans for insert to authenticated with check (wf_wellness_manages(space_id));

drop policy if exists wf_meal_plans_edit on public.wf_meal_plans;
create policy wf_meal_plans_edit on public.wf_meal_plans for update to authenticated using (wf_wellness_manages(space_id));

drop policy if exists wf_meal_plans_del on public.wf_meal_plans;
create policy wf_meal_plans_del on public.wf_meal_plans for delete to authenticated using (wf_wellness_manages(space_id));

drop policy if exists wf_meal_slots_read on public.wf_meal_slots;
create policy wf_meal_slots_read on public.wf_meal_slots for select to authenticated using (wf_is_member(space_id));

drop policy if exists wf_meal_slots_write on public.wf_meal_slots;
create policy wf_meal_slots_write on public.wf_meal_slots for insert to authenticated with check (wf_wellness_manages(space_id));

drop policy if exists wf_meal_slots_edit on public.wf_meal_slots;
create policy wf_meal_slots_edit on public.wf_meal_slots for update to authenticated using (wf_wellness_manages(space_id));

drop policy if exists wf_meal_slots_del on public.wf_meal_slots;
create policy wf_meal_slots_del on public.wf_meal_slots for delete to authenticated using (wf_wellness_manages(space_id));

-- The shop is money. Parents only, read and write (AC 3's numbers never reach
-- a child even as a total).

drop policy if exists wf_grocery_lists_read on public.wf_grocery_lists;
create policy wf_grocery_lists_read on public.wf_grocery_lists for select to authenticated using (wf_wellness_manages(space_id));

drop policy if exists wf_grocery_lists_write on public.wf_grocery_lists;
create policy wf_grocery_lists_write on public.wf_grocery_lists for insert to authenticated with check (wf_wellness_manages(space_id));

drop policy if exists wf_grocery_lists_edit on public.wf_grocery_lists;
create policy wf_grocery_lists_edit on public.wf_grocery_lists for update to authenticated using (wf_wellness_manages(space_id));

drop policy if exists wf_grocery_lists_del on public.wf_grocery_lists;
create policy wf_grocery_lists_del on public.wf_grocery_lists for delete to authenticated using (wf_wellness_manages(space_id));

drop policy if exists wf_grocery_items_read on public.wf_grocery_items;
create policy wf_grocery_items_read on public.wf_grocery_items for select to authenticated using (wf_wellness_manages(space_id));

drop policy if exists wf_grocery_items_write on public.wf_grocery_items;
create policy wf_grocery_items_write on public.wf_grocery_items for insert to authenticated with check (wf_wellness_manages(space_id));

drop policy if exists wf_grocery_items_edit on public.wf_grocery_items;
create policy wf_grocery_items_edit on public.wf_grocery_items for update to authenticated using (wf_wellness_manages(space_id));

drop policy if exists wf_grocery_items_del on public.wf_grocery_items;
create policy wf_grocery_items_del on public.wf_grocery_items for delete to authenticated using (wf_wellness_manages(space_id));

-- -- challenges and goals ----------------------------------------------------

drop policy if exists wf_challenges_read on public.wf_challenges;
create policy wf_challenges_read on public.wf_challenges for select to authenticated
using (wf_is_member(space_id) and wf_my_role(space_id) <> 'guest');

drop policy if exists wf_challenges_write on public.wf_challenges;
create policy wf_challenges_write on public.wf_challenges for insert to authenticated with check (wf_wellness_manages(space_id));

drop policy if exists wf_challenges_edit on public.wf_challenges;
create policy wf_challenges_edit on public.wf_challenges for update to authenticated using (wf_wellness_manages(space_id));

drop policy if exists wf_challenges_del on public.wf_challenges;
create policy wf_challenges_del on public.wf_challenges for delete to authenticated using (wf_wellness_manages(space_id));

drop policy if exists wf_challenge_entries_read on public.wf_challenge_entries;
create policy wf_challenge_entries_read on public.wf_challenge_entries for select to authenticated
using (wf_is_member(space_id) and wf_my_role(space_id) <> 'guest');

drop policy if exists wf_challenge_entries_write on public.wf_challenge_entries;
create policy wf_challenge_entries_write on public.wf_challenge_entries for insert to authenticated
with check (wf_is_member(space_id) and wf_wellness_mine(space_id, member_id));

drop policy if exists wf_challenge_entries_edit on public.wf_challenge_entries;
create policy wf_challenge_entries_edit on public.wf_challenge_entries for update to authenticated
using (wf_wellness_mine(space_id, member_id));

drop policy if exists wf_challenge_entries_del on public.wf_challenge_entries;
create policy wf_challenge_entries_del on public.wf_challenge_entries for delete to authenticated
using (wf_wellness_mine(space_id, member_id));

drop policy if exists wf_wellness_goals_read on public.wf_wellness_goals;
create policy wf_wellness_goals_read on public.wf_wellness_goals for select to authenticated
using (wf_is_member(space_id) and wf_my_role(space_id) <> 'guest' and wf_wellness_mine(space_id, member_id));

drop policy if exists wf_wellness_goals_write on public.wf_wellness_goals;
create policy wf_wellness_goals_write on public.wf_wellness_goals for insert to authenticated
with check (wf_is_member(space_id) and wf_wellness_mine(space_id, member_id));

drop policy if exists wf_wellness_goals_edit on public.wf_wellness_goals;
create policy wf_wellness_goals_edit on public.wf_wellness_goals for update to authenticated
using (wf_wellness_mine(space_id, member_id));

drop policy if exists wf_wellness_goals_del on public.wf_wellness_goals;
create policy wf_wellness_goals_del on public.wf_wellness_goals for delete to authenticated
using (wf_wellness_mine(space_id, member_id));

drop policy if exists wf_catalog_workouts_read on public.wf_catalog_workouts;
create policy wf_catalog_workouts_read on public.wf_catalog_workouts for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 4. Provisioning — the named routine catalogue a new family starts from
-- ---------------------------------------------------------------------------

create or replace function public.wf_seed_wellness(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into wf_catalog_workouts (organization_id, slug, name, blurb, focus, band, weeks, image_url, sessions) values
    (p_org, 'tpl-strength-3', 'Beginner strength 3×/week',
     'Squat, push, pull, carry. Eight weeks of the four movements that keep a body useful, with nothing you need a gym for.',
     'strength', 'adult', 8, '/images/wellness-strength.jpg', '[
       {"title":"Full body A","weekday":1,"durationMin":35,"exercises":[
         {"name":"Goblet squat","sets":3,"reps":"10","minutes":null,"note":"One kettlebell or a heavy bag."},
         {"name":"Press-ups","sets":3,"reps":"8–12","minutes":null,"note":"On the stairs if the floor is too hard."},
         {"name":"Bent-over row","sets":3,"reps":"10","minutes":null,"note":""},
         {"name":"Farmer''s carry","sets":3,"reps":"30 steps","minutes":null,"note":""},
         {"name":"Dead bug","sets":2,"reps":"10 each side","minutes":null,"note":""}]},
       {"title":"Full body B","weekday":3,"durationMin":35,"exercises":[
         {"name":"Romanian deadlift","sets":3,"reps":"10","minutes":null,"note":""},
         {"name":"Split squat","sets":3,"reps":"8 each leg","minutes":null,"note":""},
         {"name":"Overhead press","sets":3,"reps":"8","minutes":null,"note":""},
         {"name":"Plank","sets":3,"reps":"30–45s","minutes":null,"note":""}]},
       {"title":"Full body C","weekday":6,"durationMin":40,"exercises":[
         {"name":"Goblet squat","sets":4,"reps":"8","minutes":null,"note":""},
         {"name":"Press-ups","sets":3,"reps":"as many as good form allows","minutes":null,"note":""},
         {"name":"Single-arm row","sets":3,"reps":"10 each side","minutes":null,"note":""},
         {"name":"Glute bridge","sets":3,"reps":"12","minutes":null,"note":""},
         {"name":"Brisk walk to finish","sets":null,"reps":"","minutes":10,"note":""}]}]'::jsonb),

    (p_org, 'tpl-couch-5k', 'Couch to 5k',
     'Nine weeks from a standing start to running five kilometres without stopping. Walk breaks are part of the plan, not a failure.',
     'cardio', 'adult', 9, '/images/wellness-run.jpg', '[
       {"title":"Run 1","weekday":2,"durationMin":28,"exercises":[
         {"name":"Brisk walk","sets":null,"reps":"","minutes":5,"note":"Warm up."},
         {"name":"Run 60s / walk 90s","sets":8,"reps":"×","minutes":null,"note":"Repeat until the clock says 20 minutes."},
         {"name":"Walk home","sets":null,"reps":"","minutes":5,"note":""}]},
       {"title":"Run 2","weekday":4,"durationMin":28,"exercises":[
         {"name":"Brisk walk","sets":null,"reps":"","minutes":5,"note":""},
         {"name":"Run 60s / walk 90s","sets":8,"reps":"×","minutes":null,"note":""},
         {"name":"Walk home","sets":null,"reps":"","minutes":5,"note":""}]},
       {"title":"Run 3 — the long one","weekday":7,"durationMin":34,"exercises":[
         {"name":"Brisk walk","sets":null,"reps":"","minutes":5,"note":""},
         {"name":"Run 90s / walk 2 min","sets":7,"reps":"×","minutes":null,"note":""},
         {"name":"Stretch","sets":null,"reps":"","minutes":5,"note":""}]}]'::jsonb),

    (p_org, 'tpl-commuter-cycling', 'Commuter cycling build',
     'Eight weeks of turning the ride to the station into training: one steady, one hilly, one long at the weekend with the club.',
     'cardio', 'adult', 8, '/images/wellness-cycling.jpg', '[
       {"title":"Steady spin","weekday":2,"durationMin":45,"exercises":[
         {"name":"Easy warm-up","sets":null,"reps":"","minutes":10,"note":""},
         {"name":"Steady effort","sets":null,"reps":"","minutes":25,"note":"You can still hold a sentence."},
         {"name":"Spin down","sets":null,"reps":"","minutes":10,"note":""}]},
       {"title":"Hills","weekday":4,"durationMin":50,"exercises":[
         {"name":"Warm-up","sets":null,"reps":"","minutes":12,"note":""},
         {"name":"Hill repeats","sets":6,"reps":"2 min up, roll down","minutes":null,"note":""},
         {"name":"Cool down","sets":null,"reps":"","minutes":10,"note":""}]},
       {"title":"Club run","weekday":6,"durationMin":90,"exercises":[
         {"name":"Group ride","sets":null,"reps":"","minutes":90,"note":"Café stop counts as part of it."}]}]'::jsonb),

    (p_org, 'tpl-mobility-15', 'Core & mobility 15',
     'Fifteen minutes before bed for hips, back and shoulders — the antidote to a day at a desk.',
     'mobility', 'adult', 6, '/images/wellness-mobility.jpg', '[
       {"title":"Unwind","weekday":1,"durationMin":15,"exercises":[
         {"name":"Cat–cow","sets":null,"reps":"","minutes":2,"note":""},
         {"name":"90/90 hip switches","sets":null,"reps":"","minutes":3,"note":""},
         {"name":"Thoracic openers","sets":null,"reps":"","minutes":3,"note":""},
         {"name":"Hamstring stretch","sets":null,"reps":"","minutes":3,"note":""},
         {"name":"Breathing","sets":null,"reps":"","minutes":4,"note":""}]},
       {"title":"Unwind","weekday":3,"durationMin":15,"exercises":[
         {"name":"Cat–cow","sets":null,"reps":"","minutes":2,"note":""},
         {"name":"Deep squat hold","sets":null,"reps":"","minutes":3,"note":""},
         {"name":"Couch stretch","sets":null,"reps":"","minutes":4,"note":""},
         {"name":"Breathing","sets":null,"reps":"","minutes":6,"note":""}]},
       {"title":"Unwind","weekday":5,"durationMin":15,"exercises":[
         {"name":"Full body flow","sets":null,"reps":"","minutes":8,"note":""},
         {"name":"Breathing","sets":null,"reps":"","minutes":7,"note":""}]}]'::jsonb),

    (p_org, 'tpl-family-walk', 'Family Saturday walk',
     'One long walk a week that everybody comes on. Nobody is too small for it.',
     'family', 'family', 12, '/images/wellness-walk.jpg', '[
       {"title":"Saturday walk","weekday":6,"durationMin":60,"exercises":[
         {"name":"Walk somewhere green","sets":null,"reps":"","minutes":55,"note":"The youngest picks the route once a month."},
         {"name":"Something warm at the end","sets":null,"reps":"","minutes":5,"note":""}]}]'::jsonb),

    (p_org, 'tpl-kids-burst', 'Kids'' 10-minute energy burst',
     'Ten minutes, five silly movements, no equipment. Made for a rainy Tuesday between lessons.',
     'kids', 'child', 6, '/images/wellness-kids.jpg', '[
       {"title":"Burst","weekday":2,"durationMin":10,"exercises":[
         {"name":"Star jumps","sets":3,"reps":"20","minutes":null,"note":""},
         {"name":"Bear crawl the hallway","sets":3,"reps":"there and back","minutes":null,"note":""},
         {"name":"Frog jumps","sets":3,"reps":"10","minutes":null,"note":""},
         {"name":"Balance on one leg","sets":2,"reps":"20s each","minutes":null,"note":""},
         {"name":"Silly dance","sets":null,"reps":"","minutes":2,"note":""}]},
       {"title":"Burst","weekday":4,"durationMin":10,"exercises":[
         {"name":"Hopscotch","sets":null,"reps":"","minutes":3,"note":""},
         {"name":"Wall sit race","sets":2,"reps":"30s","minutes":null,"note":""},
         {"name":"Crab walk","sets":3,"reps":"the length of the room","minutes":null,"note":""},
         {"name":"Silly dance","sets":null,"reps":"","minutes":2,"note":""}]}]'::jsonb)
  on conflict (organization_id, slug) do update
    set name = excluded.name, blurb = excluded.blurb, focus = excluded.focus, band = excluded.band,
        weeks = excluded.weeks, image_url = excluded.image_url, sessions = excluded.sessions;
end $$;
grant execute on function public.wf_seed_wellness(uuid) to authenticated;


-- ===========================================================================
-- MODULE 17/19 — studio (businesses/wafe/sql/studio.sql)
-- ===========================================================================
-- Wàfè — studio: the AI companion's conversations, the monthly allowance, and
-- everything the studio makes (songs with their lead sheets, storyboards with
-- their scenes, and pictures — generated or kept as a typographic card).
--
-- Idempotent. Depends only on 00-foundation (wf_spaces, wf_members and the
-- helpers wf_is_member / wf_is_parent / wf_my_member / wf_can_see). It never
-- references another module's tables: a song that belongs to a project keeps
-- the project's id, a storyboard that has been sent to Memories keeps a
-- reel_id, and both are joined in the app.
--
-- THE PRIVACY MODEL, in one paragraph. A conversation belongs to the person
-- who had it, full stop — with exactly one exception, which the family is told
-- about in the interface: a child's conversation carries visible_to_parents,
-- so a parent can read it and nobody else can, not even the other child. The
-- outputs (songs, storyboards, pictures) follow the ordinary visibility rules,
-- which is what lets a storyboard be shared with Grandma without sharing the
-- gallery. Messages inherit their conversation's reachability through an
-- exists() on the parent row, so there is no way to select a message whose
-- conversation you may not open. The monthly allowance is one row per space
-- per month: every member may read it (the meter is on their screen), only a
-- parent may change the plan, and the gateway — the wafe-ai edge function —
-- is what actually refuses the call when it is spent.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

-- The companion's conversations. `module_context` is where the question was
-- asked from ("travel", "home"…), so the answer can be read back in context.
create table if not exists public.wf_ai_conversations (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  space_id           uuid not null references public.wf_spaces(id) on delete cascade,
  owner_member_id    uuid references public.wf_members(id) on delete set null,
  title              text not null,
  module_context     text not null default 'home',
  visibility         text not null default 'private' check (visibility in ('private','shared','family','child')),
  shared_with        uuid[] not null default '{}',
  child_safe         boolean not null default false,
  -- Set when the conversation is created by a child. Parents see it; the
  -- interface says so before the child types a word.
  visible_to_parents boolean not null default false,
  cost_cents         integer not null default 0 check (cost_cents >= 0),
  created_at         timestamptz not null default now()
);
create index if not exists idx_wf_ai_conversations_space on public.wf_ai_conversations(space_id, created_at desc);

-- One turn. `sources` is the array of chips shown under the answer, `proposal`
-- is the card the member has to confirm, and `blocked` records the turns that
-- never reached a model at all: 'safety' (the child-safety classifier),
-- 'cap' (the allowance was spent) and 'scope' ("I can't see that").
create table if not exists public.wf_ai_messages (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  conversation_id uuid not null references public.wf_ai_conversations(id) on delete cascade,
  sender          text not null check (sender in ('me','wafe')),
  body            text not null default '',
  sources         jsonb not null default '[]'::jsonb,
  proposal        jsonb,
  blocked         text check (blocked is null or blocked in ('safety','cap','scope')),
  model           text,
  tokens          integer not null default 0 check (tokens >= 0),
  cost_cents      integer not null default 0 check (cost_cents >= 0),
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_ai_messages_conversation on public.wf_ai_messages(conversation_id, created_at);

-- The monthly allowance: one row per space per month.
create table if not exists public.wf_ai_usage (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  month           text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  tokens          integer not null default 0 check (tokens >= 0),
  cost_cents      integer not null default 0 check (cost_cents >= 0),
  cap_cents       integer not null default 1200 check (cap_cents > 0),
  plan            text not null default 'household' check (plan in ('seed','household','legacy')),
  warned_at       timestamptz,
  created_at      timestamptz not null default now(),
  unique (space_id, month)
);

-- A song is a lead sheet: a key, a tempo and named sections with a chord line.
-- `structure` holds [{section, chords, lyrics}]; `recording` holds the family's
-- own take, captured in the browser and uploaded to the catalog bucket.
create table if not exists public.wf_songs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  owner_member_id uuid references public.wf_members(id) on delete set null,
  title           text not null,
  song_kind       text not null default 'family' check (song_kind in ('family','worship','lullaby','birthday')),
  music_key       text not null default 'G',
  tempo           integer not null default 96 check (tempo between 40 and 200),
  theme           text not null default '',
  names           text[] not null default '{}',
  prompt          text not null default '',
  source          text not null default 'template' check (source in ('ai','template')),
  model           text,
  structure       jsonb not null default '[]'::jsonb,
  recording       jsonb,
  -- The creative project this belongs to (constraint added below, because
  -- wf_creative_projects is declared after this table).
  project_id      uuid,
  visibility      text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with     uuid[] not null default '{}',
  child_safe      boolean not null default true,
  cost_cents      integer not null default 0 check (cost_cents >= 0),
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_songs_space on public.wf_songs(space_id, created_at desc);

create table if not exists public.wf_storyboards (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  owner_member_id  uuid references public.wf_members(id) on delete set null,
  title            text not null,
  audience         text not null default 'family' check (audience in ('little','junior','teen','family')),
  prompt           text not null default '',
  source           text not null default 'template' check (source in ('ai','template')),
  model            text,
  -- Set when the storyboard is handed to Memories to play. The studio owns no
  -- second player: this id is the reel, and the reel player is the renderer.
  reel_id          uuid,
  sent_to_reel_at  timestamptz,
  project_id       uuid,
  visibility       text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with      uuid[] not null default '{}',
  child_safe       boolean not null default true,
  cost_cents       integer not null default 0 check (cost_cents >= 0),
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_storyboards_space on public.wf_storyboards(space_id, created_at desc);

create table if not exists public.wf_storyboard_scenes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  storyboard_id   uuid not null references public.wf_storyboards(id) on delete cascade,
  scene_order     integer not null check (scene_order between 1 and 12),
  caption         text not null default '',
  visual          text not null default '',
  narration       text not null default '',
  image_url       text,
  image_kind      text not null default 'none' check (image_kind in ('ai','family','none')),
  created_at      timestamptz not null default now(),
  unique (storyboard_id, scene_order)
);
create index if not exists idx_wf_storyboard_scenes_board on public.wf_storyboard_scenes(storyboard_id, scene_order);

-- A picture, or the honest absence of one. `status = 'unavailable_typographic'`
-- means no image model on this plan: the prompt is kept and the family gets a
-- typographic card rather than a silent failure.
create table if not exists public.wf_studio_images (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  owner_member_id uuid references public.wf_members(id) on delete set null,
  title           text not null,
  prompt          text not null default '',
  url             text,
  status          text not null default 'unavailable_typographic' check (status in ('generated','unavailable_typographic')),
  model           text,
  note            text not null default '',
  palette         integer not null default 0 check (palette between 0 and 5),
  project_id      uuid,
  visibility      text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with     uuid[] not null default '{}',
  child_safe      boolean not null default true,
  cost_cents      integer not null default 0 check (cost_cents >= 0),
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_studio_images_space on public.wf_studio_images(space_id, created_at desc);

create table if not exists public.wf_creative_projects (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  owner_member_id uuid references public.wf_members(id) on delete set null,
  name            text not null,
  child_safe      boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_creative_projects_space on public.wf_creative_projects(space_id);

-- wf_songs / wf_storyboards / wf_studio_images reference wf_creative_projects,
-- which is created after them on a first run; add the constraints once the
-- table exists so the file can be applied in any order.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wf_songs_project_fk') then
    alter table public.wf_songs add constraint wf_songs_project_fk
      foreign key (project_id) references public.wf_creative_projects(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wf_storyboards_project_fk') then
    alter table public.wf_storyboards add constraint wf_storyboards_project_fk
      foreign key (project_id) references public.wf_creative_projects(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wf_studio_images_project_fk') then
    alter table public.wf_studio_images add constraint wf_studio_images_project_fk
      foreign key (project_id) references public.wf_creative_projects(id) on delete set null;
  end if;
exception when duplicate_object or undefined_table then null;
end $$;

-- Pre-loaded starters, so a brand-new family opens the studio on something
-- rather than a blank prompt box. Public read, keyed by organisation.
create table if not exists public.wf_catalog_studio_prompts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug            text not null,
  kind            text not null check (kind in ('song','story','image')),
  title           text not null,
  prompt          text not null,
  audience        text not null default 'family',
  child_safe      boolean not null default true,
  sort_order      integer not null default 0,
  unique (organization_id, slug)
);

-- ---------------------------------------------------------------------------
-- 2. Row-level security
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'wf_ai_conversations','wf_ai_messages','wf_ai_usage','wf_songs','wf_storyboards',
    'wf_storyboard_scenes','wf_studio_images','wf_creative_projects','wf_catalog_studio_prompts'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Conversations: mine, plus a child's when it is flagged for parents.
drop policy if exists wf_ai_conversations_read on public.wf_ai_conversations;
create policy wf_ai_conversations_read on public.wf_ai_conversations for select to authenticated
  using (
    owner_member_id = wf_my_member(space_id)
    or (visible_to_parents and wf_is_parent(space_id))
  );
drop policy if exists wf_ai_conversations_write on public.wf_ai_conversations;
create policy wf_ai_conversations_write on public.wf_ai_conversations for insert to authenticated
  with check (wf_is_member(space_id) and owner_member_id = wf_my_member(space_id));
drop policy if exists wf_ai_conversations_edit on public.wf_ai_conversations;
create policy wf_ai_conversations_edit on public.wf_ai_conversations for update to authenticated
  using (owner_member_id = wf_my_member(space_id) or (visible_to_parents and wf_is_parent(space_id)));
drop policy if exists wf_ai_conversations_del on public.wf_ai_conversations;
create policy wf_ai_conversations_del on public.wf_ai_conversations for delete to authenticated
  using (owner_member_id = wf_my_member(space_id) or (visible_to_parents and wf_is_parent(space_id)));

-- Messages inherit the conversation exactly: if you cannot open the thread you
-- cannot select a line of it.
drop policy if exists wf_ai_messages_read on public.wf_ai_messages;
create policy wf_ai_messages_read on public.wf_ai_messages for select to authenticated
  using (exists (select 1 from public.wf_ai_conversations c where c.id = conversation_id));
drop policy if exists wf_ai_messages_write on public.wf_ai_messages;
create policy wf_ai_messages_write on public.wf_ai_messages for insert to authenticated
  with check (exists (
    select 1 from public.wf_ai_conversations c
    where c.id = conversation_id and c.owner_member_id = wf_my_member(c.space_id)
  ));
-- Only the proposal's status ever changes, and only the owner or a parent
-- moves it — this is the single write path from "suggested" to "decided".
drop policy if exists wf_ai_messages_edit on public.wf_ai_messages;
create policy wf_ai_messages_edit on public.wf_ai_messages for update to authenticated
  using (exists (
    select 1 from public.wf_ai_conversations c
    where c.id = conversation_id
      and (c.owner_member_id = wf_my_member(c.space_id) or (c.visible_to_parents and wf_is_parent(c.space_id)))
  ));
drop policy if exists wf_ai_messages_del on public.wf_ai_messages;
create policy wf_ai_messages_del on public.wf_ai_messages for delete to authenticated
  using (exists (
    select 1 from public.wf_ai_conversations c
    where c.id = conversation_id and c.owner_member_id = wf_my_member(c.space_id)
  ));

-- The allowance: everyone in the family sees the meter, parents set the plan.
drop policy if exists wf_ai_usage_read on public.wf_ai_usage;
create policy wf_ai_usage_read on public.wf_ai_usage for select to authenticated using (wf_is_member(space_id));
drop policy if exists wf_ai_usage_write on public.wf_ai_usage;
create policy wf_ai_usage_write on public.wf_ai_usage for insert to authenticated with check (wf_is_member(space_id));
drop policy if exists wf_ai_usage_edit on public.wf_ai_usage;
create policy wf_ai_usage_edit on public.wf_ai_usage for update to authenticated using (wf_is_member(space_id));

-- The outputs: the ordinary visibility rules, so a storyboard can be shared
-- with Grandma without sharing the gallery.
do $$
declare t text;
begin
  foreach t in array array['wf_songs','wf_storyboards','wf_studio_images'] loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (wf_can_see(space_id, owner_member_id, visibility, shared_with))', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (wf_is_member(space_id) and wf_my_role(space_id) <> ''guest'')', t || '_write', t);
    execute format('drop policy if exists %I on public.%I', t || '_edit', t);
    execute format('create policy %I on public.%I for update to authenticated using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id))', t || '_edit', t);
    execute format('drop policy if exists %I on public.%I', t || '_del', t);
    execute format('create policy %I on public.%I for delete to authenticated using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id))', t || '_del', t);
  end loop;
end $$;

-- A scene is reachable exactly when its storyboard is.
drop policy if exists wf_storyboard_scenes_read on public.wf_storyboard_scenes;
create policy wf_storyboard_scenes_read on public.wf_storyboard_scenes for select to authenticated
  using (exists (select 1 from public.wf_storyboards b where b.id = storyboard_id));
drop policy if exists wf_storyboard_scenes_write on public.wf_storyboard_scenes;
create policy wf_storyboard_scenes_write on public.wf_storyboard_scenes for insert to authenticated
  with check (exists (
    select 1 from public.wf_storyboards b
    where b.id = storyboard_id and (wf_is_parent(b.space_id) or b.owner_member_id = wf_my_member(b.space_id))
  ));
drop policy if exists wf_storyboard_scenes_edit on public.wf_storyboard_scenes;
create policy wf_storyboard_scenes_edit on public.wf_storyboard_scenes for update to authenticated
  using (exists (
    select 1 from public.wf_storyboards b
    where b.id = storyboard_id and (wf_is_parent(b.space_id) or b.owner_member_id = wf_my_member(b.space_id))
  ));
drop policy if exists wf_storyboard_scenes_del on public.wf_storyboard_scenes;
create policy wf_storyboard_scenes_del on public.wf_storyboard_scenes for delete to authenticated
  using (exists (
    select 1 from public.wf_storyboards b
    where b.id = storyboard_id and (wf_is_parent(b.space_id) or b.owner_member_id = wf_my_member(b.space_id))
  ));

-- Creative projects: the family's, and a child never sees one marked adult.
drop policy if exists wf_creative_projects_read on public.wf_creative_projects;
create policy wf_creative_projects_read on public.wf_creative_projects for select to authenticated
  using (wf_is_member(space_id) and (child_safe or not wf_is_child(space_id) or owner_member_id = wf_my_member(space_id)));
drop policy if exists wf_creative_projects_write on public.wf_creative_projects;
create policy wf_creative_projects_write on public.wf_creative_projects for insert to authenticated
  with check (wf_is_member(space_id) and wf_my_role(space_id) <> 'guest');
drop policy if exists wf_creative_projects_edit on public.wf_creative_projects;
create policy wf_creative_projects_edit on public.wf_creative_projects for update to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));
drop policy if exists wf_creative_projects_del on public.wf_creative_projects;
create policy wf_creative_projects_del on public.wf_creative_projects for delete to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));

-- The starter catalogue is not private to anyone.
drop policy if exists wf_catalog_studio_prompts_read on public.wf_catalog_studio_prompts;
create policy wf_catalog_studio_prompts_read on public.wf_catalog_studio_prompts for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 3. Pre-loaded content for a new business
-- ---------------------------------------------------------------------------

create or replace function public.wf_seed_studio(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into wf_catalog_studio_prompts (organization_id, slug, kind, title, prompt, audience, child_safe, sort_order)
  values
    (p_org, 'family-anthem',  'song',  'Our family anthem',        'A song about who we are and what we keep doing — our names, our table, the thing we always say.', 'family', true, 1),
    (p_org, 'evening-blessing','song', 'An evening blessing',      'Something quiet to sing at the end of the day, simple enough for one guitar.', 'family', true, 2),
    (p_org, 'lullaby',        'song',  'A lullaby by name',        'A lullaby for the youngest in the house, with their name in it.', 'little', true, 3),
    (p_org, 'birthday',       'song',  'A birthday song',          'A birthday song for someone in the family, loud and daft, with a candle in it.', 'family', true, 4),
    (p_org, 'brave-small',    'story', 'Someone small and brave',  'A small person who finds something even smaller that needs help, and helps it.', 'little', true, 5),
    (p_org, 'the-journey',    'story', 'The journey to Grandma''s','The story of getting there — the bags, the waiting, the door opening.', 'family', true, 6),
    (p_org, 'the-experiment', 'story', 'The experiment that worked','A child who tries something four times and gets it right on the fifth.', 'junior', true, 7),
    (p_org, 'family-crest',   'image', 'Our family crest',         'A simple crest for our family: our values as symbols, in two colours, like a woodcut.', 'family', true, 8),
    (p_org, 'story-cover',    'image', 'A cover for a story',      'A warm storybook cover in soft watercolour, for a story we wrote at home.', 'little', true, 9)
  on conflict (organization_id, slug) do update
    set kind = excluded.kind,
        title = excluded.title,
        prompt = excluded.prompt,
        audience = excluded.audience,
        child_safe = excluded.child_safe,
        sort_order = excluded.sort_order;
end $$;

grant execute on function public.wf_seed_studio(uuid) to authenticated;


-- ===========================================================================
-- MODULE 18/19 — moodboards (businesses/wafe/sql/moodboards.sql)
-- ===========================================================================
-- Wàfè — moodboards: boards, collaborators, sections, pins, comments and the
-- party checklist a board can turn into Tasks.
--
-- Idempotent. Depends only on 00-foundation (wf_spaces, wf_members and the
-- helpers wf_is_member / wf_is_parent / wf_my_member / wf_my_role); it never
-- references another module's tables. A board that belongs to a project or a
-- trip carries that module's id in `project_id` / `trip_id` and is joined in
-- the app — there is no foreign key across the seam.
--
-- THE PRIVACY MODEL, in one paragraph. A board is reachable by a parent
-- always (that is what makes a child's board reviewable), by its owner always,
-- by a child when it is child_safe and not private, and by a GUEST only when
-- the board is 'shared' AND that guest has a collaborator row — "granted named
-- objects, never modules". Everything hanging off a board inherits that
-- reachability. WRITING is narrower still: a parent, the owner, or a named
-- collaborator, and nothing at all on an archived board. Whether a collaborator
-- who is a child or a guest may write also depends on the `moodboards.manage`
-- grant on their member row, which the app enforces and a parent controls; the
-- database keeps the harder, structural half of that rule (you must be named).

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_moodboards (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  title            text not null,
  description      text not null default '',
  kind             text not null default 'ideas' check (kind in ('interior','party','holiday','style','garden','ideas','school-project')),
  -- The template it was started from ('party', 'interior', 'wardrobe', …).
  template         text,
  owner_member_id  uuid references public.wf_members(id) on delete set null,
  visibility       text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with      uuid[] not null default '{}',
  child_safe       boolean not null default true,
  tags             text[] not null default '{}',
  cover_pin_id     uuid,
  -- Ids into other modules; joined in the app, never by a foreign key.
  project_id       uuid,
  project_label    text not null default '',
  trip_id          uuid,
  trip_label       text not null default '',
  -- A parent has looked at this (child-owned boards are reviewable by design).
  reviewed_at      timestamptz,
  reviewed_by      uuid references public.wf_members(id) on delete set null,
  archived         boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_wf_moodboards_space on public.wf_moodboards(space_id, archived);

-- Who may pin and comment here. Being named is necessary; for a child or a
-- guest the app also requires the `moodboards.manage` grant.
create table if not exists public.wf_moodboard_collaborators (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  board_id         uuid not null references public.wf_moodboards(id) on delete cascade,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  created_at       timestamptz not null default now(),
  unique (board_id, member_id)
);
create index if not exists idx_wf_moodboard_collab_board on public.wf_moodboard_collaborators(board_id);
create index if not exists idx_wf_moodboard_collab_member on public.wf_moodboard_collaborators(member_id);

create table if not exists public.wf_moodboard_sections (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  board_id         uuid not null references public.wf_moodboards(id) on delete cascade,
  title            text not null,
  section_order    integer not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_moodboard_sections_board on public.wf_moodboard_sections(board_id, section_order);

-- A pin. `image_url` is ALWAYS a copy we serve (the public `catalog` bucket, or
-- a data URL for a typographic card); `source_url` is only for credit and for
-- "open the original". `cached_from` says how the copy was made and the screen
-- shows it — a snapshot presented without saying how it was captured is a
-- small lie.
create table if not exists public.wf_moodboard_pins (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  space_id            uuid not null references public.wf_spaces(id) on delete cascade,
  board_id            uuid not null references public.wf_moodboards(id) on delete cascade,
  section_id          uuid references public.wf_moodboard_sections(id) on delete set null,
  title               text not null default '',
  note                text not null default '',
  source              text not null default 'library' check (source in ('url','upload','library')),
  source_url          text,
  image_url           text not null,
  cached_from         text not null default 'library' check (cached_from in ('fetched','placeholder','upload','library')),
  cached_at           timestamptz not null default now(),
  tags                text[] not null default '{}',
  price_cents         integer check (price_cents is null or price_cents >= 0),
  colour              text,
  pin_order           integer not null default 0,
  added_by            uuid references public.wf_members(id) on delete set null,
  copied_from_pin_id  uuid,
  created_at          timestamptz not null default now()
);
create index if not exists idx_wf_moodboard_pins_board on public.wf_moodboard_pins(board_id, pin_order);
create index if not exists idx_wf_moodboard_pins_tags on public.wf_moodboard_pins using gin (tags);

create table if not exists public.wf_moodboard_comments (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  pin_id           uuid not null references public.wf_moodboard_pins(id) on delete cascade,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  text             text not null default '',
  reaction         text check (reaction is null or reaction in ('love','yes','maybe','no')),
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_moodboard_comments_pin on public.wf_moodboard_comments(pin_id, created_at);

-- The party checklist. It lives with the board because that is where it is
-- decided; `task_id` remembers the Task a line became, so the board can say
-- "already sent" instead of sending twice. The Tasks module owns the task.
create table if not exists public.wf_moodboard_checklist (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  space_id            uuid not null references public.wf_spaces(id) on delete cascade,
  board_id            uuid not null references public.wf_moodboards(id) on delete cascade,
  text                text not null,
  note                text not null default '',
  due_in_days         integer not null default 0 check (due_in_days >= 0),
  assignee_member_id  uuid references public.wf_members(id) on delete set null,
  task_id             uuid,
  sent_at             timestamptz,
  origin              text not null default 'companion' check (origin in ('template','companion')),
  line_order          integer not null default 0,
  created_at          timestamptz not null default now()
);
create index if not exists idx_wf_moodboard_checklist_board on public.wf_moodboard_checklist(board_id, line_order);

-- Pre-loaded board templates, public-read per tenant (see wf_seed_moodboards).
create table if not exists public.wf_catalog_moodboard_templates (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  slug             text not null,
  label            text not null,
  kind             text not null default 'ideas',
  blurb            text not null default '',
  sections         text[] not null default '{}',
  tags             text[] not null default '{}',
  created_at       timestamptz not null default now(),
  unique (organization_id, slug)
);

-- ---------------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------------

-- May the session open this board? Parent → yes. Owner → yes. Guest → only a
-- 'shared' board they are named on. Child → child_safe, not private, and either
-- family/child visibility or named on it.
create or replace function public.wf_moodboard_can_see(p_board uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  b        record;
  v_me     uuid;
  v_role   text;
  v_named  boolean;
begin
  select * into b from wf_moodboards where id = p_board;
  if not found then return false; end if;
  select m.id, m.role into v_me, v_role from wf_members m
  where m.space_id = b.space_id and m.user_id = auth.uid() limit 1;
  if v_me is null then return false; end if;
  if v_role = 'parent' then return true; end if;
  if b.owner_member_id = v_me then return true; end if;
  select exists (select 1 from wf_moodboard_collaborators c where c.board_id = b.id and c.member_id = v_me) into v_named;
  if v_role = 'guest' then
    return b.visibility = 'shared' and v_named;
  end if;
  -- child
  if not b.child_safe or b.visibility = 'private' then return false; end if;
  if b.visibility = 'shared' then return v_named or v_me = any (coalesce(b.shared_with, '{}'::uuid[])); end if;
  return true;
end $$;

-- May the session add to this board? Named, or a parent, or the owner — and
-- never on an archived board.
create or replace function public.wf_moodboard_can_pin(p_board uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  b      record;
  v_me   uuid;
  v_role text;
begin
  select * into b from wf_moodboards where id = p_board;
  if not found or b.archived then return false; end if;
  select m.id, m.role into v_me, v_role from wf_members m
  where m.space_id = b.space_id and m.user_id = auth.uid() limit 1;
  if v_me is null then return false; end if;
  if v_role = 'parent' or b.owner_member_id = v_me then return true; end if;
  return exists (select 1 from wf_moodboard_collaborators c where c.board_id = b.id and c.member_id = v_me);
end $$;

-- Renaming, sections, deleting: a parent or the owner.
create or replace function public.wf_moodboard_can_edit(p_board uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  b    record;
  v_me uuid;
begin
  select * into b from wf_moodboards where id = p_board;
  if not found or b.archived then return false; end if;
  if wf_is_parent(b.space_id) then return true; end if;
  select m.id into v_me from wf_members m where m.space_id = b.space_id and m.user_id = auth.uid() limit 1;
  return v_me is not null and b.owner_member_id = v_me;
end $$;

grant execute on function public.wf_moodboard_can_see(uuid) to authenticated;
grant execute on function public.wf_moodboard_can_pin(uuid) to authenticated;
grant execute on function public.wf_moodboard_can_edit(uuid) to authenticated;

-- A child's board is child-safe and never private, whatever was sent.
create or replace function public.wf_moodboards_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner_role text;
begin
  select m.role into v_owner_role from wf_members m where m.id = new.owner_member_id;
  if v_owner_role = 'child' then
    new.child_safe := true;
    if new.visibility = 'private' then new.visibility := 'family'; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists wf_moodboards_guard on public.wf_moodboards;
create trigger wf_moodboards_guard before insert or update on public.wf_moodboards
  for each row execute function public.wf_moodboards_guard();

-- ---------------------------------------------------------------------------
-- 3. Row-level security
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'wf_moodboards','wf_moodboard_collaborators','wf_moodboard_sections',
    'wf_moodboard_pins','wf_moodboard_comments','wf_moodboard_checklist',
    'wf_catalog_moodboard_templates'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Boards
drop policy if exists wf_moodboards_read on public.wf_moodboards;
create policy wf_moodboards_read on public.wf_moodboards for select to authenticated
  using (wf_moodboard_can_see(id));
drop policy if exists wf_moodboards_write on public.wf_moodboards;
create policy wf_moodboards_write on public.wf_moodboards for insert to authenticated
  with check (
    wf_is_parent(space_id)
    or (wf_is_member(space_id) and wf_my_role(space_id) <> 'guest' and owner_member_id = wf_my_member(space_id))
  );
drop policy if exists wf_moodboards_edit on public.wf_moodboards;
create policy wf_moodboards_edit on public.wf_moodboards for update to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));
drop policy if exists wf_moodboards_del on public.wf_moodboards;
create policy wf_moodboards_del on public.wf_moodboards for delete to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));

-- Collaborators: readable with the board, written by a parent or the owner.
drop policy if exists wf_moodboard_collab_read on public.wf_moodboard_collaborators;
create policy wf_moodboard_collab_read on public.wf_moodboard_collaborators for select to authenticated
  using (wf_moodboard_can_see(board_id));
drop policy if exists wf_moodboard_collab_all on public.wf_moodboard_collaborators;
create policy wf_moodboard_collab_all on public.wf_moodboard_collaborators for all to authenticated
  using (wf_moodboard_can_edit(board_id)) with check (wf_moodboard_can_edit(board_id));

-- Sections: read with the board, edited by a parent or the owner.
drop policy if exists wf_moodboard_sections_read on public.wf_moodboard_sections;
create policy wf_moodboard_sections_read on public.wf_moodboard_sections for select to authenticated
  using (wf_moodboard_can_see(board_id));
drop policy if exists wf_moodboard_sections_all on public.wf_moodboard_sections;
create policy wf_moodboard_sections_all on public.wf_moodboard_sections for all to authenticated
  using (wf_moodboard_can_edit(board_id)) with check (wf_moodboard_can_edit(board_id));

-- Pins: read with the board; added by anyone named on it (AC 2); changed by a
-- parent, the person who pinned it, or the board's owner.
drop policy if exists wf_moodboard_pins_read on public.wf_moodboard_pins;
create policy wf_moodboard_pins_read on public.wf_moodboard_pins for select to authenticated
  using (wf_moodboard_can_see(board_id));
drop policy if exists wf_moodboard_pins_write on public.wf_moodboard_pins;
create policy wf_moodboard_pins_write on public.wf_moodboard_pins for insert to authenticated
  with check (wf_moodboard_can_pin(board_id) and added_by = wf_my_member(space_id));
drop policy if exists wf_moodboard_pins_edit on public.wf_moodboard_pins;
create policy wf_moodboard_pins_edit on public.wf_moodboard_pins for update to authenticated
  using (wf_moodboard_can_pin(board_id) and (wf_is_parent(space_id) or added_by = wf_my_member(space_id) or wf_moodboard_can_edit(board_id)))
  with check (wf_moodboard_can_pin(board_id));
drop policy if exists wf_moodboard_pins_del on public.wf_moodboard_pins;
create policy wf_moodboard_pins_del on public.wf_moodboard_pins for delete to authenticated
  using (wf_moodboard_can_pin(board_id) and (wf_is_parent(space_id) or added_by = wf_my_member(space_id) or wf_moodboard_can_edit(board_id)));

-- Comments: read with the pin's board; written by anyone who may pin there;
-- removed by their author or a parent.
drop policy if exists wf_moodboard_comments_read on public.wf_moodboard_comments;
create policy wf_moodboard_comments_read on public.wf_moodboard_comments for select to authenticated
  using (exists (select 1 from wf_moodboard_pins p where p.id = pin_id and wf_moodboard_can_see(p.board_id)));
drop policy if exists wf_moodboard_comments_write on public.wf_moodboard_comments;
create policy wf_moodboard_comments_write on public.wf_moodboard_comments for insert to authenticated
  with check (member_id = wf_my_member(space_id) and exists (select 1 from wf_moodboard_pins p where p.id = pin_id and wf_moodboard_can_pin(p.board_id)));
drop policy if exists wf_moodboard_comments_del on public.wf_moodboard_comments;
create policy wf_moodboard_comments_del on public.wf_moodboard_comments for delete to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));

-- The checklist is planning: a parent or the board's owner.
drop policy if exists wf_moodboard_checklist_read on public.wf_moodboard_checklist;
create policy wf_moodboard_checklist_read on public.wf_moodboard_checklist for select to authenticated
  using (wf_is_parent(space_id) or exists (select 1 from wf_moodboards b where b.id = board_id and b.owner_member_id = wf_my_member(space_id)));
drop policy if exists wf_moodboard_checklist_all on public.wf_moodboard_checklist;
create policy wf_moodboard_checklist_all on public.wf_moodboard_checklist for all to authenticated
  using (wf_moodboard_can_edit(board_id)) with check (wf_moodboard_can_edit(board_id));

-- Templates: public-read inside the tenant, written by the platform only.
drop policy if exists wf_catalog_moodboard_templates_read on public.wf_catalog_moodboard_templates;
create policy wf_catalog_moodboard_templates_read on public.wf_catalog_moodboard_templates for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 4. Pre-loaded content
-- ---------------------------------------------------------------------------

create or replace function public.wf_seed_moodboards(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.wf_catalog_moodboard_templates (organization_id, slug, label, kind, blurb, sections, tags) values
    (p_org, 'party',    'Party',    'party',    'Cake, table, games, favours — and a checklist you can turn into tasks.', array['The look','Food & cake','Games','Favours'], array['party']),
    (p_org, 'interior', 'Interior', 'interior', 'A room, broken into the decisions you actually have to make.',           array['Layout','Colour & finish','Lighting','Storage'], array['home']),
    (p_org, 'wardrobe', 'Wardrobe', 'style',    'Outfits, fabric, shoes and the shapes that suit you.',                   array['Outfits','Fabric','Shoes & jewellery'], array['style']),
    (p_org, 'wedding',  'Wedding',  'party',    'The day, in the order you''ll book it.',                                 array['Venue','Dress & attire','Flowers','Table','Music'], array['wedding']),
    (p_org, 'garden',   'Garden',   'garden',   'Beds, paths, pots and what to plant when.',                              array['Beds & borders','Paths & seating','Pots','Lighting'], array['garden'])
  on conflict (organization_id, slug) do update
    set label = excluded.label, kind = excluded.kind, blurb = excluded.blurb, sections = excluded.sections, tags = excluded.tags;
end $$;

grant execute on function public.wf_seed_moodboards(uuid) to authenticated;


-- ===========================================================================
-- MODULE 19/19 — memories (businesses/wafe/sql/memories.sql)
-- ===========================================================================
-- Wàfè — memories: the family's pictures, the albums they are gathered into,
-- one timeline that merges every celebration, and the reels the app plays.
--
-- Idempotent. Depends only on 00-foundation (wf_spaces, wf_members and the
-- helpers wf_is_member / wf_is_parent / wf_my_member / wf_can_see). It never
-- references another module's tables: an album that belongs to a trip keeps
-- the trip's id, a reel made from a Studio storyboard keeps the storyboard's
-- id, and both are joined in the app.
--
-- THE PRIVACY MODEL, in one paragraph. Pictures, albums and reels follow the
-- ordinary visibility rules through wf_can_see, so a private album is the
-- owner's and a "family" album reaches a child only when it is child-safe.
-- On top of that sit two named doors, and they are the whole of the guest
-- story: wf_object_shares grants ONE object to ONE member — which is why a
-- grandmother can be given the Lagos album and the prayer wall and still not
-- be able to select a single other row — and wf_share_links is a token anyone
-- may hold, with an expiry and a revoked_at, read only through the
-- security-definer function at the bottom of this file. A guest's select on
-- wf_albums returns exactly the granted rows; there is no policy anywhere
-- that would return a title, a count or a thumbnail of anything else.
--
-- A reel is a PLAYLIST. There is no video column, no encode job and no export:
-- wf_reels is a row and wf_reel_frames are its ordered pictures, which is why
-- sharing one is a link and never a file.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

-- Every picture and video the family keeps. `bytes` is what the quota counts;
-- `needs_conversion` is the honest flag for a HEIC the browser could not
-- decode on the way in — the file is kept exactly as it arrived.
create table if not exists public.wf_media (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  owner_member_id  uuid references public.wf_members(id) on delete set null,
  url              text not null,
  poster_url       text,
  kind             text not null default 'photo' check (kind in ('photo','video')),
  format           text not null default 'jpeg' check (format in ('jpeg','png','heic','mp4')),
  caption          text not null default '',
  -- The day it was taken, not the day it was uploaded: the timeline's spine.
  taken_at         date not null default current_date,
  place            text not null default '',
  people_ids       uuid[] not null default '{}',
  tags             text[] not null default '{}',
  favourite        boolean not null default false,
  visibility       text not null default 'child' check (visibility in ('private','shared','family','child')),
  shared_with      uuid[] not null default '{}',
  child_safe       boolean not null default true,
  width            integer not null default 1600,
  height           integer not null default 1067,
  bytes            bigint not null default 0 check (bytes >= 0),
  needs_conversion boolean not null default false,
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_media_space on public.wf_media(space_id, taken_at desc);
create index if not exists idx_wf_media_people on public.wf_media using gin(people_ids);

create table if not exists public.wf_albums (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete cascade,
  space_id               uuid not null references public.wf_spaces(id) on delete cascade,
  owner_member_id        uuid references public.wf_members(id) on delete set null,
  title                  text not null,
  description            text not null default '',
  cover_media_id         uuid references public.wf_media(id) on delete set null,
  date_from              date not null default current_date,
  date_to                date not null default current_date,
  visibility             text not null default 'child' check (visibility in ('private','shared','family','child')),
  shared_with            uuid[] not null default '{}',
  child_safe             boolean not null default true,
  -- Members who may add to this album without holding memories.manage.
  contributor_member_ids uuid[] not null default '{}',
  -- Travel's trip id. Unique per space, which is what makes "make the album
  -- when the trip ends" idempotent rather than a source of duplicates.
  trip_id                text,
  auto                   boolean not null default false,
  created_at             timestamptz not null default now()
);
create unique index if not exists idx_wf_albums_trip on public.wf_albums(space_id, trip_id) where trip_id is not null;
create index if not exists idx_wf_albums_space on public.wf_albums(space_id, date_to desc);

-- album_media: the ordered membership, so one picture may live in two albums
-- and carry a different caption in each.
create table if not exists public.wf_album_media (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  album_id        uuid not null references public.wf_albums(id) on delete cascade,
  media_id        uuid not null references public.wf_media(id) on delete cascade,
  caption         text not null default '',
  position        integer not null default 0,
  created_at      timestamptz not null default now(),
  unique (album_id, media_id)
);
create index if not exists idx_wf_album_media_album on public.wf_album_media(album_id, position);

-- The timeline. `source_id` is the record in ITS OWN module and `href` is
-- where the entry takes you — a timeline that cannot reach the record it
-- describes is a decoration, so href is not null.
create table if not exists public.wf_timeline_events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  owner_member_id uuid references public.wf_members(id) on delete set null,
  date            date not null,
  type            text not null check (type in ('album','celebration','answered_prayer','badge','milestone','trip','first')),
  source_id       text,
  title           text not null,
  body            text not null default '',
  media_id        uuid references public.wf_media(id) on delete set null,
  member_ids      uuid[] not null default '{}',
  href            text not null default '/create/memories/timeline',
  visibility      text not null default 'child' check (visibility in ('private','shared','family','child')),
  shared_with     uuid[] not null default '{}',
  child_safe      boolean not null default true,
  -- Merged in from another module rather than written here.
  imported        boolean not null default false,
  created_at      timestamptz not null default now()
);
-- One row per source record, which is what makes importing idempotent.
create unique index if not exists idx_wf_timeline_source on public.wf_timeline_events(space_id, type, source_id) where source_id is not null;
create index if not exists idx_wf_timeline_space on public.wf_timeline_events(space_id, date desc);

-- A reel: a playlist, never a file. `auto_kind` says who asked for it —
-- 'our_year' is the one the product drafts itself every December.
create table if not exists public.wf_reels (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  owner_member_id uuid references public.wf_members(id) on delete set null,
  title           text not null,
  subtitle        text not null default '',
  mood            text not null default 'warm' check (mood in ('warm','joy','calm')),
  transition      text not null default 'crossfade' check (transition in ('crossfade','dip','cut')),
  slide_ms        integer not null default 4000 check (slide_ms between 800 and 20000),
  status          text not null default 'draft' check (status in ('draft','ready')),
  auto_kind       text not null default 'custom' check (auto_kind in ('our_year','trip','storyboard','custom')),
  track_title     text not null default '',
  track_note      text not null default '',
  -- A Studio recording of the family singing it, by item id (joined in the app).
  track_item_id   text,
  cover_media_id  uuid references public.wf_media(id) on delete set null,
  visibility      text not null default 'child' check (visibility in ('private','shared','family','child')),
  shared_with     uuid[] not null default '{}',
  child_safe      boolean not null default true,
  scheduled_for   date,
  storyboard_id   text,
  created_at      timestamptz not null default now()
);
create unique index if not exists idx_wf_reels_storyboard on public.wf_reels(space_id, storyboard_id) where storyboard_id is not null;
create index if not exists idx_wf_reels_space on public.wf_reels(space_id, created_at desc);

create table if not exists public.wf_reel_frames (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  reel_id         uuid not null references public.wf_reels(id) on delete cascade,
  media_id        uuid not null references public.wf_media(id) on delete cascade,
  caption         text not null default '',
  -- Null means "use the reel's slide_ms".
  duration_ms     integer check (duration_ms is null or duration_ms between 800 and 20000),
  position        integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_reel_frames_reel on public.wf_reel_frames(reel_id, position);

-- A named grant: ONE object to ONE member. The guest dashboard is this list.
create table if not exists public.wf_object_shares (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  object_type     text not null check (object_type in ('album','reel')),
  object_id       uuid not null,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  granted_by      uuid references public.wf_members(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (space_id, object_type, object_id, member_id)
);
create index if not exists idx_wf_object_shares_member on public.wf_object_shares(member_id);

-- A link anyone may hold. It expires, it can be revoked, and every open is
-- counted — the three things that make "shared by link" safe to offer.
create table if not exists public.wf_share_links (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  object_type     text not null check (object_type in ('album','reel')),
  object_id       uuid not null,
  token           text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_by      uuid references public.wf_members(id) on delete set null,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '30 days'),
  revoked_at      timestamptz,
  views           integer not null default 0,
  last_viewed_at  timestamptz
);
create index if not exists idx_wf_share_links_object on public.wf_share_links(space_id, object_type, object_id);

-- The space's tier. One row per space; the media half of the plan table lives
-- in the app (MEDIA_PLANS), the AI half with the companion, and both read this.
create table if not exists public.wf_space_plans (
  space_id        uuid primary key references public.wf_spaces(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tier            text not null default 'household' check (tier in ('seed','household','legacy')),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. Helpers — the two named doors, as functions the policies can use
-- ---------------------------------------------------------------------------

-- True when this member was granted the object by name.
create or replace function public.wf_mem_granted(p_space uuid, p_type text, p_object uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wf_object_shares s
    where s.space_id = p_space and s.object_type = p_type and s.object_id = p_object
      and s.member_id = public.wf_my_member(p_space)
  );
$$;

-- True when a live (unrevoked, unexpired) link exists for the object. This is
-- what lets a member who was sent a link open it without a grant; the link
-- itself is read by the security-definer function below.
create or replace function public.wf_mem_linked(p_space uuid, p_type text, p_object uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wf_share_links l
    where l.space_id = p_space and l.object_type = p_type and l.object_id = p_object
      and l.revoked_at is null and l.expires_at > now()
  );
$$;

-- The module's whole access rule for an album or a reel, in one place:
-- the ordinary visibility rules, OR a named grant, OR a live link. A GUEST
-- gets only the last two — which is acceptance criterion 5, as a policy.
create or replace function public.wf_mem_can_open(p_space uuid, p_owner uuid, p_vis text, p_shared uuid[], p_child_safe boolean, p_type text, p_object uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when not public.wf_is_member(p_space) then false
    when public.wf_mem_granted(p_space, p_type, p_object) then true
    when public.wf_mem_linked(p_space, p_type, p_object) then true
    when exists (select 1 from public.wf_members m where m.space_id = p_space and m.id = public.wf_my_member(p_space) and m.role = 'guest') then false
    when exists (select 1 from public.wf_members m where m.space_id = p_space and m.id = public.wf_my_member(p_space) and m.role = 'child')
      then public.wf_can_see(p_space, p_owner, p_vis, p_shared) and (p_vis = 'child' or p_child_safe or p_owner = public.wf_my_member(p_space))
    else public.wf_can_see(p_space, p_owner, p_vis, p_shared)
  end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Row-level security
-- ---------------------------------------------------------------------------

alter table public.wf_media           enable row level security;
alter table public.wf_albums          enable row level security;
alter table public.wf_album_media     enable row level security;
alter table public.wf_timeline_events enable row level security;
alter table public.wf_reels           enable row level security;
alter table public.wf_reel_frames     enable row level security;
alter table public.wf_object_shares   enable row level security;
alter table public.wf_share_links     enable row level security;
alter table public.wf_space_plans     enable row level security;

-- A picture reaches you when its own visibility reaches you, OR when it is in
-- an album / a reel that was opened for you. That second half is what makes a
-- grant of ONE album hand over exactly that album's pictures and no others.
drop policy if exists wf_media_read on public.wf_media;
create policy wf_media_read on public.wf_media for select to authenticated using (
  public.wf_can_see(space_id, owner_member_id, visibility, shared_with)
  or exists (
    select 1 from public.wf_album_media am join public.wf_albums a on a.id = am.album_id
    where am.media_id = wf_media.id
      and public.wf_mem_can_open(a.space_id, a.owner_member_id, a.visibility, a.shared_with, a.child_safe, 'album', a.id)
  )
  or exists (
    select 1 from public.wf_reel_frames rf join public.wf_reels r on r.id = rf.reel_id
    where rf.media_id = wf_media.id
      and public.wf_mem_can_open(r.space_id, r.owner_member_id, r.visibility, r.shared_with, r.child_safe, 'reel', r.id)
  )
);
drop policy if exists wf_media_write on public.wf_media;
create policy wf_media_write on public.wf_media for insert to authenticated with check (public.wf_is_member(space_id));
drop policy if exists wf_media_edit on public.wf_media;
create policy wf_media_edit on public.wf_media for update to authenticated using (public.wf_is_parent(space_id) or owner_member_id = public.wf_my_member(space_id));
drop policy if exists wf_media_del on public.wf_media;
create policy wf_media_del on public.wf_media for delete to authenticated using (public.wf_is_parent(space_id) or owner_member_id = public.wf_my_member(space_id));

drop policy if exists wf_albums_read on public.wf_albums;
create policy wf_albums_read on public.wf_albums for select to authenticated using (
  public.wf_mem_can_open(space_id, owner_member_id, visibility, shared_with, child_safe, 'album', id)
  or public.wf_my_member(space_id) = any (contributor_member_ids)
);
drop policy if exists wf_albums_write on public.wf_albums;
create policy wf_albums_write on public.wf_albums for insert to authenticated with check (public.wf_is_member(space_id));
drop policy if exists wf_albums_edit on public.wf_albums;
create policy wf_albums_edit on public.wf_albums for update to authenticated using (public.wf_is_parent(space_id) or owner_member_id = public.wf_my_member(space_id));
drop policy if exists wf_albums_del on public.wf_albums;
create policy wf_albums_del on public.wf_albums for delete to authenticated using (public.wf_is_parent(space_id) or owner_member_id = public.wf_my_member(space_id));

drop policy if exists wf_album_media_read on public.wf_album_media;
create policy wf_album_media_read on public.wf_album_media for select to authenticated using (
  exists (select 1 from public.wf_albums a where a.id = album_id
          and public.wf_mem_can_open(a.space_id, a.owner_member_id, a.visibility, a.shared_with, a.child_safe, 'album', a.id))
);
-- Contributors may add to the albums they contribute to; that is the point of
-- the contributor list, and it is checked here rather than in the client.
drop policy if exists wf_album_media_write on public.wf_album_media;
create policy wf_album_media_write on public.wf_album_media for insert to authenticated with check (
  exists (select 1 from public.wf_albums a where a.id = album_id and a.space_id = wf_album_media.space_id
          and (public.wf_is_parent(a.space_id) or a.owner_member_id = public.wf_my_member(a.space_id) or public.wf_my_member(a.space_id) = any (a.contributor_member_ids)))
);
drop policy if exists wf_album_media_edit on public.wf_album_media;
create policy wf_album_media_edit on public.wf_album_media for update to authenticated using (
  exists (select 1 from public.wf_albums a where a.id = album_id
          and (public.wf_is_parent(a.space_id) or a.owner_member_id = public.wf_my_member(a.space_id) or public.wf_my_member(a.space_id) = any (a.contributor_member_ids)))
);
drop policy if exists wf_album_media_del on public.wf_album_media;
create policy wf_album_media_del on public.wf_album_media for delete to authenticated using (
  exists (select 1 from public.wf_albums a where a.id = album_id
          and (public.wf_is_parent(a.space_id) or a.owner_member_id = public.wf_my_member(a.space_id) or public.wf_my_member(a.space_id) = any (a.contributor_member_ids)))
);

-- The timeline is the family's story: guests are not in it. (What a guest is
-- shown of the past is the albums they were granted, and nothing more.)
drop policy if exists wf_timeline_read on public.wf_timeline_events;
create policy wf_timeline_read on public.wf_timeline_events for select to authenticated using (
  public.wf_can_see(space_id, owner_member_id, visibility, shared_with)
  and not exists (select 1 from public.wf_members m where m.space_id = wf_timeline_events.space_id and m.id = public.wf_my_member(wf_timeline_events.space_id) and m.role = 'guest')
);
drop policy if exists wf_timeline_write on public.wf_timeline_events;
create policy wf_timeline_write on public.wf_timeline_events for insert to authenticated with check (public.wf_is_parent(space_id));
drop policy if exists wf_timeline_edit on public.wf_timeline_events;
create policy wf_timeline_edit on public.wf_timeline_events for update to authenticated using (public.wf_is_parent(space_id));
drop policy if exists wf_timeline_del on public.wf_timeline_events;
create policy wf_timeline_del on public.wf_timeline_events for delete to authenticated using (public.wf_is_parent(space_id));

drop policy if exists wf_reels_read on public.wf_reels;
create policy wf_reels_read on public.wf_reels for select to authenticated using (
  public.wf_mem_can_open(space_id, owner_member_id, visibility, shared_with, child_safe, 'reel', id)
);
drop policy if exists wf_reels_write on public.wf_reels;
create policy wf_reels_write on public.wf_reels for insert to authenticated with check (public.wf_is_parent(space_id));
drop policy if exists wf_reels_edit on public.wf_reels;
create policy wf_reels_edit on public.wf_reels for update to authenticated using (public.wf_is_parent(space_id) or owner_member_id = public.wf_my_member(space_id));
drop policy if exists wf_reels_del on public.wf_reels;
create policy wf_reels_del on public.wf_reels for delete to authenticated using (public.wf_is_parent(space_id) or owner_member_id = public.wf_my_member(space_id));

drop policy if exists wf_reel_frames_read on public.wf_reel_frames;
create policy wf_reel_frames_read on public.wf_reel_frames for select to authenticated using (
  exists (select 1 from public.wf_reels r where r.id = reel_id
          and public.wf_mem_can_open(r.space_id, r.owner_member_id, r.visibility, r.shared_with, r.child_safe, 'reel', r.id))
);
drop policy if exists wf_reel_frames_write on public.wf_reel_frames;
create policy wf_reel_frames_write on public.wf_reel_frames for insert to authenticated with check (public.wf_is_parent(space_id));
drop policy if exists wf_reel_frames_edit on public.wf_reel_frames;
create policy wf_reel_frames_edit on public.wf_reel_frames for update to authenticated using (public.wf_is_parent(space_id));
drop policy if exists wf_reel_frames_del on public.wf_reel_frames;
create policy wf_reel_frames_del on public.wf_reel_frames for delete to authenticated using (public.wf_is_parent(space_id));

-- You may read the grants that are yours; a parent reads them all, because a
-- parent is the one who has to be able to answer "who can see this?".
drop policy if exists wf_object_shares_read on public.wf_object_shares;
create policy wf_object_shares_read on public.wf_object_shares for select to authenticated using (
  public.wf_is_parent(space_id) or member_id = public.wf_my_member(space_id)
);
drop policy if exists wf_object_shares_write on public.wf_object_shares;
create policy wf_object_shares_write on public.wf_object_shares for insert to authenticated with check (public.wf_is_parent(space_id));
drop policy if exists wf_object_shares_del on public.wf_object_shares;
create policy wf_object_shares_del on public.wf_object_shares for delete to authenticated using (public.wf_is_parent(space_id));

-- Links are a parent's desk. Nobody else may list them — a token is meant to
-- be held, not discovered.
drop policy if exists wf_share_links_read on public.wf_share_links;
create policy wf_share_links_read on public.wf_share_links for select to authenticated using (public.wf_is_parent(space_id));
drop policy if exists wf_share_links_write on public.wf_share_links;
create policy wf_share_links_write on public.wf_share_links for insert to authenticated with check (public.wf_is_parent(space_id));
drop policy if exists wf_share_links_edit on public.wf_share_links;
create policy wf_share_links_edit on public.wf_share_links for update to authenticated using (public.wf_is_parent(space_id));
drop policy if exists wf_share_links_del on public.wf_share_links;
create policy wf_share_links_del on public.wf_share_links for delete to authenticated using (public.wf_is_parent(space_id));

drop policy if exists wf_space_plans_read on public.wf_space_plans;
create policy wf_space_plans_read on public.wf_space_plans for select to authenticated using (public.wf_is_member(space_id));
drop policy if exists wf_space_plans_write on public.wf_space_plans;
create policy wf_space_plans_write on public.wf_space_plans for insert to authenticated with check (public.wf_is_parent(space_id));
drop policy if exists wf_space_plans_edit on public.wf_space_plans;
create policy wf_space_plans_edit on public.wf_space_plans for update to authenticated using (public.wf_is_parent(space_id));

-- ---------------------------------------------------------------------------
-- 4. The token path
-- ---------------------------------------------------------------------------

-- Opening a share link. Security definer, because the person holding the link
-- may not be in the space at all — and it returns exactly ONE object, its
-- frames and their pictures, or null. Expired and revoked both return null,
-- which is what makes "links expire and can be revoked" observable rather
-- than promised. Every successful open is counted.
create or replace function public.wf_open_shared_object(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_link   public.wf_share_links%rowtype;
  v_result jsonb;
begin
  select * into v_link from public.wf_share_links
   where token = p_token and revoked_at is null and expires_at > now();
  if not found then
    return null;
  end if;

  update public.wf_share_links
     set views = views + 1, last_viewed_at = now()
   where id = v_link.id;

  if v_link.object_type = 'reel' then
    select jsonb_build_object(
      'object_type', 'reel',
      'expires_at', v_link.expires_at,
      'shared_by', (select m.name from public.wf_members m where m.id = v_link.created_by),
      'reel', to_jsonb(r),
      'frames', coalesce((select jsonb_agg(to_jsonb(f) order by f.position) from public.wf_reel_frames f where f.reel_id = r.id), '[]'::jsonb),
      'media', coalesce((select jsonb_agg(to_jsonb(m)) from public.wf_media m
                          where m.id in (select f.media_id from public.wf_reel_frames f where f.reel_id = r.id)
                             or m.id = r.cover_media_id), '[]'::jsonb)
    ) into v_result
    from public.wf_reels r where r.id = v_link.object_id;
  else
    select jsonb_build_object(
      'object_type', 'album',
      'expires_at', v_link.expires_at,
      'shared_by', (select m.name from public.wf_members m where m.id = v_link.created_by),
      'album', to_jsonb(a),
      'frames', '[]'::jsonb,
      'media', coalesce((select jsonb_agg(to_jsonb(m) order by m.taken_at) from public.wf_media m
                          where m.id in (select am.media_id from public.wf_album_media am where am.album_id = a.id)
                             or m.id = a.cover_media_id), '[]'::jsonb)
    ) into v_result
    from public.wf_albums a where a.id = v_link.object_id;
  end if;

  return v_result;
end;
$$;

grant execute on function public.wf_open_shared_object(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Pre-loaded content: the reel presets a new family starts from
-- ---------------------------------------------------------------------------

-- Not photographs — a family's pictures are their own — but the shapes a reel
-- can take: how long a frame holds, which transition, what the mood does. A
-- new space picks one instead of facing an empty form.
create table if not exists public.wf_catalog_reel_presets (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug            text not null,
  name            text not null,
  blurb           text not null default '',
  mood            text not null default 'warm' check (mood in ('warm','joy','calm')),
  transition      text not null default 'crossfade' check (transition in ('crossfade','dip','cut')),
  slide_ms        integer not null default 4000,
  frame_target    integer not null default 40,
  created_at      timestamptz not null default now(),
  unique (organization_id, slug)
);
alter table public.wf_catalog_reel_presets enable row level security;
drop policy if exists wf_catalog_reel_presets_read on public.wf_catalog_reel_presets;
create policy wf_catalog_reel_presets_read on public.wf_catalog_reel_presets for select to authenticated using (true);

create or replace function public.wf_seed_memories(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.wf_catalog_reel_presets (organization_id, slug, name, blurb, mood, transition, slide_ms, frame_target)
  values
    (p_org, 'our-year',   'Our year',            'Twelve months in sixty frames — the one that writes itself every December.', 'warm', 'crossfade', 4000, 60),
    (p_org, 'the-trip',   'The trip',            'A holiday, in the order it happened, with the places named.',                'joy',  'crossfade', 3200, 40),
    (p_org, 'the-day',    'One day',             'A birthday or a wedding: quick cuts, lots of faces.',                        'joy',  'cut',       2600, 30),
    (p_org, 'the-child',  'A year of one child', 'One person, one year, in order — the growing-up reel.',                      'warm', 'crossfade', 3600, 36),
    (p_org, 'sunday',     'Sundays',             'Church, lunch, the long light. The slowest of them.',                        'calm', 'dip',       5200, 24),
    (p_org, 'storyboard', 'A storyboard',        'A story the studio drew, played frame by frame with its narration.',         'calm', 'dip',       5000, 12)
  on conflict (organization_id, slug) do update
    set name = excluded.name, blurb = excluded.blurb, mood = excluded.mood,
        transition = excluded.transition, slide_ms = excluded.slide_ms, frame_target = excluded.frame_target;
end;
$$;


-- ===========================================================================
-- BLUEPRINT — the row a buyer sees in the marketplace
-- ===========================================================================
-- Price is 0 and status is 'draft': the owner sets the price before it goes
-- live. Re-running never demotes a blueprint that is already live.
insert into blueprints (slug, name, tagline, description, vertical, tier, price_cents, currency,
                        cover_url, demo_url, verified, ai_included, status, app_path, subdomain_base, metrics, preset)
values (
  'wafe',
  'Wàfè',
  'The operating system for intentional family life — one place to grow, plan, live and create together.',
  'A private family operating system that connects a household''s values, vision and goals to what it actually does every day, through a morning briefing, an evening check-in and Sunday planning. Nineteen modules — learning, books, scripture and prayer, home-education curricula, tasks and chores, goals, projects, calendar, finances, travel, wardrobe, wellness, the creative studio, moodboards and memories — sit behind one shell with real age-band child mode and named-object guest access. An AI companion is grounded in the asking member''s own data under row-level security, proposes rather than acts, and always shows its sources. Ships with a lived-in demo family so the product works from the first minute.',
  'Family',
  'premium',
  0,
  'GBP',
  'https://images.pexels.com/photos/6393115/pexels-photo-6393115.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
  'https://demo.wafe.phoxta.com',
  true, true, 'draft',
  'businesses/wafe',
  'wafe.phoxta.com',
  '{"built": true, "app": "businesses/wafe"}'::jsonb,
  '{"currency": "GBP", "family_os": true}'::jsonb
)
on conflict (slug) do update set
  name           = excluded.name,
  tagline        = excluded.tagline,
  description    = excluded.description,
  vertical       = excluded.vertical,
  tier           = excluded.tier,
  price_cents    = excluded.price_cents,
  currency       = excluded.currency,
  cover_url      = excluded.cover_url,
  demo_url       = excluded.demo_url,
  verified       = excluded.verified,
  ai_included    = excluded.ai_included,
  app_path       = excluded.app_path,
  subdomain_base = excluded.subdomain_base,
  metrics        = excluded.metrics,
  preset         = excluded.preset,
  -- the owner prices it; never demote a blueprint that has already gone live
  status         = case when blueprints.status = 'live' then 'live' else 'draft' end;

-- ===========================================================================
-- DEMO TENANT — the showcase family, its hosts and its content
-- ===========================================================================
do $$
declare
  v_uid uuid;
  v_org uuid;
begin
  select id into v_uid from auth.users
    order by (email = 'femi@phoxta.com') desc, created_at asc limit 1;
  if v_uid is null then raise notice '[wafe seed] no auth user yet — skipping tenant'; return; end if;

  select id into v_org from organizations where slug = 'wafe-demo';
  if v_org is null then
    -- Branding carries the name and the line the shell shows under it: the
    -- demo has to look exactly like the app a buyer is being shown.
    insert into organizations (owner_user_id, name, slug, vertical, blueprint_id, stage, lifecycle_stage,
                               app_path, modules, branding, currency, provisioned_at)
    select v_uid, 'Wàfè', 'wafe-demo', coalesce(b.vertical, 'Family'), b.id, 'trial', 'operating',
           coalesce(b.app_path, 'businesses/wafe'), coalesce(b.preset, '{}'::jsonb),
           $b$ {"name":"Wàfè","tagline":"For today. For tomorrow. For generations."} $b$::jsonb,
           'GBP',
           now()
    from blueprints b where b.slug = 'wafe'
    returning id into v_org;
    raise notice '[wafe seed] org created %', v_org;
  end if;

  -- The showcase host and the buyer-style host, both live. The org-insert
  -- trigger may already have created the buyer-style one; on conflict we
  -- reassert it.
  insert into domains (organization_id, hostname, kind, is_primary, status, tls_status, verified_at)
  values (v_org, 'demo.wafe.phoxta.com',      'subdomain', false, 'live', 'issued', now()),
         (v_org, 'wafe-demo.wafe.phoxta.com', 'subdomain', true,  'live', 'issued', now())
  on conflict (hostname) do update
    set organization_id = excluded.organization_id,
        status          = 'live',
        tls_status      = 'issued',
        verified_at     = coalesce(domains.verified_at, now());

  -- The provision trigger seeds a NEW org; an org that already existed gets
  -- the same catalogue content here (idempotent either way).
  perform wf_seed_org(v_org);
  raise notice '[wafe seed] catalogue content in place for %', v_org;
end $$;
