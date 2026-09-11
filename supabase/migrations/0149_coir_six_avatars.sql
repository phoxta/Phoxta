-- Phoxta — 0149 Coir Six learner profile photos.
--
-- A public Storage bucket for profile photos, one folder per learner:
--   cs-avatars/<organization_id>/<user_id>/avatar-<timestamp>.jpg
-- Reads are public (the photo shows on group posts and in the inbox, and the
-- URL is saved on cs_profiles.photo_url). A learner can only write inside
-- their own folder: the second path segment must equal their auth uid.
-- Learners are not "members" of the organisation in the app_is_org_member
-- sense (that is the school's staff), which is why this bucket is keyed on
-- the user rather than on membership like `catalog` is.
--
-- The app crops client-side to a 512px square JPEG (~60 KB), so 2 MB is
-- generous; the mime list keeps the bucket to images.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cs-avatars', 'cs-avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "cs avatars public read" on storage.objects;
create policy "cs avatars public read" on storage.objects
  for select using (bucket_id = 'cs-avatars');

drop policy if exists "cs avatars own insert" on storage.objects;
create policy "cs avatars own insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cs-avatars' and (storage.foldername(name))[2] = auth.uid()::text);

drop policy if exists "cs avatars own update" on storage.objects;
create policy "cs avatars own update" on storage.objects
  for update to authenticated
  using (bucket_id = 'cs-avatars' and (storage.foldername(name))[2] = auth.uid()::text);

drop policy if exists "cs avatars own delete" on storage.objects;
create policy "cs avatars own delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'cs-avatars' and (storage.foldername(name))[2] = auth.uid()::text);
