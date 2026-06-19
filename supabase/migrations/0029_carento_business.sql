-- Phoxta platform — 0029 seed the Carento car-rental business (booking vertical)
-- Provisions the carento blueprint as a real booking business: its fleet lives in
-- products (price_cents = daily rate, stock = units), bookings go through the
-- reservations backend (migration 0028). Sets the buyer subdomain namespace
-- (*.carento.phoxta.com) and seeds a carento-demo tenant owned by the platform
-- user. The auto-seed trigger (0024) stocks every future carento buyer's fleet
-- from the blueprint preset.catalog below. Idempotent on slug 'carento-demo'.

-- Make the generic catalogue auto-seed honor an optional per-item `stock`
-- (defaults to 25, so niche-apparel seeding is unchanged) — car fleets are small.
create or replace function public.app_seed_org_catalog() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_catalog jsonb;
  v_item jsonb;
begin
  if new.blueprint_id is null then return new; end if;
  select preset->'catalog' into v_catalog from blueprints where id = new.blueprint_id;
  if v_catalog is null or jsonb_typeof(v_catalog) <> 'array' then return new; end if;
  if exists (select 1 from products where organization_id = new.id) then return new; end if;
  for v_item in select * from jsonb_array_elements(v_catalog)
  loop
    insert into products (organization_id, name, sku, description, price_cents, currency, stock, status, image_url, metadata)
    values (new.id, v_item->>'name', coalesce(v_item->>'slug', ''), coalesce(v_item->>'description', ''),
            coalesce((v_item->>'price_cents')::int, 0), 'USD',
            coalesce((v_item->>'stock')::int, 25), 'active',
            v_item->>'image_url', coalesce(v_item->'metadata', '{}'::jsonb));
  end loop;
  return new;
end;
$$;

-- Carento buyer subdomain namespace + starter fleet (cars-as-products).
update blueprints
set subdomain_base = 'carento.phoxta.com',
    preset = coalesce(preset, '{}'::jsonb) || jsonb_build_object('catalog', '[{"slug":"gmc-sierra-2500hd-denali-1","name":"GMC Sierra 2500HD Denali","price_cents":10000,"stock":3,"image_url":"/assets/imgs/cars-listing/cars-listing-6/car-1.png","description":"Sedans · Plug-in Hybrid (PHEV) · Leather upholstery","metadata":{"slug":"gmc-sierra-2500hd-denali-1","image":"car-1.png","carType":"Sedans","fuelType":"Plug-in Hybrid (PHEV)","amenities":"Leather upholstery","location":"Machu Picchu","rating":"4.5","duration":"7","price":100}},{"slug":"ford-mustang-gt-premium-2","name":"Ford Mustang GT Premium","price_cents":20000,"stock":4,"image_url":"/assets/imgs/cars-listing/cars-listing-6/car-2.png","description":"Hatchbacks · Hybrid (HEV) · Heated seats","metadata":{"slug":"ford-mustang-gt-premium-2","image":"car-2.png","carType":"Hatchbacks","fuelType":"Hybrid (HEV)","amenities":"Heated seats","location":"Great Wall","rating":"4.7","duration":"5","price":200}},{"slug":"mazda-mx-5-miata-club-3","name":"Mazda MX-5 Miata Club","price_cents":30000,"stock":5,"image_url":"/assets/imgs/cars-listing/cars-listing-6/car-3.png","description":"Convertibles · Electric Vehicle (EV) · Sunroof/Moonroof","metadata":{"slug":"mazda-mx-5-miata-club-3","image":"car-3.png","carType":"Convertibles","fuelType":"Electric Vehicle (EV)","amenities":"Sunroof/Moonroof","location":"Eiffel Tower","rating":"4.9","duration":"10","price":300}},{"slug":"subaru-impreza-wrx-sti-4","name":"Subaru Impreza WRX STI","price_cents":40000,"stock":2,"image_url":"/assets/imgs/cars-listing/cars-listing-6/car-4.png","description":"Sedans · Diesel · Leather upholstery","metadata":{"slug":"subaru-impreza-wrx-sti-4","image":"car-4.png","carType":"Sedans","fuelType":"Diesel","amenities":"Leather upholstery","location":"Statue of Liberty","rating":"4.6","duration":"7","price":400}},{"slug":"porsche-911-carrera-s-5","name":"Porsche 911 Carrera S","price_cents":50000,"stock":3,"image_url":"/assets/imgs/cars-listing/cars-listing-6/car-5.png","description":"Sedans · Gasoline/Petrol · Heads-up display","metadata":{"slug":"porsche-911-carrera-s-5","image":"car-5.png","carType":"Sedans","fuelType":"Gasoline/Petrol","amenities":"Heads-up display","location":"Taj Mahal","rating":"4.8","duration":"5","price":500}},{"slug":"toyota-camry-le-hybrid-6","name":"Toyota Camry LE Hybrid","price_cents":10000,"stock":4,"image_url":"/assets/imgs/cars-listing/cars-listing-6/car-6.png","description":"SUVs · Hydrogen · Leather upholstery","metadata":{"slug":"toyota-camry-le-hybrid-6","image":"car-6.png","carType":"SUVs","fuelType":"Hydrogen","amenities":"Leather upholstery","location":"Great Wall","rating":"4.4","duration":"4","price":100}},{"slug":"hyundai-sonata-sel-plus-7","name":"Hyundai Sonata SEL Plus","price_cents":20000,"stock":5,"image_url":"/assets/imgs/cars-listing/cars-listing-6/car-7.png","description":"SUVs · Plug-in Hybrid (PHEV) · Adaptive cruise control","metadata":{"slug":"hyundai-sonata-sel-plus-7","image":"car-7.png","carType":"SUVs","fuelType":"Plug-in Hybrid (PHEV)","amenities":"Adaptive cruise control","location":"Eiffel Tower","rating":"4.7","duration":"7","price":200}},{"slug":"buick-enclave-avenir-8","name":"Buick Enclave Avenir","price_cents":30000,"stock":2,"image_url":"/assets/imgs/cars-listing/cars-listing-6/car-8.png","description":"SUVs · Hybrid (HEV) · Heated seats","metadata":{"slug":"buick-enclave-avenir-8","image":"car-8.png","carType":"SUVs","fuelType":"Hybrid (HEV)","amenities":"Heated seats","location":"Statue of Liberty","rating":"4.6","duration":"7","price":300}},{"slug":"chevrolet-silverado-9","name":"Chevrolet Silverado","price_cents":40000,"stock":3,"image_url":"/assets/imgs/cars-listing/cars-listing-6/car-9.png","description":"Coupes · Electric Vehicle (EV) · Sunroof/Moonroof","metadata":{"slug":"chevrolet-silverado-9","image":"car-9.png","carType":"Coupes","fuelType":"Electric Vehicle (EV)","amenities":"Sunroof/Moonroof","location":"Machu Picchu","rating":"4.5","duration":"5","price":400}},{"slug":"subaru-outback-limited-xt-10","name":"Subaru Outback Limited XT","price_cents":50000,"stock":4,"image_url":"/assets/imgs/cars-listing/cars-listing-6/car-10.png","description":"Coupes · Diesel · Heated seats","metadata":{"slug":"subaru-outback-limited-xt-10","image":"car-10.png","carType":"Coupes","fuelType":"Diesel","amenities":"Heated seats","location":"Taj Mahal","rating":"4.5","duration":"7","price":500}},{"slug":"jeep-wrangler-rubicon-unlimited-11","name":"Jeep Wrangler Rubicon Unlimited","price_cents":45000,"stock":5,"image_url":"/assets/imgs/cars-listing/cars-listing-6/car-11.png","description":"Compacts · Electric Vehicle (EV) · Sunroof/Moonroof","metadata":{"slug":"jeep-wrangler-rubicon-unlimited-11","image":"car-11.png","carType":"Compacts","fuelType":"Electric Vehicle (EV)","amenities":"Sunroof/Moonroof","location":"Colosseum","rating":"4.8","duration":"5","price":450}},{"slug":"kia-telluride-sx-12","name":"Kia Telluride SX","price_cents":37000,"stock":2,"image_url":"/assets/imgs/cars-listing/cars-listing-6/car-12.png","description":"SUVs · Plug-in Hybrid (PHEV) · Heated seats","metadata":{"slug":"kia-telluride-sx-12","image":"car-12.png","carType":"SUVs","fuelType":"Plug-in Hybrid (PHEV)","amenities":"Heated seats","location":"Pyramids of Giza","rating":"4.7","duration":"7","price":370}},{"slug":"mini-cooper-s-hardtop-2-door-13","name":"Mini Cooper S Hardtop 2 Door","price_cents":42000,"stock":3,"image_url":"/assets/imgs/cars-listing/cars-listing-6/car-13.png","description":"Coupes · Hybrid (HEV) · Sunroof/Moonroof","metadata":{"slug":"mini-cooper-s-hardtop-2-door-13","image":"car-13.png","carType":"Coupes","fuelType":"Hybrid (HEV)","amenities":"Sunroof/Moonroof","location":"Pompeii","rating":"4.6","duration":"6","price":420}},{"slug":"subaru-impreza-wrx-sti-14","name":"Subaru Impreza WRX STI","price_cents":33000,"stock":4,"image_url":"/assets/imgs/cars-listing/cars-listing-6/car-14.png","description":"Compacts · Diesel · Heated seats","metadata":{"slug":"subaru-impreza-wrx-sti-14","image":"car-14.png","carType":"Compacts","fuelType":"Diesel","amenities":"Heated seats","location":"Buckingham Palace","rating":"4.5","duration":"7","price":330}},{"slug":"audi-q5-2-0t-premium-plus-15","name":"Audi Q5 2.0T Premium Plus","price_cents":41000,"stock":5,"image_url":"/assets/imgs/cars-listing/cars-listing-6/car-15.png","description":"SUVs · Plug-in Hybrid (PHEV) · Sunroof/Moonroof","metadata":{"slug":"audi-q5-2-0t-premium-plus-15","image":"car-15.png","carType":"SUVs","fuelType":"Plug-in Hybrid (PHEV)","amenities":"Sunroof/Moonroof","location":"Eiffel Tower","rating":"4.5","duration":"5","price":410}},{"slug":"cadillac-xt6-premium-luxury-16","name":"Cadillac XT6 Premium Luxury","price_cents":34000,"stock":2,"image_url":"/assets/imgs/cars-listing/cars-listing-6/car-16.png","description":"Coupes · Hybrid (HEV) · Heated seats","metadata":{"slug":"cadillac-xt6-premium-luxury-16","image":"car-16.png","carType":"Coupes","fuelType":"Hybrid (HEV)","amenities":"Heated seats","location":"Statue of Liberty","rating":"4.4","duration":"6","price":340}},{"slug":"chevrolet-bolt-ev-premier-17","name":"Chevrolet Bolt EV Premier","price_cents":47000,"stock":3,"image_url":"/assets/imgs/cars-listing/cars-listing-6/car-17.png","description":"Compacts · Electric Vehicle (EV) · Sunroof/Moonroof","metadata":{"slug":"chevrolet-bolt-ev-premier-17","image":"car-17.png","carType":"Compacts","fuelType":"Electric Vehicle (EV)","amenities":"Sunroof/Moonroof","location":"Machu Picchu","rating":"4.3","duration":"7","price":470}},{"slug":"ford-explorer-limited-18","name":"Ford Explorer Limited","price_cents":53000,"stock":4,"image_url":"/assets/imgs/cars-listing/cars-listing-6/car-18.png","description":"SUVs · Diesel · Heated seats","metadata":{"slug":"ford-explorer-limited-18","image":"car-18.png","carType":"SUVs","fuelType":"Diesel","amenities":"Heated seats","location":"Taj Mahal","rating":"4.2","duration":"5","price":530}},{"slug":"lexus-rc-300-f-sport-19","name":"Lexus RC 300 F Sport","price_cents":49000,"stock":5,"image_url":"/assets/imgs/cars-listing/cars-listing-6/car-19.png","description":"Coupes · Plug-in Hybrid (PHEV) · Sunroof/Moonroof","metadata":{"slug":"lexus-rc-300-f-sport-19","image":"car-19.png","carType":"Coupes","fuelType":"Plug-in Hybrid (PHEV)","amenities":"Sunroof/Moonroof","location":"Colosseum","rating":"4.1","duration":"7","price":490}},{"slug":"nissan-rogue-sv-awd-20","name":"Nissan Rogue SV AWD","price_cents":38000,"stock":2,"image_url":"/assets/imgs/cars-listing/cars-listing-6/car-20.png","description":"Compacts · Hybrid (HEV) · Heated seats","metadata":{"slug":"nissan-rogue-sv-awd-20","image":"car-20.png","carType":"Compacts","fuelType":"Hybrid (HEV)","amenities":"Heated seats","location":"Pyramids of Giza","rating":"4.0","duration":"5","price":380}}]'::jsonb)
where slug = 'carento';

-- Seed the Carento demo tenant (owned by the platform user). Org-insert triggers
-- fire: owner membership + *.carento.phoxta.com subdomain + fleet auto-seed.
do $$
declare
  v_uid uuid; v_bp_id uuid; v_bp_app text; v_bp_vertical text; v_bp_preset jsonb; v_org uuid;
begin
  select id into v_uid from auth.users
    order by (email = 'femi@phoxta.com') desc, created_at asc limit 1;
  if v_uid is null then raise notice '[carento seed] no auth user yet — skipping'; return; end if;

  select id, app_path, vertical, coalesce(preset, '{}'::jsonb)
    into v_bp_id, v_bp_app, v_bp_vertical, v_bp_preset
    from blueprints where slug = 'carento';

  select id into v_org from organizations where slug = 'carento-demo';
  if v_org is null then
    insert into organizations (owner_user_id, name, slug, vertical, blueprint_id, stage,
                               lifecycle_stage, app_path, modules, provisioned_at)
    values (v_uid, 'Carento', 'carento-demo', coalesce(v_bp_vertical, 'automotive'), v_bp_id, 'trial',
            'operating', coalesce(v_bp_app, 'businesses/carento'), v_bp_preset, now())
    returning id into v_org;
  end if;
  raise notice '[carento seed] org id = %', v_org;
end $$;
