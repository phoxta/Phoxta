-- 0107: Inbox live view + human take-over.
--
-- Root cause of the "webchat shows handled but no messages" bug was NOT schema:
-- respondCore's two-row batch insert gave the agent row a `meta` key the
-- customer row lacked, so PostgREST rejected the whole batch with PGRST102
-- ("All object keys must match") and the error was silently discarded. That is
-- fixed in code (supabase/functions/_shared/agentCore.ts + engage-run/executor.ts).
--
-- This migration adds the one column the take-over flow needs, and re-asserts
-- (idempotently) that the Inbox's realtime tables are published. Mirrored in
-- supabase/functions/_shared/engageSchema.ts so it also applies lazily over
-- SUPABASE_DB_URL on the engage-run cron tick, without a manual migration run.

-- The honest AI gate: while true, respondCore and the Engage flow runtime
-- persist inbound customer messages but never compose or send a reply — the
-- conversation belongs to the human who took it over.
alter table conversations add column if not exists ai_paused boolean not null default false;

-- Live watch: stream conversation + message changes to the console (same guard
-- as 0041 — only add when missing, so this re-runs safely anywhere).
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations') then
    alter publication supabase_realtime add table public.conversations;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_messages') then
    alter publication supabase_realtime add table public.conversation_messages;
  end if;
exception when duplicate_object then null;
end $$;
