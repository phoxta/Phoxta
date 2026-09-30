-- Phoxta 2.0, Product Specification §§7–8, 12–13, 22.
-- Additive: existing identities, subscriptions, businesses and school data remain intact.
begin;

create table public.opportunity_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_key text not null default 'free' check (plan_key in ('free','explorer','builder','studio')),
  billing_status text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now()
);
create table public.discovery_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goals text[] not null default '{}', skills text[] not null default '{}',
  industries text[] not null default '{}', markets text[] not null default '{}',
  models text[] not null default '{}', advantages text[] not null default '{}',
  hours_weekly numeric check (hours_weekly between 0 and 168),
  capital_band text not null default '', complexity text not null default '',
  entry_mode text not null default 'browse', onboarding_step text not null default 'intent',
  completed_at timestamptz, updated_at timestamptz not null default now()
);
create table public.opportunity_plan_limits (
  plan_key text primary key,
  label text not null,
  monthly_gbp integer not null check (monthly_gbp >= 0),
  limits jsonb not null,
  stripe_price_id text,
  active boolean not null default true
);
-- Commercial choice delegated by the user. Amounts are distinct from legacy Console plans.
-- Unlimited fair use remains bounded by separately configurable abuse controls.
insert into public.opportunity_plan_limits values
 ('free','Free',0,'{"saved":50,"active":1,"refresh":10,"research":2,"evidence":50,"experiments":3,"experiment_period":"lifetime","shape":"preview","build":"none","automations":0,"exports":"summary","seats":1,"school":"core"}',null,true),
 ('explorer','Explorer',29,'{"saved":null,"active":5,"refresh":100,"research":30,"evidence":500,"experiments":50,"experiment_period":"month","shape":"limited","build":"preview","automations":0,"exports":"full","seats":1,"school":"full"}',null,true),
 ('builder','Builder',79,'{"saved":null,"active":15,"refresh":300,"research":100,"evidence":2000,"experiments":null,"experiment_period":"month","shape":"full","build":"full","automations":25,"exports":"full","seats":1,"school":"full"}',null,true),
 ('studio','Studio / Team',249,'{"saved":null,"active":50,"refresh":1000,"research":500,"evidence":5000,"experiments":null,"experiment_period":"month","shape":"full","build":"full","automations":100,"exports":"full","seats":5,"school":"full"}',null,true);
create table public.opportunity_entitlement_overrides (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  limits jsonb not null default '{}', expires_at timestamptz
);
create table public.opportunity_usage (
  org_id uuid not null references public.organizations(id) on delete cascade,
  feature_key text not null, period_start date not null, quantity integer not null default 0 check(quantity >= 0),
  primary key(org_id, feature_key, period_start)
);
create table public.global_opportunities (
  id uuid primary key default gen_random_uuid(), slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check(length(trim(title)) between 1 and 180), thesis text not null default '',
  customer text not null default '', problem text not null default '', why_now text not null default '',
  key_uncertainty text not null default '', primary_industry text not null default '', geography text not null default '',
  model text not null default '', skills text[] not null default '{}',
  evidence_strength text not null default 'hypothesis' check(evidence_strength in ('hypothesis','emerging','supported')),
  status text not null default 'draft' check(status in ('draft','review','published','retired')),
  brief jsonb not null default '{}', public_sources jsonb not null default '[]',
  created_by uuid references auth.users(id), published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.global_opportunities(updated_at desc,id) where status='published';
create index on public.global_opportunities using gin(skills);
create index on public.global_opportunities using gin(to_tsvector('english',title || ' ' || thesis || ' ' || primary_industry));
create table public.opportunity_workspaces (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references public.organizations(id),
  owner_user_id uuid not null references auth.users(id), global_opportunity_id uuid references public.global_opportunities(id),
  legacy_idea_id uuid unique references public.ideas(id) on delete set null,
  title text not null check(length(trim(title)) between 1 and 180), thesis text not null default '',
  origin text not null check(origin in ('global','idea','problem','industry','trend','technology','legacy_idea')),
  geography text not null default '', visibility text not null default 'private' check(visibility='private'),
  lifecycle_state text not null default 'investigating' check(lifecycle_state in ('discovered','investigating','unproven','testing','promising','shaping','building','launching','learning','paused','rejected','archived')),
  legacy jsonb not null default '{}', migration_version text, origin_snapshot jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.opportunity_workspaces(org_id,lifecycle_state,updated_at desc);
create table public.workspace_members (
  workspace_id uuid not null references public.opportunity_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check(role in ('admin','editor','researcher','viewer')),
  primary key(workspace_id,user_id)
);
create table public.brief_sections (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.opportunity_workspaces(id) on delete cascade,
  section_key text not null, content jsonb not null default '{}', version integer not null default 1,
  updated_by uuid references auth.users(id), updated_at timestamptz not null default now(),
  unique(workspace_id,section_key)
);
create table public.brief_section_versions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.opportunity_workspaces(id) on delete cascade,
  section_key text not null, content jsonb not null, version integer not null, created_at timestamptz not null default now(),
  unique(workspace_id,section_key,version)
);
create table public.sources (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.opportunity_workspaces(id) on delete cascade,
  canonical_url text check(canonical_url is null or canonical_url ~ '^https?://[^[:space:]]+$'),
  title text not null, publisher text not null default '', source_type text not null default 'user_reference',
  published_at timestamptz, retrieved_at timestamptz not null default now(), geography text not null default '',
  content_hash text, metadata jsonb not null default '{}', stale_after_days integer check(stale_after_days>0),
  unique(workspace_id,id)
);
create unique index on public.sources(workspace_id,md5(canonical_url)) where canonical_url is not null;
create table public.evidence_items (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.opportunity_workspaces(id) on delete cascade,
  source_id uuid, evidence_type text not null check(evidence_type in ('external','customer_interview','behavioural','commercial','user_note','experiment','ai_hypothesis','legacy_ai_hypothesis')),
  claim text not null check(length(trim(claim)) between 1 and 12000), excerpt_short text not null default '' check(length(excerpt_short)<=1000),
  interpretation text not null default '', geography text not null default '', observed_at timestamptz not null default now(),
  confidence_label text not null default 'unknown' check(confidence_label in ('hypothesis','emerging','supported','contradicted','unknown')),
  created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  foreign key(workspace_id,source_id) references public.sources(workspace_id,id),
  check(evidence_type <> 'external' or source_id is not null), unique(workspace_id,id)
);
create index on public.evidence_items(workspace_id,created_at desc,id);
create table public.assumptions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.opportunity_workspaces(id) on delete cascade,
  class text not null check(class in ('problem','customer','value','behaviour','payment','distribution','solution','operations','regulatory')),
  statement text not null check(length(trim(statement)) between 1 and 4000),
  importance integer not null check(importance between 1 and 5), uncertainty integer not null check(uncertainty between 1 and 5),
  status text not null default 'unknown' check(status in ('unknown','testing','supported','contradicted','revised')),
  owner_user_id uuid references auth.users(id), created_at timestamptz not null default now(), unique(workspace_id,id)
);
create table public.evidence_links (
  workspace_id uuid not null references public.opportunity_workspaces(id) on delete cascade,
  evidence_id uuid not null, assumption_id uuid not null,
  relation text not null check(relation in ('support','contradict','context')),
  primary key(evidence_id,assumption_id,relation),
  foreign key(workspace_id,evidence_id) references public.evidence_items(workspace_id,id) on delete cascade,
  foreign key(workspace_id,assumption_id) references public.assumptions(workspace_id,id) on delete cascade
);
create table public.experiments (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.opportunity_workspaces(id) on delete cascade,
  assumption_id uuid, type text not null check(type in ('interview','landing_page','concierge','prototype','waitlist','paid_pilot','pre_order','outreach','smoke_test')),
  hypothesis text not null check(length(trim(hypothesis)) between 1 and 4000), method text not null default '', success_criteria text not null default '',
  status text not null default 'draft' check(status in ('draft','ready','running','completed','inconclusive','cancelled')),
  starts_at timestamptz, ends_at timestamptz, learning text not null default '', owner_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key(workspace_id,assumption_id) references public.assumptions(workspace_id,id), unique(workspace_id,id)
);
create table public.experiment_observations (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.opportunity_workspaces(id) on delete cascade,
  experiment_id uuid not null, observation text not null check(length(trim(observation))>0), evidence_id uuid,
  created_at timestamptz not null default now(),
  foreign key(workspace_id,experiment_id) references public.experiments(workspace_id,id),
  foreign key(workspace_id,evidence_id) references public.evidence_items(workspace_id,id)
);
create table public.decision_reviews (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.opportunity_workspaces(id) on delete cascade,
  decision text not null check(decision in ('proceed','revise','pause','stop')),
  rationale text not null check(length(trim(rationale))>0), snapshot jsonb not null,
  decided_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.opportunity_artifacts (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.opportunity_workspaces(id) on delete cascade,
  artifact_type text not null check(artifact_type in ('icp','context_map','alternatives','value_proposition','offer','positioning','business_model','mvp','brand','website','workflow','crm','analytics','launch_plan','campaign','sales','onboarding','task','file')),
  title text not null check(length(trim(title))>0), content jsonb not null default '{}', version integer not null default 1,
  status text not null default 'draft' check(status in ('draft','ready','in_progress','completed','archived')),
  owner_user_id uuid references auth.users(id), due_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.opportunity_artifact_versions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.opportunity_workspaces(id) on delete cascade,
  artifact_id uuid not null references public.opportunity_artifacts(id) on delete cascade,
  version integer not null, content jsonb not null, created_at timestamptz not null default now(), unique(artifact_id,version)
);
create table public.agent_workflows (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.opportunity_workspaces(id) on delete cascade,
  name text not null, trigger jsonb not null default '{}', graph jsonb not null default '[]',
  approval_policy jsonb not null default '{"external_actions":"human_approval_required"}',
  status text not null default 'draft' check(status in ('draft','tested','review_required')),
  version integer not null default 1, created_at timestamptz not null default now()
);
create table public.research_jobs (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.opportunity_workspaces(id) on delete cascade,
  requested_by uuid not null references auth.users(id), idempotency_key uuid not null,
  job_type text not null check(job_type in ('opportunity','industry','problem','trend','refresh','market')),
  query_plan jsonb not null default '{}', status text not null default 'queued' check(status in ('queued','planning','fetching','extracting','synthesizing','review_required','completed','failed','cancelled')),
  attempts integer not null default 0, max_attempts integer not null default 3,
  max_sources integer not null default 8 check(max_sources between 1 and 20), max_cost_usd numeric not null default 0.5,
  cost_usd numeric not null default 0, lease_token uuid, lease_expires_at timestamptz,
  started_at timestamptz, finished_at timestamptz, error jsonb, created_at timestamptz not null default now(),
  unique(requested_by,idempotency_key), unique(workspace_id,id)
);
create index on public.research_jobs(created_at) where status in ('queued','planning','fetching','extracting','synthesizing');
create table public.research_artifacts (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.opportunity_workspaces(id) on delete cascade,
  research_job_id uuid not null, artifact_type text not null, content jsonb not null,
  model_metadata jsonb not null default '{}', created_at timestamptz not null default now(),
  foreign key(workspace_id,research_job_id) references public.research_jobs(workspace_id,id)
);
create table public.saved_opportunities (
  user_id uuid not null references auth.users(id) on delete cascade,
  global_opportunity_id uuid not null references public.global_opportunities(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id,global_opportunity_id)
);
create table public.opportunity_feedback (
  user_id uuid not null references auth.users(id) on delete cascade,
  global_opportunity_id uuid not null references public.global_opportunities(id) on delete cascade,
  action text not null check(action in ('dismiss','restore')), reason_code text not null default 'not_for_me',
  created_at timestamptz not null default now(), primary key(user_id,global_opportunity_id)
);
create table public.opportunity_audit_logs (
  id uuid primary key default gen_random_uuid(), actor_user_id uuid references auth.users(id) on delete set null,
  org_id uuid references public.organizations(id) on delete set null, action text not null, entity_id uuid,
  metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.opportunity_events (
  id bigint generated always as identity primary key, user_id uuid references auth.users(id) on delete set null,
  event text not null, properties jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.opportunity_notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, title text not null, href text not null default '/app', read_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.opportunity_privacy_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
  request_type text not null check(request_type in ('export','delete_account','delete_workspace')),
  workspace_id uuid references public.opportunity_workspaces(id), status text not null default 'requested' check(status in ('requested','processing','completed','retention_review')),
  created_at timestamptz not null default now(), completed_at timestamptz
);

-- A private workspace is readable only by its owner, explicit collaborators,
-- or members of its owning organization. Platform admins do not bypass this.
create function public.opportunity_role(p_workspace uuid) returns text
language sql stable security definer set search_path=public as $$
 select case when w.owner_user_id=auth.uid() then 'owner'
   else coalesce((select role from workspace_members where workspace_id=w.id and user_id=auth.uid()),
     (select case when m.role in ('owner','admin') then 'admin' when m.role='viewer' then 'viewer' else 'editor' end
      from organization_memberships m where m.organization_id=w.org_id and m.user_id=auth.uid())) end
 from opportunity_workspaces w where w.id=p_workspace;
$$;
create function public.opportunity_can_read(p_workspace uuid) returns boolean
language sql stable security definer set search_path=public as $$ select public.opportunity_role(p_workspace) is not null $$;

-- Mutations go through checked commands, not unrestricted PostgREST writes.
do $policies$
declare t text;
begin
 foreach t in array array['opportunity_workspaces','brief_sections','brief_section_versions','sources','evidence_items','assumptions','evidence_links','experiments','experiment_observations','decision_reviews','opportunity_artifacts','opportunity_artifact_versions','agent_workflows','research_jobs','research_artifacts','workspace_members'] loop
   execute format('alter table public.%I enable row level security',t);
   execute format('revoke all on public.%I from anon, authenticated',t);
   execute format('grant select on public.%I to authenticated',t);
   execute format('create policy workspace_read on public.%I for select to authenticated using(public.opportunity_can_read(%I))',t,case when t='opportunity_workspaces' then 'id' else 'workspace_id' end);
 end loop;
 foreach t in array array['opportunity_accounts','discovery_profiles','saved_opportunities','opportunity_feedback','opportunity_notifications','opportunity_privacy_requests'] loop
   execute format('alter table public.%I enable row level security',t);
   execute format('revoke all on public.%I from anon, authenticated',t);
   execute format('grant select on public.%I to authenticated',t);
   execute format('create policy own_read on public.%I for select to authenticated using(user_id=auth.uid())',t);
 end loop;
 foreach t in array array['opportunity_plan_limits','global_opportunities'] loop
   execute format('alter table public.%I enable row level security',t);
   execute format('revoke all on public.%I from anon, authenticated',t);
   execute format('grant select on public.%I to anon, authenticated',t);
 end loop;
 foreach t in array array['opportunity_entitlement_overrides','opportunity_usage','opportunity_audit_logs','opportunity_events'] loop
   execute format('alter table public.%I enable row level security',t);
   execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
end $policies$;
create policy published_read on public.global_opportunities for select to anon,authenticated using(status='published');
create policy editorial_read on public.global_opportunities for select to authenticated using(public.app_is_platform_admin());
create policy plans_read on public.opportunity_plan_limits for select to anon,authenticated using(active);
revoke all on function public.opportunity_role(uuid),public.opportunity_can_read(uuid) from public;
grant execute on function public.opportunity_role(uuid),public.opportunity_can_read(uuid) to authenticated;

-- Guard history even against accidental trusted-service updates. Account
-- erasure uses an explicit privileged retention workflow, never a UI update.
create function public.opportunity_immutable() returns trigger language plpgsql as $$
begin raise exception 'Finalised history is immutable; create a new version.'; end; $$;
create trigger decision_history_immutable before update on public.decision_reviews for each row execute function public.opportunity_immutable();
create trigger brief_history_immutable before update on public.brief_section_versions for each row execute function public.opportunity_immutable();
create trigger artifact_history_immutable before update on public.opportunity_artifact_versions for each row execute function public.opportunity_immutable();
commit;
