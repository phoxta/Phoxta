-- Phoxta platform — 0014 wire the built Restaurant + Orders business
-- The `restaurant-orders` blueprint was seeded in 0002; now that the storefront
-- app is built (businesses/restaurant-orders), tag it with its app path, a
-- preview URL and a cover so it shows as built + previewable in the marketplace.
update blueprints set
  name = 'Saveur Restaurant + Orders',
  tagline = 'A fine-dining restaurant with online ordering, reservations, order tracking and an AI concierge.',
  description = 'A complete restaurant storefront — menu with online ordering, table reservations, checkout (pickup/delivery), live order tracking, an admin service dashboard and an AI concierge powered by the Phoxta agent. Built in React and ready to brand.',
  app_path = 'businesses/restaurant-orders',
  demo_url = 'http://localhost:4176',
  cover_url = coalesce(cover_url, 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop'),
  metrics = '{"built": true, "app": "businesses/restaurant-orders"}'::jsonb,
  verified = true,
  status = 'live'
where slug = 'restaurant-orders';
