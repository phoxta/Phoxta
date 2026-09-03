-- Phoxta — the content engine: a month that carries its own strategy.
--
-- WHAT WAS WRONG. A plan stored `rationale` — two or three sentences of prose —
-- and nothing else about WHY the month looked the way it did. The posts carried
-- less than that: a caption, a design, a time. The "angle" the planner wrote for
-- each post was dropped into designs.title and never reached the post, so it
-- could never be joined to what happened next. The result is a system that
-- cannot answer the only question that matters after a month has run: which of
-- these choices worked?
--
-- SO STRATEGY BECOMES A FIRST-CLASS THING, IN TWO PLACES:
--
--   content_plan_sections — one row per stage of the thinking (situation,
--   audience, strategy, calendar), exactly as org_dossier_sections holds a
--   dossier. A row per section rather than one jsonb document on the parent for
--   0121's stated reason: two tabs advancing the same plan would otherwise
--   clobber each other, and the loser is silent.
--
--   social_posts.pillar / funnel_stage / angle / campaign_key — the strategy
--   ON the post, so performance attributes to a CHOICE rather than to an
--   individual caption. "Posts about our regulars do better than posts about
--   discounts" is a finding a business can act on; "post 14 got 30 likes" is
--   trivia.
--
-- WHY NO CHECK CONSTRAINTS ON THE NEW TEXT COLUMNS. The vocabulary of pillars
-- and funnel stages will change — that is the nature of a strategy — and a value
-- cannot be removed from a check constraint without a migration that rewrites
-- every row that used it (see 0110). The registry in code is the allowlist; the
-- database stores what was decided.

-- ── 1. The thinking, one row per stage ──────────────────────────────────────
create table if not exists content_plan_sections (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references content_plans(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,

  /** 'context' | 'situation' | 'audience' | 'strategy' | 'calendar'.
   *  Deliberately free text: the stage registry in content-plan-run/stages.ts
   *  is the allowlist, and adding a stage should not need a migration. */
  section text not null,
  content jsonb not null default '{}'::jsonb,

  /** Which model wrote it, so a regression can be traced to a routing change. */
  model text,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (plan_id, section)
);

create index if not exists idx_content_plan_sections_plan
  on content_plan_sections(plan_id);

alter table content_plan_sections enable row level security;

drop policy if exists content_plan_sections_all on content_plan_sections;
create policy content_plan_sections_all on content_plan_sections for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ── 2. Run state on the plan ────────────────────────────────────────────────
-- Deliberately NOT a new value on content_plans.status. "Being built" is derived
-- from the timestamps, exactly as org_dossiers does it — adding a status value
-- would mean a check-constraint migration on a table app_approve_content_plan
-- already depends on, for a fact the timestamps already carry.
alter table content_plans
  /** The structured setup the owner chose: goal, featured products, offers to
   *  anchor on, segments, platforms, cadence, blackout dates. Kept so a
   *  regenerate means the same thing, and so the strategy can be re-run
   *  against the same intent. */
  add column if not exists inputs jsonb not null default '{}'::jsonb,
  add column if not exists posts_target int not null default 12,
  add column if not exists run_started_at timestamptz,
  add column if not exists run_finished_at timestamptz,
  /** Cleared on the next successful stage. A run that failed halfway must say
   *  so on the plan itself, not only in a response nobody kept. */
  add column if not exists run_error text;

-- ── 3. The strategy, on the post ────────────────────────────────────────────
alter table social_posts
  /** Which calendar slot produced this post. The unique index below is what
   *  makes a production batch safe to retry: a double-submitted batch
   *  conflicts instead of quietly writing the month twice. */
  add column if not exists plan_slot_id text,
  add column if not exists pillar text,
  add column if not exists funnel_stage text,
  add column if not exists angle text,
  add column if not exists campaign_key text,
  /** Per-platform copy: { "instagram": {...}, "linkedin": {...} }.
   *  `caption` stays the canonical fallback so everything that reads it today
   *  keeps working; the publisher prefers captions[platform] when present.
   *  One caption for every platform was always a compromise — LinkedIn's
   *  no-link rule and X's 280 characters were both satisfied by making the
   *  Instagram caption worse. */
  add column if not exists captions jsonb not null default '{}'::jsonb;

create unique index if not exists idx_social_posts_plan_slot
  on social_posts(plan_id, plan_slot_id)
  where plan_id is not null and plan_slot_id is not null;

create index if not exists idx_social_posts_pillar
  on social_posts(organization_id, pillar)
  where pillar is not null;

comment on column social_posts.funnel_stage is
  'awareness | consideration | conversion | retention. Free text on purpose: the
   vocabulary will change, and a value cannot be dropped from a check constraint
   without rewriting every row that used it.';

-- ── 4. When this business posts ─────────────────────────────────────────────
-- Owner overrides for the encoded defaults in _shared/cadence.ts. Absent means
-- "use the defaults", which is the normal case and must stay free.
create table if not exists social_settings (
  organization_id uuid primary key references organizations(id) on delete cascade,

  /** { "instagram": { "perWeek": 3, "hours": [11,19], "days": [1,2,3,4,5] }, … } */
  windows jsonb not null default '{}'::jsonb,
  /** ["2026-12-25", …] — dates nothing may be scheduled on. */
  blackout_dates jsonb not null default '[]'::jsonb,
  min_gap_hours int not null default 18,

  updated_at timestamptz not null default now()
);

alter table social_settings enable row level security;

drop policy if exists social_settings_all on social_settings;
create policy social_settings_all on social_settings for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));
