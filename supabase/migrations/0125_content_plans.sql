-- Phoxta — a month of content, approved once.
--
-- WHY THE PLAN IS THE APPROVAL UNIT. Every write the agent makes goes through
-- executeAction, which is per-tool: off, approve, or auto. That is right for
-- "reply to this customer" and useless for thirty posts — approving thirty
-- things one at a time is how people stop using an autopilot, and setting the
-- tool to `auto` to avoid that hands over the whole month unseen. So a plan is
-- one object with one decision on it: you read the month, change what you do
-- not like, approve once, and it runs.
--
-- WHY THE POSTS ARE REAL ROWS FROM THE START. An approved plan does not "become"
-- posts later; it writes social_posts in `draft` immediately and approving flips
-- them to `queued`. A plan that held its own copy of the content would be a
-- second store disagreeing with the queue that actually publishes — two records
-- for one post, and the one you edited is not the one that goes out. Draft rows
-- are invisible to the publisher (app_claim_social_targets only takes `queued`),
-- so an unapproved plan cannot post by accident.
create table if not exists content_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,

  title text not null default '',
  /** What the owner asked for, kept so a regenerate means the same thing. */
  brief text not null default '',
  starts_on date not null,
  days int not null default 30,

  -- 'draft'    — being built, or waiting to be read
  -- 'approved' — the owner said yes; its posts are queued
  -- 'rejected' — the owner said no; its posts stay draft and never go out
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'rejected')),

  /** The reasoning, in the planner's own words, so the owner can see WHY this
   *  month looks like this rather than only what it contains. */
  rationale text not null default '',

  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_content_plans_org
  on content_plans(organization_id, created_at desc);

-- The link, on the posts themselves. Nullable: a post scheduled by hand or by
-- the operator belongs to no plan, and that is the normal case.
alter table social_posts
  add column if not exists plan_id uuid references content_plans(id) on delete set null;

create index if not exists idx_social_posts_plan
  on social_posts(plan_id) where plan_id is not null;

alter table content_plans enable row level security;

drop policy if exists content_plans_all on content_plans;
create policy content_plans_all on content_plans for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

drop trigger if exists trg_content_plans_touch on content_plans;
create trigger trg_content_plans_touch before update on content_plans
  for each row execute function public.app_touch_updated_at();

/**
 * Approve a plan: everything it holds becomes queued, in one statement.
 *
 * A loop in the edge function could approve half a month and then fail, leaving
 * the owner with fifteen posts going out and no way to tell which fifteen. This
 * is one transaction — the plan and its posts move together or not at all.
 *
 * It only ever promotes 'draft'. A post already cancelled by hand, or already
 * published because the plan was approved twice, is left exactly as it is.
 */
create or replace function public.app_approve_content_plan(p_plan uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_count int;
begin
  select organization_id into v_org from content_plans where id = p_plan;
  if v_org is null then
    raise exception 'No such plan.';
  end if;
  -- SECURITY DEFINER bypasses RLS, so membership is checked here explicitly.
  if not public.app_is_org_member(v_org) then
    raise exception 'Not your business.';
  end if;

  update social_posts
     set status = 'queued'
   where plan_id = p_plan
     and organization_id = v_org
     and status = 'draft';
  get diagnostics v_count = row_count;

  update content_plans
     set status = 'approved', approved_by = auth.uid(), approved_at = now()
   where id = p_plan;

  return v_count;
end;
$$;

-- Functions are EXECUTE TO PUBLIC by default and this one is SECURITY DEFINER:
-- without the revoke, an anon caller could queue another business's month.
revoke execute on function public.app_approve_content_plan(uuid) from public;
grant execute on function public.app_approve_content_plan(uuid) to authenticated;
