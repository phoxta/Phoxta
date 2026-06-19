-- Phoxta platform — 0047 seed demo tenants for the restaurant + furniture blueprints.
-- Mirrors 0023 (aurelia-demo): provisions ONE real tenant per blueprint, owned by
-- the platform user, so each new storefront has a live, branded, host-resolvable
-- demo (saveur-demo.dine.phoxta.com / gearo-demo.gearo.phoxta.com). Org-insert
-- triggers add the owner membership, the wildcard subdomain (status 'live'), and the
-- starter catalogue (from blueprints.preset.catalog, set in 0046). Branding is set so
-- the storefront themes itself, proving the end-to-end per-tenant flow.
-- Idempotent: keyed on slug; re-running is a no-op.

do $$
declare
  v_uid uuid;
  rec record;
begin
  select id into v_uid from auth.users
    order by (email = 'femi@phoxta.com') desc, created_at asc
    limit 1;
  if v_uid is null then
    raise notice '[demo seed] no auth user yet — skipping';
    return;
  end if;

  for rec in
    select * from (values
      ('restaurant-orders', 'saveur-demo', 'Saveur',
       '{"name":"Saveur","tagline":"Seasonal French dining","colors":{"primary":"#7a1f2b","accent":"#c9a24a","bg":"#fbf8f3","text":"#2a2118"},"fonts":{"heading":"Playfair Display","body":"Inter"},"radius":"6px"}'::jsonb),
      ('gearo', 'gearo-demo', 'Gearo',
       '{"name":"Gearo","tagline":"Workspace, refined","colors":{"primary":"#1f6feb","accent":"#f59e0b","bg":"#ffffff","text":"#111827"},"fonts":{"heading":"Space Grotesk","body":"Inter"},"radius":"14px"}'::jsonb)
    ) as t(bp_slug, org_slug, org_name, branding)
  loop
    if not exists (select 1 from organizations where slug = rec.org_slug) then
      insert into organizations (owner_user_id, name, slug, vertical, blueprint_id, stage,
                                 lifecycle_stage, app_path, modules, branding, provisioned_at)
      select v_uid, rec.org_name, rec.org_slug, coalesce(b.vertical, 'business'), b.id, 'trial',
             'operating', b.app_path, coalesce(b.preset, '{}'::jsonb), rec.branding, now()
      from blueprints b where b.slug = rec.bp_slug;
    else
      update organizations set branding = rec.branding where slug = rec.org_slug;
    end if;
  end loop;
end $$;
