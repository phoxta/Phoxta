-- Phoxta platform — 0051 order item modifiers + special instructions.
-- Food ordering standard: items carry chosen options (size, add-ons…) and a special
-- instruction, plus an order-level note. Options/notes ride on order_items; the order
-- note on orders. app_place_order now validates the chosen options against the
-- product's OWN metadata.modifiers and adds their price server-side, so the line
-- total can never be tampered from the client.

alter table order_items add column if not exists notes text not null default '';
alter table order_items add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table orders add column if not exists notes text not null default '';

drop function if exists public.app_place_order(uuid, text, text, jsonb);
create function public.app_place_order(
  p_org uuid,
  p_customer_name text,
  p_customer_email text,
  p_items jsonb,
  p_notes text default ''
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_order uuid;
  v_item jsonb;
  v_prod products%rowtype;
  v_qty int;
  v_unit int;
  v_sel jsonb;
  v_total int := 0;
begin
  if not exists (select 1 from organizations where id = p_org) then
    raise exception 'Unknown business';
  end if;

  insert into orders (organization_id, customer_name, customer_email, status, total_cents, notes)
  values (p_org, coalesce(p_customer_name, ''), coalesce(p_customer_email, ''), 'pending', 0, coalesce(p_notes, ''))
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_qty := greatest(1, coalesce((v_item->>'quantity')::int, 1));
    select * into v_prod from products
      where id = nullif(v_item->>'product_id', '')::uuid
        and organization_id = p_org
        and status = 'active';
    if found then
      v_unit := v_prod.price_cents;
      v_sel := coalesce(v_item->'options', '[]'::jsonb);
      -- Add the price of each chosen option that ACTUALLY exists on this product's
      -- modifiers (group name + option label must match) — server-authoritative.
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

  update orders set total_cents = v_total where id = v_order;
  return v_order;
end;
$$;
grant execute on function public.app_place_order(uuid, text, text, jsonb, text) to anon, authenticated;
