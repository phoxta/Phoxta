begin;
create or replace function public.cs_school_directory(p_org uuid)
returns table(user_id uuid,name text,email text) language plpgsql stable security definer set search_path=public as $$
begin
 perform cs_assert_staff(p_org,'people');
 return query select u.id,coalesce(nullif(p.name,''),u.raw_user_meta_data->>'full_name','School member'),u.email::text
 from auth.users u left join cs_profiles p on p.user_id=u.id and p.organization_id=p_org
 where exists(select 1 from cs_staff_assignments a where a.organization_id=p_org and a.user_id=u.id)
 or exists(select 1 from cs_entitlements e where e.organization_id=p_org and e.user_id=u.id)
 order by 2 limit 1000;
end $$;
revoke all on function public.cs_school_directory(uuid) from public,anon;
grant execute on function public.cs_school_directory(uuid) to authenticated;

-- Prevent legacy seed RPCs from silently replacing a real programme timetable.
revoke execute on function public.cs_refresh_live_schedule(uuid) from public,anon,authenticated;

-- Private transcript/recording processing must not be confused with a human
-- approved recap. Only instructors generate recaps; learners see approved ones.
alter table public.cs_live_lessons add column if not exists recap_approved boolean not null default false;
create or replace function public.cs_approve_recap(p_org uuid,p_lesson text) returns void language plpgsql security definer set search_path=public as $$
begin
 if not cs_is_live_host(p_org,p_lesson,auth.uid()) then raise exception 'Current teaching assignment required.'; end if;
 if not exists(select 1 from cs_live_lessons where organization_id=p_org and id=p_lesson and recap is not null) then raise exception 'Generate and review the recap first.'; end if;
 update cs_live_lessons set recap_approved=true where organization_id=p_org and id=p_lesson;
 perform cs_audit(p_org,'recap.approved',p_lesson);
end $$;
revoke all on function public.cs_approve_recap(uuid,text) from public,anon;
grant execute on function public.cs_approve_recap(uuid,text) to authenticated;

-- Revision saves use optimistic locking: a caller may not omit the version or
-- replace structure with JSON null. Titles and child identifiers are required.
create or replace function public.cs_validate_revision_document() returns trigger language plpgsql set search_path=public as $$
declare m jsonb;l jsonb;q jsonb; begin
 if jsonb_typeof(new.document)<>'object' or jsonb_typeof(new.document->'modules') is distinct from 'array' or length(trim(coalesce(new.document->>'title','')))<3 then raise exception 'Draft requires a title and module list.'; end if;
 if octet_length(new.document::text)>2000000 then raise exception 'Draft is too large. Upload resources as files.'; end if;
 for m in select value from jsonb_array_elements(new.document->'modules') loop
   if length(coalesce(m->>'id',''))<1 or length(trim(coalesce(m->>'title','')))<1 or jsonb_typeof(m->'lessons') is distinct from 'array' then raise exception 'Each module needs a stable ID, title and lesson list.'; end if;
   for l in select value from jsonb_array_elements(m->'lessons') loop
     if length(coalesce(l->>'id',''))<1 or length(trim(coalesce(l->>'title','')))<1 or coalesce(l->>'kind','') not in ('article','video','quiz') then raise exception 'Each lesson needs an ID, title and format.'; end if;
     if jsonb_typeof(coalesce(l->'questions','[]')) is distinct from 'array' then raise exception 'Questions must be a list.'; end if;
   end loop;
 end loop;
 return new;
end $$;
create trigger cs_validate_revision before insert or update of document on public.cs_content_revisions for each row execute function public.cs_validate_revision_document();

-- Capture the terms accepted at selection; later catalogue edits cannot silently
-- change a founder's handover or cost agreement.
alter table public.cs_launch_allocations add column if not exists accepted_terms jsonb;
create or replace function public.cs_snapshot_launch_terms() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.ownership_accepted_at is not null and (tg_op='INSERT' or new.ownership_accepted_at is distinct from old.ownership_accepted_at) then
   select jsonb_build_object('included_assets',c.included_assets,'ongoing_costs',c.ongoing_costs,'school_terms',coalesce(s.launch_terms,'')) into new.accepted_terms
   from cs_launch_catalogue c left join cs_school_settings s on s.organization_id=c.organization_id where c.organization_id=new.organization_id and c.blueprint_id=new.blueprint_id;
 end if;
 return new;
end $$;
create trigger cs_launch_terms_snapshot before insert or update on public.cs_launch_allocations for each row execute function public.cs_snapshot_launch_terms();
commit;
