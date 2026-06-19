-- Phoxta platform — 0016 keep only built businesses in the marketplace + thumbnails
-- Remove the placeholder (non-built) catalogue blueprints, leaving the five
-- actually-built storefronts, and give each a representative cover thumbnail.

delete from blueprints
where slug not in ('carento', 'gearo', 'travel', 'restaurant-orders', 'niche-apparel');

update blueprints set cover_url = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop&q=80' where slug = 'carento';
update blueprints set cover_url = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop&q=80' where slug = 'gearo';
update blueprints set cover_url = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop&q=80' where slug = 'travel';
update blueprints set cover_url = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&q=80' where slug = 'restaurant-orders';
update blueprints set cover_url = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop&q=80' where slug = 'niche-apparel';
