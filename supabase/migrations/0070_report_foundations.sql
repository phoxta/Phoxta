-- Phoxta platform — 0070 deep-research foundations.
-- Implements the correctness + data groundwork from the 18 Aug 2026 audit:
--   1) reservation double-booking race fixed (per-product advisory lock)
--   2) order stock decrement with oversell guard + payment fields
--   3) platform_leads (marketing-site contact/enroll forms stop dropping leads)
--   4) subscription dunning groundwork (stored card authorization + ladder state)
--   5) conversation QA columns (LLM-judge scores land next to CSAT)

-- ── 1) app_request_reservation: serialize per product ───────────────────────
-- Two concurrent requests for the last unit could both pass the availability
-- check (check-then-insert). A transaction-scoped advisory lock keyed on the
-- product serializes competing bookings without table-wide locking.
create or replace function public.app_request_reservation(
  p_org uuid, p_product uuid, p_customer_name text, p_customer_email text, p_start date, p_end date,
  p_units int default 1, p_extras jsonb default '[]'::jsonb, p_driver jsonb default '{}'::jsonb, p_notes text default ''
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_prod products%rowtype;
  v_units int := greatest(1, coalesce(p_units, 1));
  v_nights int;
  v_reservation uuid;
  v_bad int;
  v_extra_unit int := 0;
  v_extra int := 0;
begin
  if not exists (select 1 from organizations where id = p_org) then raise exception 'Unknown business'; end if;
  select * into v_prod from products where id = p_product and organization_id = p_org and status = 'active';
  if not found then raise exception 'Resource not available'; end if;
  if p_start is null or p_end is null or p_end <= p_start then raise exception 'Invalid dates'; end if;
  if p_start < current_date then raise exception 'Start date is in the past'; end if;

  -- Serialize availability check + insert per product (released at COMMIT).
  perform pg_advisory_xact_lock(hashtext('reservation:' || p_product::text));

  v_nights := (p_end - p_start);

  select count(*) into v_bad
  from generate_series(p_start, p_end - 1, interval '1 day') AS gs(day)
  where exists (select 1 from resource_blackouts bl
                 where bl.product_id = p_product and gs.day::date between bl.start_date and bl.end_date)
     or (coalesce((select sum(r.units) from reservations r
                    where r.product_id = p_product and r.status in ('pending','confirmed')
                      and gs.day::date >= r.start_date and gs.day::date < r.end_date), 0)
         + v_units) > v_prod.stock;
  if v_bad > 0 then raise exception 'Selected dates are not available'; end if;

  if jsonb_typeof(coalesce(p_extras, '[]'::jsonb)) = 'array' and jsonb_array_length(coalesce(p_extras, '[]'::jsonb)) > 0 then
    select coalesce(sum((opt->>'price')::int), 0) into v_extra_unit
    from jsonb_array_elements(p_extras) sel
    cross join lateral jsonb_array_elements(coalesce(v_prod.metadata->'modifiers', '[]'::jsonb)) grp
    cross join lateral jsonb_array_elements(coalesce(grp->'options', '[]'::jsonb)) opt
    where grp->>'name' = sel->>'group' and opt->>'label' = sel->>'label';
    v_extra := v_nights * v_extra_unit;
  end if;

  insert into reservations (organization_id, product_id, customer_name, customer_email, start_date, end_date,
                            units, unit_price_cents, total_cents, currency, status, notes, metadata)
  values (p_org, p_product, coalesce(p_customer_name, ''), coalesce(p_customer_email, ''), p_start, p_end,
          v_units, v_prod.price_cents, v_nights * v_units * v_prod.price_cents + v_extra, v_prod.currency, 'pending',
          coalesce(p_notes, ''), jsonb_build_object('extras', coalesce(p_extras, '[]'::jsonb), 'driver', coalesce(p_driver, '{}'::jsonb)))
  returning id into v_reservation;

  return v_reservation;
end;
$$;
grant execute on function public.app_request_reservation(uuid, uuid, text, text, date, date, int, jsonb, jsonb, text) to anon, authenticated;

-- ── 2) orders: payment fields + oversell guard ──────────────────────────────
alter table orders add column if not exists payment_reference text;
alter table orders add column if not exists paid_at timestamptz;
create unique index if not exists idx_orders_payment_ref on orders(payment_reference) where payment_reference is not null;
create index if not exists idx_orders_org_created on orders(organization_id, created_at);
create index if not exists idx_reservations_org_created on reservations(organization_id, created_at);

-- app_place_order: same body as 0055 plus (a) per-product stock decrement with
-- an oversell guard (only when the product tracks stock) and (b) an advisory
-- lock per order's products is unnecessary — the conditional UPDATE is atomic.
create or replace function public.app_place_order(
  p_org uuid, p_customer_name text, p_customer_email text, p_items jsonb, p_notes text default '', p_promo text default ''
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_order uuid; v_item jsonb; v_prod products%rowtype; v_qty int; v_unit int; v_sel jsonb; v_total int := 0;
  v_pc promo_codes%rowtype; v_disc int := 0; v_hit int;
begin
  if not exists (select 1 from organizations where id = p_org) then raise exception 'Unknown business'; end if;
  insert into orders (organization_id, customer_name, customer_email, status, total_cents, notes)
  values (p_org, coalesce(p_customer_name, ''), coalesce(p_customer_email, ''), 'pending', 0, coalesce(p_notes, ''))
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_qty := greatest(1, coalesce((v_item->>'quantity')::int, 1));
    select * into v_prod from products where id = nullif(v_item->>'product_id', '')::uuid and organization_id = p_org and status = 'active';
    if found then
      -- Oversell guard: atomic conditional decrement when the product tracks stock.
      if v_prod.stock is not null then
        update products set stock = stock - v_qty
         where id = v_prod.id and stock >= v_qty;
        get diagnostics v_hit = row_count;
        if v_hit = 0 then
          raise exception 'Out of stock: %', v_prod.name;
        end if;
      end if;

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

-- ── 3) platform_leads: the marketing site's own lead inbox ──────────────────
-- Written ONLY by the platform-lead edge function (service role); owners of
-- nothing — this is Phoxta's lead list, not a tenant's.
create table if not exists platform_leads (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'contact'
    check (source in ('contact','startup-school','careers','other')),
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  message text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table platform_leads enable row level security;
-- No policies: deny-all for client roles; service_role bypasses RLS.

-- ── 4) dunning groundwork ───────────────────────────────────────────────────
alter table subscriptions add column if not exists paystack_authorization_code text;
alter table subscriptions add column if not exists dunning jsonb not null default '{}'::jsonb;

-- ── 5) conversation QA (LLM-judge) columns ──────────────────────────────────
alter table conversations add column if not exists qa_score int;
alter table conversations add column if not exists qa_verdict text;
alter table conversations add column if not exists qa_at timestamptz;
create index if not exists idx_conversations_qa_due
  on conversations(organization_id, last_message_at) where qa_at is null;
