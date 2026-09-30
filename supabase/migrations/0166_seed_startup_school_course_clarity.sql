-- Publish the course-clarity curriculum for the configured Startup School tenant.
-- The content function is defined by 0165; rerunning it updates the catalogue
-- without changing learner progress, notes or other learner-owned records.
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
