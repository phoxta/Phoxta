-- Phoxta platform — 0105 SLA breaches + routing + team-role RPC.
--
-- Record of the DDL that supabase/functions/ops-maintenance/index.ts
-- bootstraps lazily over SUPABASE_DB_URL (db push is unavailable in this
-- environment). Idempotent; safe to re-apply.
--
-- Context:
-- * SLA + routing POLICIES need no schema — they live per business inside
--   agent_config.escalation (jsonb, member RLS) under the `sla` and `routing`
--   keys, written by the ops Settings page and read by the Inbox and the
--   ops-maintenance cron. The org-level branding/profile jsonbs were NOT used
--   because app_resolve_domain returns them to anonymous storefront callers.
-- * sla_events dedupes breach notifications: the cron flags each conversation
--   at most once per kind (currently 'first_response_breach').
-- * app_set_member_role: organization_memberships has SELECT/INSERT/DELETE
--   policies but no UPDATE policy, so role changes go through a definer RPC
--   that re-checks authority server-side.

-- One row per (conversation, kind): the SLA cron flags a breach exactly once.
create table if not exists public.sla_events (
  conversation_id uuid not null references conversations(id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now(),
  primary key (conversation_id, kind)
);
-- Written only by the service role; no client path needs it, so RLS stays
-- enabled with no policies (deny-all to anon/authenticated).
alter table public.sla_events enable row level security;

-- Team roles: the owner seat is immutable and 'owner' is never grantable.
-- Callable by any authenticated user; authorizes internally (owner/admin only).
create or replace function public.app_set_member_role(p_org uuid, p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_caller_role text;
  v_target_role text;
begin
  if p_role not in ('admin','staff','viewer') then
    raise exception 'Role must be admin, staff or viewer.';
  end if;
  select role into v_caller_role from organization_memberships
    where organization_id = p_org and user_id = auth.uid();
  if v_caller_role is null or v_caller_role not in ('owner','admin') then
    raise exception 'Only an owner or admin can change roles.';
  end if;
  select role into v_target_role from organization_memberships
    where organization_id = p_org and user_id = p_user;
  if v_target_role is null then
    raise exception 'That person is not a member of this business.';
  end if;
  if v_target_role = 'owner' then
    raise exception 'The owner''s role cannot be changed.';
  end if;
  update organization_memberships set role = p_role
    where organization_id = p_org and user_id = p_user;
end;
$fn$;
grant execute on function public.app_set_member_role(uuid, uuid, text) to authenticated;
