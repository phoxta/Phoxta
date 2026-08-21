-- Phoxta — 0089: two blueprint taglines describe products that changed.
--
-- Surfaced by the new list_blueprints tool, which is the point of reading facts
-- live: the moment the agent stopped reciting old copy, the remaining stale copy
-- became visible instead of hidden behind it.
--
--   travel            — "stays, flights and experiences" — the storefront was
--                       narrowed to experiences only; there are no stay, flight
--                       or car routes left in it.
--   restaurant-orders — "reservations" — Saveur is a delivery and collection
--                       kitchen with no dining room (see 0084/0085, which stop
--                       the agent offering a table).
--
-- A prospect reading either would buy expecting a feature the blueprint does
-- not ship.

update blueprints
set tagline = 'A guide-led experiences business: browse, book and manage unique things to do, with an AI trip assistant.'
where slug = 'travel';

update blueprints
set tagline = 'A digital-first kitchen: online ordering for delivery and collection, order tracking, catering requests and an AI concierge.'
where slug = 'restaurant-orders';
