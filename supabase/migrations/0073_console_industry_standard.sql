-- Phoxta platform — 0073 console industry-standard upgrade (18 Aug 2026 audit).
-- Groundwork for: standalone omnichannel Inbox (unread/sentiment/test/CSAT),
-- refunds + cancel-with-restock, pending-hold expiry, per-org invoice numbers,
-- real campaign delivery with opt-outs, saved segments, windowed KPIs,
-- org currency, no-show bookings, shipping capture, promo end-of-day expiry.

-- ── A) organizations.currency (threaded through every money surface) ────────
alter table organizations add column if not exists currency text not null default '';
update organizations o set currency = coalesce(
  (select p.currency from products p where p.organization_id = o.id limit 1), 'USD')
where o.currency = '';

-- ── B) Inbox: unread, sentiment, CSAT provenance, sandbox flag ──────────────
alter table conversations add column if not exists unread boolean not null default false;
alter table conversations add column if not exists sentiment text not null default '';
alter table conversations add column if not exists csat_source text not null default '';
alter table conversations add column if not exists is_test boolean not null default false;
create index if not exists idx_conversations_unread on conversations(organization_id) where unread;

create or replace function public.app_msg_inbound_touch() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'customer' then
    update conversations set unread = true, last_message_at = now() where id = new.conversation_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_msg_inbound_touch on conversation_messages;
create trigger trg_msg_inbound_touch after insert on conversation_messages
  for each row execute function public.app_msg_inbound_touch();

-- ── C) bookings: record outcomes ────────────────────────────────────────────
alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in ('pending','confirmed','completed','cancelled','no_show'));

-- ── D) orders: shipping, origin, refunds, tracking ──────────────────────────
alter table orders add column if not exists shipping jsonb not null default '{}'::jsonb;
alter table orders add column if not exists source text not null default '';
alter table orders add column if not exists refunded_cents integer not null default 0;
alter table orders add column if not exists tracking text not null default '';
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('pending','paid','fulfilled','cancelled','refunded','partially_refunded'));

-- ── E) app_place_order v3: + shipping capture, source stamp, promo EOD ──────
drop function if exists public.app_place_order(uuid, text, text, jsonb, text, text);
create or replace function public.app_place_order(
  p_org uuid, p_customer_name text, p_customer_email text, p_items jsonb,
  p_notes text default '', p_promo text default '', p_shipping jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_order uuid; v_item jsonb; v_prod products%rowtype; v_variant product_variants%rowtype;
  v_qty int; v_unit int; v_sel jsonb; v_size text; v_color text; v_name text; v_total int := 0;
  v_pc promo_codes%rowtype; v_disc int := 0; v_hit int;
begin
  if not exists (select 1 from organizations where id = p_org) then raise exception 'Unknown business'; end if;
  insert into orders (organization_id, customer_name, customer_email, status, total_cents, notes, shipping, source)
  values (p_org, coalesce(p_customer_name, ''), coalesce(p_customer_email, ''), 'pending', 0,
          coalesce(p_notes, ''), coalesce(p_shipping, '{}'::jsonb), 'storefront')
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_qty := greatest(1, coalesce((v_item->>'quantity')::int, 1));
    v_size := nullif(v_item->>'size', '');
    v_color := nullif(v_item->>'color', '');
    v_variant := null;
    select * into v_prod from products where id = nullif(v_item->>'product_id', '')::uuid and organization_id = p_org and status = 'active';
    if found then
      if v_size is not null or v_color is not null then
        select * into v_variant from product_variants
          where product_id = v_prod.id
            and (v_size is null or size = v_size)
            and (v_color is null or color = v_color)
          order by size, color limit 1;
      end if;

      if v_variant.id is not null then
        update product_variants set stock = stock - v_qty
         where id = v_variant.id and stock >= v_qty;
        get diagnostics v_hit = row_count;
        if v_hit = 0 then
          raise exception 'Out of stock: % (%)', v_prod.name, concat_ws(' / ', v_size, v_color);
        end if;
        update products set stock = greatest(0, stock - v_qty) where id = v_prod.id;
      elsif v_prod.stock is not null then
        update products set stock = stock - v_qty
         where id = v_prod.id and stock >= v_qty;
        get diagnostics v_hit = row_count;
        if v_hit = 0 then
          raise exception 'Out of stock: %', v_prod.name;
        end if;
      end if;

      v_unit := coalesce(v_variant.price_cents, v_prod.price_cents);
      v_sel := coalesce(v_item->'options', '[]'::jsonb);
      if jsonb_typeof(v_sel) = 'array' and jsonb_array_length(v_sel) > 0 then
        select v_unit + coalesce(sum((opt->>'price')::int), 0) into v_unit
        from jsonb_array_elements(v_sel) sel
        cross join lateral jsonb_array_elements(coalesce(v_prod.metadata->'modifiers', '[]'::jsonb)) grp
        cross join lateral jsonb_array_elements(coalesce(grp->'options', '[]'::jsonb)) opt
        where grp->>'name' = sel->>'group' and opt->>'label' = sel->>'label';
      end if;

      v_name := v_prod.name || case
        when v_size is not null or v_color is not null then ' — ' || concat_ws(' / ', v_size, v_color)
        else '' end;
      insert into order_items (organization_id, order_id, product_id, name, quantity, unit_price_cents, notes, metadata)
      values (p_org, v_order, v_prod.id, v_name, v_qty, v_unit, coalesce(v_item->>'notes', ''),
              jsonb_build_object('options', v_sel, 'size', coalesce(v_size, ''), 'color', coalesce(v_color, '')));
      v_total := v_total + v_qty * v_unit;
    end if;
  end loop;

  if coalesce(trim(p_promo), '') <> '' then
    select * into v_pc from promo_codes
      where organization_id = p_org and lower(code) = lower(trim(p_promo)) and active = true
        and (expires_at is null or expires_at::date >= current_date) and min_cents <= v_total limit 1;
    if found then
      if v_pc.kind = 'percent' then v_disc := (v_total * least(100, greatest(0, v_pc.value))) / 100;
      else v_disc := least(v_total, greatest(0, v_pc.value)); end if;
    end if;
  end if;

  update orders set total_cents = greatest(0, v_total - v_disc), discount_cents = v_disc,
    promo_code = case when v_disc > 0 then trim(p_promo) else '' end
  where id = v_order;
  return v_order;
end; $$;
grant execute on function public.app_place_order(uuid, text, text, jsonb, text, text, jsonb) to anon, authenticated;

-- app_validate_promo: expiry becomes end-of-day inclusive to match the UI label.
create or replace function public.app_validate_promo(p_org uuid, p_code text, p_subtotal_cents int)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_pc promo_codes%rowtype; v_disc int := 0;
begin
  select * into v_pc from promo_codes
    where organization_id = p_org and lower(code) = lower(trim(coalesce(p_code, ''))) and active = true
      and (expires_at is null or expires_at::date >= current_date) limit 1;
  if not found then return jsonb_build_object('valid', false, 'reason', 'Unknown or expired code'); end if;
  if v_pc.min_cents > coalesce(p_subtotal_cents, 0) then
    return jsonb_build_object('valid', false, 'reason', 'Order too small for this code');
  end if;
  if v_pc.kind = 'percent' then v_disc := (coalesce(p_subtotal_cents,0) * least(100, greatest(0, v_pc.value))) / 100;
  else v_disc := least(coalesce(p_subtotal_cents,0), greatest(0, v_pc.value)); end if;
  return jsonb_build_object('valid', true, 'kind', v_pc.kind, 'value', v_pc.value, 'discount_cents', v_disc, 'code', v_pc.code);
end $$;
grant execute on function public.app_validate_promo(uuid, text, int) to anon, authenticated;

-- ── F) cancel order with restock (admin core + member wrapper) ──────────────
create or replace function public.app_cancel_order_admin(p_order uuid, p_restock boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare v_ord orders%rowtype; v_it record;
begin
  select * into v_ord from orders where id = p_order;
  if not found then return; end if;
  if v_ord.status in ('cancelled','refunded') then return; end if;
  if p_restock then
    for v_it in select oi.product_id, oi.quantity, oi.metadata from order_items oi where oi.order_id = p_order loop
      if v_it.product_id is not null then
        update products set stock = stock + v_it.quantity where id = v_it.product_id and stock is not null;
        if coalesce(v_it.metadata->>'size','') <> '' then
          update product_variants set stock = stock + v_it.quantity
           where id = (select id from product_variants
                        where product_id = v_it.product_id
                          and size = v_it.metadata->>'size'
                          and (coalesce(v_it.metadata->>'color','') = '' or color = v_it.metadata->>'color')
                        order by size, color limit 1);
        end if;
      end if;
    end loop;
  end if;
  update orders set status = 'cancelled' where id = p_order;
end $$;
revoke all on function public.app_cancel_order_admin(uuid, boolean) from public, anon, authenticated;
grant execute on function public.app_cancel_order_admin(uuid, boolean) to service_role;

create or replace function public.app_cancel_order(p_order uuid, p_restock boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select organization_id into v_org from orders where id = p_order;
  if v_org is null or not public.app_is_org_member(v_org) then raise exception 'Not allowed'; end if;
  perform public.app_cancel_order_admin(p_order, p_restock);
end $$;
revoke all on function public.app_cancel_order(uuid, boolean) from public, anon;
grant execute on function public.app_cancel_order(uuid, boolean) to authenticated, service_role;

-- ── G) pending-hold expiry (abandoned checkouts stop stranding inventory) ───
create or replace function public.app_expire_pending() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_res int := 0; v_ord int := 0; v_r record;
begin
  update reservations set status = 'cancelled',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('expired', true)
  where status = 'pending' and created_at < now() - interval '24 hours'
    and coalesce(metadata->>'paid', '') = '';
  get diagnostics v_res = row_count;
  for v_r in select id from orders
    where status = 'pending' and source = 'storefront'
      and created_at < now() - interval '24 hours' and payment_reference is null loop
    perform public.app_cancel_order_admin(v_r.id, true);
    v_ord := v_ord + 1;
  end loop;
  return jsonb_build_object('reservations_expired', v_res, 'orders_expired', v_ord);
end $$;
revoke all on function public.app_expire_pending() from public, anon, authenticated;
grant execute on function public.app_expire_pending() to service_role;

-- ── H) per-org invoice numbering ────────────────────────────────────────────
create table if not exists invoice_counters (
  organization_id uuid primary key references organizations(id) on delete cascade,
  n integer not null default 0
);
alter table invoice_counters enable row level security; -- no policies: definer-fn only
insert into invoice_counters(organization_id, n)
  select organization_id, count(*) from invoices group by organization_id
on conflict (organization_id) do nothing;

create or replace function public.app_next_invoice_number(p_org uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if not public.app_is_org_member(p_org) then raise exception 'Not allowed'; end if;
  insert into invoice_counters(organization_id, n) values (p_org, 1)
    on conflict (organization_id) do update set n = invoice_counters.n + 1
    returning n into v;
  return 'INV-' || lpad(v::text, 4, '0');
end $$;
revoke all on function public.app_next_invoice_number(uuid) from public, anon;
grant execute on function public.app_next_invoice_number(uuid) to authenticated, service_role;

-- ── I) CRM: consent + provenance ────────────────────────────────────────────
alter table crm_contacts add column if not exists email_opt_out boolean not null default false;
alter table crm_contacts add column if not exists sms_opt_out boolean not null default false;
alter table crm_contacts add column if not exists source text not null default '';

-- ── J) real campaign delivery ───────────────────────────────────────────────
alter table campaigns add column if not exists sent_count integer not null default 0;
alter table campaigns add column if not exists failed_count integer not null default 0;
alter table campaigns drop constraint if exists campaigns_status_check;
alter table campaigns add constraint campaigns_status_check
  check (status in ('draft','scheduled','sending','sent'));

create table if not exists campaign_sends (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  contact_id uuid references crm_contacts(id) on delete set null,
  channel text not null default 'email',
  address text not null default '',
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  error text not null default '',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists idx_campaign_sends_pending on campaign_sends(status) where status = 'pending';
create index if not exists idx_campaign_sends_campaign on campaign_sends(campaign_id);
alter table campaign_sends enable row level security;
create policy campaign_sends_all on campaign_sends for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ── K) saved audience segments ──────────────────────────────────────────────
create table if not exists segments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null default '',
  criteria text not null default '',
  contact_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table segments enable row level security;
create policy segments_all on segments for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ── L) windowed KPIs + needs-attention counts ───────────────────────────────
create or replace function public.app_org_ops_window(p_org uuid, p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.app_is_org_member(p_org) then raise exception 'Not allowed'; end if;
  select jsonb_build_object(
    'currency', (select currency from organizations where id = p_org),
    'revenue', (select coalesce(sum(total_cents - refunded_cents),0) from orders
                 where organization_id = p_org and status in ('paid','fulfilled','partially_refunded')
                   and created_at >= now() - make_interval(days => p_days)),
    'revenue_prev', (select coalesce(sum(total_cents - refunded_cents),0) from orders
                 where organization_id = p_org and status in ('paid','fulfilled','partially_refunded')
                   and created_at >= now() - make_interval(days => 2*p_days)
                   and created_at < now() - make_interval(days => p_days)),
    'orders', (select count(*) from orders where organization_id = p_org
                 and created_at >= now() - make_interval(days => p_days)),
    'orders_prev', (select count(*) from orders where organization_id = p_org
                 and created_at >= now() - make_interval(days => 2*p_days)
                 and created_at < now() - make_interval(days => p_days)),
    'unfulfilled', (select count(*) from orders where organization_id = p_org
                 and status in ('paid','partially_refunded') and fulfillment_status = 'unfulfilled'),
    'unread', (select count(*) from conversations where organization_id = p_org and unread and not is_test),
    'escalated', (select count(*) from conversations where organization_id = p_org and status = 'escalated' and not is_test),
    'approvals', (select count(*) from agent_actions where organization_id = p_org and status = 'pending'),
    'low_stock', (select count(*) from products where organization_id = p_org and status = 'active'
                 and stock is not null and stock <= 3),
    'arrivals_today', (select count(*) from reservations where organization_id = p_org
                 and status in ('pending','confirmed') and start_date = current_date),
    'departures_today', (select count(*) from reservations where organization_id = p_org
                 and status = 'confirmed' and end_date = current_date),
    'bookings_today', (select count(*) from bookings where organization_id = p_org
                 and status in ('pending','confirmed') and start_at::date = current_date),
    'overdue_invoices', (select count(*) from invoices where organization_id = p_org
                 and status = 'sent' and due_date is not null and due_date < current_date),
    'reservations_pending', (select count(*) from reservations where organization_id = p_org and status = 'pending'),
    'reservations_upcoming', (select count(*) from reservations where organization_id = p_org
                 and status in ('pending','confirmed') and start_date >= current_date)
  ) into v;
  return v;
end $$;
revoke all on function public.app_org_ops_window(uuid, int) from public, anon;
grant execute on function public.app_org_ops_window(uuid, int) to authenticated, service_role;

notify pgrst, 'reload schema';
