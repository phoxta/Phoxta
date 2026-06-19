-- Phoxta platform — 0018 wire the built cleaning-services business (SparkleClean)
-- New storefront app (businesses/sparkleclean), ported faithfully into the same
-- Vite + React stack as the other businesses. List it as a built, previewable,
-- generically-named blueprint so a buyer can brand it as their own.
insert into blueprints
  (slug, name, tagline, description, vertical, tier, price_cents, currency, cover_url, demo_url, verified, ai_included, status, app_path, metrics)
values
  ('sparkleclean', 'Cleaning Services',
   'A professional cleaning-services site with instant quotes, online booking and an AI booking assistant.',
   'A complete cleaning-services storefront — home, services & pricing, instant quote, an online booking flow, a B2B/commercial page and contact — built in React and ready to brand, with an AI assistant (SparkleBot) powered by the Phoxta agent across chat, phone and SMS.',
   'Services', 'standard', 150000, 'USD',
   'https://images.pexels.com/photos/4107120/pexels-photo-4107120.jpeg?auto=compress&cs=tinysrgb&w=800',
   'http://localhost:4178',
   true, true, 'live', 'businesses/sparkleclean',
   '{"built": true, "app": "businesses/sparkleclean"}'::jsonb)
on conflict (slug) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  description = excluded.description,
  vertical = excluded.vertical,
  tier = excluded.tier,
  price_cents = excluded.price_cents,
  cover_url = excluded.cover_url,
  demo_url = excluded.demo_url,
  app_path = excluded.app_path,
  metrics = excluded.metrics,
  verified = true,
  status = 'live';
