-- Phoxta platform — 0046 activate the restaurant + furniture blueprints.
-- These two were buyable but not deployed: no Vercel storefront project and no
-- wildcard subdomain, so a purchase produced nothing resolvable. Their storefronts
-- are now wired to the backend (live catalogue + branding + orders) and deployed as
-- their own Vercel projects with wildcard hosts. This records the project ids +
-- subdomain bases (so domain-manager + the subdomain trigger work) and gives each a
-- starter catalogue (auto-seeded into every buyer's org by the 0024 trigger).

-- restaurant-orders → Vercel project + *.dine.phoxta.com
update blueprints
set vercel_project_id = 'prj_3eThKoOepfaPVbE8SFg3cYzoC3Vf',
    subdomain_base = 'dine.phoxta.com',
    preset = coalesce(preset, '{}'::jsonb) || jsonb_build_object('catalog', $cat$[
      {"slug":"seared-duck-breast","name":"Seared Duck Breast","price_cents":4200,"image_url":"https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop","description":"Cherry gastrique, roasted heritage beets, thyme jus and micro greens.","metadata":{"category":"Mains","tags":["GF"],"badge":"Signature","popular":true}},
      {"slug":"black-truffle-risotto","name":"Black Truffle Risotto","price_cents":3600,"image_url":"https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop","description":"Carnaroli rice slow-folded with aged parmesan and shaved winter truffle.","metadata":{"category":"Mains","tags":["V"]}},
      {"slug":"aged-beef-tenderloin","name":"Aged Beef Tenderloin","price_cents":5400,"image_url":"https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop","description":"Red-wine reduction, gratin dauphinois and charred asparagus.","metadata":{"category":"Mains","tags":["GF"],"popular":true}},
      {"slug":"herb-crusted-salmon","name":"Herb-Crusted Salmon","price_cents":3800,"image_url":"https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=400&fit=crop","description":"Fennel puree, lemon beurre blanc and a tangle of garden asparagus.","metadata":{"category":"Seafood","tags":["GF","DF"]}},
      {"slug":"lobster-bisque","name":"Lobster Bisque","price_cents":2800,"image_url":"https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&h=400&fit=crop","description":"Cognac cream, saffron threads, chive oil and a warm brioche crouton.","metadata":{"category":"Seafood","tags":["GF"]}},
      {"slug":"heirloom-burrata","name":"Heirloom Burrata","price_cents":2200,"image_url":"https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=600&h=400&fit=crop","description":"Vine tomatoes, basil oil, aged balsamic and toasted sourdough.","metadata":{"category":"Starters","tags":["V"]}},
      {"slug":"vanilla-creme-brulee","name":"Vanilla Creme Brulee","price_cents":1600,"image_url":"https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&h=400&fit=crop","description":"Madagascar vanilla custard, caramelised sugar and fresh berries.","metadata":{"category":"Desserts","tags":["V","GF"],"popular":true}},
      {"slug":"premier-cru-chablis","name":"Premier Cru Chablis","price_cents":2100,"image_url":"https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=600&h=400&fit=crop","description":"Crisp, mineral Chardonnay - a classic pairing for seafood.","metadata":{"category":"Cellar","tags":["Glass"],"badge":"Sommelier"}}
    ]$cat$::jsonb)
where slug = 'restaurant-orders';

-- gearo → Vercel project + *.gearo.phoxta.com
update blueprints
set vercel_project_id = 'prj_5AYvxy7EyCloJRAmwhcwJXKIKKZG',
    subdomain_base = 'gearo.phoxta.com',
    preset = coalesce(preset, '{}'::jsonb) || jsonb_build_object('catalog', $cat$[
      {"slug":"ergonomic-chair-pro","name":"Ergonomic Chair Pro","price_cents":7999,"image_url":"/images/shop/product-1.jpg","description":"A supportive ergonomic office chair with adjustable lumbar.","metadata":{"category":"Office Chairs","img":"/images/shop/product-1.jpg","imgHover":"/images/shop/product-1.1.jpg","colors":[{"name":"Light Blue","cls":"bg-light-blue"},{"name":"Blue","cls":"bg-light-blue-2"}]}},
      {"slug":"adjustable-laptop-stand","name":"Adjustable Laptop Stand","price_cents":7999,"image_url":"/images/shop/product-2.jpg","description":"An adjustable aluminium laptop stand for better posture.","metadata":{"category":"Tech Accessories","img":"/images/shop/product-2.jpg","imgHover":"/images/shop/product-2.1.jpg","oldPrice":98,"sale":"-25%","colors":[{"name":"Light Blue","cls":"bg-light-blue"},{"name":"Grey","cls":"bg-light-grey"}]}},
      {"slug":"minimal-laptop-stand","name":"Minimal Laptop Stand","price_cents":8999,"image_url":"/images/shop/product-3.jpg","description":"A minimal laptop stand in warm tones.","metadata":{"category":"Tech Accessories","img":"/images/shop/product-3.jpg","imgHover":"/images/shop/product-3.1.jpg","oldPrice":98,"sale":"-25%","colors":[{"name":"Light Orange","cls":"bg-light-orange"},{"name":"Grey","cls":"bg-light-grey"}]}},
      {"slug":"wireless-charging-dock","name":"Wireless Charging Dock","price_cents":4999,"image_url":"/images/shop/product-4.jpg","description":"A tidy wireless charging dock for desk and nightstand.","metadata":{"category":"Tech Accessories","img":"/images/shop/product-4.jpg","imgHover":"/images/shop/product-4.1.jpg","colors":[{"name":"Black","cls":"bg-dark"},{"name":"White","cls":"bg-white"}]}},
      {"slug":"storage-cabinet","name":"Storage Cabinet","price_cents":14900,"image_url":"/images/shop/product-5.jpg","description":"A warm-wood storage cabinet for a tidy workspace.","metadata":{"category":"Storage Solutions","img":"/images/shop/product-5.jpg","imgHover":"/images/shop/product-5.1.jpg","colors":[{"name":"Wood","cls":"bg-light-orange"}]}},
      {"slug":"desk-organizer-set","name":"Desk Organizer Set","price_cents":2999,"image_url":"/images/shop/product-6.jpg","description":"A modular desk organizer set to keep essentials in reach.","metadata":{"category":"Office Supplies","img":"/images/shop/product-6.jpg","imgHover":"/images/shop/product-6.1.jpg","oldPrice":39,"sale":"-23%","colors":[{"name":"Grey","cls":"bg-light-grey"},{"name":"Blue","cls":"bg-light-blue"}]}},
      {"slug":"standing-desk-frame","name":"Standing Desk Frame","price_cents":29900,"image_url":"/images/shop/product-7.jpg","description":"A motorised standing desk frame with memory presets.","metadata":{"category":"Office Furniture","img":"/images/shop/product-7.jpg","imgHover":"/images/shop/product-7.1.jpg","colors":[{"name":"Black","cls":"bg-dark"},{"name":"White","cls":"bg-white"}]}},
      {"slug":"task-lamp-led","name":"Task Lamp LED","price_cents":3999,"image_url":"/images/shop/product-8.jpg","description":"A dimmable LED task lamp with adjustable arm.","metadata":{"category":"Lighting","img":"/images/shop/product-8.jpg","imgHover":"/images/shop/product-8.1.jpg","colors":[{"name":"White","cls":"bg-white"},{"name":"Black","cls":"bg-dark"}]}}
    ]$cat$::jsonb)
where slug = 'gearo';
