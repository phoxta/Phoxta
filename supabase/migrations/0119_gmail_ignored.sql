-- Phoxta — 0119: remember the messages the sync decided not to import.
--
-- SPLIT OUT OF 0117 RATHER THAN ADDED TO IT. 0117 was already applied to the
-- remote database by the time this was written, and an applied migration never
-- runs again — so editing it would have produced a table that exists in the
-- repository and nowhere else, and code that reads it would fail in production
-- while passing every check locally. New requirement, new file.
--
-- The application code treats an absent table as "no memory of what we skipped":
-- correct, just wasteful. So this is safe to apply before or after the deploy.

/* ── Messages the sync looked at and deliberately did not import ───────────
   The dedupe asks "have we already got this Gmail id?" of conversation_messages.
   A message we decide NOT to import writes no row there — correctly, since the
   whole point is to keep it out of the Inbox — so the dedupe cannot see it and
   the next tick downloads it again, in full, forever.

   Widening the read makes that expensive rather than merely untidy: under the
   all-mail scope a business that archives its marketing gets sixty format=full
   fetches every five minutes, for the same sixty messages, until the window
   rolls past them. That is seventeen thousand Gmail calls a day to reach the
   same conclusion, inside a cron budget shared with three other workers.

   One narrow table, holding an id and why we passed on it. No content, no
   sender, nothing about the message itself — it exists to be a memory of a
   decision, and the reason is here so an owner asking "what did you skip?" gets
   an answer rather than silence. */
create table if not exists gmail_ignored_messages (
  organization_id uuid not null references organizations(id) on delete cascade,
  provider_sid text not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  primary key (organization_id, provider_sid)
);

alter table gmail_ignored_messages enable row level security;

-- Members may read what was skipped for their own business; only the service
-- role inside gmail-sync writes.
drop policy if exists gmail_ignored_read on gmail_ignored_messages;
create policy gmail_ignored_read on gmail_ignored_messages
  for select using (public.app_is_org_member(organization_id));

grant select on gmail_ignored_messages to authenticated;

