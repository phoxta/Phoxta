-- Phoxta platform — 0052 demo: sample modifiers on two Saveur dishes so the
-- customization flow is visible end-to-end (other restaurant buyers add their own in
-- the console). Prices in CENTS. Scoped to the saveur-demo tenant only.

update products set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('modifiers', $j$[
  {"name":"Cooking preference","required":true,"options":[{"label":"Rare","price":0},{"label":"Medium-rare","price":0},{"label":"Medium","price":0},{"label":"Well done","price":0}]},
  {"name":"Add-ons","required":false,"options":[{"label":"Truffle shavings","price":600},{"label":"Extra red-wine jus","price":200}]}
]$j$::jsonb)
where sku = 'aged-beef-tenderloin'
  and organization_id in (select id from organizations where slug = 'saveur-demo');

update products set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('modifiers', $j$[
  {"name":"Serving","required":true,"options":[{"label":"By the glass","price":0},{"label":"Full bottle","price":6000}]}
]$j$::jsonb)
where sku = 'premier-cru-chablis'
  and organization_id in (select id from organizations where slug = 'saveur-demo');
