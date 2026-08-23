-- Phoxta — 0100: Stripe becomes the billing provider.
--
-- Adds the Stripe identifiers alongside the Paystack ones rather than replacing
-- them. The old columns are how you reconcile a refund, a chargeback or a
-- support question about a payment taken last month; dropping them the day you
-- switch provider throws away the record of every charge made before today.
-- They stop being written, and a later migration can retire them once nothing
-- outstanding refers to them.

alter table subscriptions add column if not exists stripe_customer_id text;
alter table subscriptions add column if not exists stripe_subscription_id text;
alter table subscriptions add column if not exists stripe_price_id text;

-- One Stripe subscription per business, so a duplicate webhook delivery cannot
-- leave two live subscriptions pointing at the same org.
create unique index if not exists idx_subscriptions_stripe_sub
  on subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table purchases add column if not exists stripe_session_id text;
alter table purchases add column if not exists stripe_payment_intent text;

create unique index if not exists idx_purchases_stripe_session
  on purchases(stripe_session_id)
  where stripe_session_id is not null;

comment on column subscriptions.paystack_subscription_code is
  'Historic. Paystack was retired in favour of Stripe; kept so payments taken '
  'before the switch can still be reconciled. New rows use stripe_subscription_id.';
