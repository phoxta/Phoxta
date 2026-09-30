begin;
create table public.business_listings (
 id uuid primary key default gen_random_uuid(),slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title text not null,thesis text not null default '',industry text not null default '',model text not null default '',complexity text not null default '',
 opportunity_id uuid references public.global_opportunities(id),blueprint_id uuid,
 package_type text not null default 'launch_kit' check(package_type in ('launch_kit','launch_system','launch_handover','exclusive_acquisition')),
 price_display text not null default 'Request details',demo_url text,availability text not null default 'enquiry' check(availability in ('available','enquiry','reserved','sold','unavailable')),
 status text not null default 'draft' check(status in ('draft','review','published','retired')),
 created_by uuid not null references auth.users(id),last_edited_by uuid not null references auth.users(id),reviewed_by uuid references auth.users(id),reviewed_at timestamptz,
 disclosures jsonb not null default '{}',terms jsonb not null default '{}',published_at timestamptz,updated_at timestamptz not null default now()
);
create table public.business_enquiries (
 id uuid primary key default gen_random_uuid(),listing_id uuid not null references public.business_listings(id),user_id uuid not null references auth.users(id),
 message text not null,status text not null default 'received',terms_version text not null,created_at timestamptz not null default now()
);
create table public.saved_businesses(user_id uuid not null references auth.users(id) on delete cascade,listing_id uuid not null references public.business_listings(id) on delete cascade,primary key(user_id,listing_id));
create table public.opportunity_taxonomy(kind text not null check(kind in ('industry','geography','model','signal')),key text not null,label text not null,active boolean not null default true,primary key(kind,key));
insert into opportunity_taxonomy values
 ('industry','services','Services',true),('industry','software','Software',true),('industry','ecommerce','Ecommerce',true),('industry','local','Local businesses',true),('industry','regulated','Regulated industries',true),
 ('signal','pain','Pain',true),('signal','demand','Demand',true),('signal','technology','Technology',true),('signal','regulatory','Regulatory',true),('signal','behaviour','Behaviour',true),('signal','supply','Supply',true),('signal','business_model','Business model',true),('signal','distribution','Distribution',true);
create table public.opportunity_signals(id uuid primary key default gen_random_uuid(),opportunity_id uuid references public.global_opportunities(id),signal_type text not null,title text not null,summary text not null,observed_at timestamptz,geography text not null,source_url text not null,status text not null default 'draft' check(status in ('draft','review','published','retired')));
alter table business_listings enable row level security;
alter table business_enquiries enable row level security;
alter table saved_businesses enable row level security;
alter table opportunity_taxonomy enable row level security;
alter table opportunity_signals enable row level security;
revoke all on business_listings,business_enquiries,saved_businesses,opportunity_taxonomy,opportunity_signals from anon,authenticated;
grant select on business_listings,opportunity_taxonomy,opportunity_signals to anon,authenticated;
grant select on business_enquiries,saved_businesses to authenticated;
create policy listing_public on business_listings for select using(status='published');
create policy listing_admin on business_listings for select to authenticated using(app_is_platform_admin());
create policy enquiries_own on business_enquiries for select to authenticated using(user_id=auth.uid() or app_is_platform_admin());
create policy saved_business_own on saved_businesses for select to authenticated using(user_id=auth.uid());
create policy taxonomy_read on opportunity_taxonomy for select using(active);
create policy signals_public on opportunity_signals for select using(status='published');

create function public.opportunity_business_action(p_action text,p_listing uuid,p_message text default '') returns uuid language plpgsql security definer set search_path=public as $$
declare v_listing business_listings; v_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to continue.'; end if;
 select * into v_listing from business_listings where id=p_listing and status='published';
 if not found then raise exception 'Listing not available.'; end if;
 if p_action='save' then insert into saved_businesses values(auth.uid(),p_listing) on conflict do nothing;
 elsif p_action='unsave' then delete from saved_businesses where user_id=auth.uid() and listing_id=p_listing;
 elsif p_action='enquire' then
   if v_listing.availability in ('sold','unavailable') then raise exception 'This package is not available.'; end if;
   if length(trim(p_message)) not between 1 and 4000 then raise exception 'Write your enquiry.'; end if;
   if exists(select 1 from business_enquiries where user_id=auth.uid() and listing_id=p_listing and created_at>now()-interval '5 minutes') then raise exception 'Your enquiry has already been received. Please allow time for a response.'; end if;
   insert into business_enquiries(listing_id,user_id,message,terms_version) values(p_listing,auth.uid(),p_message,coalesce(v_listing.terms->>'version','unpublished')) returning id into v_id;
   insert into opportunity_notifications(user_id,type,title,href) values(auth.uid(),'business_enquiry','Your business enquiry has been recorded.','/app/businesses');
 else raise exception 'Unknown listing action.';
 end if;
 return coalesce(v_id,p_listing);
end; $$;

create function public.opportunity_admin_command(p_action text,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_result jsonb:='{}';v_key text;v_row global_opportunities;v_listing business_listings;
begin
 if not coalesce(app_is_platform_admin(),false) then raise exception 'Editorial access required.'; end if;
 if octet_length(p_data::text)>131072 then raise exception 'Request is too large.'; end if;
 case p_action
 when 'overview' then
   return jsonb_build_object('opportunities',coalesce((select jsonb_agg(to_jsonb(o)) from global_opportunities o),'[]'),
    'jobs',coalesce((select jsonb_agg(jsonb_build_object('id',j.id,'status',j.status,'attempts',j.attempts,'cost_usd',j.cost_usd,'created_at',j.created_at,'error',j.error)) from (select * from research_jobs order by created_at desc limit 100) j),'[]'),
    'businesses',coalesce((select jsonb_agg(to_jsonb(b)) from business_listings b),'[]'),
    'audit',coalesce((select jsonb_agg(to_jsonb(a)) from (select * from opportunity_audit_logs order by created_at desc limit 100) a),'[]'),
    'privacy',coalesce((select jsonb_agg(to_jsonb(r)) from opportunity_privacy_requests r where status<>'completed'),'[]'),
    'taxonomy',coalesce((select jsonb_agg(to_jsonb(t)) from opportunity_taxonomy t),'[]'));
 when 'opportunity' then
   v_id:=coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid());
   insert into global_opportunities(id,slug,title,thesis,customer,problem,why_now,key_uncertainty,primary_industry,geography,model,public_sources,created_by,skills,evidence_strength)
     values(v_id,p_data->>'slug',p_data->>'title',coalesce(p_data->>'thesis',''),coalesce(p_data->>'customer',''),coalesce(p_data->>'problem',''),coalesce(p_data->>'why_now',''),coalesce(p_data->>'key_uncertainty',''),coalesce(p_data->>'primary_industry',''),coalesce(p_data->>'geography',''),coalesce(p_data->>'model',''),coalesce(p_data->'public_sources','[]'),auth.uid(),array(select jsonb_array_elements_text(coalesce(p_data->'skills','[]'))),coalesce(p_data->>'evidence_strength','hypothesis'))
     on conflict(id) do update set title=excluded.title,thesis=excluded.thesis,customer=excluded.customer,problem=excluded.problem,why_now=excluded.why_now,key_uncertainty=excluded.key_uncertainty,primary_industry=excluded.primary_industry,geography=excluded.geography,model=excluded.model,public_sources=excluded.public_sources,skills=excluded.skills,evidence_strength=excluded.evidence_strength,status='review',updated_at=now();
 when 'publish' then
   select * into v_row from global_opportunities where id=(p_data->>'id')::uuid for update;
   if not found then raise exception 'Opportunity not found.'; end if;
   if coalesce(p_data->>'confirmed','')<>'true' then raise exception 'Confirm editorial review before publishing.'; end if;
   if v_row.customer='' or v_row.problem='' or v_row.key_uncertainty='' or v_row.geography='' then raise exception 'Add customer, problem, geography and key uncertainty before publishing.'; end if;
   if jsonb_typeof(v_row.public_sources)<>'array' or jsonb_array_length(v_row.public_sources)=0 then raise exception 'Add reviewed public source records before publishing.'; end if;
   if exists(select 1 from jsonb_array_elements(v_row.public_sources) s where coalesce(s->>'url','')!~'^https?://' or coalesce(s->>'title','')='' or coalesce(s->>'publisher','')='' or coalesce(s->>'retrieved_at','')='') then raise exception 'Every source needs a URL, title, publisher and retrieval date.'; end if;
   update global_opportunities set status='published',published_at=now(),updated_at=now() where id=v_row.id;v_id:=v_row.id;
 when 'unpublish' then update global_opportunities set status='retired',updated_at=now() where id=(p_data->>'id')::uuid returning id into v_id;
 when 'business' then
   v_id:=coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid());
   insert into business_listings(id,slug,title,thesis,industry,model,complexity,package_type,price_display,demo_url,disclosures,terms,created_by,last_edited_by,availability)
   values(v_id,p_data->>'slug',p_data->>'title',coalesce(p_data->>'thesis',''),coalesce(p_data->>'industry',''),coalesce(p_data->>'model',''),coalesce(p_data->>'complexity',''),coalesce(p_data->>'package_type','launch_kit'),coalesce(p_data->>'price_display','Request details'),nullif(p_data->>'demo_url',''),coalesce(p_data->'disclosures','{}'),coalesce(p_data->'terms','{}'),auth.uid(),auth.uid(),coalesce(p_data->>'availability','enquiry'))
   on conflict(id) do update set title=excluded.title,thesis=excluded.thesis,disclosures=excluded.disclosures,terms=excluded.terms,industry=excluded.industry,model=excluded.model,complexity=excluded.complexity,package_type=excluded.package_type,price_display=excluded.price_display,demo_url=excluded.demo_url,availability=excluded.availability,last_edited_by=auth.uid(),reviewed_by=null,reviewed_at=null,status='review',updated_at=now();
 when 'publish_business' then
   select * into v_listing from business_listings where id=(p_data->>'id')::uuid for update;
   if not found then raise exception 'Business not found.'; end if;
   if auth.uid() in (v_listing.created_by,v_listing.last_edited_by) then raise exception 'A second administrator must review and publish this package.'; end if;
   if coalesce(p_data->>'confirmed','')<>'true' then raise exception 'Confirm listing review.'; end if;
   foreach v_key in array array['included_assets','dependencies','ongoing_costs','tested_evidence','untested_assumptions','licences','limitations','handover'] loop
     if coalesce(length(trim(v_listing.disclosures->>v_key)),0)=0 then raise exception 'Missing disclosure: %',v_key; end if;
   end loop;
   if coalesce(v_listing.terms->>'scope','')='' or coalesce(v_listing.terms->>'version','')='' then raise exception 'Define a versioned package scope and sale terms.'; end if;
   update business_listings set status='published',published_at=now(),reviewed_by=auth.uid(),reviewed_at=now() where id=v_listing.id;v_id:=v_listing.id;
 when 'unpublish_business' then update business_listings set status='retired' where id=(p_data->>'id')::uuid returning id into v_id;
 when 'retry' then update research_jobs set status='queued',error=null,lease_token=null,lease_expires_at=null where id=(p_data->>'id')::uuid and status='failed' and attempts<max_attempts returning id into v_id;
 when 'cancel' then update research_jobs set status='cancelled',finished_at=now(),lease_token=null where id=(p_data->>'id')::uuid and status in ('queued','planning','fetching','extracting','synthesizing') returning id into v_id;
 when 'taxonomy' then insert into opportunity_taxonomy(kind,key,label,active) values(p_data->>'kind',p_data->>'key',p_data->>'label',coalesce((p_data->>'active')::boolean,true)) on conflict(kind,key) do update set label=excluded.label,active=excluded.active;
 when 'override' then insert into opportunity_entitlement_overrides(org_id,limits,expires_at) values((p_data->>'org_id')::uuid,p_data->'limits',nullif(p_data->>'expires_at','')::timestamptz) on conflict(org_id) do update set limits=excluded.limits,expires_at=excluded.expires_at;
 else raise exception 'Unknown editorial action.';
 end case;
 insert into opportunity_audit_logs(actor_user_id,action,entity_id) values(auth.uid(),'admin_'||p_action,v_id);
 return jsonb_build_object('id',v_id);
end; $$;
revoke all on function opportunity_business_action(text,uuid,text),opportunity_admin_command(text,jsonb) from public,anon;
grant execute on function opportunity_business_action(text,uuid,text),opportunity_admin_command(text,jsonb) to authenticated;
commit;
