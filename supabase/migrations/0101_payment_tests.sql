-- Phoxta — 0101: a record of test payments, so "did it work?" has an answer.
--
-- A card being charged and the platform actually working are different facts.
-- Fulfilment happens in stripe-webhook, so a purchase can take the money and
-- provision nothing — a live key against a test-mode webhook secret does
-- exactly that, silently, and the customer is the one who finds out.
--
-- Each test therefore records two moments: when checkout was started, and when
-- the WEBHOOK was seen. The gap between them is the thing worth looking at.

create table if not exists payment_tests (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  amount_cents integer not null,
  currency text not null default 'GBP',
  note text not null default '',
  stripe_session_id text unique,
  stripe_payment_intent text,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed')),
  -- Null means the webhook never arrived. That is the failure this table exists
  -- to make visible, so it is a column and not an inference.
  webhook_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_tests_created on payment_tests(created_at desc);

alter table payment_tests enable row level security;

-- Platform admins only. This spends real money when the key is live, so the
-- rule is enforced here rather than by hiding a button.
drop policy if exists payment_tests_admin_read on payment_tests;
create policy payment_tests_admin_read on payment_tests
  for select using (public.app_is_platform_admin());

-- Writes come from the edge functions under service_role; nobody inserts a
-- payment record from a browser.

-- app_is_platform_admin() reads auth.uid(), which is null under service_role —
-- so an edge function checking on a user's behalf needs to name the user. Same
-- roster, same answer, asked a way the backend can ask it.
create or replace function public.app_is_platform_admin_for(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = p_user);
$$;
revoke all on function public.app_is_platform_admin_for(uuid) from public, anon, authenticated;
grant execute on function public.app_is_platform_admin_for(uuid) to service_role;
