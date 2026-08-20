-- Phoxta — 0076: attachments on the AI Operator chat.
--
-- The operator chat carries files both ways: the owner attaches something for
-- the agent to look at, and the agent's answers can point at media that already
-- lives in the business (a product shot, a call recording).
--
-- Attachment shape (jsonb array on the message):
--   [{ "kind": "image|video|audio|file", "path": "<org>/<uuid>-name.ext",
--      "name": "invoice.pdf", "mime": "application/pdf", "size": 12345 }]
-- `path` is a storage object key, not a URL — the bucket is private, so the
-- client mints a short-lived signed URL when it renders.

alter table public.operator_messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- Private, unlike `catalog` (public) — operator chat files are business-internal
-- (invoices, customer lists, contracts). A public bucket would make every one of
-- them readable by anyone holding the URL, so reads are member-gated instead and
-- the client uses signed URLs.
insert into storage.buckets (id, name, public, file_size_limit)
values ('operator-files', 'operator-files', false, 26214400)  -- 25 MB
on conflict (id) do update set public = false, file_size_limit = 26214400;

-- Same namespacing as the catalog bucket: the first path segment is the org id,
-- so membership in THAT org is what grants access.
drop policy if exists "operator files member read"   on storage.objects;
drop policy if exists "operator files member insert" on storage.objects;
drop policy if exists "operator files member delete" on storage.objects;

create policy "operator files member read" on storage.objects
  for select using (
    bucket_id = 'operator-files'
    and public.app_is_org_member((nullif((storage.foldername(name))[1], ''))::uuid)
  );

create policy "operator files member insert" on storage.objects
  for insert with check (
    bucket_id = 'operator-files'
    and public.app_is_org_member((nullif((storage.foldername(name))[1], ''))::uuid)
  );

create policy "operator files member delete" on storage.objects
  for delete using (
    bucket_id = 'operator-files'
    and public.app_is_org_member((nullif((storage.foldername(name))[1], ''))::uuid)
  );

notify pgrst, 'reload schema';
