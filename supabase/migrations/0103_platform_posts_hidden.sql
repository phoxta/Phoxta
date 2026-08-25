-- Phoxta 0103 — platform_posts learns 'hidden'.
--
-- The console manages the code-shipped editorial set through OVERRIDE rows
-- keyed by slug: a published row replaces the built-in on the site, and a
-- 'hidden' row takes the built-in off the site entirely. The public client
-- must know WHICH slugs are hidden (the built-in content ships in the JS
-- bundle regardless), so hidden rows remain publicly readable.
--
-- NOTE: bootstrapped idempotently by the platform-posts function over
-- SUPABASE_DB_URL; this file is the version-controlled record.

alter table public.platform_posts drop constraint if exists platform_posts_status_check;
alter table public.platform_posts add constraint platform_posts_status_check
  check (status in ('draft','published','hidden'));

drop policy if exists "public read published posts" on public.platform_posts;
create policy "public read published posts" on public.platform_posts
  for select using (status in ('published','hidden'));
