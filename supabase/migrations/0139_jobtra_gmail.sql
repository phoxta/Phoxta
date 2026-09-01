-- 0139 — Jobtra's OWN Gmail connection (separate from Phoxta's org google_connections).
-- Reuses Phoxta's configured OAuth CLIENT (no new Google Cloud setup) but stores its
-- own tokens here. Sensitive: service-role only (the jobtra-ai edge fn), no anon policy.
create table if not exists public.jobtra_gmail_connections (
  email text primary key,
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.jobtra_gmail_connections enable row level security;
