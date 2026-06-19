-- Phoxta platform — 0010 businesses architecture
-- Implements the KB "businesses" model (knowledge-base/03,04). Phoxta builds every
-- business (the blueprint storefront apps in businesses/<slug>); users BUY them.
-- A purchase runs the site factory: provision a fresh tenant from the blueprint
-- (CREATE), the buyer brands/configures it (BUILD), then runs it with real
-- customers (OPERATE). Domains: a Phoxta subdomain on create + link-your-own
-- custom domain with TLS. (No user-side listing/reselling — all blueprints are
-- authored by Phoxta.)

-- ---------------------------------------------------------------------------
-- organizations: business lifecycle + site-factory/config fields
-- ---------------------------------------------------------------------------
alter table organizations
  add column if not exists lifecycle_stage text not null default 'draft'
    check (lifecycle_stage in ('draft','building','operating','archived')),
  add column if not exists app_path text,                 -- which storefront app, e.g. 'businesses/carento'
  add column if not exists site_url text,                 -- deployed storefront URL
  add column if not exists provisioned_at timestamptz,
  add column if not exists modules jsonb not null default '{}'::jsonb,    -- enabled modules + site composition + AI/automation presets
  add column if not exists ops_metrics jsonb not null default '{}'::jsonb; -- OPERATE tracking: unit economics, AI deflection, automation error rate, CSAT, ops hours

-- ---------------------------------------------------------------------------
-- blueprints: the provisioning preset the site factory copies + sale terms
-- (all authored by Phoxta; status/license/exclusivity are platform-set)
-- ---------------------------------------------------------------------------
alter table blueprints
  add column if not exists app_path text,                 -- storefront app folder, e.g. 'businesses/carento'
  add column if not exists preset jsonb not null default '{}'::jsonb,    -- {modules, ai_config, automations, content_scaffold, site_composition}
  add column if not exists license text not null default 'standard',
  add column if not exists exclusivity text;              -- e.g. geographic exclusivity on premium tiers

-- ---------------------------------------------------------------------------
-- domains: subdomain (auto on provision) + linked custom domains (verify + TLS)
-- ---------------------------------------------------------------------------
create table if not exists domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  hostname text not null unique,
  kind text not null default 'custom' check (kind in ('subdomain','custom')),
  is_primary boolean not null default false,
  status text not null default 'pending' check (status in ('pending','verifying','live','error')),
  verification_token text not null default encode(gen_random_bytes(16), 'hex'),
  dns_target text,                                         -- CNAME target the owner points at
  tls_status text not null default 'none' check (tls_status in ('none','pending','issued')),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_domains_org on domains(organization_id);

alter table domains enable row level security;
-- Org members manage their own org's domains.
create policy domains_all on domains
  for all using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- Public host resolution: a deployed storefront resolves which tenant a request
-- belongs to from its hostname. SECURITY DEFINER returns only routing info for a
-- LIVE domain (no tenant business data), so it is safe to expose to anon.
create or replace function public.app_resolve_domain(p_host text)
returns table (organization_id uuid, slug text, app_path text, site_url text, name text)
language sql stable security definer set search_path = public as $$
  select o.id, o.slug, o.app_path, o.site_url, o.name
  from domains d
  join organizations o on o.id = d.organization_id
  where lower(d.hostname) = lower(p_host)
    and d.status = 'live'
  limit 1;
$$;
grant execute on function public.app_resolve_domain(text) to anon, authenticated;

-- Auto-create the Phoxta subdomain when a business gets a slug (CREATE move).
-- Base domain is configurable via the `app.base_domain` GUC (defaults phoxta.app).
create or replace function public.app_add_subdomain()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_base text := coalesce(nullif(current_setting('app.base_domain', true), ''), 'phoxta.app');
begin
  if new.slug is not null then
    insert into domains (organization_id, hostname, kind, is_primary, status, tls_status, verified_at)
    values (new.id, new.slug || '.' || v_base, 'subdomain', true, 'live', 'issued', now())
    on conflict (hostname) do nothing;
  end if;
  return new;
end;
$$;
create trigger trg_org_subdomain
  after insert on organizations
  for each row execute function public.app_add_subdomain();

-- ---------------------------------------------------------------------------
-- Site factory: provision a fresh tenant (business) from a blueprint.
-- The CREATE move: org owned by the buyer, preset copied in, subdomain + owner
-- membership + trial subscription auto-created by their triggers, purchase logged.
-- ---------------------------------------------------------------------------
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
  values (v_uid, coalesce(nullif(p_name, ''), v_bp.name), v_slug, v_bp.vertical, v_bp.id, 'trial',
          'building', v_bp.app_path, coalesce(v_bp.preset, '{}'::jsonb), now())
  returning id into v_org_id;
  -- triggers fire here: owner membership, trial subscription, subdomain.

  insert into purchases (buyer_user_id, blueprint_id, organization_id, amount_cents, currency, status)
  values (v_uid, v_bp.id, v_org_id, v_bp.price_cents, v_bp.currency, 'pending');

  return v_org_id;
end;
$$;
grant execute on function public.app_provision_business(uuid, text) to authenticated;

-- Backfill: tag the two pre-built businesses' blueprints with their app_path so
-- the platform knows which storefront app each provisions (idempotent).
update blueprints set app_path = 'businesses/carento' where slug = 'carento' and app_path is null;
update blueprints set app_path = 'businesses/travel'  where slug = 'travel'  and app_path is null;
