-- Phoxta — 0006 per-business operating backend
-- The operational layer each business runs on: CRM, commerce, invoicing &
-- subscriptions, CMS, scheduling/bookings, helpdesk, marketing automation,
-- analytics. Every row is keyed to organization_id and isolated by RLS
-- (app_is_org_member), so each business only ever sees its own data.
--
-- Each table uses one `for all` policy = select/insert/update/delete for members.

-- ===========================================================================
-- CRM
-- ===========================================================================
create table if not exists crm_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  email text not null default '',
  phone text not null default '',
  company text not null default '',
  stage text not null default 'lead' check (stage in ('lead','prospect','customer','churned')),
  tags text[] not null default '{}',
  notes text not null default '',
  value_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_crm_contacts_org on crm_contacts(organization_id);
create trigger trg_crm_contacts_touch before update on crm_contacts
  for each row execute function public.app_touch_updated_at();
alter table crm_contacts enable row level security;
create policy crm_contacts_all on crm_contacts for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- Commerce: products / orders / order items / fulfillment
-- ===========================================================================
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  sku text not null default '',
  description text not null default '',
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'USD',
  stock integer not null default 0,
  status text not null default 'active' check (status in ('active','draft','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_org on products(organization_id);
create trigger trg_products_touch before update on products
  for each row execute function public.app_touch_updated_at();
alter table products enable row level security;
create policy products_all on products for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid references crm_contacts(id) on delete set null,
  customer_name text not null default '',
  customer_email text not null default '',
  status text not null default 'pending'
    check (status in ('pending','paid','fulfilled','cancelled','refunded')),
  fulfillment_status text not null default 'unfulfilled'
    check (fulfillment_status in ('unfulfilled','fulfilled')),
  total_cents integer not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orders_org on orders(organization_id, created_at desc);
create trigger trg_orders_touch before update on orders
  for each row execute function public.app_touch_updated_at();
alter table orders enable row level security;
create policy orders_all on orders for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  name text not null default '',
  quantity integer not null default 1 check (quantity > 0),
  unit_price_cents integer not null default 0
);
create index if not exists idx_order_items_order on order_items(order_id);
alter table order_items enable row level security;
create policy order_items_all on order_items for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- Invoicing & subscriptions (per business — distinct from the platform plan)
-- ===========================================================================
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid references crm_contacts(id) on delete set null,
  number text not null default '',
  customer_name text not null default '',
  customer_email text not null default '',
  status text not null default 'draft' check (status in ('draft','sent','paid','void')),
  issue_date date not null default current_date,
  due_date date,
  total_cents integer not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_invoices_org on invoices(organization_id, created_at desc);
create trigger trg_invoices_touch before update on invoices
  for each row execute function public.app_touch_updated_at();
alter table invoices enable row level security;
create policy invoices_all on invoices for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null default '',
  quantity integer not null default 1 check (quantity > 0),
  unit_price_cents integer not null default 0
);
create index if not exists idx_invoice_items_invoice on invoice_items(invoice_id);
alter table invoice_items enable row level security;
create policy invoice_items_all on invoice_items for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

create table if not exists customer_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid references crm_contacts(id) on delete set null,
  plan_name text not null default '',
  amount_cents integer not null default 0,
  currency text not null default 'USD',
  interval text not null default 'monthly' check (interval in ('monthly','yearly')),
  status text not null default 'active' check (status in ('active','paused','canceled')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_customer_subs_org on customer_subscriptions(organization_id);
create trigger trg_customer_subs_touch before update on customer_subscriptions
  for each row execute function public.app_touch_updated_at();
alter table customer_subscriptions enable row level security;
create policy customer_subs_all on customer_subscriptions for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- CMS: draft -> publish -> revalidate
-- ===========================================================================
create table if not exists cms_pages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  slug text not null,
  title text not null default '',
  body text not null default '',
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  revalidated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);
create index if not exists idx_cms_pages_org on cms_pages(organization_id);
create trigger trg_cms_pages_touch before update on cms_pages
  for each row execute function public.app_touch_updated_at();
alter table cms_pages enable row level security;
create policy cms_pages_all on cms_pages for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- Scheduling / bookings
-- ===========================================================================
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text not null default '',
  duration_min integer not null default 30 check (duration_min > 0),
  price_cents integer not null default 0,
  currency text not null default 'USD',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_services_org on services(organization_id);
create trigger trg_services_touch before update on services
  for each row execute function public.app_touch_updated_at();
alter table services enable row level security;
create policy services_all on services for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  contact_id uuid references crm_contacts(id) on delete set null,
  customer_name text not null default '',
  customer_email text not null default '',
  start_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_bookings_org on bookings(organization_id, start_at);
create trigger trg_bookings_touch before update on bookings
  for each row execute function public.app_touch_updated_at();
alter table bookings enable row level security;
create policy bookings_all on bookings for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- Helpdesk (with AI deflection)
-- ===========================================================================
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid references crm_contacts(id) on delete set null,
  subject text not null default '',
  customer_name text not null default '',
  customer_email text not null default '',
  status text not null default 'open' check (status in ('open','pending','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  ai_deflected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tickets_org on tickets(organization_id, created_at desc);
create trigger trg_tickets_touch before update on tickets
  for each row execute function public.app_touch_updated_at();
alter table tickets enable row level security;
create policy tickets_all on tickets for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

create table if not exists ticket_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  ticket_id uuid not null references tickets(id) on delete cascade,
  author text not null default 'agent' check (author in ('customer','agent','ai')),
  body text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_ticket_messages_ticket on ticket_messages(ticket_id, created_at);
alter table ticket_messages enable row level security;
create policy ticket_messages_all on ticket_messages for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- Marketing automation: campaigns + automations
-- ===========================================================================
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  channel text not null default 'email' check (channel in ('email','sms')),
  subject text not null default '',
  body text not null default '',
  audience text not null default 'all',
  status text not null default 'draft' check (status in ('draft','scheduled','sent')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipients integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_campaigns_org on campaigns(organization_id, created_at desc);
create trigger trg_campaigns_touch before update on campaigns
  for each row execute function public.app_touch_updated_at();
alter table campaigns enable row level security;
create policy campaigns_all on campaigns for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

create table if not exists automations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  trigger text not null default 'contact_created'
    check (trigger in ('contact_created','order_paid','booking_created','ticket_created')),
  action text not null default 'send_email'
    check (action in ('send_email','add_tag','create_task','notify')),
  config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  runs integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_automations_org on automations(organization_id);
create trigger trg_automations_touch before update on automations
  for each row execute function public.app_touch_updated_at();
alter table automations enable row level security;
create policy automations_all on automations for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- ===========================================================================
-- Analytics: lightweight event log + a rollup summary for the console overview
-- ===========================================================================
create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_analytics_events_org on analytics_events(organization_id, created_at desc);
alter table analytics_events enable row level security;
create policy analytics_events_all on analytics_events for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));

-- A single aggregate the Overview screen reads. SECURITY DEFINER but gated on
-- membership, so a member gets one cheap round-trip instead of many counts.
create or replace function public.app_org_ops_summary(p_org uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.app_is_org_member(p_org) then null else jsonb_build_object(
    'contacts',          (select count(*) from crm_contacts where organization_id = p_org),
    'customers',         (select count(*) from crm_contacts where organization_id = p_org and stage = 'customer'),
    'products',          (select count(*) from products where organization_id = p_org),
    'low_stock',         (select count(*) from products where organization_id = p_org and stock <= 5 and status = 'active'),
    'orders',            (select count(*) from orders where organization_id = p_org),
    'revenue_cents',     (select coalesce(sum(total_cents), 0) from orders where organization_id = p_org and status in ('paid','fulfilled')),
    'unfulfilled',       (select count(*) from orders where organization_id = p_org and status = 'paid' and fulfillment_status = 'unfulfilled'),
    'outstanding_cents', (select coalesce(sum(total_cents), 0) from invoices where organization_id = p_org and status = 'sent'),
    'open_tickets',      (select count(*) from tickets where organization_id = p_org and status in ('open','pending')),
    'ai_deflected',      (select count(*) from tickets where organization_id = p_org and ai_deflected),
    'upcoming_bookings', (select count(*) from bookings where organization_id = p_org and start_at >= now() and status in ('pending','confirmed')),
    'active_subs',       (select count(*) from customer_subscriptions where organization_id = p_org and status = 'active'),
    'published_pages',   (select count(*) from cms_pages where organization_id = p_org and status = 'published')
  ) end;
$$;
grant execute on function public.app_org_ops_summary(uuid) to authenticated;
