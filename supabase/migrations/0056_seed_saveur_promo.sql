-- Phoxta — 0056 demo promo for saveur-demo (WELCOME10 = 10% off).
insert into promo_codes (organization_id, code, kind, value, min_cents, active)
select id, 'WELCOME10', 'percent', 10, 0, true from organizations where slug = 'saveur-demo'
on conflict (organization_id, code) do nothing;
