-- Phoxta platform — 0013 ensure the built businesses are in the marketplace
-- Carento and Travel were appended to the 0002 seed after it had already been
-- applied (and 0002 uses `on conflict do nothing`), so they never landed in the
-- live catalogue. Upsert them here (idempotent) with preview URLs + covers, so
-- all three built storefronts appear in the marketplace and are previewable.

insert into blueprints (slug, name, tagline, description, vertical, tier, price_cents, currency, cover_url, demo_url, verified, ai_included, status, app_path, metrics)
values
  ('carento', 'Carento Car Marketplace',
   'A full car buying & selling marketplace with listings, financing tools and an AI assistant.',
   'A complete automotive marketplace storefront — listings, dealer pages, car detail, financing calculator and an AI assistant — built in React and ready to brand.',
   'Automotive', 'premium', 390000, 'USD',
   'https://picsum.photos/seed/carento-cover/800/600', 'http://localhost:4173',
   true, true, 'live', 'businesses/carento', '{"built": true, "app": "businesses/carento"}'::jsonb),
  ('travel', 'Soar Travel & Stays',
   'A travel booking site for stays, flights and experiences, with an AI trip planner.',
   'A modern travel & stays booking storefront — hero search, listings, stay detail with booking, checkout and account — built in React (Tailwind) and ready to brand.',
   'Travel', 'premium', 360000, 'USD',
   'https://picsum.photos/seed/travel-cover/800/600', 'http://localhost:4175',
   true, true, 'live', 'businesses/travel', '{"built": true, "app": "businesses/travel"}'::jsonb)
on conflict (slug) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  description = excluded.description,
  vertical = excluded.vertical,
  cover_url = excluded.cover_url,
  demo_url = excluded.demo_url,
  app_path = excluded.app_path,
  metrics = excluded.metrics,
  status = 'live';
