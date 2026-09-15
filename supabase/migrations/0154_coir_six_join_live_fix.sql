-- ---------------------------------------------------------------------------
-- Coir Six — cs_join_live: "column reference status is ambiguous"
--
-- 0150 declared the function as
--     returns table (room_id text, is_host boolean, status text)
-- which makes `status` a PL/pgSQL OUT variable. The host branch then does
--     update cs_live_lessons set status = 'live' ... and status <> 'ended'
-- and that last `status` could mean the variable or the column, so Postgres
-- refuses with 42702 at runtime.
--
-- IT ONLY EVER FAILED FOR A HOST. The update sits behind `if v_host`, so a
-- learner joining never reached it — which is exactly why every test passed:
-- they were all run as a learner. A mentor opening their own class got a 400
-- and sat in the lobby with no room.
--
-- Fixed by aliasing the table and qualifying every column reference, rather
-- than renaming the OUT columns: `is_host` and `room_id` are the contract
-- SupabaseRepo already reads.
-- ---------------------------------------------------------------------------

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

  select pr.name, pr.hue, pr.photo_url into v_p
    from cs_profiles pr
   where pr.organization_id = p_org and pr.user_id = v_uid;

  insert into cs_live_participants (organization_id, live_lesson_id, user_id, name, hue, photo_url, role)
  values (p_org, p_lesson, v_uid, coalesce(v_p.name, ''), coalesce(v_p.hue, 'lilac'), v_p.photo_url,
          case when v_host then 'host' else 'learner' end)
  on conflict (organization_id, live_lesson_id, user_id) do update
    set left_at   = null,
        joined_at = now(),
        name      = excluded.name,
        hue       = excluded.hue,
        photo_url = excluded.photo_url,
        role      = excluded.role;

  -- The host arriving is what starts the class. Every column qualified with the
  -- alias, so none of them can be read as the OUT variable of the same name.
  if v_host then
    update cs_live_lessons l
       set status = 'live', started_at = coalesce(l.started_at, now())
     where l.organization_id = p_org and l.id = p_lesson and l.status <> 'ended';
  end if;

  return query
    select l.room_id, v_host, l.status
      from cs_live_lessons l
     where l.organization_id = p_org and l.id = p_lesson;
end $$;
grant execute on function public.cs_join_live(uuid, text) to authenticated;
