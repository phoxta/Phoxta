-- 0136 — Stripe Connect: a business collects payment from ITS customers into
-- ITS OWN Stripe account, not Phoxta's. The platform Stripe (STRIPE_SECRET_KEY)
-- bills tenants for their plan; this is the opposite direction — a tenant billing
-- a customer — so the money must never land in the platform account. A connected
-- Standard account per org, and a flag for whether Stripe has cleared it to take
-- charges (set true by the account.updated webhook once onboarding completes).
alter table public.organizations add column if not exists stripe_account_id text;
alter table public.organizations add column if not exists stripe_charges_enabled boolean not null default false;

comment on column public.organizations.stripe_account_id is
  'Stripe Connect (Standard) account id for THIS business to receive customer payments. Distinct from the platform Stripe that bills the business for its plan.';
