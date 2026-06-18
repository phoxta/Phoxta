-- 0042: knowledge base — owner-curated documents the agent retrieves (RAG).
-- Member-RLS table; triggers feed the existing ai_embedding_queue → embed-worker
-- → ai_embeddings pipeline (and clean up the vector on delete).
create table if not exists knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_knowledge_docs_org on knowledge_docs(organization_id, created_at desc);
create trigger trg_knowledge_docs_touch before update on knowledge_docs
  for each row execute function public.app_touch_updated_at();
alter table knowledge_docs enable row level security;
create policy knowledge_docs_all on knowledge_docs for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- enqueue (re)embedding on insert/update
create or replace function public.app_enqueue_knowledge()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_content text;
begin
  v_content := coalesce(new.title, '') || E'\n' || coalesce(new.content, '');
  if length(trim(v_content)) = 0 then return new; end if;
  insert into ai_embedding_queue (organization_id, source_type, source_id, content)
  values (new.organization_id, 'knowledge_docs', new.id, v_content);
  return new;
end $$;
create trigger trg_knowledge_docs_embed after insert or update on knowledge_docs
  for each row execute function public.app_enqueue_knowledge();

-- drop the vector when a doc is removed
create or replace function public.app_remove_knowledge_embedding()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from ai_embeddings where organization_id = old.organization_id and source_type = 'knowledge_docs' and source_id = old.id;
  delete from ai_embedding_queue where organization_id = old.organization_id and source_type = 'knowledge_docs' and source_id = old.id;
  return old;
end $$;
create trigger trg_knowledge_docs_unembed after delete on knowledge_docs
  for each row execute function public.app_remove_knowledge_embedding();
