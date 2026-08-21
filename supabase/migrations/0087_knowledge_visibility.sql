-- Phoxta — 0087: internal knowledge that retrieval cannot reach.
--
-- knowledge_docs feeds the same vector table the public storefront agent
-- searches, so anything an owner pastes in — margins, supplier terms, pricing
-- floors, negotiation limits — was one semantic match away from a customer.
-- There was no way to store a fact for the agent's own reasoning without also
-- publishing it.
--
-- visibility splits the two. The embedding is tagged with a different
-- source_type for internal docs, and the public allowlist in tools.ts
-- (PUBLIC_SOURCE_TYPES) admits only 'knowledge_docs'. A public caller therefore
-- cannot retrieve an internal doc even if the model asks for it by name —
-- the filter is applied server-side, not requested by the model.

alter table knowledge_docs
  add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'internal'));

comment on column knowledge_docs.visibility is
  'public = retrievable by the storefront/phone agent. internal = owner-only; '
  'embedded as knowledge_docs_internal and excluded from public retrieval.';

-- Re-enqueue with a source_type that reflects visibility.
create or replace function public.app_enqueue_knowledge()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_content text;
  v_source  text;
begin
  v_content := coalesce(new.title, '') || E'\n' || coalesce(new.content, '');
  if length(trim(v_content)) = 0 then return new; end if;
  v_source := case when coalesce(new.visibility, 'public') = 'internal'
                   then 'knowledge_docs_internal'
                   else 'knowledge_docs' end;
  insert into ai_embedding_queue (organization_id, source_type, source_id, content)
  values (new.organization_id, v_source, new.id, v_content);
  return new;
end $$;

-- A doc flipped public -> internal must not leave its public vector behind.
create or replace function public.app_unembed_knowledge_public()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.visibility, 'public') = 'internal' then
    delete from ai_embeddings
    where organization_id = new.organization_id
      and source_type = 'knowledge_docs'
      and source_id = new.id;
  else
    delete from ai_embeddings
    where organization_id = new.organization_id
      and source_type = 'knowledge_docs_internal'
      and source_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists trg_knowledge_docs_visibility on knowledge_docs;
create trigger trg_knowledge_docs_visibility
  after insert or update of visibility on knowledge_docs
  for each row execute function public.app_unembed_knowledge_public();
