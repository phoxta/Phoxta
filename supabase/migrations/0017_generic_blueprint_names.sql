-- Phoxta platform — 0017 generic marketplace names (no brand)
-- Marketplace blueprints are business types the buyer brands themselves, so the
-- listing name should describe the category, not carry a sample brand.
update blueprints set name = 'Car Marketplace'    where slug = 'carento';
update blueprints set name = 'Furniture Store'     where slug = 'gearo';
update blueprints set name = 'Travel & Stays'      where slug = 'travel';
update blueprints set name = 'Restaurant + Orders' where slug = 'restaurant-orders';
update blueprints set name = 'Fashion Store'       where slug = 'niche-apparel';
