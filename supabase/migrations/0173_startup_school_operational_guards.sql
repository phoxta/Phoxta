begin;
create or replace function public.cs_staff_profile(p_org uuid,p_name text,p_headline text) returns void language plpgsql security definer set search_path=public as $$
begin
 if not cs_is_staff(p_org) then raise exception 'Staff assignment required.'; end if;
 if length(trim(p_name))<2 then raise exception 'Enter your display name.'; end if;
 insert into cs_profiles(organization_id,user_id,name,headline) values(p_org,auth.uid(),trim(p_name),p_headline)
 on conflict(organization_id,user_id) do update set name=excluded.name,headline=excluded.headline;
 insert into cs_mentors(organization_id,id,name,role,user_id,timezone) values(p_org,'staff-'||auth.uid()::text,trim(p_name),p_headline,auth.uid(),'Europe/London')
 on conflict(organization_id,id) do update set name=excluded.name,role=excluded.role,user_id=excluded.user_id;
end $$;
create or replace function public.cs_sensitive_access(p_org uuid,p_permission text) returns boolean language sql stable security definer set search_path=public as $$
 select coalesce(auth.jwt()->>'aal','')='aal2' and cs_staff_can(p_org,p_permission);
$$;
create or replace function public.cs_set_recording(p_org uuid,p_lesson text,p_url text) returns void language plpgsql security definer set search_path=public as $$
begin
 if not cs_is_live_host(p_org,p_lesson,auth.uid()) then raise exception 'Current teaching assignment required.'; end if;
 if p_url not like 'school-recording:'||p_org::text||'/'||p_lesson||'/%' or not exists(select 1 from storage.objects where bucket_id='cs-recordings' and name=substring(p_url from length('school-recording:')+1)) then raise exception 'Upload the recording to this class private folder first.'; end if;
 update cs_live_lessons set recording_url=p_url,replay_status='pending',replay_expires_at=null where organization_id=p_org and id=p_lesson;
 perform cs_audit(p_org,'recording.submitted',p_lesson);
end $$;

-- Keep the existing rich mentor context, but put a fresh, scoped check in front
-- of it. The old entry point is private and cannot be called through PostgREST.
alter function public.cs_session_context(uuid,uuid) rename to cs_session_context_internal;
revoke all on function public.cs_session_context_internal(uuid,uuid) from public,anon,authenticated;
create function public.cs_session_context(p_org uuid,p_booking uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare b cs_bookings%rowtype; begin
 select * into b from cs_bookings where organization_id=p_org and id=p_booking;
 if not found or not ((b.user_id=auth.uid() and cs_has_access(p_org,'cohort')) or cs_mentor_access(p_org,b.mentor_id,b.user_id)) then raise exception 'This session is not assigned to you.'; end if;
 return cs_session_context_internal(p_org,p_booking);
end $$;
create or replace function public.cs_mentor_desk(p_org uuid)
returns table(id uuid,mentor_id text,user_id uuid,starts_at timestamptz,ends_at timestamptz,booked_tz text,status text,agenda text,shared_notes text,room_id text,rescheduled_from uuid,cancel_reason text,created_at timestamptz,brief_at timestamptz,founder_name text,founder_hue text,founder_photo_url text,founder_one_liner text)
language sql stable security definer set search_path=public as $$
 select b.id,b.mentor_id,b.user_id,b.starts_at,b.ends_at,b.booked_tz,b.status,b.agenda,b.shared_notes,b.room_id,b.rescheduled_from,b.cancel_reason,b.created_at,b.brief_at,
 coalesce(p.name,'A founder'),coalesce(p.hue,'peach'),p.photo_url,coalesce(v.one_liner,'') from cs_bookings b
 left join cs_profiles p on p.organization_id=b.organization_id and p.user_id=b.user_id
 left join cs_ventures v on v.organization_id=b.organization_id and v.user_id=b.user_id
 where b.organization_id=p_org and cs_mentor_access(p_org,b.mentor_id,b.user_id) order by b.starts_at desc limit 200;
$$;
create or replace function public.cs_my_mentor(p_org uuid)
returns table(id text,name text,role text,hue text,photo_url text,session_min integer,timezone text)
language sql stable security definer set search_path=public as $$
 select m.id,m.name,m.role,m.hue,m.photo_url,m.session_min,m.timezone from cs_mentors m where m.organization_id=p_org and m.user_id=auth.uid()
 and exists(select 1 from cs_staff_assignments a where a.organization_id=p_org and a.user_id=auth.uid() and a.role='mentor' and a.active and (a.expires_at is null or a.expires_at>now())) limit 1;
$$;

-- Expose only the mentor's own availability to unpaid staff; enrolled learners
-- may view published slots, not create or update them directly.
create policy school_availability_guard on public.cs_availability as restrictive for select to authenticated
using(cs_has_access(organization_id,'cohort') or exists(select 1 from cs_mentors m where m.organization_id=cs_availability.organization_id and m.id=mentor_id and m.user_id=auth.uid() and cs_is_staff(m.organization_id)));
revoke update on public.cs_bookings from authenticated;

create or replace function public.cs_issue_certificate(p_org uuid,p_course text)
returns table(id uuid,code text,issued_at timestamptz) language plpgsql security definer set search_path=public,extensions as $$
declare v_total integer; v_done integer; v_code text;
begin
 if not cs_has_access(p_org) or not cs_can_read_course(p_org,p_course) then raise exception 'Active learner access is required.'; end if;
 select count(*) into v_total from cs_lessons where organization_id=p_org and course_id=p_course;
 select count(*) into v_done from cs_lesson_progress p join cs_lessons l on l.organization_id=p.organization_id and l.id=p.lesson_id where p.organization_id=p_org and p.user_id=auth.uid() and l.course_id=p_course and p.completed_at is not null;
 if v_total=0 or v_done<v_total then raise exception 'Complete every lesson before requesting your certificate.'; end if;
 if exists(select 1 from cs_lessons l where l.organization_id=p_org and l.course_id=p_course and l.kind='quiz' and not exists(select 1 from cs_quiz_attempts a where a.organization_id=p_org and a.user_id=auth.uid() and a.lesson_id=l.id and a.total>0 and a.score::numeric/a.total>=0.7)) then raise exception 'Pass each course quiz with at least 70 percent.'; end if;
 if exists(select 1 from cs_assignments a where a.organization_id=p_org and a.course_id=p_course and a.published and (a.cohort_id is null or cs_member_of_cohort(p_org,a.cohort_id)) and not exists(select 1 from cs_submissions s where s.assignment_id=a.id and s.user_id=auth.uid() and s.outcome='passed')) then raise exception 'Your practical assignments need a confirmed pass from your lecturer.'; end if;
 v_code:='PHX-'||upper(substr(encode(gen_random_bytes(8),'hex'),1,12));
 insert into cs_certificates(organization_id,user_id,course_id,code) values(p_org,auth.uid(),p_course,v_code) on conflict(organization_id,user_id,course_id) do nothing;
 return query select c.id,c.code,c.issued_at from cs_certificates c where c.organization_id=p_org and c.user_id=auth.uid() and c.course_id=p_course;
end $$;

-- Only assigned staff can see the class transcript, or a learner of that class.
create policy school_transcript_guard on public.cs_live_transcript as restrictive for all to authenticated using(cs_live_access(organization_id,live_lesson_id)) with check(cs_live_access(organization_id,live_lesson_id));
create policy school_booking_transcript_guard on public.cs_booking_transcript as restrictive for all to authenticated
using(exists(select 1 from cs_bookings b where b.organization_id=cs_booking_transcript.organization_id and b.id=booking_id and ((b.user_id=auth.uid() and cs_has_access(b.organization_id,'cohort')) or cs_mentor_access(b.organization_id,b.mentor_id,b.user_id))))
with check(exists(select 1 from cs_bookings b where b.organization_id=cs_booking_transcript.organization_id and b.id=booking_id and cs_mentor_access(b.organization_id,b.mentor_id,b.user_id)));

create table public.cs_class_reminders(organization_id uuid not null,class_id text not null,user_id uuid not null,primary key(organization_id,class_id,user_id));
alter table public.cs_class_reminders enable row level security;
revoke all on public.cs_class_reminders from anon,authenticated;
create or replace function public.cs_send_class_reminders() returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer; begin
 with candidates as (
   select l.organization_id,l.id,m.user_id from cs_live_lessons l join cs_cohort_members m on m.organization_id=l.organization_id and m.cohort_id=l.cohort_id and m.status='active'
   where l.cancelled_at is null and l.starts_at between now() and now()+interval '30 minutes'
 ), added as(insert into cs_class_reminders select * from candidates on conflict do nothing returning *)
 insert into cs_notifications(organization_id,user_id,kind,title,body,href)
 select a.organization_id,a.user_id,'live','Your class starts soon',l.title,'/room/'||l.id from added a join cs_live_lessons l on l.organization_id=a.organization_id and l.id=a.class_id;
 get diagnostics v_count=row_count; return v_count;
end $$;
revoke all on function public.cs_send_class_reminders() from public,anon,authenticated;
grant execute on function public.cs_send_class_reminders() to service_role;
do $$ begin if exists(select 1 from pg_extension where extname='pg_cron') then
 perform cron.schedule('startup-school-class-reminders','*/5 * * * *','select public.cs_send_class_reminders()'); end if; end $$;

revoke all on function public.cs_staff_profile(uuid,text,text),public.cs_sensitive_access(uuid,text),public.cs_session_context(uuid,uuid) from public,anon;
grant execute on function public.cs_staff_profile(uuid,text,text),public.cs_sensitive_access(uuid,text),public.cs_session_context(uuid,uuid) to authenticated;
-- Server-only seed/provision helpers must never be available to learners.
revoke execute on function public.cs_seed_live_rooms(uuid) from public,anon,authenticated;
commit;
