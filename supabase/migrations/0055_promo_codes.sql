-- Phoxta platform — 0055 promo / discount codes.
-- Owners create codes (percent or fixed amount, optional min spend + expiry); the
-- storefront validates a code at checkout (anon, via a SECURITY DEFINER RPC so the
-- code table is never exposed) and app_place_order applies the discount SERVER-SIDE,
-- recording it on the order. Universal to commerce verticals.

create table if not exists promo_codes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code text not null,
  kind text not null default 'percent' check (kind in ('percent', 'fixed')),
  value integer not null default 0,        -- percent (0-100) or fixed amount in cents
  min_cents integer not null default 0,    -- minimum subtotal to qualify
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);
create index if not exists idx_promo_org on promo_codes(organization_id);
alter table promo_codes enable row level security;
drop policy if exists promo_all on promo_codes;
create policy promo_all on promo_codes for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

alter table orders add column if not exists discount_cents integer not null default 0;
alter table orders add column if not exists promo_code text not null default '';

-- Public validation (no table exposure): returns the computed discount for a subtotal.
create or replace function public.app_validate_promo(p_org uuid, p_code text, p_subtotal_cents int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v promo_codes%rowtype; v_disc int;
begin
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

-- Re-create app_place_order with a promo arg (applies the discount authoritatively).
drop function if exists public.app_place_order(uuid, text, text, jsonb, text);
create function public.app_place_order(
  p_org uuid, p_customer_name text, p_customer_email text, p_items jsonb, p_notes text default '', p_promo text default ''
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_order uuid; v_item jsonb; v_prod products%rowtype; v_qty int; v_unit int; v_sel jsonb; v_total int := 0;
  v_pc promo_codes%rowtype; v_disc int := 0;
begin
  if not exists (select 1 from organizations where id = p_org) then raise exception 'Unknown business'; end if;
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
