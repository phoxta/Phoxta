-- ---------------------------------------------------------------------------
-- Coir Six — a school always has a class you can walk into
--
-- The seeded timetable is pinned to clock hours on fixed days, so whether the
-- live classroom is reachable at all depends on what time you happen to look.
-- A buyer opening their new school on a Tuesday morning sees a schedule and no
-- way in, and reasonably concludes the headline feature is missing. (That is
-- exactly what happened to us.)
--
-- So one seeded session is always in progress: `live-2`, which is also the one
-- the demo learner has already reserved — the best version of the story is the
-- seat you booked being open right now.
--
-- This re-dates the STARTER content only. A school that has edited its
-- timetable has a real schedule, and re-dating that would be vandalism; the
-- guard is the seeded `meet.example.com` join_url, which any real session would
-- have replaced.
-- ---------------------------------------------------------------------------

create or replace function public.cs_refresh_live_schedule(p_org uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_changed integer;
begin
  update cs_live_lessons l
     set starts_at = case l.id
           -- In progress: started five minutes ago, so the room is already
           -- under way rather than sitting empty waiting for you.
           when 'live-2' then now() - interval '5 minutes'
           when 'live-3' then date_trunc('day', now()) + interval '2 days' + interval '13 hours'
           when 'live-4' then date_trunc('day', now()) + interval '5 days' + interval '17 hours'
           when 'live-5' then date_trunc('day', now()) + interval '8 days' + interval '12 hours'
           when 'live-1' then date_trunc('day', now()) - interval '18 days' + interval '16 hours'
           when 'live-6' then date_trunc('day', now()) - interval '5 days' + interval '15 hours'
           else l.starts_at
         end
   where l.organization_id = p_org
     and l.id in ('live-1','live-2','live-3','live-4','live-5','live-6')
     -- Untouched starter content only.
     and l.join_url like 'https://meet.example.com/coir-six/%'
     and coalesce(l.status, 'scheduled') <> 'live';
  get diagnostics v_changed = row_count;
  return v_changed;
end $$;
grant execute on function public.cs_refresh_live_schedule(uuid) to authenticated, service_role;

-- A school provisioned from this blueprint gets it straight away. Same body as
-- 0147's trigger plus the refresh, so a new owner's first look has a class on.
create or replace function public.cs_seed_on_provision() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.blueprint_id is not null
     and exists (select 1 from blueprints b where b.id = new.blueprint_id and b.slug = 'coir-six') then
    perform cs_seed_org(new.id);
    perform cs_seed_live_rooms(new.id);   -- 0150: stamp room ids (belt and braces; 0151's trigger also does)
    perform cs_refresh_live_schedule(new.id);
  end if;
  return new;
end $$;

-- And every school that already exists, once, now.
do $$
declare r record; n integer; total integer := 0;
begin
  for r in
    select distinct organization_id from cs_live_lessons
     where join_url like 'https://meet.example.com/coir-six/%'
  loop
    n := cs_refresh_live_schedule(r.organization_id);
    total := total + n;
  end loop;
  raise notice '[coir-six] live schedule refreshed: % rows', total;
end $$;
