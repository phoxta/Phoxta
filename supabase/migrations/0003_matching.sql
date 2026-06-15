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
