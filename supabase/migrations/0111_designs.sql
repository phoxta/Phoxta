-- Phoxta — the graphics studio.
--
-- Social posts a tenant makes from the Digital Agency template pack, edited by
-- hand or written by the agent. One row is one post.
--
-- WHAT IS STORED, AND WHAT IS NOT
--
-- `doc` holds only what the owner changed: the words, the photographs and any
-- palette override. The layout lives in code (src/lib/designs/templates.ts), so
-- a row is a few hundred bytes rather than a serialised canvas, and fixing a
-- template's kerning fixes every post already made from it instead of freezing
-- the mistake into every copy.
--
-- The rendered PNG is not stored either. It is produced in the browser from the
-- same SVG the editor shows, on demand. Storing it would mean a second source
-- of truth that goes stale the moment anyone edits a word — and the stale copy
-- is the one that gets posted.

create table if not exists designs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,

  title text not null default 'Untitled post',
  template_id text not null,

  -- { content: {slot: string}, images: {slot: {url, photographer, ...}}, palette? }
  doc jsonb not null default '{}'::jsonb,

  -- 'draft' until someone says otherwise. There is no publishing pipeline here
  -- yet; the status exists so the list can be filtered without a migration when
  -- there is one.
  status text not null default 'draft' check (status in ('draft', 'ready', 'archived')),

  -- What the brief said, when the agent wrote it. Kept so a post can be
  -- regenerated from the same instruction rather than from memory.
  brief text,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_designs_org on designs(organization_id, updated_at desc);

alter table designs enable row level security;

-- Same shape as every other tenant table: membership of the organisation is the
-- whole check, on both read and write.
drop policy if exists designs_all on designs;
create policy designs_all on designs
  for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- updated_at is what the list sorts by, so it has to be right without every
-- caller remembering to set it.
create or replace function public.designs_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists designs_touch on designs;
create trigger designs_touch
  before update on designs
  for each row execute function public.designs_touch();

comment on table designs is
  'Social posts built from the Digital Agency template pack. doc holds content only — layout lives in code, and the PNG is rendered on demand rather than stored.';
