-- Phoxta platform — 0038 proactive + AI automations.
-- The automations engine already handles EVENT triggers with static actions. This
-- adds SCHEDULED triggers (daily/weekly) and AI actions (ai_briefing = the agent
-- composes + emails a summary; ai_task = the agent runs an instruction via its
-- governed tools). Powers proactive briefings and a no-code "AI runs my business".

alter table automations drop constraint if exists automations_trigger_check;
alter table automations add constraint automations_trigger_check
  check (trigger in ('contact_created','order_paid','booking_created','ticket_created','schedule_daily','schedule_weekly'));

alter table automations drop constraint if exists automations_action_check;
alter table automations add constraint automations_action_check
  check (action in ('send_email','add_tag','create_task','notify','ai_briefing','ai_task'));

alter table automations add column if not exists last_run_at timestamptz;

create table if not exists automation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  automation_id uuid references automations(id) on delete set null,
  status text not null default 'ok',
  output text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_automation_runs_org on automation_runs(organization_id, created_at desc);
alter table automation_runs enable row level security;
create policy automation_runs_all on automation_runs for all
  using (public.app_is_org_member(organization_id)) with check (public.app_is_org_member(organization_id));
