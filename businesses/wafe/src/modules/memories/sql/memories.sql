-- Wàfè — memories: the family's pictures, the albums they are gathered into,
-- one timeline that merges every celebration, and the reels the app plays.
--
-- Idempotent. Depends only on 00-foundation (wf_spaces, wf_members and the
-- helpers wf_is_member / wf_is_parent / wf_my_member / wf_can_see). It never
-- references another module's tables: an album that belongs to a trip keeps
-- the trip's id, a reel made from a Studio storyboard keeps the storyboard's
-- id, and both are joined in the app.
--
-- THE PRIVACY MODEL, in one paragraph. Pictures, albums and reels follow the
-- ordinary visibility rules through wf_can_see, so a private album is the
-- owner's and a "family" album reaches a child only when it is child-safe.
-- On top of that sit two named doors, and they are the whole of the guest
-- story: wf_object_shares grants ONE object to ONE member — which is why a
-- grandmother can be given the Lagos album and the prayer wall and still not
-- be able to select a single other row — and wf_share_links is a token anyone
-- may hold, with an expiry and a revoked_at, read only through the
-- security-definer function at the bottom of this file. A guest's select on
-- wf_albums returns exactly the granted rows; there is no policy anywhere
-- that would return a title, a count or a thumbnail of anything else.
--
-- A reel is a PLAYLIST. There is no video column, no encode job and no export:
-- wf_reels is a row and wf_reel_frames are its ordered pictures, which is why
-- sharing one is a link and never a file.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

-- Every picture and video the family keeps. `bytes` is what the quota counts;
-- `needs_conversion` is the honest flag for a HEIC the browser could not
-- decode on the way in — the file is kept exactly as it arrived.
create table if not exists public.wf_media (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  owner_member_id  uuid references public.wf_members(id) on delete set null,
  url              text not null,
  poster_url       text,
  kind             text not null default 'photo' check (kind in ('photo','video')),
  format           text not null default 'jpeg' check (format in ('jpeg','png','heic','mp4')),
  caption          text not null default '',
  -- The day it was taken, not the day it was uploaded: the timeline's spine.
  taken_at         date not null default current_date,
  place            text not null default '',
  people_ids       uuid[] not null default '{}',
  tags             text[] not null default '{}',
  favourite        boolean not null default false,
  visibility       text not null default 'child' check (visibility in ('private','shared','family','child')),
  shared_with      uuid[] not null default '{}',
  child_safe       boolean not null default true,
  width            integer not null default 1600,
  height           integer not null default 1067,
  bytes            bigint not null default 0 check (bytes >= 0),
  needs_conversion boolean not null default false,
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_media_space on public.wf_media(space_id, taken_at desc);
create index if not exists idx_wf_media_people on public.wf_media using gin(people_ids);

create table if not exists public.wf_albums (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete cascade,
  space_id               uuid not null references public.wf_spaces(id) on delete cascade,
  owner_member_id        uuid references public.wf_members(id) on delete set null,
  title                  text not null,
  description            text not null default '',
  cover_media_id         uuid references public.wf_media(id) on delete set null,
  date_from              date not null default current_date,
  date_to                date not null default current_date,
  visibility             text not null default 'child' check (visibility in ('private','shared','family','child')),
  shared_with            uuid[] not null default '{}',
  child_safe             boolean not null default true,
  -- Members who may add to this album without holding memories.manage.
  contributor_member_ids uuid[] not null default '{}',
  -- Travel's trip id. Unique per space, which is what makes "make the album
  -- when the trip ends" idempotent rather than a source of duplicates.
  trip_id                text,
  auto                   boolean not null default false,
  created_at             timestamptz not null default now()
);
create unique index if not exists idx_wf_albums_trip on public.wf_albums(space_id, trip_id) where trip_id is not null;
create index if not exists idx_wf_albums_space on public.wf_albums(space_id, date_to desc);

-- album_media: the ordered membership, so one picture may live in two albums
-- and carry a different caption in each.
create table if not exists public.wf_album_media (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  album_id        uuid not null references public.wf_albums(id) on delete cascade,
  media_id        uuid not null references public.wf_media(id) on delete cascade,
  caption         text not null default '',
  position        integer not null default 0,
  created_at      timestamptz not null default now(),
  unique (album_id, media_id)
);
create index if not exists idx_wf_album_media_album on public.wf_album_media(album_id, position);

-- The timeline. `source_id` is the record in ITS OWN module and `href` is
-- where the entry takes you — a timeline that cannot reach the record it
-- describes is a decoration, so href is not null.
create table if not exists public.wf_timeline_events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  owner_member_id uuid references public.wf_members(id) on delete set null,
  date            date not null,
  type            text not null check (type in ('album','celebration','answered_prayer','badge','milestone','trip','first')),
  source_id       text,
  title           text not null,
  body            text not null default '',
  media_id        uuid references public.wf_media(id) on delete set null,
  member_ids      uuid[] not null default '{}',
  href            text not null default '/create/memories/timeline',
  visibility      text not null default 'child' check (visibility in ('private','shared','family','child')),
  shared_with     uuid[] not null default '{}',
  child_safe      boolean not null default true,
  -- Merged in from another module rather than written here.
  imported        boolean not null default false,
  created_at      timestamptz not null default now()
);
-- One row per source record, which is what makes importing idempotent.
create unique index if not exists idx_wf_timeline_source on public.wf_timeline_events(space_id, type, source_id) where source_id is not null;
create index if not exists idx_wf_timeline_space on public.wf_timeline_events(space_id, date desc);

-- A reel: a playlist, never a file. `auto_kind` says who asked for it —
-- 'our_year' is the one the product drafts itself every December.
create table if not exists public.wf_reels (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  owner_member_id uuid references public.wf_members(id) on delete set null,
  title           text not null,
  subtitle        text not null default '',
  mood            text not null default 'warm' check (mood in ('warm','joy','calm')),
  transition      text not null default 'crossfade' check (transition in ('crossfade','dip','cut')),
  slide_ms        integer not null default 4000 check (slide_ms between 800 and 20000),
  status          text not null default 'draft' check (status in ('draft','ready')),
  auto_kind       text not null default 'custom' check (auto_kind in ('our_year','trip','storyboard','custom')),
  track_title     text not null default '',
  track_note      text not null default '',
  -- A Studio recording of the family singing it, by item id (joined in the app).
  track_item_id   text,
  cover_media_id  uuid references public.wf_media(id) on delete set null,
  visibility      text not null default 'child' check (visibility in ('private','shared','family','child')),
  shared_with     uuid[] not null default '{}',
  child_safe      boolean not null default true,
  scheduled_for   date,
  storyboard_id   text,
  created_at      timestamptz not null default now()
);
create unique index if not exists idx_wf_reels_storyboard on public.wf_reels(space_id, storyboard_id) where storyboard_id is not null;
create index if not exists idx_wf_reels_space on public.wf_reels(space_id, created_at desc);

create table if not exists public.wf_reel_frames (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  reel_id         uuid not null references public.wf_reels(id) on delete cascade,
  media_id        uuid not null references public.wf_media(id) on delete cascade,
  caption         text not null default '',
  -- Null means "use the reel's slide_ms".
  duration_ms     integer check (duration_ms is null or duration_ms between 800 and 20000),
  position        integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_reel_frames_reel on public.wf_reel_frames(reel_id, position);

-- A named grant: ONE object to ONE member. The guest dashboard is this list.
create table if not exists public.wf_object_shares (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  object_type     text not null check (object_type in ('album','reel')),
  object_id       uuid not null,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  granted_by      uuid references public.wf_members(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (space_id, object_type, object_id, member_id)
);
create index if not exists idx_wf_object_shares_member on public.wf_object_shares(member_id);

-- A link anyone may hold. It expires, it can be revoked, and every open is
-- counted — the three things that make "shared by link" safe to offer.
create table if not exists public.wf_share_links (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  object_type     text not null check (object_type in ('album','reel')),
  object_id       uuid not null,
  token           text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_by      uuid references public.wf_members(id) on delete set null,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '30 days'),
  revoked_at      timestamptz,
  views           integer not null default 0,
  last_viewed_at  timestamptz
);
create index if not exists idx_wf_share_links_object on public.wf_share_links(space_id, object_type, object_id);

-- The space's tier. One row per space; the media half of the plan table lives
-- in the app (MEDIA_PLANS), the AI half with the companion, and both read this.
create table if not exists public.wf_space_plans (
  space_id        uuid primary key references public.wf_spaces(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tier            text not null default 'household' check (tier in ('seed','household','legacy')),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. Helpers — the two named doors, as functions the policies can use
-- ---------------------------------------------------------------------------

-- True when this member was granted the object by name.
create or replace function public.wf_mem_granted(p_space uuid, p_type text, p_object uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wf_object_shares s
    where s.space_id = p_space and s.object_type = p_type and s.object_id = p_object
      and s.member_id = public.wf_my_member(p_space)
  );
$$;

-- True when a live (unrevoked, unexpired) link exists for the object. This is
-- what lets a member who was sent a link open it without a grant; the link
-- itself is read by the security-definer function below.
create or replace function public.wf_mem_linked(p_space uuid, p_type text, p_object uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wf_share_links l
    where l.space_id = p_space and l.object_type = p_type and l.object_id = p_object
      and l.revoked_at is null and l.expires_at > now()
  );
$$;

-- The module's whole access rule for an album or a reel, in one place:
-- the ordinary visibility rules, OR a named grant, OR a live link. A GUEST
-- gets only the last two — which is acceptance criterion 5, as a policy.
create or replace function public.wf_mem_can_open(p_space uuid, p_owner uuid, p_vis text, p_shared uuid[], p_child_safe boolean, p_type text, p_object uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when not public.wf_is_member(p_space) then false
    when public.wf_mem_granted(p_space, p_type, p_object) then true
    when public.wf_mem_linked(p_space, p_type, p_object) then true
    when exists (select 1 from public.wf_members m where m.space_id = p_space and m.id = public.wf_my_member(p_space) and m.role = 'guest') then false
    when exists (select 1 from public.wf_members m where m.space_id = p_space and m.id = public.wf_my_member(p_space) and m.role = 'child')
      then public.wf_can_see(p_space, p_owner, p_vis, p_shared) and (p_vis = 'child' or p_child_safe or p_owner = public.wf_my_member(p_space))
    else public.wf_can_see(p_space, p_owner, p_vis, p_shared)
  end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Row-level security
-- ---------------------------------------------------------------------------

alter table public.wf_media           enable row level security;
alter table public.wf_albums          enable row level security;
alter table public.wf_album_media     enable row level security;
alter table public.wf_timeline_events enable row level security;
alter table public.wf_reels           enable row level security;
alter table public.wf_reel_frames     enable row level security;
alter table public.wf_object_shares   enable row level security;
alter table public.wf_share_links     enable row level security;
alter table public.wf_space_plans     enable row level security;

-- A picture reaches you when its own visibility reaches you, OR when it is in
-- an album / a reel that was opened for you. That second half is what makes a
-- grant of ONE album hand over exactly that album's pictures and no others.
drop policy if exists wf_media_read on public.wf_media;
create policy wf_media_read on public.wf_media for select to authenticated using (
  public.wf_can_see(space_id, owner_member_id, visibility, shared_with)
  or exists (
    select 1 from public.wf_album_media am join public.wf_albums a on a.id = am.album_id
    where am.media_id = wf_media.id
      and public.wf_mem_can_open(a.space_id, a.owner_member_id, a.visibility, a.shared_with, a.child_safe, 'album', a.id)
  )
  or exists (
    select 1 from public.wf_reel_frames rf join public.wf_reels r on r.id = rf.reel_id
    where rf.media_id = wf_media.id
      and public.wf_mem_can_open(r.space_id, r.owner_member_id, r.visibility, r.shared_with, r.child_safe, 'reel', r.id)
  )
);
drop policy if exists wf_media_write on public.wf_media;
create policy wf_media_write on public.wf_media for insert to authenticated with check (public.wf_is_member(space_id));
drop policy if exists wf_media_edit on public.wf_media;
create policy wf_media_edit on public.wf_media for update to authenticated using (public.wf_is_parent(space_id) or owner_member_id = public.wf_my_member(space_id));
drop policy if exists wf_media_del on public.wf_media;
create policy wf_media_del on public.wf_media for delete to authenticated using (public.wf_is_parent(space_id) or owner_member_id = public.wf_my_member(space_id));

drop policy if exists wf_albums_read on public.wf_albums;
create policy wf_albums_read on public.wf_albums for select to authenticated using (
  public.wf_mem_can_open(space_id, owner_member_id, visibility, shared_with, child_safe, 'album', id)
  or public.wf_my_member(space_id) = any (contributor_member_ids)
);
drop policy if exists wf_albums_write on public.wf_albums;
create policy wf_albums_write on public.wf_albums for insert to authenticated with check (public.wf_is_member(space_id));
drop policy if exists wf_albums_edit on public.wf_albums;
create policy wf_albums_edit on public.wf_albums for update to authenticated using (public.wf_is_parent(space_id) or owner_member_id = public.wf_my_member(space_id));
drop policy if exists wf_albums_del on public.wf_albums;
create policy wf_albums_del on public.wf_albums for delete to authenticated using (public.wf_is_parent(space_id) or owner_member_id = public.wf_my_member(space_id));

drop policy if exists wf_album_media_read on public.wf_album_media;
create policy wf_album_media_read on public.wf_album_media for select to authenticated using (
  exists (select 1 from public.wf_albums a where a.id = album_id
          and public.wf_mem_can_open(a.space_id, a.owner_member_id, a.visibility, a.shared_with, a.child_safe, 'album', a.id))
);
-- Contributors may add to the albums they contribute to; that is the point of
-- the contributor list, and it is checked here rather than in the client.
drop policy if exists wf_album_media_write on public.wf_album_media;
create policy wf_album_media_write on public.wf_album_media for insert to authenticated with check (
  exists (select 1 from public.wf_albums a where a.id = album_id and a.space_id = wf_album_media.space_id
          and (public.wf_is_parent(a.space_id) or a.owner_member_id = public.wf_my_member(a.space_id) or public.wf_my_member(a.space_id) = any (a.contributor_member_ids)))
);
drop policy if exists wf_album_media_edit on public.wf_album_media;
create policy wf_album_media_edit on public.wf_album_media for update to authenticated using (
  exists (select 1 from public.wf_albums a where a.id = album_id
          and (public.wf_is_parent(a.space_id) or a.owner_member_id = public.wf_my_member(a.space_id) or public.wf_my_member(a.space_id) = any (a.contributor_member_ids)))
);
drop policy if exists wf_album_media_del on public.wf_album_media;
create policy wf_album_media_del on public.wf_album_media for delete to authenticated using (
  exists (select 1 from public.wf_albums a where a.id = album_id
          and (public.wf_is_parent(a.space_id) or a.owner_member_id = public.wf_my_member(a.space_id) or public.wf_my_member(a.space_id) = any (a.contributor_member_ids)))
);

-- The timeline is the family's story: guests are not in it. (What a guest is
-- shown of the past is the albums they were granted, and nothing more.)
drop policy if exists wf_timeline_read on public.wf_timeline_events;
create policy wf_timeline_read on public.wf_timeline_events for select to authenticated using (
  public.wf_can_see(space_id, owner_member_id, visibility, shared_with)
  and not exists (select 1 from public.wf_members m where m.space_id = wf_timeline_events.space_id and m.id = public.wf_my_member(wf_timeline_events.space_id) and m.role = 'guest')
);
drop policy if exists wf_timeline_write on public.wf_timeline_events;
create policy wf_timeline_write on public.wf_timeline_events for insert to authenticated with check (public.wf_is_parent(space_id));
drop policy if exists wf_timeline_edit on public.wf_timeline_events;
create policy wf_timeline_edit on public.wf_timeline_events for update to authenticated using (public.wf_is_parent(space_id));
drop policy if exists wf_timeline_del on public.wf_timeline_events;
create policy wf_timeline_del on public.wf_timeline_events for delete to authenticated using (public.wf_is_parent(space_id));

drop policy if exists wf_reels_read on public.wf_reels;
create policy wf_reels_read on public.wf_reels for select to authenticated using (
  public.wf_mem_can_open(space_id, owner_member_id, visibility, shared_with, child_safe, 'reel', id)
);
drop policy if exists wf_reels_write on public.wf_reels;
create policy wf_reels_write on public.wf_reels for insert to authenticated with check (public.wf_is_parent(space_id));
drop policy if exists wf_reels_edit on public.wf_reels;
create policy wf_reels_edit on public.wf_reels for update to authenticated using (public.wf_is_parent(space_id) or owner_member_id = public.wf_my_member(space_id));
drop policy if exists wf_reels_del on public.wf_reels;
create policy wf_reels_del on public.wf_reels for delete to authenticated using (public.wf_is_parent(space_id) or owner_member_id = public.wf_my_member(space_id));

drop policy if exists wf_reel_frames_read on public.wf_reel_frames;
create policy wf_reel_frames_read on public.wf_reel_frames for select to authenticated using (
  exists (select 1 from public.wf_reels r where r.id = reel_id
          and public.wf_mem_can_open(r.space_id, r.owner_member_id, r.visibility, r.shared_with, r.child_safe, 'reel', r.id))
);
drop policy if exists wf_reel_frames_write on public.wf_reel_frames;
create policy wf_reel_frames_write on public.wf_reel_frames for insert to authenticated with check (public.wf_is_parent(space_id));
drop policy if exists wf_reel_frames_edit on public.wf_reel_frames;
create policy wf_reel_frames_edit on public.wf_reel_frames for update to authenticated using (public.wf_is_parent(space_id));
drop policy if exists wf_reel_frames_del on public.wf_reel_frames;
create policy wf_reel_frames_del on public.wf_reel_frames for delete to authenticated using (public.wf_is_parent(space_id));

-- You may read the grants that are yours; a parent reads them all, because a
-- parent is the one who has to be able to answer "who can see this?".
drop policy if exists wf_object_shares_read on public.wf_object_shares;
create policy wf_object_shares_read on public.wf_object_shares for select to authenticated using (
  public.wf_is_parent(space_id) or member_id = public.wf_my_member(space_id)
);
drop policy if exists wf_object_shares_write on public.wf_object_shares;
create policy wf_object_shares_write on public.wf_object_shares for insert to authenticated with check (public.wf_is_parent(space_id));
drop policy if exists wf_object_shares_del on public.wf_object_shares;
create policy wf_object_shares_del on public.wf_object_shares for delete to authenticated using (public.wf_is_parent(space_id));

-- Links are a parent's desk. Nobody else may list them — a token is meant to
-- be held, not discovered.
drop policy if exists wf_share_links_read on public.wf_share_links;
create policy wf_share_links_read on public.wf_share_links for select to authenticated using (public.wf_is_parent(space_id));
drop policy if exists wf_share_links_write on public.wf_share_links;
create policy wf_share_links_write on public.wf_share_links for insert to authenticated with check (public.wf_is_parent(space_id));
drop policy if exists wf_share_links_edit on public.wf_share_links;
create policy wf_share_links_edit on public.wf_share_links for update to authenticated using (public.wf_is_parent(space_id));
drop policy if exists wf_share_links_del on public.wf_share_links;
create policy wf_share_links_del on public.wf_share_links for delete to authenticated using (public.wf_is_parent(space_id));

drop policy if exists wf_space_plans_read on public.wf_space_plans;
create policy wf_space_plans_read on public.wf_space_plans for select to authenticated using (public.wf_is_member(space_id));
drop policy if exists wf_space_plans_write on public.wf_space_plans;
create policy wf_space_plans_write on public.wf_space_plans for insert to authenticated with check (public.wf_is_parent(space_id));
drop policy if exists wf_space_plans_edit on public.wf_space_plans;
create policy wf_space_plans_edit on public.wf_space_plans for update to authenticated using (public.wf_is_parent(space_id));

-- ---------------------------------------------------------------------------
-- 4. The token path
-- ---------------------------------------------------------------------------

-- Opening a share link. Security definer, because the person holding the link
-- may not be in the space at all — and it returns exactly ONE object, its
-- frames and their pictures, or null. Expired and revoked both return null,
-- which is what makes "links expire and can be revoked" observable rather
-- than promised. Every successful open is counted.
create or replace function public.wf_open_shared_object(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_link   public.wf_share_links%rowtype;
  v_result jsonb;
begin
  select * into v_link from public.wf_share_links
   where token = p_token and revoked_at is null and expires_at > now();
  if not found then
    return null;
  end if;

  update public.wf_share_links
     set views = views + 1, last_viewed_at = now()
   where id = v_link.id;

  if v_link.object_type = 'reel' then
    select jsonb_build_object(
      'object_type', 'reel',
      'expires_at', v_link.expires_at,
      'shared_by', (select m.name from public.wf_members m where m.id = v_link.created_by),
      'reel', to_jsonb(r),
      'frames', coalesce((select jsonb_agg(to_jsonb(f) order by f.position) from public.wf_reel_frames f where f.reel_id = r.id), '[]'::jsonb),
      'media', coalesce((select jsonb_agg(to_jsonb(m)) from public.wf_media m
                          where m.id in (select f.media_id from public.wf_reel_frames f where f.reel_id = r.id)
                             or m.id = r.cover_media_id), '[]'::jsonb)
    ) into v_result
    from public.wf_reels r where r.id = v_link.object_id;
  else
    select jsonb_build_object(
      'object_type', 'album',
      'expires_at', v_link.expires_at,
      'shared_by', (select m.name from public.wf_members m where m.id = v_link.created_by),
      'album', to_jsonb(a),
      'frames', '[]'::jsonb,
      'media', coalesce((select jsonb_agg(to_jsonb(m) order by m.taken_at) from public.wf_media m
                          where m.id in (select am.media_id from public.wf_album_media am where am.album_id = a.id)
                             or m.id = a.cover_media_id), '[]'::jsonb)
    ) into v_result
    from public.wf_albums a where a.id = v_link.object_id;
  end if;

  return v_result;
end;
$$;

grant execute on function public.wf_open_shared_object(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Pre-loaded content: the reel presets a new family starts from
-- ---------------------------------------------------------------------------

-- Not photographs — a family's pictures are their own — but the shapes a reel
-- can take: how long a frame holds, which transition, what the mood does. A
-- new space picks one instead of facing an empty form.
create table if not exists public.wf_catalog_reel_presets (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug            text not null,
  name            text not null,
  blurb           text not null default '',
  mood            text not null default 'warm' check (mood in ('warm','joy','calm')),
  transition      text not null default 'crossfade' check (transition in ('crossfade','dip','cut')),
  slide_ms        integer not null default 4000,
  frame_target    integer not null default 40,
  created_at      timestamptz not null default now(),
  unique (organization_id, slug)
);
alter table public.wf_catalog_reel_presets enable row level security;
drop policy if exists wf_catalog_reel_presets_read on public.wf_catalog_reel_presets;
create policy wf_catalog_reel_presets_read on public.wf_catalog_reel_presets for select to authenticated using (true);

create or replace function public.wf_seed_memories(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.wf_catalog_reel_presets (organization_id, slug, name, blurb, mood, transition, slide_ms, frame_target)
  values
    (p_org, 'our-year',   'Our year',            'Twelve months in sixty frames — the one that writes itself every December.', 'warm', 'crossfade', 4000, 60),
    (p_org, 'the-trip',   'The trip',            'A holiday, in the order it happened, with the places named.',                'joy',  'crossfade', 3200, 40),
    (p_org, 'the-day',    'One day',             'A birthday or a wedding: quick cuts, lots of faces.',                        'joy',  'cut',       2600, 30),
    (p_org, 'the-child',  'A year of one child', 'One person, one year, in order — the growing-up reel.',                      'warm', 'crossfade', 3600, 36),
    (p_org, 'sunday',     'Sundays',             'Church, lunch, the long light. The slowest of them.',                        'calm', 'dip',       5200, 24),
    (p_org, 'storyboard', 'A storyboard',        'A story the studio drew, played frame by frame with its narration.',         'calm', 'dip',       5000, 12)
  on conflict (organization_id, slug) do update
    set name = excluded.name, blurb = excluded.blurb, mood = excluded.mood,
        transition = excluded.transition, slide_ms = excluded.slide_ms, frame_target = excluded.frame_target;
end;
$$;
