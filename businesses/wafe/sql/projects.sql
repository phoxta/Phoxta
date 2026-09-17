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
