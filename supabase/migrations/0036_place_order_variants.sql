-- Phoxta platform — 0036 variant-aware checkout. app_place_order now accepts an
-- optional size/colour per line: it prices from the matching variant (falling back
-- to the product), records the variant on the order line name, and DECREMENTS both
-- the variant stock and the product stock. This makes the size/colour matrix and
-- product stock truthful as web orders come in (previously stock wasn't decremented).

create or replace function public.app_place_order(
  p_org uuid,
  p_customer_name text,
  p_customer_email text,
  p_items jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_order uuid;
  v_item jsonb;
  v_prod products%rowtype;
  v_variant product_variants%rowtype;
  v_qty int;
  v_size text;
  v_color text;
  v_unit int;
  v_name text;
  v_total int := 0;
begin
  if not exists (select 1 from organizations where id = p_org) then
    raise exception 'Unknown business';
  end if;

  insert into orders (organization_id, customer_name, customer_email, status, total_cents)
  values (p_org, coalesce(p_customer_name, ''), coalesce(p_customer_email, ''), 'pending', 0)
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_qty := greatest(1, coalesce((v_item->>'quantity')::int, 1));
    v_size := nullif(v_item->>'size', '');
    v_color := nullif(v_item->>'color', '');

    select * into v_prod from products
      where id = nullif(v_item->>'product_id', '')::uuid
        and organization_id = p_org
        and status = 'active';
    if not found then
      continue;
    end if;

    -- Match a variant (no-op when no size given → row stays null).
    select * into v_variant from product_variants
      where product_id = v_prod.id
        and size = v_size
        and (v_color is null or color = v_color)
      limit 1;

    v_unit := coalesce(v_variant.price_cents, v_prod.price_cents);
    v_name := v_prod.name || case
      when v_size is not null or v_color is not null then ' — ' || concat_ws(' / ', v_size, v_color)
      else '' end;

    insert into order_items (organization_id, order_id, product_id, name, quantity, unit_price_cents)
    values (p_org, v_order, v_prod.id, v_name, v_qty, v_unit);
    v_total := v_total + v_qty * v_unit;

    if v_variant.id is not null then
      update product_variants set stock = greatest(0, stock - v_qty) where id = v_variant.id;
    end if;
    update products set stock = greatest(0, stock - v_qty) where id = v_prod.id;
  end loop;

  update orders set total_cents = v_total where id = v_order;
  return v_order;
end;
$$;
grant execute on function public.app_place_order(uuid, text, text, jsonb) to anon, authenticated;
