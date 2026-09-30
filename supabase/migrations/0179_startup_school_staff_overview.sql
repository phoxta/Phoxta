begin;
create or replace function public.cs_staff_overview(p_org uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare result jsonb; classes jsonb; appointments jsonb; coverage jsonb;
begin
 if not cs_is_staff(p_org) then raise exception 'Current staff access is required.'; end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into classes from (
   select id,title,starts_at from cs_live_lessons where organization_id=p_org and booking_id is null
   and starts_at>now()-interval '2 hours' and cancelled_at is null and cs_is_live_host(p_org,id,auth.uid())
   order by starts_at limit 5
 ) x;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into appointments from (
   select b.id,b.starts_at,coalesce(p.name,'Your mentee') as name from cs_bookings b
   left join cs_profiles p on p.organization_id=b.organization_id and p.user_id=b.user_id
   where b.organization_id=p_org and b.status='confirmed' and b.starts_at>now()-interval '2 hours'
   and cs_mentor_access(p_org,b.mentor_id,b.user_id) order by b.starts_at limit 5
 ) x;
 result:=jsonb_build_object('classes',classes,'appointments',appointments);
 if cs_staff_can(p_org,'publish') then
   result:=result||jsonb_build_object('content_reviews',(select count(*) from cs_content_revisions where organization_id=p_org and state='in_review'));
 end if;
 if cs_staff_can(p_org,'invite') then
   result:=result||jsonb_build_object('pending_invites',(select count(*) from cs_staff_invites where organization_id=p_org and accepted_at is null and revoked_at is null and expires_at>now()));
 end if;
 if cs_staff_can(p_org,'support') then
   result:=result||jsonb_build_object('support_requests',(select count(*) from cs_support_tickets where organization_id=p_org and status<>'resolved'));
 end if;
 if cs_staff_can(p_org,'launch') then
   result:=result||jsonb_build_object('launch_handovers',(select count(*) from cs_launch_allocations where organization_id=p_org and status not in ('launched','on_hold')));
 end if;
 if cs_staff_can(p_org,'operations') then
   select coalesce(jsonb_agg(to_jsonb(x)),'[]') into coverage from (
     select c.id,c.name,c.starts_at,c.ends_at,
     (select count(*) from cs_cohort_members m where m.cohort_id=c.id and m.status='active') as learners,
     (select count(distinct a.user_id) from cs_staff_assignments a where a.organization_id=p_org and a.role='mentor' and a.active
       and (a.expires_at is null or a.expires_at>now()) and (a.scope_type='school' or (a.scope_type='cohort' and a.scope_id=c.id::text))) as assigned_mentors,
     (select count(*) from cs_cohort_members m where m.cohort_id=c.id and m.status='active'
       and not exists(select 1 from cs_bookings b where b.organization_id=p_org and b.user_id=m.user_id and b.status<>'cancelled'
       and b.starts_at>=date_trunc('week',now() at time zone c.timezone) at time zone c.timezone
       and b.starts_at<(date_trunc('week',now() at time zone c.timezone)+interval '1 week') at time zone c.timezone)) as without_weekly_booking
     from cs_cohorts c where c.organization_id=p_org and c.status in ('open','closed') and c.ends_at>now() order by c.starts_at
   ) x;
   result:=result||jsonb_build_object('mentor_coverage',coverage);
 end if;
 return result;
end $$;
revoke all on function public.cs_staff_overview(uuid) from public,anon;
grant execute on function public.cs_staff_overview(uuid) to authenticated;
commit;
