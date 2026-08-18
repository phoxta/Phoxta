-- Phoxta platform — 0069 renewal alerts.
-- One SMS/email alert per billing period, sent ~7 days before
-- subscriptions.current_period_end by the billing-alerts edge function
-- (invoked daily by pg_cron). The timestamp records the last alert so a
-- period is never alerted twice; it naturally re-arms when the period rolls.
alter table subscriptions add column if not exists renewal_alert_sent_at timestamptz;
