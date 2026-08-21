-- Phoxta platform — 0068 Paystack billing.
-- Real payments for the two money surfaces:
--   1) Marketplace: buying a business = a one-time Paystack charge; the business
--      is provisioned by the paystack-webhook AFTER charge.success — never by the
--      client.
--   2) Platform subscription: each business runs on a monthly Paystack plan
--      (starter/growth/scale); the webhook keeps the subscriptions row in sync.
--
-- Companion edge functions: paystack-checkout (starts a transaction) and
-- paystack-webhook (signature-verified fulfilment).

-- ── purchases: tie rows to Paystack transactions ────────────────────────────
alter table purchases add column if not exists reference text;
alter table purchases add column if not exists metadata jsonb not null default '{}'::jsonb;
create unique index if not exists idx_purchases_reference on purchases(reference) where reference is not null;

-- ── subscriptions: Paystack linkage ─────────────────────────────────────────
alter table subscriptions add column if not exists paystack_customer_code text;
alter table subscriptions add column if not exists paystack_subscription_code text;
alter table subscriptions add column if not exists paystack_plan_code text;
alter table subscriptions add column if not exists paystack_email_token text;
alter table subscriptions add column if not exists updated_at timestamptz not null default now();
create unique index if not exists idx_subscriptions_ps_code
  on subscriptions(paystack_subscription_code) where paystack_subscription_code is not null;

-- ── paid provisioning (webhook-only) ────────────────────────────────────────
-- Same provisioning as app_provision_business, but: takes the buyer explicitly
-- (webhooks have no auth.uid()), UPDATES the existing pending purchase row
-- instead of inserting a new one, and is executable ONLY by service_role.
-- search_path includes `extensions`: pgcrypto (gen_random_bytes) was moved out
-- of public by the 0067 security hardening.
create or replace function public.app_provision_business_paid(
  p_user uuid, p_blueprint uuid, p_name text, p_purchase uuid
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_bp blueprints%rowtype;
  v_org_id uuid;
  v_slug text;
  v_suffix text := substr(encode(gen_random_bytes(4), 'hex'), 1, 6);
begin
  select * into v_bp from blueprints where id = p_blueprint and status = 'live';
  if not found then
    raise exception 'Blueprint not available';
  end if;

  v_slug := regexp_replace(lower(coalesce(v_bp.slug, 'business')), '[^a-z0-9]+', '-', 'g') || '-' || v_suffix;

  insert into organizations (owner_user_id, name, slug, vertical, blueprint_id, stage,
                             lifecycle_stage, app_path, modules, provisioned_at)
  values (p_user, coalesce(nullif(p_name, ''), v_bp.name), v_slug, v_bp.vertical, v_bp.id, 'active',
          'building', v_bp.app_path, coalesce(v_bp.preset, '{}'::jsonb), now())
  returning id into v_org_id;
  -- triggers fire here: owner membership + Phoxta subdomain.

  update purchases
     set organization_id = v_org_id, status = 'paid'
   where id = p_purchase;

  return v_org_id;
end;
$$;
revoke execute on function public.app_provision_business_paid(uuid, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.app_provision_business_paid(uuid, uuid, text, uuid) to service_role;

-- ── close the free-provisioning path ────────────────────────────────────────
-- Payments are live: a business may only be provisioned after a verified charge
-- (the webhook), never directly by a client. Postgres default-grants EXECUTE to
-- PUBLIC on creation, so the revoke must cover public + anon too — revoking only
-- `authenticated` left the function callable by anyone.
-- (Also repair its search_path — 0067 moved pgcrypto to `extensions`, which had
-- silently broken gen_random_bytes inside it — so it still works if service-side
-- tooling ever needs it.)
create or replace function public.app_provision_business(p_blueprint uuid, p_name text default null)
returns uuid
language plpgsql security definer set search_path = public, extensions as $$
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

  insert into purchases (buyer_user_id, blueprint_id, organization_id, amount_cents, currency, status)
  values (v_uid, v_bp.id, v_org_id, v_bp.price_cents, v_bp.currency, 'pending');

  return v_org_id;
end;
$$;
revoke execute on function public.app_provision_business(uuid, text) from public, anon, authenticated;
grant execute on function public.app_provision_business(uuid, text) to service_role;
