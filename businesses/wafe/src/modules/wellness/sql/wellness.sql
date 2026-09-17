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
