-- School identity is independent of paid learner access and Phoxta business roles.
begin;

create table if not exists public.cs_staff_assignments (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 user_id uuid not null references auth.users(id), role text not null check(role in ('owner','school_admin','programme_manager','lecturer','mentor','content_editor','support','finance','launch_coordinator')),
 scope_type text not null default 'school' check(scope_type in ('school','course','cohort','class','learner')),
 scope_id text not null default '', active boolean not null default true, expires_at timestamptz,
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 check ((scope_type='school' and scope_id='') or (scope_type<>'school' and length(scope_id)>0)),
 check (role not in ('owner','school_admin','programme_manager','support','finance','launch_coordinator') or scope_type='school'),
 unique(organization_id,user_id,role,scope_type,scope_id)
);
create table if not exists public.cs_staff_invites (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 email text not null, role text not null, scope_type text not null, scope_id text not null default '',
 token_hash text not null unique, expires_at timestamptz not null default now()+interval '7 days',
 assignment_expires_at timestamptz, created_by uuid not null references auth.users(id),
 accepted_at timestamptz, revoked_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.cs_school_settings (
 organization_id uuid primary key references public.organizations(id), timezone text not null default 'Europe/London',
 cancellation_policy text not null default '', access_policy text not null default '',
 completion_policy text not null default '', launch_terms text not null default '',
 updated_at timestamptz not null default now()
);
create table if not exists public.cs_cohorts (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 name text not null, starts_at timestamptz not null, ends_at timestamptz not null,
 timezone text not null default 'Europe/London', capacity integer not null check(capacity between 1 and 10000),
 mentor_sessions integer not null check(mentor_sessions between 0 and 100),
 status text not null default 'draft' check(status in ('draft','open','closed','completed')),
 release_mode text not null default 'immediate' check(release_mode in ('immediate','scheduled')),
 recording_days integer not null default 90 check(recording_days between 0 and 3650),
 created_at timestamptz not null default now(), check(ends_at>starts_at), unique(organization_id,id)
);
create table if not exists public.cs_cohort_members (
 organization_id uuid not null, cohort_id uuid not null, user_id uuid not null references auth.users(id),
 status text not null default 'active' check(status in ('active','transferred','cancelled','completed')),
 joined_at timestamptz not null default now(), primary key(organization_id,cohort_id,user_id),
 foreign key(organization_id,cohort_id) references public.cs_cohorts(organization_id,id)
);
create table if not exists public.cs_seat_holds (
 order_id uuid primary key references public.cs_plan_orders(id), organization_id uuid not null,
 cohort_id uuid not null, user_id uuid not null references auth.users(id),
 expires_at timestamptz not null, status text not null default 'held' check(status in ('held','confirmed','released')),
 foreign key(organization_id,cohort_id) references public.cs_cohorts(organization_id,id)
);
create table if not exists public.cs_waitlist (
 organization_id uuid not null, cohort_id uuid not null, user_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(), primary key(organization_id,cohort_id,user_id),
 foreign key(organization_id,cohort_id) references public.cs_cohorts(organization_id,id)
);
create table if not exists public.cs_announcements (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, cohort_id uuid not null,
 title text not null, body text not null, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 foreign key(organization_id,cohort_id) references public.cs_cohorts(organization_id,id)
);
create table if not exists public.cs_course_releases (
 organization_id uuid not null, cohort_id uuid not null, course_id text not null, unlock_at timestamptz not null,
 primary key(organization_id,cohort_id,course_id),
 foreign key(organization_id,cohort_id) references public.cs_cohorts(organization_id,id),
 foreign key(organization_id,course_id) references public.cs_courses(organization_id,id)
);
create table if not exists public.cs_content_revisions (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, course_id text not null,
 document jsonb not null, state text not null default 'draft' check(state in ('draft','in_review','published','archived')),
 version integer not null default 1, review_notes text not null default '',
 created_by uuid not null references auth.users(id), reviewed_by uuid references auth.users(id),
 updated_at timestamptz not null default now(), published_at timestamptz,
 foreign key(organization_id,course_id) references public.cs_courses(organization_id,id)
);
create unique index if not exists cs_one_open_revision on public.cs_content_revisions(organization_id,course_id) where state in ('draft','in_review');
create table if not exists public.cs_revision_history (
 id bigint generated always as identity primary key, revision_id uuid not null references public.cs_content_revisions(id),
 organization_id uuid not null, version integer not null, document jsonb not null, actor_id uuid not null,
 created_at timestamptz not null default now()
);
create table if not exists public.cs_media_assets (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, course_id text not null,
 path text not null unique, name text not null, mime_type text not null, bytes bigint not null check(bytes between 1 and 2147483648),
 alt_text text not null default '', status text not null default 'uploading' check(status in ('uploading','ready','failed')),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 foreign key(organization_id,course_id) references public.cs_courses(organization_id,id)
);
create table if not exists public.cs_assignments (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, course_id text not null, cohort_id uuid,
 title text not null, brief text not null, rubric text not null, due_at timestamptz,
 published boolean not null default false, created_by uuid not null references auth.users(id),
 foreign key(organization_id,course_id) references public.cs_courses(organization_id,id),
 foreign key(organization_id,cohort_id) references public.cs_cohorts(organization_id,id), unique(organization_id,id)
);
create table if not exists public.cs_submissions (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, assignment_id uuid not null,
 user_id uuid not null references auth.users(id), body text not null, submitted_at timestamptz not null default now(),
 feedback text not null default '', outcome text not null default 'submitted' check(outcome in ('submitted','changes_requested','passed')),
 reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
 foreign key(organization_id,assignment_id) references public.cs_assignments(organization_id,id), unique(organization_id,assignment_id,user_id)
);
create table if not exists public.cs_support_tickets (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 user_id uuid not null references auth.users(id), subject text not null, body text not null,
 status text not null default 'open' check(status in ('open','in_progress','resolved')),
 reply text not null default '', updated_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table if not exists public.cs_launch_catalogue (
 organization_id uuid not null references public.organizations(id), blueprint_id uuid not null references public.blueprints(id),
 included_assets text not null, ongoing_costs text not null, enabled boolean not null default false,
 primary key(organization_id,blueprint_id)
);
create table if not exists public.cs_launch_allocations (
 organization_id uuid not null references public.organizations(id), user_id uuid not null references auth.users(id),
 blueprint_id uuid, status text not null default 'eligible' check(status in ('eligible','selection','reserved','provisioning','handover','launched','on_hold')),
 ownership_accepted_at timestamptz, provisioned_org_id uuid references public.organizations(id), purchase_id uuid references public.purchases(id),
 checklist jsonb not null default '{"credentials":false,"training":false,"domain":false,"operations":false}',
 shared_materials text not null default '', investor_consent_at timestamptz,
 investor_status text not null default 'not_requested' check(investor_status in ('not_requested','requested','reviewing','ready','introduced')),
 updated_at timestamptz not null default now(), primary key(organization_id,user_id),
 foreign key(organization_id,blueprint_id) references public.cs_launch_catalogue(organization_id,blueprint_id)
);
create table if not exists public.cs_staff_audit (
 id bigint generated always as identity primary key, organization_id uuid not null references public.organizations(id),
 actor_id uuid, action text not null, target text not null, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
alter table public.cs_live_lessons add column if not exists cohort_id uuid;
alter table public.cs_live_lessons add column if not exists replay_status text not null default 'pending';
alter table public.cs_live_lessons add column if not exists replay_expires_at timestamptz;
alter table public.cs_live_lessons add column if not exists cancelled_at timestamptz;

-- A school owner is bootstrapped ONLY from the existing verified org owner,
-- only for this school's explicitly configured domain. Not public registrants.
insert into public.cs_staff_assignments(organization_id,user_id,role)
 select distinct d.organization_id,m.user_id,'owner' from public.domains d
 join public.organization_memberships m on m.organization_id=d.organization_id and m.role='owner'
 where d.hostname in ('learn.phoxta.com','startup-school.phoxta.com') on conflict do nothing;
-- This deployment uses a baked tenant id; its domain is managed by Vercel.
insert into public.cs_staff_assignments(organization_id,user_id,role)
 select o.id,m.user_id,'owner' from public.organizations o join public.organization_memberships m
 on m.organization_id=o.id and m.user_id=o.owner_user_id and m.role='owner'
 where o.id='2a51e95e-258d-405d-920b-6271d893344f' on conflict do nothing;

create or replace function public.cs_staff_can(p_org uuid,p_permission text,p_scope text default 'school',p_id text default '',p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from cs_staff_assignments a where a.organization_id=p_org and a.user_id=p_user
 and a.active and (a.expires_at is null or a.expires_at>now())
 and (a.scope_type='school' or (a.scope_type=p_scope and a.scope_id=p_id))
 and (a.role='owner' or p_permission=any(case a.role
 when 'school_admin' then array['workspace','people','operations','content','publish','teaching','support','reports','invite','settings']
 when 'programme_manager' then array['workspace','people','operations','teaching','support','reports']
 when 'lecturer' then array['workspace','content','teaching','assess','reports']
 when 'mentor' then array['workspace','mentoring']
 when 'content_editor' then array['workspace','content']
 when 'support' then array['workspace','support']
 when 'finance' then array['workspace','finance']
 when 'launch_coordinator' then array['workspace','launch'] else array[]::text[] end)));
$$;
create or replace function public.cs_is_staff(p_org uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from cs_staff_assignments where organization_id=p_org and user_id=auth.uid() and active and (expires_at is null or expires_at>now()));
$$;
create or replace function public.cs_assert_staff(p_org uuid,p_permission text,p_scope text default 'school',p_id text default '')
returns void language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null or not cs_staff_can(p_org,p_permission,p_scope,p_id) then raise exception 'You do not have permission for this action.' using errcode='42501'; end if;
end $$;
create or replace function public.cs_audit(p_org uuid,p_action text,p_target text,p_detail jsonb default '{}')
returns void language sql security definer set search_path=public as $$
 insert into cs_staff_audit(organization_id,actor_id,action,target,detail) values(p_org,auth.uid(),p_action,p_target,p_detail);
$$;
create or replace function public.cs_member_of_cohort(p_org uuid,p_cohort uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from cs_cohort_members where organization_id=p_org and cohort_id=p_cohort and user_id=auth.uid() and status in ('active','completed'));
$$;
create or replace function public.cs_can_read_course(p_org uuid,p_course text) returns boolean
language sql stable security definer set search_path=public as $$
 select cs_staff_can(p_org,'content','course',p_course) or cs_staff_can(p_org,'publish') or
 (cs_has_access(p_org,'self_study') and exists(select 1 from cs_courses c where c.organization_id=p_org and c.id=p_course and c.published)
 and not exists(select 1 from cs_cohort_members m join cs_cohorts h on h.id=m.cohort_id
 where m.organization_id=p_org and m.user_id=auth.uid() and m.status='active' and h.release_mode='scheduled'
 and not exists(select 1 from cs_course_releases r where r.organization_id=p_org and r.cohort_id=h.id and r.course_id=p_course and r.unlock_at<=now())));
$$;

-- New tables have NO browser write policies. All mutations use checked RPCs.
do $$ declare t text; begin
 foreach t in array array['cs_staff_assignments','cs_staff_invites','cs_school_settings','cs_cohorts','cs_cohort_members','cs_seat_holds','cs_waitlist','cs_announcements','cs_course_releases','cs_content_revisions','cs_revision_history','cs_media_assets','cs_assignments','cs_submissions','cs_support_tickets','cs_launch_catalogue','cs_launch_allocations','cs_staff_audit'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
create policy staff_own on public.cs_staff_assignments for select to authenticated using(user_id=auth.uid() or cs_staff_can(organization_id,'people'));
create policy invitations_staff on public.cs_staff_invites for select to authenticated using(cs_staff_can(organization_id,'invite'));
create policy settings_read on public.cs_school_settings for select to authenticated using(cs_is_staff(organization_id) or cs_has_access(organization_id));
create policy cohorts_read on public.cs_cohorts for select to authenticated using(cs_member_of_cohort(organization_id,id) or cs_staff_can(organization_id,'teaching','cohort',id::text) or cs_staff_can(organization_id,'operations'));
create policy cohort_members_read on public.cs_cohort_members for select to authenticated using(user_id=auth.uid() or cs_staff_can(organization_id,'teaching','cohort',cohort_id::text) or cs_staff_can(organization_id,'people'));
create policy announcements_read on public.cs_announcements for select to authenticated using(cs_member_of_cohort(organization_id,cohort_id) or cs_staff_can(organization_id,'teaching','cohort',cohort_id::text));
create policy releases_read on public.cs_course_releases for select to authenticated using(cs_member_of_cohort(organization_id,cohort_id) or cs_staff_can(organization_id,'operations'));
create policy revisions_read on public.cs_content_revisions for select to authenticated using(cs_staff_can(organization_id,'content','course',course_id));
create policy history_read on public.cs_revision_history for select to authenticated using(exists(select 1 from cs_content_revisions r where r.id=revision_id and cs_staff_can(r.organization_id,'content','course',r.course_id)));
create policy media_read on public.cs_media_assets for select to authenticated using(cs_staff_can(organization_id,'content','course',course_id));
create policy assignments_read on public.cs_assignments for select to authenticated using(cs_staff_can(organization_id,'teaching','course',course_id) or cs_staff_can(organization_id,'teaching','cohort',cohort_id::text) or (published and cs_can_read_course(organization_id,course_id) and (cohort_id is null or cs_member_of_cohort(organization_id,cohort_id))));
create policy submissions_read on public.cs_submissions for select to authenticated using(user_id=auth.uid() or exists(select 1 from cs_assignments a where a.id=assignment_id and (cs_staff_can(a.organization_id,'teaching','course',a.course_id) or cs_staff_can(a.organization_id,'teaching','cohort',a.cohort_id::text))));
create policy tickets_read on public.cs_support_tickets for select to authenticated using(user_id=auth.uid() or cs_staff_can(organization_id,'support'));
create policy launch_catalogue_read on public.cs_launch_catalogue for select to authenticated using(cs_staff_can(organization_id,'launch') or (enabled and cs_has_access(organization_id,'launch')));
create policy allocations_read on public.cs_launch_allocations for select to authenticated using((user_id=auth.uid() and cs_has_access(organization_id,'launch')) or cs_staff_can(organization_id,'launch'));
create policy audit_read on public.cs_staff_audit for select to authenticated using(cs_staff_can(organization_id,'settings'));
create policy school_orders_finance on public.cs_plan_orders for select to authenticated using(cs_staff_can(organization_id,'finance'));

-- Restrictive policies close old permissive catalogue policies as well.
create policy school_courses_guard on public.cs_courses as restrictive for select to authenticated using(cs_can_read_course(organization_id,id));
create policy school_courses_staff on public.cs_courses for select to authenticated using(cs_staff_can(organization_id,'content','course',id) or cs_staff_can(organization_id,'teaching','course',id));
create policy school_modules_staff on public.cs_modules for select to authenticated using(cs_staff_can(organization_id,'content','course',course_id));
create policy school_modules_guard on public.cs_modules as restrictive for select to authenticated using(cs_can_read_course(organization_id,course_id));
create policy school_lessons_staff on public.cs_lessons for select to authenticated using(cs_staff_can(organization_id,'content','course',course_id));
create policy school_lessons_guard on public.cs_lessons as restrictive for select to authenticated using(cs_can_read_course(organization_id,course_id));
create policy school_categories_staff on public.cs_categories for select to authenticated using(cs_is_staff(organization_id));
create policy school_mentors_staff on public.cs_mentors for select to authenticated using(cs_is_staff(organization_id));
create policy school_quizzes_staff on public.cs_quiz_questions for select to authenticated using(exists(select 1 from cs_lessons l where l.organization_id=cs_quiz_questions.organization_id and l.id=lesson_id and cs_can_read_course(l.organization_id,l.course_id)));
create policy school_quizzes_guard on public.cs_quiz_questions as restrictive for select to authenticated using(exists(select 1 from cs_lessons l where l.organization_id=cs_quiz_questions.organization_id and l.id=lesson_id and cs_can_read_course(l.organization_id,l.course_id)));

create or replace function public.cs_staff_identity(p_org uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('assignments',coalesce((select jsonb_agg(jsonb_build_object('id',id,'role',role,'scope_type',scope_type,'scope_id',scope_id,'expires_at',expires_at)) from cs_staff_assignments where organization_id=p_org and user_id=auth.uid() and active and (expires_at is null or expires_at>now())),'[]'::jsonb));
$$;
create or replace function public.cs_public_intakes(p_org uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'starts_at',c.starts_at,'ends_at',c.ends_at,'timezone',c.timezone,'mentor_sessions',c.mentor_sessions,'seats_left',greatest(0,c.capacity-(select count(*) from cs_cohort_members m where m.cohort_id=c.id and m.status='active')-(select count(*) from cs_seat_holds h where h.cohort_id=c.id and h.status='held' and h.expires_at>now()))) order by c.starts_at),'[]'::jsonb) from cs_cohorts c where c.organization_id=p_org and c.status='open' and c.starts_at>now();
$$;

-- Revoke implicit PUBLIC function execution. Private helpers aren't entry points.
revoke all on function public.cs_audit(uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.cs_assert_staff(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.cs_staff_can(uuid,text,text,text,uuid),public.cs_is_staff(uuid),public.cs_member_of_cohort(uuid,uuid),public.cs_can_read_course(uuid,text),public.cs_staff_identity(uuid) from public,anon;
grant execute on function public.cs_staff_can(uuid,text,text,text,uuid),public.cs_is_staff(uuid),public.cs_member_of_cohort(uuid,uuid),public.cs_can_read_course(uuid,text),public.cs_staff_identity(uuid) to authenticated,service_role;
grant execute on function public.cs_public_intakes(uuid) to anon,authenticated,service_role;
commit;
