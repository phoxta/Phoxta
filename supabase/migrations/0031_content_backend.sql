-- Phoxta platform — 0031 content backend (reviews, FAQs, blog, pricing, partners, CMS)
-- Makes the storefronts fully data-driven: every review, testimonial, FAQ, blog
-- post, pricing plan, partner/dealer/host, product gallery and content page comes
-- from the database (per tenant), and contact forms write real leads. Generic
-- across blueprints; seeded for the three demo orgs. Public-read policies are OR'd
-- with the member policies, so owners still manage everything in the ops console.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  subject_type text not null default 'business' check (subject_type in ('business','product','listing')),
  subject_ref text,                                  -- product id / listing handle (null = business)
  author_name text not null default '',
  author_avatar text,
  rating numeric(2,1) not null default 5 check (rating >= 0 and rating <= 5),
  title text not null default '',
  body text not null default '',
  status text not null default 'published' check (status in ('published','pending','hidden')),
  created_at timestamptz not null default now()
);
create index if not exists idx_reviews_org on reviews(organization_id, subject_type, subject_ref);
alter table reviews enable row level security;
create policy reviews_all on reviews for all using (public.app_is_org_member(organization_id)) with check (public.app_is_org_member(organization_id));
drop policy if exists reviews_public_read on reviews;
create policy reviews_public_read on reviews for select to anon, authenticated using (status = 'published');

create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  question text not null default '',
  body text not null default '',
  category text not null default 'General',
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_faqs_org on faqs(organization_id, sort);
alter table faqs enable row level security;
create policy faqs_all on faqs for all using (public.app_is_org_member(organization_id)) with check (public.app_is_org_member(organization_id));
drop policy if exists faqs_public_read on faqs;
create policy faqs_public_read on faqs for select to anon, authenticated using (active);

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  slug text not null,
  title text not null default '',
  excerpt text not null default '',
  body text not null default '',
  cover_url text,
  author text not null default '',
  status text not null default 'published' check (status in ('draft','published')),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);
create index if not exists idx_blog_org on blog_posts(organization_id, published_at desc);
alter table blog_posts enable row level security;
create policy blog_all on blog_posts for all using (public.app_is_org_member(organization_id)) with check (public.app_is_org_member(organization_id));
drop policy if exists blog_public_read on blog_posts;
create policy blog_public_read on blog_posts for select to anon, authenticated using (status = 'published');

create table if not exists pricing_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null default '',
  price_cents integer not null default 0,
  interval text not null default 'monthly',
  features jsonb not null default '[]'::jsonb,
  highlighted boolean not null default false,
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_pricing_org on pricing_plans(organization_id, sort);
alter table pricing_plans enable row level security;
create policy pricing_all on pricing_plans for all using (public.app_is_org_member(organization_id)) with check (public.app_is_org_member(organization_id));
drop policy if exists pricing_public_read on pricing_plans;
create policy pricing_public_read on pricing_plans for select to anon, authenticated using (active);

create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null default '',
  role text not null default '',                     -- dealer / host / label / agency
  location text not null default '',
  rating numeric(2,1) not null default 5,
  image_url text,
  handle text,
  metadata jsonb not null default '{}'::jsonb,
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_partners_org on partners(organization_id, sort);
alter table partners enable row level security;
create policy partners_all on partners for all using (public.app_is_org_member(organization_id)) with check (public.app_is_org_member(organization_id));
drop policy if exists partners_public_read on partners;
create policy partners_public_read on partners for select to anon, authenticated using (active);

-- Product galleries + public read of published CMS pages.
alter table products add column if not exists gallery jsonb not null default '[]'::jsonb;
drop policy if exists cms_pages_public_read on cms_pages;
create policy cms_pages_public_read on cms_pages for select to anon, authenticated using (status = 'published');

-- ---------------------------------------------------------------------------
-- Anon RPCs: contact form -> CRM lead + ticket; submit a review (pending).
-- ---------------------------------------------------------------------------
create or replace function public.app_submit_contact(p_org uuid, p_name text, p_email text, p_subject text, p_message text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_ticket uuid;
begin
  if not exists (select 1 from organizations where id = p_org) then raise exception 'Unknown business'; end if;
  insert into crm_contacts (organization_id, name, email, stage, notes)
  values (p_org, coalesce(nullif(p_name,''),'Website visitor'), coalesce(p_email,''), 'lead', coalesce(p_message,''));
  insert into tickets (organization_id, subject, customer_name, customer_email, status, priority)
  values (p_org, coalesce(nullif(p_subject,''),'Website enquiry'), coalesce(p_name,''), coalesce(p_email,''), 'open', 'normal')
  returning id into v_ticket;
  return v_ticket;
end; $$;
grant execute on function public.app_submit_contact(uuid, text, text, text, text) to anon, authenticated;

create or replace function public.app_submit_review(p_org uuid, p_subject_type text, p_subject_ref text, p_author text, p_rating numeric, p_title text, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not exists (select 1 from organizations where id = p_org) then raise exception 'Unknown business'; end if;
  insert into reviews (organization_id, subject_type, subject_ref, author_name, rating, title, body, status)
  values (p_org, coalesce(p_subject_type,'business'), nullif(p_subject_ref,''), coalesce(nullif(p_author,''),'Anonymous'),
          greatest(0, least(5, coalesce(p_rating,5))), coalesce(p_title,''), coalesce(p_body,''), 'pending')
  returning id into v_id;
  return v_id;
end; $$;
grant execute on function public.app_submit_review(uuid, text, text, text, numeric, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed content for the demo orgs
-- ---------------------------------------------------------------------------

do $$
declare v_org uuid;
begin
  select id into v_org from organizations where slug = 'aurelia-demo';
  if v_org is null then return; end if;
  if not exists (select 1 from reviews where organization_id = v_org) then
    insert into reviews (organization_id, subject_type, subject_ref, author_name, rating, title, body)
      select v_org, 'product', p.id::text, (array['Amara K.','James T.','Sofia R.','Liam P.','Noah B.','Mia L.','Ava W.','Ben C.'])[1+(row_number() over () % 8)::int],
             4 + (row_number() over () % 2), 'Exactly as described', 'Really happy with this — great quality and quick delivery. Would recommend.'
      from products p where p.organization_id = v_org;
    insert into reviews (organization_id, subject_type, author_name, rating, title, body) values (v_org,'business','Elena V.',5,'Beautiful quality','The tailoring is impeccable and shipping was fast.');
    insert into reviews (organization_id, subject_type, author_name, rating, title, body) values (v_org,'business','Marcus D.',5,'My new favourite store','Considered pieces that actually last.');
    insert into reviews (organization_id, subject_type, author_name, rating, title, body) values (v_org,'business','Priya S.',5,'Effortless','Everything pairs together so easily.');
  end if;
  if not exists (select 1 from faqs where organization_id = v_org) then
    insert into faqs (organization_id, question, body, sort) values (v_org,'How do I place an order or booking?','Browse, choose what you want, and complete checkout. You''ll receive a confirmation by email right away.',0);
    insert into faqs (organization_id, question, body, sort) values (v_org,'What payment methods do you accept?','All major debit and credit cards are accepted securely at checkout.',1);
    insert into faqs (organization_id, question, body, sort) values (v_org,'Can I change or cancel?','Yes — contact us with your reference and we''ll help you adjust or cancel where possible.',2);
    insert into faqs (organization_id, question, body, sort) values (v_org,'Do you offer refunds?','Refunds follow our standard policy; reach out to support and we''ll sort it out quickly.',3);
    insert into faqs (organization_id, question, body, sort) values (v_org,'How do I contact support?','Use the contact form on this site or email us — we usually reply within a few hours.',4);
    insert into faqs (organization_id, question, body, sort) values (v_org,'Where are you based?','We operate online and serve customers worldwide, with local partners where listed.',5);
  end if;
  if not exists (select 1 from blog_posts where organization_id = v_org) then
    insert into blog_posts (organization_id, slug, title, excerpt, body, cover_url, author, published_at) values (v_org,'the-new-season-edit','The New-Season Edit','Five considered pieces that carry you from desk to dinner.','Five considered pieces that carry you from desk to dinner. In this piece we go a little deeper, with practical tips you can use today. Thanks for reading — explore the rest of the site for more.','/assets/imgs/pages/product/product-1.webp','The Team', now() - interval '0 days');
    insert into blog_posts (organization_id, slug, title, excerpt, body, cover_url, author, published_at) values (v_org,'caring-for-cashmere','Caring for Cashmere','Simple rituals to keep your knits beautiful for years.','Simple rituals to keep your knits beautiful for years. In this piece we go a little deeper, with practical tips you can use today. Thanks for reading — explore the rest of the site for more.','/assets/imgs/pages/product/product-4.webp','The Team', now() - interval '1 days');
    insert into blog_posts (organization_id, slug, title, excerpt, body, cover_url, author, published_at) values (v_org,'building-a-capsule-wardrobe','Building a Capsule Wardrobe','How to build a wardrobe that does more with less.','How to build a wardrobe that does more with less. In this piece we go a little deeper, with practical tips you can use today. Thanks for reading — explore the rest of the site for more.','/assets/imgs/pages/product/product-6.webp','The Team', now() - interval '2 days');
  end if;
  if not exists (select 1 from pricing_plans where organization_id = v_org) then
    insert into pricing_plans (organization_id, name, price_cents, interval, features, highlighted, sort) values (v_org,'Starter',0,'monthly','["Browse the full catalogue","Standard support","Email confirmations"]'::jsonb,false,0);
    insert into pricing_plans (organization_id, name, price_cents, interval, features, highlighted, sort) values (v_org,'Plus',1900,'monthly','["Everything in Starter","Priority support","Member-only offers","Free changes"]'::jsonb,true,1);
    insert into pricing_plans (organization_id, name, price_cents, interval, features, highlighted, sort) values (v_org,'Pro',4900,'monthly','["Everything in Plus","Dedicated account manager","Best available rates","24/7 support"]'::jsonb,false,2);
  end if;
  if not exists (select 1 from partners where organization_id = v_org) then
    insert into partners (organization_id, name, role, location, rating, handle, sort) values (v_org,'Aurelia Atelier','In-house label','Milan, Italy',4.9,'aurelia-atelier',0);
    insert into partners (organization_id, name, role, location, rating, handle, sort) values (v_org,'Maison Lune','Partner label','Paris, France',4.8,'maison-lune',1);
    insert into partners (organization_id, name, role, location, rating, handle, sort) values (v_org,'Studio Norde','Knitwear partner','Copenhagen, DK',4.7,'studio-norde',2);
    insert into partners (organization_id, name, role, location, rating, handle, sort) values (v_org,'Lumen Leather','Accessories','Florence, Italy',4.8,'lumen-leather',3);
  end if;
  insert into cms_pages (organization_id, slug, title, body, status, published_at) values
    (v_org,'about','About us','We''re on a mission to make great experiences effortless. This business runs on Phoxta — every product, booking and message here is real and managed from one place.','published',now()),
    (v_org,'terms','Terms & Conditions','These are the terms that govern your use of this site and any purchase or booking you make. Please read them carefully.','published',now()),
    (v_org,'privacy','Privacy Policy','We respect your privacy and only use your information to fulfil your orders, bookings and enquiries.','published',now())
  on conflict (organization_id, slug) do nothing;
  update products set gallery = jsonb_build_array(image_url) where organization_id = v_org and (gallery is null or gallery = '[]'::jsonb) and image_url is not null and image_url <> '';
  raise notice '[content seed] % done', 'aurelia-demo';
end $$;

do $$
declare v_org uuid;
begin
  select id into v_org from organizations where slug = 'carento-demo';
  if v_org is null then return; end if;
  if not exists (select 1 from reviews where organization_id = v_org) then
    insert into reviews (organization_id, subject_type, subject_ref, author_name, rating, title, body)
      select v_org, 'product', p.id::text, (array['Amara K.','James T.','Sofia R.','Liam P.','Noah B.','Mia L.','Ava W.','Ben C.'])[1+(row_number() over () % 8)::int],
             4 + (row_number() over () % 2), 'Exactly as described', 'Really happy with this — great quality and quick delivery. Would recommend.'
      from products p where p.organization_id = v_org;
    insert into reviews (organization_id, subject_type, author_name, rating, title, body) values (v_org,'business','Daniel R.',5,'Smooth rental','Picked up in minutes, car was spotless.');
    insert into reviews (organization_id, subject_type, author_name, rating, title, body) values (v_org,'business','Aisha M.',5,'Great value','Best rate I found and no hidden fees.');
    insert into reviews (organization_id, subject_type, author_name, rating, title, body) values (v_org,'business','Tom B.',5,'Will rent again','The whole process was effortless.');
  end if;
  if not exists (select 1 from faqs where organization_id = v_org) then
    insert into faqs (organization_id, question, body, sort) values (v_org,'How do I place an order or booking?','Browse, choose what you want, and complete checkout. You''ll receive a confirmation by email right away.',0);
    insert into faqs (organization_id, question, body, sort) values (v_org,'What payment methods do you accept?','All major debit and credit cards are accepted securely at checkout.',1);
    insert into faqs (organization_id, question, body, sort) values (v_org,'Can I change or cancel?','Yes — contact us with your reference and we''ll help you adjust or cancel where possible.',2);
    insert into faqs (organization_id, question, body, sort) values (v_org,'Do you offer refunds?','Refunds follow our standard policy; reach out to support and we''ll sort it out quickly.',3);
    insert into faqs (organization_id, question, body, sort) values (v_org,'How do I contact support?','Use the contact form on this site or email us — we usually reply within a few hours.',4);
    insert into faqs (organization_id, question, body, sort) values (v_org,'Where are you based?','We operate online and serve customers worldwide, with local partners where listed.',5);
  end if;
  if not exists (select 1 from blog_posts where organization_id = v_org) then
    insert into blog_posts (organization_id, slug, title, excerpt, body, cover_url, author, published_at) values (v_org,'top-road-trips-2026','Top Road Trips for 2026','Routes worth renting a car for this year.','Routes worth renting a car for this year. In this piece we go a little deeper, with practical tips you can use today. Thanks for reading — explore the rest of the site for more.','/assets/imgs/cars-listing/cars-listing-6/car-1.png','The Team', now() - interval '0 days');
    insert into blog_posts (organization_id, slug, title, excerpt, body, cover_url, author, published_at) values (v_org,'ev-vs-petrol-rental','EV vs Petrol: Which to Rent?','What to weigh when choosing your rental.','What to weigh when choosing your rental. In this piece we go a little deeper, with practical tips you can use today. Thanks for reading — explore the rest of the site for more.','/assets/imgs/cars-listing/cars-listing-6/car-3.png','The Team', now() - interval '1 days');
    insert into blog_posts (organization_id, slug, title, excerpt, body, cover_url, author, published_at) values (v_org,'airport-pickup-tips','Smarter Airport Pickups','Skip the queue and hit the road faster.','Skip the queue and hit the road faster. In this piece we go a little deeper, with practical tips you can use today. Thanks for reading — explore the rest of the site for more.','/assets/imgs/cars-listing/cars-listing-6/car-5.png','The Team', now() - interval '2 days');
  end if;
  if not exists (select 1 from pricing_plans where organization_id = v_org) then
    insert into pricing_plans (organization_id, name, price_cents, interval, features, highlighted, sort) values (v_org,'Starter',0,'monthly','["Browse the full catalogue","Standard support","Email confirmations"]'::jsonb,false,0);
    insert into pricing_plans (organization_id, name, price_cents, interval, features, highlighted, sort) values (v_org,'Plus',1900,'monthly','["Everything in Starter","Priority support","Member-only offers","Free changes"]'::jsonb,true,1);
    insert into pricing_plans (organization_id, name, price_cents, interval, features, highlighted, sort) values (v_org,'Pro',4900,'monthly','["Everything in Plus","Dedicated account manager","Best available rates","24/7 support"]'::jsonb,false,2);
  end if;
  if not exists (select 1 from partners where organization_id = v_org) then
    insert into partners (organization_id, name, role, location, rating, handle, sort) values (v_org,'City Auto Group','Premium dealer','Manchester, UK',4.8,'city-auto-group',0);
    insert into partners (organization_id, name, role, location, rating, handle, sort) values (v_org,'Coastline Motors','Dealer','Sydney, AU',4.7,'coastline-motors',1);
    insert into partners (organization_id, name, role, location, rating, handle, sort) values (v_org,'Alpine Rentals','Partner fleet','Zurich, CH',4.9,'alpine-rentals',2);
    insert into partners (organization_id, name, role, location, rating, handle, sort) values (v_org,'Metro Cars','Dealer','Chicago, US',4.6,'metro-cars',3);
  end if;
  insert into cms_pages (organization_id, slug, title, body, status, published_at) values
    (v_org,'about','About us','We''re on a mission to make great experiences effortless. This business runs on Phoxta — every product, booking and message here is real and managed from one place.','published',now()),
    (v_org,'terms','Terms & Conditions','These are the terms that govern your use of this site and any purchase or booking you make. Please read them carefully.','published',now()),
    (v_org,'privacy','Privacy Policy','We respect your privacy and only use your information to fulfil your orders, bookings and enquiries.','published',now())
  on conflict (organization_id, slug) do nothing;
  update products set gallery = jsonb_build_array(image_url) where organization_id = v_org and (gallery is null or gallery = '[]'::jsonb) and image_url is not null and image_url <> '';
  raise notice '[content seed] % done', 'carento-demo';
end $$;

do $$
declare v_org uuid;
begin
  select id into v_org from organizations where slug = 'travel-demo';
  if v_org is null then return; end if;
  if not exists (select 1 from reviews where organization_id = v_org) then
    insert into reviews (organization_id, subject_type, subject_ref, author_name, rating, title, body)
      select v_org, 'product', p.id::text, (array['Amara K.','James T.','Sofia R.','Liam P.','Noah B.','Mia L.','Ava W.','Ben C.'])[1+(row_number() over () % 8)::int],
             4 + (row_number() over () % 2), 'Exactly as described', 'Really happy with this — great quality and quick delivery. Would recommend.'
      from products p where p.organization_id = v_org;
    insert into reviews (organization_id, subject_type, author_name, rating, title, body) values (v_org,'business','Sofia L.',5,'Dream trip','Every booking was seamless and the stay was stunning.');
    insert into reviews (organization_id, subject_type, author_name, rating, title, body) values (v_org,'business','Noah K.',5,'Booked everything here','Flights, car and hotel in one place.');
    insert into reviews (organization_id, subject_type, author_name, rating, title, body) values (v_org,'business','Mia T.',5,'Highly recommend','Support was quick and friendly.');
  end if;
  if not exists (select 1 from faqs where organization_id = v_org) then
    insert into faqs (organization_id, question, body, sort) values (v_org,'How do I place an order or booking?','Browse, choose what you want, and complete checkout. You''ll receive a confirmation by email right away.',0);
    insert into faqs (organization_id, question, body, sort) values (v_org,'What payment methods do you accept?','All major debit and credit cards are accepted securely at checkout.',1);
    insert into faqs (organization_id, question, body, sort) values (v_org,'Can I change or cancel?','Yes — contact us with your reference and we''ll help you adjust or cancel where possible.',2);
    insert into faqs (organization_id, question, body, sort) values (v_org,'Do you offer refunds?','Refunds follow our standard policy; reach out to support and we''ll sort it out quickly.',3);
    insert into faqs (organization_id, question, body, sort) values (v_org,'How do I contact support?','Use the contact form on this site or email us — we usually reply within a few hours.',4);
    insert into faqs (organization_id, question, body, sort) values (v_org,'Where are you based?','We operate online and serve customers worldwide, with local partners where listed.',5);
  end if;
  if not exists (select 1 from blog_posts where organization_id = v_org) then
    insert into blog_posts (organization_id, slug, title, excerpt, body, cover_url, author, published_at) values (v_org,'48-hours-in-lisbon','48 Hours in Lisbon','Where to stay, eat and wander on a short break.','Where to stay, eat and wander on a short break. In this piece we go a little deeper, with practical tips you can use today. Thanks for reading — explore the rest of the site for more.','https://images.pexels.com/photos/1591361/pexels-photo-1591361.jpeg','The Team', now() - interval '0 days');
    insert into blog_posts (organization_id, slug, title, excerpt, body, cover_url, author, published_at) values (v_org,'packing-light-guide','The Art of Packing Light','Travel carry-on only without leaving essentials behind.','Travel carry-on only without leaving essentials behind. In this piece we go a little deeper, with practical tips you can use today. Thanks for reading — explore the rest of the site for more.','https://images.pexels.com/photos/27702537/pexels-photo-27702537.jpeg','The Team', now() - interval '1 days');
    insert into blog_posts (organization_id, slug, title, excerpt, body, cover_url, author, published_at) values (v_org,'best-coastal-stays','Our Favourite Coastal Stays','Hand-picked places to wake up to the sea.','Hand-picked places to wake up to the sea. In this piece we go a little deeper, with practical tips you can use today. Thanks for reading — explore the rest of the site for more.','https://images.pexels.com/photos/6130047/pexels-photo-6130047.jpeg','The Team', now() - interval '2 days');
  end if;
  if not exists (select 1 from pricing_plans where organization_id = v_org) then
    insert into pricing_plans (organization_id, name, price_cents, interval, features, highlighted, sort) values (v_org,'Starter',0,'monthly','["Browse the full catalogue","Standard support","Email confirmations"]'::jsonb,false,0);
    insert into pricing_plans (organization_id, name, price_cents, interval, features, highlighted, sort) values (v_org,'Plus',1900,'monthly','["Everything in Starter","Priority support","Member-only offers","Free changes"]'::jsonb,true,1);
    insert into pricing_plans (organization_id, name, price_cents, interval, features, highlighted, sort) values (v_org,'Pro',4900,'monthly','["Everything in Plus","Dedicated account manager","Best available rates","24/7 support"]'::jsonb,false,2);
  end if;
  if not exists (select 1 from partners where organization_id = v_org) then
    insert into partners (organization_id, name, role, location, rating, handle, sort) values (v_org,'Jane Smith','Superhost','Madison, US',4.9,'jane-smith',0);
    insert into partners (organization_id, name, role, location, rating, handle, sort) values (v_org,'Carlos Mendez','Host','Barcelona, ES',4.8,'carlos-mendez',1);
    insert into partners (organization_id, name, role, location, rating, handle, sort) values (v_org,'Yuki Tanaka','Experience host','Kyoto, JP',5,'yuki-tanaka',2);
    insert into partners (organization_id, name, role, location, rating, handle, sort) values (v_org,'Amara Obi','Host','Lagos, NG',4.7,'amara-obi',3);
  end if;
  insert into cms_pages (organization_id, slug, title, body, status, published_at) values
    (v_org,'about','About us','We''re on a mission to make great experiences effortless. This business runs on Phoxta — every product, booking and message here is real and managed from one place.','published',now()),
    (v_org,'terms','Terms & Conditions','These are the terms that govern your use of this site and any purchase or booking you make. Please read them carefully.','published',now()),
    (v_org,'privacy','Privacy Policy','We respect your privacy and only use your information to fulfil your orders, bookings and enquiries.','published',now())
  on conflict (organization_id, slug) do nothing;
  update products set gallery = jsonb_build_array(image_url) where organization_id = v_org and (gallery is null or gallery = '[]'::jsonb) and image_url is not null and image_url <> '';
  raise notice '[content seed] % done', 'travel-demo';
end $$;
