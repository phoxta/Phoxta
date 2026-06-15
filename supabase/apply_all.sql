-- Phoxta platform schema — run this once in the Supabase SQL editor (new project).
-- Equivalent to migrations 0001 + 0002 + 0003 in order.

-- ============================================================
-- migrations/0001_tenancy.sql
-- ============================================================
-- Phoxta platform — 0001 tenancy & account
-- Fresh schema for the platform dashboard (Vite SPA + Supabase).
-- Per-business operating data (stores/products/orders) lives in separate
-- per-business backends and is intentionally NOT modelled here.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.app_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Note: app_is_org_member() is defined after organization_memberships exists
-- (a SQL function body is validated at creation, so the table must exist first).

-- ---------------------------------------------------------------------------
-- user_profiles (one row per auth user) — column-compatible with src/lib/db/profile.ts
-- ---------------------------------------------------------------------------
create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  job_title text not null default '',
  company_name text not null default '',
  company_size text not null default '',
  industry text not null default '',
  country text not null default '',
  primary_goal text not null default '',
  primary_role text not null default 'buyer'
    check (primary_role in ('buyer','operator','investor','founder')),
  onboarding_completed boolean not null default false,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_user_profiles_touch
  before update on user_profiles
  for each row execute function public.app_touch_updated_at();

alter table user_profiles enable row level security;

create policy user_profiles_select_own on user_profiles
  for select using (auth.uid() = user_id);
create policy user_profiles_insert_own on user_profiles
  for insert with check (auth.uid() = user_id);
create policy user_profiles_update_own on user_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- organizations (a business the user runs on Phoxta) + memberships
-- column-compatible with src/lib/db/organizations.ts
-- ---------------------------------------------------------------------------
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text unique,
  legal_name text,
  vertical text,
  blueprint_id uuid,                     -- the marketplace blueprint it started from (nullable)
  stage text not null default 'trial'
    check (stage in ('active','trial','archived')),
  primary_region text,
  billing_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_org_owner on organizations(owner_user_id);

create trigger trg_organizations_touch
  before update on organizations
  for each row execute function public.app_touch_updated_at();

create table if not exists organization_memberships (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff'
    check (role in ('owner','admin','staff','viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index if not exists idx_org_memberships_user on organization_memberships(user_id);

-- SECURITY DEFINER so membership checks bypass RLS and never recurse.
-- Defined here (after the table) so the SQL body validates.
create or replace function public.app_is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from organization_memberships m
    where m.organization_id = p_org
      and m.user_id = auth.uid()
  );
$$;
grant execute on function public.app_is_org_member(uuid) to anon, authenticated;

-- Auto-add the creator as owner member when an organization is created.
create or replace function public.app_add_owner_membership()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into organization_memberships (organization_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner')
  on conflict (organization_id, user_id) do nothing;
  return new;
end;
$$;
create trigger trg_org_owner_membership
  after insert on organizations
  for each row execute function public.app_add_owner_membership();

alter table organizations enable row level security;
alter table organization_memberships enable row level security;

-- organizations: visible to owner or any member; created/owned by self.
create policy organizations_select on organizations
  for select using (owner_user_id = auth.uid() or public.app_is_org_member(id));
create policy organizations_insert on organizations
  for insert with check (owner_user_id = auth.uid());
create policy organizations_update on organizations
  for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy organizations_delete on organizations
  for delete using (owner_user_id = auth.uid());

-- memberships: a user sees their own rows and co-members of their orgs;
-- only the org owner manages membership rows.
create policy org_memberships_select on organization_memberships
  for select using (user_id = auth.uid() or public.app_is_org_member(organization_id));
create policy org_memberships_insert on organization_memberships
  for insert with check (
    exists (select 1 from organizations o where o.id = organization_id and o.owner_user_id = auth.uid())
  );
create policy org_memberships_delete on organization_memberships
  for delete using (
    exists (select 1 from organizations o where o.id = organization_id and o.owner_user_id = auth.uid())
  );

-- ============================================================
-- migrations/0002_marketplace.sql
-- ============================================================
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
  ('niche-saas-starter','Niche SaaS Starter','A SaaS starter with subscriptions, accounts and an AI support layer.','SaaS','premium',240000,false,true,'live','{}')
on conflict (slug) do nothing;

-- ============================================================
-- migrations/0003_matching.sql
-- ============================================================
-- Phoxta platform — 0003 matching (founders, operators, investors)

-- ---------------------------------------------------------------------------
-- match_profiles: how a user presents themselves to be matched
-- ---------------------------------------------------------------------------
create table if not exists match_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'founder'
    check (role in ('founder','cofounder','operator','investor')),
  headline text not null default '',
  bio text not null default '',
  skills text[] not null default '{}',
  verticals text[] not null default '{}',
  capital_band text not null default '',
  location text not null default '',
  is_open boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_match_profiles_role on match_profiles(role);
create index if not exists idx_match_profiles_open on match_profiles(is_open);

create trigger trg_match_profiles_touch
  before update on match_profiles
  for each row execute function public.app_touch_updated_at();

alter table match_profiles enable row level security;

-- Signed-in users can browse open profiles; you always see your own.
create policy match_profiles_select on match_profiles
  for select to authenticated using (is_open = true or user_id = auth.uid());
create policy match_profiles_insert_own on match_profiles
  for insert with check (user_id = auth.uid());
create policy match_profiles_update_own on match_profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy match_profiles_delete_own on match_profiles
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- matches: a connection request between two users
-- ---------------------------------------------------------------------------
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'cofounder'
    check (kind in ('cofounder','operator','investor','advisor')),
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','withdrawn')),
  message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_user_id <> target_user_id)
);
create index if not exists idx_matches_requester on matches(requester_user_id);
create index if not exists idx_matches_target on matches(target_user_id);

create trigger trg_matches_touch
  before update on matches
  for each row execute function public.app_touch_updated_at();

alter table matches enable row level security;

-- Either party can read; requester creates; either party can update status.
create policy matches_select on matches
  for select using (requester_user_id = auth.uid() or target_user_id = auth.uid());
create policy matches_insert on matches
  for insert with check (requester_user_id = auth.uid());
create policy matches_update on matches
  for update using (requester_user_id = auth.uid() or target_user_id = auth.uid())
  with check (requester_user_id = auth.uid() or target_user_id = auth.uid());

