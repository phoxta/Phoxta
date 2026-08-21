-- Phoxta — 0093: the platform console can DO things, not just read them.
--
-- 0090 gave the platform reads. A console you can only read is a dashboard —
-- blueprint pricing and taglines still needed a migration each (three were
-- written this week just to fix stale copy), a tenant could not be suspended,
-- a subscription could not be comped, and leads from /invest were counted but
-- not workable.
--
-- Every write is admin-gated AND audited. These are cross-tenant powers — an
-- admin can change what a customer pays and reach into their console — so the
-- record of who did what is part of the feature, not an extra.

-- ── Audit ──────────────────────────────────────────────────────────────────
create table if not exists platform_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target text not null default '',
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_platform_audit_time on platform_audit(created_at desc);
alter table platform_audit enable row level security;
-- Admins read it; nobody writes it from a client. The RPCs below are the only writers.
drop policy if exists platform_audit_read on platform_audit;
create policy platform_audit_read on platform_audit for select
  using (public.app_is_platform_admin());

create or replace function public.app_platform_log(p_action text, p_target text, p_detail jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into platform_audit (actor_id, action, target, detail)
  values (auth.uid(), p_action, coalesce(p_target, ''), coalesce(p_detail, '{}'::jsonb));
$$;

-- ── Leads become workable ──────────────────────────────────────────────────
alter table platform_leads
  add column if not exists status text not null default 'new'
    check (status in ('new', 'contacted', 'qualified', 'won', 'lost'));
alter table platform_leads add column if not exists notes text not null default '';
alter table platform_leads add column if not exists updated_at timestamptz not null default now();

create or replace function public.app_platform_leads(p_limit int default 200)
returns table (
  id uuid, source text, name text, email text, phone text,
  message text, status text, notes text, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select l.id, l.source, l.name, l.email, l.phone, l.message, l.status, l.notes, l.created_at
  from platform_leads l
  where public.app_is_platform_admin()
  order by l.created_at desc
  limit greatest(1, least(p_limit, 500));
$$;
grant execute on function public.app_platform_leads(int) to authenticated;

create or replace function public.app_platform_lead_save(p_id uuid, p_status text, p_notes text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.app_is_platform_admin() then return jsonb_build_object('ok', false, 'error', 'Not permitted.'); end if;
  if p_status is not null and p_status not in ('new','contacted','qualified','won','lost') then
    return jsonb_build_object('ok', false, 'error', 'Unknown status.');
  end if;
  update platform_leads
  set status = coalesce(p_status, status),
      notes = coalesce(p_notes, notes),
      updated_at = now()
  where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'Lead not found.'); end if;
  perform public.app_platform_log('lead.save', p_id::text, jsonb_build_object('status', p_status));
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.app_platform_lead_save(uuid, text, text) to authenticated;

-- ── Blueprints: edit what you sell, from the UI ────────────────────────────
create or replace function public.app_platform_blueprints()
returns table (
  id uuid, slug text, name text, tagline text, vertical text,
  price_cents integer, currency text, status text, demo_url text
)
language sql stable security definer set search_path = public as $$
  select b.id, b.slug, b.name, b.tagline, b.vertical,
         b.price_cents, b.currency, b.status, b.demo_url
  from blueprints b
  where public.app_is_platform_admin()
  order by b.status, b.name;
$$;
grant execute on function public.app_platform_blueprints() to authenticated;

create or replace function public.app_platform_blueprint_save(
  p_id uuid, p_name text, p_tagline text, p_price_cents int, p_status text
)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.app_is_platform_admin() then return jsonb_build_object('ok', false, 'error', 'Not permitted.'); end if;
  if p_status is not null and p_status not in ('draft','live','archived') then
    return jsonb_build_object('ok', false, 'error', 'Status must be draft, live or archived.');
  end if;
  if p_price_cents is not null and p_price_cents < 0 then
    return jsonb_build_object('ok', false, 'error', 'Price cannot be negative.');
  end if;
  update blueprints
  set name        = coalesce(nullif(trim(p_name), ''), name),
      tagline     = coalesce(p_tagline, tagline),
      price_cents = coalesce(p_price_cents, price_cents),
      status      = coalesce(p_status, status)
  where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'Blueprint not found.'); end if;
  perform public.app_platform_log('blueprint.save', p_id::text,
    jsonb_build_object('status', p_status, 'price_cents', p_price_cents));
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.app_platform_blueprint_save(uuid, text, text, int, text) to authenticated;

-- ── Tenant actions ─────────────────────────────────────────────────────────
create or replace function public.app_platform_tenant_stage(p_org uuid, p_stage text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.app_is_platform_admin() then return jsonb_build_object('ok', false, 'error', 'Not permitted.'); end if;
  if p_stage not in ('active','trial','archived') then
    return jsonb_build_object('ok', false, 'error', 'Stage must be active, trial or archived.');
  end if;
  update organizations set stage = p_stage where id = p_org;
  if not found then return jsonb_build_object('ok', false, 'error', 'Business not found.'); end if;
  perform public.app_platform_log('tenant.stage', p_org::text, jsonb_build_object('stage', p_stage));
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.app_platform_tenant_stage(uuid, text) to authenticated;

create or replace function public.app_platform_subscription_set(p_org uuid, p_plan text, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.app_is_platform_admin() then return jsonb_build_object('ok', false, 'error', 'Not permitted.'); end if;
  if p_plan is not null and p_plan not in ('starter','growth','scale','enterprise') then
    return jsonb_build_object('ok', false, 'error', 'Unknown plan.');
  end if;
  if p_status is not null and p_status not in ('trialing','active','past_due','canceled') then
    return jsonb_build_object('ok', false, 'error', 'Unknown status.');
  end if;
  -- A tenant may have no subscription row yet (bought outright, or comped).
  insert into subscriptions (organization_id, plan, status)
  values (p_org, coalesce(p_plan, 'starter'), coalesce(p_status, 'active'))
  on conflict (organization_id) do update
    set plan = coalesce(p_plan, subscriptions.plan),
        status = coalesce(p_status, subscriptions.status);
  perform public.app_platform_log('tenant.subscription', p_org::text,
    jsonb_build_object('plan', p_plan, 'status', p_status));
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.app_platform_subscription_set(uuid, text, text) to authenticated;

-- Support access, deliberately NOT impersonation.
--
-- The console reads through tenant RLS, so an admin cannot open a customer's
-- console without a membership row — clicking "Open" on a tenant they do not
-- belong to shows an empty console. Rather than widening RLS for admins (which
-- would make every tenant permanently readable), this grants a REAL, revocable
-- membership and writes it to the audit log. The customer's team can see the
-- member; the platform can see who granted it and when.
create or replace function public.app_platform_support_access(p_org uuid, p_grant boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.app_is_platform_admin() then return jsonb_build_object('ok', false, 'error', 'Not permitted.'); end if;
  if p_grant then
    insert into organization_memberships (organization_id, user_id, role)
    values (p_org, auth.uid(), 'admin')
    on conflict do nothing;
  else
    delete from organization_memberships
    where organization_id = p_org and user_id = auth.uid();
  end if;
  perform public.app_platform_log(
    case when p_grant then 'support.grant' else 'support.revoke' end, p_org::text, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.app_platform_support_access(uuid, boolean) to authenticated;

-- ── Margin: what a tenant pays us vs what they cost us ─────────────────────
-- Revenue is purchases + subscription value; cost is the AI spend the meter
-- already records. It is a proxy, not accounting — infrastructure is not
-- attributed per tenant — so the UI labels it AI margin rather than profit.
create or replace function public.app_platform_margin(p_days int default 30)
returns table (
  organization_id uuid, name text,
  revenue_cents bigint, ai_cost_cents bigint, tokens bigint
)
language sql stable security definer set search_path = public as $$
  select o.id, o.name,
         (select coalesce(sum(p.amount_cents), 0) from purchases p
           where p.organization_id = o.id and p.status = 'paid'
             and p.created_at > now() - make_interval(days => greatest(1, least(p_days, 365))))::bigint,
         (select coalesce(sum(u.cost_cents), 0) from ai_usage u
           where u.organization_id = o.id
             and u.created_at > now() - make_interval(days => greatest(1, least(p_days, 365))))::bigint,
         (select coalesce(sum(coalesce(u.input_tokens,0) + coalesce(u.output_tokens,0)), 0) from ai_usage u
           where u.organization_id = o.id
             and u.created_at > now() - make_interval(days => greatest(1, least(p_days, 365))))::bigint
  from organizations o
  where public.app_is_platform_admin()
  order by 3 desc;
$$;
grant execute on function public.app_platform_margin(int) to authenticated;

create or replace function public.app_platform_audit(p_limit int default 100)
returns table (id uuid, actor_email text, action text, target text, detail jsonb, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.id, u.email::text, a.action, a.target, a.detail, a.created_at
  from platform_audit a
  left join auth.users u on u.id = a.actor_id
  where public.app_is_platform_admin()
  order by a.created_at desc
  limit greatest(1, least(p_limit, 500));
$$;
grant execute on function public.app_platform_audit(int) to authenticated;

revoke all on function public.app_platform_leads(int) from anon;
revoke all on function public.app_platform_lead_save(uuid, text, text) from anon;
revoke all on function public.app_platform_blueprints() from anon;
revoke all on function public.app_platform_blueprint_save(uuid, text, text, int, text) from anon;
revoke all on function public.app_platform_tenant_stage(uuid, text) from anon;
revoke all on function public.app_platform_subscription_set(uuid, text, text) from anon;
revoke all on function public.app_platform_support_access(uuid, boolean) from anon;
revoke all on function public.app_platform_margin(int) from anon;
revoke all on function public.app_platform_audit(int) from anon;
