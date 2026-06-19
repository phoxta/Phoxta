-- Phoxta platform — 0024 per-buyer catalogue auto-seed
-- niche-apparel is bought by MANY users; each purchase provisions its own tenant.
-- Carry the blueprint's starter catalogue in its `preset.catalog`, and seed it
-- into every newly provisioned org via a trigger — so each buyer's storefront has
-- a stocked catalogue immediately (then customised in the ops console). Generic:
-- any blueprint with a `preset.catalog` array auto-seeds the same way.

update blueprints
set preset = coalesce(preset, '{}'::jsonb) || jsonb_build_object('catalog', '[
  {"slug":"tailored-wool-coat","name":"Tailored Wool Coat","price_cents":32000,"image_url":"/assets/imgs/pages/product/product-1.webp","description":"A tailored wool coat with a clean, elevated silhouette.","metadata":{"slug":"tailored-wool-coat","brand":"Aurelia Atelier","category":"woman","type":"Outerwear","colors":["Camel","Charcoal"],"sizes":["XS","S","M","L"],"isNew":true,"sale":false,"oldPrice":null}},
  {"slug":"silk-slip-dress","name":"Silk Slip Dress","price_cents":18500,"image_url":"/assets/imgs/pages/product/product-2.webp","description":"A bias-cut silk slip dress that drapes beautifully.","metadata":{"slug":"silk-slip-dress","brand":"Maison Lune","category":"woman","type":"Dresses","colors":["Ivory","Noir"],"sizes":["XS","S","M","L"],"isNew":true,"sale":false,"oldPrice":null}},
  {"slug":"relaxed-linen-shirt","name":"Relaxed Linen Shirt","price_cents":9500,"image_url":"/assets/imgs/pages/product/product-3.webp","description":"A breathable relaxed-fit linen shirt for easy layering.","metadata":{"slug":"relaxed-linen-shirt","brand":"Aurelia Studio","category":"man","type":"Shirts","colors":["White","Sand"],"sizes":["S","M","L","XL"],"isNew":false,"sale":false,"oldPrice":null}},
  {"slug":"cashmere-knit","name":"Cashmere Knit Sweater","price_cents":18000,"image_url":"/assets/imgs/pages/product/product-4.webp","description":"A soft cashmere knit in a relaxed everyday cut.","metadata":{"slug":"cashmere-knit","brand":"Maison Lune","category":"woman","type":"Knitwear","colors":["Oat","Slate"],"sizes":["XS","S","M","L"],"isNew":false,"sale":true,"oldPrice":240}},
  {"slug":"pleated-midi-skirt","name":"Pleated Midi Skirt","price_cents":13000,"image_url":"/assets/imgs/pages/product/product-5.webp","description":"A fluid pleated midi skirt with graceful movement.","metadata":{"slug":"pleated-midi-skirt","brand":"Aurelia Atelier","category":"woman","type":"Skirts","colors":["Olive","Black"],"sizes":["XS","S","M","L"],"isNew":false,"sale":false,"oldPrice":null}},
  {"slug":"structured-blazer","name":"Structured Blazer","price_cents":27500,"image_url":"/assets/imgs/pages/product/product-6.webp","description":"A structured blazer that sharpens any look.","metadata":{"slug":"structured-blazer","brand":"Aurelia Studio","category":"man","type":"Tailoring","colors":["Navy","Stone"],"sizes":["S","M","L","XL"],"isNew":true,"sale":false,"oldPrice":null}},
  {"slug":"wide-leg-trousers","name":"Wide-Leg Trousers","price_cents":14500,"image_url":"/assets/imgs/pages/product/product-7.webp","description":"High-rise wide-leg trousers with a tailored drape.","metadata":{"slug":"wide-leg-trousers","brand":"Maison Lune","category":"woman","type":"Trousers","colors":["Cream","Black"],"sizes":["XS","S","M","L"],"isNew":false,"sale":false,"oldPrice":null}},
  {"slug":"merino-roll-neck","name":"Merino Roll-Neck","price_cents":9600,"image_url":"/assets/imgs/pages/product/product-8.webp","description":"A fine-gauge merino roll-neck for cooler days.","metadata":{"slug":"merino-roll-neck","brand":"Aurelia Studio","category":"man","type":"Knitwear","colors":["Charcoal","Camel"],"sizes":["S","M","L","XL"],"isNew":false,"sale":true,"oldPrice":120}},
  {"slug":"belted-trench","name":"Belted Trench Coat","price_cents":36000,"image_url":"/assets/imgs/pages/product/product-9.webp","description":"A timeless belted trench in water-resistant cotton.","metadata":{"slug":"belted-trench","brand":"Aurelia Atelier","category":"woman","type":"Outerwear","colors":["Sand","Khaki"],"sizes":["XS","S","M","L"],"isNew":false,"sale":false,"oldPrice":null}},
  {"slug":"cotton-poplin-dress","name":"Cotton Poplin Dress","price_cents":16000,"image_url":"/assets/imgs/pages/product/product-10.webp","description":"A crisp cotton poplin dress for effortless days.","metadata":{"slug":"cotton-poplin-dress","brand":"Maison Lune","category":"woman","type":"Dresses","colors":["White","Sky"],"sizes":["XS","S","M","L"],"isNew":false,"sale":false,"oldPrice":null}},
  {"slug":"selvedge-denim-jacket","name":"Selvedge Denim Jacket","price_cents":21000,"image_url":"/assets/imgs/pages/product/product-11.webp","description":"A raw selvedge denim jacket that ages beautifully.","metadata":{"slug":"selvedge-denim-jacket","brand":"Aurelia Studio","category":"man","type":"Outerwear","colors":["Indigo"],"sizes":["S","M","L","XL"],"isNew":true,"sale":false,"oldPrice":null}},
  {"slug":"ribbed-cardigan","name":"Ribbed Knit Cardigan","price_cents":14000,"image_url":"/assets/imgs/pages/product/product-12.webp","description":"A ribbed knit cardigan with a cocooning feel.","metadata":{"slug":"ribbed-cardigan","brand":"Maison Lune","category":"woman","type":"Knitwear","colors":["Ecru","Rose"],"sizes":["XS","S","M","L"],"isNew":false,"sale":true,"oldPrice":175}}
]'::jsonb)
where slug = 'niche-apparel';

-- Seed a new org's catalogue from its blueprint preset on provision.
create or replace function public.app_seed_org_catalog() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_catalog jsonb;
  v_item jsonb;
begin
  if new.blueprint_id is null then
    return new;
  end if;
  select preset->'catalog' into v_catalog from blueprints where id = new.blueprint_id;
  if v_catalog is null or jsonb_typeof(v_catalog) <> 'array' then
    return new;
  end if;
  if exists (select 1 from products where organization_id = new.id) then
    return new;
  end if;
  for v_item in select * from jsonb_array_elements(v_catalog)
  loop
    insert into products (organization_id, name, sku, description, price_cents, currency, stock, status, image_url, metadata)
    values (new.id, v_item->>'name', coalesce(v_item->>'slug', ''), coalesce(v_item->>'description', ''),
            coalesce((v_item->>'price_cents')::int, 0), 'USD', 25, 'active',
            v_item->>'image_url', coalesce(v_item->'metadata', '{}'::jsonb));
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_org_seed_catalog on organizations;
create trigger trg_org_seed_catalog
  after insert on organizations
  for each row execute function public.app_seed_org_catalog();
