begin;
-- Public RPC dispatcher: narrow actions, explicit permission and input checks.
create or replace function public.cs_school_command(p_org uuid,p_action text,p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare
 u uuid:=auth.uid(); v_id uuid; v_text text; v_token text; v_role text; v_scope text; v_scope_id text;
 v_inv cs_staff_invites%rowtype; v_rev cs_content_revisions%rowtype; v_course cs_courses%rowtype;
 v_item jsonb; v_module jsonb; v_lesson jsonb; v_quiz jsonb; v_cohort cs_cohorts%rowtype;
 v_assignment cs_assignments%rowtype; v_alloc cs_launch_allocations%rowtype; v_bp cs_launch_catalogue%rowtype;
 v_target cs_staff_assignments%rowtype; v_user uuid; v_count integer; v_version integer;
begin
 if u is null then raise exception 'Please sign in.' using errcode='42501'; end if;
 if not exists(select 1 from organizations where id=p_org) then raise exception 'School not found'; end if;

 if p_action='accept_invite' then
   select * into v_inv from cs_staff_invites where organization_id=p_org and token_hash=encode(digest(p_data->>'token','sha256'),'hex') for update;
   if not found or v_inv.accepted_at is not null or v_inv.revoked_at is not null or v_inv.expires_at<=now() then raise exception 'This invitation is invalid or expired.'; end if;
   if not exists(select 1 from auth.users where id=u and lower(email)=lower(v_inv.email) and email_confirmed_at is not null) then raise exception 'Sign in with the verified email address this invitation was sent to.'; end if;
   if not cs_staff_can(p_org,case when v_inv.role='school_admin' then 'owner' else 'invite' end,'school','',v_inv.created_by) then raise exception 'The inviter no longer has permission. Ask for a new invitation.'; end if;
   insert into cs_staff_assignments(organization_id,user_id,role,scope_type,scope_id,expires_at,created_by)
   values(p_org,u,v_inv.role,v_inv.scope_type,v_inv.scope_id,v_inv.assignment_expires_at,v_inv.created_by)
   on conflict(organization_id,user_id,role,scope_type,scope_id) do update set active=true,expires_at=excluded.expires_at;
   update cs_staff_invites set accepted_at=now() where id=v_inv.id;
   insert into cs_profiles(organization_id,user_id,name) select p_org,u,coalesce(raw_user_meta_data->>'full_name','Staff member') from auth.users where id=u on conflict do nothing;
   if v_inv.role='mentor' then
     insert into cs_mentors(organization_id,id,name,role,user_id,timezone) select p_org,'staff-'||u::text,coalesce(raw_user_meta_data->>'full_name','Mentor'),'Mentor',u,'Europe/London' from auth.users where id=u on conflict do nothing;
   end if;
   perform cs_audit(p_org,'invite.accepted',v_inv.id::text);
   return cs_staff_identity(p_org);
 elsif p_action='invite' then
   perform cs_assert_staff(p_org,'invite');
   if coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'Verify your authenticator in Security before inviting staff.'; end if;
   v_role:=p_data->>'role'; v_scope:=coalesce(p_data->>'scope_type','school'); v_scope_id:=coalesce(p_data->>'scope_id','');
   if v_role not in ('school_admin','programme_manager','lecturer','mentor','content_editor','support','finance','launch_coordinator') then raise exception 'Choose a supported staff role.'; end if;
   if v_role in ('school_admin','finance') then perform cs_assert_staff(p_org,'owner'); end if;
   if v_scope not in ('school','course','cohort','class','learner') or (v_scope='school' and v_scope_id<>'') or (v_scope<>'school' and v_scope_id='') then raise exception 'Choose an assignment scope.'; end if;
   if v_role not in ('lecturer','mentor','content_editor') and v_scope<>'school' then raise exception 'This role requires school scope.'; end if;
   if v_scope='course' and not exists(select 1 from cs_courses where organization_id=p_org and id=v_scope_id) then raise exception 'Course not found.'; end if;
   if v_scope='cohort' and not exists(select 1 from cs_cohorts where organization_id=p_org and id::text=v_scope_id) then raise exception 'Cohort not found.'; end if;
   if v_scope='class' and not exists(select 1 from cs_live_lessons where organization_id=p_org and id=v_scope_id) then raise exception 'Class not found.'; end if;
   if v_scope='learner' and not exists(select 1 from cs_profiles where organization_id=p_org and user_id::text=v_scope_id) then raise exception 'Learner not found.'; end if;
   if coalesce(p_data->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email address.'; end if;
   v_token:=encode(gen_random_bytes(32),'hex');
   insert into cs_staff_invites(organization_id,email,role,scope_type,scope_id,token_hash,created_by,assignment_expires_at)
   values(p_org,lower(trim(p_data->>'email')),v_role,v_scope,v_scope_id,encode(digest(v_token,'sha256'),'hex'),u,nullif(p_data->>'expires_at','')::timestamptz) returning id into v_id;
   perform cs_audit(p_org,'invite.created',v_id::text,jsonb_build_object('role',v_role,'scope',v_scope,'scope_id',v_scope_id));
   return jsonb_build_object('id',v_id,'token',v_token);
 elsif p_action='revoke_invite' then
   perform cs_assert_staff(p_org,'invite');
   update cs_staff_invites set revoked_at=now() where organization_id=p_org and id=(p_data->>'id')::uuid and accepted_at is null;
 elsif p_action='revoke_staff' then
   perform cs_assert_staff(p_org,'invite');
   if coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'Verify your authenticator in Security.'; end if;
   select * into v_target from cs_staff_assignments where organization_id=p_org and id=(p_data->>'id')::uuid for update;
   if not found or v_target.role='owner' then raise exception 'Owner access cannot be removed here.'; end if;
   if v_target.role in ('school_admin','finance') then perform cs_assert_staff(p_org,'owner'); end if;
   update cs_staff_assignments set active=false where id=v_target.id;
   update cs_mentors set bookable=false where organization_id=p_org and user_id=v_target.user_id and not exists(select 1 from cs_staff_assignments where organization_id=p_org and user_id=v_target.user_id and role='mentor' and active and (expires_at is null or expires_at>now()));
 elsif p_action='save_cohort' then
   perform cs_assert_staff(p_org,'operations');
   if length(trim(coalesce(p_data->>'name','')))<3 then raise exception 'Give the intake a name.'; end if;
   if not exists(select 1 from pg_timezone_names where name=p_data->>'timezone') then raise exception 'Choose a valid IANA timezone.'; end if;
   if p_data->>'status'='open' and not exists(select 1 from cs_school_settings where organization_id=p_org and length(access_policy)>10 and length(cancellation_policy)>10) then raise exception 'Save access and cancellation policies in Operations before opening admissions.'; end if;
   v_id:=coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid());
   perform 1 from cs_cohorts where id=v_id and organization_id=p_org for update;
   select count(*) into v_count from cs_cohort_members where cohort_id=v_id and status='active';
   v_count:=v_count+(select count(*) from cs_seat_holds where cohort_id=v_id and status='held' and expires_at>now());
   if nullif(p_data->>'capacity','')::integer<v_count then raise exception 'Capacity cannot be below enrolled learners and reserved seats.'; end if;
   insert into cs_cohorts(id,organization_id,name,starts_at,ends_at,timezone,capacity,mentor_sessions,status,release_mode,recording_days)
   values(v_id,p_org,trim(p_data->>'name'),(p_data->>'starts_at')::timestamp at time zone (p_data->>'timezone'),(p_data->>'ends_at')::timestamp at time zone (p_data->>'timezone'),p_data->>'timezone',nullif(p_data->>'capacity','')::integer,coalesce((p_data->>'mentor_sessions')::integer,0),p_data->>'status',coalesce(p_data->>'release_mode','immediate'),coalesce((p_data->>'recording_days')::integer,365))
   on conflict(id) do update set name=excluded.name,starts_at=excluded.starts_at,ends_at=excluded.ends_at,timezone=excluded.timezone,capacity=excluded.capacity,mentor_sessions=excluded.mentor_sessions,status=excluded.status,release_mode=excluded.release_mode,recording_days=excluded.recording_days where cs_cohorts.organization_id=p_org;
 elsif p_action='waitlist' then
   if not exists(select 1 from cs_cohorts where organization_id=p_org and id=(p_data->>'cohort_id')::uuid and status='open') then raise exception 'This intake is not open.'; end if;
   insert into cs_waitlist(organization_id,cohort_id,user_id) values(p_org,(p_data->>'cohort_id')::uuid,u) on conflict do nothing;
 elsif p_action='transfer_member' then
   perform cs_assert_staff(p_org,'operations');
   v_user:=(p_data->>'user_id')::uuid; v_id:=(p_data->>'cohort_id')::uuid;
   select * into v_cohort from cs_cohorts where organization_id=p_org and id=v_id for update;
   if not found then raise exception 'Intake not found.'; end if;
   if (select count(*) from cs_cohort_members where cohort_id=v_id and status='active')+(select count(*) from cs_seat_holds where cohort_id=v_id and status='held' and expires_at>now())>=v_cohort.capacity then raise exception 'This intake is full.'; end if;
   if not exists(select 1 from cs_entitlements where organization_id=p_org and user_id=v_user and status='active' and (expires_at is null or expires_at>now()) and plan in ('cohort','launch')) then raise exception 'This learner needs paid Cohort or Launch access.'; end if;
   update cs_cohort_members set status='transferred' where organization_id=p_org and user_id=v_user and status='active';
   insert into cs_cohort_members(organization_id,cohort_id,user_id) values(p_org,v_id,v_user) on conflict(organization_id,cohort_id,user_id) do update set status='active';
 elsif p_action='announce' then
   v_id:=(p_data->>'cohort_id')::uuid; perform cs_assert_staff(p_org,'teaching','cohort',v_id::text);
   if length(trim(p_data->>'title'))<3 or length(trim(p_data->>'body'))<3 then raise exception 'Add a title and announcement.'; end if;
   insert into cs_announcements(organization_id,cohort_id,title,body,created_by) values(p_org,v_id,p_data->>'title',p_data->>'body',u);
 elsif p_action='release_course' then
   perform cs_assert_staff(p_org,'operations');
   insert into cs_course_releases(organization_id,cohort_id,course_id,unlock_at) values(p_org,(p_data->>'cohort_id')::uuid,p_data->>'course_id',(p_data->>'unlock_at')::timestamptz)
   on conflict(organization_id,cohort_id,course_id) do update set unlock_at=excluded.unlock_at;
 elsif p_action='save_settings' then
   perform cs_assert_staff(p_org,'settings');
   insert into cs_school_settings(organization_id,cancellation_policy,access_policy,completion_policy,launch_terms)
   values(p_org,coalesce(p_data->>'cancellation_policy',''),coalesce(p_data->>'access_policy',''),coalesce(p_data->>'completion_policy',''),coalesce(p_data->>'launch_terms',''))
   on conflict(organization_id) do update set cancellation_policy=excluded.cancellation_policy,access_policy=excluded.access_policy,completion_policy=excluded.completion_policy,launch_terms=excluded.launch_terms,updated_at=now();
 elsif p_action='new_course' then
   perform cs_assert_staff(p_org,'content');
   v_text:='course-'||gen_random_uuid()::text;
   insert into cs_courses(organization_id,id,slug,title,category_id,mentor_id,published)
   values(p_org,v_text,v_text,p_data->>'title',p_data->>'category_id',p_data->>'mentor_id',false);
   return jsonb_build_object('id',v_text);
 elsif p_action='open_revision' then
   v_text:=p_data->>'course_id'; perform cs_assert_staff(p_org,'content','course',v_text);
   select * into v_rev from cs_content_revisions where organization_id=p_org and course_id=v_text and state in ('draft','in_review');
   if found then return to_jsonb(v_rev); end if;
   select * into v_course from cs_courses where organization_id=p_org and id=v_text;
   if not found then raise exception 'Course not found.'; end if;
   insert into cs_content_revisions(organization_id,course_id,created_by,document) values(p_org,v_text,u,
     jsonb_build_object('title',v_course.title,'blurb',v_course.blurb,'description',v_course.description,'outcomes',v_course.outcomes,
       'modules',coalesce((select jsonb_agg(to_jsonb(m)||jsonb_build_object('lessons',coalesce((select jsonb_agg(to_jsonb(l)||jsonb_build_object('questions',coalesce((select jsonb_agg(to_jsonb(q) order by q.sort) from cs_quiz_questions q where q.organization_id=p_org and q.lesson_id=l.id),'[]'::jsonb)) order by l.sort) from cs_lessons l where l.organization_id=p_org and l.module_id=m.id),'[]'::jsonb)) order by m.sort) from cs_modules m where m.organization_id=p_org and m.course_id=v_text),'[]'::jsonb))) returning * into v_rev;
   return to_jsonb(v_rev);
 elsif p_action in ('save_revision','submit_revision','review_revision','publish_revision') then
   select * into v_rev from cs_content_revisions where organization_id=p_org and id=(p_data->>'id')::uuid for update;
   if not found then raise exception 'Draft not found.'; end if;
   perform cs_assert_staff(p_org,'content','course',v_rev.course_id);
   if v_rev.state not in ('draft','in_review') then raise exception 'Open a new revision to edit published content.'; end if;
   if p_action='save_revision' then
     if v_rev.state<>'draft' then raise exception 'This draft is in review. Ask a reviewer to return it for changes.'; end if;
     if v_rev.version is distinct from (p_data->>'version')::integer then raise exception 'Another editor has saved changes. Reload before saving.'; end if;
     if jsonb_typeof(p_data->'document'->'modules')<>'array' or length(coalesce(p_data->'document'->>'title',''))<3 then raise exception 'Add a title and module list.'; end if;
     insert into cs_revision_history(revision_id,organization_id,version,document,actor_id) values(v_rev.id,p_org,v_rev.version,v_rev.document,u);
     update cs_content_revisions set document=p_data->'document',version=version+1,updated_at=now() where id=v_rev.id returning * into v_rev;
     return to_jsonb(v_rev);
   elsif p_action='submit_revision' then
     update cs_content_revisions set state='in_review',updated_at=now() where id=v_rev.id;
   elsif p_action='review_revision' then
     perform cs_assert_staff(p_org,'publish');
     update cs_content_revisions set state='draft',review_notes=coalesce(p_data->>'notes',''),reviewed_by=u,updated_at=now() where id=v_rev.id;
   else
     perform cs_assert_staff(p_org,'publish');
     if v_rev.state<>'in_review' then raise exception 'Submit this draft for review before publishing.'; end if;
     if jsonb_array_length(v_rev.document->'modules')=0 then raise exception 'Add at least one module and lesson.'; end if;
     -- Stable ids, update/insert only: never delete learner progress or certificates.
     update cs_courses set title=v_rev.document->>'title',blurb=coalesce(v_rev.document->>'blurb',''),description=coalesce(v_rev.document->>'description',''),outcomes=coalesce(v_rev.document->'outcomes','[]'),published=true,published_at=now() where organization_id=p_org and id=v_rev.course_id;
     v_count:=0;
     for v_module in select value from jsonb_array_elements(v_rev.document->'modules') loop
       if exists(select 1 from cs_modules where organization_id=p_org and id=v_module->>'id' and course_id<>v_rev.course_id) then raise exception 'A module id belongs to another course.'; end if;
       insert into cs_modules(organization_id,id,course_id,title,sort) values(p_org,v_module->>'id',v_rev.course_id,v_module->>'title',v_count)
       on conflict(organization_id,id) do update set title=excluded.title,sort=excluded.sort;
       v_count:=v_count+1; v_version:=0;
       if jsonb_array_length(v_module->'lessons')=0 then raise exception 'Each module needs a lesson.'; end if;
       for v_lesson in select value from jsonb_array_elements(v_module->'lessons') loop
         if exists(select 1 from cs_lessons where organization_id=p_org and id=v_lesson->>'id' and course_id<>v_rev.course_id) then raise exception 'A lesson id belongs to another course.'; end if;
         insert into cs_lessons(organization_id,id,course_id,module_id,title,kind,body,video_url,captions_url,duration_sec,sort)
         values(p_org,v_lesson->>'id',v_rev.course_id,v_module->>'id',v_lesson->>'title',v_lesson->>'kind',coalesce(v_lesson->>'body',''),nullif(v_lesson->>'video_url',''),nullif(v_lesson->>'captions_url',''),greatest(0,coalesce((v_lesson->>'duration_sec')::integer,0)),v_version)
         on conflict(organization_id,id) do update set module_id=excluded.module_id,title=excluded.title,kind=excluded.kind,body=excluded.body,video_url=excluded.video_url,captions_url=excluded.captions_url,duration_sec=excluded.duration_sec,sort=excluded.sort;
         v_version:=v_version+1;
         for v_quiz in select value from jsonb_array_elements(coalesce(v_lesson->'questions','[]')) loop
           if exists(select 1 from cs_quiz_questions where organization_id=p_org and id=v_quiz->>'id' and lesson_id<>v_lesson->>'id') then raise exception 'A question id belongs to another lesson.'; end if;
           if jsonb_array_length(v_quiz->'options')<2 or (v_quiz->>'answer')::integer not between 0 and jsonb_array_length(v_quiz->'options')-1 then raise exception 'Every quiz needs options and a valid correct answer.'; end if;
           insert into cs_quiz_questions(organization_id,id,lesson_id,prompt,options,answer,explanation,sort)
           values(p_org,v_quiz->>'id',v_lesson->>'id',v_quiz->>'prompt',v_quiz->'options',(v_quiz->>'answer')::integer,coalesce(v_quiz->>'explanation',''),coalesce((v_quiz->>'sort')::integer,0))
           on conflict(organization_id,id) do update set prompt=excluded.prompt,options=excluded.options,answer=excluded.answer,explanation=excluded.explanation,sort=excluded.sort;
         end loop;
       end loop;
     end loop;
     update cs_content_revisions set state='published',published_at=now(),reviewed_by=u where id=v_rev.id;
   end if;
 elsif p_action='archive_course' then
   perform cs_assert_staff(p_org,'publish');
   update cs_courses set published=false where organization_id=p_org and id=p_data->>'course_id';
 elsif p_action='save_assignment' then
   v_text:=p_data->>'course_id';
   if not cs_staff_can(p_org,'teaching','course',v_text) then perform cs_assert_staff(p_org,'teaching','cohort',p_data->>'cohort_id'); end if;
   if length(trim(p_data->>'brief'))<10 or length(trim(p_data->>'rubric'))<5 then raise exception 'Add a clear assignment brief and assessment rubric.'; end if;
   insert into cs_assignments(organization_id,course_id,cohort_id,title,brief,rubric,due_at,published,created_by)
   values(p_org,v_text,nullif(p_data->>'cohort_id','')::uuid,p_data->>'title',p_data->>'brief',p_data->>'rubric',nullif(p_data->>'due_at','')::timestamptz,true,u);
 elsif p_action='submit_work' then
   select * into v_assignment from cs_assignments where organization_id=p_org and id=(p_data->>'assignment_id')::uuid and published;
   if not found or not cs_can_read_course(p_org,v_assignment.course_id) or (v_assignment.cohort_id is not null and not cs_member_of_cohort(p_org,v_assignment.cohort_id)) or not cs_has_access(p_org) then raise exception 'This assignment is not available to you.'; end if;
   if length(trim(coalesce(p_data->>'body','')))<10 then raise exception 'Add your work before submitting.'; end if;
   insert into cs_submissions(organization_id,assignment_id,user_id,body) values(p_org,v_assignment.id,u,p_data->>'body')
   on conflict(organization_id,assignment_id,user_id) do update set body=excluded.body,submitted_at=now(),outcome='submitted',reviewed_at=null where cs_submissions.outcome<>'passed';
 elsif p_action='review_work' then
   select a.* into v_assignment from cs_assignments a join cs_submissions s on s.assignment_id=a.id where s.organization_id=p_org and s.id=(p_data->>'id')::uuid;
   if not found then raise exception 'Submission not found.'; end if;
   if not cs_staff_can(p_org,'teaching','course',v_assignment.course_id) then perform cs_assert_staff(p_org,'teaching','cohort',v_assignment.cohort_id::text); end if;
   if p_data->>'outcome' not in ('passed','changes_requested') or length(trim(p_data->>'feedback'))<5 then raise exception 'Add feedback and an assessment outcome.'; end if;
   update cs_submissions set outcome=p_data->>'outcome',feedback=p_data->>'feedback',reviewed_by=u,reviewed_at=now() where organization_id=p_org and id=(p_data->>'id')::uuid;
 elsif p_action='ticket' then
   if length(trim(coalesce(p_data->>'subject','')))<3 or length(trim(coalesce(p_data->>'body','')))<10 then raise exception 'Add a subject and describe the issue.'; end if;
   insert into cs_support_tickets(organization_id,user_id,subject,body) values(p_org,u,p_data->>'subject',p_data->>'body');
 elsif p_action='reply_ticket' then
   perform cs_assert_staff(p_org,'support');
   update cs_support_tickets set reply=p_data->>'reply',status=p_data->>'status',updated_at=now() where organization_id=p_org and id=(p_data->>'id')::uuid;
 elsif p_action='launch_catalogue' then
   perform cs_assert_staff(p_org,'launch');
   if length(trim(p_data->>'included_assets'))<10 or length(trim(p_data->>'ongoing_costs'))<5 then raise exception 'Describe included assets and ongoing costs before offering a business.'; end if;
   insert into cs_launch_catalogue(organization_id,blueprint_id,included_assets,ongoing_costs,enabled) values(p_org,(p_data->>'blueprint_id')::uuid,p_data->>'included_assets',p_data->>'ongoing_costs',true)
   on conflict(organization_id,blueprint_id) do update set included_assets=excluded.included_assets,ongoing_costs=excluded.ongoing_costs,enabled=true;
 elsif p_action='select_business' then
   if not cs_has_access(p_org,'launch') then raise exception 'Launch admission is required.'; end if;
   select * into v_bp from cs_launch_catalogue where organization_id=p_org and blueprint_id=(p_data->>'blueprint_id')::uuid and enabled;
   if not found then raise exception 'Choose an eligible business.'; end if;
   if not coalesce((p_data->>'accept_ownership')::boolean,false) then raise exception 'Accept the ownership terms and ongoing costs.'; end if;
   insert into cs_launch_allocations(organization_id,user_id,blueprint_id,status,ownership_accepted_at) values(p_org,u,v_bp.blueprint_id,'reserved',now())
   on conflict(organization_id,user_id) do update set blueprint_id=excluded.blueprint_id,status='reserved',ownership_accepted_at=now(),updated_at=now() where cs_launch_allocations.status in ('eligible','selection','reserved') and cs_launch_allocations.provisioned_org_id is null;
 elsif p_action='investor_request' then
   if not cs_has_access(p_org,'launch') then raise exception 'Launch admission is required.'; end if;
   if not coalesce((p_data->>'consent')::boolean,false) or length(trim(p_data->>'materials'))<10 then raise exception 'Share your pitch materials and confirm your consent.'; end if;
   insert into cs_launch_allocations(organization_id,user_id,shared_materials,investor_consent_at,investor_status) values(p_org,u,p_data->>'materials',now(),'requested')
   on conflict(organization_id,user_id) do update set shared_materials=excluded.shared_materials,investor_consent_at=now(),investor_status='requested',updated_at=now();
 elsif p_action='withdraw_consent' then
   update cs_launch_allocations set investor_consent_at=null,shared_materials='',investor_status='not_requested' where organization_id=p_org and user_id=u;
 elsif p_action='launch_handover' then
   perform cs_assert_staff(p_org,'launch');
   select * into v_alloc from cs_launch_allocations where organization_id=p_org and user_id=(p_data->>'user_id')::uuid for update;
   if not found then raise exception 'Launch request not found.'; end if;
   if p_data->>'status'='launched' and (v_alloc.provisioned_org_id is null or p_data->'checklist'<>'{"credentials":true,"training":true,"domain":true,"operations":true}'::jsonb) then raise exception 'Provision the business and complete every handover item first.'; end if;
   if p_data->>'investor_status' in ('reviewing','ready','introduced') and v_alloc.investor_consent_at is null then raise exception 'The founder must consent before materials are shared.'; end if;
   update cs_launch_allocations set checklist=coalesce(p_data->'checklist',checklist),status=case when p_data->>'status' in ('handover','launched','on_hold') then p_data->>'status' else status end,investor_status=coalesce(p_data->>'investor_status',investor_status),updated_at=now() where organization_id=p_org and user_id=v_alloc.user_id;
 else raise exception 'Unsupported school action.';
 end if;
 perform cs_audit(p_org,p_action,coalesce(p_data->>'id',p_data->>'course_id',p_data->>'user_id',v_id::text,''));
 return jsonb_build_object('ok',true,'id',v_id);
end $$;
revoke all on function public.cs_school_command(uuid,text,jsonb) from public,anon;
grant execute on function public.cs_school_command(uuid,text,jsonb) to authenticated;
commit;
