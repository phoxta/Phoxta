-- Phoxta platform — 0028 reservations backend (rental / stay / experience verticals)
-- Booking businesses (carento = car rental, travel = stays/experiences) need
-- date-range reservations with availability, not a retail cart. NOTE: an
-- appointment-style `bookings` table already exists (0006: service_id + a single
-- start_at) for scheduling verticals — that's a different concept, so this adds a
-- separate `reservations` table for date-range resource booking.
--
-- It REUSES products as the bookable resource: a car model / room type /
-- experience is a products row (price_cents = per-day/night rate, stock = how many
-- units exist), so owners manage their fleet/listings in the SAME Commerce tab,
-- and reservations carry member RLS so the operating console lists them like
-- orders. Storefronts (anon) read availability and request reservations via the
-- SECURITY DEFINER RPCs below — prices and availability are enforced server-side.

-- ---------------------------------------------------------------------------
-- reservations: one booking of a resource over [start_date, end_date) (end day is
-- the checkout / return day and is free again). Mirrors the orders table.
-- ---------------------------------------------------------------------------
create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid references crm_contacts(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  customer_name text not null default '',
  customer_email text not null default '',
  start_date date not null,
  end_date date not null,
  units integer not null default 1 check (units > 0),
  unit_price_cents integer not null default 0,
  total_cents integer not null default 0,
  currency text not null default 'USD',
  status text not null default 'pending'
    check (status in ('pending','confirmed','cancelled','completed')),
  notes text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date > start_date)
);
create index if not exists idx_reservations_org on reservations(organization_id, created_at desc);
create index if not exists idx_reservations_resource on reservations(product_id, start_date, end_date);
create trigger trg_reservations_touch before update on reservations
  for each row execute function public.app_touch_updated_at();
alter table reservations enable row level security;
create policy reservations_all on reservations for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- resource_blackouts: owner-set unavailable periods (maintenance, owner hold).
-- Inclusive [start_date, end_date]. Member-managed; surfaced to storefronts only
-- through the aggregate availability function below (never read directly by anon).
-- ---------------------------------------------------------------------------
create table if not exists resource_blackouts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists idx_blackouts_resource on resource_blackouts(product_id, start_date, end_date);
alter table resource_blackouts enable row level security;
create policy blackouts_all on resource_blackouts for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Public availability: per-day units for a resource over a window. Aggregate
-- only (no customer PII), so it's safe for the anon storefront calendar. A day
-- is unavailable if it falls in a blackout, else units_total - units booked by
-- pending/confirmed reservations overlapping that day.
-- ---------------------------------------------------------------------------
create or replace function public.app_resource_availability(p_product uuid, p_from date, p_to date)
returns table(day date, units_total int, units_booked int, available int)
language sql stable security definer set search_path = public as $$
  with prod as (select stock from products where id = p_product and status = 'active'),
  days as (select generate_series(p_from, least(p_to, p_from + 366), interval '1 day')::date as day)
  select d.day,
         coalesce((select stock from prod), 0) as units_total,
         coalesce((select sum(r.units) from reservations r
                    where r.product_id = p_product
                      and r.status in ('pending','confirmed')
                      and d.day >= r.start_date and d.day < r.end_date), 0)::int as units_booked,
         case
           when exists (select 1 from resource_blackouts bl
                         where bl.product_id = p_product
                           and d.day between bl.start_date and bl.end_date) then 0
           else greatest(0, coalesce((select stock from prod), 0)
                  - coalesce((select sum(r.units) from reservations r
                               where r.product_id = p_product
                                 and r.status in ('pending','confirmed')
                                 and d.day >= r.start_date and d.day < r.end_date), 0)::int)
         end as available
  from days d;
$$;
grant execute on function public.app_resource_availability(uuid, date, date) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storefront reservation request: anon customers can't insert into reservations
-- (member-only RLS), so they call this. It validates the resource + dates,
-- re-checks availability for EVERY occupied day, prices server-side
-- (nights × units × rate), and writes a 'pending' reservation that shows in the
-- operating console. Returns the reservation id.
-- ---------------------------------------------------------------------------
create or replace function public.app_request_reservation(
  p_org uuid,
  p_product uuid,
  p_customer_name text,
  p_customer_email text,
  p_start date,
  p_end date,
  p_units int default 1
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_prod products%rowtype;
  v_units int := greatest(1, coalesce(p_units, 1));
  v_nights int;
  v_reservation uuid;
  v_bad int;
begin
  if not exists (select 1 from organizations where id = p_org) then
    raise exception 'Unknown business';
  end if;
  select * into v_prod from products
    where id = p_product and organization_id = p_org and status = 'active';
  if not found then
    raise exception 'Resource not available';
  end if;
  if p_start is null or p_end is null or p_end <= p_start then
    raise exception 'Invalid dates';
  end if;
  if p_start < current_date then
    raise exception 'Start date is in the past';
  end if;

  v_nights := (p_end - p_start);

  -- Every occupied day [start, end) must be blackout-free and have a free unit.
  select count(*) into v_bad
  from generate_series(p_start, p_end - 1, interval '1 day') AS gs(day)
  where exists (select 1 from resource_blackouts bl
                 where bl.product_id = p_product
                   and gs.day::date between bl.start_date and bl.end_date)
     or (coalesce((select sum(r.units) from reservations r
                    where r.product_id = p_product
                      and r.status in ('pending','confirmed')
                      and gs.day::date >= r.start_date and gs.day::date < r.end_date), 0)
         + v_units) > v_prod.stock;
  if v_bad > 0 then
    raise exception 'Selected dates are not available';
  end if;

  insert into reservations (organization_id, product_id, customer_name, customer_email,
                            start_date, end_date, units, unit_price_cents, total_cents, currency, status)
  values (p_org, p_product, coalesce(p_customer_name, ''), coalesce(p_customer_email, ''),
          p_start, p_end, v_units, v_prod.price_cents, v_nights * v_units * v_prod.price_cents,
          v_prod.currency, 'pending')
  returning id into v_reservation;

  return v_reservation;
end;
$$;
grant execute on function public.app_request_reservation(uuid, uuid, text, text, date, date, int) to anon, authenticated;
