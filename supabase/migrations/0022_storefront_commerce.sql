-- Phoxta platform — 0022 storefront commerce
-- Lets a public storefront (businesses/<slug>, anon key) read a tenant's catalog
-- and place orders, while the SAME rows are managed in the operating console's
-- Commerce tab (listProducts/updateProduct, listOrders/fulfillOrder). One backend.

-- Catalog needs a product image + flexible attributes (brand, sizes, colours…)
-- for a real storefront. Core fields (name/price/stock/status) stay managed by
-- the ops console; these are additive and optional so nothing there breaks.
alter table products
  add column if not exists image_url text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Public read of ACTIVE products for the storefront (RLS policies are OR'd, so
-- org members keep full access via products_all). Drafts/archived stay private.
drop policy if exists products_public_read on products;
create policy products_public_read on products
  for select to anon, authenticated
  using (status = 'active');

-- Storefront checkout: anon customers can't insert into orders directly (member-
-- only RLS), so they call this SECURITY DEFINER RPC. It prices every line from
-- the tenant's own products (never trusts client prices), writes the order +
-- items as a 'pending' web order, and returns the order id. The order then shows
-- up in the operating console exactly like any other order.
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
  v_qty int;
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
    select * into v_prod from products
      where id = nullif(v_item->>'product_id', '')::uuid
        and organization_id = p_org
        and status = 'active';
    if found then
      insert into order_items (organization_id, order_id, product_id, name, quantity, unit_price_cents)
      values (p_org, v_order, v_prod.id, v_prod.name, v_qty, v_prod.price_cents);
      v_total := v_total + v_qty * v_prod.price_cents;
    end if;
  end loop;

  update orders set total_cents = v_total where id = v_order;
  return v_order;
end;
$$;
grant execute on function public.app_place_order(uuid, text, text, jsonb) to anon, authenticated;
