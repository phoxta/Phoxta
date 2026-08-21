-- Phoxta — 0083: make demo.<vertical>.phoxta.com a real, fully working store.
--
-- Each storefront's Vercel project owns a wildcard (*.carento.phoxta.com and
-- friends), so demo.* already SERVED the app — but app_resolve_domain matches a
-- hostname against the domains table, and no row existed for it. The result was
-- the worst of both worlds: a page that loads, with no tenant behind it, so no
-- products, no branding, and a chat widget with no agent key that fell back to
-- canned replies. A prospect clicking "see a demo" got an empty shop.
--
-- Each vertical already has a seeded demo organization reachable at
-- <slug>.<vertical>.phoxta.com. This adds demo.* as a second live hostname for
-- that same organization, so the showcase URL is the real store — same catalog,
-- same branding, same AI agent, same checkout and order tracking.
--
-- Resolved by slug rather than hardcoded UUIDs so this is portable across
-- environments, and skipped silently where a demo org does not exist.

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('carento-demo',  'demo.carento.phoxta.com'),
      ('gearo-demo',    'demo.gearo.phoxta.com'),
      ('travel-demo',   'demo.travel.phoxta.com'),
      ('aurelia-demo',  'demo.aurelia.phoxta.com'),
      ('saveur-demo',   'demo.dine.phoxta.com')
    ) as t(slug, hostname)
  loop
    insert into domains (organization_id, hostname, kind, is_primary, status, tls_status, verified_at)
    select o.id, r.hostname, 'subdomain', false, 'live', 'issued', now()
    from organizations o
    where o.slug = r.slug
    -- hostname is unique; a re-run (or a row added by the domain manager) wins.
    on conflict (hostname) do update
      set organization_id = excluded.organization_id,
          status          = 'live',
          tls_status      = 'issued',
          verified_at     = coalesce(domains.verified_at, now());
  end loop;
end $$;
