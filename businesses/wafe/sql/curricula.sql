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
