-- Phoxta Startup School — paid admissions and access control.
--
-- The three programme fees are one-off admissions, not recurring subscriptions:
-- £50 self-study, £250 cohort and £2,500 launch. Stripe confirms the payment
-- in its signed webhook; this schema records the resulting access pass.

create table if not exists public.cs_entitlements (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('self_study', 'cohort', 'launch')),
  status text not null default 'active' check (status in ('pending', 'active', 'revoked')),
  granted_at timestamptz not null default now(),
  stripe_customer_id text,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.cs_plan_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('self_study', 'cohort', 'launch')),
  amount_pence integer not null check (amount_pence > 0),
  currency text not null default 'GBP' check (currency = 'GBP'),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_cs_plan_orders_user on public.cs_plan_orders(organization_id, user_id, created_at desc);

alter table public.cs_entitlements enable row level security;
alter table public.cs_plan_orders enable row level security;
grant select on public.cs_entitlements, public.cs_plan_orders to authenticated;
drop policy if exists cs_entitlements_read_own on public.cs_entitlements;
create policy cs_entitlements_read_own on public.cs_entitlements
  for select to authenticated using (user_id = auth.uid());
drop policy if exists cs_plan_orders_read_own on public.cs_plan_orders;
create policy cs_plan_orders_read_own on public.cs_plan_orders
  for select to authenticated using (user_id = auth.uid());

-- A small, stable helper used by RLS and security-definer classroom functions.
-- It deliberately does not accept a caller-supplied user id.
create or replace function public.cs_has_access(p_org uuid, p_min_plan text default 'self_study')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.cs_entitlements e
     where e.organization_id = p_org
       and e.user_id = auth.uid()
       and e.status = 'active'
       and case e.plan when 'self_study' then 1 when 'cohort' then 2 when 'launch' then 3 else 0 end
           >= case p_min_plan when 'self_study' then 1 when 'cohort' then 2 when 'launch' then 3 else 999 end
  );
$$;
grant execute on function public.cs_has_access(uuid, text) to authenticated;

-- The curriculum is no longer public shop content. An authenticated learner
-- must have at least the Self-study admission to retrieve it from the API.
do $$
declare t text;
begin
  foreach t in array array[
    'cs_categories', 'cs_mentors', 'cs_courses', 'cs_modules',
    'cs_lessons', 'cs_quiz_questions', 'cs_lesson_blocks'
  ] loop
    execute format('revoke select on public.%I from anon', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_paid_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.cs_has_access(organization_id, ''self_study''))', t || '_paid_read', t);
  end loop;
end $$;

-- Live schedule metadata remains visible to enrolled founders, but reserving,
-- entering a class, community activity and mentor sessions require Cohort.
drop policy if exists cs_live_rsvps_cohort_access on public.cs_live_rsvps;
create policy cs_live_rsvps_cohort_access on public.cs_live_rsvps as restrictive
  for all to authenticated
  using (public.cs_has_access(organization_id, 'cohort'))
  with check (public.cs_has_access(organization_id, 'cohort'));

drop policy if exists cs_group_posts_cohort_access on public.cs_group_posts;
create policy cs_group_posts_cohort_access on public.cs_group_posts as restrictive
  for all to authenticated
  using (public.cs_has_access(organization_id, 'cohort'))
  with check (public.cs_has_access(organization_id, 'cohort'));

drop policy if exists cs_bookings_cohort_access on public.cs_bookings;
create policy cs_bookings_cohort_access on public.cs_bookings as restrictive
  for all to authenticated
  using (public.cs_has_access(organization_id, 'cohort'))
  with check (public.cs_has_access(organization_id, 'cohort'));

-- RPCs run with elevated table permissions, so a trigger carries the same
-- Cohort check into booking and classroom entry rather than relying on UI-only
-- restrictions.
create or replace function public.cs_require_cohort_access()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.cs_has_access(new.organization_id, 'cohort') then
    raise exception 'Cohort access is required for this activity';
  end if;
  return new;
end $$;

drop trigger if exists trg_cs_cohort_booking on public.cs_bookings;
create trigger trg_cs_cohort_booking
  before insert or update on public.cs_bookings
  for each row execute function public.cs_require_cohort_access();

do $$
begin
  if to_regclass('public.cs_live_participants') is not null then
    execute 'drop trigger if exists trg_cs_cohort_live_participant on public.cs_live_participants';
    execute 'create trigger trg_cs_cohort_live_participant before insert or update on public.cs_live_participants for each row execute function public.cs_require_cohort_access()';
  end if;
end $$;

-- learn.phoxta.com serves the exact same central school already behind the
-- production Startup School host. Keep the older host live during the cutover.
insert into public.domains (organization_id, hostname, kind, is_primary, status, tls_status, verified_at)
select d.organization_id, 'learn.phoxta.com', 'subdomain', true, 'live', 'issued', now()
  from public.domains d
 where lower(d.hostname) = 'startup-school.phoxta.com'
on conflict (hostname) do update set
  status = 'live', tls_status = 'issued', verified_at = coalesce(domains.verified_at, now());

comment on table public.cs_entitlements is
  'The active Startup School admission for a learner. Written only by the signed Stripe webhook.';
