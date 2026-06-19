-- Phoxta platform — 0057 reservation extras + driver details (rental vertical).
-- Car rental standard: add insurance / GPS / child-seat extras and capture the
-- driver at booking. Extras are defined per-vehicle in products.metadata.modifiers
-- (the SAME editor restaurants use for menu options) and are priced PER DAY,
-- server-side, validated against the vehicle's own options (tamper-proof). The
-- driver + chosen extras are stored on the reservation; the booking still checks
-- blackouts + availability exactly as before.

drop function if exists public.app_request_reservation(uuid, uuid, text, text, date, date, int);
create function public.app_request_reservation(
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

  -- Extras: per-day price, summed only for options that exist on THIS vehicle.
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
