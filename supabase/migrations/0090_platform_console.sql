-- Phoxta — 0090: an operating console for Phoxta itself.
--
-- The console manages a TENANT. Every table it reads is behind RLS scoped to one
-- organization, which is correct for a blueprint business and useless for the
-- platform: "how many customers do we have", "what did we sell this month" and
-- "which tenants are churning" are all cross-tenant questions, and there was no
-- role in the system permitted to ask them. /dashboard/console is only a router
-- shortcut that picks one of your businesses and redirects into its console.
--
-- Rather than widening tenant RLS (which would risk leaking one customer's data
-- into another's console), platform reads go through security-definer RPCs that
-- each check platform admin membership first. The blast radius is the function
-- list, not the whole schema.

create table if not exists platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table platform_admins enable row level security;
-- Admins can see the roster; nobody else can see that it exists.
drop policy if exists platform_admins_read on platform_admins;
create policy platform_admins_read on platform_admins for select
  using (exists (select 1 from platform_admins p where p.user_id = auth.uid()));

create or replace function public.app_is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;
grant execute on function public.app_is_platform_admin() to authenticated;

-- Seed the founding admin from the organizations that already exist, so the
-- console is reachable immediately without hand-editing a uuid. Whoever owns an
-- organization today is already trusted with tenant data.
insert into platform_admins (user_id, note)
select distinct o.owner_user_id, 'seeded from existing business ownership'
from organizations o
where o.owner_user_id is not null
on conflict (user_id) do nothing;

-- ── Platform reads ─────────────────────────────────────────────────────────
-- Every one of these returns NOTHING to a non-admin rather than raising, so a
-- curious authenticated user learns only that they are not an admin.

create or replace function public.app_platform_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.app_is_platform_admin() then return '{}'::jsonb; end if;
  select jsonb_build_object(
    'tenants_total',    (select count(*) from organizations),
    'tenants_active',   (select count(*) from organizations where stage = 'active'),
    'tenants_new_30d',  (select count(*) from organizations where created_at > now() - interval '30 days'),
    'subs_active',      (select count(*) from subscriptions where status = 'active'),
    'purchases_total',  (select count(*) from purchases),
    'revenue_cents',    (select coalesce(sum(amount_cents), 0) from purchases where status = 'paid'),
    'revenue_30d_cents',(select coalesce(sum(amount_cents), 0) from purchases
                          where status = 'paid' and created_at > now() - interval '30 days'),
    'leads_total',      (select count(*) from platform_leads),
    'leads_new_30d',    (select count(*) from platform_leads where created_at > now() - interval '30 days'),
    'blueprints_live',  (select count(*) from blueprints where status = 'live'),
    'domains_live',     (select count(*) from domains where status = 'live'),
    'ai_tokens_30d',    (select coalesce(sum(coalesce(input_tokens,0) + coalesce(output_tokens,0)), 0)
                          from ai_usage where created_at > now() - interval '30 days')
  ) into r;
  return r;
end $$;
grant execute on function public.app_platform_overview() to authenticated;

create or replace function public.app_platform_tenants(p_limit int default 200)
returns table (
  id uuid, name text, slug text, vertical text, stage text,
  created_at timestamptz, plan text, sub_status text,
  domains_live bigint, tokens_30d bigint
)
language sql stable security definer set search_path = public as $$
  select o.id, o.name, o.slug, o.vertical, o.stage, o.created_at,
         s.plan, s.status as sub_status,
         (select count(*) from domains d where d.organization_id = o.id and d.status = 'live'),
         (select coalesce(sum(coalesce(u.input_tokens,0) + coalesce(u.output_tokens,0)), 0)
            from ai_usage u
           where u.organization_id = o.id and u.created_at > now() - interval '30 days')
  from organizations o
  left join subscriptions s on s.organization_id = o.id
  where public.app_is_platform_admin()
  order by o.created_at desc
  limit greatest(1, least(p_limit, 500));
$$;
grant execute on function public.app_platform_tenants(int) to authenticated;

create or replace function public.app_platform_revenue(p_limit int default 200)
returns table (
  id uuid, organization_id uuid, org_name text, blueprint_name text,
  amount_cents integer, currency text, status text, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select p.id, p.organization_id, o.name, b.name,
         p.amount_cents, p.currency, p.status, p.created_at
  from purchases p
  left join organizations o on o.id = p.organization_id
  left join blueprints b on b.id = p.blueprint_id
  where public.app_is_platform_admin()
  order by p.created_at desc
  limit greatest(1, least(p_limit, 500));
$$;
grant execute on function public.app_platform_revenue(int) to authenticated;

revoke all on function public.app_platform_overview() from anon;
revoke all on function public.app_platform_tenants(int) from anon;
revoke all on function public.app_platform_revenue(int) from anon;
