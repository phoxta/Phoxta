-- 0135 — Telegram proactive: the operator reaches out on its own.
--
-- Two idempotency stamps so the 5-minute tick can drive both without double-
-- sending:
--   agent_actions.tg_pushed_at — an approval card was pushed to the owner's
--     Telegram for this queued action (autopilot / dashboard / automation
--     queued it; the owner isn't in the chat, so bring the decision to them).
--   telegram_links.last_brief_at already exists (0134) for the morning brief.
alter table public.agent_actions add column if not exists tg_pushed_at timestamptz;

-- Index the queue the pusher scans every tick: pending, not yet pushed.
create index if not exists idx_agent_actions_tg_push
  on public.agent_actions(created_at)
  where status = 'pending' and tg_pushed_at is null;
