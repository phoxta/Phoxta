-- Phoxta — 0086: give the travel demo real experiences.
--
-- Three of the four bookable items were faker output left over from the
-- template seed — "Deliver dynamic e-services", "Generate interactive markets",
-- "Productize holistic deliverables", one of them located in "Neverland". They
-- are what the storefront lists, what checkout sells and what the AI agent
-- recites when a visitor asks what is on offer, so the demo read as a corporate
-- lorem generator rather than a travel business.
--
-- Content only. image_url, price shape, currency and the
-- "<address> · <rating>★ (<n> reviews)" description format are all preserved,
-- so the layout, cards and photography render exactly as before.
--
-- Matched on the old names rather than ids so it is idempotent and safe to
-- re-run: once renamed, nothing matches and the statement is a no-op.

update products p
set name = v.name,
    description = v.description,
    price_cents = v.price_cents
from (values
  (
    'Deliver dynamic e-services',
    'Kyoto Backstreets Food Walk',
    'Gion District, Kyoto · 4.8★ (566 reviews)',
    24900
  ),
  (
    'Generate interactive markets',
    'Marrakech Souks & Spice Market Tour',
    'Jemaa el-Fnaa, Marrakech · 4.7★ (478 reviews)',
    20000
  ),
  (
    'Productize holistic deliverables',
    'Dolomites Sunrise Hike & Alpine Breakfast',
    'Cortina d''Ampezzo, Italy · 4.9★ (147 reviews)',
    28800
  )
) as v(old_name, name, description, price_cents)
where p.organization_id = (select id from organizations where slug = 'travel-demo')
  and p.name = v.old_name;
