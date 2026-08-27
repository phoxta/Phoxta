-- Phoxta — social publishing: connected accounts, a scheduled queue, and one
-- row per channel per post.
--
-- WHY THREE TABLES AND NOT ONE. A post goes to several channels at once, and
-- the channels fail independently: LinkedIn accepts it, Instagram's token has
-- expired, TikTok is rate-limiting. One row per (post, channel) is what lets
-- the queue retry the one that failed without republishing to the two that
-- worked — which is the single most common way a naive scheduler embarrasses
-- somebody.
--
-- TOKENS follow google_connections: written and read only by service-role edge
-- functions, and the client is allowed to see whether an account is connected
-- and which handle it is, never the credentials.

create table if not exists social_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'linkedin', 'tiktok', 'x')),

  /** The platform's own id for the account we post as. */
  external_id text not null default '',
  handle text not null default '',
  display_name text not null default '',
  avatar_url text not null default '',

  access_token text not null default '',
  refresh_token text not null default '',
  token_expiry timestamptz,
  scope text not null default '',

  -- 'connected' | 'expired' | 'revoked'. Set to 'expired' by the worker when a
  -- refresh fails, so the console can say WHY nothing is going out instead of
  -- silently queueing.
  status text not null default 'connected',
  last_error text not null default '',

  connected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, platform, external_id)
);

create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,

  /** The design this came from, so it can be reopened and re-rendered. */
  design_id uuid references designs(id) on delete set null,
  /** The rasterised picture, in the org's own asset store. */
  media_url text not null default '',
  caption text not null default '',

  scheduled_at timestamptz not null default now(),
  -- 'draft' → 'queued' → (per-target work) → 'published' | 'failed' | 'part'
  status text not null default 'draft'
    check (status in ('draft', 'queued', 'published', 'failed', 'part', 'cancelled')),

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_social_posts_due
  on social_posts(scheduled_at) where status = 'queued';

create table if not exists social_targets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  post_id uuid not null references social_posts(id) on delete cascade,
  account_id uuid not null references social_accounts(id) on delete cascade,
  platform text not null,

  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  /** The platform's id for what it created, and the link a human can open. */
  external_post_id text not null default '',
  permalink text not null default '',
  error text not null default '',
  attempts int not null default 0,
  /** Set when a row is claimed, so a crashed run can be retried after a while
   *  rather than being stuck in 'sending' for ever. */
  claimed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_social_targets_post on social_targets(post_id);
create index if not exists idx_social_targets_work on social_targets(status, claimed_at);

-- ── access ──────────────────────────────────────────────────────────────────
alter table social_accounts enable row level security;
alter table social_posts enable row level security;
alter table social_targets enable row level security;

-- Members may read; only service-role writes. The client never selects the
-- token columns — see src/lib/db/ops/social.ts, which lists its columns.
create policy social_accounts_select on social_accounts for select
  using (public.app_is_org_member(organization_id));
create policy social_posts_select on social_posts for select
  using (public.app_is_org_member(organization_id));
create policy social_targets_select on social_targets for select
  using (public.app_is_org_member(organization_id));

-- ── the queue ───────────────────────────────────────────────────────────────
-- Claim due work atomically. Without the claim two overlapping ticks publish
-- the same post twice, and a duplicate post is the one mistake a scheduler
-- cannot take back.
create or replace function public.app_claim_social_targets(p_limit int default 10)
returns setof social_targets
language sql
security definer
set search_path = public
as $$
  update social_targets t
     set status = 'sending', claimed_at = now(), attempts = t.attempts + 1
   where t.id in (
     select t2.id
       from social_targets t2
       join social_posts p on p.id = t2.post_id
      where p.status = 'queued'
        and p.scheduled_at <= now()
        and (
          t2.status = 'pending'
          -- A row left 'sending' by a crashed run is retried after ten
          -- minutes; three attempts and it is left alone for a person.
          or (t2.status = 'sending' and t2.claimed_at < now() - interval '10 minutes')
        )
        and t2.attempts < 3
      order by p.scheduled_at
      limit p_limit
      for update skip locked
   )
  returning t.*;
$$;

-- Functions are EXECUTE TO PUBLIC by default, and this one is SECURITY DEFINER:
-- without the revoke, any anon caller could drain another org's queue.
revoke execute on function public.app_claim_social_targets(int) from public, anon, authenticated;

create trigger trg_social_accounts_touch before update on social_accounts
  for each row execute function public.app_touch_updated_at();
create trigger trg_social_posts_touch before update on social_posts
  for each row execute function public.app_touch_updated_at();
