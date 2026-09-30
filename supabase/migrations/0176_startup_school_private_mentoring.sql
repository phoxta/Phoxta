begin;
alter table public.cs_live_lessons add column if not exists booking_id uuid;
create unique index if not exists cs_one_room_per_booking on public.cs_live_lessons(organization_id,booking_id) where booking_id is not null;
create or replace function public.cs_is_live_host(p_org uuid,p_lesson text,p_uid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from cs_live_lessons l where l.organization_id=p_org and l.id=p_lesson and l.cancelled_at is null and
 case when l.booking_id is not null then exists(select 1 from cs_bookings b join cs_mentors m on m.organization_id=b.organization_id and m.id=b.mentor_id
 where b.organization_id=p_org and b.id=l.booking_id and b.status='confirmed' and m.user_id=p_uid
 and (cs_staff_can(p_org,'mentoring','learner',b.user_id::text,p_uid) or exists(select 1 from cs_cohort_members c where c.organization_id=p_org and c.user_id=b.user_id and c.status='active' and cs_staff_can(p_org,'mentoring','cohort',c.cohort_id::text,p_uid))))
 else (cs_staff_can(p_org,'teaching','class',l.id,p_uid) or cs_staff_can(p_org,'teaching','cohort',l.cohort_id::text,p_uid)) end);
$$;
create or replace function public.cs_live_access(p_org uuid,p_lesson text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from cs_live_lessons l where l.organization_id=p_org and l.id=p_lesson and l.cancelled_at is null and
 (cs_is_live_host(p_org,p_lesson,auth.uid()) or (cs_has_access(p_org,'cohort') and
 case when l.booking_id is not null then exists(select 1 from cs_bookings b where b.organization_id=p_org and b.id=l.booking_id and b.user_id=auth.uid() and b.status in ('confirmed','completed'))
 else (l.cohort_id is null or cs_member_of_cohort(p_org,l.cohort_id)) end)));
$$;
create or replace function public.cs_mentoring_room(p_org uuid,p_booking uuid) returns text language plpgsql security definer set search_path=public as $$
declare b cs_bookings%rowtype;v_id text;v_category text; begin
 select * into b from cs_bookings where organization_id=p_org and id=p_booking for update;
 if not found or b.status<>'confirmed' then raise exception 'This mentoring appointment is not confirmed.'; end if;
 if not ((b.user_id=auth.uid() and cs_has_access(p_org,'cohort')) or cs_mentor_access(p_org,b.mentor_id,b.user_id)) then raise exception 'This private session is not assigned to you.'; end if;
 select id into v_id from cs_live_lessons where organization_id=p_org and booking_id=p_booking;
 if v_id is not null then return v_id; end if;
 select category_id into v_category from cs_courses where organization_id=p_org and mentor_id=b.mentor_id order by id limit 1;
 if v_category is null then select id into v_category from cs_categories where organization_id=p_org order by sort limit 1; end if;
 v_id:='mentoring-'||p_booking::text;
 insert into cs_live_lessons(organization_id,id,mentor_id,category_id,title,description,starts_at,duration_min,room_id,booking_id)
 values(p_org,v_id,b.mentor_id,v_category,'Private mentoring session','A private session for the assigned founder and mentor.',b.starts_at,greatest(15,extract(epoch from (b.ends_at-b.starts_at))/60)::integer,'cs-'||replace(p_org::text,'-','')||'-'||v_id,b.id);
 update cs_bookings set room_id=v_id where organization_id=p_org and id=b.id;
 return v_id;
end $$;
revoke all on function public.cs_mentoring_room(uuid,uuid) from public,anon;
grant execute on function public.cs_mentoring_room(uuid,uuid) to authenticated;
commit;
