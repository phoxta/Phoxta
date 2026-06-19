-- Phoxta platform — 0021 public read for published pages (storefront content API)
-- The Studio publish→live loop needs anonymous visitors to read PUBLISHED pages
-- (the CONTRACT.md "content API"). RLS permissive policies are OR'd, so this adds
-- public SELECT for published rows while 0006's member policy still governs drafts
-- and all writes. Draft/unpublished pages stay private to org members.

drop policy if exists cms_pages_public_read on cms_pages;
create policy cms_pages_public_read on cms_pages
  for select
  to anon, authenticated
  using (status = 'published');
