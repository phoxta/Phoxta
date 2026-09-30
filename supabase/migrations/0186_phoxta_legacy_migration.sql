begin;
create table public.opportunity_migration_reports (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),record_type text not null,
 source_id text not null,target_id uuid,status text not null,report jsonb not null,created_at timestamptz not null default now()
);
alter table opportunity_migration_reports enable row level security;
revoke all on opportunity_migration_reports from anon,authenticated;
grant select on opportunity_migration_reports to authenticated;
create policy own_report on opportunity_migration_reports for select to authenticated using(user_id=auth.uid());
create function public.opportunity_legacy_preview() returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in to review your migration.'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'title',i.title,'already_migrated',exists(select 1 from opportunity_workspaces w where w.legacy_idea_id=i.id),
   'mapping','Original inputs retained; generated analysis becomes legacy_ai_hypothesis. No evidence or validation is inferred.','original_preserved',true))
   from ideas i where i.user_id=auth.uid()),'[]');
end; $$;
create function public.opportunity_import_legacy(p_idea uuid,p_confirmed boolean default false) returns jsonb language plpgsql security definer set search_path=public as $$
declare i ideas;v_org uuid;v_id uuid;v_state text;v_limit integer;v_entry record;v_report jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in to continue.'; end if;
 select * into i from ideas where id=p_idea and user_id=auth.uid() for update;
 if not found then raise exception 'Legacy record not found.'; end if;
 v_report:=jsonb_build_object('source_id',i.id,'title',i.title,'version','phoxta-2.0-v1','original_preserved',true,'ai_label','legacy_ai_hypothesis');
 if not p_confirmed then return v_report || '{"preview":true}'::jsonb; end if;
 select id into v_id from opportunity_workspaces where legacy_idea_id=i.id;
 if v_id is not null then return jsonb_build_object('id',v_id,'already_migrated',true); end if;
 v_org:=opportunity_ensure_account();perform pg_advisory_xact_lock(hashtextextended(v_org::text,1));
 v_limit:=(opportunity_limits(v_org)->>'active')::integer;
 v_state:=case when i.status='archived' then 'archived' when v_limit is not null and (select count(*) from opportunity_workspaces where org_id=v_org and lifecycle_state not in ('paused','rejected','archived'))>=v_limit then 'paused' else 'investigating' end;
 insert into opportunity_workspaces(org_id,owner_user_id,legacy_idea_id,title,thesis,origin,lifecycle_state,legacy,migration_version)
 values(v_org,auth.uid(),i.id,left(i.title,180),coalesce(i.idea_seed,''),'legacy_idea',v_state,to_jsonb(i),'phoxta-2.0-v1') returning id into v_id;
 insert into brief_sections(workspace_id,section_key,content,updated_by) values(v_id,'thesis',jsonb_build_object('text',coalesce(i.idea_seed,''),'kind','inferred','evidence_ids','[]'::jsonb),auth.uid());
 for v_entry in select * from jsonb_each(coalesce(i.ai_profile,'{}')) loop
   insert into evidence_items(workspace_id,evidence_type,claim,interpretation,confidence_label,created_by)
   values(v_id,'legacy_ai_hypothesis',left('Legacy AI analysis ('||v_entry.key||'): '||v_entry.value::text,12000),'Imported generated analysis; original full record retained in migration backup. Not verified evidence.','hypothesis',auth.uid());
 end loop;
 insert into opportunity_migration_reports(user_id,record_type,source_id,target_id,status,report) values(auth.uid(),'legacy_idea',i.id::text,v_id,'imported',v_report);
 insert into opportunity_audit_logs(actor_user_id,org_id,action,entity_id) values(auth.uid(),v_org,'legacy_import',v_id);
 return jsonb_build_object('id',v_id,'state',v_state);
end; $$;

-- Reliable learning credit requires an artifact, not a topical resemblance.
-- Old progress remains attached to its original lessons and is never deleted.
create function public.ss_opportunity_migration_preview(p_org uuid) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if not app_is_platform_admin() then raise exception 'Platform administrator required.'; end if;
 return jsonb_build_object('organization_id',p_org,'migration_version','phoxta-2.0-school-v1','deletes_originals',false,
 'records',coalesce((select jsonb_agg(jsonb_build_object('user_id',p.user_id,'lesson_id',p.lesson_id,'completed_at',p.completed_at,
 'action',case when exists(select 1 from opportunity_school_progress o where o.user_id=p.user_id and 'v2-'||o.module_id||'-practice'=p.lesson_id) then 'retain_verified_artifact_credit' else 'preserve_legacy_progress_for_review' end))
 from cs_lesson_progress p where p.organization_id=p_org),'[]'));
end; $$;
revoke all on function opportunity_legacy_preview(),opportunity_import_legacy(uuid,boolean),ss_opportunity_migration_preview(uuid) from public,anon;
grant execute on function opportunity_legacy_preview(),opportunity_import_legacy(uuid,boolean),ss_opportunity_migration_preview(uuid) to authenticated;
commit;
