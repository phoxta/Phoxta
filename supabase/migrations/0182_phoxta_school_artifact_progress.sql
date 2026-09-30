begin;
create table public.opportunity_school_modules (
 id text primary key,title text not null,artifact_kind text not null,section_key text
);
insert into public.opportunity_school_modules values
 ('opportunity-thinking','Opportunity Thinking','brief','thesis'),('finding-problems','Finding Problems Worth Investigating','evidence',null),
 ('customers-context','Customers & Context','artifact','icp'),('market-alternatives','Market & Alternatives','artifact','alternatives'),
 ('why-now','Why Now?','brief','why_now'),('critical-assumptions','Critical Assumptions','assumption',null),
 ('validation','Validation','experiment',null),('value-proposition','Value Proposition','artifact','value_proposition'),
 ('business-model','Business Model','artifact','business_model'),('mvp-delivery','MVP & Delivery','artifact','mvp'),
 ('go-to-market','Go-to-Market','artifact','launch_plan'),('decision-iteration','Decision & Iteration','decision',null);
create table public.opportunity_school_progress (
 user_id uuid not null references auth.users(id) on delete cascade,module_id text not null references public.opportunity_school_modules(id),
 workspace_id uuid not null references public.opportunity_workspaces(id) on delete cascade,artifact_id uuid not null,
 completed_at timestamptz not null default now(),primary key(user_id,module_id,workspace_id)
);
alter table public.opportunity_school_modules enable row level security;
alter table public.opportunity_school_progress enable row level security;
revoke all on public.opportunity_school_modules,public.opportunity_school_progress from anon,authenticated;
grant select on public.opportunity_school_modules to anon,authenticated;
grant select on public.opportunity_school_progress to authenticated;
create policy modules_public on public.opportunity_school_modules for select using(true);
create policy progress_own on public.opportunity_school_progress for select to authenticated using(user_id=auth.uid());

create function public.opportunity_complete_lesson(p_module text,p_workspace uuid) returns void language plpgsql security definer set search_path=public as $$
declare m opportunity_school_modules; v_id uuid;
begin
 if auth.uid() is null or opportunity_role(p_workspace) is null then raise exception 'Select an opportunity you can access.'; end if;
 select * into m from opportunity_school_modules where id=p_module;
 if not found then raise exception 'Module not found.'; end if;
 case m.artifact_kind
 when 'brief' then select id into v_id from brief_sections where workspace_id=p_workspace and section_key=m.section_key and length(trim(content->>'text'))>0;
 when 'evidence' then select id into v_id from evidence_items where workspace_id=p_workspace and evidence_type not in ('ai_hypothesis','legacy_ai_hypothesis','user_note') limit 1;
 when 'assumption' then select id into v_id from assumptions where workspace_id=p_workspace limit 1;
 when 'experiment' then select id into v_id from experiments where workspace_id=p_workspace and length(trim(method))>0 and length(trim(success_criteria))>0 limit 1;
 when 'decision' then select id into v_id from decision_reviews where workspace_id=p_workspace and decided_by=auth.uid() limit 1;
 when 'artifact' then select id into v_id from opportunity_artifacts where workspace_id=p_workspace and artifact_type=m.section_key and content<>'{}'::jsonb and not exists(select 1 from jsonb_each_text(content) c where length(trim(c.value))=0) limit 1;
 end case;
 if v_id is null then raise exception 'Create the required artifact before completing this lesson.'; end if;
 insert into opportunity_school_progress(user_id,module_id,workspace_id,artifact_id) values(auth.uid(),p_module,p_workspace,v_id) on conflict(user_id,module_id,workspace_id) do nothing;
 -- Existing school tenants keep their own UI, enrollment and certificate system.
 -- Only matching published 2.0 lessons in tenants the user belongs to are updated.
 if to_regclass('public.cs_lesson_progress') is not null then
   insert into cs_lesson_progress(organization_id,user_id,lesson_id,position_sec,completed_at,updated_at)
   select p.organization_id,auth.uid(),l.id,0,now(),now() from cs_profiles p join cs_lessons l on l.organization_id=p.organization_id
   where p.user_id=auth.uid() and l.id='v2-'||p_module||'-practice'
   on conflict(organization_id,user_id,lesson_id) do update set completed_at=coalesce(cs_lesson_progress.completed_at,excluded.completed_at),updated_at=now();
 end if;
end; $$;
revoke all on function public.opportunity_complete_lesson(text,uuid) from public,anon;
grant execute on function public.opportunity_complete_lesson(text,uuid) to authenticated;

-- Direct API clients cannot mark practical 2.0 lessons complete without an artifact.
create function public.opportunity_school_completion_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.lesson_id like 'v2-%-practice' and new.completed_at is not null and not exists(
   select 1 from opportunity_school_progress where user_id=new.user_id and 'v2-'||module_id||'-practice'=new.lesson_id
 ) then raise exception 'Complete this lesson through its opportunity artifact.'; end if;
 return new;
end; $$;
do $$ begin
 if to_regclass('public.cs_lesson_progress') is not null then
   create trigger opportunity_school_artifact_guard before insert or update on public.cs_lesson_progress for each row execute function public.opportunity_school_completion_guard();
 end if;
end $$;
commit;
