-- Phoxta platform — 0012 add Gearo blueprint + make the built businesses previewable
-- Adds the Gearo furniture storefront to the marketplace catalogue and sets a
-- demo/preview URL + cover image on all three built businesses so the marketplace
-- "Preview" button appears. Preview URLs default to each app's local dev/preview
-- port; replace with the deployed URL once each business is hosted.

insert into blueprints (slug, name, tagline, description, vertical, tier, price_cents, currency, cover_url, demo_url, verified, ai_included, status, app_path, metrics)
values (
  'gearo',
  'Gearo Furniture Store',
  'A modern furniture & workspace eCommerce store with cart, checkout and an AI shopping assistant.',
  'A full furniture eCommerce storefront — hero, categories, product grids, product detail, cart, checkout, account and blog — built in React and ready to brand.',
  'Furniture / eCommerce',
  'standard',
  140000,
  'USD',
  'https://picsum.photos/seed/gearo-cover/800/600',
  'http://localhost:4174',
  true,
  true,
  'live',
  'businesses/gearo',
  '{"built": true, "app": "businesses/gearo"}'::jsonb
)
on conflict (slug) do update set
  tagline = excluded.tagline,
  description = excluded.description,
  cover_url = excluded.cover_url,
  demo_url = excluded.demo_url,
  app_path = excluded.app_path,
  metrics = excluded.metrics,
  status = 'live';

-- Preview URLs + covers for the other two built businesses.
update blueprints set demo_url = 'http://localhost:4173', cover_url = coalesce(cover_url, 'https://picsum.photos/seed/carento-cover/800/600')
  where slug = 'carento';
update blueprints set demo_url = 'http://localhost:4175', cover_url = coalesce(cover_url, 'https://picsum.photos/seed/travel-cover/800/600')
  where slug = 'travel';
