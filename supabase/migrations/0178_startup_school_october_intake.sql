begin;
-- NULL explicitly means no enrolment cap. A positive limit remains available
-- for future intakes; do not represent unlimited as a made-up large number.
alter table public.cs_cohorts alter column capacity drop not null;
create or replace function public.cs_public_intakes(p_org uuid) returns jsonb
language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'starts_at',c.starts_at,'ends_at',c.ends_at,'timezone',c.timezone,
 'mentor_weekly_min',c.mentor_weekly_min,'mentor_weekly_max',c.mentor_weekly_max,'capacity',c.capacity,
 'seats_left',case when c.capacity is null then null else greatest(0,c.capacity
 -(select count(*) from cs_cohort_members m where m.cohort_id=c.id and m.status='active')
 -(select count(*) from cs_seat_holds h where h.cohort_id=c.id and h.status='held' and h.expires_at>now())) end)
 order by c.starts_at),'[]'::jsonb) from cs_cohorts c where c.organization_id=p_org and c.status='open' and c.starts_at>now();
$$;

insert into cs_cohorts(id,organization_id,name,starts_at,ends_at,timezone,capacity,mentor_sessions,status,release_mode,recording_days)
values('edda7ca0-7cbf-48af-a275-e1f37593cdc0','2a51e95e-258d-405d-920b-6271d893344f','October 2026 – January 2027',
 '2026-10-14 00:00:00 Europe/London'::timestamptz,'2027-01-31 23:59:59 Europe/London'::timestamptz,
 'Europe/London',null,48,'open','immediate',365)
on conflict(id) do nothing;
commit;
