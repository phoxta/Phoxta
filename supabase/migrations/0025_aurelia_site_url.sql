-- Phoxta platform — 0025 point the Aurelia business at its live storefront
-- The niche-apparel storefront is deployed on Vercel (multi-tenant by host, baked
-- to this org for the default URL). Set site_url so the operating console / business
-- detail "View live" links to the real store.
update organizations
set site_url = 'https://niche-apparel.vercel.app'
where slug = 'aurelia-demo';
