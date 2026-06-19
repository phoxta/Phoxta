-- Phoxta platform — 0050 restaurant table reservations.
-- The date-range resource model (0028, for cars/stays) doesn't fit a restaurant
-- table booking, which is a single date + TIME + party size (not a multi-day rental
-- of a stocked resource). This thin RPC records a table request as a `reservations`
-- row (product_id null, units = party size, the time + party in notes/metadata) so
-- it appears in the operating console's Reservations module like any other booking.
-- Anon storefront can request; member RLS governs reads/management.

create or replace function public.app_request_table(
  p_org uuid,
  p_name text,
  p_email text,
  p_date date,
  p_time text,
  p_party int,
  p_notes text default ''
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if p_org is null or p_date is null then
    raise exception 'A date is required';
  end if;
  insert into reservations (organization_id, customer_name, customer_email, start_date, end_date, units, status, notes, metadata)
  values (
    p_org, coalesce(p_name, ''), coalesce(p_email, ''),
    p_date, p_date + 1, greatest(1, coalesce(p_party, 1)), 'pending',
    trim(both ' · ' from concat_ws(' · ', nullif(p_time, ''), case when coalesce(p_party,0) > 0 then p_party || ' guests' end, nullif(p_notes, ''))),
    jsonb_build_object('kind', 'table', 'time', p_time, 'party', p_party)
  )
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.app_request_table(uuid, text, text, date, text, int, text) to anon, authenticated;
