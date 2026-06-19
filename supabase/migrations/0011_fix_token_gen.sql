-- Phoxta platform — 0011 fix token/suffix generation
-- 0010 used gen_random_bytes() (pgcrypto), which on Supabase lives in the
-- `extensions` schema and is NOT on the `public` search_path our SECURITY DEFINER
-- functions and column defaults run under — so provisioning failed with
-- "function gen_random_bytes(integer) does not exist". Switch to the core
-- gen_random_uuid() (always available) for the domain verification token and the
-- provisioning slug suffix.

-- Domain ownership-verification token default (evaluated on insert).
alter table domains
  alter column verification_token set default replace(gen_random_uuid()::text, '-', '');

-- Site factory: same body as 0010, only the slug suffix source changed.
create or replace function public.app_provision_business(p_blueprint uuid, p_name text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_bp blueprints%rowtype;
  v_org_id uuid;
  v_slug text;
  v_suffix text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
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
  values (v_uid, coalesce(nullif(p_name, ''), v_bp.name), v_slug, v_bp.vertical, v_bp.id, 'trial',
          'building', v_bp.app_path, coalesce(v_bp.preset, '{}'::jsonb), now())
  returning id into v_org_id;

  insert into purchases (buyer_user_id, blueprint_id, organization_id, amount_cents, currency, status)
  values (v_uid, v_bp.id, v_org_id, v_bp.price_cents, v_bp.currency, 'pending');

  return v_org_id;
end;
$$;
grant execute on function public.app_provision_business(uuid, text) to authenticated;
