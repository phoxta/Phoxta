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
  /* module seeds are appended by the assembler */
  null;
end $$;

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
