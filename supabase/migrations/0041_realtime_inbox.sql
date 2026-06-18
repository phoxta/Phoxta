-- 0041: live Inbox — stream conversation + message changes to the console via
-- Supabase Realtime. RLS still applies (the authenticated member client only
-- receives rows for orgs it belongs to). Idempotent: only add if not present.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_messages') then
    alter publication supabase_realtime add table public.conversation_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations') then
    alter publication supabase_realtime add table public.conversations;
  end if;
end $$;

-- Send the full row on update/delete so the client can react to status/assignment
-- changes (inserts already carry the new row).
alter table public.conversations replica identity full;
