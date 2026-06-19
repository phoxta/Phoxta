-- Phoxta platform — 0034 paid domain purchases (Stripe).
-- A bought domain is created as status 'pending' at checkout, then finalized to
-- 'live' by the Stripe webhook after payment (which triggers the Vercel
-- registration). Track the amount charged and the Stripe session for idempotency.
alter table domains add column if not exists purchase_cents integer;
alter table domains add column if not exists stripe_session text;
