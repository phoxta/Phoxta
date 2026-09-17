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
-- One briefing per member per day — generated once, then cached. The slot is
-- a fact ABOUT the row (which part of the day wrote it), never part of its
-- identity: keying on it would let one member collect three briefings, and
-- spend three of the family's AI calls, on a single date.
drop index if exists public.uq_wf_home_briefings;
create unique index if not exists uq_wf_home_briefings on public.wf_home_briefings(space_id, member_id, on_date);

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

-- The timeline carries visibility, so the standard helper decides — with one
-- narrowing. wf_can_see is generous to guests on purpose ('family' and
-- 'child' rows are readable by anyone in the space), which is right for
-- modules that only ever render a guest the objects they were granted. The
-- timeline is the exception: Home puts it on the guest dashboard, so a mentor
-- granted his sessions must not read the children's firsts through it. A
-- guest sees a milestone only when they were named on it.
drop policy if exists wf_home_milestones_read on public.wf_home_milestones;
create policy wf_home_milestones_read on public.wf_home_milestones for select to authenticated
  using (
    wf_can_see(space_id, owner_member_id, visibility, shared_with)
    and (
      wf_my_role(space_id) <> 'guest'
      or owner_member_id = wf_my_member(space_id)
      or wf_my_member(space_id) = any(shared_with)
    )
  );
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
