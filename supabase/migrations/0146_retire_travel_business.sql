-- Phoxta platform — 0146 retire the original travel business.
--
-- WamWam (0145) replaces it: same offering, rewritten storefront, its own
-- blueprint, tenant and *.wamwam.phoxta.com wildcard. businesses/travel has
-- been removed from the repo and its Vercel project decommissioned, so the
-- `travel` blueprint would otherwise remain in the marketplace pointing at an
-- app_path that no longer exists and a demo_url that no longer resolves.
--
-- This must be a migration rather than a one-off DELETE: 0013 inserts the
-- travel blueprint with `on conflict (slug) do update`, so any environment
-- rebuilt from migration history would resurrect it. Ordering here (after
-- 0013) is what makes the removal durable.
--
-- Safe to run: verified before writing that travel-demo held 0 orders and 0
-- reservations, and that it was the only organization on the blueprint — so
-- nothing here destroys customer data. Idempotent; a re-run is a no-op.

-- ---------------------------------------------------------------------------
-- 1. The demo tenant and everything scoped to it
-- ---------------------------------------------------------------------------
do $$
declare
  v_org uuid;
begin
  select id into v_org from organizations where slug = 'travel-demo';
  if v_org is null then
    raise notice '[retire travel] no travel-demo org — nothing to remove';
  else
    -- Delete children explicitly rather than relying on cascade rules, which
    -- differ per table (several FKs are ON DELETE SET NULL, which would leave
    -- orphaned rows behind rather than removing them).
    delete from domains          where organization_id = v_org;
    delete from reviews          where organization_id = v_org;
    delete from faqs             where organization_id = v_org;
    delete from blog_posts       where organization_id = v_org;
    delete from pricing_plans    where organization_id = v_org;
    delete from partners         where organization_id = v_org;
    delete from cms_pages        where organization_id = v_org;
    delete from products         where organization_id = v_org;
    delete from organizations    where id = v_org;
    raise notice '[retire travel] removed travel-demo org %', v_org;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. The blueprint
-- ---------------------------------------------------------------------------
do $$
declare
  v_bp uuid;
  v_orgs int;
begin
  select id into v_bp from blueprints where slug = 'travel';
  if v_bp is null then
    raise notice '[retire travel] no travel blueprint — nothing to remove';
    return;
  end if;

  -- Refuse to delete if a real buyer is still attached: archiving keeps their
  -- organization's blueprint_id valid, where a delete would break it.
  select count(*) into v_orgs from organizations where blueprint_id = v_bp;
  if v_orgs > 0 then
    update blueprints set status = 'archived' where id = v_bp;
    raise notice '[retire travel] % org(s) still reference the blueprint — archived instead of deleted', v_orgs;
  else
    delete from blueprints where id = v_bp;
    raise notice '[retire travel] deleted the travel blueprint';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Any stray hostname left pointing at the retired deployment
-- ---------------------------------------------------------------------------
delete from domains where hostname like '%.travel.phoxta.com';
