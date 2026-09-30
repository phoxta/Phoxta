-- Startup School uses a dedicated Stripe configuration rather than the
-- account-wide default. It allows card entry and turns off Stripe Link for
-- this programme, so pricing checkout does not collect a Link phone number.

create table if not exists public.cs_payment_method_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  stripe_payment_method_configuration_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cs_payment_method_settings enable row level security;

comment on table public.cs_payment_method_settings is
  'Server-owned Stripe payment-method configuration for Startup School checkout.';
