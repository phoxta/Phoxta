-- Phoxta — 0114: the agent answers its own mailbox.
--
-- gmail-sync used to file a customer's email and stop. Mail arriving in a
-- business's connected Gmail account was therefore never answered, while every
-- other channel reached the agent automatically. The code change is in
-- supabase/functions/{gmail-sync,agent-catchup,email-inbound} and
-- _shared/{autoReply,conversationEmail,google,agentCore}.ts; this migration adds
-- the three things that change cannot be made safe without.

/* ── 1. Indexes the catch-up and dedupe paths read ────────────────────────── */

-- The catch-up worker scans recent inbound messages per organisation.
create index if not exists idx_conversation_messages_org_created
  on conversation_messages (organization_id, created_at desc);

-- The ingest dedupe is a lookup on (organization_id, provider_sid) on every
-- message of every tick. 0040 added the column as a plain text field and no
-- migration has ever indexed it, so that lookup is a sequential scan of a
-- growing table. Non-unique, always creatable — the uniqueness that makes the
-- dedupe a GUARANTEE is section 4, which can legitimately fail.
create index if not exists idx_conversation_messages_provider_sid
  on conversation_messages (organization_id, provider_sid)
  where provider_sid <> '';

/* ── 2. A watermark, so switching this on does not answer the past ────────── */

-- gmail-sync's window is `newer_than:2d`. Without a starting line, the first
-- tick after this deploys would answer up to two days of mail that humans have
-- already dealt with outside the console — including, for a mailbox connected
-- today, correspondence from before Phoxta ever saw it.
--
-- `default now()` backfills every existing connection with the moment this
-- migration runs, which is exactly the intent: from here forward, automatically;
-- everything before it belongs to agent-catchup, which is bounded, explicit and
-- can be dry-run first.
alter table google_connections
  add column if not exists auto_reply_from timestamptz not null default now();

comment on column google_connections.auto_reply_from is
  'Mail older than this is ingested but never auto-answered. Set to now() when the connection is made; move it back deliberately to let the agent answer older mail.';

/* ── 3. The switch, and the ceiling ───────────────────────────────────────── */

-- No new table and no second switch: auto-replying is governed by the same
-- agent_tool_policy (off / approve / auto) that already governs every write the
-- operator agent makes, under the tool name 'auto_reply'. A row is only needed
-- to CHANGE the behaviour — absent, the code defaults it to 'auto', because a
-- business that connects its mailbox to an AI agent is asking for its mail to be
-- answered. supabase/functions/_shared/autoReply.ts and
-- src/lib/db/ops/operator.ts hold the two halves of that default and must agree.
--
-- Nothing is inserted here on purpose: seeding a row per organisation would
-- freeze today's default into data and make changing it later a migration
-- rather than a decision.

-- app_claim_action is the per-org daily ceiling the autopilot already counts
-- against, and the auto-reply path claims an 'email' against it too so a
-- business that has set a ceiling sees it respected everywhere. 0112 revoked
-- EXECUTE from public/anon/authenticated to stop an anonymous caller burning
-- another tenant's budget; that revoke also removes the implicit PUBLIC grant
-- the service role was relying on, so grant it back explicitly to the one role
-- that runs inside an edge function.
grant execute on function public.app_claim_action(uuid, text) to service_role;
grant execute on function public.app_cron_beat(text, boolean, text) to service_role;

/* ── 4. One message, one row — and this one is allowed to fail loudly ─────── */

-- The dedupe that decides whether an inbound message is new is a read of
-- provider_sid followed by an insert. Today a race between the five-minute cron
-- and the console's manual sync produces a harmless duplicate row in the Inbox.
-- With a reply hanging off that insert, the SAME race sends the customer two
-- emails — and gmail-sync's read then errors (PGRST116, more than one row), so
-- with the error handled the message is skipped instead.
--
-- This used to be wrapped in an exception handler that downgraded a failure to
-- a NOTICE, so the migration exited 0 while the only guarantee it exists to
-- provide did not exist, and nothing at runtime checked. It is deliberately a
-- HARD FAILURE now, and it is last so everything above is already applied:
-- re-running after the duplicates are resolved is all that is needed.
--
-- If this raises, find them with:
--   select organization_id, provider_sid, count(*), array_agg(id order by created_at)
--   from conversation_messages
--   where provider_sid <> ''
--   group by 1, 2 having count(*) > 1;
-- and delete all but the oldest of each group (the newer ones are re-ingests of
-- one message), then apply this migration again.
create unique index if not exists ux_conversation_messages_provider_sid
  on conversation_messages (organization_id, provider_sid)
  where provider_sid <> '';
