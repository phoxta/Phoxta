-- 0144 — Jobtra lockdown.
--
-- Migration 0137 granted the three Jobtra tables to `anon` with always-true
-- policies, so anyone holding the public anon key could read AND write the
-- owner's job applications, master CV and connected accounts (found by the
-- 3 Sep 2026 portfolio audit). The client-side access code never protected the
-- data; only the UI.
--
-- New model: the app exchanges the access code SERVER-SIDE (jobtra-ai `session`
-- route) for a real Supabase session belonging to the workspace owner, and the
-- tables are readable/writable only by that authenticated owner.

-- 1. Remove anonymous access entirely.
revoke all on public.jobtra_applications      from anon;
revoke all on public.jobtra_connected_accounts from anon;
revoke all on public.jobtra_base_cvs           from anon;

drop policy if exists jobtra_apps_all     on public.jobtra_applications;
drop policy if exists jobtra_accounts_all on public.jobtra_connected_accounts;
drop policy if exists jobtra_cvs_all      on public.jobtra_base_cvs;

-- 2. One owner, identified by the email on the JWT. Kept in a settings row so
--    the owner can change without touching three policies. (Table first: SQL
--    function bodies are validated at creation time.)
create table if not exists public.jobtra_settings (
  key   text primary key,
  value text not null
);
alter table public.jobtra_settings enable row level security;
revoke all on public.jobtra_settings from anon, authenticated;
insert into public.jobtra_settings (key, value)
  values ('owner_email', 'femi@phoxta.com')
  on conflict (key) do nothing;

create or replace function public.jobtra_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    lower(coalesce(auth.jwt() ->> 'email', '')) = lower(coalesce(
      (select value from public.jobtra_settings where key = 'owner_email'), 'femi@phoxta.com')),
    false)
$$;

grant select, insert, update, delete on public.jobtra_applications      to authenticated;
grant select, insert, update, delete on public.jobtra_connected_accounts to authenticated;
grant select, insert, update, delete on public.jobtra_base_cvs           to authenticated;

create policy jobtra_apps_owner on public.jobtra_applications
  for all to authenticated using (public.jobtra_is_owner()) with check (public.jobtra_is_owner());
create policy jobtra_accounts_owner on public.jobtra_connected_accounts
  for all to authenticated using (public.jobtra_is_owner()) with check (public.jobtra_is_owner());
create policy jobtra_cvs_owner on public.jobtra_base_cvs
  for all to authenticated using (public.jobtra_is_owner()) with check (public.jobtra_is_owner());

-- 3. Realtime keeps working for the owner: the subscription carries the session JWT
--    and RLS filters the change feed the same way.
