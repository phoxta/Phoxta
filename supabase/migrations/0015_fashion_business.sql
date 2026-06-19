-- Phoxta platform — 0015 wire the built fashion business (Aurelia)
-- The `niche-apparel` blueprint was seeded in 0002; the storefront app is now
-- built (businesses/niche-apparel) in the Phoxta design system. Tag it as built +
-- previewable so it shows in the marketplace with a working preview.
update blueprints set
  name = 'Aurelia Fashion Store',
  tagline = 'A modern fashion store with product archive, online ordering, cart/checkout and an AI stylist.',
  description = 'A complete fashion eCommerce storefront — home, shop/product archive with filtering, product detail with sizes, bag/checkout and an AI stylist powered by the Phoxta agent. Built in React in the Phoxta design system and ready to brand.',
  app_path = 'businesses/niche-apparel',
  demo_url = 'http://localhost:4177',
  cover_url = coalesce(cover_url, 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=600&fit=crop'),
  metrics = '{"built": true, "app": "businesses/niche-apparel"}'::jsonb,
  verified = true,
  status = 'live'
where slug = 'niche-apparel';
