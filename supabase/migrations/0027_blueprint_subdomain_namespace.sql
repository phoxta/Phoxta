-- Phoxta platform — 0027 per-blueprint storefront subdomain namespace
-- Each storefront blueprint can issue its buyer subdomains under its OWN base
-- (which maps to a wildcard custom domain on that blueprint's Vercel project),
-- so many buyers of one blueprint each get <slug>.<base> resolving to their org.
-- niche-apparel buyers live under *.aurelia.phoxta.com (phoxta.com nameservers
-- are on Vercel, so the wildcard + TLS are managed there). Other blueprints keep
-- the historical default until they get their own wildcard/project.

alter table blueprints add column if not exists subdomain_base text;

update blueprints set subdomain_base = 'aurelia.phoxta.com' where slug = 'niche-apparel';

-- The subdomain trigger now prefers the org's blueprint subdomain_base, then the
-- app.base_domain GUC, then the historical 'phoxta.app' default.
create or replace function public.app_add_subdomain()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_base text;
begin
  if new.slug is not null then
    select b.subdomain_base into v_base from blueprints b where b.id = new.blueprint_id;
    v_base := coalesce(nullif(v_base, ''), nullif(current_setting('app.base_domain', true), ''), 'phoxta.app');
    insert into domains (organization_id, hostname, kind, is_primary, status, tls_status, verified_at)
    values (new.id, new.slug || '.' || v_base, 'subdomain', true, 'live', 'issued', now())
    on conflict (hostname) do nothing;
  end if;
  return new;
end;
$$;

-- Aurelia demo org predates this: give it resolvable hosts. The bundled Vercel
-- URL keeps serving Aurelia (by host) after we un-bake VITE_ORG_ID, and the
-- proper wildcard host resolves too. (The old aurelia-demo.phoxta.app row stays
-- but can't resolve in DNS; harmless.)
insert into domains (organization_id, hostname, kind, is_primary, status, tls_status, verified_at)
select id, 'niche-apparel.vercel.app', 'custom', false, 'live', 'issued', now()
from organizations where slug = 'aurelia-demo'
on conflict (hostname) do nothing;

insert into domains (organization_id, hostname, kind, is_primary, status, tls_status, verified_at)
select id, 'aurelia-demo.aurelia.phoxta.com', 'subdomain', true, 'live', 'issued', now()
from organizations where slug = 'aurelia-demo'
on conflict (hostname) do nothing;
