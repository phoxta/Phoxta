begin;
create function public.opportunity_claim_research() returns jsonb language plpgsql security definer set search_path=public as $$
declare j research_jobs;
begin
 update research_jobs set status='failed',error='{"message":"Research stopped after its final worker lease expired."}',finished_at=now(),lease_token=null,lease_expires_at=null
 where status in ('queued','planning','fetching','extracting','synthesizing') and attempts>=max_attempts and (lease_expires_at is null or lease_expires_at<now());
 select * into j from research_jobs where status in ('queued','planning','fetching','extracting','synthesizing') and attempts<max_attempts
   and (lease_expires_at is null or lease_expires_at<now()) order by created_at for update skip locked limit 1;
 if not found then return null; end if;
 update research_jobs set lease_token=gen_random_uuid(),lease_expires_at=now()+interval '5 minutes',attempts=attempts+1,
   status='planning',started_at=coalesce(started_at,now()),error=null where id=j.id returning * into j;
 return to_jsonb(j);
end; $$;
create function public.opportunity_research_stage(p_job uuid,p_lease uuid,p_status text,p_cost numeric default 0) returns void language plpgsql security definer set search_path=public as $$
declare j research_jobs;
begin
 select * into j from research_jobs where id=p_job and lease_token=p_lease and lease_expires_at>now() and status not in ('cancelled','completed','review_required','failed') for update;
 if not found then raise exception 'Research lease expired or job cancelled.'; end if;
 if p_status not in ('planning','fetching','extracting','synthesizing') then raise exception 'Invalid research stage.'; end if;
 if p_cost<0 or j.cost_usd+p_cost>j.max_cost_usd then raise exception 'Research cost budget exceeded.'; end if;
 update research_jobs set status=p_status,cost_usd=cost_usd+p_cost,lease_expires_at=now()+interval '5 minutes' where id=p_job;
end; $$;
create function public.opportunity_finish_research(p_job uuid,p_lease uuid,p_sources jsonb,p_artifact jsonb,p_error text default null) returns void language plpgsql security definer set search_path=public as $$
declare j research_jobs;s jsonb;v_source uuid;v_evidence uuid;v_count integer:=0;v_org uuid;v_map jsonb:='{}';v_artifact jsonb;v_claims jsonb:='[]';v_claim jsonb;v_refs jsonb;
begin
 select * into j from research_jobs where id=p_job and lease_token=p_lease and lease_expires_at>now() and status not in ('cancelled','completed','review_required','failed') for update;
 if not found then raise exception 'Research lease expired or job cancelled.'; end if;
 if p_error is not null then
   update research_jobs set status='failed',error=jsonb_build_object('message',left(p_error,400)),finished_at=now(),lease_token=null,lease_expires_at=null where id=p_job;
   return;
 end if;
 if p_sources is null or jsonb_typeof(p_sources)<>'array' or jsonb_array_length(p_sources)>j.max_sources then raise exception 'Source budget exceeded.'; end if;
 select org_id into v_org from opportunity_workspaces where id=j.workspace_id;
 perform pg_advisory_xact_lock(hashtextextended(v_org::text,1));
 for s in select * from jsonb_array_elements(p_sources) loop
   insert into sources(workspace_id,canonical_url,title,publisher,source_type,published_at,retrieved_at,geography,metadata)
   values(j.workspace_id,s->>'url',s->>'title',s->>'publisher','search_result',nullif(s->>'published_at','')::timestamptz,now(),coalesce(j.query_plan->>'geography',''),jsonb_build_object('retrieval','provider_snippet','research_job_id',j.id))
   on conflict(workspace_id,md5(canonical_url)) where canonical_url is not null do update set retrieved_at=now() returning id into v_source;
   select id into v_evidence from evidence_items where workspace_id=j.workspace_id and source_id=v_source and claim=s->>'excerpt' limit 1;
   if v_evidence is null then
     perform opportunity_assert_limit(v_org,'evidence',(select count(*)::integer from evidence_items where workspace_id=j.workspace_id));
     insert into evidence_items(id,workspace_id,source_id,evidence_type,claim,excerpt_short,interpretation,geography,confidence_label,created_by)
     values((s->>'evidence_id')::uuid,j.workspace_id,v_source,'external',s->>'excerpt',left(s->>'excerpt',1000),'Search-result excerpt; review the original source before relying on this claim.',coalesce(j.query_plan->>'geography',''),'unknown',j.requested_by) returning id into v_evidence;
   end if;
   v_map:=v_map||jsonb_build_object(s->>'evidence_id',v_evidence);
   v_count:=v_count+1;
 end loop;
 -- A refresh often rediscovers existing evidence. Remap generated references
 -- to the durable IDs instead of persisting IDs that were never inserted.
 for v_claim in select * from jsonb_array_elements(coalesce(p_artifact->'claims','[]')) loop
   select coalesce(jsonb_agg(v_map->ref),'[]') into v_refs from jsonb_array_elements_text(coalesce(v_claim->'evidence_ids','[]')) as refs(ref) where v_map ? ref;
   if v_claim->>'kind'='sourced' and (jsonb_array_length(v_refs)=0 or jsonb_array_length(v_refs)<>jsonb_array_length(v_claim->'evidence_ids')) then
     raise exception 'Research contains a claim without valid workspace evidence.';
   end if;
   v_claims:=v_claims||jsonb_build_array(v_claim||jsonb_build_object('evidence_ids',v_refs));
 end loop;
 v_artifact:=p_artifact||jsonb_build_object('claims',v_claims);
 insert into research_artifacts(workspace_id,research_job_id,artifact_type,content,model_metadata)
 values(j.workspace_id,j.id,'research_review',v_artifact,jsonb_build_object('source_count',v_count,'human_review_required',true));
 update research_jobs set status='review_required',finished_at=now(),lease_token=null,lease_expires_at=null where id=p_job;
 insert into opportunity_notifications(user_id,type,title,href) values(j.requested_by,'research_completed','Your research is ready for source review.','/app/opportunities/'||j.workspace_id||'/market');
end; $$;
revoke all on function opportunity_claim_research(),opportunity_research_stage(uuid,uuid,text,numeric),opportunity_finish_research(uuid,uuid,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function opportunity_claim_research(),opportunity_research_stage(uuid,uuid,text,numeric),opportunity_finish_research(uuid,uuid,jsonb,jsonb,text) to service_role;
commit;
