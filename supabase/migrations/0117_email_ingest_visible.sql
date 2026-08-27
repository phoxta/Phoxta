-- Phoxta — 0117: make "why can I not see my mail?" a question the console can answer.
--
-- The report was "I still can't see email sent to hello@ on the console", and
-- nothing in the product could say why. Every failure that stops mail arriving —
-- no Google connection, a revoked grant, a refresh token that was never stored,
-- a wrong mailbox, a Gmail filter that archives the mail before the sync's
-- `in:inbox` predicate can see it, a cron that stopped ticking — produced the
-- SAME screen: an Inbox reading "No conversations yet — messages from your
-- website chat, SMS, WhatsApp, email and calls all land here." A disconnected
-- mailbox and a quiet Tuesday were pixel for pixel identical.
--
-- Three things were missing from the database, and this adds them:
--   1. A record that a sync ran at all — what it asked Gmail, what came back,
--      what it wrote, and why it wrote nothing.
--   2. Per-business control of what the sync looks at, so the window and the
--      scope stop being constants buried in an edge function.
--   3. A readable health summary, because 0067 (correctly) revoked the client's
--      access to google_connections' token columns to keep the OAuth tokens out
--      of the browser — which also left the console unable to tell a live
--      connection from a dead one. A SECURITY DEFINER function returns the
--      STATUS without ever returning a token.
--
-- Nothing here sends anything, and nothing here changes what the agent is
-- allowed to answer: the 0114 watermark still governs that.
--
-- PREREQUISITE: 0114 must be applied first. Section 4 reads
-- google_connections.auto_reply_from, which 0114 adds, and this migration will
-- fail loudly rather than quietly reporting a watermark that does not exist.
-- The application code tolerates 0117 being absent — the console degrades to
-- "sync history is not available on this project yet" and every other surface
-- keeps working — so applying it is safe at any time, in either order with a
-- deploy of the edge functions.

/* ── 1. Every sync run, per business ──────────────────────────────────────── */

-- There is no table anywhere recording that gmail-sync ran for an organisation.
-- cron_heartbeats records one row for the WORKER, platform-wide, readable only
-- by Phoxta staff (0112) — so a business owner has never had any way to see
-- whether their own mailbox was checked, when, or what happened. This is that
-- table, and it is scoped and readable per business.
create table if not exists email_sync_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- 'cron' (the five-minute worker) or 'manual' (an owner pressed Check now).
  trigger text not null default 'cron',
  ok boolean not null default true,
  -- The mailbox the run actually read. Written on every run, so a connection
  -- swapped to a different Google account is visible in the history rather than
  -- being a silent change of meaning.
  mailbox text not null default '',
  -- The exact Gmail search that was run. "It found nothing" is not an answer;
  -- "it found nothing, and here is what it asked for" is.
  query text not null default '',
  -- How many message ids Gmail returned, before deduplication. The gap between
  -- listed and imported is the whole story of a run.
  listed integer not null default 0,
  imported integer not null default 0,
  replied integer not null default 0,
  skipped integer not null default 0,
  failed integer not null default 0,
  -- Already in the Inbox from an earlier run. This is why a manual sync says
  -- "0 new" on a mailbox that is working perfectly, and it has never been
  -- counted, let alone shown.
  already_had integer not null default 0,
  error text not null default '',
  -- Free-form breakdown: { reasons: { "<why it was not answered>": n } }.
  detail jsonb not null default '{}'::jsonb
);

create index if not exists idx_email_sync_runs_org
  on email_sync_runs (organization_id, created_at desc);

alter table email_sync_runs enable row level security;

-- Members read their own business's runs. Nothing client-side writes: the rows
-- come from the service role inside gmail-sync.
drop policy if exists email_sync_runs_read on email_sync_runs;
create policy email_sync_runs_read on email_sync_runs for select
  using (public.app_is_org_member(organization_id));

comment on table email_sync_runs is
  'One row per gmail-sync run per organisation. Exists so an owner can see that their mailbox was checked, what was asked of Gmail, and why nothing arrived.';

/* ── 2. The window and the scope, per business ────────────────────────────── */

-- gmail-sync has always asked Gmail for exactly `in:inbox newer_than:2d`,
-- hardcoded, with no override on any caller. Both halves lose mail silently:
--   • `in:inbox` misses anything a Gmail filter archived or sent straight to a
--     label with "Skip the Inbox" — which is the standard way a business files
--     mail to a role address like hello@.
--   • `newer_than:2d` is a hard floor. Mail missed because the cron was down, or
--     because Google was connected two days later, is never seen again: there is
--     no cursor, no historyId and no backfill of MISSED mail anywhere in the
--     product.
--
-- The defaults below widen both deliberately. Ingesting more does NOT mean
-- answering more. Three gates in gmail-sync hold that line and none of them
-- moves with these settings: mail that is no longer in the INBOX is never
-- auto-answered (it was filed away by a person), mail older than 48 hours is
-- never auto-answered by the sync (agent-catchup is the deliberate path for
-- older mail), and the 0114 watermark still refuses anything from before
-- automatic replies were switched on. Ingestion and answering are separate
-- questions and they stay separate.
alter table google_connections
  add column if not exists sync_window_days integer not null default 7;

alter table google_connections
  add column if not exists sync_scope text not null default 'all_mail';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'google_connections_sync_scope_check'
  ) then
    alter table google_connections
      add constraint google_connections_sync_scope_check
      check (sync_scope in ('inbox', 'all_mail'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'google_connections_sync_window_check'
  ) then
    alter table google_connections
      add constraint google_connections_sync_window_check
      check (sync_window_days between 1 and 30);
  end if;
end $$;

comment on column google_connections.sync_window_days is
  'How far back each sync looks, in days (1-30). Mail older than this is never seen: there is no historyId cursor.';
comment on column google_connections.sync_scope is
  'inbox = only mail still in the Inbox (the old behaviour). all_mail = everything except Spam, Trash, Sent, Drafts and Chats, so filtered and archived mail is ingested too. Neither changes what may be auto-answered.';

/* ── 3. Recording a run (service role only) ───────────────────────────────── */

create or replace function public.app_email_sync_record(
  p_org uuid,
  p_trigger text,
  p_ok boolean,
  p_mailbox text,
  p_query text,
  p_listed integer,
  p_imported integer,
  p_replied integer,
  p_skipped integer,
  p_failed integer,
  p_already integer,
  p_error text,
  p_detail jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into email_sync_runs (
    organization_id, trigger, ok, mailbox, query,
    listed, imported, replied, skipped, failed, already_had, error, detail
  ) values (
    p_org,
    case when p_trigger = 'manual' then 'manual' else 'cron' end,
    coalesce(p_ok, true),
    coalesce(left(p_mailbox, 320), ''),
    coalesce(left(p_query, 500), ''),
    greatest(0, coalesce(p_listed, 0)),
    greatest(0, coalesce(p_imported, 0)),
    greatest(0, coalesce(p_replied, 0)),
    greatest(0, coalesce(p_skipped, 0)),
    greatest(0, coalesce(p_failed, 0)),
    greatest(0, coalesce(p_already, 0)),
    coalesce(left(p_error, 1000), ''),
    coalesce(p_detail, '{}'::jsonb)
  );

  -- A row every five minutes per connected mailbox is ~8.6k rows a month. Thirty
  -- days is far more history than the question needs, and pruning here means no
  -- second scheduled job to forget about.
  delete from email_sync_runs
   where organization_id = p_org
     and created_at < now() - interval '30 days';
end;
$$;

revoke execute on function public.app_email_sync_record(uuid, text, boolean, text, text, integer, integer, integer, integer, integer, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.app_email_sync_record(uuid, text, boolean, text, text, integer, integer, integer, integer, integer, integer, text, jsonb) to service_role;

/* ── 4. The health summary the console reads ──────────────────────────────── */

-- 0067 revoked the client's SELECT on google_connections and re-granted only
-- (organization_id, email, scope, connected_by, created_at, updated_at). That is
-- right — access_token and refresh_token must never be reachable from a browser
-- — but it also means the console can only see THAT a row exists, which is
-- exactly why a revoked Google grant has been rendering as a green "Connected"
-- chip forever.
--
-- This returns the STATUS, never a token: whether a refresh token exists (a
-- boolean, not the value), when the access token expires, what scope was
-- granted, whether the 0114 watermark column is installed, the sync settings,
-- and the last run. Membership-checked, so it is safe to call from any console
-- screen that needs to say "email is not arriving, and here is why".
create or replace function public.app_email_ingress_health(p_org uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_conn google_connections%rowtype;
  v_run email_sync_runs%rowtype;
  v_found boolean := false;
  v_email_convs integer := 0;
  v_last_email timestamptz;
begin
  if not public.app_is_org_member(p_org) then
    raise exception 'Not a member of that business';
  end if;

  select * into v_conn from google_connections where organization_id = p_org;
  v_found := found;

  select * into v_run from email_sync_runs
   where organization_id = p_org
   order by created_at desc
   limit 1;

  select count(*), max(last_message_at)
    into v_email_convs, v_last_email
    from conversations
   where organization_id = p_org
     and channel_type = 'email'
     and is_test = false;

  return jsonb_build_object(
    'connected', v_found,
    'mailbox', case when v_found then coalesce(v_conn.email, '') else null end,
    'scope', case when v_found then coalesce(v_conn.scope, '') else '' end,
    -- The VALUE never leaves the database; only whether there is one. Without a
    -- refresh token the connection cannot renew itself and dies within the hour.
    'has_refresh_token', case when v_found then coalesce(v_conn.refresh_token, '') <> '' else false end,
    'token_expiry', case when v_found then v_conn.token_expiry else null end,
    'token_expired', case when v_found then coalesce(v_conn.token_expiry < now(), true) else null end,
    'connected_at', case when v_found then v_conn.created_at else null end,
    'updated_at', case when v_found then v_conn.updated_at else null end,
    'auto_reply_from', case when v_found then v_conn.auto_reply_from else null end,
    'window_days', case when v_found then v_conn.sync_window_days else null end,
    'scope_mode', case when v_found then v_conn.sync_scope else null end,
    'last_run', case when v_run.id is null then null else jsonb_build_object(
      'at', v_run.created_at,
      'trigger', v_run.trigger,
      'ok', v_run.ok,
      'mailbox', v_run.mailbox,
      'query', v_run.query,
      'listed', v_run.listed,
      'imported', v_run.imported,
      'replied', v_run.replied,
      'skipped', v_run.skipped,
      'failed', v_run.failed,
      'already_had', v_run.already_had,
      'error', v_run.error,
      'detail', v_run.detail
    ) end,
    'email_conversations', v_email_convs,
    'last_email_at', v_last_email
  );
end;
$$;

-- `create or replace function` grants EXECUTE to PUBLIC by default, so without
-- this revoke an anonymous caller could invoke a SECURITY DEFINER function
-- pre-auth. It raises for a non-member and no data escapes either way, but the
-- sibling function twelve lines above deliberately closes that door and this one
-- must not leave it open.
revoke execute on function public.app_email_ingress_health(uuid) from public, anon;
grant execute on function public.app_email_ingress_health(uuid) to authenticated;

comment on function public.app_email_ingress_health(uuid) is
  'Status of a business''s email ingress — connection health, sync settings and last run. Returns no OAuth token, ever.';

/* ── 5. Real mail that landed on a sandbox thread, and so was never shown ── */

-- gmail-sync picks the newest open email conversation for a sender and appends
-- to it. Until very recently that lookup had NO `is_test` predicate — so if an
-- owner had ever exercised the Playground on the email channel with an address,
-- the sandbox conversation it left behind was the newest open email thread for
-- that person, and every REAL message from them was filed onto it.
--
-- The Inbox hides is_test conversations unconditionally (listConversations in
-- src/lib/db/ops/agent.ts), and no other console screen reads them. So that mail
-- is in the database, has never been visible, and the fix to the lookup does not
-- move it: the new predicate only changes where FUTURE mail lands.
--
-- WHAT THIS TOUCHES, precisely: email conversations marked as a test that hold
-- at least one CUSTOMER message the Gmail integration wrote (meta.source is
-- 'gmail-sync' or 'gmail'). A genuine Playground thread cannot contain one —
-- those messages exist only because a real person sent real mail to the
-- business's real mailbox. Marking such a thread as not-a-test is simply telling
-- the truth about what it now contains.
--
-- Nothing is deleted, nothing is merged, and nothing is sent. Existing messages
-- keep their auto_reply verdicts, so this does not make the agent answer
-- anything: rows already settled stay settled, and gmail-sync will not revisit a
-- message it has already recorded.
update conversations c
   set is_test = false
 where c.is_test = true
   and c.channel_type = 'email'
   and exists (
     select 1
       from conversation_messages m
      where m.conversation_id = c.id
        and m.organization_id = c.organization_id
        and m.role = 'customer'
        and m.meta ->> 'source' in ('gmail-sync', 'gmail')
   );
