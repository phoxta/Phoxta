-- 0137 — Jobtra (femi.phoxta.com/jobtra): a personal job-application tracker.
-- Storage is one row per record with a jsonb payload, in three tables. The app
-- is a single-workspace personal tool gated by a client-side access code, so —
-- mirroring the original build's open Firestore rules — the anon role has full
-- access to exactly these three tables and nothing else.

create table if not exists public.jobtra_applications (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.jobtra_connected_accounts (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.jobtra_base_cvs (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.jobtra_applications enable row level security;
alter table public.jobtra_connected_accounts enable row level security;
alter table public.jobtra_base_cvs enable row level security;

grant all on public.jobtra_applications to anon, authenticated;
grant all on public.jobtra_connected_accounts to anon, authenticated;
grant all on public.jobtra_base_cvs to anon, authenticated;

drop policy if exists jobtra_apps_all on public.jobtra_applications;
drop policy if exists jobtra_accounts_all on public.jobtra_connected_accounts;
drop policy if exists jobtra_cvs_all on public.jobtra_base_cvs;

create policy jobtra_apps_all on public.jobtra_applications for all to anon, authenticated using (true) with check (true);
create policy jobtra_accounts_all on public.jobtra_connected_accounts for all to anon, authenticated using (true) with check (true);
create policy jobtra_cvs_all on public.jobtra_base_cvs for all to anon, authenticated using (true) with check (true);

-- Realtime (onSnapshot-equivalent) for the three tables.
do $$
begin
  begin alter publication supabase_realtime add table public.jobtra_applications; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.jobtra_connected_accounts; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.jobtra_base_cvs; exception when duplicate_object then null; end;
end $$;
