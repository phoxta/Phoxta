-- P S26: deterministic, planning-only workflow tests. This never invokes a
-- provider, tool, webhook, email, payment, publication or other external action.
begin;
create table public.agent_workflow_test_runs (
 id uuid primary key default gen_random_uuid(), workflow_id uuid not null references agent_workflows(id) on delete cascade,
 workspace_id uuid not null references opportunity_workspaces(id) on delete cascade,
 requested_by uuid not null references auth.users(id), input jsonb not null default '{}', result jsonb not null,
 created_at timestamptz not null default now()
);
alter table agent_workflow_test_runs enable row level security;
revoke all on agent_workflow_test_runs from anon,authenticated;
grant select on agent_workflow_test_runs to authenticated;
create policy workspace_read on agent_workflow_test_runs for select to authenticated using(opportunity_can_read(workspace_id));

create function public.opportunity_test_workflow(p_workflow uuid,p_input jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public as $$
declare w agent_workflows; v_role text; v_result jsonb; v_run uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to continue.'; end if;
 select * into w from agent_workflows where id=p_workflow for update;
 if not found then raise exception 'Workflow draft not found.'; end if;
 v_role:=opportunity_role(w.workspace_id);
 if coalesce(v_role,'') not in ('owner','admin','editor','researcher') then raise exception 'This workflow is read-only.'; end if;
 if jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>16000 then raise exception 'Use a small structured test input.'; end if;
 if jsonb_typeof(w.trigger)<>'object' or jsonb_typeof(w.graph)<>'array' or jsonb_array_length(w.graph) not between 1 and 25 then raise exception 'Workflow needs a trigger and 1 to 25 steps.'; end if;
 if exists(select 1 from jsonb_array_elements(w.graph) step where jsonb_typeof(step)<>'object') then raise exception 'Every workflow step must be structured.'; end if;
 if not exists(select 1 from jsonb_array_elements(w.graph) step where length(trim(coalesce(step->>'human_approval','')))>0) then raise exception 'Define at least one human approval point.'; end if;
 select jsonb_build_object('mode','dry_run','external_actions_executed',false,'trigger',w.trigger,'input',p_input,
   'steps',jsonb_agg(jsonb_build_object('position',n,'status','simulated','description',coalesce(step->>'steps',''),'approval_required',length(trim(coalesce(step->>'human_approval','')))>0,'output','Not executed in a dry run.'))) into v_result
 from jsonb_array_elements(w.graph) with ordinality x(step,n);
 insert into agent_workflow_test_runs(workflow_id,workspace_id,requested_by,input,result) values(w.id,w.workspace_id,auth.uid(),p_input,v_result) returning id into v_run;
 update agent_workflows set status='tested' where id=w.id;
 insert into opportunity_audit_logs(actor_user_id,org_id,action,entity_id,metadata)
 select auth.uid(),org_id,'workflow_dry_run',v_run,jsonb_build_object('workspace_id',w.workspace_id,'workflow_id',w.id) from opportunity_workspaces where id=w.workspace_id;
 return v_result || jsonb_build_object('run_id',v_run);
end; $$;
revoke all on function opportunity_test_workflow(uuid,jsonb) from public,anon;
grant execute on function opportunity_test_workflow(uuid,jsonb) to authenticated;
commit;
