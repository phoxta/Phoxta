-- Wàfè — moodboards: boards, collaborators, sections, pins, comments and the
-- party checklist a board can turn into Tasks.
--
-- Idempotent. Depends only on 00-foundation (wf_spaces, wf_members and the
-- helpers wf_is_member / wf_is_parent / wf_my_member / wf_my_role); it never
-- references another module's tables. A board that belongs to a project or a
-- trip carries that module's id in `project_id` / `trip_id` and is joined in
-- the app — there is no foreign key across the seam.
--
-- THE PRIVACY MODEL, in one paragraph. A board is reachable by a parent
-- always (that is what makes a child's board reviewable), by its owner always,
-- by a child when it is child_safe and not private, and by a GUEST only when
-- the board is 'shared' AND that guest has a collaborator row — "granted named
-- objects, never modules". Everything hanging off a board inherits that
-- reachability. WRITING is narrower still: a parent, the owner, or a named
-- collaborator, and nothing at all on an archived board. Whether a collaborator
-- who is a child or a guest may write also depends on the `moodboards.manage`
-- grant on their member row, which the app enforces and a parent controls; the
-- database keeps the harder, structural half of that rule (you must be named).

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_moodboards (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  title            text not null,
  description      text not null default '',
  kind             text not null default 'ideas' check (kind in ('interior','party','holiday','style','garden','ideas','school-project')),
  -- The template it was started from ('party', 'interior', 'wardrobe', …).
  template         text,
  owner_member_id  uuid references public.wf_members(id) on delete set null,
  visibility       text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with      uuid[] not null default '{}',
  child_safe       boolean not null default true,
  tags             text[] not null default '{}',
  cover_pin_id     uuid,
  -- Ids into other modules; joined in the app, never by a foreign key.
  project_id       uuid,
  project_label    text not null default '',
  trip_id          uuid,
  trip_label       text not null default '',
  -- A parent has looked at this (child-owned boards are reviewable by design).
  reviewed_at      timestamptz,
  reviewed_by      uuid references public.wf_members(id) on delete set null,
  archived         boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_wf_moodboards_space on public.wf_moodboards(space_id, archived);

-- Who may pin and comment here. Being named is necessary; for a child or a
-- guest the app also requires the `moodboards.manage` grant.
create table if not exists public.wf_moodboard_collaborators (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  board_id         uuid not null references public.wf_moodboards(id) on delete cascade,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  created_at       timestamptz not null default now(),
  unique (board_id, member_id)
);
create index if not exists idx_wf_moodboard_collab_board on public.wf_moodboard_collaborators(board_id);
create index if not exists idx_wf_moodboard_collab_member on public.wf_moodboard_collaborators(member_id);

create table if not exists public.wf_moodboard_sections (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  board_id         uuid not null references public.wf_moodboards(id) on delete cascade,
  title            text not null,
  section_order    integer not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_moodboard_sections_board on public.wf_moodboard_sections(board_id, section_order);

-- A pin. `image_url` is ALWAYS a copy we serve (the public `catalog` bucket, or
-- a data URL for a typographic card); `source_url` is only for credit and for
-- "open the original". `cached_from` says how the copy was made and the screen
-- shows it — a snapshot presented without saying how it was captured is a
-- small lie.
create table if not exists public.wf_moodboard_pins (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  space_id            uuid not null references public.wf_spaces(id) on delete cascade,
  board_id            uuid not null references public.wf_moodboards(id) on delete cascade,
  section_id          uuid references public.wf_moodboard_sections(id) on delete set null,
  title               text not null default '',
  note                text not null default '',
  source              text not null default 'library' check (source in ('url','upload','library')),
  source_url          text,
  image_url           text not null,
  cached_from         text not null default 'library' check (cached_from in ('fetched','placeholder','upload','library')),
  cached_at           timestamptz not null default now(),
  tags                text[] not null default '{}',
  price_cents         integer check (price_cents is null or price_cents >= 0),
  colour              text,
  pin_order           integer not null default 0,
  added_by            uuid references public.wf_members(id) on delete set null,
  copied_from_pin_id  uuid,
  created_at          timestamptz not null default now()
);
create index if not exists idx_wf_moodboard_pins_board on public.wf_moodboard_pins(board_id, pin_order);
create index if not exists idx_wf_moodboard_pins_tags on public.wf_moodboard_pins using gin (tags);

create table if not exists public.wf_moodboard_comments (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  pin_id           uuid not null references public.wf_moodboard_pins(id) on delete cascade,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  text             text not null default '',
  reaction         text check (reaction is null or reaction in ('love','yes','maybe','no')),
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_moodboard_comments_pin on public.wf_moodboard_comments(pin_id, created_at);

-- The party checklist. It lives with the board because that is where it is
-- decided; `task_id` remembers the Task a line became, so the board can say
-- "already sent" instead of sending twice. The Tasks module owns the task.
create table if not exists public.wf_moodboard_checklist (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  space_id            uuid not null references public.wf_spaces(id) on delete cascade,
  board_id            uuid not null references public.wf_moodboards(id) on delete cascade,
  text                text not null,
  note                text not null default '',
  due_in_days         integer not null default 0 check (due_in_days >= 0),
  assignee_member_id  uuid references public.wf_members(id) on delete set null,
  task_id             uuid,
  sent_at             timestamptz,
  origin              text not null default 'companion' check (origin in ('template','companion')),
  line_order          integer not null default 0,
  created_at          timestamptz not null default now()
);
create index if not exists idx_wf_moodboard_checklist_board on public.wf_moodboard_checklist(board_id, line_order);

-- Pre-loaded board templates, public-read per tenant (see wf_seed_moodboards).
create table if not exists public.wf_catalog_moodboard_templates (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  slug             text not null,
  label            text not null,
  kind             text not null default 'ideas',
  blurb            text not null default '',
  sections         text[] not null default '{}',
  tags             text[] not null default '{}',
  created_at       timestamptz not null default now(),
  unique (organization_id, slug)
);

-- ---------------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------------

-- May the session open this board? Parent → yes. Owner → yes. Guest → only a
-- 'shared' board they are named on. Child → child_safe, not private, and either
-- family/child visibility or named on it.
create or replace function public.wf_moodboard_can_see(p_board uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  b        record;
  v_me     uuid;
  v_role   text;
  v_named  boolean;
begin
  select * into b from wf_moodboards where id = p_board;
  if not found then return false; end if;
  select m.id, m.role into v_me, v_role from wf_members m
  where m.space_id = b.space_id and m.user_id = auth.uid() limit 1;
  if v_me is null then return false; end if;
  if v_role = 'parent' then return true; end if;
  if b.owner_member_id = v_me then return true; end if;
  select exists (select 1 from wf_moodboard_collaborators c where c.board_id = b.id and c.member_id = v_me) into v_named;
  if v_role = 'guest' then
    return b.visibility = 'shared' and v_named;
  end if;
  -- child
  if not b.child_safe or b.visibility = 'private' then return false; end if;
  if b.visibility = 'shared' then return v_named or v_me = any (coalesce(b.shared_with, '{}'::uuid[])); end if;
  return true;
end $$;

-- May the session add to this board? Named, or a parent, or the owner — and
-- never on an archived board.
create or replace function public.wf_moodboard_can_pin(p_board uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  b      record;
  v_me   uuid;
  v_role text;
begin
  select * into b from wf_moodboards where id = p_board;
  if not found or b.archived then return false; end if;
  select m.id, m.role into v_me, v_role from wf_members m
  where m.space_id = b.space_id and m.user_id = auth.uid() limit 1;
  if v_me is null then return false; end if;
  if v_role = 'parent' or b.owner_member_id = v_me then return true; end if;
  return exists (select 1 from wf_moodboard_collaborators c where c.board_id = b.id and c.member_id = v_me);
end $$;

-- Renaming, sections, deleting: a parent or the owner.
create or replace function public.wf_moodboard_can_edit(p_board uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  b    record;
  v_me uuid;
begin
  select * into b from wf_moodboards where id = p_board;
  if not found or b.archived then return false; end if;
  if wf_is_parent(b.space_id) then return true; end if;
  select m.id into v_me from wf_members m where m.space_id = b.space_id and m.user_id = auth.uid() limit 1;
  return v_me is not null and b.owner_member_id = v_me;
end $$;

grant execute on function public.wf_moodboard_can_see(uuid) to authenticated;
grant execute on function public.wf_moodboard_can_pin(uuid) to authenticated;
grant execute on function public.wf_moodboard_can_edit(uuid) to authenticated;

-- A child's board is child-safe and never private, whatever was sent.
create or replace function public.wf_moodboards_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner_role text;
begin
  select m.role into v_owner_role from wf_members m where m.id = new.owner_member_id;
  if v_owner_role = 'child' then
    new.child_safe := true;
    if new.visibility = 'private' then new.visibility := 'family'; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists wf_moodboards_guard on public.wf_moodboards;
create trigger wf_moodboards_guard before insert or update on public.wf_moodboards
  for each row execute function public.wf_moodboards_guard();

-- ---------------------------------------------------------------------------
-- 3. Row-level security
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'wf_moodboards','wf_moodboard_collaborators','wf_moodboard_sections',
    'wf_moodboard_pins','wf_moodboard_comments','wf_moodboard_checklist',
    'wf_catalog_moodboard_templates'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Boards
drop policy if exists wf_moodboards_read on public.wf_moodboards;
create policy wf_moodboards_read on public.wf_moodboards for select to authenticated
  using (wf_moodboard_can_see(id));
drop policy if exists wf_moodboards_write on public.wf_moodboards;
create policy wf_moodboards_write on public.wf_moodboards for insert to authenticated
  with check (
    wf_is_parent(space_id)
    or (wf_is_member(space_id) and wf_my_role(space_id) <> 'guest' and owner_member_id = wf_my_member(space_id))
  );
drop policy if exists wf_moodboards_edit on public.wf_moodboards;
create policy wf_moodboards_edit on public.wf_moodboards for update to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));
drop policy if exists wf_moodboards_del on public.wf_moodboards;
create policy wf_moodboards_del on public.wf_moodboards for delete to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));

-- Collaborators: readable with the board, written by a parent or the owner.
drop policy if exists wf_moodboard_collab_read on public.wf_moodboard_collaborators;
create policy wf_moodboard_collab_read on public.wf_moodboard_collaborators for select to authenticated
  using (wf_moodboard_can_see(board_id));
drop policy if exists wf_moodboard_collab_all on public.wf_moodboard_collaborators;
create policy wf_moodboard_collab_all on public.wf_moodboard_collaborators for all to authenticated
  using (wf_moodboard_can_edit(board_id)) with check (wf_moodboard_can_edit(board_id));

-- Sections: read with the board, edited by a parent or the owner.
drop policy if exists wf_moodboard_sections_read on public.wf_moodboard_sections;
create policy wf_moodboard_sections_read on public.wf_moodboard_sections for select to authenticated
  using (wf_moodboard_can_see(board_id));
drop policy if exists wf_moodboard_sections_all on public.wf_moodboard_sections;
create policy wf_moodboard_sections_all on public.wf_moodboard_sections for all to authenticated
  using (wf_moodboard_can_edit(board_id)) with check (wf_moodboard_can_edit(board_id));

-- Pins: read with the board; added by anyone named on it (AC 2); changed by a
-- parent, the person who pinned it, or the board's owner.
drop policy if exists wf_moodboard_pins_read on public.wf_moodboard_pins;
create policy wf_moodboard_pins_read on public.wf_moodboard_pins for select to authenticated
  using (wf_moodboard_can_see(board_id));
drop policy if exists wf_moodboard_pins_write on public.wf_moodboard_pins;
create policy wf_moodboard_pins_write on public.wf_moodboard_pins for insert to authenticated
  with check (wf_moodboard_can_pin(board_id) and added_by = wf_my_member(space_id));
drop policy if exists wf_moodboard_pins_edit on public.wf_moodboard_pins;
create policy wf_moodboard_pins_edit on public.wf_moodboard_pins for update to authenticated
  using (wf_moodboard_can_pin(board_id) and (wf_is_parent(space_id) or added_by = wf_my_member(space_id) or wf_moodboard_can_edit(board_id)))
  with check (wf_moodboard_can_pin(board_id));
drop policy if exists wf_moodboard_pins_del on public.wf_moodboard_pins;
create policy wf_moodboard_pins_del on public.wf_moodboard_pins for delete to authenticated
  using (wf_moodboard_can_pin(board_id) and (wf_is_parent(space_id) or added_by = wf_my_member(space_id) or wf_moodboard_can_edit(board_id)));

-- Comments: read with the pin's board; written by anyone who may pin there;
-- removed by their author or a parent.
drop policy if exists wf_moodboard_comments_read on public.wf_moodboard_comments;
create policy wf_moodboard_comments_read on public.wf_moodboard_comments for select to authenticated
  using (exists (select 1 from wf_moodboard_pins p where p.id = pin_id and wf_moodboard_can_see(p.board_id)));
drop policy if exists wf_moodboard_comments_write on public.wf_moodboard_comments;
create policy wf_moodboard_comments_write on public.wf_moodboard_comments for insert to authenticated
  with check (member_id = wf_my_member(space_id) and exists (select 1 from wf_moodboard_pins p where p.id = pin_id and wf_moodboard_can_pin(p.board_id)));
drop policy if exists wf_moodboard_comments_del on public.wf_moodboard_comments;
create policy wf_moodboard_comments_del on public.wf_moodboard_comments for delete to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));

-- The checklist is planning: a parent or the board's owner.
drop policy if exists wf_moodboard_checklist_read on public.wf_moodboard_checklist;
create policy wf_moodboard_checklist_read on public.wf_moodboard_checklist for select to authenticated
  using (wf_is_parent(space_id) or exists (select 1 from wf_moodboards b where b.id = board_id and b.owner_member_id = wf_my_member(space_id)));
drop policy if exists wf_moodboard_checklist_all on public.wf_moodboard_checklist;
create policy wf_moodboard_checklist_all on public.wf_moodboard_checklist for all to authenticated
  using (wf_moodboard_can_edit(board_id)) with check (wf_moodboard_can_edit(board_id));

-- Templates: public-read inside the tenant, written by the platform only.
drop policy if exists wf_catalog_moodboard_templates_read on public.wf_catalog_moodboard_templates;
create policy wf_catalog_moodboard_templates_read on public.wf_catalog_moodboard_templates for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 4. Pre-loaded content
-- ---------------------------------------------------------------------------

create or replace function public.wf_seed_moodboards(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.wf_catalog_moodboard_templates (organization_id, slug, label, kind, blurb, sections, tags) values
    (p_org, 'party',    'Party',    'party',    'Cake, table, games, favours — and a checklist you can turn into tasks.', array['The look','Food & cake','Games','Favours'], array['party']),
    (p_org, 'interior', 'Interior', 'interior', 'A room, broken into the decisions you actually have to make.',           array['Layout','Colour & finish','Lighting','Storage'], array['home']),
    (p_org, 'wardrobe', 'Wardrobe', 'style',    'Outfits, fabric, shoes and the shapes that suit you.',                   array['Outfits','Fabric','Shoes & jewellery'], array['style']),
    (p_org, 'wedding',  'Wedding',  'party',    'The day, in the order you''ll book it.',                                 array['Venue','Dress & attire','Flowers','Table','Music'], array['wedding']),
    (p_org, 'garden',   'Garden',   'garden',   'Beds, paths, pots and what to plant when.',                              array['Beds & borders','Paths & seating','Pots','Lighting'], array['garden'])
  on conflict (organization_id, slug) do update
    set label = excluded.label, kind = excluded.kind, blurb = excluded.blurb, sections = excluded.sections, tags = excluded.tags;
end $$;

grant execute on function public.wf_seed_moodboards(uuid) to authenticated;
