-- Phoxta — 0102: the idea validation workflow.
--
-- Ported from the earlier Next.js Phoxta, where `ideas` and `day_inputs` were
-- created straight in the Supabase dashboard and never captured in a migration.
-- That is why this file reconstructs them from the application code rather than
-- copying a prior migration: the shape below is every column those 27 API routes
-- actually read or write, and nothing that only existed by accident.
--
-- The feature has two surfaces and one bridge between them:
--   * the public homepage validator, anonymous and rate-limited, which turns a
--     sentence into a scored report;
--   * the signed-in workflow, which walks that idea through Days 1-5, a report,
--     a strategy and a generated site.
-- The bridge is a localStorage seed, so nothing here needs to know about it —
-- but the rate limit and the lead capture do, because the first surface runs
-- without an account and is therefore the one that gets abused.

-- ── An idea in progress ────────────────────────────────────────────────────
create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  title text not null,
  -- The sentence the founder actually typed. Kept verbatim and separate from
  -- the title: every regeneration re-reads this, so a tidied-up title must not
  -- overwrite what they meant.
  idea_seed text not null default '',
  target_audience text,
  core_outcome text,
  mvp_type text,

  -- Each day's generated work lands under its own key (day1, day2 …). One
  -- document rather than a row per field, because a day's output is written and
  -- read whole and its shape differs per day.
  ai_profile jsonb not null default '{}'::jsonb,
  -- The consolidated validation report (Day 7). Its own column because progress
  -- is derived from whether it exists.
  report jsonb,
  photos jsonb not null default '[]'::jsonb,

  current_day integer not null default 1,
  status text not null default 'active'
    check (status in ('active', 'completed', 'archived')),
  -- Once locked, regeneration stops rewriting the founder's own answers.
  is_profile_locked boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ideas_user on ideas(user_id, updated_at desc);
create index if not exists idx_ideas_status on ideas(user_id, status);

-- ── What the founder wrote for a given day ─────────────────────────────────
-- Separate from ai_profile on purpose: ai_profile holds what the model
-- produced, this holds what the person said. Merging them would make it
-- impossible to regenerate a day without destroying their input.
create table if not exists day_inputs (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references ideas(id) on delete cascade,
  day_number integer not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idea_id, day_number)
);

create index if not exists idx_day_inputs_idea on day_inputs(idea_id, day_number);

alter table ideas enable row level security;
alter table day_inputs enable row level security;

drop policy if exists ideas_own on ideas;
create policy ideas_own on ideas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reached through its idea, so the owner check lives there and cannot drift
-- from it.
drop policy if exists day_inputs_own on day_inputs;
create policy day_inputs_own on day_inputs
  for all using (exists (select 1 from ideas i where i.id = idea_id and i.user_id = auth.uid()))
  with check (exists (select 1 from ideas i where i.id = idea_id and i.user_id = auth.uid()));

create or replace function public.app_touch_ideas_updated()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_ideas_updated on ideas;
create trigger trg_ideas_updated before update on ideas
  for each row execute function public.app_touch_ideas_updated();

drop trigger if exists trg_day_inputs_updated on day_inputs;
create trigger trg_day_inputs_updated before update on day_inputs
  for each row execute function public.app_touch_ideas_updated();

-- ── Homepage validator: rate limit ─────────────────────────────────────────
-- The public surface runs a multi-thousand-token model call for anyone who
-- types a sentence. Without a cap that is an open invoice, so attempts are
-- counted per IP per UTC day.
--
-- The IP is stored hashed. The limit needs to know "same visitor as before",
-- which a hash answers; it does not need to know who they are, and keeping raw
-- addresses would make this table a privacy liability for no added function.
create table if not exists homepage_validation_usage (
  id bigserial primary key,
  ip_hash text not null,
  usage_date date not null default (timezone('utc', now()))::date,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  first_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  unique (ip_hash, usage_date)
);

create index if not exists idx_hv_usage_day on homepage_validation_usage(usage_date);

alter table homepage_validation_usage enable row level security;
-- No policy: only the edge function, under service_role, ever touches this.

/**
 * Claim one attempt. Returns whether it was allowed and what is left.
 *
 * Counting and checking in one statement is the point — read-then-write would
 * let two simultaneous requests both see "1 used" and both proceed.
 */
create or replace function public.consume_homepage_validation_attempt(
  p_ip_hash text,
  p_limit integer default 2
)
returns table (allowed boolean, attempt_count integer, remaining integer)
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  insert into homepage_validation_usage (ip_hash, attempt_count, first_attempt_at, last_attempt_at)
  values (p_ip_hash, 1, now(), now())
  on conflict (ip_hash, usage_date) do update
    set attempt_count = homepage_validation_usage.attempt_count + 1,
        last_attempt_at = now()
  returning homepage_validation_usage.attempt_count into v_count;

  return query select v_count <= p_limit, v_count, greatest(p_limit - v_count, 0);
end $$;

revoke all on function public.consume_homepage_validation_attempt(text, integer) from public, anon, authenticated;
grant execute on function public.consume_homepage_validation_attempt(text, integer) to service_role;

-- ── Homepage validator: who tried it ───────────────────────────────────────
-- A validator run is the strongest buying signal the public site produces:
-- someone described a business they are thinking about starting. Capturing it
-- is the reason the free surface exists.
create table if not exists homepage_validator_leads (
  id bigserial primary key,
  idea_seed text not null,
  email text,
  phone text,
  ip_hash text,
  country_code text,
  city text,
  user_agent text,
  referrer text,
  -- Set once the visitor signs up and the seed becomes a real idea, which is
  -- what makes this table answer "did the validator actually convert?".
  converted_idea_id uuid references ideas(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_hv_leads_created on homepage_validator_leads(created_at desc);

alter table homepage_validator_leads enable row level security;

-- Platform admins read it; the edge function writes it under service_role.
drop policy if exists hv_leads_admin_read on homepage_validator_leads;
create policy hv_leads_admin_read on homepage_validator_leads
  for select using (public.app_is_platform_admin());
