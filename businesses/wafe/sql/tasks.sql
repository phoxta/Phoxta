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
