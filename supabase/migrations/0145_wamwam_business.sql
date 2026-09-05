-- Phoxta platform — 0145 the WamWam business (experiences).
--
-- A second, independently sellable experiences blueprint, served by its own
-- storefront deployment (businesses/wamwam → Vercel project `wamwam`,
-- wildcard *.wamwam.phoxta.com). Structurally a sibling of `travel`; the app is
-- a from-scratch re-engineering of that storefront.
--
-- Seeds: the blueprint row (starter catalogue derived from travel's experiences
-- with the real listing names from 0086 and matching addresses), a `wamwam-demo`
-- tenant (catalogue auto-seeded by the 0024 trigger), the demo.* showcase host,
-- profile, and content. Idempotent: keyed on slug/hostname throughout.
--
-- Follow-up once the Vercel project exists:
--   update blueprints set vercel_project_id = 'prj_…' where slug = 'wamwam';

-- ---------------------------------------------------------------------------
-- 1. Blueprint
-- ---------------------------------------------------------------------------
insert into blueprints (slug, name, tagline, description, vertical, tier, price_cents, currency,
                        cover_url, demo_url, verified, ai_included, status, app_path, subdomain_base, metrics, preset)
select
  'wamwam',
  'WamWam Experiences',
  'A bookable experiences storefront — tours, workshops and days out — with an AI concierge.',
  'An experiences marketplace storefront: hero search, category pages, listing detail with live availability and booking, guest booking lookup, blog, contact and customer accounts. Multi-tenant by host, built in React (Tailwind) and ready to brand.',
  'experience',
  coalesce(t.tier, 'premium'),
  coalesce(t.price_cents, 360000),
  coalesce(t.currency, 'USD'),
  coalesce(t.cover_url, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop&q=80'),
  'https://demo.wamwam.phoxta.com',
  true, true, 'live',
  'businesses/wamwam',
  'wamwam.phoxta.com',
  '{"built": true, "app": "businesses/wamwam"}'::jsonb,
  -- Starter catalogue: travel's experiences, with the faker names replaced by the
  -- real ones 0086 gave the travel demo, and each address brought into line with
  -- its new description (0086 changed descriptions but left metadata.address on
  -- "Neverland", which is what the card actually renders).
  jsonb_build_object('catalog', coalesce((
    select jsonb_agg(
      case e->>'name'
        when 'Generate interactive markets' then
          e || jsonb_build_object(
            'slug', 'experience-marrakech-souks-spice-market-tour',
            'name', 'Marrakech Souks & Spice Market Tour',
            'description', 'Jemaa el-Fnaa, Marrakech · 4.7★ (478 reviews)',
            'metadata', (e->'metadata') || jsonb_build_object('handle', 'marrakech-souks-spice-market-tour', 'address', 'Jemaa el-Fnaa, Marrakech', 'reviewStart', 4.7))
        when 'Deliver dynamic e-services' then
          e || jsonb_build_object(
            'slug', 'experience-kyoto-backstreets-food-walk',
            'name', 'Kyoto Backstreets Food Walk',
            'description', 'Gion District, Kyoto · 4.8★ (566 reviews)',
            'metadata', (e->'metadata') || jsonb_build_object('handle', 'kyoto-backstreets-food-walk', 'address', 'Gion District, Kyoto', 'reviewStart', 4.8))
        when 'Productize holistic deliverables' then
          e || jsonb_build_object(
            'slug', 'experience-dolomites-sunrise-hike-alpine-breakfast',
            'name', 'Dolomites Sunrise Hike & Alpine Breakfast',
            'description', 'Cortina d''Ampezzo, Italy · 4.9★ (147 reviews)',
            'metadata', (e->'metadata') || jsonb_build_object('handle', 'dolomites-sunrise-hike-alpine-breakfast', 'address', 'Cortina d''Ampezzo, Italy', 'reviewStart', 4.9))
        else e
      end)
    from jsonb_array_elements(coalesce(t.preset->'catalog', '[]'::jsonb)) e
    where e->'metadata'->>'vertical' = 'experience'
  ), '[]'::jsonb))
from (select * from blueprints where slug = 'travel') t
on conflict (slug) do update set
  name           = excluded.name,
  tagline        = excluded.tagline,
  description    = excluded.description,
  vertical       = excluded.vertical,
  cover_url      = excluded.cover_url,
  demo_url       = excluded.demo_url,
  app_path       = excluded.app_path,
  subdomain_base = excluded.subdomain_base,
  metrics        = excluded.metrics,
  preset         = excluded.preset,
  status         = 'live';

-- ---------------------------------------------------------------------------
-- 2. Demo tenant + showcase host
-- ---------------------------------------------------------------------------
do $$
declare
  v_uid uuid;
  v_org uuid;
begin
  select id into v_uid from auth.users
    order by (email = 'femi@phoxta.com') desc, created_at asc limit 1;
  if v_uid is null then raise notice '[wamwam seed] no auth user yet — skipping tenant'; return; end if;

  select id into v_org from organizations where slug = 'wamwam-demo';
  if v_org is null then
    -- Branding carries the NAME only. Colours/fonts would rewrite link and
    -- button colours site-wide via the brand override sheet; the storefront
    -- must look identical to its sibling out of the box.
    insert into organizations (owner_user_id, name, slug, vertical, blueprint_id, stage, lifecycle_stage,
                               app_path, modules, branding, profile, provisioned_at)
    select v_uid, 'WamWam', 'wamwam-demo', coalesce(b.vertical, 'experience'), b.id, 'trial', 'operating',
           coalesce(b.app_path, 'businesses/wamwam'), coalesce(b.preset, '{}'::jsonb),
           $b$ {"name":"WamWam","tagline":"Experiences worth the trip"} $b$::jsonb,
           $p$ {
             "address": "Rua Augusta 120, 1100-053 Lisboa, Portugal",
             "phone": "+351 21 346 0000",
             "email": "hello@wamwam.example",
             "mapQuery": "Rua Augusta, Lisbon",
             "hours": [
               {"day":"Monday","open":"09:00","close":"18:00","closed":false},
               {"day":"Tuesday","open":"09:00","close":"18:00","closed":false},
               {"day":"Wednesday","open":"09:00","close":"18:00","closed":false},
               {"day":"Thursday","open":"09:00","close":"18:00","closed":false},
               {"day":"Friday","open":"09:00","close":"18:00","closed":false},
               {"day":"Saturday","open":"10:00","close":"16:00","closed":false},
               {"day":"Sunday","open":"10:00","close":"16:00","closed":false}
             ]
           } $p$::jsonb,
           now()
    from blueprints b where b.slug = 'wamwam'
    returning id into v_org;
    raise notice '[wamwam seed] org created %', v_org;
  end if;

  -- Showcase host + the buyer-style host, both live. The org-insert trigger may
  -- already have created the buyer-style one; on conflict we simply reassert it.
  insert into domains (organization_id, hostname, kind, is_primary, status, tls_status, verified_at)
  values (v_org, 'demo.wamwam.phoxta.com',        'subdomain', false, 'live', 'issued', now()),
         (v_org, 'wamwam-demo.wamwam.phoxta.com', 'subdomain', true,  'live', 'issued', now())
  on conflict (hostname) do update
    set organization_id = excluded.organization_id,
        status          = 'live',
        tls_status      = 'issued',
        verified_at     = coalesce(domains.verified_at, now());
end $$;

-- ---------------------------------------------------------------------------
-- 3. Content: reviews, FAQs, blog, pricing, partners, CMS pages
-- ---------------------------------------------------------------------------
do $$
declare v_org uuid;
begin
  select id into v_org from organizations where slug = 'wamwam-demo';
  if v_org is null then return; end if;

  if not exists (select 1 from reviews where organization_id = v_org) then
    insert into reviews (organization_id, subject_type, subject_ref, author_name, rating, title, body)
      select v_org, 'product', p.id::text,
             (array['Amara K.','James T.','Sofia R.','Liam P.','Noah B.','Mia L.','Ava W.','Ben C.'])[1+(row_number() over () % 8)::int],
             4 + (row_number() over () % 2),
             'Worth every minute',
             'Our guide was brilliant and the pace was perfect. Booking took thirty seconds and everything ran exactly to time.'
      from products p where p.organization_id = v_org;
    insert into reviews (organization_id, subject_type, author_name, rating, title, body) values
      (v_org, 'business', 'Sofia L.', 5, 'Best day of the trip',   'Small group, real local knowledge, and a host who clearly loves what they do.'),
      (v_org, 'business', 'Noah K.',  5, 'Effortless to book',     'Picked a date, paid, done. Confirmation and directions arrived straight away.'),
      (v_org, 'business', 'Mia T.',   5, 'Would book again',       'Asked a question the night before and had an answer within the hour.');
  end if;

  if not exists (select 1 from faqs where organization_id = v_org) then
    insert into faqs (organization_id, question, body, sort) values
      (v_org, 'How do I book an experience?',        'Pick your date and group size on the listing, then complete checkout. Your confirmation and meeting-point details arrive by email right away.', 0),
      (v_org, 'What payment methods do you accept?', 'All major debit and credit cards are accepted securely at checkout.', 1),
      (v_org, 'Can I change or cancel a booking?',   'Yes — look up your booking with your reference and email, or contact us, and we''ll adjust or cancel where the host''s policy allows.', 2),
      (v_org, 'What happens if the weather is bad?', 'Outdoor experiences run in light rain. If a host has to cancel for safety, you''ll be offered another date or a full refund.', 3),
      (v_org, 'How do I contact support?',           'Use the contact form on this site or message the assistant — we usually reply within a few hours.', 4),
      (v_org, 'Are experiences suitable for children?', 'Each listing states its minimum age and whether it''s good for families. Ask us if you''re unsure.', 5);
  end if;

  if not exists (select 1 from blog_posts where organization_id = v_org) then
    insert into blog_posts (organization_id, slug, title, excerpt, body, cover_url, author, published_at) values
      (v_org, '48-hours-in-lisbon', '48 Hours in Lisbon', 'Where to eat, wander and watch the sun go down on a short break.',
       'Where to eat, wander and watch the sun go down on a short break. Start early in Alfama before the tour groups arrive, take the 28 tram only once, and save the miradouros for the hour before sunset. Thanks for reading — explore the rest of the site for more.',
       'https://images.pexels.com/photos/1591361/pexels-photo-1591361.jpeg', 'The Team', now() - interval '0 days'),
      (v_org, 'how-to-choose-a-food-tour', 'How to Choose a Food Tour', 'Group size, pace and who''s leading it matter more than the menu.',
       'Group size, pace and who''s leading it matter more than the menu. Look for hosts who live in the neighbourhood, groups under ten, and an itinerary that leaves room to linger. Thanks for reading — explore the rest of the site for more.',
       'https://images.pexels.com/photos/27702537/pexels-photo-27702537.jpeg', 'The Team', now() - interval '1 days'),
      (v_org, 'sunrise-hikes-worth-the-alarm', 'Sunrise Hikes Worth the Alarm', 'Five early starts that pay you back with the best light of the day.',
       'Five early starts that pay you back with the best light of the day. Dress for the summit, not the trailhead, and let the guide set the pace. Thanks for reading — explore the rest of the site for more.',
       'https://images.pexels.com/photos/6130047/pexels-photo-6130047.jpeg', 'The Team', now() - interval '2 days');
  end if;

  if not exists (select 1 from pricing_plans where organization_id = v_org) then
    insert into pricing_plans (organization_id, name, price_cents, interval, features, highlighted, sort) values
      (v_org, 'Explorer', 0,    'monthly', '["Browse every experience","Standard support","Email confirmations"]'::jsonb, false, 0),
      (v_org, 'Plus',     1900, 'monthly', '["Everything in Explorer","Priority support","Member-only dates","Free changes"]'::jsonb, true, 1),
      (v_org, 'Pro',      4900, 'monthly', '["Everything in Plus","Dedicated trip planner","Best available rates","24/7 support"]'::jsonb, false, 2);
  end if;

  if not exists (select 1 from partners where organization_id = v_org) then
    insert into partners (organization_id, name, role, location, rating, handle, sort) values
      (v_org, 'Yuki Tanaka',   'Experience host', 'Kyoto, JP',      5.0, 'yuki-tanaka',   0),
      (v_org, 'Hassan El Amrani', 'Experience host', 'Marrakech, MA', 4.8, 'hassan-el-amrani', 1),
      (v_org, 'Giulia Conti',  'Mountain guide',  'Cortina, IT',    4.9, 'giulia-conti',  2),
      (v_org, 'Marco Silva',   'Skipper',         'Lisbon, PT',     4.9, 'marco-silva',   3);
  end if;

  insert into cms_pages (organization_id, slug, title, body, status, published_at) values
    (v_org, 'about',   'About us',
     'We''re on a mission to make great experiences effortless to find and book. This business runs on Phoxta — every listing, booking and message here is real and managed from one place.',
     'published', now()),
    (v_org, 'terms',   'Terms & Conditions',
     'These are the terms that govern your use of this site and any booking you make. Please read them carefully.',
     'published', now()),
    (v_org, 'privacy', 'Privacy Policy',
     'We respect your privacy and only use your information to fulfil your bookings and enquiries.',
     'published', now())
  on conflict (organization_id, slug) do nothing;

  update products set gallery = jsonb_build_array(image_url)
   where organization_id = v_org and (gallery is null or gallery = '[]'::jsonb)
     and image_url is not null and image_url <> '';

  raise notice '[wamwam seed] content done for %', v_org;
end $$;
