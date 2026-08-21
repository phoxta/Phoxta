-- Phoxta — 0091: the platform admin roster is the owner's, not everyone's.
--
-- 0090 seeded platform_admins from `select distinct owner_user_id from
-- organizations` so the console would be reachable immediately. That was too
-- generous: anyone who owns a business — including a CUSTOMER who bought a
-- blueprint — would have been handed cross-tenant reads over every other
-- customer's revenue, token spend and domains. Convenience at setup time is not
-- a reason to widen who can see the whole platform.
--
-- Restricted to the account that owns Phoxta, with an explicit way to add
-- others. Membership is now only ever granted by an existing admin.

-- 1. Make sure the owner is on the roster before anyone is removed, so this
--    cannot lock everybody out.
insert into platform_admins (user_id, note)
select u.id, 'platform owner'
from auth.users u
where lower(u.email) = 'femi@phoxta.com'
on conflict (user_id) do update set note = 'platform owner';

-- 2. Drop the over-broad seed. Guarded: if the owner lookup above found nobody
--    (different email in this environment), delete nothing rather than empty the
--    table and lock the console.
delete from platform_admins
where note = 'seeded from existing business ownership'
  and exists (select 1 from platform_admins where note = 'platform owner');

-- ── Managing the roster ────────────────────────────────────────────────────
-- Add and remove are admin-only and go through RPCs, so the client never needs
-- write access to the table itself.

create or replace function public.app_platform_admins()
returns table (user_id uuid, email text, note text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.user_id, u.email::text, a.note, a.created_at
  from platform_admins a
  join auth.users u on u.id = a.user_id
  where public.app_is_platform_admin()
  order by a.created_at;
$$;
grant execute on function public.app_platform_admins() to authenticated;

create or replace function public.app_platform_admin_add(p_email text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.app_is_platform_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not permitted.');
  end if;
  select id into v_id from auth.users where lower(email) = lower(trim(p_email));
  if v_id is null then
    -- Deliberately explicit: an admin adding a colleague needs to know the
    -- difference between "typo" and "they have not signed up yet".
    return jsonb_build_object('ok', false, 'error', 'No Phoxta account with that email. They must sign up first.');
  end if;
  insert into platform_admins (user_id, note) values (v_id, 'added by ' || coalesce(auth.uid()::text, 'admin'))
  on conflict (user_id) do nothing;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.app_platform_admin_add(text) to authenticated;

create or replace function public.app_platform_admin_remove(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.app_is_platform_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not permitted.');
  end if;
  if p_user = auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'You cannot remove yourself.');
  end if;
  -- Never let the roster reach zero, whatever the caller intends.
  if (select count(*) from platform_admins) <= 1 then
    return jsonb_build_object('ok', false, 'error', 'At least one admin must remain.');
  end if;
  delete from platform_admins where user_id = p_user;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.app_platform_admin_remove(uuid) to authenticated;

revoke all on function public.app_platform_admins() from anon;
revoke all on function public.app_platform_admin_add(text) from anon;
revoke all on function public.app_platform_admin_remove(uuid) from anon;
