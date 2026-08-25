-- Phoxta — 0104: per-tenant public Help Center (LibreDesk-style knowledge base).
--
-- Each business writes help articles from its operating console (the
-- help-center edge function, org-member gated) and they publish on the public
-- marketing SPA at /help/:org and /help/:org/:slug. The public read path is
-- direct-from-table under RLS (status='published' only) plus the anon-safe
-- app_help_org() resolver — no function call needed to read.
--
-- Applied lazily by supabase/functions/help-center/index.ts over
-- SUPABASE_DB_URL (same pattern as platform-posts); this file is the
-- version-controlled record. Keep the two DDL blocks in sync.

create table if not exists public.help_articles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  slug text not null,
  title text not null,
  excerpt text not null default '',
  category text not null default 'General',
  hero text not null default '',
  body jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);
create index if not exists idx_help_articles_org on public.help_articles(organization_id);
alter table public.help_articles enable row level security;

-- The public help center reads published articles with the anon key; drafts
-- are only ever served through the edge function (service role) to org members.
drop policy if exists "public read published help articles" on public.help_articles;
create policy "public read published help articles" on public.help_articles
  for select using (status = 'published');
grant select on public.help_articles to anon, authenticated;

-- Resolve a business by its public slug (or id) for /help/:org. SECURITY
-- DEFINER because anon cannot read organizations; it returns only public-safe
-- fields, and only for orgs that actually have a published help article.
create or replace function public.app_help_org(p_slug text)
returns table (id uuid, name text, slug text, branding jsonb)
language sql stable security definer set search_path = public as $$
  select o.id, o.name, o.slug, coalesce(o.branding, '{}'::jsonb)
  from organizations o
  where (o.slug = lower(p_slug) or o.id::text = p_slug)
    and exists (
      select 1 from help_articles h
      where h.organization_id = o.id and h.status = 'published'
    )
  limit 1;
$$;
grant execute on function public.app_help_org(text) to anon, authenticated;
