-- Capability and delivery truth is readable by the whole workspace, but only
-- administrators may change declared capability state. Delivery receipts are
-- created by service-role functions after provider/database confirmation.

drop policy if exists capability_registry_write on public.capability_registry;
create policy capability_registry_write on public.capability_registry for all
  using (organization_id is not null and public.app_is_org_admin(organization_id))
  with check (organization_id is not null and public.app_is_org_admin(organization_id));

drop policy if exists delivery_receipts_member on public.delivery_receipts;
create policy delivery_receipts_read on public.delivery_receipts for select
  using (public.app_is_org_member(organization_id));

revoke insert,update,delete on public.delivery_receipts from authenticated;
grant select on public.delivery_receipts to authenticated;
