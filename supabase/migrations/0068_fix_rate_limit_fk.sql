-- Phoxta platform — 0068 fix a regression introduced by 0067's rate limiting.
--
-- anon_rate_limit.organization_id carried a FK to organizations(id), and
-- app_validate_promo calls app_rate_limited BEFORE any org-existence check (the
-- original function never had one). A request naming an unknown org therefore
-- hit a 23503 foreign-key violation and surfaced a raw Postgres error to the
-- anon caller, instead of the graceful {"valid": false, "message": "Invalid code"}.
--
-- Two changes, so the counter is safe to call from anywhere:
--   1. Drop the FK. This table holds ephemeral counters, not referential data;
--      rows are already reaped by the time-based cleanup in app_rate_limited, so
--      a dangling org id is harmless and no longer aborts the caller.
--   2. Give app_validate_promo the same "unknown business" guard the other anon
--      RPCs have, so it fails as a normal invalid-code result.

alter table anon_rate_limit drop constraint if exists anon_rate_limit_organization_id_fkey;

create or replace function public.app_validate_promo(p_org uuid, p_code text, p_subtotal_cents int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v promo_codes%rowtype; v_disc int;
begin
  -- Unknown org: behave exactly like an unknown code (don't leak existence).
  if not exists (select 1 from organizations where id = p_org) then
    return jsonb_build_object('valid', false, 'message', 'Invalid code');
  end if;
  if public.app_rate_limited('promo', p_org, 20, interval '1 hour') then
    return jsonb_build_object('valid', false, 'message', 'Too many attempts. Please try again later.');
  end if;
  select * into v from promo_codes
    where organization_id = p_org and lower(code) = lower(trim(p_code)) and active = true limit 1;
  if not found then return jsonb_build_object('valid', false, 'message', 'Invalid code'); end if;
  if v.expires_at is not null and v.expires_at < now() then return jsonb_build_object('valid', false, 'message', 'This code has expired'); end if;
  if coalesce(p_subtotal_cents, 0) < v.min_cents then return jsonb_build_object('valid', false, 'message', 'Order total is below this code''s minimum'); end if;
  if v.kind = 'percent' then v_disc := (coalesce(p_subtotal_cents, 0) * least(100, greatest(0, v.value))) / 100;
  else v_disc := least(coalesce(p_subtotal_cents, 0), greatest(0, v.value)); end if;
  return jsonb_build_object('valid', true, 'kind', v.kind, 'value', v.value, 'discount_cents', v_disc, 'code', v.code);
end; $$;
grant execute on function public.app_validate_promo(uuid, text, int) to anon, authenticated;
