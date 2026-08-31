-- Phoxta platform — 0126 demo gate.
-- The live demo popup (SitePreviewModal) is the strongest thing the marketing
-- site shows a stranger, and until now it showed it to nobody in particular:
-- someone toured five storefronts and left no trace. The popup now blurs the
-- demo behind a short form (name, phone, email, how they heard about us), and
-- the answer is remembered for five days so the same visitor is asked once,
-- not once per demo.

-- ── 1) 'demo' is a lead source ─────────────────────────────────────────────
-- platform_leads.source carries an inline CHECK from 0070. Drop it by
-- definition rather than by name: it was created anonymously, and an add
-- alongside a surviving old constraint would leave 'demo' rejected by the one
-- we did not drop.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.platform_leads'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%startup-school%'
  loop
    execute format('alter table platform_leads drop constraint %I', c.conname);
  end loop;
end $$;

alter table platform_leads add constraint platform_leads_source_check
  check (source in ('contact', 'startup-school', 'careers', 'demo', 'other'));

-- ── 2) The pass itself ─────────────────────────────────────────────────────
-- One row per visitor who has filled the form in. It exists so the gate can
-- answer one question — "have we already met this person?" — for five days.
--
-- The address is stored hashed, following homepage_validation_usage: knowing
-- "same visitor as before" is the whole job, knowing who they are is not, and
-- raw addresses would make this a privacy liability for no added function.
-- device_id is a random id the browser keeps, so a visitor whose IP moves
-- (phone leaving wifi, office NAT) is still recognised.
create table if not exists demo_passes (
  id bigserial primary key,
  ip_hash text not null,
  device_id text not null default '',
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  heard_about text not null default '',
  -- Which demo unlocked them, for read-through on the lead.
  demo_url text not null default '',
  lead_id uuid references platform_leads(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '5 days'
);

-- The lookup on every popup open: newest live pass for this address or device.
create index if not exists idx_demo_passes_ip on demo_passes(ip_hash, expires_at desc);
create index if not exists idx_demo_passes_device on demo_passes(device_id, expires_at desc)
  where device_id <> '';
create index if not exists idx_demo_passes_created on demo_passes(created_at desc);

alter table demo_passes enable row level security;
-- Written only by the demo-access edge function under service_role.
drop policy if exists demo_passes_admin_read on demo_passes;
create policy demo_passes_admin_read on demo_passes
  for select using (public.app_is_platform_admin());
