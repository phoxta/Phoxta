-- Phoxta — 0121: the business dossier.
--
-- WHAT THIS IS
--
-- Every blueprint Phoxta sells now carries a dossier: the industry it sits in,
-- the competition, the strategy, and the documents a small online business
-- actually needs — go-to-market, pricing, financials, an operations manual, a
-- sourcing plan and a risk register. It is what the operating console's
-- Playbook tab reads.
--
-- TWO LAYERS, AND WHY THEY ARE SEPARATE TABLES
--
-- LAYER 1 — the blueprint dossier. Written ONCE per blueprint and shared by
-- every business built from it. Five blueprints generated once is cheap; five
-- hundred customers each generating their own is not, and the five hundred
-- copies would differ from one another for no reason anybody could defend. So
-- these tables have no organization_id at all: they are a catalogue, exactly
-- like `blueprints` itself, and they take that table's RLS shape — readable by
-- anyone once published, writable only by the service role (0002:32). The anon
-- grant is deliberate: it leaves the marketplace listing free to show the same
-- dossier as pre-purchase evidence without a schema change.
--
-- LAYER 2 — the owner's own version. Created ONLY when an owner asks for it and
-- answers the context questions; until then they read Layer 1 and the page says
-- so. These tables ARE org-scoped and carry the ordinary tenant policy, because
-- they hold one business's own market, budget and plans.
--
-- ONE ROW PER SECTION, NOT ONE DOCUMENT PER DOSSIER
--
-- The generator advances a section per call (a Supabase function dies at 150s
-- and the full run is minutes of model time). If a whole dossier were one jsonb
-- document, every section would be a read-modify-write of it and two admins
-- generating at once would silently clobber each other. A row per section makes
-- that impossible rather than merely unlikely.
--
-- `section` is plain text with no enum and no check. Migration 0110 records why:
-- a value can never be removed from a Postgres enum, and this vocabulary will
-- change. The writing edge function's own registry is the allowlist.

-- ---------------------------------------------------------------------------
-- Layer 1 — the shared blueprint dossier
-- ---------------------------------------------------------------------------
create table if not exists blueprint_dossiers (
  blueprint_id uuid primary key references blueprints(id) on delete cascade,

  -- 'draft' while it is being generated, so a half-written dossier is invisible
  -- to buyers rather than half-shown. Platform admins see drafts (policy below).
  status text not null default 'draft' check (status in ('draft', 'live', 'archived')),

  -- Set at the top of each section and cleared when the run finishes, so a
  -- second tab (or a reload mid-run) shows a run in flight rather than a
  -- dossier that looks stalled. Written by dossier-run — unlike ideas.run_started_at,
  -- which 0109 declared and nothing ever set.
  run_started_at timestamptz,
  run_finished_at timestamptz,
  -- Why the last run stopped. A failed run should say so on reload instead of
  -- looking idle.
  run_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists blueprint_dossier_sections (
  id uuid primary key default gen_random_uuid(),
  blueprint_id uuid not null references blueprints(id) on delete cascade,
  section text not null,

  -- The section's own JSON contract (see supabase/functions/dossier-run/sections.ts).
  -- Every quantity inside is an estimate object — { low, high, unit, basis,
  -- assumptions[], confidence, sources[] } — and `sources` is always present and
  -- always empty. That empty array is the seam: a later research pass can push
  -- citations into it without a migration, without a prompt rewrite and without
  -- touching the renderer, which already loops over it and draws nothing when it
  -- is empty.
  content jsonb not null default '{}'::jsonb,

  model text,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (blueprint_id, section)
);

create index if not exists idx_bp_dossier_sections on blueprint_dossier_sections(blueprint_id);

alter table blueprint_dossiers enable row level security;
alter table blueprint_dossier_sections enable row level security;

-- Published dossiers are readable by anyone, exactly as live blueprints are.
-- There is no insert/update/delete policy on either table on purpose: writes go
-- through the service role in dossier-run and nowhere else.
drop policy if exists blueprint_dossiers_select_live on blueprint_dossiers;
create policy blueprint_dossiers_select_live on blueprint_dossiers
  for select to anon, authenticated using (status = 'live');

drop policy if exists blueprint_dossier_sections_select_live on blueprint_dossier_sections;
create policy blueprint_dossier_sections_select_live on blueprint_dossier_sections
  for select to anon, authenticated using (
    exists (
      select 1 from blueprint_dossiers d
      where d.blueprint_id = blueprint_dossier_sections.blueprint_id
        and d.status = 'live'
    )
  );

-- Platform admins also read drafts — otherwise the person generating a dossier
-- cannot see what has been generated, and the client cannot drive the chain.
drop policy if exists blueprint_dossiers_select_admin on blueprint_dossiers;
create policy blueprint_dossiers_select_admin on blueprint_dossiers
  for select to authenticated using (public.app_is_platform_admin());

drop policy if exists blueprint_dossier_sections_select_admin on blueprint_dossier_sections;
create policy blueprint_dossier_sections_select_admin on blueprint_dossier_sections
  for select to authenticated using (public.app_is_platform_admin());

-- ---------------------------------------------------------------------------
-- Layer 2 — one business's own version
-- ---------------------------------------------------------------------------
create table if not exists org_dossiers (
  organization_id uuid primary key references organizations(id) on delete cascade,

  -- Which blueprint's dossier this was localised from, pinned at the moment the
  -- owner asked. Kept so the "back to the global picture" switch has an answer
  -- even if the organisation is later re-pointed.
  blueprint_id uuid references blueprints(id) on delete set null,

  -- The owner's six answers, verbatim: { location, market, customer, budget,
  -- timeline, assets }. Kept whole so a re-run reads what they actually said
  -- rather than asking again — the same reason `designs.brief` exists (0111).
  context jsonb not null default '{}'::jsonb,

  -- 'draft' until at least one section exists; 'ready' once the run finishes.
  status text not null default 'draft' check (status in ('draft', 'ready', 'archived')),

  run_started_at timestamptz,
  run_finished_at timestamptz,
  run_error text,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists org_dossier_sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  section text not null,
  content jsonb not null default '{}'::jsonb,
  model text,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, section)
);

create index if not exists idx_org_dossier_sections on org_dossier_sections(organization_id);

alter table org_dossiers enable row level security;
alter table org_dossier_sections enable row level security;

-- The same shape as every other tenant table: membership of the organisation is
-- the whole check, on read and write. Delete is what "start again" uses.
drop policy if exists org_dossiers_all on org_dossiers;
create policy org_dossiers_all on org_dossiers
  for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

drop policy if exists org_dossier_sections_all on org_dossier_sections;
create policy org_dossier_sections_all on org_dossier_sections
  for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- updated_at, for all four
-- ---------------------------------------------------------------------------
create or replace function public.app_touch_dossier_updated()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists blueprint_dossiers_touch on blueprint_dossiers;
create trigger blueprint_dossiers_touch before update on blueprint_dossiers
  for each row execute function public.app_touch_dossier_updated();

drop trigger if exists blueprint_dossier_sections_touch on blueprint_dossier_sections;
create trigger blueprint_dossier_sections_touch before update on blueprint_dossier_sections
  for each row execute function public.app_touch_dossier_updated();

drop trigger if exists org_dossiers_touch on org_dossiers;
create trigger org_dossiers_touch before update on org_dossiers
  for each row execute function public.app_touch_dossier_updated();

drop trigger if exists org_dossier_sections_touch on org_dossier_sections;
create trigger org_dossier_sections_touch before update on org_dossier_sections
  for each row execute function public.app_touch_dossier_updated();

comment on table blueprint_dossiers is
  'One dossier per marketplace blueprint, shared by every business built from it. Service-role writes only; readable once status = live.';
comment on table org_dossier_sections is
  'A single business''s own version of a dossier section, generated only when its owner asks and answers the context questions.';
comment on column org_dossiers.context is
  'The owner''s answers: { location, market, customer, budget, timeline, assets }. Read on every regeneration so the questions are asked once.';
