-- Phoxta platform — 0064 fix marketplace demo links. The blueprints' demo_url
-- were dev preview ports (http://localhost:417x); point them at the live,
-- deployed demo storefronts (each resolves via its wildcard subdomain).
update blueprints set demo_url = 'https://carento-demo.carento.phoxta.com'  where slug = 'carento';
update blueprints set demo_url = 'https://gearo-demo.gearo.phoxta.com'      where slug = 'gearo';
update blueprints set demo_url = 'https://aurelia-demo.aurelia.phoxta.com'  where slug = 'niche-apparel';
update blueprints set demo_url = 'https://saveur-demo.dine.phoxta.com'      where slug = 'restaurant-orders';
update blueprints set demo_url = 'https://travel-demo.travel.phoxta.com'    where slug = 'travel';
