begin;
create function public.opportunity_accept_research(p_artifact uuid,p_section text,p_claim integer,p_version integer,p_confirmed boolean default false) returns void language plpgsql security definer set search_path=public as $$
declare r research_artifacts; proposed jsonb; content_text text;
begin
 select * into r from research_artifacts where id=p_artifact for update;
 if not found or opportunity_role(r.workspace_id) is null or opportunity_role(r.workspace_id)='viewer' then raise exception 'Editing access required.'; end if;
 if not p_confirmed then raise exception 'Compare the draft with your Brief and confirm this edit.'; end if;
 proposed:=case when p_claim=-1 then jsonb_build_object('text',r.content->>'thesis','evidence_ids','[]'::jsonb) else r.content->'claims'->p_claim end;
 content_text:=proposed->>'text';
 if length(trim(coalesce(content_text,'')))=0 then raise exception 'Research proposal not found.'; end if;
 perform opportunity_command('brief',jsonb_build_object('workspace_id',r.workspace_id,'section_key',p_section,'version',p_version,'content',
   jsonb_build_object('text',content_text,'kind','inferred','evidence_ids',coalesce(proposed->'evidence_ids','[]'))));
 update research_artifacts set model_metadata=model_metadata||jsonb_build_object('reviewed_by',auth.uid(),'reviewed_at',now(),'accepted_section',p_section) where id=p_artifact;
 update research_jobs set status='completed' where id=r.research_job_id and status='review_required';
end; $$;
revoke all on function opportunity_accept_research(uuid,text,integer,integer,boolean) from public,anon;
grant execute on function opportunity_accept_research(uuid,text,integer,integer,boolean) to authenticated;
create table public.opportunity_notification_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 research boolean not null default true, experiments boolean not null default true,
 evidence boolean not null default true, digest boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table opportunity_notification_preferences enable row level security;
revoke all on opportunity_notification_preferences from anon,authenticated;
grant select on opportunity_notification_preferences to authenticated;
create policy own_preferences on opportunity_notification_preferences for select to authenticated using(user_id=auth.uid());
create function public.opportunity_save_notifications(p_research boolean,p_experiments boolean,p_evidence boolean,p_digest boolean) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in to continue.'; end if;
 insert into opportunity_notification_preferences values(auth.uid(),p_research,p_experiments,p_evidence,p_digest,now())
 on conflict(user_id) do update set research=excluded.research,experiments=excluded.experiments,evidence=excluded.evidence,digest=excluded.digest,updated_at=now();
end; $$;
create function public.opportunity_filter_notification() returns trigger language plpgsql security definer set search_path=public as $$
declare p opportunity_notification_preferences;
begin
 select * into p from opportunity_notification_preferences where user_id=new.user_id;
 if found and ((new.type='research_completed' and not p.research) or (new.type='experiment_due' and not p.experiments) or (new.type='evidence_conflict' and not p.evidence)) then return null; end if;
 return new;
end; $$;
create trigger respect_notification_preferences before insert on opportunity_notifications for each row execute function opportunity_filter_notification();

-- Account exports are a user-authorised download. They never enter third-party analytics.
create function public.opportunity_export_account() returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb; t text; rows jsonb; ids uuid[];
begin
 if auth.uid() is null then raise exception 'Sign in to continue.'; end if;
 select array_agg(id) into ids from opportunity_workspaces where opportunity_can_read(id);
 result:=jsonb_build_object('exported_at',now(),'discovery_profile',(select to_jsonb(p) from discovery_profiles p where user_id=auth.uid()),
 'workspaces',coalesce((select jsonb_agg(to_jsonb(w)-'legacy') from opportunity_workspaces w where id=any(ids)),'[]'),
 'school_progress',coalesce((select jsonb_agg(to_jsonb(p)) from opportunity_school_progress p where user_id=auth.uid()),'[]'));
 foreach t in array array['brief_sections','brief_section_versions','evidence_items','sources','assumptions','evidence_links','experiments','experiment_observations','decision_reviews','opportunity_artifacts','opportunity_artifact_versions','agent_workflows','research_artifacts'] loop
   execute format('select coalesce(jsonb_agg(to_jsonb(r)),''[]'') from %I r where workspace_id=any($1)',t) using ids into rows;
   result:=result||jsonb_build_object(t,rows);
 end loop;
 insert into opportunity_audit_logs(actor_user_id,action) values(auth.uid(),'account_export');
 return result;
end; $$;

-- Only the owner initiates deletion; an administrator reviews the recorded
-- request. Other members cannot delete a shared workspace through privacy tools.
create function public.opportunity_delete_requested_workspace(p_request uuid,p_confirmed boolean default false) returns void language plpgsql security definer set search_path=public as $$
declare r opportunity_privacy_requests; w opportunity_workspaces;
begin
 if not app_is_platform_admin() or not p_confirmed then raise exception 'An administrator must confirm this deletion request.'; end if;
 select * into r from opportunity_privacy_requests where id=p_request and request_type='delete_workspace' and status in ('requested','processing','retention_review') for update;
 if not found then raise exception 'Workspace deletion request not found.'; end if;
 select * into w from opportunity_workspaces where id=r.workspace_id for update;
 if not found or w.owner_user_id<>r.user_id then raise exception 'The request owner no longer owns this workspace.'; end if;
 -- Keep the minimal request/audit receipt, not its deleted research content.
 update opportunity_privacy_requests set workspace_id=null,status='completed',completed_at=now() where workspace_id=w.id and request_type='delete_workspace';
 update opportunity_privacy_requests set workspace_id=null where workspace_id=w.id;
 delete from opportunity_workspaces where id=w.id;
 insert into opportunity_audit_logs(actor_user_id,action,entity_id,metadata) values(auth.uid(),'requested_workspace_deleted',w.id,jsonb_build_object('request_id',p_request));
end; $$;

create function public.opportunity_members(p_workspace uuid) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if opportunity_role(p_workspace) is null then raise exception 'Workspace access denied.'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',user_id,'email',email,'role',role)) from (
 select w.owner_user_id user_id,u.email,'owner' role from opportunity_workspaces w join auth.users u on u.id=w.owner_user_id where w.id=p_workspace
 union all select m.user_id,u.email,m.role from workspace_members m join auth.users u on u.id=m.user_id where m.workspace_id=p_workspace
 ) members),'[]');
end; $$;

-- Categorical first-party telemetry. Text, source excerpts and interview notes
-- are rejected rather than accepted through an arbitrary properties object.
create function public.opportunity_track_event(p_event text,p_properties jsonb default '{}') returns void language plpgsql security definer set search_path=public as $$
declare k text; v text;
begin
 if auth.uid() is null then return; end if;
 if p_event not in ('onboarding_completed','opportunity_impression','opportunity_saved','opportunity_dismissed','workspace_created','brief_section_viewed','evidence_added','assumption_created','experiment_created','experiment_completed','decision_finalized','stage_changed','lesson_completed','research_job_started','upgrade_started','business_listing_viewed','business_enquiry_started') then raise exception 'Unknown event.'; end if;
 if jsonb_typeof(p_properties)<>'object' or octet_length(p_properties::text)>1000 then raise exception 'Invalid event properties.'; end if;
 for k,v in select * from jsonb_each_text(p_properties) loop
   if k not in ('opportunity_id','listing_id','workspace_id','section_key','type','origin','source','rank_position','reason_code','class','decision','from','to','lesson_id','artifact_created','job_type','plan','from_plan','to_plan','trigger_feature','entry_mode','unresolved_critical_count') then raise exception 'Private or unsupported event property.'; end if;
   if length(v)>80 or v!~'^[a-zA-Z0-9_-]+$' then raise exception 'Use categorical event properties only.'; end if;
 end loop;
 -- Rate-bound direct callers without coupling a failed telemetry write to UI work.
 if (select count(*) from opportunity_events where user_id=auth.uid() and created_at>now()-interval '1 minute')>=120 then return; end if;
 insert into opportunity_events(user_id,event,properties) values(auth.uid(),p_event,p_properties);
end; $$;
create index on opportunity_events(user_id,created_at desc);
revoke all on function opportunity_save_notifications(boolean,boolean,boolean,boolean),opportunity_export_account(),opportunity_delete_requested_workspace(uuid,boolean),opportunity_members(uuid),opportunity_track_event(text,jsonb) from public,anon;
grant execute on function opportunity_save_notifications(boolean,boolean,boolean,boolean),opportunity_export_account(),opportunity_delete_requested_workspace(uuid,boolean),opportunity_members(uuid),opportunity_track_event(text,jsonb) to authenticated;
commit;
