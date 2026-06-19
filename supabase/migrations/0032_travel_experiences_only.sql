-- Phoxta platform — 0032 narrow the travel blueprint to a single service: Experiences.
-- The multi-vertical "travel" business is refocused to ONLY experiences (stays /
-- cars / flights removed), so each business does one thing and its owner console
-- stays clean. Keeps the existing infra (slug 'travel', app_path businesses/travel,
-- subdomain *.travel.phoxta.com) — only the offering changes.

-- Blueprint: keep only experience items in the starter catalogue; relabel.
update blueprints
set name = 'Experiences',
    vertical = 'experience',
    preset = jsonb_set(
      coalesce(preset, '{}'::jsonb),
      '{catalog}',
      (select coalesce(jsonb_agg(e), '[]'::jsonb)
         from jsonb_array_elements(coalesce(preset->'catalog', '[]'::jsonb)) e
        where e->'metadata'->>'vertical' = 'experience')
    )
where slug = 'travel';

-- Demo tenant: relabel + drop every non-experience product (FKs on order_items /
-- reservations are ON DELETE SET NULL, so this is safe), then remove now-orphaned
-- product reviews.
do $$
declare v_org uuid;
begin
  select id into v_org from organizations where slug = 'travel-demo';
  if v_org is null then return; end if;

  update organizations set name = 'Wander', vertical = 'experience' where id = v_org;

  delete from products
   where organization_id = v_org
     and coalesce(metadata->>'vertical', '') <> 'experience';

  delete from reviews
   where organization_id = v_org
     and subject_type = 'product'
     and subject_ref not in (select id::text from products where organization_id = v_org);

  raise notice '[travel->experiences] org % stripped to experiences', v_org;
end $$;
