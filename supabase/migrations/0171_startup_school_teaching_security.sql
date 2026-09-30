begin;
create or replace function public.cs_is_live_host(p_org uuid,p_lesson text,p_uid uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from cs_live_lessons l where l.organization_id=p_org and l.id=p_lesson and l.cancelled_at is null and
 (cs_staff_can(p_org,'teaching','class',l.id,p_uid) or cs_staff_can(p_org,'teaching','cohort',l.cohort_id::text,p_uid)));
$$;
create or replace function public.cs_live_access(p_org uuid,p_lesson text) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from cs_live_lessons l where l.organization_id=p_org and l.id=p_lesson and l.cancelled_at is null and
 (cs_is_live_host(p_org,p_lesson,auth.uid()) or (cs_has_access(p_org,'cohort') and (l.cohort_id is null or cs_member_of_cohort(p_org,l.cohort_id)))));
$$;
create or replace function public.cs_mentor_access(p_org uuid,p_mentor text,p_learner uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from cs_mentors m where m.organization_id=p_org and m.id=p_mentor and m.user_id=auth.uid()
 and (cs_staff_can(p_org,'mentoring','learner',p_learner::text) or exists(select 1 from cs_cohort_members c where c.organization_id=p_org and c.user_id=p_learner and c.status='active' and cs_staff_can(p_org,'mentoring','cohort',c.cohort_id::text))));
$$;
create or replace function public.cs_require_cohort_access() returns trigger language plpgsql security definer set search_path=public as $$
declare v_allowance integer; v_used integer;
begin
 -- Internal verified webhook writes are service-role; ordinary RPCs retain auth.uid().
 if auth.uid() is null and auth.role()='service_role' then return new; end if;
 if tg_table_name='cs_live_participants' then
   if not cs_live_access(new.organization_id,new.live_lesson_id) then raise exception 'This class is not part of your active access.'; end if;
 elsif tg_table_name='cs_bookings' then
   if new.user_id=auth.uid() then
     if not cs_has_access(new.organization_id,'cohort') then raise exception 'Cohort or Launch admission is required.'; end if;
     if tg_op='INSERT' then
       -- Serialise allowance checks per learner, not per slot.
       perform pg_advisory_xact_lock(hashtextextended(new.organization_id::text||new.user_id::text,0));
       select sum(c.mentor_sessions) into v_allowance from cs_cohort_members m join cs_cohorts c on c.id=m.cohort_id
       where m.organization_id=new.organization_id and m.user_id=new.user_id and m.status in ('active','completed');
       if v_allowance is null then raise exception 'Your mentor allowance needs an intake assignment. Contact programme support.'; end if;
       select count(*) into v_used from cs_bookings where organization_id=new.organization_id and user_id=new.user_id and status<>'cancelled';
       if v_used>=v_allowance then raise exception 'Your included mentoring sessions have been used. Contact programme support.'; end if;
     end if;
   elsif not cs_mentor_access(new.organization_id,new.mentor_id,new.user_id) then raise exception 'This booking is not assigned to you.'; end if;
 end if;
 return new;
end $$;
drop policy if exists cs_bookings_cohort_guard on public.cs_bookings;
-- The 0167 policy name is retained below only after removing its actual name.
drop policy if exists cs_bookings_requires_cohort on public.cs_bookings;
do $$ declare r record; begin
 for r in select policyname from pg_policies where schemaname='public' and tablename='cs_bookings' and permissive='RESTRICTIVE' loop
 execute format('drop policy %I on cs_bookings',r.policyname); end loop;
end $$;
create policy school_booking_guard on public.cs_bookings as restrictive for all to authenticated
using((user_id=auth.uid() and cs_has_access(organization_id,'cohort')) or cs_mentor_access(organization_id,mentor_id,user_id))
with check((user_id=auth.uid() and cs_has_access(organization_id,'cohort')) or cs_mentor_access(organization_id,mentor_id,user_id));
create policy school_private_notes_guard on public.cs_booking_notes as restrictive for all to authenticated
using(exists(select 1 from cs_bookings b where b.organization_id=cs_booking_notes.organization_id and b.id=booking_id and cs_mentor_access(b.organization_id,b.mentor_id,b.user_id)))
with check(exists(select 1 from cs_bookings b where b.organization_id=cs_booking_notes.organization_id and b.id=booking_id and cs_mentor_access(b.organization_id,b.mentor_id,b.user_id)));
create policy school_live_guard on public.cs_live_lessons as restrictive for select to authenticated using(cs_live_access(organization_id,id));
create policy school_live_staff on public.cs_live_lessons for select to authenticated using(cs_live_access(organization_id,id));
create policy school_participant_guard on public.cs_live_participants as restrictive for all to authenticated using(cs_live_access(organization_id,live_lesson_id)) with check(cs_live_access(organization_id,live_lesson_id));
create policy school_chat_guard on public.cs_live_chat as restrictive for all to authenticated using(cs_live_access(organization_id,live_lesson_id)) with check(cs_live_access(organization_id,live_lesson_id));
create policy school_blocks_staff on public.cs_lesson_blocks for select to authenticated using(exists(select 1 from cs_lessons l where l.organization_id=cs_lesson_blocks.organization_id and l.id=lesson_id and cs_can_read_course(l.organization_id,l.course_id)));
create policy school_blocks_guard on public.cs_lesson_blocks as restrictive for select to authenticated using(exists(select 1 from cs_lessons l where l.organization_id=cs_lesson_blocks.organization_id and l.id=lesson_id and cs_can_read_course(l.organization_id,l.course_id)));

create or replace function public.cs_cohort_signal(p_org uuid,p_days integer default 14)
returns table(lesson_id text,lesson_title text,course_title text,attempts bigint,avg_score numeric)
language sql stable security definer set search_path=public as $$
 select a.lesson_id,l.title,c.title,count(*),round(avg(a.score::numeric/nullif(a.total,0))*100,0)
 from cs_quiz_attempts a join cs_lessons l on l.organization_id=a.organization_id and l.id=a.lesson_id
 join cs_courses c on c.organization_id=a.organization_id and c.id=l.course_id
 where a.organization_id=p_org and a.created_at>now()-make_interval(days=>least(greatest(p_days,1),365))
 and (cs_staff_can(p_org,'reports','course',c.id) or exists(select 1 from cs_cohort_members m where m.organization_id=p_org and m.user_id=a.user_id and cs_staff_can(p_org,'reports','cohort',m.cohort_id::text)))
 group by a.lesson_id,l.title,c.title having count(*)>=2 order by avg(a.score::numeric/nullif(a.total,0)) limit 10;
$$;

create or replace function public.cs_teaching_command(p_org uuid,p_action text,p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id text; v_mentor text; v_host uuid; v_cohort uuid; v_start timestamptz; v_zone text; v_count integer; i integer; v_booking cs_bookings%rowtype;
begin
 if auth.uid() is null then raise exception 'Please sign in.'; end if;
 if p_action='schedule' then
   v_cohort:=nullif(p_data->>'cohort_id','')::uuid;
   perform cs_assert_staff(p_org,'teaching','cohort',coalesce(v_cohort::text,''));
   v_host:=(p_data->>'host_id')::uuid; v_zone:=coalesce(p_data->>'timezone','Europe/London');
   if not exists(select 1 from pg_timezone_names where name=v_zone) then raise exception 'Choose a valid timezone.'; end if;
   if not cs_staff_can(p_org,'teaching','cohort',coalesce(v_cohort::text,''),v_host) then raise exception 'Assign this lecturer to the intake before scheduling.'; end if;
   if (p_data->>'duration_min')::integer not between 15 and 240 then raise exception 'Class duration must be 15 to 240 minutes.'; end if;
   v_count:=least(greatest(coalesce((p_data->>'repeat_count')::integer,1),1),12);
   select id into v_mentor from cs_mentors where organization_id=p_org and user_id=v_host limit 1;
   if v_mentor is null then
     v_mentor:='staff-'||v_host::text;
     insert into cs_mentors(organization_id,id,name,role,user_id) select p_org,v_mentor,coalesce(raw_user_meta_data->>'full_name','Lecturer'),'Lecturer',v_host from auth.users where id=v_host on conflict do nothing;
   end if;
   for i in 0..v_count-1 loop
     v_start:=((p_data->>'local_start')::timestamp+make_interval(weeks=>i)) at time zone v_zone;
     if v_start<now() then raise exception 'Schedule classes in the future.'; end if;
     if exists(select 1 from cs_live_lessons l join cs_staff_assignments a on a.organization_id=l.organization_id and a.scope_type='class' and a.scope_id=l.id and a.user_id=v_host and a.active
       where l.organization_id=p_org and l.cancelled_at is null and tstzrange(l.starts_at,l.starts_at+make_interval(mins=>l.duration_min)) && tstzrange(v_start,v_start+make_interval(mins=>(p_data->>'duration_min')::integer))) then raise exception 'This lecturer already has a class at that time.'; end if;
     v_id:='class-'||gen_random_uuid()::text;
     insert into cs_live_lessons(organization_id,id,mentor_id,category_id,title,description,starts_at,duration_min,cohort_id,room_id)
     values(p_org,v_id,v_mentor,p_data->>'category_id',p_data->>'title',coalesce(p_data->>'description',''),v_start,(p_data->>'duration_min')::integer,v_cohort,'cs-'||replace(p_org::text,'-','')||'-'||v_id);
     insert into cs_staff_assignments(organization_id,user_id,role,scope_type,scope_id,created_by) values(p_org,v_host,'lecturer','class',v_id,auth.uid());
   end loop;
 elsif p_action in ('cancel_class','approve_replay') then
   v_id:=p_data->>'id';
   if not cs_is_live_host(p_org,v_id,auth.uid()) then raise exception 'This class is not assigned to you.'; end if;
   if p_action='cancel_class' then update cs_live_lessons set cancelled_at=now() where organization_id=p_org and id=v_id;
   else
     if not exists(select 1 from cs_live_lessons where organization_id=p_org and id=v_id and recording_url is not null) then raise exception 'Upload a recording before approving a replay.'; end if;
     update cs_live_lessons l set replay_status='approved',replay_expires_at=now()+make_interval(days=>coalesce((select recording_days from cs_cohorts c where c.id=l.cohort_id),90)) where l.organization_id=p_org and l.id=v_id;
   end if;
 elsif p_action='mentor_availability' then
   select id into v_mentor from cs_mentors where organization_id=p_org and user_id=auth.uid() limit 1;
   if v_mentor is null or not exists(select 1 from cs_staff_assignments where organization_id=p_org and user_id=auth.uid() and role='mentor' and active and (expires_at is null or expires_at>now())) then raise exception 'An active mentor assignment is required.'; end if;
   v_zone:=p_data->>'timezone';
   if not exists(select 1 from pg_timezone_names where name=v_zone) then raise exception 'Choose a valid timezone.'; end if;
   if (p_data->>'session_min')::integer not between 15 and 120 or (p_data->>'buffer_min')::integer not between 0 and 120 then raise exception 'Check session length and buffer.'; end if;
   update cs_mentors set timezone=v_zone,session_min=(p_data->>'session_min')::integer,buffer_min=(p_data->>'buffer_min')::integer,bookable=true where organization_id=p_org and id=v_mentor;
   insert into cs_availability(organization_id,id,mentor_id,weekday,start_time,end_time) values(p_org,gen_random_uuid()::text,v_mentor,(p_data->>'weekday')::smallint,(p_data->>'start_time')::time,(p_data->>'end_time')::time);
 elsif p_action='remove_availability' then
   delete from cs_availability a where a.organization_id=p_org and a.id=p_data->>'id' and exists(select 1 from cs_mentors m where m.organization_id=p_org and m.id=a.mentor_id and m.user_id=auth.uid());
 elsif p_action='mentor_notes' then
   select * into v_booking from cs_bookings where organization_id=p_org and id=(p_data->>'id')::uuid;
   if not found or not cs_mentor_access(p_org,v_booking.mentor_id,v_booking.user_id) then raise exception 'This booking is not assigned to you.'; end if;
   insert into cs_booking_notes(organization_id,booking_id,body) values(p_org,v_booking.id,coalesce(p_data->>'private_notes','')) on conflict(organization_id,booking_id) do update set body=excluded.body,updated_at=now();
   update cs_bookings set shared_notes=coalesce(p_data->>'shared_notes',''),status=coalesce(p_data->>'status',status) where organization_id=p_org and id=v_booking.id;
 else raise exception 'Unsupported teaching action.'; end if;
 perform cs_audit(p_org,p_action,coalesce(v_id,p_data->>'id',''));
 return jsonb_build_object('ok',true);
end $$;

-- Private storage. Old public recording links are converted to private markers
-- in the same transaction. Players resolve markers only after authorisation.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('cs-school-media','cs-school-media',false,2147483648,array['video/mp4','video/webm','audio/mpeg','audio/webm','application/pdf','text/vtt','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']) on conflict(id) do nothing;
update storage.buckets set public=false where id='cs-recordings';
drop policy if exists cs_recordings_read on storage.objects;
drop policy if exists cs_recordings_write on storage.objects;
update public.cs_live_lessons set recording_url='school-recording:'||split_part(recording_url,'/storage/v1/object/public/cs-recordings/',2),replay_status='approved'
 where recording_url like '%/storage/v1/object/public/cs-recordings/%';
create policy school_recording_read on storage.objects for select to authenticated using(bucket_id='cs-recordings' and exists(select 1 from cs_live_lessons l where l.organization_id::text=split_part(name,'/',1) and l.id=split_part(name,'/',2) and cs_live_access(l.organization_id,l.id) and (cs_is_live_host(l.organization_id,l.id,auth.uid()) or (l.replay_status='approved' and (l.replay_expires_at is null or l.replay_expires_at>now())))));
create policy school_recording_write on storage.objects for insert to authenticated with check(bucket_id='cs-recordings' and exists(select 1 from cs_live_lessons l where l.organization_id::text=split_part(name,'/',1) and l.id=split_part(name,'/',2) and cs_is_live_host(l.organization_id,l.id,auth.uid())));
create policy school_media_upload on storage.objects for insert to authenticated with check(bucket_id='cs-school-media' and exists(select 1 from cs_media_assets a where a.path=name and a.status='uploading' and a.created_by=auth.uid() and cs_staff_can(a.organization_id,'content','course',a.course_id)));
create policy school_media_download on storage.objects for select to authenticated using(bucket_id='cs-school-media' and exists(select 1 from cs_media_assets a where a.path=name and (cs_staff_can(a.organization_id,'content','course',a.course_id) or (a.status='ready' and cs_can_read_course(a.organization_id,a.course_id) and exists(select 1 from cs_lessons l where l.organization_id=a.organization_id and l.course_id=a.course_id and (l.video_url='school-media:'||a.path or l.captions_url='school-media:'||a.path or position('school-media:'||a.path in l.body)>0))))));

create or replace function public.cs_media_register(p_org uuid,p_course text,p_name text,p_mime text,p_bytes bigint,p_alt text default '') returns jsonb
language plpgsql security definer set search_path=public as $$
declare a cs_media_assets%rowtype; begin
 perform cs_assert_staff(p_org,'content','course',p_course);
 if p_mime not in ('video/mp4','video/webm','audio/mpeg','audio/webm','application/pdf','text/vtt','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') then raise exception 'Unsupported file type.'; end if;
 if p_mime like 'image/%' and length(trim(p_alt))<3 then raise exception 'Add an accessible description for this image.'; end if;
 insert into cs_media_assets(organization_id,course_id,path,name,mime_type,bytes,alt_text,created_by)
 values(p_org,p_course,p_org::text||'/'||p_course||'/'||gen_random_uuid()::text||'/'||regexp_replace(p_name,'[^a-zA-Z0-9._-]','-','g'),p_name,p_mime,p_bytes,p_alt,auth.uid()) returning * into a;
 return to_jsonb(a);
end $$;
create or replace function public.cs_media_complete(p_org uuid,p_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare a cs_media_assets%rowtype; begin
 select * into a from cs_media_assets where id=p_id and organization_id=p_org;
 if not found then raise exception 'Upload not found.'; end if;
 perform cs_assert_staff(p_org,'content','course',a.course_id);
 if not exists(select 1 from storage.objects where bucket_id='cs-school-media' and name=a.path and (metadata->>'size')::bigint=a.bytes) then raise exception 'The upload is not complete. Retry the upload.'; end if;
 update cs_media_assets set status='ready' where id=a.id;
end $$;
revoke all on function public.cs_live_access(uuid,text),public.cs_mentor_access(uuid,text,uuid),public.cs_teaching_command(uuid,text,jsonb),public.cs_media_register(uuid,text,text,text,bigint,text),public.cs_media_complete(uuid,uuid) from public,anon;
grant execute on function public.cs_live_access(uuid,text),public.cs_mentor_access(uuid,text,uuid),public.cs_teaching_command(uuid,text,jsonb),public.cs_media_register(uuid,text,text,text,bigint,text),public.cs_media_complete(uuid,uuid) to authenticated,service_role;
commit;
