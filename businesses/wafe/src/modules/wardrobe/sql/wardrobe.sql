-- Wàfè — wardrobe: the digital closet, the outfit builder, the attire schedule
-- and the outgrown pipeline.
--
-- Nine tables and one catalogue. The garment table (wf_wardrobe_items) carries
-- the standard visibility columns, so wf_can_see() already keeps one parent's
-- private rows from the other. On top of that this module adds ONE extra rule
-- that the app cannot be trusted to enforce alone:
--
--   A CHILD SEES ONLY THEIR OWN CLOSET AND THEIR OWN WEEK.
--
-- That is the module's whole permissions spec ("child — own closet and own
-- schedule"), and it is written into every read policy here rather than into a
-- filter in the client: wf_is_child(space_id) narrows the row to
-- owner_member_id = wf_my_member(space_id). A nine-year-old with a session and
-- a REST client gets their own jumpers and nothing else.
--
-- The outgrown pipeline (wishes, donate jobs, giving) is PARENTS ONLY, with one
-- deliberate exception: a child may read a replacement wish raised FOR them, so
-- "new shoes are on the way" is a thing the app can tell them. Nothing about the
-- charity bag or the giving ledger is theirs.
--
-- Idempotent throughout: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_wardrobe_items (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  name             text not null,
  owner_member_id  uuid not null references public.wf_members(id) on delete cascade,
  category         text not null default 'top'
                     check (category in ('top','bottom','dress','outerwear','shoes','accessory','uniform','traditional','sleepwear','sportswear')),
  colour           text not null default 'black'
                     check (colour in ('black','white','grey','navy','blue','green','red','pink','purple','yellow','orange','brown','beige','gold','multi')),
  season           text not null default 'all' check (season in ('all','spring','summer','autumn','winter')),
  -- As the label reads: "Age 9-10", "UK 12", "Size 3". Free text on purpose.
  size             text not null default '',
  brand            text not null default '',
  occasions        text[] not null default '{everyday}',
  -- A public `catalog` bucket URL live; a compressed data URL in the demo.
  -- Uploads are capped at 300 KB client-side before they ever reach here.
  image_url        text,
  status           text not null default 'in-use' check (status in ('in-use','outgrown','donate','handed-down')),
  favourite        boolean not null default false,
  in_laundry       boolean not null default false,
  last_worn        date,
  wear_count       integer not null default 0 check (wear_count >= 0),
  care_notes       text not null default '',
  notes            text not null default '',
  visibility       text not null default 'family' check (visibility in ('private','shared','family','child')),
  shared_with      uuid[] not null default '{}',
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_wardrobe_items_space on public.wf_wardrobe_items(space_id, status);
create index if not exists idx_wf_wardrobe_items_owner on public.wf_wardrobe_items(owner_member_id);

create table if not exists public.wf_outfits (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  name             text not null,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  occasion         text not null default 'everyday'
                     check (occasion in ('everyday','school','church','sport','party','travel','formal','play')),
  image_url        text,
  notes            text not null default '',
  -- The quick-fill target: "school uniform" fills a whole week from this one.
  is_uniform       boolean not null default false,
  last_worn        date,
  created_by       uuid references public.wf_members(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_outfits_space on public.wf_outfits(space_id, member_id);

-- The pieces of an outfit, in the order they were laid out. `position_json` is
-- reserved for a free-placement canvas; the shipped builder lays pieces out in
-- slot order and writes only `position`.
create table if not exists public.wf_outfit_items (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  outfit_id        uuid not null references public.wf_outfits(id) on delete cascade,
  item_id          uuid not null references public.wf_wardrobe_items(id) on delete cascade,
  position         integer not null default 0,
  position_json    jsonb,
  created_at       timestamptz not null default now(),
  unique (outfit_id, item_id)
);
create index if not exists idx_wf_outfit_items_outfit on public.wf_outfit_items(outfit_id, position);
create index if not exists idx_wf_outfit_items_item on public.wf_outfit_items(item_id);

create table if not exists public.wf_attire_schedule (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  date             date not null,
  outfit_id        uuid not null references public.wf_outfits(id) on delete cascade,
  -- "Church", "Co-op", "Swimming" — what the day is, in the family's words.
  event_label      text not null default '',
  note             text not null default '',
  worn_at          timestamptz,
  created_at       timestamptz not null default now(),
  -- One outfit per person per day: laying out two is not a plan.
  unique (space_id, member_id, date)
);
create index if not exists idx_wf_attire_schedule_day on public.wf_attire_schedule(space_id, date);

create table if not exists public.wf_wardrobe_capsules (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  name             text not null default 'Capsule',
  member_id        uuid not null references public.wf_members(id) on delete cascade,
  -- The Travel module's trip. No FK: modules never reference each other's
  -- tables (CONTRACT.md); the label carries the meaning when the id is null.
  trip_id          text,
  trip_label       text not null default '',
  season           text not null default 'all' check (season in ('all','spring','summer','autumn','winter')),
  item_ids         uuid[] not null default '{}',
  notes            text not null default '',
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_wardrobe_capsules_space on public.wf_wardrobe_capsules(space_id, member_id);

create table if not exists public.wf_handdowns (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  -- Set null rather than cascade: the history of a coat outlives the coat.
  item_id          uuid references public.wf_wardrobe_items(id) on delete set null,
  item_name        text not null default '',
  from_member_id   uuid references public.wf_members(id) on delete set null,
  to_member_id     uuid references public.wf_members(id) on delete set null,
  note             text not null default '',
  at               timestamptz not null default now()
);
create index if not exists idx_wf_handdowns_space on public.wf_handdowns(space_id, at desc);

create table if not exists public.wf_wardrobe_wishes (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  item_id          uuid references public.wf_wardrobe_items(id) on delete set null,
  name             text not null,
  for_member_id    uuid not null references public.wf_members(id) on delete cascade,
  size             text not null default '',
  price_cents      integer not null default 0 check (price_cents >= 0),
  note             text not null default '',
  status           text not null default 'open' check (status in ('open','sent','bought')),
  created_by       uuid references public.wf_members(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_wardrobe_wishes_space on public.wf_wardrobe_wishes(space_id, status);

create table if not exists public.wf_wardrobe_donations (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  space_id            uuid not null references public.wf_spaces(id) on delete cascade,
  title               text not null,
  item_ids            uuid[] not null default '{}',
  charity             text not null default '',
  due_date            date not null default current_date,
  assignee_member_id  uuid references public.wf_members(id) on delete set null,
  note                text not null default '',
  done_at             timestamptz,
  giving_entry_id     uuid,
  created_by          uuid references public.wf_members(id) on delete set null,
  created_at          timestamptz not null default now()
);
create index if not exists idx_wf_wardrobe_donations_space on public.wf_wardrobe_donations(space_id, due_date);

create table if not exists public.wf_wardrobe_giving (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  donation_id      uuid references public.wf_wardrobe_donations(id) on delete cascade,
  label            text not null default '',
  item_count       integer not null default 0 check (item_count >= 0),
  -- Minor units in the space's currency, like every other amount in Wàfè.
  amount_cents     integer not null default 0 check (amount_cents >= 0),
  date             date not null default current_date,
  member_id        uuid references public.wf_members(id) on delete set null,
  note             text not null default '',
  created_at       timestamptz not null default now()
);
create index if not exists idx_wf_wardrobe_giving_space on public.wf_wardrobe_giving(space_id, date desc);

-- ---------------------------------------------------------------------------
-- 2. Row-level security
-- ---------------------------------------------------------------------------

alter table public.wf_wardrobe_items     enable row level security;
alter table public.wf_outfits            enable row level security;
alter table public.wf_outfit_items       enable row level security;
alter table public.wf_attire_schedule    enable row level security;
alter table public.wf_wardrobe_capsules  enable row level security;
alter table public.wf_handdowns          enable row level security;
alter table public.wf_wardrobe_wishes    enable row level security;
alter table public.wf_wardrobe_donations enable row level security;
alter table public.wf_wardrobe_giving    enable row level security;

-- Table privileges: RLS decides which ROWS, this decides whether the role may
-- reach the table at all. Without it every policy above is moot.
do $$
declare t text;
begin
  foreach t in array array[
    'wf_wardrobe_items','wf_outfits','wf_outfit_items','wf_attire_schedule',
    'wf_wardrobe_capsules','wf_handdowns','wf_wardrobe_wishes',
    'wf_wardrobe_donations','wf_wardrobe_giving'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Garments: wf_can_see for adults, own-closet-only for a child, never a guest.
drop policy if exists wf_wardrobe_items_read on public.wf_wardrobe_items;
create policy wf_wardrobe_items_read on public.wf_wardrobe_items for select to authenticated
  using (
    case
      when wf_is_child(space_id) then owner_member_id = wf_my_member(space_id)
      when wf_is_parent(space_id) then wf_can_see(space_id, owner_member_id, visibility, shared_with)
      else false
    end
  );
drop policy if exists wf_wardrobe_items_write on public.wf_wardrobe_items;
create policy wf_wardrobe_items_write on public.wf_wardrobe_items for insert to authenticated
  with check (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));
drop policy if exists wf_wardrobe_items_edit on public.wf_wardrobe_items;
create policy wf_wardrobe_items_edit on public.wf_wardrobe_items for update to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));
drop policy if exists wf_wardrobe_items_del on public.wf_wardrobe_items;
create policy wf_wardrobe_items_del on public.wf_wardrobe_items for delete to authenticated
  using (wf_is_parent(space_id) or owner_member_id = wf_my_member(space_id));

-- Outfits and the pieces in them follow the outfit's member.
drop policy if exists wf_outfits_read on public.wf_outfits;
create policy wf_outfits_read on public.wf_outfits for select to authenticated
  using (wf_is_parent(space_id) or (wf_is_child(space_id) and member_id = wf_my_member(space_id)));
drop policy if exists wf_outfits_write on public.wf_outfits;
create policy wf_outfits_write on public.wf_outfits for insert to authenticated
  with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_outfits_edit on public.wf_outfits;
create policy wf_outfits_edit on public.wf_outfits for update to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_outfits_del on public.wf_outfits;
create policy wf_outfits_del on public.wf_outfits for delete to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));

create or replace function public.wf_outfit_mine(p_outfit uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wf_outfits o
    where o.id = p_outfit
      and (wf_is_parent(o.space_id) or (wf_is_member(o.space_id) and o.member_id = wf_my_member(o.space_id)))
  );
$$;

drop policy if exists wf_outfit_items_read on public.wf_outfit_items;
create policy wf_outfit_items_read on public.wf_outfit_items for select to authenticated using (wf_outfit_mine(outfit_id));
drop policy if exists wf_outfit_items_write on public.wf_outfit_items;
create policy wf_outfit_items_write on public.wf_outfit_items for insert to authenticated with check (wf_outfit_mine(outfit_id));
drop policy if exists wf_outfit_items_edit on public.wf_outfit_items;
create policy wf_outfit_items_edit on public.wf_outfit_items for update to authenticated using (wf_outfit_mine(outfit_id)) with check (wf_outfit_mine(outfit_id));
drop policy if exists wf_outfit_items_del on public.wf_outfit_items;
create policy wf_outfit_items_del on public.wf_outfit_items for delete to authenticated using (wf_outfit_mine(outfit_id));

-- The week: a child owns their own days and no one else's.
drop policy if exists wf_attire_schedule_read on public.wf_attire_schedule;
create policy wf_attire_schedule_read on public.wf_attire_schedule for select to authenticated
  using (wf_is_parent(space_id) or (wf_is_child(space_id) and member_id = wf_my_member(space_id)));
drop policy if exists wf_attire_schedule_write on public.wf_attire_schedule;
create policy wf_attire_schedule_write on public.wf_attire_schedule for insert to authenticated
  with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_attire_schedule_edit on public.wf_attire_schedule;
create policy wf_attire_schedule_edit on public.wf_attire_schedule for update to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_attire_schedule_del on public.wf_attire_schedule;
create policy wf_attire_schedule_del on public.wf_attire_schedule for delete to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));

-- Capsules: a child may read their own (it is their suitcase); parents write.
drop policy if exists wf_wardrobe_capsules_read on public.wf_wardrobe_capsules;
create policy wf_wardrobe_capsules_read on public.wf_wardrobe_capsules for select to authenticated
  using (wf_is_parent(space_id) or (wf_is_child(space_id) and member_id = wf_my_member(space_id)));
drop policy if exists wf_wardrobe_capsules_write on public.wf_wardrobe_capsules;
create policy wf_wardrobe_capsules_write on public.wf_wardrobe_capsules for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_wardrobe_capsules_edit on public.wf_wardrobe_capsules;
create policy wf_wardrobe_capsules_edit on public.wf_wardrobe_capsules for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_wardrobe_capsules_del on public.wf_wardrobe_capsules;
create policy wf_wardrobe_capsules_del on public.wf_wardrobe_capsules for delete to authenticated using (wf_is_parent(space_id));

-- Hand-me-downs: a child sees the ones they gave or received.
drop policy if exists wf_handdowns_read on public.wf_handdowns;
create policy wf_handdowns_read on public.wf_handdowns for select to authenticated
  using (
    wf_is_parent(space_id)
    or (wf_is_child(space_id) and (to_member_id = wf_my_member(space_id) or from_member_id = wf_my_member(space_id)))
  );
drop policy if exists wf_handdowns_write on public.wf_handdowns;
create policy wf_handdowns_write on public.wf_handdowns for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_handdowns_del on public.wf_handdowns;
create policy wf_handdowns_del on public.wf_handdowns for delete to authenticated using (wf_is_parent(space_id));

-- Replacements: parents own them; a child may READ the one raised for them.
drop policy if exists wf_wardrobe_wishes_read on public.wf_wardrobe_wishes;
create policy wf_wardrobe_wishes_read on public.wf_wardrobe_wishes for select to authenticated
  using (wf_is_parent(space_id) or (wf_is_child(space_id) and for_member_id = wf_my_member(space_id)));
drop policy if exists wf_wardrobe_wishes_write on public.wf_wardrobe_wishes;
create policy wf_wardrobe_wishes_write on public.wf_wardrobe_wishes for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_wardrobe_wishes_edit on public.wf_wardrobe_wishes;
create policy wf_wardrobe_wishes_edit on public.wf_wardrobe_wishes for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_wardrobe_wishes_del on public.wf_wardrobe_wishes;
create policy wf_wardrobe_wishes_del on public.wf_wardrobe_wishes for delete to authenticated using (wf_is_parent(space_id));

-- The charity bag and the giving ledger are parents only, full stop.
drop policy if exists wf_wardrobe_donations_read on public.wf_wardrobe_donations;
create policy wf_wardrobe_donations_read on public.wf_wardrobe_donations for select to authenticated using (wf_is_parent(space_id));
drop policy if exists wf_wardrobe_donations_write on public.wf_wardrobe_donations;
create policy wf_wardrobe_donations_write on public.wf_wardrobe_donations for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_wardrobe_donations_edit on public.wf_wardrobe_donations;
create policy wf_wardrobe_donations_edit on public.wf_wardrobe_donations for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_wardrobe_donations_del on public.wf_wardrobe_donations;
create policy wf_wardrobe_donations_del on public.wf_wardrobe_donations for delete to authenticated using (wf_is_parent(space_id));

drop policy if exists wf_wardrobe_giving_read on public.wf_wardrobe_giving;
create policy wf_wardrobe_giving_read on public.wf_wardrobe_giving for select to authenticated using (wf_is_parent(space_id));
drop policy if exists wf_wardrobe_giving_write on public.wf_wardrobe_giving;
create policy wf_wardrobe_giving_write on public.wf_wardrobe_giving for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_wardrobe_giving_edit on public.wf_wardrobe_giving;
create policy wf_wardrobe_giving_edit on public.wf_wardrobe_giving for update to authenticated using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_wardrobe_giving_del on public.wf_wardrobe_giving;
create policy wf_wardrobe_giving_del on public.wf_wardrobe_giving for delete to authenticated using (wf_is_parent(space_id));

-- ---------------------------------------------------------------------------
-- 3. Pre-loaded content: capsule and uniform kits
-- ---------------------------------------------------------------------------

create table if not exists public.wf_catalog_wardrobe_kits (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  slug             text not null,
  title            text not null,
  kind             text not null default 'capsule' check (kind in ('capsule','uniform','care')),
  climate          text not null default '',
  audience         text not null default '',
  -- [{ category, colour, season, note }] — a starting list, not a shopping list.
  pieces           jsonb not null default '[]'::jsonb,
  note             text not null default '',
  created_at       timestamptz not null default now(),
  unique (organization_id, slug)
);
alter table public.wf_catalog_wardrobe_kits enable row level security;
drop policy if exists wf_catalog_wardrobe_kits_read on public.wf_catalog_wardrobe_kits;
create policy wf_catalog_wardrobe_kits_read on public.wf_catalog_wardrobe_kits for select to authenticated using (true);
grant select on public.wf_catalog_wardrobe_kits to authenticated;

/**
 * Seed the wardrobe catalogue for a tenant. Idempotent: re-running updates in
 * place, so an operator can improve a kit and every new family gets the better
 * one. These are starting points a family edits, never a list to buy.
 */
create or replace function public.wf_seed_wardrobe(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.wf_catalog_wardrobe_kits (organization_id, slug, title, kind, climate, audience, pieces, note)
  values
    (p_org, 'hot-country-child', 'Hot country, one child, ten days', 'capsule', 'hot and humid', 'A child travelling to family in West Africa or the Caribbean.',
     '[{"category":"traditional","colour":"multi","season":"summer","note":"One outfit for church or the thanksgiving service"},
       {"category":"top","colour":"white","season":"summer","note":"Five light tops; cotton, not polyester"},
       {"category":"bottom","colour":"beige","season":"summer","note":"Two pairs of shorts and one long pair for mosquitoes"},
       {"category":"dress","colour":"blue","season":"summer","note":"One dress or smart shirt for photographs"},
       {"category":"sportswear","colour":"blue","season":"summer","note":"Swimming costume"},
       {"category":"shoes","colour":"white","season":"all","note":"Trainers on the plane, sandals in the case"},
       {"category":"accessory","colour":"yellow","season":"summer","note":"Sun hat"}]'::jsonb,
     'Pack light and wash there. Everything dries overnight.'),
    (p_org, 'uk-winter-child', 'A British winter, one child', 'capsule', 'cold and wet', 'Half term, a school trip, or a week at the grandparents.',
     '[{"category":"outerwear","colour":"navy","season":"winter","note":"One padded, waterproof coat with a hood"},
       {"category":"top","colour":"grey","season":"winter","note":"Three long-sleeved tops and one fleece"},
       {"category":"bottom","colour":"blue","season":"winter","note":"Two pairs of trousers; jeans dry slowly"},
       {"category":"shoes","colour":"black","season":"winter","note":"Wellingtons and one pair of dry shoes"},
       {"category":"accessory","colour":"red","season":"winter","note":"Hat, gloves, and a spare pair of gloves"},
       {"category":"sleepwear","colour":"blue","season":"winter","note":"Warm pyjamas"}]'::jsonb,
     'Two of everything that touches skin, one of everything that does not.'),
    (p_org, 'school-week', 'A school week, laid out', 'uniform', '', 'Any child in uniform.',
     '[{"category":"uniform","colour":"white","season":"all","note":"Five shirts or polo shirts — one per day, no midweek wash"},
       {"category":"uniform","colour":"grey","season":"all","note":"Two pairs of trousers, skirts or pinafores"},
       {"category":"uniform","colour":"navy","season":"autumn","note":"Two jumpers or cardigans, both name-taped"},
       {"category":"shoes","colour":"black","season":"all","note":"One pair of school shoes, checked for size each term"},
       {"category":"sportswear","colour":"navy","season":"all","note":"PE kit in its own bag, home on Fridays"}]'::jsonb,
     'Name tapes inside the collar, not the label — labels get cut out.'),
    (p_org, 'sunday-best', 'Sunday best, whole family', 'capsule', '', 'Church, a naming ceremony, a wedding.',
     '[{"category":"traditional","colour":"multi","season":"all","note":"One traditional outfit per person, pressed the night before"},
       {"category":"shoes","colour":"brown","season":"all","note":"Polished shoes; check the children''s sizes in September and January"},
       {"category":"accessory","colour":"gold","season":"all","note":"Head wrap, tie or scarf that ties the family photograph together"}]'::jsonb,
     'Lay it out on Saturday night. Sunday morning is not the time to discover a missing shoe.'),
    (p_org, 'care-basics', 'Getting three more years out of it', 'care', '', 'Anyone handing clothes down.',
     '[{"category":"uniform","colour":"white","season":"all","note":"Wash at 30°, and treat the collar before it goes in"},
       {"category":"traditional","colour":"multi","season":"all","note":"Hand wash cold, line dry in the shade — sun takes ankara colour out"},
       {"category":"outerwear","colour":"navy","season":"winter","note":"Reproof a waterproof once a year; it is not worn out, it is wetted out"},
       {"category":"shoes","colour":"black","season":"all","note":"Stuff shoes with paper overnight; they last a whole size longer"}]'::jsonb,
     'A garment handed down twice is a garment bought a third as often.')
  on conflict (organization_id, slug) do update
    set title = excluded.title,
        kind = excluded.kind,
        climate = excluded.climate,
        audience = excluded.audience,
        pieces = excluded.pieces,
        note = excluded.note;
end;
$$;

grant execute on function public.wf_seed_wardrobe(uuid) to authenticated;
grant execute on function public.wf_outfit_mine(uuid) to authenticated;
