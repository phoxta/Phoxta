-- Refresh the Startup School tenant after the CornerCart curriculum case update.
do $$
declare
  v_org uuid := '2a51e95e-258d-405d-920b-6271d893344f';
begin
  if exists (select 1 from public.organizations where id = v_org) then
    perform public.ss_seed_org(v_org);
  else
    raise notice 'Startup School seed skipped: configured organization does not exist.';
  end if;
end $$;
