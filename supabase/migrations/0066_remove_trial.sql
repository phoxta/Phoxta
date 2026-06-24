-- Phoxta platform — 0066 remove the free-trial logic.
-- Phoxta does NOT offer a free trial: a business is owned outright (one-time
-- price) and run on a paid Phoxta plan. Previously every new organization got an
-- auto-provisioned 14-day "trialing" subscription and a 'trial' stage. This drops
-- that logic entirely.
--
-- Account creation and dashboard access are unaffected: access is gated only by
-- auth + onboarding (see src/auth/ProtectedRoute.tsx), never by subscription
-- state or org.stage (which is a cosmetic label only).

-- 1) Stop auto-provisioning a 14-day trial subscription when a business is created.
drop trigger if exists trg_org_trial_subscription on organizations;
drop function if exists public.app_add_trial_subscription();

-- 2) Remove the existing auto-created trial subscription rows ($0, 'trialing').
--    These were never real, paid plans — just the free trial we no longer offer.
delete from subscriptions where status = 'trialing';

-- 3) A subscription, when one is created (e.g. by a future paid checkout), is a
--    real plan — default to 'active', never 'trialing'. ('trialing' is left in the
--    check constraint so any external/Stripe-sourced value still validates.)
alter table subscriptions alter column status set default 'active';

-- 4) Businesses are 'active' from creation, not on a 'trial' stage.
alter table organizations alter column stage set default 'active';
update organizations set stage = 'active' where stage = 'trial';

-- 5) Provisioning a business from a blueprint no longer marks it as a trial
--    (recreated from 0010 with stage 'active' and the trial note removed).
create or replace function public.app_provision_business(p_blueprint uuid, p_name text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_bp blueprints%rowtype;
  v_org_id uuid;
  v_slug text;
  v_suffix text := substr(encode(gen_random_bytes(4), 'hex'), 1, 6);
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  select * into v_bp from blueprints where id = p_blueprint and status = 'live';
  if not found then
    raise exception 'Blueprint not available';
  end if;

  v_slug := regexp_replace(lower(coalesce(v_bp.slug, 'business')), '[^a-z0-9]+', '-', 'g') || '-' || v_suffix;

  insert into organizations (owner_user_id, name, slug, vertical, blueprint_id, stage,
                             lifecycle_stage, app_path, modules, provisioned_at)
  values (v_uid, coalesce(nullif(p_name, ''), v_bp.name), v_slug, v_bp.vertical, v_bp.id, 'active',
          'building', v_bp.app_path, coalesce(v_bp.preset, '{}'::jsonb), now())
  returning id into v_org_id;
  -- triggers fire here: owner membership + Phoxta subdomain (no trial subscription).

  insert into purchases (buyer_user_id, blueprint_id, organization_id, amount_cents, currency, status)
  values (v_uid, v_bp.id, v_org_id, v_bp.price_cents, v_bp.currency, 'pending');

  return v_org_id;
end;
$$;
grant execute on function public.app_provision_business(uuid, text) to authenticated;
