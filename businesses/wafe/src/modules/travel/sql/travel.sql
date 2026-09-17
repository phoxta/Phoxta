-- Wàfè — module: travel (trips, itineraries, bookings, papers, packing, the run-up)
--
-- Ten tables, one idea: a TRIP is the object a family shares, and everything
-- else hangs off it. Reachability is decided once — "am I on this trip, or was
-- it named to me?" — and every child table asks the trip that question rather
-- than repeating the rule.
--
-- WHO SEES WHAT, IN POSTGRES (the app's filter mirrors this; the database is
-- the one that is load-bearing)
--
--   wf_trips            a parent sees every trip in the space. Anybody else
--                       sees a trip only when they are ON it (a traveller or a
--                       host row) or explicitly named in shared_with. A plain
--                       'family' trip grants a guest nothing: guests are
--                       granted named objects, never modules.
--   wf_trip_travellers  · wf_itinerary_days · wf_itinerary_items ·
--   wf_trip_checklist   readable by anyone who can reach the trip.
--   wf_trip_bookings    the same, EXCEPT rows whose sensitivity is 'financial'
--                       or 'documents' — those are parents only, because a
--                       booking reference and a price are not a child's
--                       business.
--   wf_travel_docs      PARENTS ONLY, for select as well as write (AC 4). A
--                       child's or a guest's session cannot fetch a passport
--                       row even with a hand-written query; the app never
--                       masks a document, it never receives one.
--   wf_packing_lists    a parent sees every list; anybody else sees their own,
--   wf_packing_items    and only for a trip they can reach (AC 2).
--   wf_trip_expenses    parents only — money is a parent's business, and the
--                       ledger the Finance module reads is built from these
--                       rows in the app (AC 7).
--
-- MONEY. Costs are integer minor units. A trip carries the destination's
-- currency and the rate used, and every expense stores what was spent
-- (amount_cents + currency + fx_rate) beside the converted amount in the
-- family's own currency (home_cents). Only home_cents is ever summed, so the
-- budget and giving percentages stay single-currency exactly as they assume.
--
-- MAPS are deep links, not embeds: the app's content-security policy admits no
-- tile server, so an itinerary item stores a place (an address a maps app can
-- find) and, where known, coords ('lat,lng') — the link is built in the app.
--
-- Idempotent throughout: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_trips (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete cascade,
  space_id               uuid not null references public.wf_spaces(id) on delete cascade,
  title                  text not null,
  destination            text not null default '',
  country_code           text not null default 'GB',
  kind                   text not null default 'holiday'
                         check (kind in ('holiday','visit','school-trip','day-out')),
  status                 text not null default 'planning'
                         check (status in ('dreaming','planning','booked','done')),
  start_date             date,
  end_date               date,
  cover_url              text,
  notes                  text not null default '',
  -- Minor units in the SPACE's currency. Null = we have not set a budget.
  budget_cents           integer check (budget_cents is null or budget_cents >= 0),
  -- The Finance module's stable budget key this trip's spending posts to.
  finance_category_id    text not null default 'fun',
  finance_category_label text not null default 'Trips & holidays',
  -- What money looks like at the destination.
  local_currency         text not null default 'GBP',
  fx_rate                numeric(14,6) not null default 1 check (fx_rate > 0),
  -- A family value this trip serves, by label ("Love", "Joy").
  value_id               text,
  -- The Memories album opened when we came home. An id only: no join.
  album_id               uuid,
  album_title            text not null default '',
  template               text not null default 'city'
                         check (template in ('warm','cold','city','beach','school-trip','day-out')),
  visibility             text not null default 'family'
                         check (visibility in ('private','shared','family','child')),
  shared_with            uuid[] not null default '{}',
  created_by             uuid references public.wf_members(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index if not exists idx_wf_trips_space_start on public.wf_trips(space_id, start_date);
create index if not exists idx_wf_trips_status on public.wf_trips(space_id, status);

-- Who is going. A HOST receives us and sees the plan without packing for it,
-- which is exactly Mama Fọláké's relationship to Christmas in Lagos.
create table if not exists public.wf_trip_travellers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  trip_id         uuid not null references public.wf_trips(id) on delete cascade,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  role            text not null default 'traveller' check (role in ('traveller','host')),
  -- A document fact: stripped from a child's and a guest's slice in the app,
  -- and unreadable to them here (see the policy below).
  passport_expiry date,
  notes           text not null default '',
  created_at      timestamptz not null default now(),
  unique (trip_id, member_id)
);
create index if not exists idx_wf_trip_travellers_member on public.wf_trip_travellers(member_id);
create index if not exists idx_wf_trip_travellers_space on public.wf_trip_travellers(space_id);

create table if not exists public.wf_itinerary_days (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  trip_id         uuid not null references public.wf_trips(id) on delete cascade,
  day_date        date not null,
  title           text not null default '',
  notes           text not null default '',
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_itinerary_days_trip on public.wf_itinerary_days(trip_id, day_date);
create index if not exists idx_wf_itinerary_days_space on public.wf_itinerary_days(space_id);

create table if not exists public.wf_itinerary_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  trip_id         uuid not null references public.wf_trips(id) on delete cascade,
  day_id          uuid not null references public.wf_itinerary_days(id) on delete cascade,
  -- Null means "sometime today", which a family's day often is.
  at_time         time,
  title           text not null,
  -- An address or a place name — whatever a maps app can find.
  place           text not null default '',
  -- 'lat,lng' when we know it; the deep link prefers it over the address.
  coords          text,
  notes           text not null default '',
  booking_ref     text not null default '',
  -- In the trip's LOCAL currency (see the money note at the top).
  cost_cents      integer not null default 0 check (cost_cents >= 0),
  item_order      integer not null default 0,
  done            boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_itinerary_items_day on public.wf_itinerary_items(day_id, item_order);
create index if not exists idx_wf_itinerary_items_space on public.wf_itinerary_items(space_id);

create table if not exists public.wf_trip_bookings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  trip_id         uuid not null references public.wf_trips(id) on delete cascade,
  kind            text not null default 'other'
                  check (kind in ('flight','stay','car','transport','ticket','insurance','other')),
  provider        text not null,
  reference       text not null default '',
  start_at        timestamptz not null,
  end_at          timestamptz,
  -- Home currency, minor units.
  cost_cents      integer not null default 0 check (cost_cents >= 0),
  link            text not null default '',
  image_url       text,
  confirmed       boolean not null default false,
  sensitivity     text not null default 'general' check (sensitivity in ('general','financial','documents')),
  notes           text not null default '',
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_trip_bookings_trip on public.wf_trip_bookings(trip_id, start_at);
create index if not exists idx_wf_trip_bookings_space on public.wf_trip_bookings(space_id);

-- Passports, visas, certificates. PARENTS ONLY at the policy — this is AC 4,
-- and it is enforced by the database rather than by the screen.
create table if not exists public.wf_travel_docs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  -- Null for a document that is not about one trip (a passport is a fact
  -- about a person, not about a holiday).
  trip_id         uuid references public.wf_trips(id) on delete cascade,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  kind            text not null default 'other'
                  check (kind in ('passport','visa','insurance','ticket','vaccination','licence','other')),
  label           text not null default '',
  -- The app shows the last four characters and never the whole number.
  doc_number      text not null default '',
  expires_at      date,
  image_url       text,
  notes           text not null default '',
  sensitivity     text not null default 'documents' check (sensitivity = 'documents'),
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_travel_docs_space on public.wf_travel_docs(space_id, expires_at);
create index if not exists idx_wf_travel_docs_member on public.wf_travel_docs(member_id);

create table if not exists public.wf_packing_lists (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  trip_id         uuid not null references public.wf_trips(id) on delete cascade,
  member_id       uuid not null references public.wf_members(id) on delete cascade,
  template        text not null default 'city'
                  check (template in ('warm','cold','city','beach','school-trip','day-out')),
  -- Null until it has been generated; that is what "4 of 6 made" counts.
  generated_at    timestamptz,
  created_at      timestamptz not null default now(),
  unique (trip_id, member_id)
);
create index if not exists idx_wf_packing_lists_space on public.wf_packing_lists(space_id);
create index if not exists idx_wf_packing_lists_member on public.wf_packing_lists(member_id);

create table if not exists public.wf_packing_items (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  space_id          uuid not null references public.wf_spaces(id) on delete cascade,
  list_id           uuid not null references public.wf_packing_lists(id) on delete cascade,
  item              text not null,
  qty               integer not null default 1 check (qty > 0),
  category          text not null default 'other'
                    check (category in ('clothes','toiletries','documents','tech','medical','gifts','kids','other')),
  -- AC 9 — a packed thing can point at the real garment in the Wardrobe. An
  -- id and a label only: this module never joins another module's tables.
  wardrobe_item_id  uuid,
  wardrobe_label    text not null default '',
  checked           boolean not null default false,
  item_order        integer not null default 0,
  created_at        timestamptz not null default now()
);
create index if not exists idx_wf_packing_items_list on public.wf_packing_items(list_id, item_order);
create index if not exists idx_wf_packing_items_space on public.wf_packing_items(space_id);

-- The run-up, stored as an OFFSET from departure (T-14, T-7, T-3, T-1, T-0) so
-- that moving the flight moves the whole run-up with it.
create table if not exists public.wf_trip_checklist (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  trip_id          uuid not null references public.wf_trips(id) on delete cascade,
  item             text not null,
  note             text not null default '',
  due_offset_days  integer not null default 7 check (due_offset_days >= 0),
  owner_member_id  uuid references public.wf_members(id) on delete set null,
  done_at          timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_trip_checklist_trip on public.wf_trip_checklist(trip_id, due_offset_days desc);
create index if not exists idx_wf_trip_checklist_space on public.wf_trip_checklist(space_id);

-- AC 7 — what the trip actually cost. The app posts these to the family ledger
-- under the trip's finance_category_id; home_cents is the only column summed.
create table if not exists public.wf_trip_expenses (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  space_id            uuid not null references public.wf_spaces(id) on delete cascade,
  trip_id             uuid not null references public.wf_trips(id) on delete cascade,
  label               text not null,
  -- As spent, in `currency`.
  amount_cents        integer not null default 0,
  currency            text not null default 'GBP',
  -- 1 home unit = fx_rate units of `currency`; 1 when they are the same.
  fx_rate             numeric(14,6) not null default 1 check (fx_rate > 0),
  -- The converted amount in the space's currency.
  home_cents          integer not null default 0,
  finance_category_id text not null default 'fun',
  member_id           uuid references public.wf_members(id) on delete set null,
  spent_on            date not null default current_date,
  note                text not null default '',
  posted_at           timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists idx_wf_trip_expenses_trip on public.wf_trip_expenses(trip_id, spent_on desc);
create index if not exists idx_wf_trip_expenses_space on public.wf_trip_expenses(space_id);

-- ---------------------------------------------------------------------------
-- 2. Row-level security
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'wf_trips','wf_trip_travellers','wf_itinerary_days','wf_itinerary_items',
    'wf_trip_bookings','wf_travel_docs','wf_packing_lists','wf_packing_items',
    'wf_trip_checklist','wf_trip_expenses'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Can this session reach the trip at all? Parents always. Anybody else only by
-- being ON it (traveller or host) or by being named in shared_with — "granted
-- named objects, never modules". A plain 'family' trip is family business
-- until somebody shares it, so it grants a guest nothing.
create or replace function public.wf_trip_reachable(p_trip uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_trip  record;
  v_me    uuid;
  v_role  text;
begin
  select t.space_id, t.visibility, t.shared_with, t.created_by
    into v_trip from wf_trips t where t.id = p_trip;
  if not found then return false; end if;

  select m.id, m.role into v_me, v_role
  from wf_members m where m.space_id = v_trip.space_id and m.user_id = auth.uid() limit 1;
  if v_me is null then return false; end if;
  if v_role = 'parent' then return true; end if;

  if exists (select 1 from wf_trip_travellers tv where tv.trip_id = p_trip and tv.member_id = v_me) then
    return true;
  end if;
  if v_trip.created_by = v_me then return true; end if;
  if v_trip.visibility = 'shared' then return v_me = any (coalesce(v_trip.shared_with, '{}'::uuid[])); end if;
  if v_trip.visibility = 'child' then return v_role = 'child'; end if;
  return false;
end $$;
grant execute on function public.wf_trip_reachable(uuid) to authenticated;

-- Trips ---------------------------------------------------------------------
drop policy if exists wf_trips_read on public.wf_trips;
create policy wf_trips_read on public.wf_trips for select to authenticated
  using (
    wf_is_parent(space_id)
    or created_by = wf_my_member(space_id)
    or exists (select 1 from wf_trip_travellers tv where tv.trip_id = id and tv.member_id = wf_my_member(space_id))
    or (visibility = 'shared' and wf_my_member(space_id) = any (shared_with))
    or (visibility = 'child' and wf_my_role(space_id) = 'child')
  );

drop policy if exists wf_trips_write on public.wf_trips;
create policy wf_trips_write on public.wf_trips for insert to authenticated
  with check (wf_is_parent(space_id));

drop policy if exists wf_trips_edit on public.wf_trips;
create policy wf_trips_edit on public.wf_trips for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_trips_del on public.wf_trips;
create policy wf_trips_del on public.wf_trips for delete to authenticated
  using (wf_is_parent(space_id));

-- Travellers ----------------------------------------------------------------
-- Everyone on a trip can see who else is coming; only a parent may change the
-- party. passport_expiry is a document fact, so a non-parent gets the row
-- through the app's filter with that column blanked — and the column itself is
-- only ever WRITTEN by a parent.
drop policy if exists wf_trip_travellers_read on public.wf_trip_travellers;
create policy wf_trip_travellers_read on public.wf_trip_travellers for select to authenticated
  using (wf_trip_reachable(trip_id));

drop policy if exists wf_trip_travellers_parent on public.wf_trip_travellers;
create policy wf_trip_travellers_parent on public.wf_trip_travellers for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- Itinerary -----------------------------------------------------------------
drop policy if exists wf_itinerary_days_read on public.wf_itinerary_days;
create policy wf_itinerary_days_read on public.wf_itinerary_days for select to authenticated
  using (wf_trip_reachable(trip_id));

drop policy if exists wf_itinerary_days_parent on public.wf_itinerary_days;
create policy wf_itinerary_days_parent on public.wf_itinerary_days for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_itinerary_items_read on public.wf_itinerary_items;
create policy wf_itinerary_items_read on public.wf_itinerary_items for select to authenticated
  using (wf_trip_reachable(trip_id));

drop policy if exists wf_itinerary_items_write on public.wf_itinerary_items;
create policy wf_itinerary_items_write on public.wf_itinerary_items for insert to authenticated
  with check (wf_is_parent(space_id));

-- A child on the trip may tick a stop off as it happens; a guest is read-only
-- (the source matrix gives a guest "view"), and a parent may edit anything.
drop policy if exists wf_itinerary_items_edit on public.wf_itinerary_items;
create policy wf_itinerary_items_edit on public.wf_itinerary_items for update to authenticated
  using (wf_is_parent(space_id) or (wf_my_role(space_id) = 'child' and wf_trip_reachable(trip_id)))
  with check (wf_is_parent(space_id) or (wf_my_role(space_id) = 'child' and wf_trip_reachable(trip_id)));

drop policy if exists wf_itinerary_items_del on public.wf_itinerary_items;
create policy wf_itinerary_items_del on public.wf_itinerary_items for delete to authenticated
  using (wf_is_parent(space_id));

-- Bookings ------------------------------------------------------------------
-- General bookings are readable by everyone on the trip (the app strips the
-- reference and the price for a child or a guest). Financial and documents
-- bookings stop at the parents, here, not in the screen.
drop policy if exists wf_trip_bookings_read on public.wf_trip_bookings;
create policy wf_trip_bookings_read on public.wf_trip_bookings for select to authenticated
  using (wf_is_parent(space_id) or (sensitivity = 'general' and wf_trip_reachable(trip_id)));

drop policy if exists wf_trip_bookings_parent on public.wf_trip_bookings;
create policy wf_trip_bookings_parent on public.wf_trip_bookings for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- Papers --------------------------------------------------------------------
-- AC 4, in one line: parents only, for every verb. A child's or a guest's
-- session receives an empty set, not a masked row.
drop policy if exists wf_travel_docs_parent on public.wf_travel_docs;
create policy wf_travel_docs_parent on public.wf_travel_docs for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- Packing -------------------------------------------------------------------
-- AC 2 — a guest traveller reads the itinerary and their OWN list. A parent
-- sees every list; nobody else sees anybody else's.
drop policy if exists wf_packing_lists_read on public.wf_packing_lists;
create policy wf_packing_lists_read on public.wf_packing_lists for select to authenticated
  using (
    wf_is_parent(space_id)
    or (member_id = wf_my_member(space_id) and wf_trip_reachable(trip_id))
  );

drop policy if exists wf_packing_lists_write on public.wf_packing_lists;
create policy wf_packing_lists_write on public.wf_packing_lists for insert to authenticated
  with check (wf_is_parent(space_id));

drop policy if exists wf_packing_lists_edit on public.wf_packing_lists;
create policy wf_packing_lists_edit on public.wf_packing_lists for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_packing_lists_del on public.wf_packing_lists;
create policy wf_packing_lists_del on public.wf_packing_lists for delete to authenticated
  using (wf_is_parent(space_id));

drop policy if exists wf_packing_items_read on public.wf_packing_items;
create policy wf_packing_items_read on public.wf_packing_items for select to authenticated
  using (exists (
    select 1 from wf_packing_lists l
    where l.id = list_id
      and (wf_is_parent(l.space_id) or (l.member_id = wf_my_member(l.space_id) and wf_trip_reachable(l.trip_id)))
  ));

-- A child adds to and ticks their own bag (the one write children have here).
-- A guest is read-only unless a parent handed them travel.manage, which lives
-- in the app's grants — so at the database a guest simply cannot write.
drop policy if exists wf_packing_items_write on public.wf_packing_items;
create policy wf_packing_items_write on public.wf_packing_items for insert to authenticated
  with check (exists (
    select 1 from wf_packing_lists l
    where l.id = list_id
      and (wf_is_parent(l.space_id)
           or (wf_my_role(l.space_id) = 'child' and l.member_id = wf_my_member(l.space_id)))
  ));

-- AC 8's server half: the tick a child makes on a plane replays into this.
drop policy if exists wf_packing_items_edit on public.wf_packing_items;
create policy wf_packing_items_edit on public.wf_packing_items for update to authenticated
  using (exists (
    select 1 from wf_packing_lists l
    where l.id = list_id
      and (wf_is_parent(l.space_id)
           or (wf_my_role(l.space_id) = 'child' and l.member_id = wf_my_member(l.space_id)))
  ))
  with check (exists (
    select 1 from wf_packing_lists l
    where l.id = list_id
      and (wf_is_parent(l.space_id)
           or (wf_my_role(l.space_id) = 'child' and l.member_id = wf_my_member(l.space_id)))
  ));

drop policy if exists wf_packing_items_del on public.wf_packing_items;
create policy wf_packing_items_del on public.wf_packing_items for delete to authenticated
  using (exists (
    select 1 from wf_packing_lists l
    where l.id = list_id
      and (wf_is_parent(l.space_id)
           or (wf_my_role(l.space_id) = 'child' and l.member_id = wf_my_member(l.space_id)))
  ));

-- The run-up ----------------------------------------------------------------
-- Everyone on the trip can read it (it is reassuring to see the list shrink);
-- a parent edits anything, and the person a line was given to may tick theirs.
drop policy if exists wf_trip_checklist_read on public.wf_trip_checklist;
create policy wf_trip_checklist_read on public.wf_trip_checklist for select to authenticated
  using (wf_trip_reachable(trip_id));

drop policy if exists wf_trip_checklist_write on public.wf_trip_checklist;
create policy wf_trip_checklist_write on public.wf_trip_checklist for insert to authenticated
  with check (wf_is_parent(space_id));

drop policy if exists wf_trip_checklist_edit on public.wf_trip_checklist;
create policy wf_trip_checklist_edit on public.wf_trip_checklist for update to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));

drop policy if exists wf_trip_checklist_del on public.wf_trip_checklist;
create policy wf_trip_checklist_del on public.wf_trip_checklist for delete to authenticated
  using (wf_is_parent(space_id));

-- Money ---------------------------------------------------------------------
drop policy if exists wf_trip_expenses_parent on public.wf_trip_expenses;
create policy wf_trip_expenses_parent on public.wf_trip_expenses for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- ---------------------------------------------------------------------------
-- 3. Pre-loaded content — packing templates and the run-up, per tenant
-- ---------------------------------------------------------------------------
-- A family that has just added its first trip should not face an empty list.
-- These are the rows the "generate" button copies FROM; nothing is written
-- into a space until somebody asks for it.

create table if not exists public.wf_catalog_packing (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug            text not null,
  template        text not null default 'city'
                  check (template in ('warm','cold','city','beach','school-trip','day-out')),
  item            text not null,
  qty             integer not null default 1 check (qty > 0),
  category        text not null default 'other'
                  check (category in ('clothes','toiletries','documents','tech','medical','gifts','kids','other')),
  -- Which age bands the line applies to; empty = everyone.
  bands           text[] not null default '{}',
  -- Multiply qty by the number of nights (socks, pants, t-shirts).
  per_night       boolean not null default false,
  sort            integer not null default 0,
  unique (organization_id, slug)
);

create table if not exists public.wf_catalog_trip_checklist (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug            text not null,
  -- 'international' | 'domestic' | 'school-trip' | 'day-out'
  scope           text not null default 'international',
  item            text not null,
  note            text not null default '',
  due_offset_days integer not null default 7 check (due_offset_days >= 0),
  sort            integer not null default 0,
  unique (organization_id, slug)
);

do $$
declare t text;
begin
  foreach t in array array['wf_catalog_packing','wf_catalog_trip_checklist'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select on public.%I to authenticated, anon', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select using (true)', t || '_read', t);
  end loop;
end $$;

create or replace function public.wf_seed_travel(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into wf_catalog_packing (organization_id, slug, template, item, qty, category, bands, per_night, sort) values
    (p_org, 'warm-tshirts',   'warm', 'T-shirts',                    1, 'clothes',    '{}',                              true,  10),
    (p_org, 'warm-shorts',    'warm', 'Shorts',                      3, 'clothes',    '{}',                              false, 20),
    (p_org, 'warm-sun-hat',   'warm', 'Sun hat',                     1, 'clothes',    '{}',                              false, 30),
    (p_org, 'warm-suncream',  'warm', 'Sun cream (factor 50)',       1, 'toiletries', '{}',                              false, 40),
    (p_org, 'warm-mozzie',    'warm', 'Mosquito spray',              1, 'medical',    '{}',                              false, 50),
    (p_org, 'warm-adapter',   'warm', 'Plug adapters',               2, 'tech',       '{adult,young-adult}',             false, 60),
    (p_org, 'warm-meds',      'warm', 'Paracetamol and plasters',    1, 'medical',    '{adult}',                         false, 70),
    (p_org, 'warm-gifts',     'warm', 'Gifts for the family there',  1, 'gifts',      '{adult,young-adult}',             false, 80),
    (p_org, 'warm-toy',       'warm', 'One special toy',             1, 'kids',       '{little,junior}',                 false, 90),
    (p_org, 'cold-thermals',  'cold', 'Thermals',                    2, 'clothes',    '{}',                              false, 10),
    (p_org, 'cold-waterproof','cold', 'Waterproof coat',             1, 'clothes',    '{}',                              false, 20),
    (p_org, 'cold-boots',     'cold', 'Wellies or walking boots',    1, 'clothes',    '{}',                              false, 30),
    (p_org, 'cold-hat',       'cold', 'Hat, scarf and gloves',       1, 'clothes',    '{}',                              false, 40),
    (p_org, 'cold-socks',     'cold', 'Thick socks',                 1, 'clothes',    '{}',                              true,  50),
    (p_org, 'city-shoes',     'city', 'Comfortable shoes',           1, 'clothes',    '{}',                              false, 10),
    (p_org, 'city-smart',     'city', 'One smart outfit',            1, 'clothes',    '{}',                              false, 20),
    (p_org, 'city-daybag',    'city', 'Day bag',                     1, 'other',      '{}',                              false, 30),
    (p_org, 'city-charger',   'city', 'Charger and power bank',      1, 'tech',       '{teen,young-adult,adult}',        false, 40),
    (p_org, 'beach-swim',     'beach','Swimming things',             2, 'clothes',    '{}',                              false, 10),
    (p_org, 'beach-towel',    'beach','Beach towel',                 1, 'other',      '{}',                              false, 20),
    (p_org, 'beach-bucket',   'beach','Bucket and spade',            1, 'kids',       '{little,junior}',                 false, 30),
    (p_org, 'school-kit',     'school-trip','The school kit list, named', 1, 'other',  '{}',                             false, 10),
    (p_org, 'school-bag',     'school-trip','Day rucksack',          1, 'other',      '{}',                              false, 20),
    (p_org, 'day-snacks',     'day-out','Snacks and water',          1, 'other',      '{}',                              false, 10),
    (p_org, 'day-spare',      'day-out','A change of clothes',       1, 'clothes',    '{little,junior}',                 false, 20)
  on conflict (organization_id, slug) do update
    set template = excluded.template, item = excluded.item, qty = excluded.qty,
        category = excluded.category, bands = excluded.bands, per_night = excluded.per_night, sort = excluded.sort;

  insert into wf_catalog_trip_checklist (organization_id, slug, scope, item, note, due_offset_days, sort) values
    (p_org, 'passports',   'international', 'Check every passport is valid six months past our return', 'The rule that catches families out. Renewals take four to six weeks.', 14, 10),
    (p_org, 'visas',       'international', 'Confirm visas, entry forms and the address we''re staying at', 'Landing cards ask for an address and a phone number.',              14, 20),
    (p_org, 'insurance',   'international', 'Travel insurance for everyone travelling',                 'One policy for the whole party, with the medical cover checked.',      14, 30),
    (p_org, 'jabs',        'international', 'Ask the GP about vaccinations',                            'Some courses have to start two weeks out.',                            14, 40),
    (p_org, 'currency',    'international', 'Order currency and tell the bank we''re travelling',       'So the cards don''t stop working on day one.',                          7, 50),
    (p_org, 'neighbour',   'international', 'Ask a neighbour to keep an eye on the house',              'A key, the bins, and a light on in the evening.',                        7, 60),
    (p_org, 'deliveries',  'international', 'Pause the deliveries and the milk',                        'Nothing says ''empty house'' like a doorstep of parcels.',               3, 70),
    (p_org, 'check-in',    'international', 'Check in online and pick seats together',                  'Twenty-four hours before, and the children sit with a parent.',          1, 80),
    (p_org, 'charge',      'international', 'Charge everything and pack the chargers last',             'Phones, tablets, the power bank, the camera.',                           0, 90),
    (p_org, 'balance',     'domestic',      'Pay the balance and print the directions',                 'Signal is a rumour up there.',                                          14, 10),
    (p_org, 'car',         'domestic',      'Service the car and check the tyres',                      'Long drive, full boot.',                                                 7, 20),
    (p_org, 'first-night', 'domestic',      'Food shop for the first night',                            'Arriving hungry to an empty fridge is a rite of passage we can skip.',   1, 30),
    (p_org, 'consent',     'school-trip',   'Return the consent form and pay the balance',              'The school''s deadline, not ours.',                                     14, 10),
    (p_org, 'name-things', 'school-trip',   'Name every single thing on the kit list',                  'Everything comes home or nothing does.',                                 7, 20),
    (p_org, 'coach',       'school-trip',   'Set the alarm for the coach',                              'Early. Earlier than that.',                                              0, 30),
    (p_org, 'tickets',     'day-out',       'Book the tickets',                                         'Cheaper online, and no queue.',                                          3, 10),
    (p_org, 'weather',     'day-out',       'Check the weather and pack accordingly',                   'Wellies or sun cream, rarely neither.',                                  1, 20)
  on conflict (organization_id, slug) do update
    set scope = excluded.scope, item = excluded.item, note = excluded.note,
        due_offset_days = excluded.due_offset_days, sort = excluded.sort;
end $$;
grant execute on function public.wf_seed_travel(uuid) to authenticated;
