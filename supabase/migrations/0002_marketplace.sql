-- Phoxta platform — 0002 marketplace, purchases & subscriptions

-- ---------------------------------------------------------------------------
-- blueprints: businesses listed for sale (the marketplace catalog)
-- ---------------------------------------------------------------------------
create table if not exists blueprints (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text not null default '',
  description text not null default '',
  vertical text not null default '',
  tier text not null default 'standard'
    check (tier in ('starter','standard','premium','enterprise')),
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'USD',
  cover_url text,
  demo_url text,
  verified boolean not null default false,
  ai_included boolean not null default true,
  metrics jsonb not null default '{}'::jsonb,   -- e.g. {"mrr": 0, "margin": 0}
  status text not null default 'draft'
    check (status in ('draft','live','archived')),
  created_at timestamptz not null default now()
);
create index if not exists idx_blueprints_status on blueprints(status);
create index if not exists idx_blueprints_vertical on blueprints(vertical);

alter table blueprints enable row level security;

-- Live listings are publicly readable (marketplace browse, anon or signed-in).
-- Writes are intentionally not exposed to client roles (managed via service role).
create policy blueprints_select_live on blueprints
  for select to anon, authenticated using (status = 'live');

-- ---------------------------------------------------------------------------
-- purchases: a buyer acquiring a blueprint (the clone/launch fee)
-- ---------------------------------------------------------------------------
create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id uuid not null references auth.users(id) on delete cascade,
  blueprint_id uuid references blueprints(id) on delete set null,
  organization_id uuid references organizations(id) on delete set null,
  amount_cents integer not null default 0,
  currency text not null default 'USD',
  status text not null default 'pending'
    check (status in ('pending','paid','refunded','failed')),
  created_at timestamptz not null default now()
);
create index if not exists idx_purchases_buyer on purchases(buyer_user_id);

alter table purchases enable row level security;
create policy purchases_select_own on purchases
  for select using (buyer_user_id = auth.uid());
create policy purchases_insert_own on purchases
  for insert with check (buyer_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- subscriptions: recurring platform plan per business (organization)
-- ---------------------------------------------------------------------------
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  plan text not null default 'starter'
    check (plan in ('starter','growth','scale','enterprise')),
  status text not null default 'trialing'
    check (status in ('trialing','active','past_due','canceled')),
  amount_cents integer not null default 0,
  currency text not null default 'USD',
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_subscriptions_org on subscriptions(organization_id);

alter table subscriptions enable row level security;
create policy subscriptions_select on subscriptions
  for select using (public.app_is_org_member(organization_id));

-- Auto-provision a trial subscription when a business (organization) is created.
create or replace function public.app_add_trial_subscription()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into subscriptions (organization_id, plan, status, amount_cents, current_period_end)
  values (new.id, 'starter', 'trialing', 0, now() + interval '14 days')
  on conflict (organization_id) do nothing;
  return new;
end;
$$;
create trigger trg_org_trial_subscription
  after insert on organizations
  for each row execute function public.app_add_trial_subscription();

-- ---------------------------------------------------------------------------
-- Seed: launch marketplace catalog (from the product plan). Idempotent.
-- ---------------------------------------------------------------------------
insert into blueprints (slug, name, tagline, vertical, tier, price_cents, verified, ai_included, status, metrics)
values
  ('coffee-subscription','Coffee Subscription','A recurring coffee brand with an AI support assistant and automatic cart recovery.','E-commerce','standard',120000,true,true,'live','{"plan_band":"Starter–Standard"}'),
  ('niche-apparel','Niche Apparel','An audience-ready apparel storefront with AI product copy and built-in SEO.','E-commerce','standard',150000,true,true,'live','{}'),
  ('hair-salon-booking','Salon & Booking','A local services business with an AI receptionist and automated SMS rebooking.','Local services','starter',90000,true,true,'live','{}'),
  ('dental-clinic-portal','Dental Clinic Portal','A patient portal with online booking, reminders and an AI front desk.','Local services','standard',140000,false,true,'live','{}'),
  ('newsletter-creator','Newsletter / Creator','A content business with subscriptions, an AI editor and audience tools.','Content','starter',70000,true,true,'live','{}'),
  ('marketing-agency','Marketing Agency','A service business with CRM, scheduling, invoicing and AI content.','Service / agency','standard',180000,false,true,'live','{}'),
  ('local-marketplace','Local Marketplace','A multi-vendor marketplace with split payouts, ratings and verified numbers.','Marketplace','premium',310000,true,true,'live','{}'),
  ('online-course-studio','Online Course Studio','A course platform with payments, community and an AI teaching assistant.','Education','premium',220000,false,true,'live','{}'),
  ('restaurant-orders','Restaurant + Orders','Online ordering, reservations and an AI assistant for a restaurant.','Restaurant','standard',150000,false,true,'live','{}'),
  ('niche-saas-starter','Niche SaaS Starter','A SaaS starter with subscriptions, accounts and an AI support layer.','SaaS','premium',240000,false,true,'live','{}'),
  ('carento','Carento Car Marketplace','A full car buying and selling marketplace with listings, financing tools and an AI assistant.','Automotive','premium',390000,true,true,'live','{"built":true,"app":"businesses/carento"}'),
  ('travel','Wanderly Travel & Tours','A travel booking site for trips, tours and stays, with an AI trip planner.','Travel','premium',360000,true,true,'live','{"built":true,"app":"businesses/travel"}')
on conflict (slug) do nothing;
