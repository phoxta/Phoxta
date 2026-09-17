-- Wàfè — goals: the vision blueprint, goals with milestones, the OKR roadmap,
-- the measured numbers, celebrations, reviews and the nightly connection metrics.
--
-- Nine tables, two views and five helper functions. The interesting rules are
-- enforced here rather than in the client:
--
--   THE CHILD RULE. wf_goal_row_visible() — not wf_can_see(), which says yes
--   to anything marked 'child' — decides what a child's session may select
--   from wf_goals: their own goals, and goals shared with them by name. Never
--   a FAMILY-scope goal, not even one a child is carrying, because the words
--   are the parents'. A child still has to be able to see that the family is
--   saving for a house, so there is exactly one door for that: the view
--   wf_goals_child_safe, which returns child_safe_summary and a computed
--   percentage and NOTHING ELSE. The blueprint has the same shape: the table
--   is a parent's (its year lines are written in money) and everybody else
--   reads wf_blueprint_child_safe — vision, mission, values. There is no
--   path by which a child's session reads `title`, `description`, `why` or an
--   amount on a goal that is not theirs. That is the RLS test in the spec.
--
--   THE PRIVATE-ME RULE. A 'me' goal with visibility 'private' is readable by
--   its owner alone — a parent has no override, because wf_can_see gives none.
--   Tunde's 100 km ride is genuinely invisible to Ìfẹ́.
--
--   PROGRESS IS COMPUTED. wf_goal_pct() measures the latest reading against
--   its target when the goal was set up to be measured, otherwise counts the
--   milestones, and only falls back to the stored progress_pct when there is
--   nothing to count and nothing to measure. The view and any report use it,
--   so the database agrees with the app.
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

-- Progress, computed. A goal set up to be MEASURED is measured, whatever else
-- has been hung off it: the milestones on the deposit goal are the steps that
-- move the pot, not a second scoreboard, so adding one must not replace
-- "54% of GBP 30,000" with "0 of 1 steps". Otherwise milestones are counted,
-- and only when there is nothing to count and nothing to measure does the
-- stored percentage (typed by hand, on the goal's own page) stand. The app's
-- derive.effectiveMode() ranks them in exactly this order.
create or replace function public.wf_goal_pct(p_goal uuid) returns integer
language plpgsql stable security definer set search_path = public as $$
declare
  v_total  integer;
  v_done   integer;
  v_ref    text;
  v_mode   text;
  v_pct    integer;
  v_cur    numeric;
  v_target numeric;
begin
  select metric_ref, progress_mode, progress_pct into v_ref, v_mode, v_pct
    from wf_goals where id = p_goal;

  if v_ref is not null then
    select m.current_value, m.target into v_cur, v_target
      from wf_goal_metrics m
      join wf_goals g on g.id = p_goal and g.space_id = m.space_id
     where m.metric_ref = v_ref
     order by m.read_at desc limit 1;
  end if;

  -- Measured, and set up that way: the reading is the answer.
  if v_mode = 'metric' and v_target is not null and v_target > 0 then
    return least(100, greatest(0, round(100.0 * v_cur / v_target)::integer));
  end if;

  select count(*), count(*) filter (where done_at is not null)
    into v_total, v_done
    from wf_goal_milestones where goal_id = p_goal;
  if v_total > 0 then
    return round(100.0 * v_done / v_total);
  end if;

  if v_target is not null and v_target > 0 then
    return least(100, greatest(0, round(100.0 * v_cur / v_target)::integer));
  end if;

  return coalesce(v_pct, 0);
end $$;

-- May the caller read this goal's own words?
--
-- THE CHILD RULE, in one function. wf_can_see() is the ordinary household
-- rule, and it says yes to anything marked 'child' -- which is right for a
-- calendar entry and wrong for a goal, because a goal's title and description
-- are the parents' sentences and carry the family's money in them. So a
-- child's session is routed through a narrower test: their own goal, or one
-- somebody shared with them by name, and never a FAMILY-scope goal -- not even
-- one a child is carrying (Dami and the birthday song). Everything else
-- reaches them through wf_goals_child_safe, as a summary and a percentage.
-- derive.visibleTo() applies the same rule in the app, so the demo and the
-- database cannot drift.
create or replace function public.wf_goal_row_visible(p_space uuid, p_scope text, p_owner uuid, p_visibility text, p_shared uuid[])
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_me   uuid;
  v_role text;
begin
  select m.id, m.role into v_me, v_role from wf_members m
  where m.space_id = p_space and m.user_id = auth.uid() limit 1;
  if v_me is null then return false; end if;

  if v_role = 'child' then
    if p_scope = 'family' then return false; end if;
    if p_owner is not null and p_owner = v_me then return true; end if;
    return p_visibility = 'shared' and v_me = any (coalesce(p_shared, '{}'::uuid[]));
  end if;

  return wf_can_see(p_space, p_owner, p_visibility, p_shared);
end $$;

create or replace function public.wf_goal_readable(p_goal uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wf_goals g
    where g.id = p_goal
      and wf_goal_row_visible(g.space_id, g.scope, g.owner_member_id, g.visibility, g.shared_with)
  );
$$;

-- A celebration says the goal's own words out loud ("Christmas in Lagos --
-- done"), so it travels no further than the goal does. The exception is a goal
-- written FOR children: those they may read and should.
create or replace function public.wf_goal_celebratable(p_goal uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wf_goals g
    where g.id = p_goal
      and (g.visibility = 'child'
           or wf_goal_row_visible(g.space_id, g.scope, g.owner_member_id, g.visibility, g.shared_with))
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
grant execute on function public.wf_goal_row_visible(uuid, text, uuid, text, uuid[]) to authenticated;
grant execute on function public.wf_goal_readable(uuid) to authenticated;
grant execute on function public.wf_goal_celebratable(uuid) to authenticated;
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

-- Blueprints: PARENTS read the table, and parents write versions.
--
-- The one- three- and five-year lines are where the plan is written in money
-- ("GBP 5,000 in an emergency fund and GBP 18,000 towards the deposit"), so
-- the table itself is a parent's. The rest of the household reads
-- wf_blueprint_child_safe further down: the vision, the mission and the
-- values, which is the part meant to be read out loud.
drop policy if exists wf_blueprints_read on public.wf_blueprints;
drop policy if exists wf_blueprints_write on public.wf_blueprints;
drop policy if exists wf_blueprints_del on public.wf_blueprints;
create policy wf_blueprints_read  on public.wf_blueprints for select to authenticated using (wf_is_parent(space_id));
create policy wf_blueprints_write on public.wf_blueprints for insert to authenticated with check (wf_is_parent(space_id));
create policy wf_blueprints_del   on public.wf_blueprints for delete to authenticated using (wf_is_parent(space_id));
-- No update policy on purpose: history is written, never rewritten.

-- Goals: the visibility rule above, so a parent gets everything but somebody
-- else's private goal, a child gets their own and the ones shared with them by
-- name (never a family goal's words -- that is what the view is for), and a
-- private 'me' goal is the owner's alone.
drop policy if exists wf_goals_read  on public.wf_goals;
drop policy if exists wf_goals_write on public.wf_goals;
drop policy if exists wf_goals_edit  on public.wf_goals;
drop policy if exists wf_goals_del   on public.wf_goals;
create policy wf_goals_read  on public.wf_goals for select to authenticated
  using (wf_goal_row_visible(space_id, scope, owner_member_id, visibility, shared_with));
create policy wf_goals_write on public.wf_goals for insert to authenticated
  with check (
    wf_is_member(space_id)
    and (wf_is_parent(space_id) or (scope = 'me' and owner_member_id = wf_my_member(space_id)))
  );
-- Writing follows canEditGoal(): a parent, or the owner of a goal of their own.
-- Carrying a FAMILY goal is not owning it -- the words are the family's.
create policy wf_goals_edit  on public.wf_goals for update to authenticated
  using (wf_is_parent(space_id) or (scope = 'me' and owner_member_id = wf_my_member(space_id)))
  with check (wf_is_parent(space_id) or (scope = 'me' and owner_member_id = wf_my_member(space_id)));
create policy wf_goals_del   on public.wf_goals for delete to authenticated
  using (wf_is_parent(space_id) or (scope = 'me' and owner_member_id = wf_my_member(space_id)));

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

-- Celebrations are the family timeline: everyone in the house reads the ones
-- for a goal they can see, plus every goal written for children.
drop policy if exists wf_celebrations_read  on public.wf_celebrations;
drop policy if exists wf_celebrations_write on public.wf_celebrations;
drop policy if exists wf_celebrations_edit  on public.wf_celebrations;
drop policy if exists wf_celebrations_del   on public.wf_celebrations;
create policy wf_celebrations_read  on public.wf_celebrations for select to authenticated
  using (wf_is_member(space_id) and wf_goal_celebratable(goal_id));
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

-- The blueprint as everyone who is not a parent receives it: the poster, not
-- the plan. Vision, mission and the values snapshot of the live version —
-- no year-by-year lines (that is where the amounts are), no note, no author,
-- no history. A child's session can select every column of this and learn
-- nothing it should not.
drop view if exists public.wf_blueprint_child_safe;
create view public.wf_blueprint_child_safe as
  select b.id,
         b.space_id,
         b.version,
         b.values_snapshot,
         b.mission,
         b.vision,
         b.created_at
    from public.wf_blueprints b
   where wf_is_member(b.space_id)
     and b.version = (select max(v.version) from public.wf_blueprints v where v.space_id = b.space_id);

grant select on public.wf_blueprint_child_safe to authenticated;

comment on view public.wf_blueprint_child_safe is
  'The live blueprint as a child or guest may see it: vision, mission and values. Never the one-, three- or five-year lines, which carry the family''s money.';

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
