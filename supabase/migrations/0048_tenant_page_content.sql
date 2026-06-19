-- Phoxta platform — 0048 per-tenant storefront content overrides.
-- Lets owners edit the TEXT and IMAGES on their bought storefront's real pages from
-- Studio's in-context editor, without touching code. Overrides are keyed by page
-- path and applied by the storefront at runtime (slot index by document order — the
-- same engine the Studio page-builder uses). Public-read (it's public website
-- content); only org members can write.

create table if not exists tenant_page_content (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  page_path text not null,
  slots jsonb not null default '{}'::jsonb,  -- { "text": { "<i>": "..." }, "img": { "<i>": "url" } }
  updated_at timestamptz not null default now(),
  unique (organization_id, page_path)
);
create index if not exists idx_tpc_org on tenant_page_content(organization_id);

alter table tenant_page_content enable row level security;

-- Public website content → anyone (anon storefront visitor) can read.
drop policy if exists tpc_read on tenant_page_content;
create policy tpc_read on tenant_page_content for select using (true);

-- Only members of the org can create/update/delete its content.
drop policy if exists tpc_write on tenant_page_content;
create policy tpc_write on tenant_page_content for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

grant select on tenant_page_content to anon, authenticated;
grant insert, update, delete on tenant_page_content to authenticated;
