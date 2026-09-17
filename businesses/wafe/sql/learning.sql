-- Wàfè — learning: the Learning Hub (saved YouTube lessons, playlists, notes,
-- summaries, plans, completions and the action items a summary produces).
--
-- Idempotent. Depends only on 00-foundation (wf_spaces, wf_members and the
-- helpers wf_is_member / wf_is_parent / wf_my_member / wf_can_see); it never
-- references another module's tables.
--
-- THE PRIVACY MODEL, in one paragraph: a playlist carries a visibility and a
-- child_safe flag, and both matter. `wf_learning_can_see_playlist` states the
-- rule once, in the same words as derive.ts, so the demo and the database
-- cannot drift: private → the owner alone (a co-parent is not the owner),
-- shared → the members named on it, family → the parents, child → everyone;
-- a playlist SET FOR someone is theirs whatever the visibility says; a child
-- never receives a row that is not child_safe; and a guest holds the named
-- objects they were given rather than the module. A video is reachable only
-- through a playlist you can see (or one you saved, or one nobody has filed),
-- so Tunde's private cycling course is not merely hidden in the UI — neither
-- the shelf nor the six videos on it are readable by anyone else.

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
  -- A lesson pays its Sprouts once, ever. The flag outlives "not done after
  -- all", so clearing a completion and watching again earns nothing twice.
  points_awarded  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (member_id, item_type, item_id),
  constraint wf_learning_completion_rule check (completed_at is null or progress_pct >= 80 or marked_by is not null)
);
create index if not exists idx_wf_learning_completions_space on public.wf_learning_completions(space_id, member_id);
-- Idempotent for spaces created before the Sprouts memory existed.
alter table public.wf_learning_completions add column if not exists points_awarded boolean not null default false;

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

-- Can the session see this playlist? THE canonical statement of the rule, in
-- the same order as canSeePlaylist() in derive.ts. Read them side by side.
create or replace function public.wf_learning_can_see_playlist(p_playlist uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  p      record;
  v_me   uuid;
  v_role text;
  v_named boolean;
begin
  select l.space_id, l.owner_member_id, l.visibility, l.shared_with, l.child_safe, l.assigned_to
    into p from wf_learning_playlists l where l.id = p_playlist;
  if p.space_id is null or not wf_is_member(p.space_id) then return false; end if;
  v_me := wf_my_member(p.space_id);
  v_role := wf_my_role(p.space_id);
  -- Your own shelf, whatever it says on it.
  if p.owner_member_id is not null and p.owner_member_id = v_me then return true; end if;
  v_named := v_me = any (coalesce(p.assigned_to, '{}'::uuid[]))
          or (p.visibility = 'shared' and v_me = any (coalesce(p.shared_with, '{}'::uuid[])));
  -- A guest is granted named objects, never a module.
  if v_role = 'guest' then return v_named; end if;
  -- The child gate sits above everything else.
  if v_role = 'child' and not p.child_safe then return false; end if;
  if v_named then return true; end if;
  if p.visibility = 'child' then return true; end if;
  -- "family" is the parents; a child gets nothing from it by default.
  return p.visibility = 'family' and v_role = 'parent';
end $$;
grant execute on function public.wf_learning_can_see_playlist(uuid) to authenticated;

-- Is this video reachable by the session? Through a playlist you can see, or
-- because you saved it, or because nobody has filed it on a shelf at all (an
-- unfiled import belongs to no one's privacy, so parents keep it). A child
-- needs the child_safe flag on top of that.
create or replace function public.wf_learning_can_see_video(p_video uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v record;
begin
  select v2.space_id, v2.child_safe, v2.added_by into v
  from wf_learning_videos v2 where v2.id = p_video;
  if v.space_id is null or not wf_is_member(v.space_id) then return false; end if;
  if v.added_by is not null and v.added_by = wf_my_member(v.space_id) then return true; end if;
  if wf_is_child(v.space_id) and not v.child_safe then return false; end if;
  if exists (
    select 1 from wf_learning_playlist_items i
    where i.video_id = p_video and wf_learning_can_see_playlist(i.playlist_id)
  ) then return true; end if;
  return wf_is_parent(v.space_id)
     and not exists (select 1 from wf_learning_playlist_items i where i.video_id = p_video);
end $$;
grant execute on function public.wf_learning_can_see_video(uuid) to authenticated;

-- Videos
drop policy if exists wf_learning_videos_read on public.wf_learning_videos;
create policy wf_learning_videos_read on public.wf_learning_videos for select to authenticated
  using (wf_learning_can_see_video(id));
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
  using (wf_learning_can_see_playlist(id));
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
-- Plans read exactly like playlists: owner, assignee or named — then the
-- visibility, with "family" meaning the parents and a guest holding only what
-- was given to them by name.
create policy wf_learning_plans_read on public.wf_learning_plans for select to authenticated
  using (
    owner_member_id = wf_my_member(space_id)
    or wf_my_member(space_id) = any (assignee_member_ids)
    or (visibility = 'shared' and wf_my_member(space_id) = any (shared_with))
    or (wf_my_role(space_id) <> 'guest' and (visibility = 'child' or (visibility = 'family' and wf_is_parent(space_id))))
  );
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
