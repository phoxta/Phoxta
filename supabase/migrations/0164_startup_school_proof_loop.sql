-- ---------------------------------------------------------------------------
-- Phoxta Proof Loop
--
-- A task says what somebody intends to do. An experiment preserves the
-- decision trail: the assumption, a falsifiable test, the evidence, and what
-- changed. It stays private to the founder; a mentor only receives the minimum
-- relevant context through a booked-session brief.
-- ---------------------------------------------------------------------------

create table if not exists public.cs_experiments (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  claim_id      text,
  section_id    text,
  title         text not null default '',
  hypothesis    text not null default '',
  method        text not null default '',
  threshold     text not null default '',
  status        text not null default 'planned'
    check (status in ('planned','running','validated','invalidated','inconclusive')),
  evidence_type text check (evidence_type in ('conversation','payment','metric','prototype','observation','research')),
  evidence      text not null default '',
  source_url    text not null default '',
  result        text not null default '',
  decision      text not null default '',
  next_step     text not null default '',
  due_at        timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_cs_experiments_founder
  on public.cs_experiments(organization_id, user_id, status, due_at);

alter table public.cs_experiments enable row level security;
grant select, insert, update, delete on public.cs_experiments to authenticated;

drop policy if exists cs_experiments_own on public.cs_experiments;
create policy cs_experiments_own on public.cs_experiments
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'cs_experiments'
  ) then
    alter publication supabase_realtime add table public.cs_experiments;
  end if;
end $$;

comment on table public.cs_experiments is
  'Private founder proof loop: a claim, its test, raw evidence and the resulting decision.';
