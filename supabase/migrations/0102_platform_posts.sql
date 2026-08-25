-- Phoxta 0102 — platform blog posts, authored from the platform console.
--
-- Writes go through the platform-posts edge function (service role, gated on
-- platform_admins, audited). The public marketing site reads published rows
-- directly with the anon key, so RLS exposes ONLY status='published'.
--
-- NOTE: this DDL is also bootstrapped idempotently by the platform-posts
-- function itself over SUPABASE_DB_URL (db push is unavailable here); the file
-- exists so the schema is version-controlled.

create table if not exists public.platform_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  category text not null default 'playbooks' check (category in ('playbooks','tear-downs','case-studies')),
  img text not null default '/assets/imgs/pages/img-72.webp',
  hero text not null default '/assets/imgs/pages/img-168.webp',
  author text not null default 'Phoxta',
  read_minutes int not null default 6,
  body jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_posts enable row level security;

drop policy if exists "public read published posts" on public.platform_posts;
create policy "public read published posts" on public.platform_posts
  for select using (status = 'published');

grant select on public.platform_posts to anon, authenticated;
