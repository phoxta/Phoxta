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
