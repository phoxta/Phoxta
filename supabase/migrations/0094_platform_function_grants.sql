-- Phoxta — 0094: platform functions should not be callable by anon at all.
--
-- 0090/0091/0093 each ended with `revoke all on function … from anon`. That does
-- less than it reads like: EXECUTE is granted to PUBLIC by default, and anon
-- inherits PUBLIC, so revoking the role's own (never-granted) privilege changes
-- nothing. Verified against production — an anonymous caller could invoke every
-- platform RPC, including the writes.
--
-- No data leaked and nothing mutated: each function checks
-- app_is_platform_admin() internally, so reads returned [] and writes returned
-- "Not permitted.". That check is the real control and it held. But an
-- unauthenticated caller should not be able to reach the function at all —
-- the internal check is the last line, not the only one.
--
-- Revoking from PUBLIC and granting only `authenticated` moves the refusal to
-- the door.

do $$
declare
  sig text;
begin
  foreach sig in array array[
    'public.app_is_platform_admin()',
    'public.app_platform_overview()',
    'public.app_platform_tenants(int)',
    'public.app_platform_revenue(int)',
    'public.app_platform_admins()',
    'public.app_platform_admin_add(text)',
    'public.app_platform_admin_remove(uuid)',
    'public.app_platform_leads(int)',
    'public.app_platform_lead_save(uuid, text, text)',
    'public.app_platform_blueprints()',
    'public.app_platform_blueprint_save(uuid, text, text, int, text)',
    'public.app_platform_tenant_stage(uuid, text)',
    'public.app_platform_subscription_set(uuid, text, text)',
    'public.app_platform_support_access(uuid, boolean)',
    'public.app_platform_margin(int)',
    'public.app_platform_audit(int)'
  ]
  loop
    execute format('revoke all on function %s from public, anon', sig);
    execute format('grant execute on function %s to authenticated', sig);
  end loop;
end $$;

-- app_platform_log is internal plumbing for the RPCs above; nothing outside the
-- database should be able to write audit rows directly.
revoke all on function public.app_platform_log(text, text, jsonb) from public, anon, authenticated;
