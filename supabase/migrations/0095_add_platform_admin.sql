-- Phoxta — 0095: add a second platform administrator.
--
-- Done as a migration rather than through the console UI so the roster is
-- reproducible in any environment, and so the grant is visible in history —
-- platform admins can read every customer's revenue, usage and domains, and
-- change what a customer pays. That should never be an invisible change.
--
-- Raises a NOTICE either way: the account must already exist in auth.users
-- (they have to sign up first), and silently doing nothing would look like
-- success.

do $$
declare
  v_id uuid;
  v_email text := 'adeyemioluwafemi2018@gmail.com';
begin
  select id into v_id from auth.users where lower(email) = lower(v_email);

  if v_id is null then
    raise notice '[phoxta] no account for % — they must sign up first, then re-run or add them in the console', v_email;
    return;
  end if;

  insert into platform_admins (user_id, note)
  values (v_id, 'platform administrator')
  on conflict (user_id) do update set note = 'platform administrator';

  raise notice '[phoxta] % is now a platform administrator (roster size now %)',
    v_email, (select count(*) from platform_admins);
end $$;
