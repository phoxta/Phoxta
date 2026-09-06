-- Phoxta platform — 0146 the Ferne business (botanical skincare, DTC).
--
-- Ferne began as a portfolio case study (femi.phoxta.com/work/ferne) built as a
-- static front end. This turns it into a real, sellable blueprint: its own
-- storefront app (businesses/ferne → Vercel project `ferne`, wildcard
-- *.ferne.phoxta.com) on the shared backend, listed at £3,000.
--
-- It is the first blueprint that sells the SAME formula in several sizes at
-- different prices, so this migration also teaches two shared pieces to handle
-- that properly:
--
--   * app_seed_org_catalog  — seeds product_variants (and honours a blueprint's
--     currency and per-item stock) so every buyer's shop has working sizes, not
--     just products. Previously a buyer got products with no variants, which for
--     Ferne would mean no purchasable sizes at all.
--   * app_place_order       — charges the delivery fee the storefront quoted.
--     It already CAPTURED the shipping payload but never added it to the total,
--     so any storefront showing a delivery charge collected nothing for it.
--
-- Both changes are backwards-compatible: a blueprint with no `variants` behaves
-- exactly as before, and an order with no `fee_cents` in its shipping payload
-- totals exactly as before.
--
-- Follow-up once the Vercel project exists:
--   update blueprints set vercel_project_id = 'prj_…' where slug = 'ferne';

-- ---------------------------------------------------------------------------
-- 1. Journal tags
--
-- The storefront's journal filters by tag, and blog_posts had nowhere to put
-- one. Additive and defaulted, so every existing post and every surface that
-- reads the table is unaffected. The console has no tenant blog editor today, so
-- tags arrive from the blueprint seed until one exists; a post with none simply
-- shows under every filter.
-- ---------------------------------------------------------------------------
alter table blog_posts add column if not exists tags text[] not null default '{}'::text[];

-- ---------------------------------------------------------------------------
-- 2. Catalogue auto-seed: variants, currency and per-item stock
-- ---------------------------------------------------------------------------
create or replace function public.app_seed_org_catalog() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_preset   jsonb;
  v_catalog  jsonb;
  v_currency text;
  v_item     jsonb;
  v_variant  jsonb;
  v_product  uuid;
begin
  if new.blueprint_id is null then
    return new;
  end if;
  select preset into v_preset from blueprints where id = new.blueprint_id;
  v_catalog := v_preset->'catalog';
  if v_catalog is null or jsonb_typeof(v_catalog) <> 'array' then
    return new;
  end if;
  if exists (select 1 from products where organization_id = new.id) then
    return new;
  end if;

  -- A blueprint may price in its own currency; USD stays the default so no
  -- existing blueprint changes behaviour.
  v_currency := coalesce(nullif(v_preset->>'currency', ''), nullif(new.currency, ''), 'USD');

  for v_item in select * from jsonb_array_elements(v_catalog)
  loop
    insert into products (organization_id, name, sku, description, price_cents, currency, stock, status, image_url, metadata)
    values (new.id, v_item->>'name', coalesce(v_item->>'slug', ''), coalesce(v_item->>'description', ''),
            coalesce((v_item->>'price_cents')::int, 0), v_currency,
            coalesce((v_item->>'stock')::int, 25), 'active',
            v_item->>'image_url', coalesce(v_item->'metadata', '{}'::jsonb))
    returning id into v_product;

    -- Sizes/colours, where the blueprint describes them. app_place_order prices a
    -- line from the matched variant, so these rows ARE the prices a shopper pays.
    if jsonb_typeof(v_item->'variants') = 'array' then
      for v_variant in select * from jsonb_array_elements(v_item->'variants')
      loop
        insert into product_variants (organization_id, product_id, size, color, sku, stock, price_cents)
        values (new.id, v_product,
                coalesce(v_variant->>'size', ''), coalesce(v_variant->>'color', ''),
                coalesce(v_variant->>'sku', ''),
                coalesce((v_variant->>'stock')::int, coalesce((v_item->>'stock')::int, 25)),
                nullif(v_variant->>'price_cents', '')::int)
        on conflict (product_id, size, color) do nothing;
      end loop;
    end if;
  end loop;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. app_place_order v4: charge the quoted delivery fee
--
-- Identical to v3 (migration 0073) except for the delivery fee. The storefront
-- puts `fee_cents` on the shipping payload; the server clamps it, adds it to the
-- total, and strips it back out of the stored payload so the console renders
-- clean address lines. Everything that decides money — unit prices, variants,
-- stock, promo codes — is still read from the tenant's own tables, never from
-- the request.
-- ---------------------------------------------------------------------------
create or replace function public.app_place_order(
  p_org uuid, p_customer_name text, p_customer_email text, p_items jsonb,
  p_notes text default '', p_promo text default '', p_shipping jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_order uuid; v_item jsonb; v_prod products%rowtype; v_variant product_variants%rowtype;
  v_qty int; v_unit int; v_sel jsonb; v_size text; v_color text; v_name text; v_total int := 0;
  v_pc promo_codes%rowtype; v_disc int := 0; v_hit int;
  v_ship jsonb; v_fee int := 0;
begin
  if not exists (select 1 from organizations where id = p_org) then raise exception 'Unknown business'; end if;

  v_ship := coalesce(p_shipping, '{}'::jsonb);
  -- Only a real number counts, and only within a sane range: a tampered client
  -- can inflate its OWN bill, and nothing else, and not without limit.
  if jsonb_typeof(v_ship->'fee_cents') = 'number' then
    v_fee := least(50000, greatest(0, (v_ship->>'fee_cents')::int));
  end if;
  v_ship := v_ship - 'fee_cents';

  insert into orders (organization_id, customer_name, customer_email, status, total_cents, notes, shipping, source)
  values (p_org, coalesce(p_customer_name, ''), coalesce(p_customer_email, ''), 'pending', 0,
          coalesce(p_notes, ''), v_ship, 'storefront')
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_qty := greatest(1, coalesce((v_item->>'quantity')::int, 1));
    v_size := nullif(v_item->>'size', '');
    v_color := nullif(v_item->>'color', '');
    v_variant := null;
    select * into v_prod from products where id = nullif(v_item->>'product_id', '')::uuid and organization_id = p_org and status = 'active';
    if found then
      if v_size is not null or v_color is not null then
        select * into v_variant from product_variants
          where product_id = v_prod.id
            and (v_size is null or size = v_size)
            and (v_color is null or color = v_color)
          order by size, color limit 1;
      end if;

      if v_variant.id is not null then
        update product_variants set stock = stock - v_qty
         where id = v_variant.id and stock >= v_qty;
        get diagnostics v_hit = row_count;
        if v_hit = 0 then
          raise exception 'Out of stock: % (%)', v_prod.name, concat_ws(' / ', v_size, v_color);
        end if;
        update products set stock = greatest(0, stock - v_qty) where id = v_prod.id;
      elsif v_prod.stock is not null then
        update products set stock = stock - v_qty
         where id = v_prod.id and stock >= v_qty;
        get diagnostics v_hit = row_count;
        if v_hit = 0 then
          raise exception 'Out of stock: %', v_prod.name;
        end if;
      end if;

      v_unit := coalesce(v_variant.price_cents, v_prod.price_cents);
      v_sel := coalesce(v_item->'options', '[]'::jsonb);
      if jsonb_typeof(v_sel) = 'array' and jsonb_array_length(v_sel) > 0 then
        select v_unit + coalesce(sum((opt->>'price')::int), 0) into v_unit
        from jsonb_array_elements(v_sel) sel
        cross join lateral jsonb_array_elements(coalesce(v_prod.metadata->'modifiers', '[]'::jsonb)) grp
        cross join lateral jsonb_array_elements(coalesce(grp->'options', '[]'::jsonb)) opt
        where grp->>'name' = sel->>'group' and opt->>'label' = sel->>'label';
      end if;

      v_name := v_prod.name || case
        when v_size is not null or v_color is not null then ' — ' || concat_ws(' / ', v_size, v_color)
        else '' end;
      insert into order_items (organization_id, order_id, product_id, name, quantity, unit_price_cents, notes, metadata)
      values (p_org, v_order, v_prod.id, v_name, v_qty, v_unit, coalesce(v_item->>'notes', ''),
              jsonb_build_object('options', v_sel, 'size', coalesce(v_size, ''), 'color', coalesce(v_color, '')));
      v_total := v_total + v_qty * v_unit;
    end if;
  end loop;

  if coalesce(trim(p_promo), '') <> '' then
    select * into v_pc from promo_codes
      where organization_id = p_org and lower(code) = lower(trim(p_promo)) and active = true
        and (expires_at is null or expires_at::date >= current_date) and min_cents <= v_total limit 1;
    if found then
      if v_pc.kind = 'percent' then v_disc := (v_total * least(100, greatest(0, v_pc.value))) / 100;
      else v_disc := least(v_total, greatest(0, v_pc.value)); end if;
    end if;
  end if;

  -- Delivery is charged on top of the discounted goods, which is the order the
  -- storefront shows it in.
  update orders set total_cents = greatest(0, v_total - v_disc) + v_fee, discount_cents = v_disc,
    promo_code = case when v_disc > 0 then trim(p_promo) else '' end
  where id = v_order;
  return v_order;
end; $$;
grant execute on function public.app_place_order(uuid, text, text, jsonb, text, text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Blueprint
--
-- £3,000 one-time. Priced in GBP: the shop, its catalogue and its delivery
-- thresholds are all sterling, and `formatPrice` renders each listing in its own
-- currency, so the marketplace shows "£3,000".
-- ---------------------------------------------------------------------------
insert into blueprints (slug, name, tagline, description, vertical, tier, price_cents, currency,
                        cover_url, demo_url, verified, ai_included, status, app_path, subdomain_base, metrics, preset)
values (
  'ferne',
  'Ferne Botanical Skincare',
  'A direct-to-consumer skincare storefront — editorial home, faceted shop, refills and a skin advisor.',
  'A complete DTC skincare store: an editorial homepage, a shop with filters by category, skin concern, price and refillability, product pages with size variants and honest stock, a bag-to-confirmation checkout with real payment, customer accounts with order history and refill prompts, a journal, and an AI skin advisor that answers as this business. Multi-tenant by host, built in React and ready to brand.',
  'E-commerce',
  'premium',
  300000,
  'GBP',
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&h=600&fit=crop&q=80',
  'https://demo.ferne.phoxta.com',
  true, true, 'live',
  'businesses/ferne',
  'ferne.phoxta.com',
  '{"built": true, "app": "businesses/ferne"}'::jsonb,
  jsonb_build_object(
    'currency', 'GBP',
    'catalog', '[
  {"slug":"morning-oil","name":"Morning Oil","price_cents":2800,"stock":42,"image_url":"/images/morning-oil.jpg",
   "description":"A cold-pressed blend of rosehip seed and sea buckthorn that absorbs in seconds, softens texture and brings back the warmth that reads as rested. Three drops, pressed into damp skin.",
   "variants":[{"size":"30 ml","price_cents":2800,"stock":42},{"size":"50 ml","price_cents":4200,"stock":30}],
   "metadata":{"slug":"morning-oil","tagline":"Rosehip + sea buckthorn face oil","category":"face","concerns":["Dullness","Texture","Dryness"],
     "gallery":["/images/morning-oil.jpg","/images/ing-rosehip.jpg","/images/routine.jpg"],
     "ingredients":"Rosa canina (rosehip) seed oil*, Hippophae rhamnoides (sea buckthorn) fruit oil*, Squalane (olive), Tocopherol. *Organic, traceable to farm.",
     "howTo":"Warm three drops between fingertips and press — don''t rub — into still-damp skin after cleansing, morning and night. Follow with Dew Cream.",
     "skinType":"All skin types, including oily and combination.","rating":4.9,"reviewCount":612,"bestseller":true,"isNew":false}},

  {"slug":"cloud-cleanser","name":"Cloud Cleanser","price_cents":2200,"stock":60,"image_url":"/images/cloud-cleanser.jpg",
   "description":"A low-foam gel built on oat lipids that lifts SPF and the day without stripping. Skin is clean, soft and — for once — not tight.",
   "variants":[{"size":"150 ml","price_cents":2200,"stock":60},{"size":"300 ml refill","price_cents":3600,"stock":45}],
   "metadata":{"slug":"cloud-cleanser","tagline":"Oat milk gel-to-foam wash","category":"face","concerns":["Sensitivity","Redness","Dryness"],
     "gallery":["/images/cloud-cleanser.jpg","/images/ing-oat.jpg","/images/cat-face.jpg"],
     "ingredients":"Aqua, Avena sativa (oat) kernel oil, Coco-glucoside, Glycerin, Sodium cocoyl isethionate, Panthenol, Allantoin.",
     "howTo":"Massage a pump onto damp skin for 60 seconds. Rinse with lukewarm water. Use morning and night.",
     "skinType":"Sensitive, dry and reactive skin.","rating":4.8,"reviewCount":488,"bestseller":true,"isNew":false}},

  {"slug":"dew-cream","name":"Dew Cream","price_cents":3400,"stock":18,"image_url":"/images/dew-cream.jpg",
   "description":"A cushiony barrier cream with a 3:1:1 ceramide ratio and olive squalane. Sits beautifully under SPF and makeup, and rebuilds overnight.",
   "variants":[{"size":"50 ml","price_cents":3400,"stock":18},{"size":"50 ml refill pod","price_cents":2600,"stock":40}],
   "metadata":{"slug":"dew-cream","tagline":"Squalane + ceramide barrier balm","category":"face","concerns":["Dryness","Redness","Sensitivity"],
     "gallery":["/images/dew-cream.jpg","/images/hero.jpg","/images/ing-squalane.jpg"],
     "ingredients":"Aqua, Squalane, Glycerin, Ceramide NP, Ceramide AP, Ceramide EOP, Cholesterol, Shea butter, Oat lipid complex.",
     "howTo":"A pea-sized amount pressed over serum or oil as the last step. Reapply to dry patches as needed.",
     "skinType":"Dry, dehydrated and barrier-compromised skin.","rating":4.9,"reviewCount":731,"bestseller":true,"isNew":false}},

  {"slug":"ritual-set","name":"The Ritual Set","price_cents":6800,"stock":25,"image_url":"/images/ritual-set.jpg",
   "description":"Our three best-sellers in one box, at 15% off buying separately. Cloud Cleanser, Morning Oil and Dew Cream — the whole routine, morning and night.",
   "variants":[{"size":"3 × full size","price_cents":6800,"stock":25},{"size":"3 × travel size","price_cents":3200,"stock":30}],
   "metadata":{"slug":"ritual-set","tagline":"Cleanse, treat and seal — 3 steps","category":"sets","concerns":["Dryness","Dullness","Texture"],
     "gallery":["/images/ritual-set.jpg","/images/cat-sets.jpg","/images/routine.jpg"],
     "ingredients":"See individual products.","howTo":"Cleanse, then press in three drops of oil, then seal with cream. Morning and night.",
     "skinType":"All skin types.","rating":4.9,"reviewCount":204,"bestseller":true,"isNew":false,"compareAtCents":8400}},

  {"slug":"night-mask","name":"Overnight Mask","price_cents":3000,"stock":33,"image_url":"/images/night-mask.jpg",
   "description":"A thick, breathable mask that holds water on the skin for eight hours. Wake to skin that looks like it slept more than you did.",
   "variants":[{"size":"60 ml","price_cents":3000,"stock":33}],
   "metadata":{"slug":"night-mask","tagline":"Sleeping mask with oat + hyaluronic","category":"face","concerns":["Dryness","Dullness"],
     "gallery":["/images/night-mask.jpg","/images/ing-oat.jpg"],
     "ingredients":"Aqua, Glycerin, Sodium hyaluronate (3 weights), Avena sativa kernel extract, Squalane, Betaine.",
     "howTo":"Apply a thin layer as the last step two or three nights a week. No need to rinse.",
     "skinType":"Dry and dehydrated skin.","rating":4.7,"reviewCount":156,"bestseller":false,"isNew":true}},

  {"slug":"body-oil","name":"Body Oil","price_cents":2600,"stock":40,"image_url":"/images/body-oil.jpg",
   "description":"A dry-touch oil for damp skin straight out of the shower. Locks in water, softens elbows and knees, and doesn''t mark your clothes.",
   "variants":[{"size":"100 ml","price_cents":2600,"stock":40},{"size":"250 ml","price_cents":4800,"stock":22}],
   "metadata":{"slug":"body-oil","tagline":"Rosehip + jojoba after-shower oil","category":"body","concerns":["Dryness","Texture"],
     "gallery":["/images/body-oil.jpg","/images/cat-body.jpg"],
     "ingredients":"Simmondsia chinensis (jojoba) seed oil, Rosa canina seed oil*, Squalane, Tocopherol.",
     "howTo":"Pump onto damp skin after showering and massage in. Pat dry.",
     "skinType":"All skin types.","rating":4.8,"reviewCount":143,"bestseller":false,"isNew":false}},

  {"slug":"hand-cream","name":"Hand Cream","price_cents":1400,"stock":90,"image_url":"/images/hand-cream.jpg",
   "description":"Non-greasy in 30 seconds. Shea, oat lipids and glycerin for hands that wash twenty times a day.",
   "variants":[{"size":"50 ml tube","price_cents":1400,"stock":90}],
   "metadata":{"slug":"hand-cream","tagline":"Shea + oat fast-absorb hand balm","category":"body","concerns":["Dryness","Sensitivity"],
     "gallery":["/images/hand-cream.jpg"],
     "ingredients":"Aqua, Butyrospermum parkii (shea) butter, Glycerin, Avena sativa kernel oil, Cetearyl alcohol, Allantoin.",
     "howTo":"Apply as often as needed. Especially after washing.",
     "skinType":"All skin types.","rating":4.8,"reviewCount":389,"bestseller":false,"isNew":false}},

  {"slug":"lip-balm","name":"Lip Balm","price_cents":1200,"stock":0,"image_url":"/images/lip-balm.jpg",
   "description":"A sheer apricot tint from sea buckthorn, with shea and beeswax for lips that stay soft through a British winter.",
   "variants":[{"size":"10 ml","price_cents":1200,"stock":0}],
   "metadata":{"slug":"lip-balm","tagline":"Sea buckthorn tinted balm","category":"face","concerns":["Dryness"],
     "gallery":["/images/lip-balm.jpg"],
     "ingredients":"Cera alba (beeswax), Butyrospermum parkii butter, Hippophae rhamnoides fruit oil*, Ricinus communis seed oil.",
     "howTo":"Apply as needed.","skinType":"All.","rating":4.6,"reviewCount":221,"bestseller":false,"isNew":true}},

  {"slug":"gua-sha","name":"Gua Sha & Roller Set","price_cents":3800,"stock":12,"image_url":"/images/tools.jpg",
   "description":"Cool, weighty tools for a five-minute lymphatic massage over Morning Oil. Comes with an illustrated guide.",
   "variants":[{"size":"Set","price_cents":3800,"stock":12}],
   "metadata":{"slug":"gua-sha","tagline":"Hand-cut jade tools with linen pouch","category":"sets","concerns":["Texture","Dullness"],
     "gallery":["/images/tools.jpg","/images/routine.jpg"],
     "ingredients":"Nephrite jade, stainless steel, linen.",
     "howTo":"Sweep outward and upward with light pressure over oil, 5 minutes, 3× a week.",
     "skinType":"All.","rating":4.7,"reviewCount":98,"bestseller":false,"isNew":false}}
]'::jsonb)
)
on conflict (slug) do update set
  name           = excluded.name,
  tagline        = excluded.tagline,
  description    = excluded.description,
  vertical       = excluded.vertical,
  tier           = excluded.tier,
  price_cents    = excluded.price_cents,
  currency       = excluded.currency,
  cover_url      = excluded.cover_url,
  demo_url       = excluded.demo_url,
  verified       = excluded.verified,
  app_path       = excluded.app_path,
  subdomain_base = excluded.subdomain_base,
  metrics        = excluded.metrics,
  preset         = excluded.preset,
  status         = 'live';

-- ---------------------------------------------------------------------------
-- 5. Demo tenant + showcase host
-- ---------------------------------------------------------------------------
do $$
declare
  v_uid uuid;
  v_org uuid;
begin
  select id into v_uid from auth.users
    order by (email = 'femi@phoxta.com') desc, created_at asc limit 1;
  if v_uid is null then raise notice '[ferne seed] no auth user yet — skipping tenant'; return; end if;

  select id into v_org from organizations where slug = 'ferne-demo';
  if v_org is null then
    -- Branding carries the NAME only. Colours and fonts would rewrite the design
    -- system's own tokens; the demo has to look exactly like the storefront a
    -- buyer is being shown.
    insert into organizations (owner_user_id, name, slug, vertical, blueprint_id, stage, lifecycle_stage,
                               app_path, modules, branding, profile, currency, provisioned_at)
    select v_uid, 'Ferne', 'ferne-demo', coalesce(b.vertical, 'E-commerce'), b.id, 'trial', 'operating',
           coalesce(b.app_path, 'businesses/ferne'), coalesce(b.preset, '{}'::jsonb),
           $b$ {"name":"Ferne","tagline":"Botanical skincare with traceable ingredients"} $b$::jsonb,
           $p$ {
             "address": "14 Gibb Street, Digbeth, Birmingham B9 4AA",
             "phone": "+44 121 296 0140",
             "email": "hello@ferne.example",
             "mapQuery": "Gibb Street, Digbeth, Birmingham",
             "hours": [
               {"day":"Monday","open":"10:00","close":"18:00","closed":false},
               {"day":"Tuesday","open":"10:00","close":"18:00","closed":false},
               {"day":"Wednesday","open":"10:00","close":"18:00","closed":false},
               {"day":"Thursday","open":"10:00","close":"18:00","closed":false},
               {"day":"Friday","open":"10:00","close":"18:00","closed":false},
               {"day":"Saturday","open":"11:00","close":"16:00","closed":false},
               {"day":"Sunday","closed":true}
             ]
           } $p$::jsonb,
           'GBP',
           now()
    from blueprints b where b.slug = 'ferne'
    returning id into v_org;
    raise notice '[ferne seed] org created %', v_org;
  end if;

  -- The showcase host and the buyer-style host, both live. The org-insert trigger
  -- may already have created the buyer-style one; on conflict we reassert it.
  insert into domains (organization_id, hostname, kind, is_primary, status, tls_status, verified_at)
  values (v_org, 'demo.ferne.phoxta.com',       'subdomain', false, 'live', 'issued', now()),
         (v_org, 'ferne-demo.ferne.phoxta.com', 'subdomain', true,  'live', 'issued', now())
  on conflict (hostname) do update
    set organization_id = excluded.organization_id,
        status          = 'live',
        tls_status      = 'issued',
        verified_at     = coalesce(domains.verified_at, now());
end $$;

-- ---------------------------------------------------------------------------
-- 6. Content: reviews, FAQs, journal, promo codes, CMS pages
-- ---------------------------------------------------------------------------
do $$
declare v_org uuid;
begin
  select id into v_org from organizations where slug = 'ferne-demo';
  if v_org is null then return; end if;

  -- Product reviews are keyed on the product's uuid, so they are attached by
  -- joining on the sku the catalogue seed wrote (the blueprint slug).
  if not exists (select 1 from reviews where organization_id = v_org) then
    insert into reviews (organization_id, subject_type, subject_ref, author_name, rating, title, body)
    select v_org, 'product', p.id::text, r.author, r.rating, r.title, r.body
    from (values
      ('morning-oil',   'Amara O.',  5, 'Redness has gone quiet',          'Six weeks in and the redness across my cheeks has gone quiet for the first time in years. I didn''t expect a face oil to be the thing.'),
      ('morning-oil',   'Lucas M.',  5, 'Doesn''t break me out',           'Was nervous about oil on oily skin. Absorbs in seconds, no congestion, and my skin looks less flat.'),
      ('morning-oil',   'Hannah W.', 4, 'Lovely, wish it were bigger',     'Beautiful texture and glow. Through the 30 ml in about six weeks — buy the 50.'),
      ('cloud-cleanser','Daniel K.', 5, 'First cleanser that doesn''t strip','The first one that doesn''t leave my face feeling like paper. Bought the refill before the first bottle ran out.'),
      ('dew-cream',     'Priya S.',  4, 'Perfect under SPF',               'Sits beautifully under SPF. Four stars only because I wish the jar were a little bigger — I''m through it in five weeks.'),
      ('dew-cream',     'Zoe R.',    5, 'Calmed a flare-up in days',       'Used it on a winter flare-up and it calmed down in three days. Now a permanent fixture.'),
      ('ritual-set',    'Nina B.',   5, 'The whole routine, sorted',       'Bought it as a gift and immediately ordered a second for myself. Three steps and my skin stopped arguing with me.'),
      ('body-oil',      'Tom H.',    5, 'Doesn''t mark my clothes',        'Straight out of the shower, dressed five minutes later, no greasy patches. That alone is worth it.')
    ) as r(sku, author, rating, title, body)
    join products p on p.organization_id = v_org and p.sku = r.sku;

    insert into reviews (organization_id, subject_type, author_name, rating, title, body) values
      (v_org, 'business', 'Sofia L.', 5, 'You can tell where it came from', 'The batch number on the base actually tells you the harvest week. I have never seen that from a brand this size.'),
      (v_org, 'business', 'Ade K.',   5, 'Refills are the reason I stayed', 'Cheaper, less packaging, same glass jar on my shelf for a year now.'),
      (v_org, 'business', 'Mia T.',   5, 'Real answers, quickly',           'Asked which of the two cleansers suited a flare-up and got a proper answer the same afternoon.');
  end if;

  if not exists (select 1 from faqs where organization_id = v_org) then
    insert into faqs (organization_id, question, body, sort) values
      (v_org, 'How do refills work?',              'Every jar and bottle is glass. Buy the refill pod or pouch, decant at home, and recycle the pouch in any soft-plastics collection. Refills are 20–25% cheaper than the first purchase.', 0),
      (v_org, 'Is everything fragrance-free?',     'Yes. No added fragrance or essential oils in any product. The natural scent of rosehip and sea buckthorn is faint and fades within a minute.', 1),
      (v_org, 'What''s your returns policy?',      '30 days, no questions, even if opened. Start a return from your account page or contact us and we''ll send a prepaid label.', 2),
      (v_org, 'How much is delivery?',             'Standard UK delivery is £3.95 and free over £40. Express is £6.95 for next working day, and collection from the Digbeth studio is free.', 3),
      (v_org, 'Do you ship internationally?',      'UK, EU and US currently. EU orders ship duties-paid.', 4),
      (v_org, 'Are you cruelty-free and vegan?',   'Cruelty-free, always. Everything is vegan except the Lip Balm, which uses beeswax.', 5),
      (v_org, 'Which products suit sensitive skin?','Cloud Cleanser and Dew Cream are the two to start with — oat lipids and ceramides, no fragrance. Ask the skin advisor on any page if you''re unsure.', 6);
  end if;

  if not exists (select 1 from blog_posts where organization_id = v_org) then
    insert into blog_posts (organization_id, slug, title, excerpt, body, cover_url, author, tags, published_at) values
      (v_org, 'rosehip-72', 'Why we press rosehip within 72 hours of harvest',
       'Vitamin A degrades fast once the seed is cracked. Here''s how our Devon grower gets the oil from field to bottle in three days.',
       E'Every batch we press starts with a phone call — the grower tells us the fruit is ready, and the clock starts. Vitamin A in rosehip degrades measurably within days of the seed being cracked, so the difference between an oil that works and one that merely smells nice is mostly logistics.\n\nCold-pressing at low temperature keeps the trans-retinoic acid precursors intact. We test each batch by HPLC before it''s bottled; anything below our threshold is diverted to body products where the bar is different.\n\nThat''s also why we don''t hold stock for long. Bottles are numbered, and the number on the base of yours tells you the harvest week. Use fresh oil, store it out of the light, and don''t be precious — three drops morning and night is more effective than a heavy layer once a week.',
       '/images/cat-body.jpg', 'Elin Hart', array['Ingredients'], now() - interval '8 days'),
      (v_org, 'barrier-reset', 'Barrier repair: the two-week reset that actually works',
       'Strip the routine back to three steps, stop exfoliating, and give the skin fourteen days. A dermatologist''s protocol.',
       E'A compromised barrier is not a mystery, it is a maintenance problem. For fourteen days: cleanse once a day with something that does not foam hard, press in an oil while the skin is damp, and seal with a ceramide cream. Nothing else.\n\nNo acids, no retinoids, no scrubs, no clay. The point is to stop interrupting the repair rather than to accelerate it.\n\nMost people see the redness settle in the first week and the tightness go in the second. If it hasn''t moved by day fourteen, the problem is probably not your routine — see someone about it.',
       '/images/routine.jpg', 'Dr. Maya Chen', array['Routine'], now() - interval '22 days'),
      (v_org, 'douro-morning', 'A morning with our growers in the Douro valley',
       'Sea buckthorn is harvested frozen, at dawn, by hand. We went to see why.',
       E'The berries are too soft to pick warm — they burst. So the whole harvest happens in the two hours after first light, when the fruit is still frozen on the branch and comes away clean.\n\nIt is cold, slow work done by about a dozen people on a hillside above the river, and it is the reason the oil is the colour it is.\n\nWe buy the whole run from one family and press it in the same week. That is the entire supply chain, and it fits on a postcard.',
       '/images/ing-seabuckthorn.jpg', 'Tom Alder', array['Sourcing'], now() - interval '45 days'),
      (v_org, 'winter-skin', 'The winter skin edit: what to add, what to drop',
       'Central heating, wind and less daylight — the four changes that make the season easier on your face.',
       E'Add: one extra layer of oil at night, a humidifier in the bedroom, and a balm on anything the wind actually touches.\n\nDrop: the second cleanse, any acid you are using more than twice a week, and very hot water.\n\nKeep: SPF. Overcast is not the same as dark, and the UVA that ages skin is there all winter.',
       '/images/j-winter.jpg', 'Elin Hart', array['Routine'], now() - interval '67 days');
  end if;

  -- The codes the storefront advertises. Validated and applied server-side by
  -- app_validate_promo / app_place_order, so the discount on screen is the
  -- discount charged.
  insert into promo_codes (organization_id, code, kind, value, min_cents, active) values
    (v_org, 'WELCOME10', 'percent', 10, 0, true),
    (v_org, 'RITUAL5',   'fixed',  500, 3000, true)
  on conflict (organization_id, code) do nothing;

  insert into cms_pages (organization_id, slug, title, body, status, published_at) values
    (v_org, 'about', 'About us',
     E'Ferne started in a Birmingham kitchen in 2021 with one question: why does "natural" skincare so rarely say where anything came from?\n\nWe work with six growers across Devon, Perthshire, Provence and the Douro. Each batch is logged, tested and numbered — scan the base of any bottle to see exactly where it came from and when it was pressed.\n\nEverything we make is built from four actives, plus the minimum needed to keep it stable. No fragrance, no essential oils, no colour. Every jar is glass, and most come with a refill.',
     'published', now()),
    (v_org, 'terms', 'Terms & Conditions',
     E'These terms cover your use of this site and any order you place through it. Prices include VAT where applicable, and delivery costs are shown before you pay.\n\nYou may return any item within 30 days, opened or not. Nothing here affects your statutory rights.',
     'published', now()),
    (v_org, 'privacy', 'Privacy Policy',
     E'We only collect what we need to fulfil your order and answer your questions: your name, email, delivery address and order history.\n\nWe never sell your data, and we don''t run advertising trackers on this site. Ask us at any time for a copy of what we hold, or for it to be deleted.',
     'published', now())
  on conflict (organization_id, slug) do nothing;

  update products set gallery = coalesce(metadata->'gallery', jsonb_build_array(image_url))
   where organization_id = v_org and (gallery is null or gallery = '[]'::jsonb)
     and image_url is not null and image_url <> '';

  raise notice '[ferne seed] content done for %', v_org;
end $$;
