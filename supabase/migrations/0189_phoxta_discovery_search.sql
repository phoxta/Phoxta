begin;
create index global_opportunity_search on public.global_opportunities using gin(to_tsvector('english',title||' '||thesis||' '||primary_industry||' '||customer));
create function public.opportunity_search(p_query text default '',p_industry text default '',p_geography text default '',p_model text default '',p_mode text default 'browse',p_page integer default 0) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare profile discovery_profiles; result jsonb;
begin
 if p_page<0 or p_page>10000 or length(p_query)>500 or length(p_industry)>200 or length(p_geography)>200 or length(p_model)>200 then raise exception 'Invalid discovery filters.'; end if;
 if p_mode not in ('browse','for_you','saved','dismissed') then raise exception 'Invalid discovery mode.'; end if;
 select * into profile from discovery_profiles where user_id=auth.uid();
 with candidates as (
   select o.*,
   (case when lower(o.primary_industry)=any(array(select lower(x) from unnest(profile.industries) x)) then 1 else 0 end+
    case when lower(o.geography)=any(array(select lower(x) from unnest(profile.markets) x)) then 1 else 0 end+
    case when lower(o.model)=any(array(select lower(x) from unnest(profile.models) x)) then 1 else 0 end+
    case when exists(select 1 from unnest(o.skills) s where lower(s)=any(array(select lower(x) from unnest(profile.skills) x))) then 1 else 0 end) fit
   from global_opportunities o where o.status='published'
   and (p_query='' or to_tsvector('english',o.title||' '||o.thesis||' '||o.primary_industry||' '||o.customer) @@ websearch_to_tsquery('english',p_query))
   and (p_industry='' or o.primary_industry=p_industry) and (p_geography='' or o.geography=p_geography) and (p_model='' or o.model=p_model)
   and (p_mode<>'saved' or exists(select 1 from saved_opportunities s where s.user_id=auth.uid() and s.global_opportunity_id=o.id))
   and (p_mode<>'dismissed' or exists(select 1 from opportunity_feedback f where f.user_id=auth.uid() and f.global_opportunity_id=o.id and f.action='dismiss'))
   and (p_mode<>'for_you' or not exists(select 1 from opportunity_feedback f where f.user_id=auth.uid() and f.global_opportunity_id=o.id and f.action='dismiss'))
 ), page as (select * from candidates order by case when p_mode='for_you' then fit else 0 end desc,updated_at desc,id limit 24 offset p_page*24)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(p)-'fit'-'created_by') from page p),'[]'), 'total',(select count(*) from candidates), 'page',p_page,'page_size',24,
 'filters',jsonb_build_object('primary_industry',coalesce((select jsonb_agg(x order by x) from (select distinct primary_industry x from global_opportunities where status='published' and primary_industry<>'') a),'[]'),
 'geography',coalesce((select jsonb_agg(x order by x) from (select distinct geography x from global_opportunities where status='published' and geography<>'') a),'[]'),
 'model',coalesce((select jsonb_agg(x order by x) from (select distinct model x from global_opportunities where status='published' and model<>'') a),'[]'))) into result;
 return result;
end; $$;
revoke all on function opportunity_search(text,text,text,text,text,integer) from public;
grant execute on function opportunity_search(text,text,text,text,text,integer) to anon,authenticated;
commit;
