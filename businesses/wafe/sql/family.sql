-- Wàfè — family: the trust boundary.
--
-- The space, its members and its invitations already live in 00-foundation.sql
-- because every module needs them. This fragment adds what sits AROUND that
-- core and belongs to nobody else: the values and the index of what points at
-- them, the mission's versions, the named things a guest is granted, the
-- per-member permission overrides, the rhythms and plan, the AI meter, the
-- parent PIN, and the audit log that proves every one of those changes.
--
-- Two rules run through the policies:
--   1. Only a parent may write anything here (wf_is_parent), and only a parent
--      may read the audit log, the value index, the exports and the handovers.
--   2. A guest's row of wf_family_shares is the whole of that guest's product,
--      so a member may read their own shares and nothing else.
--
-- The PIN lives in its own parents-only table and is compared inside a
-- security-definer function, so a child's session can prove a PIN without ever
-- being able to read it. Idempotent throughout: safe to re-run.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_family_values (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  name            text not null,
  meaning         text not null default '',
  position        integer not null default 0,
  archived_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_family_values_space on public.wf_family_values(space_id, position);

-- What already points at a value. A value with rows here is archived, never
-- deleted; modules that tag a record with a value keep this index honest.
create table if not exists public.wf_family_value_links (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  value_id        uuid not null references public.wf_family_values(id) on delete cascade,
  module_id       text not null,
  label           text not null default '',
  href            text not null default '',
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_family_value_links_value on public.wf_family_value_links(value_id);

create table if not exists public.wf_family_missions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  mission          text not null,
  vision           text not null default '',
  legacy           text not null default '',
  author_member_id uuid references public.wf_members(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_family_missions_space on public.wf_family_missions(space_id, created_at desc);

-- The named objects a guest may see. This is the entirety of a guest's
-- product: no row here, nothing rendered and nothing fetchable.
create table if not exists public.wf_family_shares (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  -- A member, or an invitation that has not been accepted yet (things get
  -- shared with people before they arrive), so this is deliberately not a FK.
  member_id       uuid not null,
  object_type     text not null check (object_type in ('trip','board','course','wall','album','event','session')),
  object_id       text not null,
  label           text not null default '',
  href            text not null default '',
  level           text not null default 'view' check (level in ('view','contribute')),
  granted_by      uuid references public.wf_members(id) on delete set null,
  granted_at      timestamptz not null default now(),
  expires_at      timestamptz
);
create unique index if not exists uq_wf_family_shares on public.wf_family_shares(space_id, member_id, object_id);
create index if not exists idx_wf_family_shares_member on public.wf_family_shares(member_id);

-- Per-member extras the core member row has no business carrying: the guest
-- tag, the child-mode flag, and the permission OVERRIDES that survive a band
-- change (the band supplies defaults; these are the parent's own decisions).
create table if not exists public.wf_family_member_meta (
  member_id       uuid primary key references public.wf_members(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  guest_tag       text check (guest_tag in ('relative','friend','mentor')),
  child_mode      boolean not null default false,
  overrides       jsonb not null default '{}'::jsonb,
  updated_at      timestamptz not null default now()
);
create index if not exists idx_wf_family_member_meta_space on public.wf_family_member_meta(space_id);

create table if not exists public.wf_family_settings (
  space_id                 uuid primary key references public.wf_spaces(id) on delete cascade,
  organization_id          uuid not null references public.organizations(id) on delete cascade,
  week_start               integer not null default 1 check (week_start between 1 and 7),
  briefing_hour            integer not null default 7 check (briefing_hour between 0 and 23),
  checkin_hour             integer not null default 19 check (checkin_hour between 0 and 23),
  grace_days               integer[] not null default '{7}',
  purchase_approval_cents  integer not null default 25000,
  plan                     text not null default 'seed' check (plan in ('seed','household','legacy')),
  quiet_from               text not null default '21:00',
  quiet_to                 text not null default '07:00',
  digest_above             integer not null default 5,
  notify_push              boolean not null default true,
  notify_email             boolean not null default true,
  -- The companion's monthly meter, reset by month rather than by cron.
  ai_month                 text not null default to_char(now(), 'YYYY-MM'),
  ai_calls                 integer not null default 0,
  ai_images                integer not null default 0,
  ai_media_mb              integer not null default 0,
  ai_reels                 integer not null default 0
);

-- The parent PIN, alone, in a parents-only table. Compared inside
-- wf_family_check_pin so a child can prove one without reading it.
create table if not exists public.wf_family_secrets (
  space_id   uuid primary key references public.wf_spaces(id) on delete cascade,
  pin_hash   text,
  updated_at timestamptz not null default now()
);

create table if not exists public.wf_family_audit (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  actor_member_id  uuid references public.wf_members(id) on delete set null,
  action           text not null check (action in ('member','role','band','permission','share','invite','values','mission','settings','childmode','export','space')),
  target_type      text not null default '',
  target_id        text not null default '',
  summary          text not null,
  before_text      text,
  after_text       text,
  at               timestamptz not null default now()
);
create index if not exists idx_wf_family_audit_space on public.wf_family_audit(space_id, at desc);

create table if not exists public.wf_family_exports (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  requested_by    uuid references public.wf_members(id) on delete set null,
  requested_at    timestamptz not null default now(),
  status          text not null default 'queued' check (status in ('queued','ready','failed')),
  ready_at        timestamptz,
  bytes           bigint,
  note            text not null default ''
);
create index if not exists idx_wf_family_exports_space on public.wf_family_exports(space_id, requested_at desc);

-- What happened to a member's work when they left: their access ended at once,
-- their authored history stayed, and their open tasks were reassigned first —
-- to the owner where nobody else was on them, otherwise to the people who
-- were. `open_tasks` counts the ones that actually reached `to_member_id`; it
-- is written after the move, never as a promise about it.
create table if not exists public.wf_family_handovers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  member_id       uuid not null,
  member_name     text not null,
  to_member_id    uuid references public.wf_members(id) on delete set null,
  open_tasks      integer not null default 0,
  at              timestamptz not null default now()
);
create index if not exists idx_wf_family_handovers_space on public.wf_family_handovers(space_id, at desc);

-- ---------------------------------------------------------------------------
-- 2. Row-level security
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'wf_family_values','wf_family_value_links','wf_family_missions','wf_family_shares',
    'wf_family_member_meta','wf_family_settings','wf_family_secrets','wf_family_audit',
    'wf_family_exports','wf_family_handovers'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Values and the mission are the family's public face: everyone reads them,
-- parents write them.
drop policy if exists wf_family_values_read on public.wf_family_values;
create policy wf_family_values_read on public.wf_family_values for select to authenticated using (wf_is_member(space_id));
drop policy if exists wf_family_values_write on public.wf_family_values;
create policy wf_family_values_write on public.wf_family_values for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_family_missions_read on public.wf_family_missions;
create policy wf_family_missions_read on public.wf_family_missions for select to authenticated using (wf_is_member(space_id));
drop policy if exists wf_family_missions_write on public.wf_family_missions;
create policy wf_family_missions_write on public.wf_family_missions for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- The value index tells a parent what would break; nobody else needs it.
drop policy if exists wf_family_value_links_parent on public.wf_family_value_links;
create policy wf_family_value_links_parent on public.wf_family_value_links for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- A member reads the things shared WITH THEM; a parent reads and writes all.
drop policy if exists wf_family_shares_read on public.wf_family_shares;
create policy wf_family_shares_read on public.wf_family_shares for select to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_family_shares_write on public.wf_family_shares;
create policy wf_family_shares_write on public.wf_family_shares for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- A member may read their own meta (their band overrides and child-mode flag);
-- only a parent may write any of it — that is acceptance criterion 1.
drop policy if exists wf_family_member_meta_read on public.wf_family_member_meta;
create policy wf_family_member_meta_read on public.wf_family_member_meta for select to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_family_member_meta_write on public.wf_family_member_meta;
create policy wf_family_member_meta_write on public.wf_family_member_meta for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- Rhythms are shared (the briefing hour is everybody's); parents change them.
drop policy if exists wf_family_settings_read on public.wf_family_settings;
create policy wf_family_settings_read on public.wf_family_settings for select to authenticated using (wf_is_member(space_id));
drop policy if exists wf_family_settings_write on public.wf_family_settings;
create policy wf_family_settings_write on public.wf_family_settings for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- Parents only, all four.
drop policy if exists wf_family_secrets_parent on public.wf_family_secrets;
create policy wf_family_secrets_parent on public.wf_family_secrets for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_family_audit_parent on public.wf_family_audit;
create policy wf_family_audit_parent on public.wf_family_audit for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_family_exports_parent on public.wf_family_exports;
create policy wf_family_exports_parent on public.wf_family_exports for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_family_handovers_parent on public.wf_family_handovers;
create policy wf_family_handovers_parent on public.wf_family_handovers for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- ---------------------------------------------------------------------------
-- 3. Functions — the PIN, the meter, and deleting a family
-- ---------------------------------------------------------------------------

-- Is a PIN set at all? A child may ask (it decides whether the exit screen
-- offers "ask a parent" or "set one first"), but may never read the hash.
create or replace function public.wf_family_pin_set(p_space uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select wf_is_member(p_space) and exists (
    select 1 from wf_family_secrets s where s.space_id = p_space and coalesce(s.pin_hash, '') <> ''
  )
$$;
grant execute on function public.wf_family_pin_set(uuid) to authenticated;

create or replace function public.wf_family_set_pin(p_space uuid, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not wf_is_parent(p_space) then raise exception 'Only a parent can set the PIN' using errcode = '42501'; end if;
  if p_pin !~ '^\d{4,8}$' then raise exception 'A PIN is four to eight digits'; end if;
  insert into wf_family_secrets (space_id, pin_hash, updated_at)
  values (p_space, extensions.crypt(p_pin, extensions.gen_salt('bf')), now())
  on conflict (space_id) do update set pin_hash = excluded.pin_hash, updated_at = now();
end $$;
grant execute on function public.wf_family_set_pin(uuid, text) to authenticated;

-- Exiting child mode: a child may ASK whether a PIN is right and never see it.
create or replace function public.wf_family_check_pin(p_space uuid, p_pin text) returns boolean
language plpgsql stable security definer set search_path = public, extensions as $$
declare v_hash text;
begin
  if not wf_is_member(p_space) then return false; end if;
  select pin_hash into v_hash from wf_family_secrets where space_id = p_space;
  if v_hash is null or v_hash = '' then return false; end if;
  return v_hash = extensions.crypt(p_pin, v_hash);
end $$;
grant execute on function public.wf_family_check_pin(uuid, text) to authenticated;

-- Leaving child mode. The meta table is parent-write, so this definer
-- function checks the PIN and then clears the CALLER's own flag and nothing
-- else — a child can let themselves out with a parent standing there, and can
-- never touch a sibling's device.
create or replace function public.wf_family_exit_child_mode(p_space uuid, p_pin text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me   uuid;
  v_hash text;
begin
  v_me := wf_my_member(p_space);
  if v_me is null then return false; end if;
  select pin_hash into v_hash from wf_family_secrets where space_id = p_space;
  if v_hash is null or v_hash = '' or v_hash <> extensions.crypt(p_pin, v_hash) then return false; end if;

  insert into wf_family_member_meta (member_id, organization_id, space_id, child_mode)
  select v_me, m.organization_id, p_space, false from wf_members m where m.id = v_me
  on conflict (member_id) do update set child_mode = false, updated_at = now();

  insert into wf_family_audit (organization_id, space_id, actor_member_id, action, target_type, target_id, summary, before_text, after_text)
  select m.organization_id, p_space, v_me, 'childmode', 'member', v_me::text,
         'Child mode unlocked with the parent PIN by ' || m.name, 'on', 'off'
  from wf_members m where m.id = v_me;
  return true;
end $$;
grant execute on function public.wf_family_exit_child_mode(uuid, text) to authenticated;

-- The AI meter: one atomic bump, rolling itself over on the first call of a
-- new month, so the cap is monthly without a scheduled job.
create or replace function public.wf_family_note_ai(p_space uuid, p_month text, p_kind text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not wf_is_member(p_space) then raise exception 'Not your family' using errcode = '42501'; end if;
  insert into wf_family_settings (space_id, organization_id, ai_month)
  select p_space, s.organization_id, p_month from wf_spaces s where s.id = p_space
  on conflict (space_id) do nothing;

  update wf_family_settings
     set ai_month  = p_month,
         ai_calls  = case when ai_month = p_month then ai_calls else 0 end + case when p_kind in ('call','image') then 1 else 0 end,
         ai_images = case when ai_month = p_month then ai_images else 0 end + case when p_kind = 'image' then 1 else 0 end,
         ai_reels  = case when ai_month = p_month then ai_reels else 0 end + case when p_kind = 'reel' then 1 else 0 end
   where space_id = p_space;
end $$;
grant execute on function public.wf_family_note_ai(uuid, text, text) to authenticated;

-- Delete the family. Every wf_ table cascades from wf_spaces, so one delete
-- is the whole space; the client sweeps the storage bucket first. Callable
-- only by a parent, and the UI only calls it after re-authentication.
create or replace function public.wf_family_delete_space(p_space uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not wf_is_parent(p_space) then raise exception 'Only a parent can delete the family' using errcode = '42501'; end if;
  delete from wf_family_shares where space_id = p_space;
  delete from wf_spaces where id = p_space;
end $$;
grant execute on function public.wf_family_delete_space(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Catalogue — the values a new family is offered, and the plans
-- ---------------------------------------------------------------------------
-- Pre-loaded content, public-read, keyed by organisation like every other
-- wf_catalog_* table. A brand-new space starts from these words rather than an
-- empty box (the brief: "value before configuration").

create table if not exists public.wf_catalog_values (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug            text not null,
  name            text not null,
  meaning         text not null default '',
  position        integer not null default 0
);
create unique index if not exists uq_wf_catalog_values on public.wf_catalog_values(organization_id, slug);

create table if not exists public.wf_catalog_plans (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug            text not null check (slug in ('seed','household','legacy')),
  name            text not null,
  price_cents     integer not null default 0,
  ai_calls        integer not null default 60,
  images          integer not null default 0,
  media_gb        integer not null default 1,
  reels           integer not null default 1,
  members         integer not null default 6,
  blurb           text not null default '',
  position        integer not null default 0
);
create unique index if not exists uq_wf_catalog_plans on public.wf_catalog_plans(organization_id, slug);

do $$
declare t text;
begin
  foreach t in array array['wf_catalog_values','wf_catalog_plans'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_read', t);
  end loop;
end $$;

create or replace function public.wf_seed_family(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into wf_catalog_values (organization_id, slug, name, meaning, position) values
    (p_org, 'faith',       'Faith',       'God first, out loud, on ordinary Tuesdays and not only on Sundays.', 0),
    (p_org, 'love',        'Love',        'We are for each other. We say the kind thing before we say the clever one.', 1),
    (p_org, 'diligence',   'Diligence',   'Finish what you start, and do it well enough to sign your name to it.', 2),
    (p_org, 'generosity',  'Generosity',  'Our table has one more chair than we need, and our giving is planned, not left over.', 3),
    (p_org, 'joy',         'Joy',         'Music in the kitchen. We laugh in this house.', 4),
    (p_org, 'hospitality', 'Hospitality', 'The door opens before the house is tidy.', 5),
    (p_org, 'courage',     'Courage',     'We do the hard, right thing while it is still small.', 6),
    (p_org, 'honesty',     'Honesty',     'We tell the truth kindly, and early.', 7),
    (p_org, 'rest',        'Rest',        'One day a week we stop, on purpose, together.', 8),
    (p_org, 'learning',    'Learning',    'Curiosity out loud: questions are welcome at this table.', 9)
  on conflict (organization_id, slug) do update
    set name = excluded.name, meaning = excluded.meaning, position = excluded.position;

  insert into wf_catalog_plans (organization_id, slug, name, price_cents, ai_calls, images, media_gb, reels, members, blurb, position) values
    (p_org, 'seed',      'Seed',      0,    60,   0,   1,   1,  6,  'The whole loop, free: briefing, check-in, Sunday planning. The companion writes from a template when the allowance is spent, and pictures are typographic.', 0),
    (p_org, 'household', 'Household', 900,  600,  40,  25,  8,  12, 'For a family running on Wàfè: a companion that answers all month, generated pictures in the studio, room for the photos.', 1),
    (p_org, 'legacy',    'Legacy',    1900, 2500, 200, 100, 30, 25, 'Grandparents, mentors and a decade of memories: the largest allowance, the archive, and every guest you want to bring in.', 2)
  on conflict (organization_id, slug) do update
    set name = excluded.name, price_cents = excluded.price_cents, ai_calls = excluded.ai_calls, images = excluded.images,
        media_gb = excluded.media_gb, reels = excluded.reels, members = excluded.members, blurb = excluded.blurb, position = excluded.position;
end $$;
grant execute on function public.wf_seed_family(uuid) to authenticated;
