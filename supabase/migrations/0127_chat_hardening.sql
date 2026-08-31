-- Phoxta platform — 0127 chat hardening.
-- Companion to the agent-inbound / agentCore hardening pass: the call-recording
-- bucket stops being public, the anonymous web widget gets a daily spend
-- sub-budget it can be measured against, and ai_usage can carry the agent's
-- conversation ids. Every statement is idempotent.

-- ── 1) Call recordings are private ────────────────────────────────────────
-- agent-inbound created 'call-recordings' with public = true and stored the
-- public URL on call_logs.recording_url, so anyone who learned (or guessed —
-- the path is <org>/<conversation>-<ms>.wav) a URL could listen to a tenant's
-- customer calls with no session at all. The bucket is now private; the console
-- fetches a ten-minute signed URL through the recording-url function, which
-- checks membership first. call_logs.recording_url now holds the STORAGE PATH
-- for new rows (the column name is kept to avoid a schema change; recording-url
-- parses the path out of a legacy full URL, so old rows keep playing).
--
-- Guarded: on a project where no call has ever been recorded the bucket does
-- not exist yet, and agent-inbound creates it private on first use.
update storage.buckets set public = false where id = 'call-recordings' and public = true;

-- ── 2) What the anonymous web widget has spent today ──────────────────────
-- The plan's monthly token cap is the only spend ceiling the public endpoint
-- had, and every channel draws on it equally — so a script driving the web
-- widget (a public key ships in every storefront bundle) could burn the whole
-- month's allowance in an afternoon and silence the business's SMS, WhatsApp
-- and email agent for the rest of the month. agent-inbound now holds anonymous
-- web turns to a share of the cap PER CALENDAR DAY (UTC), and this is the
-- number it compares against.
--
-- Summed in the database for the same reason app_org_ai_tokens_service is: a
-- JS reduce over selected rows truncates at PostgREST's 1000-row cap, which
-- fails for exactly the busy orgs a ceiling exists to bound. SECURITY DEFINER
-- with no auth.uid() dependency so the service role can call it. ai_usage has
-- no channel column; the channel is the conversation's, hence the join. Test
-- (sandbox) threads are excluded: the owner trying their own agent is not the
-- public spending its budget.
create or replace function public.app_org_web_ai_tokens_today(p_org uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(u.input_tokens + u.output_tokens + u.cache_write_tokens + u.cache_read_tokens), 0)::bigint
  from ai_usage u
  join conversations c on c.id = u.conversation_id
  where u.organization_id = p_org
    and c.organization_id = p_org
    and c.channel_type = 'web'
    and c.is_test = false
    and u.created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';
$$;

revoke all on function public.app_org_web_ai_tokens_today(uuid) from public;
grant execute on function public.app_org_web_ai_tokens_today(uuid) to service_role;

-- ── 3) ai_usage.conversation_id may name an agent conversation ────────────
-- 0004 declared conversation_id as a foreign key to ai_conversations (the
-- dashboard assistant's threads). The customer-facing agent meters every turn
-- with a conversations.id — a different table — and against that constraint
-- the insert is rejected, which meter() only logs. If the constraint is still
-- in place, agent spend has never counted towards the cap and the join above
-- has nothing to sum. The column has carried both id spaces by intent for a
-- long time; the constraint is the mistake, so it goes. No-op where it was
-- already removed out of band.
alter table ai_usage drop constraint if exists ai_usage_conversation_id_fkey;
