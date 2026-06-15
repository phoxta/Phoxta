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

-- SECURITY DEFINER so membership checks bypass RLS and never recurse.
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
