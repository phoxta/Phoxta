-- Transactional domain commands. Authorization and limits are checked here,
-- independently of client visibility. All created records use auth.uid().
begin;
create function public.opportunity_ensure_account() returns uuid language plpgsql security definer set search_path=public as $$
declare v_org uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to continue.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select org_id into v_org from opportunity_accounts where user_id=auth.uid();
 if v_org is null then
   insert into organizations(owner_user_id,name,metadata) values(auth.uid(),'My opportunity workspace','{"opportunity_only":true}') returning id into v_org;
   insert into opportunity_accounts(user_id,org_id) values(auth.uid(),v_org);
 end if;
 return v_org;
end; $$;

create function public.opportunity_limits(p_org uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select p.limits || coalesce((select o.limits from opportunity_entitlement_overrides o where o.org_id=p_org and (o.expires_at is null or o.expires_at>now())),'{}'::jsonb)
 from opportunity_accounts a join opportunity_plan_limits p on p.plan_key=a.plan_key where a.org_id=p_org;
$$;

create function public.opportunity_assert_limit(p_org uuid,p_feature text,p_count integer) returns void language plpgsql security definer set search_path=public as $$
declare v_limit integer; v_limits jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_org::text,1));
 v_limits:=opportunity_limits(p_org);
 if v_limits is null or not(v_limits ? p_feature) then raise exception 'Plan settings are unavailable.'; end if;
 v_limit:=(v_limits->>p_feature)::integer;
 if v_limit is not null and p_count>=v_limit then raise exception 'Your plan limit for % has been reached. Existing work remains available.',p_feature; end if;
end; $$;

create function public.opportunity_consume(p_org uuid,p_feature text) returns void language plpgsql security definer set search_path=public as $$
declare v_period date:=date_trunc('month',now())::date; v_count integer; v_limits jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_org::text,1));
 v_limits:=opportunity_limits(p_org);
 if p_feature='experiments' and v_limits->>'experiment_period'='lifetime' then v_period:='1970-01-01'; end if;
 select quantity into v_count from opportunity_usage where org_id=p_org and feature_key=p_feature and period_start=v_period;
 perform opportunity_assert_limit(p_org,p_feature,coalesce(v_count,0));
 insert into opportunity_usage values(p_org,p_feature,v_period,1) on conflict(org_id,feature_key,period_start) do update set quantity=opportunity_usage.quantity+1;
end; $$;

create function public.opportunity_command(p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public as $$
declare
 v_user uuid:=auth.uid(); v_org uuid; v_workspace uuid; v_id uuid; v_source uuid;
 v_role text; v_result jsonb:='{}'; v_limits jsonb; v_current text; v_next text; v_version integer;
 v_snapshot jsonb; v_row opportunity_workspaces; v_global global_opportunities;
 v_claim jsonb; v_ref text; v_ids uuid[]; v_profile discovery_profiles;
begin
 if v_user is null then raise exception 'Sign in to continue.'; end if;
 if jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>131072 then raise exception 'Invalid request.'; end if;
 v_org:=opportunity_ensure_account();
 v_workspace:=nullif(p_data->>'workspace_id','')::uuid;
 if v_workspace is not null then
   v_role:=opportunity_role(v_workspace);
   if v_role is null then raise exception 'Opportunity not found or access denied.'; end if;
   select * into v_row from opportunity_workspaces where id=v_workspace for update;
   v_org:=v_row.org_id;
   if v_role='viewer' and p_action not in ('export','school_complete') then raise exception 'This workspace is read-only.'; end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(v_org::text,1));
 v_limits:=opportunity_limits(v_org);
 case p_action
 when 'profile' then
   insert into discovery_profiles(user_id,goals,skills,industries,markets,models,advantages,hours_weekly,capital_band,complexity,entry_mode,onboarding_step,completed_at)
   values(v_user,
     array(select jsonb_array_elements_text(coalesce(p_data->'goals','[]'))),array(select jsonb_array_elements_text(coalesce(p_data->'skills','[]'))),
     array(select jsonb_array_elements_text(coalesce(p_data->'industries','[]'))),array(select jsonb_array_elements_text(coalesce(p_data->'markets','[]'))),
     array(select jsonb_array_elements_text(coalesce(p_data->'models','[]'))),array(select jsonb_array_elements_text(coalesce(p_data->'advantages','[]'))),
     nullif(p_data->>'hours_weekly','')::numeric,coalesce(p_data->>'capital_band',''),coalesce(p_data->>'complexity',''),coalesce(p_data->>'entry_mode','browse'),coalesce(p_data->>'onboarding_step','intent'),
     case when p_data->>'complete'='true' then now() end)
   on conflict(user_id) do update set goals=excluded.goals,skills=excluded.skills,industries=excluded.industries,markets=excluded.markets,models=excluded.models,advantages=excluded.advantages,hours_weekly=excluded.hours_weekly,capital_band=excluded.capital_band,complexity=excluded.complexity,entry_mode=excluded.entry_mode,onboarding_step=excluded.onboarding_step,completed_at=coalesce(excluded.completed_at,discovery_profiles.completed_at),updated_at=now();
   if p_data->>'complete'='true' then
     insert into user_profiles(user_id,onboarding_completed,onboarding_completed_at) values(v_user,true,now()) on conflict(user_id) do update set onboarding_completed=true,onboarding_completed_at=now();
   end if;
 when 'save' then
   v_id:=(p_data->>'opportunity_id')::uuid;
   if not exists(select 1 from global_opportunities where id=v_id and status='published') then raise exception 'Opportunity is not published.'; end if;
   if not exists(select 1 from saved_opportunities where user_id=v_user and global_opportunity_id=v_id) then
     perform opportunity_assert_limit(v_org,'saved',(select count(*)::integer from saved_opportunities where user_id=v_user));
     insert into saved_opportunities(user_id,global_opportunity_id) values(v_user,v_id);
   end if;
 when 'unsave' then delete from saved_opportunities where user_id=v_user and global_opportunity_id=(p_data->>'opportunity_id')::uuid;
 when 'feedback' then
   insert into opportunity_feedback(user_id,global_opportunity_id,action,reason_code) values(v_user,(p_data->>'opportunity_id')::uuid,coalesce(p_data->>'action','dismiss'),coalesce(p_data->>'reason_code','not_for_me'))
   on conflict(user_id,global_opportunity_id) do update set action=excluded.action,reason_code=excluded.reason_code;
 when 'create' then
   perform opportunity_assert_limit(v_org,'active',(select count(*)::integer from opportunity_workspaces where org_id=v_org and lifecycle_state not in ('paused','rejected','archived')));
   if p_data->>'origin'='global' then
     select * into v_global from global_opportunities where id=(p_data->>'opportunity_id')::uuid and status='published';
     if not found then raise exception 'Opportunity is not published.'; end if;
     insert into opportunity_workspaces(org_id,owner_user_id,global_opportunity_id,title,thesis,origin,geography,origin_snapshot)
       values(v_org,v_user,v_global.id,v_global.title,v_global.thesis,'global',v_global.geography,to_jsonb(v_global)) returning id into v_workspace;
     insert into brief_sections(workspace_id,section_key,content,updated_by)
     select v_workspace,key,jsonb_build_object('text',value,'kind','inferred','evidence_ids','[]'::jsonb),v_user
     from jsonb_each_text(jsonb_build_object('customer',v_global.customer,'problem',v_global.problem,'why_now',v_global.why_now,'risks',v_global.key_uncertainty)) where length(trim(value))>0;
     insert into sources(workspace_id,canonical_url,title,publisher,source_type,published_at,retrieved_at,geography,metadata)
     select v_workspace,s->>'url',s->>'title',coalesce(s->>'publisher',''),'editorial_reference',nullif(s->>'published_at','')::timestamptz,
       coalesce(nullif(s->>'retrieved_at','')::timestamptz,now()),coalesce(s->>'geography',v_global.geography),jsonb_build_object('global_opportunity_id',v_global.id,'published_at',v_global.published_at)
     from jsonb_array_elements(v_global.public_sources) s
     on conflict(workspace_id,md5(canonical_url)) where canonical_url is not null do nothing;
   else
     insert into opportunity_workspaces(org_id,owner_user_id,title,thesis,origin,geography)
       values(v_org,v_user,trim(p_data->>'title'),coalesce(p_data->>'thesis',''),p_data->>'origin',coalesce(p_data->>'geography','')) returning id into v_workspace;
   end if;
   insert into brief_sections(workspace_id,section_key,content,updated_by)
   select v_workspace,'thesis',jsonb_build_object('text',w.thesis,'kind','inferred','evidence_ids','[]'::jsonb),v_user from opportunity_workspaces w where w.id=v_workspace;
   v_result:=jsonb_build_object('id',v_workspace);
 when 'brief' then
   if v_workspace is null then raise exception 'Choose an opportunity.'; end if;
   if not(p_data->>'section_key'=any(array['thesis','problem','customer','context','alternatives','why_now','market','competition','business_model','distribution','risks','validation'])) then raise exception 'Unknown brief section.'; end if;
   v_claim:=p_data->'content';
   if coalesce(v_claim->>'kind','') not in ('known','inferred','unknown') or coalesce(length(trim(v_claim->>'text')),0)=0 then raise exception 'Provide text and a knowledge label.'; end if;
   v_ids:=array(select jsonb_array_elements_text(coalesce(v_claim->'evidence_ids','[]'))::uuid);
   if exists(select 1 from unnest(v_ids) ref where not exists(select 1 from evidence_items e where e.id=ref and e.workspace_id=v_workspace)) then raise exception 'Evidence belongs to another workspace or does not exist.'; end if;
   if v_claim->>'kind'='known' and not exists(select 1 from evidence_items e where e.id=any(v_ids) and e.evidence_type not in ('ai_hypothesis','legacy_ai_hypothesis','user_note')) then raise exception 'Known claims require observed evidence; AI text and notes are hypotheses.'; end if;
   select version into v_version from brief_sections where workspace_id=v_workspace and section_key=p_data->>'section_key';
   if coalesce(v_version,0)<>coalesce((p_data->>'version')::integer,0) then raise exception 'This section changed. Reload before saving.'; end if;
   insert into brief_section_versions(workspace_id,section_key,content,version) select workspace_id,section_key,content,version from brief_sections where workspace_id=v_workspace and section_key=p_data->>'section_key';
   insert into brief_sections(workspace_id,section_key,content,version,updated_by) values(v_workspace,p_data->>'section_key',v_claim,coalesce(v_version,0)+1,v_user)
     on conflict(workspace_id,section_key) do update set content=excluded.content,version=excluded.version,updated_by=v_user,updated_at=now();
   if p_data->>'section_key'='thesis' then update opportunity_workspaces set thesis=v_claim->>'text' where id=v_workspace; end if;
 when 'evidence' then
   if v_workspace is null then raise exception 'Choose an opportunity.'; end if;
   perform opportunity_assert_limit(v_org,'evidence',(select count(*)::integer from evidence_items where workspace_id=v_workspace));
   if nullif(trim(p_data->>'source_title'),'') is not null then
     insert into sources(workspace_id,canonical_url,title,publisher,source_type,published_at,geography)
       values(v_workspace,nullif(p_data->>'url',''),p_data->>'source_title',coalesce(p_data->>'publisher',''),coalesce(p_data->>'source_type','user_reference'),nullif(p_data->>'published_at','')::timestamptz,coalesce(p_data->>'geography',''))
       on conflict(workspace_id,md5(canonical_url)) where canonical_url is not null do update set title=excluded.title returning id into v_source;
   end if;
   if exists(select 1 from evidence_items where workspace_id=v_workspace and lower(trim(claim))=lower(trim(p_data->>'claim')) and evidence_type=p_data->>'evidence_type') then raise exception 'This evidence is already recorded.'; end if;
   insert into evidence_items(workspace_id,source_id,evidence_type,claim,excerpt_short,interpretation,geography,observed_at,confidence_label,created_by)
     values(v_workspace,v_source,p_data->>'evidence_type',trim(p_data->>'claim'),coalesce(p_data->>'excerpt_short',''),coalesce(p_data->>'interpretation',''),coalesce(p_data->>'geography',''),coalesce(nullif(p_data->>'observed_at','')::timestamptz,now()),
       case when p_data->>'evidence_type' in ('ai_hypothesis','legacy_ai_hypothesis') then 'hypothesis' else coalesce(p_data->>'confidence_label','unknown') end,v_user) returning id into v_id;
   v_result:=jsonb_build_object('id',v_id);
 when 'link_evidence' then
   insert into evidence_links(workspace_id,evidence_id,assumption_id,relation) values(v_workspace,(p_data->>'evidence_id')::uuid,(p_data->>'assumption_id')::uuid,p_data->>'relation') on conflict do nothing;
 when 'assumption' then
   if v_workspace is null then raise exception 'Choose an opportunity.'; end if;
   v_id:=nullif(p_data->>'id','')::uuid;
   if v_id is null then
     insert into assumptions(workspace_id,class,statement,importance,uncertainty,owner_user_id) values(v_workspace,p_data->>'class',trim(p_data->>'statement'),(p_data->>'importance')::integer,(p_data->>'uncertainty')::integer,v_user) returning id into v_id;
   else
     if p_data->>'status' in ('supported','contradicted') and not exists(select 1 from evidence_links l join evidence_items e on e.id=l.evidence_id where l.workspace_id=v_workspace and l.assumption_id=v_id and l.relation=case when p_data->>'status'='supported' then 'support' else 'contradict' end and e.evidence_type not in ('ai_hypothesis','legacy_ai_hypothesis','user_note')) then raise exception 'Link observed supporting or contradicting evidence before changing this status.'; end if;
     update assumptions set statement=coalesce(p_data->>'statement',statement),importance=coalesce((p_data->>'importance')::integer,importance),uncertainty=coalesce((p_data->>'uncertainty')::integer,uncertainty),status=coalesce(p_data->>'status',status) where id=v_id and workspace_id=v_workspace;
     if not found then raise exception 'Assumption not found.'; end if;
   end if;
   v_result:=jsonb_build_object('id',v_id);
 when 'experiment' then
   if v_workspace is null then raise exception 'Choose an opportunity.'; end if;
   v_id:=nullif(p_data->>'id','')::uuid;
   if v_id is null then
     perform opportunity_consume(v_org,'experiments');
     insert into experiments(workspace_id,assumption_id,type,hypothesis,method,success_criteria,ends_at,owner_user_id)
     values(v_workspace,nullif(p_data->>'assumption_id','')::uuid,p_data->>'type',trim(p_data->>'hypothesis'),coalesce(p_data->>'method',''),coalesce(p_data->>'success_criteria',''),nullif(p_data->>'ends_at','')::timestamptz,v_user) returning id into v_id;
   else
     select status into v_current from experiments where id=v_id and workspace_id=v_workspace;
     if not found then raise exception 'Experiment not found.'; end if;
     v_next:=p_data->>'status';
     if not((v_current='draft' and v_next in ('ready','cancelled')) or (v_current='ready' and v_next in ('running','cancelled')) or (v_current='running' and v_next in ('completed','inconclusive','cancelled'))) then raise exception 'Invalid experiment transition.'; end if;
     if v_next in ('ready','running') and exists(select 1 from experiments where id=v_id and (trim(method)='' or trim(success_criteria)='')) then raise exception 'Define the method and success criteria before starting.'; end if;
     if v_next in ('completed','inconclusive') and coalesce(length(trim(p_data->>'learning')),0)=0 then raise exception 'Record what you learned before closing the experiment.'; end if;
     update experiments set status=v_next,learning=coalesce(p_data->>'learning',learning),starts_at=case when v_next='running' then now() else starts_at end where id=v_id;
   end if;
   v_result:=jsonb_build_object('id',v_id);
 when 'observation' then
   insert into experiment_observations(workspace_id,experiment_id,observation,evidence_id) values(v_workspace,(p_data->>'experiment_id')::uuid,p_data->>'observation',nullif(p_data->>'evidence_id','')::uuid);
 when 'decision' then
   if v_role not in ('owner','admin') or v_role is null then raise exception 'An owner or administrator must finalise decisions.'; end if;
   if p_data->>'confirmed' is distinct from 'true' then raise exception 'Confirm the decision before finalising.'; end if;
   v_next:=p_data->>'next_state';
   if p_data->>'decision'='pause' then v_next:='paused'; elsif p_data->>'decision'='stop' then v_next:='rejected';
   elsif p_data->>'decision'='revise' then v_next:='investigating'; end if;
   if v_next not in ('investigating','unproven','testing','promising','shaping','building','launching','learning','paused','rejected') then raise exception 'Choose a valid next stage.'; end if;
   if v_row.lifecycle_state in ('paused','rejected','archived') and v_next not in ('paused','rejected') then
     perform opportunity_assert_limit(v_org,'active',(select count(*)::integer from opportunity_workspaces where org_id=v_org and lifecycle_state not in ('paused','rejected','archived')));
   end if;
   if v_next in ('shaping','building','launching') and v_limits->>'shape'='preview' then raise exception 'Your plan includes a preview of shaping. Upgrade to create shaping artifacts.'; end if;
   if v_next in ('building','launching') and v_limits->>'build'<>'full' then raise exception 'Build and Launch require a Builder or Studio plan.'; end if;
   v_snapshot:=jsonb_build_object('workspace',to_jsonb(v_row),'evidence',coalesce((select jsonb_agg(to_jsonb(e)) from evidence_items e where workspace_id=v_workspace),'[]'),
     'assumptions',coalesce((select jsonb_agg(to_jsonb(a)) from assumptions a where workspace_id=v_workspace),'[]'),
     'brief',coalesce((select jsonb_agg(to_jsonb(b)) from brief_sections b where workspace_id=v_workspace),'[]'),
     'experiments',coalesce((select jsonb_agg(to_jsonb(e)) from experiments e where workspace_id=v_workspace),'[]'));
   insert into decision_reviews(workspace_id,decision,rationale,snapshot,decided_by) values(v_workspace,p_data->>'decision',trim(p_data->>'rationale'),v_snapshot,v_user) returning id into v_id;
   update opportunity_workspaces set lifecycle_state=v_next where id=v_workspace;
   v_result:=jsonb_build_object('id',v_id);
 when 'archive' then
   if v_role not in ('owner','admin') or v_role is null then raise exception 'Only an owner or administrator can archive.'; end if;
   update opportunity_workspaces set lifecycle_state='archived' where id=v_workspace;
 when 'artifact' then
   if v_workspace is null then raise exception 'Choose an opportunity.'; end if;
   v_current:=p_data->>'artifact_type';
   if v_current in ('value_proposition','offer','positioning','business_model','mvp') and v_limits->>'shape'='preview' then raise exception 'Upgrade to save Shape artifacts.'; end if;
   if v_current in ('brand','website','workflow','crm','analytics','launch_plan','campaign','sales','onboarding','task','file') and v_limits->>'build'<>'full' then raise exception 'Build and Launch require a Builder or Studio plan.'; end if;
   v_id:=nullif(p_data->>'id','')::uuid;
   if v_id is null then
     insert into opportunity_artifacts(workspace_id,artifact_type,title,content,status,owner_user_id,due_at) values(v_workspace,v_current,p_data->>'title',p_data->'content',coalesce(p_data->>'status','draft'),v_user,nullif(p_data->>'due_at','')::timestamptz) returning id into v_id;
   else
     select version into v_version from opportunity_artifacts where workspace_id=v_workspace and id=v_id and artifact_type=v_current;
     if not found or v_version<>coalesce((p_data->>'version')::integer,0) then raise exception 'Artifact changed or was not found. Reload before saving.'; end if;
     insert into opportunity_artifact_versions(workspace_id,artifact_id,version,content) select workspace_id,id,version,content from opportunity_artifacts where id=v_id;
     update opportunity_artifacts set title=p_data->>'title',content=p_data->'content',status=coalesce(p_data->>'status',status),version=version+1,updated_at=now() where id=v_id;
   end if;
   v_result:=jsonb_build_object('id',v_id);
 when 'workflow' then
   if v_workspace is null then raise exception 'Choose an opportunity.'; end if;
   perform opportunity_assert_limit(v_org,'automations',(select count(*)::integer from agent_workflows a join opportunity_workspaces w on w.id=a.workspace_id where w.org_id=v_org));
   insert into agent_workflows(workspace_id,name,trigger,graph) values(v_workspace,p_data->>'name',p_data->'trigger',p_data->'graph') returning id into v_id;
   v_result:=jsonb_build_object('id',v_id);
 when 'research' then
   if v_workspace is null then raise exception 'Choose an opportunity.'; end if;
   select id into v_id from research_jobs where requested_by=v_user and idempotency_key=(p_data->>'idempotency_key')::uuid;
   if v_id is null then
     if length(trim(coalesce(p_data->>'question',''))) not between 1 and 4000 then raise exception 'Enter a research question between 1 and 4000 characters.'; end if;
     perform opportunity_consume(v_org,case when p_data->>'job_type'='refresh' then 'refresh' else 'research' end);
     insert into research_jobs(workspace_id,requested_by,idempotency_key,job_type,query_plan)
       values(v_workspace,v_user,(p_data->>'idempotency_key')::uuid,coalesce(p_data->>'job_type','opportunity'),jsonb_build_object('question',p_data->>'question','geography',v_row.geography)) returning id into v_id;
   end if;
   v_result:=jsonb_build_object('id',v_id);
 when 'cancel_research' then
   update research_jobs set status='cancelled',finished_at=now(),lease_token=null,lease_expires_at=null where id=(p_data->>'id')::uuid and workspace_id=v_workspace and status in ('queued','planning','fetching','extracting','synthesizing','failed');
 when 'retry_research' then
   update research_jobs set status='queued',error=null,lease_token=null,lease_expires_at=null where id=(p_data->>'id')::uuid and workspace_id=v_workspace and status='failed' and attempts<max_attempts;
   if not found then raise exception 'The retry limit was reached, or this job cannot be retried.'; end if;
 when 'member' then
   if v_role not in ('owner','admin') or v_role is null then raise exception 'Only owners and administrators manage collaborators.'; end if;
   select id into v_id from auth.users where lower(email)=lower(trim(p_data->>'email'));
   if v_id is null then raise exception 'Ask this collaborator to create a Phoxta account first.'; end if;
   if v_id=v_row.owner_user_id then raise exception 'Workspace ownership is not changed through collaboration settings.'; end if;
   if p_data->>'role'='remove' then delete from workspace_members where workspace_id=v_workspace and user_id=v_id;
   else
     if not exists(select 1 from workspace_members where workspace_id=v_workspace and user_id=v_id) then
       perform opportunity_assert_limit(v_org,'seats',1+(select count(distinct m.user_id)::integer from workspace_members m join opportunity_workspaces w on w.id=m.workspace_id where w.org_id=v_org));
     end if;
     insert into workspace_members(workspace_id,user_id,role) values(v_workspace,v_id,p_data->>'role') on conflict(workspace_id,user_id) do update set role=excluded.role;
     insert into opportunity_notifications(user_id,type,title,href) values(v_id,'team_invite','You have been invited to an opportunity workspace.','/app/opportunities/'||v_workspace);
   end if;
 when 'read_notification' then update opportunity_notifications set read_at=now() where user_id=v_user and id=(p_data->>'id')::uuid;
 when 'privacy' then
   if coalesce(p_data->>'confirmed','')<>'true' then raise exception 'Confirm your data request.'; end if;
   if p_data->>'request_type'='delete_workspace' and (v_role is null or v_role<>'owner') then raise exception 'Only the owner can request workspace deletion.'; end if;
   insert into opportunity_privacy_requests(user_id,request_type,workspace_id) values(v_user,p_data->>'request_type',v_workspace) returning id into v_id;
   v_result:=jsonb_build_object('id',v_id);
 when 'export' then
   if v_workspace is null then raise exception 'Choose an opportunity.'; end if;
   v_result:=jsonb_build_object('title',v_row.title,'thesis',v_row.thesis,'stage',v_row.lifecycle_state,'geography',v_row.geography,'exported_at',now(),'format',v_limits->>'exports');
   if v_limits->>'exports'='full' then
     v_result:=v_result || jsonb_build_object('sections',coalesce((select jsonb_agg(jsonb_build_object('section',section_key,'content',content)) from brief_sections where workspace_id=v_workspace),'[]'),
       'evidence',coalesce((select jsonb_agg(jsonb_build_object('id',id,'type',evidence_type,'claim',claim,'source_id',source_id,'observed_at',observed_at,'geography',geography)) from evidence_items where workspace_id=v_workspace),'[]'),
       'sources',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'publisher',publisher,'url',canonical_url,'published_at',published_at,'retrieved_at',retrieved_at,'geography',geography)) from sources where workspace_id=v_workspace),'[]'));
   end if;
 else raise exception 'Unsupported opportunity action.';
 end case;
 if v_workspace is not null and p_action<>'export' then update opportunity_workspaces set updated_at=now() where id=v_workspace; end if;
 insert into opportunity_audit_logs(actor_user_id,org_id,action,entity_id) values(v_user,v_org,p_action,coalesce(v_id,v_workspace));
 return v_result;
end; $$;

create function public.opportunity_account_summary() returns jsonb language plpgsql security definer set search_path=public as $$
declare v_org uuid;
begin
 v_org:=opportunity_ensure_account();
 return jsonb_build_object('account',(select jsonb_build_object('plan_key',plan_key,'billing_status',billing_status,'org_id',org_id) from opportunity_accounts where user_id=auth.uid()),'limits',opportunity_limits(v_org),
   'usage',coalesce((select jsonb_agg(jsonb_build_object('feature',feature_key,'quantity',quantity,'period_start',period_start)) from opportunity_usage where org_id=v_org and period_start in (date_trunc('month',now())::date,'1970-01-01'::date)),'[]'));
end; $$;

revoke all on function public.opportunity_ensure_account(),public.opportunity_limits(uuid),public.opportunity_assert_limit(uuid,text,integer),public.opportunity_consume(uuid,text),public.opportunity_command(text,jsonb),public.opportunity_account_summary() from public,anon,authenticated;
grant execute on function public.opportunity_command(text,jsonb),public.opportunity_account_summary() to authenticated;
commit;
