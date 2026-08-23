-- Phoxta — 0099: the platform and every storefront price in pounds.
--
-- Decision recorded, because the numbers do not change with the symbol: a
-- £2,500 blueprint is not a converted $2,500, it is a price rise of roughly a
-- quarter. That was chosen deliberately over converting at a rate, so nothing
-- here divides or multiplies — the stored minor units stay exactly as they are
-- and only the currency they are denominated in changes.
--
-- Every money column moves together. Leaving one table on USD is how you get an
-- invoice that disagrees with the order it was raised from, and a total that is
-- arithmetically correct and completely wrong.
--
-- organizations.currency defaulted to '' and the app fell back to "USD" in a
-- dozen places. The column now carries a real default, so the fallback stops
-- being where the answer actually comes from.

-- ── Phoxta's own pricing ───────────────────────────────────────────────────
alter table blueprints    alter column currency set default 'GBP';
alter table purchases     alter column currency set default 'GBP';
alter table subscriptions alter column currency set default 'GBP';

update blueprints    set currency = 'GBP' where currency <> 'GBP';
update purchases     set currency = 'GBP' where currency <> 'GBP';
update subscriptions set currency = 'GBP' where currency <> 'GBP';

-- ── What each business charges its own customers ───────────────────────────
alter table products               alter column currency set default 'GBP';
alter table orders                 alter column currency set default 'GBP';
alter table invoices               alter column currency set default 'GBP';
alter table customer_subscriptions alter column currency set default 'GBP';
alter table services               alter column currency set default 'GBP';
alter table reservations           alter column currency set default 'GBP';

update products               set currency = 'GBP' where currency <> 'GBP';
update orders                 set currency = 'GBP' where currency <> 'GBP';
update invoices               set currency = 'GBP' where currency <> 'GBP';
update customer_subscriptions set currency = 'GBP' where currency <> 'GBP';
update services               set currency = 'GBP' where currency <> 'GBP';
update reservations           set currency = 'GBP' where currency <> 'GBP';

-- ── The console's own currency, which drives every money surface in it ─────
alter table organizations alter column currency set default 'GBP';
update organizations set currency = 'GBP' where coalesce(nullif(currency, ''), 'GBP') <> 'GBP' or currency = '';

comment on column organizations.currency is
  'ISO currency for every money surface in this business''s console and storefront. '
  'Defaults to GBP; a business selling in another currency sets it here.';
