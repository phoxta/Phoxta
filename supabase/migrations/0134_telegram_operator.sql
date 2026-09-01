-- 0134 — Telegram operator: the owner runs the business from a Telegram chat.
--
-- One platform bot. A Telegram user is bound to a Phoxta user + organization by
-- a one-time deep-link token minted in the dashboard, so the webhook always
-- knows WHO is speaking and WHICH business they mean — the identity problem that
-- makes this hard on a shared WhatsApp number simply does not exist when the
-- operator is its own bot. Everything here is written by the webhook under the
-- service role; members may read only their own link, for the dashboard's
-- "connected" state.

-- ── Who is this Telegram user, in Phoxta terms ──────────────────────────────
create table if not exists public.telegram_links (
  telegram_user_id bigint primary key,          -- stable per Telegram account
  user_id          uuid not null references auth.users(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  username         text,
  first_name       text,
  linked_at        timestamptz not null default now(),
  last_seen_at     timestamptz,
  last_brief_at    timestamptz          -- morning-brief idempotency stamp (telegram-digest)
);
create index if not exists idx_telegram_links_user on public.telegram_links(user_id);
create index if not exists idx_telegram_links_org  on public.telegram_links(organization_id);

-- ── Per-chat state (which business is active in this chat) ──────────────────
-- For a private chat, chat_id == telegram_user_id. Groups get their own row so
-- a team group can be pinned to one business.
create table if not exists public.telegram_chats (
  chat_id          bigint primary key,
  telegram_user_id bigint,
  organization_id  uuid references public.organizations(id) on delete set null,
  kind             text not null default 'private',   -- 'private' | 'group'
  created_at       timestamptz not null default now()
);

-- ── One-time link tokens (minted by the dashboard, spent by /start) ─────────
create table if not exists public.telegram_link_tokens (
  token           text primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '15 minutes'),
  used_at         timestamptz
);

-- ── Update idempotency ──────────────────────────────────────────────────────
-- Telegram re-delivers an update whose webhook did not answer 200 in time. The
-- update_id is monotonic per bot; recording it makes a redelivery a no-op
-- instead of a second reply / a second executed action.
create table if not exists public.telegram_updates (
  update_id bigint primary key,
  seen_at   timestamptz not null default now()
);

alter table public.telegram_links        enable row level security;
alter table public.telegram_chats         enable row level security;
alter table public.telegram_link_tokens   enable row level security;
alter table public.telegram_updates        enable row level security;

-- The webhook uses the service role (bypasses RLS). The only member-facing read
-- is "am I linked?" — scoped to the caller's own rows. Everything else is
-- service-role-only by having no permissive policy.
drop policy if exists telegram_links_self_read on public.telegram_links;
create policy telegram_links_self_read on public.telegram_links
  for select using (user_id = auth.uid());

-- A member may delete their own link (disconnect) from the dashboard.
drop policy if exists telegram_links_self_delete on public.telegram_links;
create policy telegram_links_self_delete on public.telegram_links
  for delete using (user_id = auth.uid());

-- Housekeeping: drop expired unused tokens and old update ids. Cheap, called by
-- the digest worker so it does not need its own schedule.
create or replace function public.app_telegram_gc() returns void
language sql security definer set search_path = public as $$
  delete from public.telegram_link_tokens where used_at is null and expires_at < now();
  delete from public.telegram_updates where seen_at < now() - interval '2 days';
$$;
revoke execute on function public.app_telegram_gc() from anon, authenticated;
