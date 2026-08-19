-- Phoxta platform — 0074. The Settings ZIP-routing tester replaced the old
-- client-side mirror of app_route_location with a real RPC call, but the base
-- function is service_role-only (0008) and carries no membership check of its
-- own — granting it to `authenticated` directly would let any signed-in user
-- probe another tenant's routing. This member-guarded wrapper is the callable
-- surface; the base function stays service-role.
create or replace function public.app_route_location_member(p_org uuid, p_zip text, p_service text default '')
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_id uuid; v_row locations%rowtype;
begin
  if not public.app_is_org_member(p_org) then raise exception 'Not allowed'; end if;
  v_id := public.app_route_location(p_org, p_zip, coalesce(p_service, ''));
  if v_id is null then return jsonb_build_object('matched', false); end if;
  select * into v_row from locations where id = v_id;
  return jsonb_build_object(
    'matched', true,
    'id', v_row.id,
    'name', v_row.name,
    'phone', v_row.phone,
    'zip', v_row.zip
  );
end $$;
revoke all on function public.app_route_location_member(uuid, text, text) from public, anon;
grant execute on function public.app_route_location_member(uuid, text, text) to authenticated, service_role;

notify pgrst, 'reload schema';
