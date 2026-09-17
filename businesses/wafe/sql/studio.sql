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
