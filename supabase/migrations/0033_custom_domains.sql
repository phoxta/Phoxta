-- Phoxta platform — 0033 custom domains (bring-your-own + buy) via Vercel.
-- Each blueprint's storefront is a Vercel project; a business can attach its own
-- domain (or buy one) entirely from the Phoxta dashboard. The domain-manager edge
-- function attaches the domain to the blueprint's project, reads the required DNS
-- records / cert status from Vercel, and writes them here. app_resolve_domain then
-- routes that hostname to the business.

-- Which Vercel project hosts each blueprint's storefront (so domains attach to it).
alter table blueprints add column if not exists vercel_project_id text;
update blueprints set vercel_project_id = 'prj_LYeW0ZuZwiBOd44RgYzMLTUp9lIJ' where slug = 'niche-apparel';
update blueprints set vercel_project_id = 'prj_9jU85zCeJxLGdTkM0ZjTNWcne4Nc' where slug = 'carento';
update blueprints set vercel_project_id = 'prj_XVgHI8OIhdf9x6RYPkI0YBEtUFhc' where slug = 'travel';

-- Domain rows carry the live DNS instructions, where they came from, and (for
-- purchased domains) the registration expiry.
alter table domains add column if not exists dns_records jsonb not null default '[]'::jsonb;
alter table domains add column if not exists source text not null default 'linked';
alter table domains add column if not exists expires_at timestamptz;

-- Let the edge function resolve a business's storefront project in one read.
create or replace function public.app_org_storefront(p_org uuid)
returns table (organization_id uuid, blueprint_id uuid, vercel_project_id text, slug text)
language sql stable security definer set search_path = public as $$
  select o.id, o.blueprint_id, b.vercel_project_id, o.slug
  from organizations o
  left join blueprints b on b.id = o.blueprint_id
  where o.id = p_org
  limit 1;
$$;
grant execute on function public.app_org_storefront(uuid) to authenticated;
