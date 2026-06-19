-- Phoxta platform — 0035 product variants (size × color matrix) for retail/fashion.
-- A product (e.g. a coat) sells in size×colour variants, each with its own stock.
-- Owners manage the grid in the console; storefronts show per-variant availability.
-- Generic table, seeded for the Aurelia demo from each product's metadata.

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  size text not null default '',
  color text not null default '',
  sku text not null default '',
  stock integer not null default 0,
  price_cents integer,                         -- null = use the product price
  created_at timestamptz not null default now(),
  unique (product_id, size, color)
);
create index if not exists idx_variants_product on product_variants(product_id);
alter table product_variants enable row level security;
create policy variants_all on product_variants for all
  using (public.app_is_org_member(organization_id))
  with check (public.app_is_org_member(organization_id));
drop policy if exists variants_public_read on product_variants;
create policy variants_public_read on product_variants for select to anon, authenticated
  using (exists (select 1 from products p where p.id = product_variants.product_id and p.status = 'active'));

-- Seed Aurelia variants from each product's metadata colours × sizes.
do $$
declare v_org uuid; p record; c text; s text;
begin
  select id into v_org from organizations where slug = 'aurelia-demo';
  if v_org is null then return; end if;
  if exists (select 1 from product_variants where organization_id = v_org) then return; end if;
  for p in select id, metadata from products where organization_id = v_org loop
    for c in select jsonb_array_elements_text(coalesce(p.metadata->'colors', '[]'::jsonb)) loop
      for s in select jsonb_array_elements_text(coalesce(p.metadata->'sizes', '[]'::jsonb)) loop
        insert into product_variants (organization_id, product_id, size, color, stock)
        values (v_org, p.id, s, c, (floor(random() * 12))::int)   -- 0..11, some out of stock
        on conflict (product_id, size, color) do nothing;
      end loop;
    end loop;
  end loop;
end $$;
