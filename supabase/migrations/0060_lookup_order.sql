-- Phoxta platform — 0060 order lookup (eCommerce "track my order"). Customer looks
-- up their own order with the reference (id) + the email used. SECURITY DEFINER +
-- both-must-match keeps it private. Returns the order + its line items.
create or replace function public.app_lookup_order(p_org uuid, p_ref text, p_email text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'found', true, 'status', o.status, 'fulfillment_status', o.fulfillment_status,
    'total_cents', o.total_cents, 'currency', o.currency, 'created_at', o.created_at,
    'customer_name', o.customer_name,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', oi.name, 'quantity', oi.quantity, 'unit_price_cents', oi.unit_price_cents))
                       from order_items oi where oi.order_id = o.id), '[]'::jsonb)
  )
  from orders o
  where o.organization_id = p_org and o.id::text = trim(p_ref) and lower(o.customer_email) = lower(trim(p_email))
  limit 1;
$$;
grant execute on function public.app_lookup_order(uuid, text, text) to anon, authenticated;
