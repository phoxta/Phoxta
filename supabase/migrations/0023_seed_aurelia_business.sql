-- Phoxta platform — 0023 seed the Aurelia fashion business (niche-apparel)
-- Provisions ONE real tenant from the niche-apparel blueprint, owned by the
-- existing platform user, and seeds its catalogue into `products`. Org-insert
-- triggers add the owner membership (so it shows in the dashboard/ops console)
-- and the *.phoxta.app subdomain. The storefront (businesses/niche-apparel) reads
-- these products and writes orders back via app_place_order — same backend.
-- Idempotent: keyed on slug 'aurelia-demo'; re-running is a no-op.

do $$
declare
  v_uid uuid;
  v_bp_id uuid;
  v_bp_app text;
  v_bp_vertical text;
  v_bp_preset jsonb;
  v_org uuid;
begin
  -- Owner = the platform user (prefer femi@phoxta.com, else the earliest user).
  select id into v_uid from auth.users
    order by (email = 'femi@phoxta.com') desc, created_at asc
    limit 1;
  if v_uid is null then
    raise notice '[aurelia seed] no auth user yet — skipping';
    return;
  end if;

  select id, app_path, vertical, coalesce(preset, '{}'::jsonb)
    into v_bp_id, v_bp_app, v_bp_vertical, v_bp_preset
    from blueprints where slug = 'niche-apparel';

  select id into v_org from organizations where slug = 'aurelia-demo';
  if v_org is null then
    insert into organizations (owner_user_id, name, slug, vertical, blueprint_id, stage,
                               lifecycle_stage, app_path, modules, provisioned_at)
    values (v_uid, 'Aurelia', 'aurelia-demo', coalesce(v_bp_vertical, 'fashion'), v_bp_id, 'trial',
            'operating', coalesce(v_bp_app, 'businesses/niche-apparel'), v_bp_preset, now())
    returning id into v_org;
  end if;

  if not exists (select 1 from products where organization_id = v_org) then
    insert into products (organization_id, name, sku, description, price_cents, currency, stock, status, image_url, metadata)
    select v_org, c.name, c.slug, c.description, c.price * 100, 'USD', 25, 'active', c.img,
      jsonb_build_object('slug', c.slug, 'brand', c.brand, 'category', c.category, 'type', c.type,
        'colors', c.colors, 'sizes', c.sizes, 'isNew', c.is_new, 'sale', c.sale, 'oldPrice', c.old_price)
    from (values
      ('tailored-wool-coat','Tailored Wool Coat','Aurelia Atelier',320,null::int,'/assets/imgs/pages/product/product-1.webp','woman','Outerwear',true,false,'["Camel","Charcoal"]'::jsonb,'["XS","S","M","L"]'::jsonb,'A tailored wool coat with a clean, elevated silhouette.'),
      ('silk-slip-dress','Silk Slip Dress','Maison Lune',185,null::int,'/assets/imgs/pages/product/product-2.webp','woman','Dresses',true,false,'["Ivory","Noir"]'::jsonb,'["XS","S","M","L"]'::jsonb,'A bias-cut silk slip dress that drapes beautifully.'),
      ('relaxed-linen-shirt','Relaxed Linen Shirt','Aurelia Studio',95,null::int,'/assets/imgs/pages/product/product-3.webp','man','Shirts',false,false,'["White","Sand"]'::jsonb,'["S","M","L","XL"]'::jsonb,'A breathable relaxed-fit linen shirt for easy layering.'),
      ('cashmere-knit','Cashmere Knit Sweater','Maison Lune',180,240,'/assets/imgs/pages/product/product-4.webp','woman','Knitwear',false,true,'["Oat","Slate"]'::jsonb,'["XS","S","M","L"]'::jsonb,'A soft cashmere knit in a relaxed everyday cut.'),
      ('pleated-midi-skirt','Pleated Midi Skirt','Aurelia Atelier',130,null::int,'/assets/imgs/pages/product/product-5.webp','woman','Skirts',false,false,'["Olive","Black"]'::jsonb,'["XS","S","M","L"]'::jsonb,'A fluid pleated midi skirt with graceful movement.'),
      ('structured-blazer','Structured Blazer','Aurelia Studio',275,null::int,'/assets/imgs/pages/product/product-6.webp','man','Tailoring',true,false,'["Navy","Stone"]'::jsonb,'["S","M","L","XL"]'::jsonb,'A structured blazer that sharpens any look.'),
      ('wide-leg-trousers','Wide-Leg Trousers','Maison Lune',145,null::int,'/assets/imgs/pages/product/product-7.webp','woman','Trousers',false,false,'["Cream","Black"]'::jsonb,'["XS","S","M","L"]'::jsonb,'High-rise wide-leg trousers with a tailored drape.'),
      ('merino-roll-neck','Merino Roll-Neck','Aurelia Studio',96,120,'/assets/imgs/pages/product/product-8.webp','man','Knitwear',false,true,'["Charcoal","Camel"]'::jsonb,'["S","M","L","XL"]'::jsonb,'A fine-gauge merino roll-neck for cooler days.'),
      ('belted-trench','Belted Trench Coat','Aurelia Atelier',360,null::int,'/assets/imgs/pages/product/product-9.webp','woman','Outerwear',false,false,'["Sand","Khaki"]'::jsonb,'["XS","S","M","L"]'::jsonb,'A timeless belted trench in water-resistant cotton.'),
      ('cotton-poplin-dress','Cotton Poplin Dress','Maison Lune',160,null::int,'/assets/imgs/pages/product/product-10.webp','woman','Dresses',false,false,'["White","Sky"]'::jsonb,'["XS","S","M","L"]'::jsonb,'A crisp cotton poplin dress for effortless days.'),
      ('selvedge-denim-jacket','Selvedge Denim Jacket','Aurelia Studio',210,null::int,'/assets/imgs/pages/product/product-11.webp','man','Outerwear',true,false,'["Indigo"]'::jsonb,'["S","M","L","XL"]'::jsonb,'A raw selvedge denim jacket that ages beautifully.'),
      ('ribbed-cardigan','Ribbed Knit Cardigan','Maison Lune',140,175,'/assets/imgs/pages/product/product-12.webp','woman','Knitwear',false,true,'["Ecru","Rose"]'::jsonb,'["XS","S","M","L"]'::jsonb,'A ribbed knit cardigan with a cocooning feel.')
    ) as c(slug,name,brand,price,old_price,img,category,type,is_new,sale,colors,sizes,description);
  end if;

  raise notice '[aurelia seed] org id = %', v_org;
end $$;
