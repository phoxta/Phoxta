-- Phoxta — 0077: customer accounts on the storefronts.
--
-- Until now every storefront was guest-only: a shopper could browse, order and
-- book, but could not sign in, see their history or manage a booking. The
-- Login/Register/MyAccount pages that shipped with the templates were inert
-- markup (`<form action="#">`).
--
-- Model: a storefront customer is an ordinary Supabase auth user. The link to
-- their orders is the VERIFIED email on their JWT — no new column, and nothing
-- a client can spoof, because the email is signed by the auth server. RLS is
-- not opened up broadly; instead these SECURITY DEFINER functions return only
-- rows whose customer_email matches the caller's own verified address, scoped
-- to one tenant at a time.
--
-- The owner-facing side is untouched: app_is_org_member still governs
-- everything in the operating console.

-- The caller's verified email, lowercased. Null for anon.
create or replace function public.app_customer_email()
returns text language sql stable as $$
  select nullif(lower(coalesce(auth.jwt() ->> 'email', '')), '')
$$;

-- ── Orders ─────────────────────────────────────────────────────────────────
create or replace function public.app_customer_orders(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb; e text;
begin
  e := public.app_customer_email();
  if e is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(x order by x->>'placed_at' desc), '[]'::jsonb) into v
  from (
    select jsonb_build_object(
      'id', o.id,
      'reference', coalesce(nullif(o.payment_reference,''), left(o.id::text, 8)),
      'status', o.status,
      'fulfilment', o.fulfillment_status,
      'total_cents', o.total_cents,
      'refunded_cents', coalesce(o.refunded_cents, 0),
      'currency', o.currency,
      'placed_at', o.created_at,
      'paid_at', o.paid_at,
      'tracking', o.tracking,
      'notes', o.notes,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'name', oi.name, 'quantity', oi.quantity,
          'unit_price_cents', oi.unit_price_cents, 'notes', oi.notes))
        from order_items oi where oi.order_id = o.id), '[]'::jsonb)
    ) as x
    from orders o
    where o.organization_id = p_org and lower(o.customer_email) = e
    order by o.created_at desc
    limit 100
  ) t;
  return v;
end $$;

-- ── Bookings and reservations ──────────────────────────────────────────────
create or replace function public.app_customer_bookings(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb; e text;
begin
  e := public.app_customer_email();
  if e is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(x order by x->>'when' desc), '[]'::jsonb) into v
  from (
    select jsonb_build_object(
      'kind', 'appointment', 'id', b.id, 'reference', left(b.id::text, 8),
      'when', b.start_at, 'status', b.status, 'notes', b.notes
    ) as x
    from bookings b
    where b.organization_id = p_org and lower(b.customer_email) = e
    union all
    select jsonb_build_object(
      'kind', 'reservation', 'id', r.id, 'reference', left(r.id::text, 8),
      'when', r.start_date, 'until', r.end_date, 'status', r.status,
      'units', r.units, 'total_cents', r.total_cents, 'currency', r.currency
    )
    from reservations r
    where r.organization_id = p_org and lower(r.customer_email) = e
  ) t;
  return v;
end $$;

-- ── Cancel ─────────────────────────────────────────────────────────────────
-- A customer may cancel their OWN booking, and only while it is still ahead of
-- them and not already cancelled. Anything else is a conversation with the
-- business, not a self-service action.
create or replace function public.app_customer_cancel_booking(p_org uuid, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare e text; n int;
begin
  e := public.app_customer_email();
  if e is null then return jsonb_build_object('ok', false, 'error', 'Sign in to manage a booking.'); end if;

  update bookings set status = 'cancelled'
  where id = p_id and organization_id = p_org and lower(customer_email) = e
    and status in ('pending','confirmed') and start_at > now();
  get diagnostics n = row_count;
  if n > 0 then return jsonb_build_object('ok', true, 'kind', 'appointment'); end if;

  update reservations set status = 'cancelled'
  where id = p_id and organization_id = p_org and lower(customer_email) = e
    and status in ('pending','confirmed') and start_date > current_date;
  get diagnostics n = row_count;
  if n > 0 then return jsonb_build_object('ok', true, 'kind', 'reservation'); end if;

  return jsonb_build_object('ok', false, 'error', 'That booking cannot be cancelled online — message us and we will sort it.');
end $$;

-- ── Profile ────────────────────────────────────────────────────────────────
-- A customer's details live on the tenant's CRM contact, so the business sees
-- one record per person whether they ordered as a guest or signed in.
create or replace function public.app_customer_profile(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare e text; v jsonb;
begin
  e := public.app_customer_email();
  if e is null then return 'null'::jsonb; end if;
  select jsonb_build_object('name', c.name, 'email', c.email, 'phone', c.phone, 'company', c.company)
    into v
  from crm_contacts c
  where c.organization_id = p_org and lower(c.email) = e
  limit 1;
  return coalesce(v, jsonb_build_object('name', null, 'email', e, 'phone', null, 'company', null));
end $$;

create or replace function public.app_customer_save_profile(p_org uuid, p_name text, p_phone text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare e text; cid uuid;
begin
  e := public.app_customer_email();
  if e is null then return jsonb_build_object('ok', false, 'error', 'Sign in first.'); end if;

  select id into cid from crm_contacts
  where organization_id = p_org and lower(email) = e limit 1;

  if cid is null then
    insert into crm_contacts (organization_id, name, email, phone, stage, source)
    values (p_org, nullif(btrim(p_name), ''), e, nullif(btrim(p_phone), ''), 'lead', 'storefront account');
  else
    update crm_contacts
       set name  = coalesce(nullif(btrim(p_name), ''), name),
           phone = coalesce(nullif(btrim(p_phone), ''), phone),
           updated_at = now()
     where id = cid;
  end if;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.app_customer_email() from public, anon;
revoke all on function public.app_customer_orders(uuid) from public, anon;
revoke all on function public.app_customer_bookings(uuid) from public, anon;
revoke all on function public.app_customer_cancel_booking(uuid, uuid) from public, anon;
revoke all on function public.app_customer_profile(uuid) from public, anon;
revoke all on function public.app_customer_save_profile(uuid, text, text) from public, anon;

grant execute on function public.app_customer_email() to authenticated, service_role;
grant execute on function public.app_customer_orders(uuid) to authenticated, service_role;
grant execute on function public.app_customer_bookings(uuid) to authenticated, service_role;
grant execute on function public.app_customer_cancel_booking(uuid, uuid) to authenticated, service_role;
grant execute on function public.app_customer_profile(uuid) to authenticated, service_role;
grant execute on function public.app_customer_save_profile(uuid, text, text) to authenticated, service_role;

notify pgrst, 'reload schema';
