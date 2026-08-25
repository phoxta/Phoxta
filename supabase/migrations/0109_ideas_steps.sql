-- Phoxta — 0109: validation is steps that run in minutes, not days.
--
-- 0108 carried the old app's day numbering across, gaps and all: no Day 6, and
-- Day 10 following Day 8, because phases were retired without renumbering. I
-- kept it on the argument that renaming would re-point stored ai_profile.dayN
-- keys — but that was true of the OLD database. These tables are new here and
-- hold no rows, so nothing is being preserved by keeping the scars.
--
-- And the product has changed: there is no ten-day programme. The whole
-- validation runs in minutes, so a schema counting days describes something
-- that no longer exists. A founder is not on "Day 4" — they are at the customer
-- validation step, which finished twenty seconds ago.
--
-- Steps are named, not numbered. `step` reads in a query result; `day_number: 7`
-- needs a lookup table to mean anything, and the lookup was the thing that had
-- gaps in it.

-- ── The step vocabulary ────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'idea_step') then
    create type idea_step as enum (
      'problem',    -- the problem and who has it
      'market',     -- size, growth, competitors
      'value',      -- the differentiated proposition
      'customer',   -- demand evidence
      'model',      -- revenue, pricing, unit economics
      'report',     -- the consolidated validation report
      'strategy',   -- the business plan
      'website'     -- the generated site
    );
  end if;
end $$;

-- ── What the founder wrote, per step ───────────────────────────────────────
drop table if exists day_inputs;

create table if not exists idea_step_inputs (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references ideas(id) on delete cascade,
  step idea_step not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idea_id, step)
);

create index if not exists idx_idea_step_inputs on idea_step_inputs(idea_id, step);

alter table idea_step_inputs enable row level security;

drop policy if exists idea_step_inputs_own on idea_step_inputs;
create policy idea_step_inputs_own on idea_step_inputs
  for all using (exists (select 1 from ideas i where i.id = idea_id and i.user_id = auth.uid()))
  with check (exists (select 1 from ideas i where i.id = idea_id and i.user_id = auth.uid()));

drop trigger if exists trg_idea_step_inputs_updated on idea_step_inputs;
create trigger trg_idea_step_inputs_updated before update on idea_step_inputs
  for each row execute function public.app_touch_ideas_updated();

-- ── The idea itself follows ────────────────────────────────────────────────
-- current_day counted through a programme that no longer has days. What matters
-- now is which step is running and whether the run is still going, because the
-- whole thing completes while the founder watches it.
alter table ideas drop column if exists current_day;

alter table ideas add column if not exists current_step idea_step not null default 'problem';

-- Set while a run is in flight so a second tab, or a reload mid-run, shows the
-- run rather than an idea that looks stalled.
alter table ideas add column if not exists run_started_at timestamptz;
alter table ideas add column if not exists run_finished_at timestamptz;
alter table ideas add column if not exists run_error text;

comment on column ideas.ai_profile is
  'Generated output keyed by step name — problem, market, value, customer, '
  'model, strategy. The report has its own column because completion is derived '
  'from it. Keys are step names, never day numbers.';

comment on type idea_step is
  'Validation runs as named steps in minutes. The predecessor numbered these as '
  'days 1-5, 7, 8 and 10 — with no day 6 — which described a programme the '
  'product no longer has.';
