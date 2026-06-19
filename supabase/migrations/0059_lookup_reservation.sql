-- Phoxta platform — 0059 manage-booking lookup. A customer looks up their own
-- reservation with the reference (id) + the email they booked with. SECURITY
-- DEFINER + both-must-match keeps it private (no listing of others' bookings).
create or replace function public.app_lookup_reservation(p_org uuid, p_ref text, p_email text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'found', true, 'status', r.status, 'product', coalesce(p.name, '—'),
    'start_date', r.start_date, 'end_date', r.end_date, 'units', r.units,
    'total_cents', r.total_cents, 'currency', r.currency, 'customer_name', r.customer_name
  )
  from reservations r left join products p on p.id = r.product_id
  where r.organization_id = p_org
    and r.id::text = trim(p_ref)
    and lower(r.customer_email) = lower(trim(p_email))
  limit 1;
$$;
grant execute on function public.app_lookup_reservation(uuid, text, text) to anon, authenticated;
