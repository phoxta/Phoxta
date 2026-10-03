-- Phoxta unified agentic workspace.
-- Durable work, privacy controls, capability truth, delivery evidence and the
-- extra action fields required by the governed agent contract.

create table if not exists public.workspace_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 240),
  detail text not null default '',
  status text not null default 'todo' check (status in ('todo','doing','review','ready')),
  source text not null default 'human' check (source in ('human','agent','workflow','opportunity','school','system')),
  source_id text,
  due_at timestamptz,
  assigned_to uuid,
  created_by uuid default auth.uid(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_workspace_tasks_org_status on public.workspace_tasks(organization_id,status,updated_at desc);
create unique index if not exists idx_workspace_tasks_source on public.workspace_tasks(organization_id,source,source_id) where source_id is not null;
alter table public.workspace_tasks enable row level security;
create policy workspace_tasks_read on public.workspace_tasks for select using (public.app_is_org_member(organization_id));
create policy workspace_tasks_write on public.workspace_tasks for all using (public.app_is_org_member(organization_id)) with check (public.app_is_org_member(organization_id));

create table if not exists public.behavior_learning_settings (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  capture_navigation boolean not null default true,
  capture_work_patterns boolean not null default true,
  capture_response_metrics boolean not null default true,
  retention_days int not null default 30 check (retention_days between 1 and 365),
  updated_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);
alter table public.behavior_learning_settings enable row level security;
create policy behavior_settings_owner on public.behavior_learning_settings for all
  using (user_id=auth.uid() and public.app_is_org_member(organization_id))
  with check (user_id=auth.uid() and public.app_is_org_member(organization_id));

-- Only derived, categorical preferences belong here. Raw typed text, message
-- bodies, file contents and pointer trails are deliberately excluded.
create table if not exists public.behavior_memory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  signal text not null,
  confidence numeric(4,3) not null default .5 check (confidence between 0 and 1),
  evidence_count int not null default 1 check (evidence_count > 0),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,user_id,category,signal)
);
alter table public.behavior_memory enable row level security;
create policy behavior_memory_owner on public.behavior_memory for all
  using (user_id=auth.uid() and public.app_is_org_member(organization_id))
  with check (user_id=auth.uid() and public.app_is_org_member(organization_id));

create table if not exists public.capability_registry (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  capability_key text not null,
  label text not null,
  area text not null,
  state text not null check (state in ('active','preview','disconnected','provider_required','disabled','failed')),
  provider text,
  detail text not null default '',
  checked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create unique index if not exists idx_capability_registry_scope on public.capability_registry(coalesce(organization_id,'00000000-0000-0000-0000-000000000000'::uuid),capability_key);
alter table public.capability_registry enable row level security;
create policy capability_registry_read on public.capability_registry for select using (organization_id is null or public.app_is_org_member(organization_id));
create policy capability_registry_write on public.capability_registry for all using (organization_id is not null and public.app_is_org_member(organization_id)) with check (organization_id is not null and public.app_is_org_member(organization_id));

create table if not exists public.delivery_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  capability_key text not null,
  provider text,
  external_id text,
  state text not null check (state in ('preview','queued','sent','delivered','failed','disconnected')),
  summary text not null default '',
  error text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);
create index if not exists idx_delivery_receipts_org on public.delivery_receipts(organization_id,created_at desc);
alter table public.delivery_receipts enable row level security;
create policy delivery_receipts_member on public.delivery_receipts for all using (public.app_is_org_member(organization_id)) with check (public.app_is_org_member(organization_id));

alter table public.agent_actions add column if not exists idempotency_key text;
alter table public.agent_actions add column if not exists parent_action_id uuid references public.agent_actions(id) on delete set null;
alter table public.agent_actions add column if not exists plan jsonb not null default '{}'::jsonb;
alter table public.agent_actions add column if not exists policy_snapshot jsonb not null default '{}'::jsonb;
alter table public.agent_actions add column if not exists budget_cost jsonb not null default '{}'::jsonb;
alter table public.agent_actions add column if not exists evidence jsonb not null default '{}'::jsonb;
alter table public.agent_actions add column if not exists verified_at timestamptz;
alter table public.agent_actions drop constraint if exists agent_actions_status_check;
alter table public.agent_actions add constraint agent_actions_status_check check(status in ('pending','approved','rejected','executing','executed','failed'));
-- A regular unique index still permits multiple NULL values in Postgres and,
-- unlike a partial index, can be targeted reliably by PostgREST upserts.
create unique index if not exists idx_agent_actions_idempotency on public.agent_actions(organization_id,idempotency_key);

create or replace function public.touch_phoxta_unified_rows() returns trigger language plpgsql as $$
begin new.updated_at=now(); if tg_table_name='workspace_tasks' and new.status='ready' and old.status is distinct from 'ready' then new.completed_at=now(); end if; return new; end $$;
drop trigger if exists workspace_tasks_touch on public.workspace_tasks;
create trigger workspace_tasks_touch before update on public.workspace_tasks for each row execute function public.touch_phoxta_unified_rows();
drop trigger if exists behavior_settings_touch on public.behavior_learning_settings;
create trigger behavior_settings_touch before update on public.behavior_learning_settings for each row execute function public.touch_phoxta_unified_rows();
drop trigger if exists behavior_memory_touch on public.behavior_memory;
create trigger behavior_memory_touch before update on public.behavior_memory for each row execute function public.touch_phoxta_unified_rows();

revoke all on public.workspace_tasks,public.behavior_learning_settings,public.behavior_memory,public.capability_registry,public.delivery_receipts from anon;
grant select,insert,update,delete on public.workspace_tasks,public.behavior_learning_settings,public.behavior_memory,public.capability_registry,public.delivery_receipts to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('phoxta-avatars','phoxta-avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "avatar images are public" on storage.objects for select using(bucket_id='phoxta-avatars');
create policy "users upload own avatar" on storage.objects for insert to authenticated with check(bucket_id='phoxta-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "users update own avatar" on storage.objects for update to authenticated using(bucket_id='phoxta-avatars' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='phoxta-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "users delete own avatar" on storage.objects for delete to authenticated using(bucket_id='phoxta-avatars' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.opportunity_launch_workspace(p_workspace uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare w public.opportunity_workspaces; v_role text;
begin
  select * into w from public.opportunity_workspaces where id=p_workspace for update;
  if w.id is null then raise exception 'Opportunity workspace not found.'; end if;
  v_role:=public.opportunity_role(p_workspace);
  if coalesce(v_role,'') not in ('owner','admin') then raise exception 'Only an owner or administrator can launch this business.'; end if;
  if not exists(select 1 from public.decision_reviews where workspace_id=p_workspace and decision='proceed') then raise exception 'Record a Proceed decision before creating the operating business.'; end if;
  if not exists(select 1 from public.opportunity_artifacts where workspace_id=p_workspace and artifact_type='launch_plan' and status in ('ready','completed')) then raise exception 'Complete the launch plan before creating the operating business.'; end if;

  update public.organizations set
    name=w.title,
    stage='active',
    lifecycle_stage='operating',
    metadata=coalesce(metadata,'{}'::jsonb)-'opportunity_only'
  where id=w.org_id;
  update public.opportunity_workspaces set lifecycle_state='learning',updated_at=now() where id=p_workspace;

  insert into public.workspace_tasks(organization_id,title,detail,status,source,source_id,due_at,metadata)
  select w.org_id,a.title,coalesce(a.content->>'summary','Created from the opportunity launch package.'),
    case a.status when 'completed' then 'ready' when 'in_progress' then 'doing' when 'ready' then 'review' else 'todo' end,
    'opportunity',a.id::text,a.due_at,jsonb_build_object('workspace_id',p_workspace,'artifact_type',a.artifact_type,'version',a.version)
  from public.opportunity_artifacts a where a.workspace_id=p_workspace
  on conflict(organization_id,source,source_id) where source_id is not null do update set title=excluded.title,detail=excluded.detail,status=excluded.status,due_at=excluded.due_at,metadata=excluded.metadata;

  insert into public.notifications(user_id,title,body,kind,link)
  values(auth.uid(),'Business workspace created',w.title || ' is ready in Phoxta AI-Ops.','ai','/app');
  return w.org_id;
end $$;
revoke all on function public.opportunity_launch_workspace(uuid) from public,anon;
grant execute on function public.opportunity_launch_workspace(uuid) to authenticated;
