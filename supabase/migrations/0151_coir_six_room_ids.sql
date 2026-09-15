-- ---------------------------------------------------------------------------
-- Coir Six — every live lesson gets a room id, forever
--
-- 0150 backfilled `room_id` on the rows that existed and added
-- `cs_seed_live_rooms(p_org)` to stamp a newly provisioned school's. Nothing
-- called it, so a school provisioned after 0150 would have had lessons with a
-- NULL room_id.
--
-- Nothing visibly broke — `coir-live` falls back to the same derived name, so
-- tokens still worked — which is exactly what makes it worth fixing: the column
-- would have quietly disagreed with the room the media server was actually
-- using, and the next feature to read `room_id` straight from the table would
-- have been the one to find out.
--
-- A BEFORE INSERT trigger instead of calling the helper from `cs_seed_org`:
-- the name depends on two columns, so a plain DEFAULT cannot express it, and a
-- trigger covers every insert path — the provisioning trigger, the backfill, a
-- school adding a lesson by hand later — rather than only the one seeder that
-- exists today.
-- ---------------------------------------------------------------------------

create or replace function public.cs_live_lesson_room() returns trigger
language plpgsql as $$
begin
  if new.room_id is null or new.room_id = '' then
    -- Derived, not random: the same lesson is the same room across redeploys,
    -- and the tenant prefix keeps two schools' "live-2" apart on the server.
    new.room_id := 'cs-' || replace(new.organization_id::text, '-', '') || '-' || new.id;
  end if;
  return new;
end $$;

drop trigger if exists cs_live_lessons_room_id on public.cs_live_lessons;
create trigger cs_live_lessons_room_id
  before insert on public.cs_live_lessons
  for each row execute function public.cs_live_lesson_room();

-- Anything that slipped through between 0150 and this.
update public.cs_live_lessons
   set room_id = 'cs-' || replace(organization_id::text, '-', '') || '-' || id
 where room_id is null or room_id = '';

-- `cs_seed_live_rooms` is now redundant, but a provisioning path may already
-- call it. Keep it: it is idempotent and costs nothing.
