-- 0133 — campaigns learn to carry a designed HTML body.
--
-- The email studio can build a real, branded email, but campaigns had only a
-- plain-text `body` column and campaign-run ESCAPES it into a generic Arial
-- wrapper — so the studio→Broadcasts bridge could hand an audience only the
-- words, never the layout. One nullable column closes that: when `html` is
-- present campaign-run sends it (with the same unsubscribe footer appended);
-- when absent, the synthesized wrapper behaves exactly as before, so every
-- existing campaign is untouched.
alter table public.campaigns add column if not exists html text;

comment on column public.campaigns.html is
  'Optional designed HTML body (email-studio bridge). Sent as-is by campaign-run with the unsubscribe footer appended; null means synthesize from `body` as always.';
