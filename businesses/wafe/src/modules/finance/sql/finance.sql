-- Wàfè — finance: accounts, budget categories, the ledger, bills and their
-- payments, budget alerts, the purchase pipeline (wishes, approvals, the
-- "Buy X" job), personal envelopes, savings pots and the module's settings.
--
-- Idempotent. Depends only on 00-foundation (wf_spaces, wf_members and the
-- helpers wf_is_member / wf_is_parent / wf_my_member); it never references
-- another module's tables. A goal a savings pot measures keeps the Goals
-- module's id in `goal_id` and is joined in the app — there is no foreign key
-- across the seam.
--
-- THE PRIVACY MODEL, in one paragraph. Money is parents-only, and that line is
-- drawn in the database, not the UI: every table below reads and writes under
-- wf_is_parent(space_id). There are exactly three deliberate exceptions, and
-- each of them is something that genuinely belongs to the person rather than
-- to the household:
--
--   1. WISHES. Anyone in the family may ask for something, and may see their
--      OWN asks and what was decided — and nobody else's. That is what makes
--      the child's wish form real rather than a form that posts into a void.
--   2. ENVELOPES. A young adult with an envelope reads their own envelope row
--      and the ledger rows tagged with it. Their £25 is theirs to see; the
--      family's £4,200 is not.
--   3. BUDGET CATEGORIES. A parent may grant `finance.view` to a teenager
--      (the permission matrix has it, and Dami has it) — that grant, and only
--      that grant, opens the CATEGORY table for reading. It opens nothing
--      else: there is still no ledger, no bill, no pipeline, no pot detail.
--
-- Everything else — the ledger, the bills, the alerts, the approvals, the
-- pots, the settings — returns zero rows to a child or a guest at the API.
--
-- REPORTING CURRENCY. `amount_cents` is what left the account, in `currency`;
-- `amount_home_cents` is the same money in the SPACE's currency at `fx_rate`,
-- stamped once on the day. Every total the product shows adds
-- `amount_home_cents`, so a naira deposit on the Lagos house and a pound of
-- groceries are comparable and the giving percentage stays honest.

-- ---------------------------------------------------------------------------
-- 1. Helpers
-- ---------------------------------------------------------------------------

-- Parent, or a member a parent has explicitly granted `finance.view`.
create or replace function public.wf_finance_can_view(p_space uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wf_members m
    where m.space_id = p_space and m.user_id = auth.uid()
      and (m.role = 'parent' or coalesce((m.grants ->> 'finance.view')::boolean, false))
  );
$$;
grant execute on function public.wf_finance_can_view(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wf_finance_accounts (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  space_id              uuid not null references public.wf_spaces(id) on delete cascade,
  name                  text not null,
  kind                  text not null default 'bank' check (kind in ('cash','bank','savings','mobile_money')),
  currency              text not null default 'GBP',
  opening_balance_cents integer not null default 0,
  active                boolean not null default true,
  created_at            timestamptz not null default now()
);
create index if not exists idx_wf_fin_accounts_space on public.wf_finance_accounts(space_id);

-- A category with a monthly limit IS a budget. The ids are stable across the
-- product ("groceries", "tithes", …) because other modules name them, so the
-- primary key is text rather than a uuid.
create table if not exists public.wf_finance_categories (
  id                   text not null,
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  space_id             uuid not null references public.wf_spaces(id) on delete cascade,
  name                 text not null,
  kind                 text not null default 'expense' check (kind in ('income','expense')),
  monthly_budget_cents integer not null default 0 check (monthly_budget_cents >= 0),
  is_giving            boolean not null default false,
  is_food              boolean not null default false,
  is_savings           boolean not null default false,
  colour               text not null default 'sage',
  sort_order           integer not null default 0,
  active               boolean not null default true,
  created_at           timestamptz not null default now(),
  primary key (space_id, id)
);

create table if not exists public.wf_finance_entries (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  space_id          uuid not null references public.wf_spaces(id) on delete cascade,
  entry_date        date not null default current_date,
  kind              text not null default 'expense' check (kind in ('income','expense')),
  amount_cents      integer not null check (amount_cents >= 0),
  currency          text not null default 'GBP',
  fx_rate           numeric(18,8) not null default 1 check (fx_rate > 0),
  amount_home_cents integer not null check (amount_home_cents >= 0),
  category_id       text not null default 'other',
  account_id        uuid references public.wf_finance_accounts(id) on delete set null,
  member_id         uuid references public.wf_members(id) on delete set null,
  value_id          text,
  payee             text not null default '',
  note              text not null default '',
  receipt_url       text,
  recipient         text not null default '',
  bill_id           uuid,
  envelope_id       uuid,
  wish_id           uuid,
  savings_goal_id   uuid,
  created_by        uuid references public.wf_members(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index if not exists idx_wf_fin_entries_space_date on public.wf_finance_entries(space_id, entry_date desc);
create index if not exists idx_wf_fin_entries_category on public.wf_finance_entries(space_id, category_id, entry_date);
create index if not exists idx_wf_fin_entries_envelope on public.wf_finance_entries(envelope_id) where envelope_id is not null;

create table if not exists public.wf_finance_bills (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  name            text not null,
  amount_cents    integer not null default 0 check (amount_cents >= 0),
  category_id     text not null default 'home',
  account_id      uuid references public.wf_finance_accounts(id) on delete set null,
  due_day         integer not null default 1 check (due_day between 1 and 28),
  freq            text not null default 'monthly' check (freq in ('monthly','quarterly','yearly')),
  autopay         boolean not null default false,
  active          boolean not null default true,
  -- Rule 12: three reminders, then it parks in Needs attention.
  reminders_sent  integer not null default 0 check (reminders_sent >= 0),
  note            text not null default '',
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_fin_bills_space on public.wf_finance_bills(space_id, active);

create table if not exists public.wf_finance_bill_payments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  bill_id         uuid not null references public.wf_finance_bills(id) on delete cascade,
  -- 'YYYY-MM': one payment per bill per period, and the database says so.
  month           text not null check (month ~ '^\d{4}-\d{2}$'),
  paid_at         timestamptz not null default now(),
  ledger_entry_id uuid references public.wf_finance_entries(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (bill_id, month)
);

-- One row per category per threshold per month: the row IS the "fired once"
-- guarantee, so a re-run of the checker inserts nothing.
create table if not exists public.wf_finance_alerts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  category_id     text not null,
  month           text not null check (month ~ '^\d{4}-\d{2}$'),
  threshold       integer not null check (threshold in (80, 100)),
  spent_cents     integer not null default 0,
  budget_cents    integer not null default 0,
  fired_at        timestamptz not null default now(),
  seen_at         timestamptz,
  unique (space_id, category_id, month, threshold)
);

create table if not exists public.wf_finance_wishes (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  name             text not null,
  link             text not null default '',
  price_cents      integer not null default 0 check (price_cents >= 0),
  requested_by     uuid not null references public.wf_members(id) on delete cascade,
  reason           text not null default '',
  category_id      text not null default 'other',
  status           text not null default 'requested' check (status in ('requested','approved','deferred','declined','planned','bought')),
  priority         text not null default 'normal' check (priority in ('low','normal','high')),
  planned_month    text check (planned_month is null or planned_month ~ '^\d{4}-\d{2}$'),
  decision_comment text not null default '',
  buy_task_id      uuid,
  ledger_entry_id  uuid references public.wf_finance_entries(id) on delete set null,
  image_url        text,
  source_type      text not null default 'manual' check (source_type in ('manual','child-wish','wardrobe','project','travel')),
  source_id        uuid,
  created_at       timestamptz not null default now(),
  decided_at       timestamptz,
  bought_at        timestamptz
);
create index if not exists idx_wf_fin_wishes_space on public.wf_finance_wishes(space_id, status);
create index if not exists idx_wf_fin_wishes_member on public.wf_finance_wishes(requested_by);

-- One parent, one vote: the unique key is what makes "two DISTINCT parents"
-- true even if somebody clicks approve twice.
create table if not exists public.wf_finance_wish_approvals (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.wf_spaces(id) on delete cascade,
  wish_id          uuid not null references public.wf_finance_wishes(id) on delete cascade,
  parent_member_id uuid not null references public.wf_members(id) on delete cascade,
  decision         text not null check (decision in ('approve','defer','decline')),
  comment          text not null default '',
  decided_at       timestamptz not null default now(),
  unique (wish_id, parent_member_id)
);

-- The job an approval creates. It lives here rather than in wf_tasks because a
-- module never writes another module's rows; the dashboard surfaces it on the
-- assignee's Today, which is where a job is felt.
create table if not exists public.wf_finance_buy_tasks (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  space_id           uuid not null references public.wf_spaces(id) on delete cascade,
  wish_id            uuid not null references public.wf_finance_wishes(id) on delete cascade,
  title              text not null,
  assignee_member_id uuid references public.wf_members(id) on delete set null,
  due_date           date not null default current_date,
  done               boolean not null default false,
  created_by         uuid references public.wf_members(id) on delete set null,
  created_at         timestamptz not null default now(),
  done_at            timestamptz
);
create index if not exists idx_wf_fin_buy_tasks_space on public.wf_finance_buy_tasks(space_id, done);

create table if not exists public.wf_finance_envelopes (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  space_id             uuid not null references public.wf_spaces(id) on delete cascade,
  member_id            uuid not null references public.wf_members(id) on delete cascade,
  monthly_amount_cents integer not null default 0 check (monthly_amount_cents >= 0),
  balance_cents        integer not null default 0,
  granted_by           uuid references public.wf_members(id) on delete set null,
  note                 text not null default '',
  last_topped_up       text not null default '',
  created_at           timestamptz not null default now(),
  unique (space_id, member_id)
);

create table if not exists public.wf_finance_savings_goals (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.wf_spaces(id) on delete cascade,
  name            text not null,
  -- The Goals module's goal this pot measures. Joined in the app.
  goal_id         uuid,
  goal_label      text not null default '',
  target_cents    integer not null default 0 check (target_cents >= 0),
  current_cents   integer not null default 0,
  account_id      uuid references public.wf_finance_accounts(id) on delete set null,
  note            text not null default '',
  created_at      timestamptz not null default now()
);
create index if not exists idx_wf_fin_pots_space on public.wf_finance_savings_goals(space_id);

create table if not exists public.wf_finance_settings (
  space_id                 uuid primary key references public.wf_spaces(id) on delete cascade,
  organization_id          uuid not null references public.organizations(id) on delete cascade,
  currency                 text not null default 'GBP',
  -- Above this, a purchase needs two different parents to say yes.
  approval_threshold_cents integer not null default 30000 check (approval_threshold_cents >= 0),
  -- Minutes of idle before a money write asks "is it still you?".
  reauth_minutes           integer not null default 15 check (reauth_minutes between 1 and 240),
  fx_rates                 jsonb not null default '{}'::jsonb,
  tithe_pct                numeric(5,2) not null default 10,
  note                     text not null default '',
  updated_at               timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Row-level security
-- ---------------------------------------------------------------------------

alter table public.wf_finance_accounts       enable row level security;
alter table public.wf_finance_categories     enable row level security;
alter table public.wf_finance_entries        enable row level security;
alter table public.wf_finance_bills          enable row level security;
alter table public.wf_finance_bill_payments  enable row level security;
alter table public.wf_finance_alerts         enable row level security;
alter table public.wf_finance_wishes         enable row level security;
alter table public.wf_finance_wish_approvals enable row level security;
alter table public.wf_finance_buy_tasks      enable row level security;
alter table public.wf_finance_envelopes      enable row level security;
alter table public.wf_finance_savings_goals  enable row level security;
alter table public.wf_finance_settings       enable row level security;

-- Parents only, full stop.
drop policy if exists wf_fin_accounts_all on public.wf_finance_accounts;
create policy wf_fin_accounts_all on public.wf_finance_accounts for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_fin_bills_all on public.wf_finance_bills;
create policy wf_fin_bills_all on public.wf_finance_bills for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_fin_bill_payments_all on public.wf_finance_bill_payments;
create policy wf_fin_bill_payments_all on public.wf_finance_bill_payments for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_fin_alerts_all on public.wf_finance_alerts;
create policy wf_fin_alerts_all on public.wf_finance_alerts for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_fin_approvals_all on public.wf_finance_wish_approvals;
create policy wf_fin_approvals_all on public.wf_finance_wish_approvals for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_fin_buy_tasks_all on public.wf_finance_buy_tasks;
create policy wf_fin_buy_tasks_all on public.wf_finance_buy_tasks for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_fin_pots_all on public.wf_finance_savings_goals;
create policy wf_fin_pots_all on public.wf_finance_savings_goals for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

drop policy if exists wf_fin_settings_all on public.wf_finance_settings;
create policy wf_fin_settings_all on public.wf_finance_settings for all to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));

-- Categories: parents write; a member granted finance.view may READ them, and
-- nothing else. That grant buys a budget overview, never a ledger.
drop policy if exists wf_fin_categories_read on public.wf_finance_categories;
create policy wf_fin_categories_read on public.wf_finance_categories for select to authenticated
  using (wf_finance_can_view(space_id));
drop policy if exists wf_fin_categories_write on public.wf_finance_categories;
create policy wf_fin_categories_write on public.wf_finance_categories for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_fin_categories_edit on public.wf_finance_categories;
create policy wf_fin_categories_edit on public.wf_finance_categories for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_fin_categories_del on public.wf_finance_categories;
create policy wf_fin_categories_del on public.wf_finance_categories for delete to authenticated using (wf_is_parent(space_id));

-- The ledger: parents, plus a young adult's OWN envelope rows and nothing else.
drop policy if exists wf_fin_entries_read on public.wf_finance_entries;
create policy wf_fin_entries_read on public.wf_finance_entries for select to authenticated
  using (
    wf_is_parent(space_id)
    or (
      envelope_id is not null
      and exists (
        select 1 from public.wf_finance_envelopes e
        where e.id = wf_finance_entries.envelope_id and e.member_id = wf_my_member(space_id)
      )
    )
  );
drop policy if exists wf_fin_entries_write on public.wf_finance_entries;
create policy wf_fin_entries_write on public.wf_finance_entries for insert to authenticated
  with check (
    wf_is_parent(space_id)
    or (
      envelope_id is not null
      and exists (
        select 1 from public.wf_finance_envelopes e
        where e.id = envelope_id and e.member_id = wf_my_member(space_id)
      )
    )
  );
drop policy if exists wf_fin_entries_edit on public.wf_finance_entries;
create policy wf_fin_entries_edit on public.wf_finance_entries for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_fin_entries_del on public.wf_finance_entries;
create policy wf_fin_entries_del on public.wf_finance_entries for delete to authenticated using (wf_is_parent(space_id));

-- The budget overview a `finance.view` grant buys, and the ONLY way a
-- non-parent ever reaches the ledger: aggregated in the database, one row per
-- category, so nothing itemised crosses the wire. The demo sums the same
-- numbers in memory, so both modes show a teenager the same overview.
create or replace function public.wf_finance_month_summary(p_space uuid, p_month text)
returns table (category_id text, spent_cents bigint, income_cents bigint)
language sql security definer set search_path = public stable as $$
  select e.category_id,
         coalesce(sum(case when e.kind = 'expense' then e.amount_home_cents else 0 end), 0)::bigint,
         coalesce(sum(case when e.kind = 'income'  then e.amount_home_cents else 0 end), 0)::bigint
  from public.wf_finance_entries e
  where e.space_id = p_space
    and to_char(e.entry_date, 'YYYY-MM') = p_month
    and public.wf_finance_can_view(p_space)
  group by e.category_id;
$$;
grant execute on function public.wf_finance_month_summary(uuid, text) to authenticated;

-- Wishes: anyone may ask, and see their own asks and the answer. Parents see
-- the whole pipeline and are the only ones who may decide it.
drop policy if exists wf_fin_wishes_read on public.wf_finance_wishes;
create policy wf_fin_wishes_read on public.wf_finance_wishes for select to authenticated
  using (wf_is_parent(space_id) or requested_by = wf_my_member(space_id));
drop policy if exists wf_fin_wishes_write on public.wf_finance_wishes;
create policy wf_fin_wishes_write on public.wf_finance_wishes for insert to authenticated
  with check (wf_is_member(space_id) and (wf_is_parent(space_id) or requested_by = wf_my_member(space_id)));
drop policy if exists wf_fin_wishes_edit on public.wf_finance_wishes;
create policy wf_fin_wishes_edit on public.wf_finance_wishes for update to authenticated
  using (wf_is_parent(space_id)) with check (wf_is_parent(space_id));
drop policy if exists wf_fin_wishes_del on public.wf_finance_wishes;
create policy wf_fin_wishes_del on public.wf_finance_wishes for delete to authenticated
  using (wf_is_parent(space_id) or (requested_by = wf_my_member(space_id) and status = 'requested'));

-- A child may ask, but never decide: only a parent may change the status.
create or replace function public.wf_finance_wish_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or wf_is_parent(new.space_id) then return new; end if;
  new.status           := 'requested';
  new.decision_comment := '';
  new.buy_task_id      := null;
  new.ledger_entry_id  := null;
  new.planned_month    := null;
  new.requested_by     := wf_my_member(new.space_id);
  return new;
end $$;
drop trigger if exists wf_finance_wish_guard_ins on public.wf_finance_wishes;
create trigger wf_finance_wish_guard_ins before insert on public.wf_finance_wishes
  for each row execute function public.wf_finance_wish_guard();

-- Envelopes: a parent runs them; the person they belong to reads their own and
-- may spend it down (the balance is the only column they may move).
drop policy if exists wf_fin_envelopes_read on public.wf_finance_envelopes;
create policy wf_fin_envelopes_read on public.wf_finance_envelopes for select to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_fin_envelopes_write on public.wf_finance_envelopes;
create policy wf_fin_envelopes_write on public.wf_finance_envelopes for insert to authenticated with check (wf_is_parent(space_id));
drop policy if exists wf_fin_envelopes_edit on public.wf_finance_envelopes;
create policy wf_fin_envelopes_edit on public.wf_finance_envelopes for update to authenticated
  using (wf_is_parent(space_id) or member_id = wf_my_member(space_id))
  with check (wf_is_parent(space_id) or member_id = wf_my_member(space_id));
drop policy if exists wf_fin_envelopes_del on public.wf_finance_envelopes;
create policy wf_fin_envelopes_del on public.wf_finance_envelopes for delete to authenticated using (wf_is_parent(space_id));

create or replace function public.wf_finance_envelope_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or wf_is_parent(new.space_id) then return new; end if;
  -- The owner may spend it down. They may not top it up or move the allowance.
  new.monthly_amount_cents := old.monthly_amount_cents;
  new.last_topped_up       := old.last_topped_up;
  new.member_id            := old.member_id;
  new.granted_by           := old.granted_by;
  if new.balance_cents > old.balance_cents then
    raise exception 'Only a parent can add to an envelope';
  end if;
  return new;
end $$;
drop trigger if exists wf_finance_envelope_guard_upd on public.wf_finance_envelopes;
create trigger wf_finance_envelope_guard_upd before update on public.wf_finance_envelopes
  for each row execute function public.wf_finance_envelope_guard();

-- ---------------------------------------------------------------------------
-- 4. Pre-loaded content: the starter budget every new family gets
-- ---------------------------------------------------------------------------

-- The category ids other modules name ("groceries" for Wellness, "home" for
-- Projects) exist from the first minute, so a family never meets an empty
-- budget screen and no other module has to cope with a missing key.
create table if not exists public.wf_catalog_finance_categories (
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  id                   text not null,
  name                 text not null,
  kind                 text not null default 'expense',
  monthly_budget_cents integer not null default 0,
  is_giving            boolean not null default false,
  is_food              boolean not null default false,
  is_savings           boolean not null default false,
  colour               text not null default 'sage',
  sort_order           integer not null default 0,
  primary key (organization_id, id)
);
alter table public.wf_catalog_finance_categories enable row level security;
drop policy if exists wf_catalog_finance_read on public.wf_catalog_finance_categories;
create policy wf_catalog_finance_read on public.wf_catalog_finance_categories for select to authenticated using (true);

create or replace function public.wf_seed_finance(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.wf_catalog_finance_categories (organization_id, id, name, kind, monthly_budget_cents, is_giving, is_food, is_savings, colour, sort_order)
  values
    (p_org, 'income',      'Salary',            'income',  0, false, false, false, 'sage',  0),
    (p_org, 'consultancy', 'Other income',      'income',  0, false, false, false, 'mint',  1),
    (p_org, 'housing',     'Housing',           'expense', 0, false, false, false, 'brand', 2),
    (p_org, 'groceries',   'Groceries',         'expense', 0, false, true,  false, 'mint',  3),
    (p_org, 'tithes',      'Tithe',             'expense', 0, true,  false, false, 'live',  4),
    (p_org, 'giving',      'Giving & gifts',    'expense', 0, true,  false, false, 'ochre', 5),
    (p_org, 'savings',     'Savings',           'expense', 0, false, false, true,  'sage',  6),
    (p_org, 'transport',   'Transport',         'expense', 0, false, false, false, 'terra', 7),
    (p_org, 'education',   'Education',         'expense', 0, false, false, false, 'plum',  8),
    (p_org, 'home',        'Home & bills',      'expense', 0, false, false, false, 'brand', 9),
    (p_org, 'health',      'Health',            'expense', 0, false, false, false, 'mint',  10),
    (p_org, 'fun',         'Fun & eating out',  'expense', 0, false, false, false, 'ochre', 11),
    (p_org, 'holidays',    'Holidays & travel', 'expense', 0, false, false, false, 'plum',  12),
    (p_org, 'other',       'Everything else',   'expense', 0, false, false, false, 'sage',  13)
  on conflict (organization_id, id) do update
    set name = excluded.name, kind = excluded.kind, is_giving = excluded.is_giving,
        is_food = excluded.is_food, is_savings = excluded.is_savings,
        colour = excluded.colour, sort_order = excluded.sort_order;
end $$;
grant execute on function public.wf_seed_finance(uuid) to authenticated;

-- Copy the catalogue into a brand-new space, so the ids are live from day one.
create or replace function public.wf_finance_bootstrap_space(p_org uuid, p_space uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.wf_seed_finance(p_org);
  insert into public.wf_finance_categories (id, organization_id, space_id, name, kind, monthly_budget_cents, is_giving, is_food, is_savings, colour, sort_order)
  select c.id, p_org, p_space, c.name, c.kind, c.monthly_budget_cents, c.is_giving, c.is_food, c.is_savings, c.colour, c.sort_order
  from public.wf_catalog_finance_categories c
  where c.organization_id = p_org
  on conflict (space_id, id) do nothing;

  insert into public.wf_finance_accounts (organization_id, space_id, name, kind, currency)
  select p_org, p_space, 'Everyday current account', 'bank', coalesce(s.currency, 'GBP')
  from public.wf_spaces s where s.id = p_space
  and not exists (select 1 from public.wf_finance_accounts a where a.space_id = p_space);

  insert into public.wf_finance_settings (space_id, organization_id, currency)
  select p_space, p_org, coalesce(s.currency, 'GBP') from public.wf_spaces s where s.id = p_space
  on conflict (space_id) do nothing;
end $$;
grant execute on function public.wf_finance_bootstrap_space(uuid, uuid) to authenticated;
