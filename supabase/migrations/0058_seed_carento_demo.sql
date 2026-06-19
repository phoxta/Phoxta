-- Phoxta platform — 0058 seed a Carento demo tenant (car rental) like saveur-demo,
-- with branding, profile (hours/location), and rental EXTRAS on every vehicle so the
-- booking flow shows insurance / GPS / seats end-to-end. Idempotent (keyed on slug).
-- Org insert fires the catalogue auto-seed (fleet from the blueprint preset) before
-- the extras update runs.

do $$
declare
  v_uid uuid;
begin
  select id into v_uid from auth.users order by (email = 'femi@phoxta.com') desc, created_at asc limit 1;
  if v_uid is null then raise notice '[carento seed] no user'; return; end if;

  if not exists (select 1 from organizations where slug = 'carento-demo') then
    insert into organizations (owner_user_id, name, slug, vertical, blueprint_id, stage, lifecycle_stage, app_path, modules, branding, profile, provisioned_at)
    select v_uid, 'Carento', 'carento-demo', coalesce(b.vertical, 'rental'), b.id, 'trial', 'operating', b.app_path, coalesce(b.preset, '{}'::jsonb),
      $b$ {"name":"Carento","tagline":"Drive your way","colors":{"primary":"#2563eb","accent":"#f59e0b","bg":"#ffffff","text":"#0f172a"},"fonts":{"heading":"Sora","body":"Inter"},"radius":"12px"} $b$::jsonb,
      $p$ {"address":"45 Airport Road, Los Angeles, CA 90045","phone":"+1 (310) 555-0123","email":"book@carento.example","mapQuery":"Los Angeles International Airport","hours":[
        {"day":"Monday","open":"07:00","close":"22:00","closed":false},
        {"day":"Tuesday","open":"07:00","close":"22:00","closed":false},
        {"day":"Wednesday","open":"07:00","close":"22:00","closed":false},
        {"day":"Thursday","open":"07:00","close":"22:00","closed":false},
        {"day":"Friday","open":"07:00","close":"23:00","closed":false},
        {"day":"Saturday","open":"08:00","close":"23:00","closed":false},
        {"day":"Sunday","open":"08:00","close":"21:00","closed":false}
      ]} $p$::jsonb,
      now()
    from blueprints b where b.slug = 'carento';
  else
    update organizations set
      branding = $b$ {"name":"Carento","tagline":"Drive your way","colors":{"primary":"#2563eb","accent":"#f59e0b","bg":"#ffffff","text":"#0f172a"},"fonts":{"heading":"Sora","body":"Inter"},"radius":"12px"} $b$::jsonb
    where slug = 'carento-demo';
  end if;

  -- Rental extras on every vehicle (priced per day, server-validated at booking).
  update products set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('modifiers', $j$[
    {"name":"Extras","options":[
      {"label":"Full insurance","price":1500},
      {"label":"GPS navigation","price":500},
      {"label":"Child seat","price":300},
      {"label":"Additional driver","price":800}
    ]}
  ]$j$::jsonb)
  where organization_id in (select id from organizations where slug = 'carento-demo');
end $$;
