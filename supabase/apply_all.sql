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
  ('niche-saas-starter','Niche SaaS Starter','A SaaS starter with subscriptions, accounts and an AI support layer.','SaaS','premium',240000,false,true,'live','{}'),
  ('carento','Carento Car Marketplace','A full car buying and selling marketplace with listings, financing tools and an AI assistant.','Automotive','premium',390000,true,true,'live','{"built":true,"app":"businesses/carento"}'),
  ('travel','Wanderly Travel & Tours','A travel booking site for trips, tours and stays, with an AI trip planner.','Travel','premium',360000,true,true,'live','{"built":true,"app":"businesses/travel"}')
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



-- ============================================================
-- migrations/0004_ai.sql
-- ============================================================
-- Phoxta platform — 0004 AI assistant & usage metering
-- The intelligence layer: every business (organization) gets an AI assistant.
-- All model calls go through the `ai-gateway` Edge Function (server-side key,
-- per-org metering). These tables are the conversation store + usage ledger.
--
-- Writes to ai_messages / ai_usage come from the Edge Function (service role,
-- which bypasses RLS). Client roles only READ them, scoped to org membership.

-- ---------------------------------------------------------------------------
-- ai_conversations: one chat thread, owned by a business (organization)
-- ---------------------------------------------------------------------------
create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ai_conversations_org on ai_conversations(organization_id);

create trigger trg_ai_conversations_touch
  before update on ai_conversations
  for each row execute function public.app_touch_updated_at();

alter table ai_conversations enable row level security;

-- Any member of the business can see and start its conversations.
create policy ai_conversations_select on ai_conversations
  for select using (public.app_is_org_member(organization_id));
create policy ai_conversations_insert on ai_conversations
  for insert with check (public.app_is_org_member(organization_id) and user_id = auth.uid());
create policy ai_conversations_update on ai_conversations
  for update using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- ai_messages: turns in a conversation. organization_id is denormalised so RLS
-- is a single membership check (no join back to the conversation).
-- ---------------------------------------------------------------------------
create table if not exists ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null default '',
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_messages_conversation on ai_messages(conversation_id, created_at);

alter table ai_messages enable row level security;

-- Members read the transcript. Inserts are made by the gateway (service role),
-- so no client insert policy is exposed: the model's replies are authoritative.
create policy ai_messages_select on ai_messages
  for select using (public.app_is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- ai_usage: per-call token ledger, the basis for metering and billing.
-- ---------------------------------------------------------------------------
create table if not exists ai_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  conversation_id uuid references ai_conversations(id) on delete set null,
  model text not null default '',
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_cents numeric(12,4) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_usage_org_created on ai_usage(organization_id, created_at);

alter table ai_usage enable row level security;

-- Members can read their business's usage (for the assistant + billing views).
create policy ai_usage_select on ai_usage
  for select using (public.app_is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- app_org_ai_tokens_this_month: total tokens an org has spent this calendar
-- month. SECURITY DEFINER so members can read their own meter without exposing
-- the whole ledger; the gateway uses it (via service role) to enforce caps.
-- ---------------------------------------------------------------------------
create or replace function public.app_org_ai_tokens_this_month(p_org uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(input_tokens + output_tokens), 0)::bigint
  from ai_usage
  where organization_id = p_org
    and public.app_is_org_member(p_org)
    and created_at >= date_trunc('month', now());
$$;
grant execute on function public.app_org_ai_tokens_this_month(uuid) to authenticated;


-- ============================================================
-- migrations/0005_collaboration.sql
-- ============================================================
-- Phoxta platform — 0005 collaboration: team invitations & notifications
-- Multi-user businesses (invite teammates) + an in-app notification feed that
-- turns platform events (connection requests, accepted invites) into alerts.

-- ---------------------------------------------------------------------------
-- Helper: is the current user an owner/admin of the org? (manage invites)
-- ---------------------------------------------------------------------------
create or replace function public.app_is_org_admin(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organization_memberships m
    where m.organization_id = p_org
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  );
$$;
grant execute on function public.app_is_org_admin(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- organization_invitations: invite a teammate by email to a business
-- ---------------------------------------------------------------------------
create table if not exists organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null default 'staff' check (role in ('admin','staff','viewer')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
-- At most one open invite per email per business.
create unique index if not exists idx_org_invites_unique_pending
  on organization_invitations (organization_id, lower(email))
  where status = 'pending';
create index if not exists idx_org_invites_email on organization_invitations (lower(email));

alter table organization_invitations enable row level security;

-- Members see their org's invites; an invited person sees invites to their email.
create policy org_invites_select on organization_invitations
  for select using (
    public.app_is_org_member(organization_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
-- Only owners/admins create invites (and must record themselves as the inviter).
create policy org_invites_insert on organization_invitations
  for insert with check (public.app_is_org_admin(organization_id) and invited_by = auth.uid());
-- Owners/admins can revoke (update status); acceptance goes through the function.
create policy org_invites_update on organization_invitations
  for update using (public.app_is_org_admin(organization_id))
  with check (public.app_is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- notifications: per-user in-app feed (system-generated)
-- ---------------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  kind text not null default 'info' check (kind in ('info','invite','billing','network','ai')),
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on notifications (user_id, created_at desc);

alter table notifications enable row level security;

-- Users see and dismiss (mark read) only their own notifications.
create policy notifications_select_own on notifications
  for select using (user_id = auth.uid());
create policy notifications_update_own on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Accept an invitation: definer fn so the invitee can join (RLS otherwise only
-- lets the owner add memberships). Validates the invite is for the caller's
-- email, adds the membership, marks accepted, and pings the inviter.
-- ---------------------------------------------------------------------------
create or replace function public.app_accept_invitation(p_invitation uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_org uuid;
  v_role text;
  v_inviter uuid;
begin
  select organization_id, role, invited_by
    into v_org, v_role, v_inviter
  from organization_invitations
  where id = p_invitation and status = 'pending' and lower(email) = v_email;

  if v_org is null then
    return null;  -- not found / not for this user / already handled
  end if;

  insert into organization_memberships (organization_id, user_id, role)
  values (v_org, auth.uid(), v_role)
  on conflict (organization_id, user_id) do nothing;

  update organization_invitations set status = 'accepted' where id = p_invitation;

  if v_inviter is not null then
    insert into notifications (user_id, title, body, kind, link)
    values (v_inviter, 'Invitation accepted', 'A teammate accepted your invitation.', 'invite', '/dashboard/businesses');
  end if;

  return v_org;
end;
$$;
grant execute on function public.app_accept_invitation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Turn network events (table `matches`, from 0003) into notifications.
-- ---------------------------------------------------------------------------
create or replace function public.app_on_match_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into notifications (user_id, title, body, kind, link)
    values (new.target_user_id, 'New connection request',
            coalesce(nullif(new.message, ''), 'Someone wants to connect with you.'),
            'network', '/dashboard/network');
  elsif (tg_op = 'UPDATE' and new.status = 'accepted' and old.status is distinct from 'accepted') then
    insert into notifications (user_id, title, body, kind, link)
    values (new.requester_user_id, 'Connection accepted',
            'Your connection request was accepted.', 'network', '/dashboard/network');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_match_notify on matches;
create trigger trg_match_notify
  after insert or update on matches
  for each row execute function public.app_on_match_change();


-- ============================================================
-- migrations/0006_operating.sql
-- ============================================================
-- Phoxta — 0006 per-business operating backend
-- The operational layer each business runs on: CRM, commerce, invoicing &
-- subscriptions, CMS, scheduling/bookings, helpdesk, marketing automation,
-- analytics. Every row is keyed to organization_id and isolated by RLS
-- (app_is_org_member), so each business only ever sees its own data.
--
-- Each table uses one `for all` policy = select/insert/update/delete for members.

-- ===========================================================================
-- CRM
-- ===========================================================================
create table if not exists crm_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  email text not null default '',
  phone text not null default '',
  company text not null default '',
  stage text not null default 'lead' check (stage in ('lead','prospect','customer','churned')),
  tags text[] not null default '{}',
  notes text not null default '',
  value_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_crm_contacts_org on crm_contacts(organization_id);
create trigger trg_crm_contacts_touch before update on crm_contacts
  for each row execute function public.app_touch_updated_at();
alter table crm_contacts enable row level security;
create policy crm_contacts_all on crm_contacts for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- Commerce: products / orders / order items / fulfillment
-- ===========================================================================
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  sku text not null default '',
  description text not null default '',
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'USD',
  stock integer not null default 0,
  status text not null default 'active' check (status in ('active','draft','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_org on products(organization_id);
create trigger trg_products_touch before update on products
  for each row execute function public.app_touch_updated_at();
alter table products enable row level security;
create policy products_all on products for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid references crm_contacts(id) on delete set null,
  customer_name text not null default '',
  customer_email text not null default '',
  status text not null default 'pending'
    check (status in ('pending','paid','fulfilled','cancelled','refunded')),
  fulfillment_status text not null default 'unfulfilled'
    check (fulfillment_status in ('unfulfilled','fulfilled')),
  total_cents integer not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orders_org on orders(organization_id, created_at desc);
create trigger trg_orders_touch before update on orders
  for each row execute function public.app_touch_updated_at();
alter table orders enable row level security;
create policy orders_all on orders for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  name text not null default '',
  quantity integer not null default 1 check (quantity > 0),
  unit_price_cents integer not null default 0
);
create index if not exists idx_order_items_order on order_items(order_id);
alter table order_items enable row level security;
create policy order_items_all on order_items for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- Invoicing & subscriptions (per business — distinct from the platform plan)
-- ===========================================================================
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid references crm_contacts(id) on delete set null,
  number text not null default '',
  customer_name text not null default '',
  customer_email text not null default '',
  status text not null default 'draft' check (status in ('draft','sent','paid','void')),
  issue_date date not null default current_date,
  due_date date,
  total_cents integer not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_invoices_org on invoices(organization_id, created_at desc);
create trigger trg_invoices_touch before update on invoices
  for each row execute function public.app_touch_updated_at();
alter table invoices enable row level security;
create policy invoices_all on invoices for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null default '',
  quantity integer not null default 1 check (quantity > 0),
  unit_price_cents integer not null default 0
);
create index if not exists idx_invoice_items_invoice on invoice_items(invoice_id);
alter table invoice_items enable row level security;
create policy invoice_items_all on invoice_items for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

create table if not exists customer_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid references crm_contacts(id) on delete set null,
  plan_name text not null default '',
  amount_cents integer not null default 0,
  currency text not null default 'USD',
  interval text not null default 'monthly' check (interval in ('monthly','yearly')),
  status text not null default 'active' check (status in ('active','paused','canceled')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_customer_subs_org on customer_subscriptions(organization_id);
create trigger trg_customer_subs_touch before update on customer_subscriptions
  for each row execute function public.app_touch_updated_at();
alter table customer_subscriptions enable row level security;
create policy customer_subs_all on customer_subscriptions for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- CMS: draft -> publish -> revalidate
-- ===========================================================================
create table if not exists cms_pages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  slug text not null,
  title text not null default '',
  body text not null default '',
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  revalidated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);
create index if not exists idx_cms_pages_org on cms_pages(organization_id);
create trigger trg_cms_pages_touch before update on cms_pages
  for each row execute function public.app_touch_updated_at();
alter table cms_pages enable row level security;
create policy cms_pages_all on cms_pages for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- Scheduling / bookings
-- ===========================================================================
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text not null default '',
  duration_min integer not null default 30 check (duration_min > 0),
  price_cents integer not null default 0,
  currency text not null default 'USD',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_services_org on services(organization_id);
create trigger trg_services_touch before update on services
  for each row execute function public.app_touch_updated_at();
alter table services enable row level security;
create policy services_all on services for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  contact_id uuid references crm_contacts(id) on delete set null,
  customer_name text not null default '',
  customer_email text not null default '',
  start_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_bookings_org on bookings(organization_id, start_at);
create trigger trg_bookings_touch before update on bookings
  for each row execute function public.app_touch_updated_at();
alter table bookings enable row level security;
create policy bookings_all on bookings for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- Helpdesk (with AI deflection)
-- ===========================================================================
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid references crm_contacts(id) on delete set null,
  subject text not null default '',
  customer_name text not null default '',
  customer_email text not null default '',
  status text not null default 'open' check (status in ('open','pending','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  ai_deflected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tickets_org on tickets(organization_id, created_at desc);
create trigger trg_tickets_touch before update on tickets
  for each row execute function public.app_touch_updated_at();
alter table tickets enable row level security;
create policy tickets_all on tickets for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

create table if not exists ticket_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  ticket_id uuid not null references tickets(id) on delete cascade,
  author text not null default 'agent' check (author in ('customer','agent','ai')),
  body text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_ticket_messages_ticket on ticket_messages(ticket_id, created_at);
alter table ticket_messages enable row level security;
create policy ticket_messages_all on ticket_messages for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- Marketing automation: campaigns + automations
-- ===========================================================================
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  channel text not null default 'email' check (channel in ('email','sms')),
  subject text not null default '',
  body text not null default '',
  audience text not null default 'all',
  status text not null default 'draft' check (status in ('draft','scheduled','sent')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipients integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_campaigns_org on campaigns(organization_id, created_at desc);
create trigger trg_campaigns_touch before update on campaigns
  for each row execute function public.app_touch_updated_at();
alter table campaigns enable row level security;
create policy campaigns_all on campaigns for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

create table if not exists automations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  trigger text not null default 'contact_created'
    check (trigger in ('contact_created','order_paid','booking_created','ticket_created')),
  action text not null default 'send_email'
    check (action in ('send_email','add_tag','create_task','notify')),
  config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  runs integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_automations_org on automations(organization_id);
create trigger trg_automations_touch before update on automations
  for each row execute function public.app_touch_updated_at();
alter table automations enable row level security;
create policy automations_all on automations for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- Analytics: lightweight event log + a rollup summary for the console overview
-- ===========================================================================
create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_analytics_events_org on analytics_events(organization_id, created_at desc);
alter table analytics_events enable row level security;
create policy analytics_events_all on analytics_events for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- A single aggregate the Overview screen reads. SECURITY DEFINER but gated on
-- membership, so a member gets one cheap round-trip instead of many counts.
create or replace function public.app_org_ops_summary(p_org uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.app_is_org_member(p_org) then null else jsonb_build_object(
    'contacts',          (select count(*) from crm_contacts where organization_id = p_org),
    'customers',         (select count(*) from crm_contacts where organization_id = p_org and stage = 'customer'),
    'products',          (select count(*) from products where organization_id = p_org),
    'low_stock',         (select count(*) from products where organization_id = p_org and stock <= 5 and status = 'active'),
    'orders',            (select count(*) from orders where organization_id = p_org),
    'revenue_cents',     (select coalesce(sum(total_cents), 0) from orders where organization_id = p_org and status in ('paid','fulfilled')),
    'unfulfilled',       (select count(*) from orders where organization_id = p_org and status = 'paid' and fulfillment_status = 'unfulfilled'),
    'outstanding_cents', (select coalesce(sum(total_cents), 0) from invoices where organization_id = p_org and status = 'sent'),
    'open_tickets',      (select count(*) from tickets where organization_id = p_org and status in ('open','pending')),
    'ai_deflected',      (select count(*) from tickets where organization_id = p_org and ai_deflected),
    'upcoming_bookings', (select count(*) from bookings where organization_id = p_org and start_at >= now() and status in ('pending','confirmed')),
    'active_subs',       (select count(*) from customer_subscriptions where organization_id = p_org and status = 'active'),
    'published_pages',   (select count(*) from cms_pages where organization_id = p_org and status = 'published')
  ) end;
$$;
grant execute on function public.app_org_ops_summary(uuid) to authenticated;


-- ============================================================
-- migrations/0007_ai_native.sql
-- ============================================================
-- Phoxta — 0007 AI-native foundation
-- Makes the operating layer AI-native (not AI-enabled): per-tenant RAG via
-- pgvector, an embedding queue fed by triggers, AI usage/eval governance,
-- intelligence columns the model writes back, and a durable workflow engine
-- whose steps (including AI actions) are observable and replayable.
--
-- All tables org-scoped + RLS (app_is_org_member). The vector match function is
-- service-role only: edge functions authorize membership, then retrieve.

create extension if not exists vector;

-- ===========================================================================
-- Per-tenant retrieval index (RAG). One table, hard org filter + RLS — so
-- cross-tenant retrieval is physically impossible (KB requirement).
-- ===========================================================================
create table if not exists ai_embeddings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  source_type text not null,           -- 'products' | 'cms_pages' | 'crm_contacts' | 'tickets'
  source_id uuid not null,
  content text not null,
  embedding vector(1536),              -- OpenAI text-embedding-3-small
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, source_type, source_id)
);
create index if not exists idx_ai_embeddings_hnsw on ai_embeddings using hnsw (embedding vector_cosine_ops);
create index if not exists idx_ai_embeddings_org on ai_embeddings(organization_id);

alter table ai_embeddings enable row level security;
create policy ai_embeddings_select on ai_embeddings for select
  using (public.app_is_org_member(organization_id));

-- Vector similarity search. SECURITY DEFINER + hard org filter; service-role only
-- (the calling edge function has already verified the user's membership).
create or replace function public.app_match_embeddings(
  p_org uuid,
  query_embedding vector(1536),
  match_count int default 6,
  p_source_types text[] default null
)
returns table (source_type text, source_id uuid, content text, similarity float)
language sql
stable
security definer
set search_path = public
as $$
  select e.source_type, e.source_id, e.content, 1 - (e.embedding <=> query_embedding) as similarity
  from ai_embeddings e
  where e.organization_id = p_org
    and e.embedding is not null
    and (p_source_types is null or e.source_type = any (p_source_types))
  order by e.embedding <=> query_embedding
  limit greatest(1, least(match_count, 20));
$$;
revoke all on function public.app_match_embeddings(uuid, vector, int, text[]) from public, anon, authenticated;
grant execute on function public.app_match_embeddings(uuid, vector, int, text[]) to service_role;

-- ===========================================================================
-- Embedding queue: triggers enqueue source rows; the embed-worker drains it.
-- ===========================================================================
create table if not exists ai_embedding_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  content text not null,
  status text not null default 'pending' check (status in ('pending','done','error')),
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_embed_queue_pending on ai_embedding_queue(status) where status = 'pending';
alter table ai_embedding_queue enable row level security;
-- No client policies: only the service-role worker reads/writes this queue.

create or replace function public.app_enqueue_embedding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_content text;
begin
  if tg_table_name = 'products' then
    v_content := coalesce(new.name, '') || E'\n' || coalesce(new.description, '');
  elsif tg_table_name = 'cms_pages' then
    if new.status <> 'published' then return new; end if;
    v_content := coalesce(new.title, '') || E'\n' || coalesce(new.body, '');
  elsif tg_table_name = 'crm_contacts' then
    v_content := coalesce(new.name, '') || ' ' || coalesce(new.company, '') || E'\n' || coalesce(new.notes, '');
  elsif tg_table_name = 'tickets' then
    v_content := coalesce(new.subject, '');
  else
    return new;
  end if;

  if length(trim(v_content)) = 0 then return new; end if;

  insert into ai_embedding_queue (organization_id, source_type, source_id, content)
  values (new.organization_id, tg_table_name, new.id, v_content);
  return new;
end;
$$;

create trigger trg_embed_products after insert or update on products
  for each row execute function public.app_enqueue_embedding();
create trigger trg_embed_cms_pages after insert or update on cms_pages
  for each row execute function public.app_enqueue_embedding();
create trigger trg_embed_crm_contacts after insert or update on crm_contacts
  for each row execute function public.app_enqueue_embedding();
create trigger trg_embed_tickets after insert or update on tickets
  for each row execute function public.app_enqueue_embedding();

-- ===========================================================================
-- AI usage / eval governance (Langfuse-lite). Extend the existing meter.
-- ===========================================================================
alter table ai_usage add column if not exists feature text not null default 'assistant';
alter table ai_usage add column if not exists tier text not null default 'balanced';
alter table ai_usage add column if not exists latency_ms integer not null default 0;
alter table ai_usage add column if not exists status text not null default 'ok';

-- ===========================================================================
-- Intelligence columns the model writes back into the domain rows.
-- ===========================================================================
alter table crm_contacts add column if not exists lead_score integer;
alter table crm_contacts add column if not exists churn_risk numeric(4,3);
alter table crm_contacts add column if not exists ai_summary text;
alter table crm_contacts add column if not exists scored_at timestamptz;

alter table tickets add column if not exists sentiment text;
alter table tickets add column if not exists category text;
alter table tickets add column if not exists ai_summary text;

-- ===========================================================================
-- Durable workflow engine: AI actions as observable, replayable steps.
-- ===========================================================================
create table if not exists workflow_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  automation_id uuid references automations(id) on delete set null,
  trigger text not null,
  status text not null default 'pending' check (status in ('pending','running','succeeded','failed')),
  input jsonb not null default '{}'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_workflow_runs_org on workflow_runs(organization_id, created_at desc);
create index if not exists idx_workflow_runs_pending on workflow_runs(status) where status = 'pending';
create trigger trg_workflow_runs_touch before update on workflow_runs
  for each row execute function public.app_touch_updated_at();

alter table workflow_runs enable row level security;
create policy workflow_runs_select on workflow_runs for select
  using (public.app_is_org_member(organization_id));
-- Inserts come from the trigger (definer) and the worker (service role); updates
-- from the worker (service role) — no client write policy.

-- Fan out a workflow run per active automation when a trigger event fires.
create or replace function public.app_on_automation_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trigger text;
  a record;
begin
  if tg_table_name = 'crm_contacts' then
    v_trigger := 'contact_created';
  elsif tg_table_name = 'orders' then
    if not (tg_op = 'UPDATE' and new.status = 'paid' and old.status is distinct from 'paid') then
      return new;
    end if;
    v_trigger := 'order_paid';
  elsif tg_table_name = 'bookings' then
    v_trigger := 'booking_created';
  elsif tg_table_name = 'tickets' then
    v_trigger := 'ticket_created';
  else
    return new;
  end if;

  for a in
    select id from automations
    where organization_id = new.organization_id and active and trigger = v_trigger
  loop
    insert into workflow_runs (organization_id, automation_id, trigger, input)
    values (new.organization_id, a.id, v_trigger, jsonb_build_object('source_id', new.id));
  end loop;
  return new;
end;
$$;

create trigger trg_automation_contact after insert on crm_contacts
  for each row execute function public.app_on_automation_trigger();
create trigger trg_automation_order after update on orders
  for each row execute function public.app_on_automation_trigger();
create trigger trg_automation_booking after insert on bookings
  for each row execute function public.app_on_automation_trigger();
create trigger trg_automation_ticket after insert on tickets
  for each row execute function public.app_on_automation_trigger();


-- ============================================================
-- migrations/0008_ai_agent.sql
-- ============================================================
-- Phoxta — 0008 unified AI Agent
-- One configurable, RAG-grounded, tool-using agent per business ("one brain,
-- every touchpoint") that operates the business: omnichannel conversations with
-- unified memory, an outbound campaign engine, multi-location call routing, and
-- reporting. The agent acts by calling the operating backend (0006) as tools.
-- All org-scoped + RLS (app_is_org_member).

-- ===========================================================================
-- agent_config — one per business; the agent's persona, hours, capabilities.
-- ===========================================================================
create table if not exists agent_config (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  display_name text not null default 'AI Agent',
  persona text not null default 'A warm, professional front-desk assistant.',
  greeting text not null default 'Hi! Thanks for reaching out — how can I help today?',
  tone text not null default 'friendly',
  model_tier text not null default 'balanced' check (model_tier in ('cheap','balanced','complex')),
  business_hours jsonb not null default '{"tz":"UTC","open":"09:00","close":"17:00","days":[1,2,3,4,5]}'::jsonb,
  escalation jsonb not null default '{"to_email":"","on_intents":["complaint","refund"]}'::jsonb,
  capabilities jsonb not null default '{
    "call_center":true,"scheduling":true,"after_hours":true,"reminders":true,
    "nurturing":true,"instant_callback":true,"receptionist":true,"chatbot":true,
    "customer_service":true,"cold_calling":true,"lead_qualification":true,"upsell":true
  }'::jsonb,
  voice jsonb not null default '{}'::jsonb,
  public_key text not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_agent_config_public on agent_config(public_key);
create trigger trg_agent_config_touch before update on agent_config
  for each row execute function public.app_touch_updated_at();
alter table agent_config enable row level security;
create policy agent_config_all on agent_config for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- locations — multi-location call routing + centralized reporting.
-- ===========================================================================
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  zip text not null default '',
  phone text not null default '',
  service_types text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_locations_org on locations(organization_id);
alter table locations enable row level security;
create policy locations_all on locations for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- channels — connected touchpoints (web, sms, whatsapp, voice, ...).
-- ===========================================================================
create table if not exists channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type text not null check (type in ('web','sms','whatsapp','instagram','tiktok','yelp','voice')),
  label text not null default '',
  external_ref text not null default '',
  status text not null default 'simulated' check (status in ('connected','disconnected','simulated')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_channels_org on channels(organization_id);
alter table channels enable row level security;
create policy channels_all on channels for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- conversations — unified memory, keyed to a customer across every channel.
-- ===========================================================================
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  channel_type text not null default 'web',
  contact_id uuid references crm_contacts(id) on delete set null,
  location_id uuid references locations(id) on delete set null,
  customer_name text not null default '',
  customer_phone text not null default '',
  customer_email text not null default '',
  status text not null default 'open' check (status in ('open','handled','escalated','closed')),
  intent text,
  qualified boolean not null default false,
  lead_score integer,
  summary text not null default '',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_conversations_org on conversations(organization_id, last_message_at desc);
create index if not exists idx_conversations_contact on conversations(contact_id);
create trigger trg_conversations_touch before update on conversations
  for each row execute function public.app_touch_updated_at();
alter table conversations enable row level security;
create policy conversations_all on conversations for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

create table if not exists conversation_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer','agent','human','system')),
  channel_type text not null default 'web',
  body text not null default '',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_conversation_messages on conversation_messages(conversation_id, created_at);
alter table conversation_messages enable row level security;
create policy conversation_messages_all on conversation_messages for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- Outbound engine — campaigns + a task queue (cold call, upsell, nurture, ...).
-- ===========================================================================
create table if not exists outbound_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  type text not null default 'nurture'
    check (type in ('cold_call','sdr','upsell','cross_sell','nurture','reminder','instant_callback','after_hours')),
  channel_pref text not null default 'call' check (channel_pref in ('call','sms','email')),
  goal text not null default '',
  script text not null default '',
  audience jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','active','paused','done')),
  schedule jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_outbound_campaigns_org on outbound_campaigns(organization_id, created_at desc);
create trigger trg_outbound_campaigns_touch before update on outbound_campaigns
  for each row execute function public.app_touch_updated_at();
alter table outbound_campaigns enable row level security;
create policy outbound_campaigns_all on outbound_campaigns for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

create table if not exists outbound_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  campaign_id uuid references outbound_campaigns(id) on delete set null,
  type text not null default 'nurture',
  contact_id uuid references crm_contacts(id) on delete set null,
  conversation_id uuid references conversations(id) on delete set null,
  channel text not null default 'call' check (channel in ('call','sms','email')),
  to_ref text not null default '',
  customer_name text not null default '',
  status text not null default 'queued' check (status in ('queued','in_progress','done','failed','no_answer')),
  attempts integer not null default 0,
  due_at timestamptz not null default now(),
  outcome text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_outbound_tasks_due on outbound_tasks(status, due_at) where status = 'queued';
create index if not exists idx_outbound_tasks_org on outbound_tasks(organization_id, created_at desc);
create trigger trg_outbound_tasks_touch before update on outbound_tasks
  for each row execute function public.app_touch_updated_at();
alter table outbound_tasks enable row level security;
create policy outbound_tasks_all on outbound_tasks for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- call_logs — call-center reporting across branches.
-- ===========================================================================
create table if not exists call_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  location_id uuid references locations(id) on delete set null,
  direction text not null default 'inbound' check (direction in ('inbound','outbound')),
  from_number text not null default '',
  to_number text not null default '',
  duration_sec integer not null default 0,
  outcome text not null default 'completed',
  after_hours boolean not null default false,
  recording_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_call_logs_org on call_logs(organization_id, created_at desc);
alter table call_logs enable row level security;
create policy call_logs_all on call_logs for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- Routing + reporting helpers
-- ===========================================================================
-- Pick the best location for a caller by ZIP, then by service type. Service-role
-- only (the calling edge function has already authorized the org).
create or replace function public.app_route_location(p_org uuid, p_zip text, p_service text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from locations
  where organization_id = p_org and active
  order by
    (zip = coalesce(p_zip, '')) desc,
    (coalesce(p_service, '') = any (service_types)) desc,
    created_at asc
  limit 1;
$$;
revoke all on function public.app_route_location(uuid, text, text) from public, anon, authenticated;
grant execute on function public.app_route_location(uuid, text, text) to service_role;

-- One aggregate for the agent Overview / call-center reporting.
create or replace function public.app_org_agent_summary(p_org uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.app_is_org_member(p_org) then null else jsonb_build_object(
    'conversations',      (select count(*) from conversations where organization_id = p_org),
    'open',               (select count(*) from conversations where organization_id = p_org and status = 'open'),
    'escalated',          (select count(*) from conversations where organization_id = p_org and status = 'escalated'),
    'qualified_leads',    (select count(*) from conversations where organization_id = p_org and qualified),
    'after_hours_calls',  (select count(*) from call_logs where organization_id = p_org and after_hours),
    'calls',              (select count(*) from call_logs where organization_id = p_org),
    'bookings',           (select count(*) from bookings where organization_id = p_org),
    'outbound_queued',    (select count(*) from outbound_tasks where organization_id = p_org and status = 'queued'),
    'outbound_done',      (select count(*) from outbound_tasks where organization_id = p_org and status = 'done'),
    'locations',          (select count(*) from locations where organization_id = p_org and active),
    'calls_by_location',  (select coalesce(jsonb_object_agg(coalesce(l.name,'Unassigned'), c.n), '{}'::jsonb)
                            from (select location_id, count(*) n from call_logs where organization_id = p_org group by location_id) c
                            left join locations l on l.id = c.location_id)
  ) end;
$$;
grant execute on function public.app_org_agent_summary(uuid) to authenticated;

-- Index conversation summaries into the RAG memory so the agent can recall
-- across channels/sessions.
create or replace function public.app_enqueue_conversation_embedding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.summary, '') = '' then return new; end if;
  if tg_op = 'UPDATE' and new.summary is not distinct from old.summary then return new; end if;
  insert into ai_embedding_queue (organization_id, source_type, source_id, content)
  values (new.organization_id, 'conversations', new.id,
          coalesce(new.customer_name, '') || E'\n' || new.summary);
  return new;
end;
$$;
create trigger trg_embed_conversations after insert or update on conversations
  for each row execute function public.app_enqueue_conversation_embedding();


-- ============================================================
-- migrations/0009_embeddings_1024.sql
-- ============================================================
-- Phoxta — switch the RAG vector dimension to 1024 (Voyage voyage-3.5-lite).
-- Safe: no embeddings are stored yet. If you later change providers, re-run with
-- the matching dimension (OpenAI/Gemini = 1536) and re-index.
delete from ai_embeddings;
drop index if exists idx_ai_embeddings_hnsw;
alter table ai_embeddings alter column embedding type vector(1024);
create index idx_ai_embeddings_hnsw on ai_embeddings using hnsw (embedding vector_cosine_ops);

drop function if exists public.app_match_embeddings(uuid, vector, int, text[]);
create or replace function public.app_match_embeddings(
  p_org uuid,
  query_embedding vector(1024),
  match_count int default 6,
  p_source_types text[] default null
)
returns table (source_type text, source_id uuid, content text, similarity float)
language sql
stable
security definer
set search_path = public
as $$
  select e.source_type, e.source_id, e.content, 1 - (e.embedding <=> query_embedding) as similarity
  from ai_embeddings e
  where e.organization_id = p_org
    and e.embedding is not null
    and (p_source_types is null or e.source_type = any (p_source_types))
  order by e.embedding <=> query_embedding
  limit greatest(1, least(match_count, 20));
$$;
revoke all on function public.app_match_embeddings(uuid, vector, int, text[]) from public, anon, authenticated;
grant execute on function public.app_match_embeddings(uuid, vector, int, text[]) to service_role;

-- ============================================================
-- migrations/0010_businesses_architecture.sql
-- ============================================================
-- Phoxta platform — 0010 businesses architecture
-- Implements the KB "businesses" model (knowledge-base/03,04). Phoxta builds every
-- business (the blueprint storefront apps in businesses/<slug>); users BUY them.
-- A purchase runs the site factory: provision a fresh tenant from the blueprint
-- (CREATE), the buyer brands/configures it (BUILD), then runs it with real
-- customers (OPERATE). Domains: a Phoxta subdomain on create + link-your-own
-- custom domain with TLS. (No user-side listing/reselling — all blueprints are
-- authored by Phoxta.)

-- ---------------------------------------------------------------------------
-- organizations: business lifecycle + site-factory/config fields
-- ---------------------------------------------------------------------------
alter table organizations
  add column if not exists lifecycle_stage text not null default 'draft'
    check (lifecycle_stage in ('draft','building','operating','archived')),
  add column if not exists app_path text,                 -- which storefront app, e.g. 'businesses/carento'
  add column if not exists site_url text,                 -- deployed storefront URL
  add column if not exists provisioned_at timestamptz,
  add column if not exists modules jsonb not null default '{}'::jsonb,    -- enabled modules + site composition + AI/automation presets
  add column if not exists ops_metrics jsonb not null default '{}'::jsonb; -- OPERATE tracking: unit economics, AI deflection, automation error rate, CSAT, ops hours

-- ---------------------------------------------------------------------------
-- blueprints: the provisioning preset the site factory copies + sale terms
-- (all authored by Phoxta; status/license/exclusivity are platform-set)
-- ---------------------------------------------------------------------------
alter table blueprints
  add column if not exists app_path text,                 -- storefront app folder, e.g. 'businesses/carento'
  add column if not exists preset jsonb not null default '{}'::jsonb,    -- {modules, ai_config, automations, content_scaffold, site_composition}
  add column if not exists license text not null default 'standard',
  add column if not exists exclusivity text;              -- e.g. geographic exclusivity on premium tiers

-- ---------------------------------------------------------------------------
-- domains: subdomain (auto on provision) + linked custom domains (verify + TLS)
-- ---------------------------------------------------------------------------
create table if not exists domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  hostname text not null unique,
  kind text not null default 'custom' check (kind in ('subdomain','custom')),
  is_primary boolean not null default false,
  status text not null default 'pending' check (status in ('pending','verifying','live','error')),
  verification_token text not null default encode(gen_random_bytes(16), 'hex'),
  dns_target text,                                         -- CNAME target the owner points at
  tls_status text not null default 'none' check (tls_status in ('none','pending','issued')),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_domains_org on domains(organization_id);

alter table domains enable row level security;
-- Org members manage their own org's domains.
create policy domains_all on domains
  for all using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- Public host resolution: a deployed storefront resolves which tenant a request
-- belongs to from its hostname. SECURITY DEFINER returns only routing info for a
-- LIVE domain (no tenant business data), so it is safe to expose to anon.
create or replace function public.app_resolve_domain(p_host text)
returns table (organization_id uuid, slug text, app_path text, site_url text, name text)
language sql stable security definer set search_path = public as $$
  select o.id, o.slug, o.app_path, o.site_url, o.name
  from domains d
  join organizations o on o.id = d.organization_id
  where lower(d.hostname) = lower(p_host)
    and d.status = 'live'
  limit 1;
$$;
grant execute on function public.app_resolve_domain(text) to anon, authenticated;

-- Auto-create the Phoxta subdomain when a business gets a slug (CREATE move).
-- Base domain is configurable via the `app.base_domain` GUC (defaults phoxta.app).
create or replace function public.app_add_subdomain()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_base text := coalesce(nullif(current_setting('app.base_domain', true), ''), 'phoxta.app');
begin
  if new.slug is not null then
    insert into domains (organization_id, hostname, kind, is_primary, status, tls_status, verified_at)
    values (new.id, new.slug || '.' || v_base, 'subdomain', true, 'live', 'issued', now())
    on conflict (hostname) do nothing;
  end if;
  return new;
end;
$$;
create trigger trg_org_subdomain
  after insert on organizations
  for each row execute function public.app_add_subdomain();

-- ---------------------------------------------------------------------------
-- Site factory: provision a fresh tenant (business) from a blueprint.
-- The CREATE move: org owned by the buyer, preset copied in, subdomain + owner
-- membership + trial subscription auto-created by their triggers, purchase logged.
-- ---------------------------------------------------------------------------
create or replace function public.app_provision_business(p_blueprint uuid, p_name text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_bp blueprints%rowtype;
  v_org_id uuid;
  v_slug text;
  v_suffix text := substr(encode(gen_random_bytes(4), 'hex'), 1, 6);
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  select * into v_bp from blueprints where id = p_blueprint and status = 'live';
  if not found then
    raise exception 'Blueprint not available';
  end if;

  v_slug := regexp_replace(lower(coalesce(v_bp.slug, 'business')), '[^a-z0-9]+', '-', 'g') || '-' || v_suffix;

  insert into organizations (owner_user_id, name, slug, vertical, blueprint_id, stage,
                             lifecycle_stage, app_path, modules, provisioned_at)
  values (v_uid, coalesce(nullif(p_name, ''), v_bp.name), v_slug, v_bp.vertical, v_bp.id, 'trial',
          'building', v_bp.app_path, coalesce(v_bp.preset, '{}'::jsonb), now())
  returning id into v_org_id;
  -- triggers fire here: owner membership, trial subscription, subdomain.

  insert into purchases (buyer_user_id, blueprint_id, organization_id, amount_cents, currency, status)
  values (v_uid, v_bp.id, v_org_id, v_bp.price_cents, v_bp.currency, 'pending');

  return v_org_id;
end;
$$;
grant execute on function public.app_provision_business(uuid, text) to authenticated;

-- Backfill: tag the two pre-built businesses' blueprints with their app_path so
-- the platform knows which storefront app each provisions (idempotent).
update blueprints set app_path = 'businesses/carento' where slug = 'carento' and app_path is null;
update blueprints set app_path = 'businesses/travel'  where slug = 'travel'  and app_path is null;

-- ============================================================
-- migrations/0011_fix_token_gen.sql
-- ============================================================
-- Phoxta platform — 0011 fix token/suffix generation
-- 0010 used gen_random_bytes() (pgcrypto), which on Supabase lives in the
-- `extensions` schema and is NOT on the `public` search_path our SECURITY DEFINER
-- functions and column defaults run under — so provisioning failed with
-- "function gen_random_bytes(integer) does not exist". Switch to the core
-- gen_random_uuid() (always available) for the domain verification token and the
-- provisioning slug suffix.

-- Domain ownership-verification token default (evaluated on insert).
alter table domains
  alter column verification_token set default replace(gen_random_uuid()::text, '-', '');

-- Site factory: same body as 0010, only the slug suffix source changed.
create or replace function public.app_provision_business(p_blueprint uuid, p_name text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_bp blueprints%rowtype;
  v_org_id uuid;
  v_slug text;
  v_suffix text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  select * into v_bp from blueprints where id = p_blueprint and status = 'live';
  if not found then
    raise exception 'Blueprint not available';
  end if;

  v_slug := regexp_replace(lower(coalesce(v_bp.slug, 'business')), '[^a-z0-9]+', '-', 'g') || '-' || v_suffix;

  insert into organizations (owner_user_id, name, slug, vertical, blueprint_id, stage,
                             lifecycle_stage, app_path, modules, provisioned_at)
  values (v_uid, coalesce(nullif(p_name, ''), v_bp.name), v_slug, v_bp.vertical, v_bp.id, 'trial',
          'building', v_bp.app_path, coalesce(v_bp.preset, '{}'::jsonb), now())
  returning id into v_org_id;

  insert into purchases (buyer_user_id, blueprint_id, organization_id, amount_cents, currency, status)
  values (v_uid, v_bp.id, v_org_id, v_bp.price_cents, v_bp.currency, 'pending');

  return v_org_id;
end;
$$;
grant execute on function public.app_provision_business(uuid, text) to authenticated;

-- ============================================================
-- migrations/0012_gearo_and_previews.sql
-- ============================================================
-- Phoxta platform — 0012 add Gearo blueprint + make the built businesses previewable
-- Adds the Gearo furniture storefront to the marketplace catalogue and sets a
-- demo/preview URL + cover image on all three built businesses so the marketplace
-- "Preview" button appears. Preview URLs default to each app's local dev/preview
-- port; replace with the deployed URL once each business is hosted.

insert into blueprints (slug, name, tagline, description, vertical, tier, price_cents, currency, cover_url, demo_url, verified, ai_included, status, app_path, metrics)
values (
  'gearo',
  'Gearo Furniture Store',
  'A modern furniture & workspace eCommerce store with cart, checkout and an AI shopping assistant.',
  'A full furniture eCommerce storefront — hero, categories, product grids, product detail, cart, checkout, account and blog — built in React and ready to brand.',
  'Furniture / eCommerce',
  'standard',
  140000,
  'USD',
  'https://picsum.photos/seed/gearo-cover/800/600',
  'http://localhost:4174',
  true,
  true,
  'live',
  'businesses/gearo',
  '{"built": true, "app": "businesses/gearo"}'::jsonb
)
on conflict (slug) do update set
  tagline = excluded.tagline,
  description = excluded.description,
  cover_url = excluded.cover_url,
  demo_url = excluded.demo_url,
  app_path = excluded.app_path,
  metrics = excluded.metrics,
  status = 'live';

-- Preview URLs + covers for the other two built businesses.
update blueprints set demo_url = 'http://localhost:4173', cover_url = coalesce(cover_url, 'https://picsum.photos/seed/carento-cover/800/600')
  where slug = 'carento';
update blueprints set demo_url = 'http://localhost:4175', cover_url = coalesce(cover_url, 'https://picsum.photos/seed/travel-cover/800/600')
  where slug = 'travel';

-- ============================================================
-- migrations/0013_add_built_businesses.sql
-- ============================================================
-- Phoxta platform — 0013 ensure the built businesses are in the marketplace
-- Carento and Travel were appended to the 0002 seed after it had already been
-- applied (and 0002 uses `on conflict do nothing`), so they never landed in the
-- live catalogue. Upsert them here (idempotent) with preview URLs + covers, so
-- all three built storefronts appear in the marketplace and are previewable.

insert into blueprints (slug, name, tagline, description, vertical, tier, price_cents, currency, cover_url, demo_url, verified, ai_included, status, app_path, metrics)
values
  ('carento', 'Carento Car Marketplace',
   'A full car buying & selling marketplace with listings, financing tools and an AI assistant.',
   'A complete automotive marketplace storefront — listings, dealer pages, car detail, financing calculator and an AI assistant — built in React and ready to brand.',
   'Automotive', 'premium', 390000, 'USD',
   'https://picsum.photos/seed/carento-cover/800/600', 'http://localhost:4173',
   true, true, 'live', 'businesses/carento', '{"built": true, "app": "businesses/carento"}'::jsonb),
  ('travel', 'Soar Travel & Stays',
   'A travel booking site for stays, flights and experiences, with an AI trip planner.',
   'A modern travel & stays booking storefront — hero search, listings, stay detail with booking, checkout and account — built in React (Tailwind) and ready to brand.',
   'Travel', 'premium', 360000, 'USD',
   'https://picsum.photos/seed/travel-cover/800/600', 'http://localhost:4175',
   true, true, 'live', 'businesses/travel', '{"built": true, "app": "businesses/travel"}'::jsonb)
on conflict (slug) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  description = excluded.description,
  vertical = excluded.vertical,
  cover_url = excluded.cover_url,
  demo_url = excluded.demo_url,
  app_path = excluded.app_path,
  metrics = excluded.metrics,
  status = 'live';

-- ============================================================
-- migrations/0014_restaurant_business.sql
-- ============================================================
-- Phoxta platform — 0014 wire the built Restaurant + Orders business
-- The `restaurant-orders` blueprint was seeded in 0002; now that the storefront
-- app is built (businesses/restaurant-orders), tag it with its app path, a
-- preview URL and a cover so it shows as built + previewable in the marketplace.
update blueprints set
  name = 'Saveur Restaurant + Orders',
  tagline = 'A fine-dining restaurant with online ordering, reservations, order tracking and an AI concierge.',
  description = 'A complete restaurant storefront — menu with online ordering, table reservations, checkout (pickup/delivery), live order tracking, an admin service dashboard and an AI concierge powered by the Phoxta agent. Built in React and ready to brand.',
  app_path = 'businesses/restaurant-orders',
  demo_url = 'http://localhost:4176',
  cover_url = coalesce(cover_url, 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop'),
  metrics = '{"built": true, "app": "businesses/restaurant-orders"}'::jsonb,
  verified = true,
  status = 'live'
where slug = 'restaurant-orders';

-- ============================================================
-- migrations/0015_fashion_business.sql
-- ============================================================
-- Phoxta platform — 0015 wire the built fashion business (Aurelia)
-- The `niche-apparel` blueprint was seeded in 0002; the storefront app is now
-- built (businesses/niche-apparel) in the Phoxta design system. Tag it as built +
-- previewable so it shows in the marketplace with a working preview.
update blueprints set
  name = 'Aurelia Fashion Store',
  tagline = 'A modern fashion store with product archive, online ordering, cart/checkout and an AI stylist.',
  description = 'A complete fashion eCommerce storefront — home, shop/product archive with filtering, product detail with sizes, bag/checkout and an AI stylist powered by the Phoxta agent. Built in React in the Phoxta design system and ready to brand.',
  app_path = 'businesses/niche-apparel',
  demo_url = 'http://localhost:4177',
  cover_url = coalesce(cover_url, 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=600&fit=crop'),
  metrics = '{"built": true, "app": "businesses/niche-apparel"}'::jsonb,
  verified = true,
  status = 'live'
where slug = 'niche-apparel';

-- ============================================================
-- migrations/0016_marketplace_built_only.sql
-- ============================================================
-- Phoxta platform — 0016 keep only built businesses in the marketplace + thumbnails
-- Remove the placeholder (non-built) catalogue blueprints, leaving the five
-- actually-built storefronts, and give each a representative cover thumbnail.

delete from blueprints
where slug not in ('carento', 'gearo', 'travel', 'restaurant-orders', 'niche-apparel');

update blueprints set cover_url = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop&q=80' where slug = 'carento';
update blueprints set cover_url = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop&q=80' where slug = 'gearo';
update blueprints set cover_url = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop&q=80' where slug = 'travel';
update blueprints set cover_url = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&q=80' where slug = 'restaurant-orders';
update blueprints set cover_url = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop&q=80' where slug = 'niche-apparel';

-- ============================================================
-- migrations/0017_generic_blueprint_names.sql
-- ============================================================
-- Phoxta platform — 0017 generic marketplace names (no brand)
-- Marketplace blueprints are business types the buyer brands themselves, so the
-- listing name should describe the category, not carry a sample brand.
update blueprints set name = 'Car Marketplace'    where slug = 'carento';
update blueprints set name = 'Furniture Store'     where slug = 'gearo';
update blueprints set name = 'Travel & Stays'      where slug = 'travel';
update blueprints set name = 'Restaurant + Orders' where slug = 'restaurant-orders';
update blueprints set name = 'Fashion Store'       where slug = 'niche-apparel';
