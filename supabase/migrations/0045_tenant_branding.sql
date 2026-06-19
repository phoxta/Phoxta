-- Phoxta platform — 0045 per-tenant branding.
-- Every business (tenant) carries its own brand — logo, palette, font pairing,
-- corner radius — so many buyers of the same blueprint each look like their own
-- business. The dashboard Brand editor (and the brand-generate AI) write this; the
-- storefronts read it via app_resolve_domain and theme themselves from it.
--
-- This was first applied live out-of-band (see the removed brand-migrate function,
-- because `supabase db push` wasn't available at the time); it is captured here,
-- idempotently, so the schema is reproducible from migrations.

alter table organizations add column if not exists branding jsonb not null default '{}'::jsonb;

-- Extend the public host→tenant resolver to also return branding (logo/colours/
-- fonts are public-facing, so safe in this SECURITY DEFINER function). Return type
-- changes, so drop + recreate.
drop function if exists public.app_resolve_domain(text);
create function public.app_resolve_domain(p_host text)
returns table (organization_id uuid, slug text, app_path text, site_url text, name text, branding jsonb)
language sql stable security definer set search_path = public as $$
  select o.id, o.slug, o.app_path, o.site_url, o.name, coalesce(o.branding, '{}'::jsonb)
  from domains d
  join organizations o on o.id = d.organization_id
  where lower(d.hostname) = lower(p_host)
    and d.status = 'live'
  limit 1;
$$;
grant execute on function public.app_resolve_domain(text) to anon, authenticated;
