-- Phoxta — 0131: RAG hygiene.
--
-- Four things the retrieval index got wrong, all found in one audit:
--
--   1. NOTHING EVER LEFT THE INDEX. Deleting a product, page, contact, ticket or
--      conversation left its vector behind; unpublishing a page returned early
--      from the enqueue trigger (0007) and did nothing to the vector it had
--      already written. Drafts and archived products were embedded like live
--      ones. So the storefront agent kept quoting things the owner had removed.
--      → app_remove_embedding() + AFTER DELETE triggers on the five embedded
--        tables, AFTER UPDATE OF status triggers on cms_pages and products, and
--        products only enqueue while active. One sweep clears what is already
--        stale.
--
--   2. NO SIMILARITY FLOOR. app_match_embeddings returned the N nearest rows no
--      matter how far away they were, and callers threw the similarity away.
--      → p_min_similarity, default 0 so every existing caller is unchanged.
--
--   3. ONE VECTOR PER ROW. A 6,000-word page was one 1024-d point — its opening
--      dominated and the answer in paragraph nine was unfindable.
--      → chunk_ix; the unique key becomes (org, source_type, source_id,
--        chunk_ix). Existing rows are chunk 0. embed-worker writes the chunks;
--        app_match_embeddings returns chunk_ix so a caller can tell them apart.
--
--   4. CACHE READS COUNTED AT FULL WEIGHT against the monthly cap, though they
--      cost a tenth; cache writes counted at 1x though they cost 1.25x.
--      → app_org_ai_tokens_service (and its dashboard twin) weight them the way
--        _shared/pricing.ts prices them.
--
-- Everything here is idempotent: re-running the file is a no-op.

-- ===========================================================================
-- 3. Chunking: one row per chunk
-- ===========================================================================
alter table ai_embeddings add column if not exists chunk_ix int not null default 0;
comment on column ai_embeddings.chunk_ix is
  'Position of this chunk within its source row. 0 for the first (and, for short sources, only) chunk.';

-- The 0007 table constraint was unnamed, so Postgres named it. Rather than
-- guess the name, find any UNIQUE constraint on exactly those three columns
-- and drop it — nothing to do if it is already gone.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'ai_embeddings'
      and con.contype = 'u'
      and (
        select array_agg(att.attname::text order by att.attname)
        from unnest(con.conkey) as k(attnum)
        join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum
      ) = array['organization_id', 'source_id', 'source_type']
  loop
    execute format('alter table public.ai_embeddings drop constraint %I', c.conname);
  end loop;
end $$;

-- A unique INDEX rather than a constraint: PostgREST's on_conflict infers from
-- either, and `if not exists` is what makes this line re-runnable. The HNSW
-- index on the vector column is untouched — adding a column does not rebuild it.
create unique index if not exists idx_ai_embeddings_source_chunk
  on ai_embeddings (organization_id, source_type, source_id, chunk_ix);

-- ===========================================================================
-- 2. Similarity floor + chunk_ix in the return set
-- ===========================================================================
-- The return type changes (chunk_ix), which CREATE OR REPLACE cannot do, so the
-- 0009 signature is dropped first. On a re-run the drop is a no-op and the
-- replace is a same-shape replace. SECURITY DEFINER + service_role-only, exactly
-- as 0009: the calling edge function has already verified membership.
drop function if exists public.app_match_embeddings(uuid, vector, int, text[]);
create or replace function public.app_match_embeddings(
  p_org uuid,
  query_embedding vector(1024),
  match_count int default 6,
  p_source_types text[] default null,
  p_min_similarity float default 0.0
)
returns table (source_type text, source_id uuid, chunk_ix int, content text, similarity float)
language sql
stable
security definer
set search_path = public
as $$
  select e.source_type, e.source_id, e.chunk_ix, e.content, 1 - (e.embedding <=> query_embedding) as similarity
  from ai_embeddings e
  where e.organization_id = p_org
    and e.embedding is not null
    and (p_source_types is null or e.source_type = any (p_source_types))
    and 1 - (e.embedding <=> query_embedding) >= p_min_similarity
  order by e.embedding <=> query_embedding
  limit greatest(1, least(match_count, 20));
$$;
revoke all on function public.app_match_embeddings(uuid, vector, int, text[], float) from public, anon, authenticated;
grant execute on function public.app_match_embeddings(uuid, vector, int, text[], float) to service_role;

-- ===========================================================================
-- 1. Leaving the index
-- ===========================================================================
-- Generic on purpose: source_type is the table name, which is exactly what
-- app_enqueue_embedding writes (tg_table_name) and what 0008 writes for
-- conversations ('conversations'). knowledge_docs keeps its own pair from
-- 0042/0087, because its source_type depends on visibility, not on the table.
--
-- Reads OLD in every case: on DELETE it is the only row there is, and on the
-- UPDATE OF status path the id and organisation are the same in both. Also
-- clears the queue, so a pending row cannot re-insert the vector this just
-- removed the next time the worker runs.
create or replace function public.app_remove_embedding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from ai_embeddings
  where organization_id = old.organization_id and source_type = tg_table_name and source_id = old.id;
  delete from ai_embedding_queue
  where organization_id = old.organization_id and source_type = tg_table_name and source_id = old.id;
  return old;
end;
$$;

drop trigger if exists trg_unembed_products on products;
create trigger trg_unembed_products after delete on products
  for each row execute function public.app_remove_embedding();

drop trigger if exists trg_unembed_cms_pages on cms_pages;
create trigger trg_unembed_cms_pages after delete on cms_pages
  for each row execute function public.app_remove_embedding();

drop trigger if exists trg_unembed_crm_contacts on crm_contacts;
create trigger trg_unembed_crm_contacts after delete on crm_contacts
  for each row execute function public.app_remove_embedding();

drop trigger if exists trg_unembed_tickets on tickets;
create trigger trg_unembed_tickets after delete on tickets
  for each row execute function public.app_remove_embedding();

drop trigger if exists trg_unembed_conversations on conversations;
create trigger trg_unembed_conversations after delete on conversations
  for each row execute function public.app_remove_embedding();

-- Status changes that take a row out of the index without deleting it. A page
-- that goes back to draft, a product archived or parked as a draft: the enqueue
-- trigger already skips them, but skipping is not removing — the vector from
-- when they were live stayed behind. Both status columns are NOT NULL with a
-- check constraint (0006), so the WHEN clause cannot see a null.
--
-- Trigger order on one UPDATE is alphabetical: trg_embed_* runs first (and,
-- after the change below, declines the row), then trg_unembed_*_status removes.
drop trigger if exists trg_unembed_cms_pages_status on cms_pages;
create trigger trg_unembed_cms_pages_status after update of status on cms_pages
  for each row when (new.status <> 'published')
  execute function public.app_remove_embedding();

drop trigger if exists trg_unembed_products_status on products;
create trigger trg_unembed_products_status after update of status on products
  for each row when (new.status <> 'active')
  execute function public.app_remove_embedding();

-- Products embed only while active. Base: the 0007 body — the only definition
-- of this function; nothing later replaced it. The one change is the status
-- guard on products, mirroring the cms_pages guard that was already there.
create or replace function public.app_enqueue_embedding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_content text;
begin
  if tg_table_name = 'products' then
    if new.status <> 'active' then return new; end if;
    v_content := coalesce(new.name, '') || E'\n' || coalesce(new.description, '');
  elsif tg_table_name = 'cms_pages' then
    if new.status <> 'published' then return new; end if;
    v_content := coalesce(new.title, '') || E'\n' || coalesce(new.body, '');
  elsif tg_table_name = 'crm_contacts' then
    v_content := coalesce(new.name, '') || ' ' || coalesce(new.company, '') || E'\n' || coalesce(new.notes, '');
  elsif tg_table_name = 'tickets' then
    v_content := coalesce(new.subject, '');
  else
    return new;
  end if;

  if length(trim(v_content)) = 0 then return new; end if;

  insert into ai_embedding_queue (organization_id, source_type, source_id, content)
  values (new.organization_id, tg_table_name, new.id, v_content);
  return new;
end;
$$;

-- One sweep for what the triggers could not have caught: vectors and pending
-- queue rows for sources that were deleted, unpublished or deactivated before
-- this migration existed. Each delete finds nothing the second time.
delete from ai_embeddings e
  where e.source_type = 'products'
    and not exists (select 1 from products p where p.id = e.source_id and p.status = 'active');
delete from ai_embeddings e
  where e.source_type = 'cms_pages'
    and not exists (select 1 from cms_pages c where c.id = e.source_id and c.status = 'published');
delete from ai_embeddings e
  where e.source_type = 'crm_contacts'
    and not exists (select 1 from crm_contacts c where c.id = e.source_id);
delete from ai_embeddings e
  where e.source_type = 'tickets'
    and not exists (select 1 from tickets t where t.id = e.source_id);
delete from ai_embeddings e
  where e.source_type = 'conversations'
    and not exists (select 1 from conversations c where c.id = e.source_id);

delete from ai_embedding_queue q
  where q.status = 'pending' and q.source_type = 'products'
    and not exists (select 1 from products p where p.id = q.source_id and p.status = 'active');
delete from ai_embedding_queue q
  where q.status = 'pending' and q.source_type = 'cms_pages'
    and not exists (select 1 from cms_pages c where c.id = q.source_id and c.status = 'published');
delete from ai_embedding_queue q
  where q.status = 'pending' and q.source_type = 'crm_contacts'
    and not exists (select 1 from crm_contacts c where c.id = q.source_id);
delete from ai_embedding_queue q
  where q.status = 'pending' and q.source_type = 'tickets'
    and not exists (select 1 from tickets t where t.id = q.source_id);
delete from ai_embedding_queue q
  where q.status = 'pending' and q.source_type = 'conversations'
    and not exists (select 1 from conversations c where c.id = q.source_id);

-- ===========================================================================
-- 4. Cache tokens weighted the way they are priced
-- ===========================================================================
-- Same multipliers as _shared/pricing.ts (CACHE_WRITE_MULT 1.25, CACHE_READ_MULT
-- 0.1). Signature and grants exactly as 0067: service_role only, no membership
-- check, revoked from anon and authenticated. The dashboard twin below moves
-- with it, because 0067's reason for defining both was that the number the
-- owner sees is the number being enforced.
create or replace function public.app_org_ai_tokens_service(p_org uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(round(sum(input_tokens + output_tokens + cache_write_tokens * 1.25 + cache_read_tokens * 0.1)), 0)::bigint
  from ai_usage
  where organization_id = p_org
    and created_at >= date_trunc('month', now());
$$;
revoke execute on function public.app_org_ai_tokens_service(uuid) from anon, authenticated;

create or replace function public.app_org_ai_tokens_this_month(p_org uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(round(sum(input_tokens + output_tokens + cache_write_tokens * 1.25 + cache_read_tokens * 0.1)), 0)::bigint
  from ai_usage
  where organization_id = p_org
    and public.app_is_org_member(p_org)
    and created_at >= date_trunc('month', now());
$$;
grant execute on function public.app_org_ai_tokens_this_month(uuid) to authenticated;
