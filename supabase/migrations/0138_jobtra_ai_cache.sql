-- 0138 — Jobtra AI response cache. Deterministic Gemini results keyed by prompt
-- hash so repeats never spend free-tier quota. Written only by the jobtra-ai
-- edge function using the service role; RLS on with no anon policy keeps it
-- private (service role bypasses RLS).
create table if not exists public.jobtra_ai_cache (
  key text primary key,
  value jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.jobtra_ai_cache enable row level security;
