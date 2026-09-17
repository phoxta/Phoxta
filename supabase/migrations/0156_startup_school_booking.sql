-- ---------------------------------------------------------------------------
-- 1:1 mentor booking
--
-- The live classroom is a fixed timetable: a session has a start and a length,
-- and everyone joins the same room. Mentoring is the inverse — a mentor
-- publishes availability and a founder claims a slot — and nothing in the
-- schema modelled that.
--
-- Three decisions worth stating, because each one has a cheaper wrong version:
--
-- 1. AVAILABILITY IS WALL-CLOCK, NOT INSTANTS. "Tuesdays 14:00-17:00" is a
--    civil-time rule in the mentor's own zone. Stored as UTC instants it would
--    silently shift twice a year. The zone lives on the mentor (all their rules
--    share it), the rule stores `time`, and instants are derived at query time.
--
-- 2. NO RRULE. A weekly weekday bitmap plus date overrides covers essentially
--    every real availability pattern, is indexable, and is diffable. RFC 5545
--    also mandates that a recurring 01:30 slot be SILENTLY SKIPPED on the
--    spring-forward day, which is a surprising thing to inherit for free.
--    Cal.com reached the same conclusion: the override is the same row shape as
--    the rule, distinguished only by `on_date` being non-null.
--
-- 3. DOUBLE-BOOKING IS PREVENTED BY THE STORAGE ENGINE, NOT BY APPLICATION
--    CODE. `SELECT ... FOR UPDATE` cannot lock a row that does not exist yet,
--    so two concurrent bookings each see a free slot and both insert. An
--    EXCLUDE constraint over a tstzrange makes the overlap unrepresentable on
--    every write path — RPC, admin, or psql — and turns a race into a caught
--    exception. The partial predicate is what lets a cancelled slot be re-sold.
--
-- Private notes are a SEPARATE TABLE rather than a column, because RLS is
-- row-level: a mentor's private note cannot be hidden from the founder by
-- policy if it lives on a row the founder is allowed to read.
-- ---------------------------------------------------------------------------

create extension if not exists btree_gist;

-- --- what a mentor offers ---------------------------------------------------

alter table public.cs_mentors add column if not exists bookable       boolean not null default false;
alter table public.cs_mentors add column if not exists timezone       text    not null default 'UTC';
alter table public.cs_mentors add column if not exists session_min    integer not null default 30;
alter table public.cs_mentors add column if not exists buffer_min     integer not null default 10;
alter table public.cs_mentors add column if not exists min_notice_min integer not null default 240;
alter table public.cs_mentors add column if not exists horizon_days   integer not null default 28;

comment on column public.cs_mentors.timezone is
  'IANA zone the availability rules are written in. Never an offset: an offset cannot say whether DST applied.';
comment on column public.cs_mentors.buffer_min is
  'Gap enforced on BOTH sides of a booking. Two adjacent bookings therefore leave 2x this, which is deliberate.';

-- --- availability: a weekly rule, or an override for one civil date ---------

create table if not exists public.cs_availability (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id         text not null,
  mentor_id  text not null,
  -- Exactly one of these two is set.
  weekday    smallint,          -- 0 = Sunday .. 6 = Saturday; the recurring rule
  on_date    date,              -- an override for this civil date
  start_time time not null,
  end_time   time not null,
  -- An override that BLOCKS a day the weekly rule would have opened.
  closed     boolean not null default false,
  primary key (organization_id, id),
  foreign key (organization_id, mentor_id) references public.cs_mentors(organization_id, id) on delete cascade,
  constraint cs_availability_shape check (
    (weekday is not null and on_date is null and weekday between 0 and 6)
    or (weekday is null and on_date is not null)
  ),
  constraint cs_availability_order check (end_time > start_time)
);

create index if not exists cs_availability_mentor_idx
  on public.cs_availability (organization_id, mentor_id, weekday);
create index if not exists cs_availability_date_idx
  on public.cs_availability (organization_id, mentor_id, on_date) where on_date is not null;

-- --- bookings ---------------------------------------------------------------

create table if not exists public.cs_bookings (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id           uuid not null default gen_random_uuid(),
  mentor_id    text not null,
  user_id      uuid not null references auth.users(id) on delete cascade,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  -- The zone the founder booked in, kept so the confirmation can be re-rendered
  -- in the same civil time they agreed to even if they travel.
  booked_tz    text not null default 'UTC',
  status       text not null default 'confirmed'
    check (status in ('confirmed', 'cancelled', 'completed', 'no_show')),
  agenda       text not null default '',
  -- Visible to both parties. The mentor's own notes live in cs_booking_notes.
  shared_notes text not null default '',
  room_id      text,
  rescheduled_from uuid,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_reason text not null default '',
  created_at   timestamptz not null default now(),
  primary key (organization_id, id),
  foreign key (organization_id, mentor_id) references public.cs_mentors(organization_id, id) on delete cascade,
  constraint cs_bookings_order check (ends_at > starts_at)
);

-- The whole point. Two confirmed bookings for one mentor cannot overlap, on any
-- write path. `btree_gist` is what allows the scalar equality and the range
-- overlap to share one GiST index.
alter table public.cs_bookings drop constraint if exists cs_bookings_no_overlap;
alter table public.cs_bookings add constraint cs_bookings_no_overlap
  exclude using gist (
    organization_id with =,
    mentor_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'confirmed');

create index if not exists cs_bookings_user_idx   on public.cs_bookings (organization_id, user_id, starts_at desc);
create index if not exists cs_bookings_mentor_idx on public.cs_bookings (organization_id, mentor_id, starts_at);

-- A mentor's private notes. Separate table, separate policy: RLS is row-level,
-- so a column on cs_bookings could not be hidden from the founder who owns it.
create table if not exists public.cs_booking_notes (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  booking_id uuid not null,
  body       text not null default '',
  updated_at timestamptz not null default now(),
  primary key (organization_id, booking_id),
  foreign key (organization_id, booking_id) references public.cs_bookings(organization_id, id) on delete cascade
);

-- Action items that survive between sessions — the thing that makes a series of
-- calls an engagement rather than four unrelated conversations.
create table if not exists public.cs_booking_actions (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id         uuid not null default gen_random_uuid(),
  booking_id uuid not null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null,
  done_at    timestamptz,
  created_at timestamptz not null default now(),
  primary key (organization_id, id),
  foreign key (organization_id, booking_id) references public.cs_bookings(organization_id, id) on delete cascade
);

create index if not exists cs_booking_actions_booking_idx
  on public.cs_booking_actions (organization_id, booking_id);

-- --- RLS --------------------------------------------------------------------

alter table public.cs_availability    enable row level security;
alter table public.cs_bookings        enable row level security;
alter table public.cs_booking_notes   enable row level security;
alter table public.cs_booking_actions enable row level security;

-- Availability is catalogue-shaped: everyone signed in can see when a mentor is
-- free. Writes go through the seed or an admin, like the rest of the catalogue.
drop policy if exists cs_availability_read on public.cs_availability;
create policy cs_availability_read on public.cs_availability
  for select to authenticated using (true);

-- A founder sees their own bookings. A mentor sees bookings made with them,
-- via the account linked on cs_mentors.user_id.
drop policy if exists cs_bookings_read on public.cs_bookings;
create policy cs_bookings_read on public.cs_bookings
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.cs_mentors m
       where m.organization_id = cs_bookings.organization_id
         and m.id = cs_bookings.mentor_id
         and m.user_id = auth.uid()
    )
  );

-- Writes go through the RPCs below, which hold the notice/horizon/overlap rules
-- in one place. Direct inserts would let a client book yesterday.
drop policy if exists cs_bookings_update_own on public.cs_bookings;
create policy cs_bookings_update_own on public.cs_bookings
  for update to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.cs_mentors m
                where m.organization_id = cs_bookings.organization_id
                  and m.id = cs_bookings.mentor_id and m.user_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.cs_mentors m
                where m.organization_id = cs_bookings.organization_id
                  and m.id = cs_bookings.mentor_id and m.user_id = auth.uid())
  );

-- Private notes: the mentor only. The founder can read the booking row and
-- still cannot read this.
drop policy if exists cs_booking_notes_mentor on public.cs_booking_notes;
create policy cs_booking_notes_mentor on public.cs_booking_notes
  for all to authenticated
  using (
    exists (
      select 1 from public.cs_bookings b
        join public.cs_mentors m
          on m.organization_id = b.organization_id and m.id = b.mentor_id
       where b.organization_id = cs_booking_notes.organization_id
         and b.id = cs_booking_notes.booking_id
         and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cs_bookings b
        join public.cs_mentors m
          on m.organization_id = b.organization_id and m.id = b.mentor_id
       where b.organization_id = cs_booking_notes.organization_id
         and b.id = cs_booking_notes.booking_id
         and m.user_id = auth.uid()
    )
  );

-- Action items are shared: both parties read them, either can tick one off.
drop policy if exists cs_booking_actions_rw on public.cs_booking_actions;
create policy cs_booking_actions_rw on public.cs_booking_actions
  for all to authenticated
  using (
    exists (
      select 1 from public.cs_bookings b
       where b.organization_id = cs_booking_actions.organization_id
         and b.id = cs_booking_actions.booking_id
         and (b.user_id = auth.uid()
              or exists (select 1 from public.cs_mentors m
                          where m.organization_id = b.organization_id
                            and m.id = b.mentor_id and m.user_id = auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from public.cs_bookings b
       where b.organization_id = cs_booking_actions.organization_id
         and b.id = cs_booking_actions.booking_id
         and (b.user_id = auth.uid()
              or exists (select 1 from public.cs_mentors m
                          where m.organization_id = b.organization_id
                            and m.id = b.mentor_id and m.user_id = auth.uid()))
    )
  );

-- --- free/busy ---------------------------------------------------------------
-- Every constraint is normalised into the same shape — a busy interval — and
-- subtracted once. Existing bookings, buffers and the minimum-notice floor are
-- all just intervals, which keeps the slot loop simple and makes adding a new
-- kind of constraint a matter of adding a row to the busy set.
-- ---------------------------------------------------------------------------

create or replace function public.cs_mentor_slots(
  p_org uuid, p_mentor text, p_from date, p_to date
) returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  v_tz      text;
  v_len     integer;
  v_buf     integer;
  v_notice  integer;
  v_horizon integer;
  v_ok      boolean;
  v_today   date;
  v_floor   timestamptz;   -- nothing may start before this
  v_ceil    date;          -- nothing may start after this civil date
  d         date;
  w         record;
  v_cur     timestamptz;
  v_win_end timestamptz;
begin
  select bookable, timezone, session_min, buffer_min, min_notice_min, horizon_days
    into v_ok, v_tz, v_len, v_buf, v_notice, v_horizon
    from cs_mentors
   where organization_id = p_org and id = p_mentor;

  if not found or not coalesce(v_ok, false) then
    return;                              -- not bookable: no slots, not an error
  end if;

  v_today := (now() at time zone v_tz)::date;
  v_floor := now() + make_interval(mins => v_notice);
  v_ceil  := v_today + v_horizon;

  d := greatest(p_from, v_today);
  p_to := least(p_to, v_ceil);

  while d <= p_to loop
    -- An override for this date replaces the weekly rule entirely: a mentor who
    -- opens an unusual Saturday, or closes a normal Tuesday, says so per date.
    for w in
      select a.start_time, a.end_time, a.closed
        from cs_availability a
       where a.organization_id = p_org and a.mentor_id = p_mentor and a.on_date = d
       union all
      select a.start_time, a.end_time, a.closed
        from cs_availability a
       where a.organization_id = p_org and a.mentor_id = p_mentor
         and a.weekday = extract(dow from d)::smallint
         and not exists (
           select 1 from cs_availability o
            where o.organization_id = p_org and o.mentor_id = p_mentor and o.on_date = d
         )
      order by 1
    loop
      continue when w.closed;

      -- Wall clock in the mentor's zone -> instants. Doing it per day rather
      -- than per week is what makes a DST transition a non-event.
      v_cur     := (d + w.start_time) at time zone v_tz;
      v_win_end := (d + w.end_time)   at time zone v_tz;

      while v_cur + make_interval(mins => v_len) <= v_win_end loop
        if v_cur >= v_floor
           and not exists (
             select 1 from cs_bookings b
              where b.organization_id = p_org
                and b.mentor_id = p_mentor
                and b.status = 'confirmed'
                -- The buffer is applied to the EXISTING booking, so it protects
                -- the mentor on both sides without being charged to the founder.
                and tstzrange(b.starts_at - make_interval(mins => v_buf),
                              b.ends_at   + make_interval(mins => v_buf))
                    && tstzrange(v_cur, v_cur + make_interval(mins => v_len))
           )
        then
          slot_start := v_cur;
          slot_end   := v_cur + make_interval(mins => v_len);
          return next;
        end if;
        v_cur := v_cur + make_interval(mins => v_len);
      end loop;
    end loop;
    d := d + 1;
  end loop;
end $$;

grant execute on function public.cs_mentor_slots(uuid, text, date, date) to authenticated;

-- --- booking ----------------------------------------------------------------

create or replace function public.cs_book_slot(
  p_org uuid, p_mentor text, p_starts_at timestamptz, p_tz text default 'UTC', p_agenda text default ''
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_len integer;
  v_id  uuid;
begin
  if v_uid is null then raise exception 'Sign in first'; end if;

  -- Tenancy, the same way the live classroom proves it.
  if not exists (select 1 from cs_profiles p where p.organization_id = p_org and p.user_id = v_uid) then
    raise exception 'That mentor is not in this school';
  end if;

  select session_min into v_len from cs_mentors where organization_id = p_org and id = p_mentor;
  if not found then raise exception 'No such mentor'; end if;

  -- Re-validate against the live slot list rather than trusting the client.
  -- The grid the founder saw was rendered seconds or minutes ago, and the
  -- notice window may have closed since.
  if not exists (
    select 1 from cs_mentor_slots(p_org, p_mentor, (p_starts_at at time zone 'UTC')::date - 1,
                                                    (p_starts_at at time zone 'UTC')::date + 1) s
     where s.slot_start = p_starts_at
  ) then
    raise exception 'That time is no longer available';
  end if;

  insert into cs_bookings (organization_id, mentor_id, user_id, starts_at, ends_at, booked_tz, agenda)
  values (p_org, p_mentor, v_uid, p_starts_at, p_starts_at + make_interval(mins => v_len), coalesce(p_tz, 'UTC'), coalesce(p_agenda, ''))
  returning id into v_id;

  return v_id;
exception
  -- The exclusion constraint fired: someone else took it between the check and
  -- the insert. This is the race the constraint exists to convert into a
  -- message rather than a double booking.
  when exclusion_violation then
    raise exception 'That time was just taken — pick another';
end $$;

grant execute on function public.cs_book_slot(uuid, text, timestamptz, text, text) to authenticated;

create or replace function public.cs_cancel_booking(p_org uuid, p_id uuid, p_reason text default '')
returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in first'; end if;
  update cs_bookings b
     set status = 'cancelled', cancelled_at = now(), cancelled_by = v_uid,
         cancel_reason = coalesce(p_reason, '')
   where b.organization_id = p_org and b.id = p_id
     and b.status = 'confirmed'
     and (b.user_id = v_uid
          or exists (select 1 from cs_mentors m
                      where m.organization_id = b.organization_id
                        and m.id = b.mentor_id and m.user_id = v_uid));
  if not found then raise exception 'That booking is not yours, or is already cancelled'; end if;
end $$;

grant execute on function public.cs_cancel_booking(uuid, uuid, text) to authenticated;

-- Rescheduling is a cancel plus a new booking, linked — never an UPDATE of
-- starts_at. That keeps the audit trail, and it frees the old slot through the
-- same partial predicate the constraint uses, rather than needing a special case.
create or replace function public.cs_reschedule_booking(
  p_org uuid, p_id uuid, p_starts_at timestamptz
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_old record;
  v_new uuid;
begin
  if v_uid is null then raise exception 'Sign in first'; end if;

  select * into v_old from cs_bookings
   where organization_id = p_org and id = p_id and status = 'confirmed' and user_id = v_uid;
  if not found then raise exception 'That booking is not yours, or is already cancelled'; end if;

  perform cs_cancel_booking(p_org, p_id, 'rescheduled');
  v_new := cs_book_slot(p_org, v_old.mentor_id, p_starts_at, v_old.booked_tz, v_old.agenda);
  update cs_bookings set rescheduled_from = p_id where organization_id = p_org and id = v_new;
  return v_new;
end $$;

grant execute on function public.cs_reschedule_booking(uuid, uuid, timestamptz) to authenticated;

-- --- realtime ---------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime' and tablename = 'cs_bookings') then
    alter publication supabase_realtime add table public.cs_bookings;
  end if;
  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime' and tablename = 'cs_booking_actions') then
    alter publication supabase_realtime add table public.cs_booking_actions;
  end if;
end $$;
