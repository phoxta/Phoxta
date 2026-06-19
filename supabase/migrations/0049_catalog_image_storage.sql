-- Phoxta platform — 0049 catalogue/menu item image storage.
-- A public Storage bucket so owners can upload product/menu-item images from the
-- operating console. Files live under the org's folder ({orgId}/...) and RLS scopes
-- writes to that org's members; reads are public (storefront shows the images).

insert into storage.buckets (id, name, public)
values ('catalog', 'catalog', true)
on conflict (id) do nothing;

-- Public read (storefront + dashboard).
drop policy if exists "catalog public read" on storage.objects;
create policy "catalog public read" on storage.objects
  for select using (bucket_id = 'catalog');

-- Members can write/replace/remove only within their own org's folder.
drop policy if exists "catalog member insert" on storage.objects;
create policy "catalog member insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'catalog' and public.app_is_org_member(nullif((storage.foldername(name))[1], '')::uuid));

drop policy if exists "catalog member update" on storage.objects;
create policy "catalog member update" on storage.objects
  for update to authenticated
  using (bucket_id = 'catalog' and public.app_is_org_member(nullif((storage.foldername(name))[1], '')::uuid));

drop policy if exists "catalog member delete" on storage.objects;
create policy "catalog member delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'catalog' and public.app_is_org_member(nullif((storage.foldername(name))[1], '')::uuid));
