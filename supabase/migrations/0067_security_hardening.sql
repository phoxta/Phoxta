-- Phoxta platform — 0067 security + metering hardening.
--
-- 1. google_connections: RLS is row-level, so the member-read policy exposed the
--    OAuth access/refresh tokens to every member of the org. The old comment
--    ("the client only selects status columns") relied on client discipline, not
--    a control. Replace with column-level grants so the tokens are unreachable
--    from the anon/authenticated roles regardless of what the client asks for.
-- 2. app_org_ai_tokens_service: service-role-safe SUM for the cost cap. The edge
--    functions previously paged ai_usage rows and summed in JS, which silently
--    truncated at PostgREST's 1000-row cap — the monthly cap stopped firing for
--    any busy org. The existing member-facing RPC can't be reused because its
--    app_is_org_member() check returns false under the service role.
-- 3. Rate limiting for the unauthenticated storefront RPCs (promo brute-force,
--    contact/review/order spam).

-- 4. bookings.customer_phone: the agent's reschedule tool could only identify a
--    customer by email, so a phone-only caller (SMS / voice — the majority of
--    inbound) fell through to "most recent booking in the org" and could move
--    someone else's appointment. Storing the phone lets it scope correctly.

-- ---------------------------------------------------------------------------
-- 1. google_connections — column-level grants
-- ---------------------------------------------------------------------------
revoke select on google_connections from anon, authenticated;
-- Status columns only. access_token / refresh_token / token_expiry are omitted
-- deliberately: they are written and read exclusively by service-role edge
-- functions (google-oauth, google-gmail, google-workspace).
grant select (organization_id, email, scope, connected_by, created_at, updated_at)
  on google_connections to authenticated;

-- ---------------------------------------------------------------------------
-- 4. bookings.customer_phone — lets the agent scope a reschedule to the caller
-- ---------------------------------------------------------------------------
alter table bookings add column if not exists customer_phone text not null default '';
create index if not exists idx_bookings_phone on bookings(organization_id, customer_phone)
  where customer_phone <> '';

-- ---------------------------------------------------------------------------
-- 2. Service-role token meter (no row cap, no auth.uid() dependency)
-- ---------------------------------------------------------------------------
-- Prompt caching means input_tokens is only the UNCACHED remainder; the cache
-- write/read tokens were never recorded, so both cost_cents and the cap
-- under-reported every cached request.
alter table ai_usage add column if not exists cache_write_tokens integer not null default 0;
alter table ai_usage add column if not exists cache_read_tokens integer not null default 0;

create or replace function public.app_org_ai_tokens_service(p_org uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(input_tokens + output_tokens + cache_write_tokens + cache_read_tokens), 0)::bigint
  from ai_usage
  where organization_id = p_org
    and created_at >= date_trunc('month', now());
$$;
revoke execute on function public.app_org_ai_tokens_service(uuid) from anon, authenticated;
-- service_role only — this deliberately has no membership check.

-- Keep the member-facing meter (dashboard) consistent with enforcement.
create or replace function public.app_org_ai_tokens_this_month(p_org uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(input_tokens + output_tokens + cache_write_tokens + cache_read_tokens), 0)::bigint
  from ai_usage
  where organization_id = p_org
    and public.app_is_org_member(p_org)
    and created_at >= date_trunc('month', now());
$$;
grant execute on function public.app_org_ai_tokens_this_month(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Rate limiting for anon storefront RPCs
-- ---------------------------------------------------------------------------
create table if not exists anon_rate_limit (
  bucket text not null,
  organization_id uuid not null references organizations(id) on delete cascade,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, organization_id, window_start)
);
create index if not exists idx_anon_rate_window on anon_rate_limit(window_start);
alter table anon_rate_limit enable row level security;
-- No policies: only SECURITY DEFINER functions touch this table.

-- Fixed-window counter. Returns true when the caller is OVER the limit.
create or replace function public.app_rate_limited(p_bucket text, p_org uuid, p_limit int, p_window interval)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Integer epoch arithmetic on purpose: extract(epoch …) returns numeric on
  -- PG14+, and there is no numeric * interval operator, so the obvious
  -- date_trunc + floor(...) * p_window formulation fails at runtime.
  v_secs bigint := greatest(1, extract(epoch from p_window)::bigint);
  v_window timestamptz := to_timestamp((extract(epoch from now())::bigint / v_secs) * v_secs);
  v_hits int;
begin
  insert into anon_rate_limit (bucket, organization_id, window_start, hits)
  values (p_bucket, p_org, v_window, 1)
  on conflict (bucket, organization_id, window_start)
    do update set hits = anon_rate_limit.hits + 1
  returning hits into v_hits;

  -- Opportunistic cleanup of windows older than a day.
  delete from anon_rate_limit where window_start < now() - interval '1 day';

  return v_hits > p_limit;
end;
$$;
revoke execute on function public.app_rate_limited(text, uuid, int, interval) from anon, authenticated;

-- --- app_validate_promo: stop discount-code brute forcing -------------------
create or replace function public.app_validate_promo(p_org uuid, p_code text, p_subtotal_cents int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v promo_codes%rowtype; v_disc int;
begin
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

-- --- app_submit_contact: stop CRM/ticket spam ------------------------------
create or replace function public.app_submit_contact(p_org uuid, p_name text, p_email text, p_subject text, p_message text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_ticket uuid;
begin
  if not exists (select 1 from organizations where id = p_org) then raise exception 'Unknown business'; end if;
  if public.app_rate_limited('contact', p_org, 30, interval '1 hour') then
    raise exception 'Too many submissions. Please try again later.';
  end if;
  insert into crm_contacts (organization_id, name, email, stage, notes)
  values (p_org, coalesce(nullif(p_name,''),'Website visitor'), coalesce(p_email,''), 'lead', coalesce(p_message,''));
  insert into tickets (organization_id, subject, customer_name, customer_email, status, priority)
  values (p_org, coalesce(nullif(p_subject,''),'Website enquiry'), coalesce(p_name,''), coalesce(p_email,''), 'open', 'normal')
  returning id into v_ticket;
  return v_ticket;
end; $$;
grant execute on function public.app_submit_contact(uuid, text, text, text, text) to anon, authenticated;

-- --- app_submit_review: stop review spam (still moderated as 'pending') -----
create or replace function public.app_submit_review(p_org uuid, p_subject_type text, p_subject_ref text, p_author text, p_rating numeric, p_title text, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not exists (select 1 from organizations where id = p_org) then raise exception 'Unknown business'; end if;
  if public.app_rate_limited('review', p_org, 20, interval '1 hour') then
    raise exception 'Too many submissions. Please try again later.';
  end if;
  insert into reviews (organization_id, subject_type, subject_ref, author_name, rating, title, body, status)
  values (p_org, coalesce(p_subject_type,'business'), nullif(p_subject_ref,''), coalesce(nullif(p_author,''),'Anonymous'),
          greatest(0, least(5, coalesce(p_rating,5))), coalesce(p_title,''), coalesce(p_body,''), 'pending')
  returning id into v_id;
  return v_id;
end; $$;
grant execute on function public.app_submit_review(uuid, text, text, text, numeric, text, text) to anon, authenticated;

-- --- app_place_order: stop order spam --------------------------------------
-- Same body as 0055, with a rate-limit guard prepended. Prices and the promo
-- discount stay server-authoritative (read from products / promo_codes).
create or replace function public.app_place_order(
  p_org uuid, p_customer_name text, p_customer_email text, p_items jsonb, p_notes text default '', p_promo text default ''
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_order uuid; v_item jsonb; v_prod products%rowtype; v_qty int; v_unit int; v_sel jsonb; v_total int := 0;
  v_pc promo_codes%rowtype; v_disc int := 0;
begin
  if not exists (select 1 from organizations where id = p_org) then raise exception 'Unknown business'; end if;
  if public.app_rate_limited('order', p_org, 60, interval '1 hour') then
    raise exception 'Too many orders from this site right now. Please try again shortly.';
  end if;
  insert into orders (organization_id, customer_name, customer_email, status, total_cents, notes)
  values (p_org, coalesce(p_customer_name, ''), coalesce(p_customer_email, ''), 'pending', 0, coalesce(p_notes, ''))
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_qty := greatest(1, coalesce((v_item->>'quantity')::int, 1));
    select * into v_prod from products where id = nullif(v_item->>'product_id', '')::uuid and organization_id = p_org and status = 'active';
    if found then
      v_unit := v_prod.price_cents;
      v_sel := coalesce(v_item->'options', '[]'::jsonb);
      if jsonb_typeof(v_sel) = 'array' and jsonb_array_length(v_sel) > 0 then
        select v_prod.price_cents + coalesce(sum((opt->>'price')::int), 0) into v_unit
        from jsonb_array_elements(v_sel) sel
        cross join lateral jsonb_array_elements(coalesce(v_prod.metadata->'modifiers', '[]'::jsonb)) grp
        cross join lateral jsonb_array_elements(coalesce(grp->'options', '[]'::jsonb)) opt
        where grp->>'name' = sel->>'group' and opt->>'label' = sel->>'label';
      end if;
      insert into order_items (organization_id, order_id, product_id, name, quantity, unit_price_cents, notes, metadata)
      values (p_org, v_order, v_prod.id, v_prod.name, v_qty, v_unit, coalesce(v_item->>'notes', ''), jsonb_build_object('options', v_sel));
      v_total := v_total + v_qty * v_unit;
    end if;
  end loop;

  if coalesce(trim(p_promo), '') <> '' then
    select * into v_pc from promo_codes
      where organization_id = p_org and lower(code) = lower(trim(p_promo)) and active = true
        and (expires_at is null or expires_at >= now()) and min_cents <= v_total limit 1;
    if found then
      if v_pc.kind = 'percent' then v_disc := (v_total * least(100, greatest(0, v_pc.value))) / 100;
      else v_disc := least(v_total, greatest(0, v_pc.value)); end if;
    end if;
  end if;

  update orders set total_cents = greatest(0, v_total - v_disc), discount_cents = v_disc,
    promo_code = case when v_disc > 0 then trim(p_promo) else '' end
  where id = v_order;
  return v_order;
end; $$;
grant execute on function public.app_place_order(uuid, text, text, jsonb, text, text) to anon, authenticated;
