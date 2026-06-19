-- Phoxta platform — 0053 per-tenant business profile (hours, address, contact, map).
-- Universal storefront info every vertical needs: opening hours, address, phone,
-- email, and a map location. Stored on organizations.profile (jsonb) and returned by
-- app_resolve_domain so the anon storefront can render it. Owner-editable from the
-- dashboard. Shape (all optional): { address, phone, email, mapQuery,
-- hours: [{ day, open, close, closed }] }.

alter table organizations add column if not exists profile jsonb not null default '{}'::jsonb;

drop function if exists public.app_resolve_domain(text);
create function public.app_resolve_domain(p_host text)
returns table (organization_id uuid, slug text, app_path text, site_url text, name text, branding jsonb, profile jsonb)
language sql stable security definer set search_path = public as $$
  select o.id, o.slug, o.app_path, o.site_url, o.name, coalesce(o.branding, '{}'::jsonb), coalesce(o.profile, '{}'::jsonb)
  from domains d
  join organizations o on o.id = d.organization_id
  where lower(d.hostname) = lower(p_host)
    and d.status = 'live'
  limit 1;
$$;
grant execute on function public.app_resolve_domain(text) to anon, authenticated;
