-- ---------------------------------------------------------------------------
-- Coir Six — live classes
--
-- 0147 modelled a live lesson as a row in a timetable with a `join_url` pointing
-- somewhere else. This turns it into a room the school actually owns: who is in
-- it, what was said in it, whether it is running, and who is allowed to run it.
--
-- Four things:
--   1. `cs_live_lessons` learns a room id and a lifecycle (scheduled/live/ended).
--   2. `cs_mentors` learns which auth user hosts as that mentor.
--   3. `cs_live_participants` — the attendance record, and the roster.
--   4. `cs_live_chat`  — what was said, kept after the class.
--
-- The last two are the first Coir Six tables one learner may read another
-- learner's rows from, so they cannot use 0147's `user_id = auth.uid()` loop.
-- They are readable by anyone enrolled at the SAME school and writable only
-- under your own id — see the note above their policies for why that is
-- stricter than `cs_group_posts`.
-- ---------------------------------------------------------------------------

-- 1. The lesson's own room -----------------------------------------------------

alter table public.cs_live_lessons add column if not exists room_id     text;
alter table public.cs_live_lessons add column if not exists status      text not null default 'scheduled';
alter table public.cs_live_lessons add column if not exists started_at  timestamptz;
alter table public.cs_live_lessons add column if not exists ended_at    timestamptz;

do $$ begin
  alter table public.cs_live_lessons
    add constraint cs_live_lessons_status_check check (status in ('scheduled','live','ended'));
exception when duplicate_object then null; end $$;

-- Every existing lesson gets a room name. It is derived, not random, so the
-- same lesson is the same room after a redeploy — and it is namespaced by
-- tenant, so two schools' "live-2" are never the same room on the media server.
update public.cs_live_lessons
   set room_id = 'cs-' || replace(organization_id::text, '-', '') || '-' || id
 where room_id is null;

-- 2. Who may host --------------------------------------------------------------
-- A mentor is a catalogue row, not an account. This is the link: the staff
-- account that runs classes as that mentor. Nullable — a school whose mentors
-- never sign in still works, and its owner/admins can host any class.
alter table public.cs_mentors add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists cs_mentors_user_idx on public.cs_mentors (user_id) where user_id is not null;

-- 3. Attendance ----------------------------------------------------------------

create table if not exists public.cs_live_participants (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  live_lesson_id  text not null,
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null default '',
  hue             text not null default 'lilac',
  photo_url       text,
  role            text not null default 'learner',
  joined_at       timestamptz not null default now(),
  left_at         timestamptz,
  -- Total time in the room across rejoins, not just the last visit: a learner
  -- whose wifi drops twice still attended the whole class.
  seconds         integer not null default 0,
  primary key (organization_id, live_lesson_id, user_id),
  foreign key (organization_id, live_lesson_id) references public.cs_live_lessons(organization_id, id) on delete cascade
);
create index if not exists cs_live_participants_lesson_idx
  on public.cs_live_participants (organization_id, live_lesson_id);

-- 4. Chat ----------------------------------------------------------------------

create table if not exists public.cs_live_chat (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  live_lesson_id   text not null,
  user_id          uuid not null references auth.users(id) on delete cascade,
  -- Denormalised on purpose: a message should still read correctly months
  -- later, under the name and face the person had when they sent it.
  author_name      text not null default '',
  author_hue       text not null default 'lilac',
  author_photo_url text,
  body             text not null,
  created_at       timestamptz not null default now(),
  foreign key (organization_id, live_lesson_id) references public.cs_live_lessons(organization_id, id) on delete cascade
);
create index if not exists cs_live_chat_lesson_idx
  on public.cs_live_chat (organization_id, live_lesson_id, created_at);

-- 5. Row-level security --------------------------------------------------------
-- Cross-learner readable, so not 0147's `user_id = auth.uid()` loop — but
-- scoped to YOUR OWN SCHOOL, which `cs_group_posts` is not.
--
-- `cs_group_posts` reads `using (true)` and leans on the client always adding
-- `.eq(organization_id, …)`. That is fine for a public course-group board and
-- wrong here: an attendance register and a class transcript name people and say
-- when they were somewhere. A plain `using (true)` would let any signed-in
-- learner read another school's register by guessing an id. One EXISTS against
-- cs_profiles closes that and still lets classmates see each other.
create or replace function public.cs_is_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from cs_profiles p
     where p.organization_id = p_org and p.user_id = auth.uid()
  );
$$;
grant execute on function public.cs_is_member(uuid) to authenticated;
-- The policies probe by user; the table's PK is (organization_id, user_id), so
-- without this every check is a scan.
create index if not exists cs_profiles_user_idx on public.cs_profiles (user_id);

alter table public.cs_live_participants enable row level security;
grant select, insert, update on public.cs_live_participants to authenticated;
drop policy if exists cs_live_participants_read on public.cs_live_participants;
create policy cs_live_participants_read on public.cs_live_participants
  for select to authenticated using (cs_is_member(organization_id));
drop policy if exists cs_live_participants_write on public.cs_live_participants;
create policy cs_live_participants_write on public.cs_live_participants
  for insert to authenticated with check (user_id = auth.uid() and cs_is_member(organization_id));
drop policy if exists cs_live_participants_update on public.cs_live_participants;
create policy cs_live_participants_update on public.cs_live_participants
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.cs_live_chat enable row level security;
grant select, insert on public.cs_live_chat to authenticated;
drop policy if exists cs_live_chat_read on public.cs_live_chat;
create policy cs_live_chat_read on public.cs_live_chat
  for select to authenticated using (cs_is_member(organization_id));
drop policy if exists cs_live_chat_write on public.cs_live_chat;
create policy cs_live_chat_write on public.cs_live_chat
  for insert to authenticated with check (user_id = auth.uid() and cs_is_member(organization_id));
-- Nobody edits what was said in a class, including its author.
revoke update, delete on public.cs_live_chat from authenticated;

-- 6. Functions -----------------------------------------------------------------

-- Is this caller allowed to run this class? Either the tenant's owner/admin, or
-- the account linked to the lesson's mentor. Used by the RPCs below and mirrored
-- by the `coir-live` edge function before it mints a token.
create or replace function public.cs_is_live_host(p_org uuid, p_lesson text, p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    exists (
      select 1 from organization_memberships m
       where m.organization_id = p_org and m.user_id = p_uid and m.role in ('owner','admin')
    )
    or exists (
      select 1 from cs_live_lessons l
        join cs_mentors mt
          on mt.organization_id = l.organization_id and mt.id = l.mentor_id
       where l.organization_id = p_org and l.id = p_lesson and mt.user_id = p_uid
    ),
  false);
$$;
grant execute on function public.cs_is_live_host(uuid, text, uuid) to authenticated;

-- Take a seat. Records attendance and answers the one question the client must
-- not decide for itself: whether you are the host.
create or replace function public.cs_join_live(p_org uuid, p_lesson text)
returns table (room_id text, is_host boolean, status text)
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_host boolean;
  v_room text;
  v_p    record;
begin
  if v_uid is null then raise exception 'Sign in first'; end if;

  select l.room_id into v_room
    from cs_live_lessons l
   where l.organization_id = p_org and l.id = p_lesson;
  if not found then raise exception 'That class is not in this school'; end if;

  v_host := cs_is_live_host(p_org, p_lesson, v_uid);

  -- Carry the learner's name and face onto the attendance row so the roster and
  -- the register read correctly without a join back to cs_profiles.
  select pr.name, pr.hue, pr.photo_url into v_p
    from cs_profiles pr
   where pr.organization_id = p_org and pr.user_id = v_uid;

  insert into cs_live_participants (organization_id, live_lesson_id, user_id, name, hue, photo_url, role)
  values (p_org, p_lesson, v_uid, coalesce(v_p.name, ''), coalesce(v_p.hue, 'lilac'), v_p.photo_url,
          case when v_host then 'host' else 'learner' end)
  on conflict (organization_id, live_lesson_id, user_id) do update
    set left_at = null,
        joined_at = now(),
        name = excluded.name,
        hue = excluded.hue,
        photo_url = excluded.photo_url,
        role = excluded.role;

  -- The host arriving is what starts the class.
  if v_host then
    update cs_live_lessons
       set status = 'live', started_at = coalesce(started_at, now())
     where organization_id = p_org and id = p_lesson and status <> 'ended';
  end if;

  return query
    select l.room_id, v_host, l.status
      from cs_live_lessons l
     where l.organization_id = p_org and l.id = p_lesson;
end $$;
grant execute on function public.cs_join_live(uuid, text) to authenticated;

-- Close the attendance row. `p_seconds` is added to whatever a previous visit
-- already recorded, so a reconnect does not reset the register.
create or replace function public.cs_leave_live(p_org uuid, p_lesson text, p_seconds integer)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;
  update cs_live_participants
     set left_at = now(),
         seconds = seconds + greatest(0, coalesce(p_seconds, 0))
   where organization_id = p_org and live_lesson_id = p_lesson and user_id = v_uid;
end $$;
grant execute on function public.cs_leave_live(uuid, text, integer) to authenticated;

-- End the class. Host only; tells everyone who reserved a seat that the
-- recording is on its way.
create or replace function public.cs_end_live(p_org uuid, p_lesson text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_title text;
begin
  if v_uid is null then raise exception 'Sign in first'; end if;
  if not cs_is_live_host(p_org, p_lesson, v_uid) then
    raise exception 'Only the mentor running this class can end it';
  end if;

  update cs_live_lessons
     set status = 'ended', ended_at = now()
   where organization_id = p_org and id = p_lesson
  returning title into v_title;

  update cs_live_participants
     set left_at = coalesce(left_at, now())
   where organization_id = p_org and live_lesson_id = p_lesson and left_at is null;

  insert into cs_notifications (organization_id, user_id, kind, title, body, href)
  select p_org, r.user_id, 'live', 'Class ended',
         coalesce(v_title, 'Your live session') || ' has finished. The recording follows shortly.',
         '/lessons#' || p_lesson
    from cs_live_rsvps r
   where r.organization_id = p_org and r.live_lesson_id = p_lesson;
end $$;
grant execute on function public.cs_end_live(uuid, text) to authenticated;

-- Attach a finished recording. Host only — `saveRecording` uploads the file and
-- then calls this through the edge function.
create or replace function public.cs_set_recording(p_org uuid, p_lesson text, p_url text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or not cs_is_live_host(p_org, p_lesson, v_uid) then
    raise exception 'Only the mentor running this class can publish its recording';
  end if;
  update cs_live_lessons set recording_url = p_url
   where organization_id = p_org and id = p_lesson;

  insert into cs_notifications (organization_id, user_id, kind, title, body, href)
  select p_org, r.user_id, 'live', 'Recording ready',
         'The session you reserved is ready to watch back.', '/lessons#' || p_lesson
    from cs_live_rsvps r
   where r.organization_id = p_org and r.live_lesson_id = p_lesson;
end $$;
grant execute on function public.cs_set_recording(uuid, text, text) to authenticated;

-- 7. Realtime ------------------------------------------------------------------
-- The roster and the chat both reach an open class without a reload. Same
-- idempotent shape as 0147's block for cs_messages.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'cs_live_participants') then
      alter publication supabase_realtime add table public.cs_live_participants;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'cs_live_chat') then
      alter publication supabase_realtime add table public.cs_live_chat;
    end if;
  end if;
end $$;

-- 8. Recordings bucket ---------------------------------------------------------
-- Public read (a recording is course content, like the lesson videos); writes
-- are confined to the tenant's own folder. Mirrors `cs-avatars` in 0149.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cs-recordings', 'cs-recordings', true, 2147483648,
        array['video/webm','video/mp4','audio/webm','audio/mpeg'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists cs_recordings_read on storage.objects;
create policy cs_recordings_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'cs-recordings');

-- Only a signed-in member of the tenant may write into that tenant's folder.
drop policy if exists cs_recordings_write on storage.objects;
create policy cs_recordings_write on storage.objects
  for insert to authenticated with check (
    bucket_id = 'cs-recordings'
    and exists (
      select 1 from cs_profiles p
       where p.user_id = auth.uid()
         and p.organization_id::text = (storage.foldername(name))[1]
    )
  );

-- 9. New tenants ---------------------------------------------------------------
-- A school provisioned from this blueprint gets rooms on its seeded lessons.
-- `cs_seed_org` inserts them without a room id, so stamp them afterwards.
create or replace function public.cs_seed_live_rooms(p_org uuid)
returns void language sql security definer set search_path = public as $$
  update cs_live_lessons
     set room_id = 'cs-' || replace(organization_id::text, '-', '') || '-' || id
   where organization_id = p_org and room_id is null;
$$;
grant execute on function public.cs_seed_live_rooms(uuid) to authenticated, service_role;
