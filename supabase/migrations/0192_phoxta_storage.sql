-- P §§8 and 15: public editorial media and private workspace files are kept in
-- separate buckets. Private object names are <org UUID>/<workspace UUID>/<key>.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('phoxta-editorial','phoxta-editorial',true,10485760,array['image/jpeg','image/png','image/webp','image/svg+xml','application/pdf']),
 ('phoxta-opportunity-private','phoxta-opportunity-private',false,26214400,array['image/jpeg','image/png','image/webp','application/pdf','text/plain','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "published editorial assets are public" on storage.objects for select to anon,authenticated
 using(bucket_id='phoxta-editorial');

create policy "workspace members read private assets" on storage.objects for select to authenticated
 using(bucket_id='phoxta-opportunity-private'
   and coalesce((storage.foldername(name))[2],'') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   and exists(select 1 from public.opportunity_workspaces w where w.id=((storage.foldername(name))[2])::uuid
     and w.org_id::text=(storage.foldername(name))[1] and public.opportunity_can_read(w.id)));

create policy "workspace editors upload private assets" on storage.objects for insert to authenticated
 with check(bucket_id='phoxta-opportunity-private'
   and coalesce((storage.foldername(name))[2],'') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   and exists(select 1 from public.opportunity_workspaces w where w.id=((storage.foldername(name))[2])::uuid
     and w.org_id::text=(storage.foldername(name))[1] and public.opportunity_role(w.id) in ('owner','admin','editor','researcher')));

create policy "workspace editors update private assets" on storage.objects for update to authenticated
 using(bucket_id='phoxta-opportunity-private'
   and coalesce((storage.foldername(name))[2],'') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   and public.opportunity_role(((storage.foldername(name))[2])::uuid) in ('owner','admin','editor','researcher'))
 with check(bucket_id='phoxta-opportunity-private'
   and public.opportunity_role(((storage.foldername(name))[2])::uuid) in ('owner','admin','editor','researcher'));

create policy "workspace owners delete private assets" on storage.objects for delete to authenticated
 using(bucket_id='phoxta-opportunity-private'
   and coalesce((storage.foldername(name))[2],'') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   and public.opportunity_role(((storage.foldername(name))[2])::uuid) in ('owner','admin'));
commit;
