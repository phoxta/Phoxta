-- Phoxta platform — 0072 restore variant-aware checkout.
-- 0051 dropped 0036's 4-arg app_place_order and every recreation since (0055,
-- 0070) ignored the size/colour keys the fashion storefront still sends: variant
-- prices were never charged, the ordered size/colour was recorded nowhere, and
-- variant stock never decremented. This recreates the live 6-arg function with
-- 0036's variant semantics layered onto 0070's oversell guard + promo handling.

create or replace function public.app_place_order(
  p_org uuid, p_customer_name text, p_customer_email text, p_items jsonb, p_notes text default '', p_promo text default ''
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_order uuid; v_item jsonb; v_prod products%rowtype; v_variant product_variants%rowtype;
  v_qty int; v_unit int; v_sel jsonb; v_size text; v_color text; v_name text; v_total int := 0;
  v_pc promo_codes%rowtype; v_disc int := 0; v_hit int;
begin
  if not exists (select 1 from organizations where id = p_org) then raise exception 'Unknown business'; end if;
  insert into orders (organization_id, customer_name, customer_email, status, total_cents, notes)
  values (p_org, coalesce(p_customer_name, ''), coalesce(p_customer_email, ''), 'pending', 0, coalesce(p_notes, ''))
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_qty := greatest(1, coalesce((v_item->>'quantity')::int, 1));
    v_size := nullif(v_item->>'size', '');
    v_color := nullif(v_item->>'color', '');
    v_variant := null;
    select * into v_prod from products where id = nullif(v_item->>'product_id', '')::uuid and organization_id = p_org and status = 'active';
    if found then
      -- Variant match (size and/or colour requested). Columns default '' so a
      -- null request key matches any value of that axis, first row wins.
      if v_size is not null or v_color is not null then
        select * into v_variant from product_variants
          where product_id = v_prod.id
            and (v_size is null or size = v_size)
            and (v_color is null or color = v_color)
          order by size, color limit 1;
      end if;

      -- Oversell guard: strict on the variant when one is matched (the matrix is
      -- the truth there; product.stock is kept as a best-effort aggregate),
      -- strict on the product row otherwise.
      if v_variant.id is not null then
        update product_variants set stock = stock - v_qty
         where id = v_variant.id and stock >= v_qty;
        get diagnostics v_hit = row_count;
        if v_hit = 0 then
          raise exception 'Out of stock: % (%)', v_prod.name, concat_ws(' / ', v_size, v_color);
        end if;
        update products set stock = greatest(0, stock - v_qty) where id = v_prod.id;
      elsif v_prod.stock is not null then
        update products set stock = stock - v_qty
         where id = v_prod.id and stock >= v_qty;
        get diagnostics v_hit = row_count;
        if v_hit = 0 then
          raise exception 'Out of stock: %', v_prod.name;
        end if;
      end if;

      v_unit := coalesce(v_variant.price_cents, v_prod.price_cents);
      v_sel := coalesce(v_item->'options', '[]'::jsonb);
      if jsonb_typeof(v_sel) = 'array' and jsonb_array_length(v_sel) > 0 then
        select v_unit + coalesce(sum((opt->>'price')::int), 0) into v_unit
        from jsonb_array_elements(v_sel) sel
        cross join lateral jsonb_array_elements(coalesce(v_prod.metadata->'modifiers', '[]'::jsonb)) grp
        cross join lateral jsonb_array_elements(coalesce(grp->'options', '[]'::jsonb)) opt
        where grp->>'name' = sel->>'group' and opt->>'label' = sel->>'label';
      end if;

      v_name := v_prod.name || case
        when v_size is not null or v_color is not null then ' — ' || concat_ws(' / ', v_size, v_color)
        else '' end;
      insert into order_items (organization_id, order_id, product_id, name, quantity, unit_price_cents, notes, metadata)
      values (p_org, v_order, v_prod.id, v_name, v_qty, v_unit, coalesce(v_item->>'notes', ''),
              jsonb_build_object('options', v_sel, 'size', coalesce(v_size, ''), 'color', coalesce(v_color, '')));
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
