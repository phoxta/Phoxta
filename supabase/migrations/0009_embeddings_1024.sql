-- Phoxta — switch the RAG vector dimension to 1024 (Voyage voyage-3.5-lite).
-- Safe: no embeddings are stored yet. If you later change providers, re-run with
-- the matching dimension (OpenAI/Gemini = 1536) and re-index.
delete from ai_embeddings;
drop index if exists idx_ai_embeddings_hnsw;
alter table ai_embeddings alter column embedding type vector(1024);
create index idx_ai_embeddings_hnsw on ai_embeddings using hnsw (embedding vector_cosine_ops);

drop function if exists public.app_match_embeddings(uuid, vector, int, text[]);
create or replace function public.app_match_embeddings(
  p_org uuid,
  query_embedding vector(1024),
  match_count int default 6,
  p_source_types text[] default null
)
returns table (source_type text, source_id uuid, content text, similarity float)
language sql
stable
security definer
set search_path = public
as $$
  select e.source_type, e.source_id, e.content, 1 - (e.embedding <=> query_embedding) as similarity
  from ai_embeddings e
  where e.organization_id = p_org
    and e.embedding is not null
    and (p_source_types is null or e.source_type = any (p_source_types))
  order by e.embedding <=> query_embedding
  limit greatest(1, least(match_count, 20));
$$;
revoke all on function public.app_match_embeddings(uuid, vector, int, text[]) from public, anon, authenticated;
grant execute on function public.app_match_embeddings(uuid, vector, int, text[]) to service_role;
