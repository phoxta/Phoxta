-- Phoxta platform — 0071 procedures, scorecards, invoice payments.
-- Second implementation wave of the 18 Aug 2026 audit:
--   1) agent_config.procedures — plain-English operating procedures (the
--      Decagon-AOP pattern): owner-authored rules injected into every agent
--      prompt as hard instructions.
--   2) app_blueprint_scorecards() — anonymized, platform-verified per-blueprint
--      activity aggregates for the public marketplace trust story.
--   3) invoices: payment link fields so "send invoice" can carry a Paystack link.

-- ── 1) procedures ───────────────────────────────────────────────────────────
alter table agent_config add column if not exists procedures text not null default '';

-- ── 2) verified blueprint scorecards ────────────────────────────────────────
-- Aggregates only (counts + totals across ALL tenants of a blueprint) — no
-- tenant is identifiable. Demo orgs are included deliberately: they are real
-- running storefronts on the platform.
create or replace function public.app_blueprint_scorecards()
returns table (
  blueprint_id uuid,
  businesses int,
  orders_90d int,
  gmv_90d_cents bigint,
  reservations_90d int,
  conversations_90d int,
  avg_qa_score numeric
)
language sql stable security definer set search_path = public as $$
  select
    g.blueprint_id,
    count(distinct g.id)::int as businesses,
    coalesce(sum(s.orders_90d), 0)::int as orders_90d,
    coalesce(sum(s.gmv), 0)::bigint as gmv_90d_cents,
    coalesce(sum(s.res_90d), 0)::int as reservations_90d,
    coalesce(sum(s.conv_90d), 0)::int as conversations_90d,
    round(avg(s.qa), 1) as avg_qa_score
  from organizations g
  left join lateral (
    select
      (select count(*) from orders o where o.organization_id = g.id and o.created_at > now() - interval '90 days') as orders_90d,
      (select coalesce(sum(o.total_cents), 0) from orders o where o.organization_id = g.id and o.status in ('paid','fulfilled') and o.created_at > now() - interval '90 days') as gmv,
      (select count(*) from reservations r where r.organization_id = g.id and r.created_at > now() - interval '90 days') as res_90d,
      (select count(*) from conversations c where c.organization_id = g.id and c.created_at > now() - interval '90 days') as conv_90d,
      (select avg(c.qa_score)::numeric from conversations c where c.organization_id = g.id and c.qa_score is not null) as qa
  ) s on true
  where g.blueprint_id is not null
  group by g.blueprint_id;
$$;
grant execute on function public.app_blueprint_scorecards() to anon, authenticated;

-- ── 3) invoice payment linkage ──────────────────────────────────────────────
alter table invoices add column if not exists payment_reference text;
alter table invoices add column if not exists paid_at timestamptz;
create unique index if not exists idx_invoices_payment_ref on invoices(payment_reference) where payment_reference is not null;
