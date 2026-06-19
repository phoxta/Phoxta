-- Phoxta platform — 0061 demo: Gearo (furniture/eCommerce) business profile +
-- a few published reviews so the storefront's Contact (hours/map) and Product
-- Detail (customer reviews) show live data end-to-end. Scoped to gearo-demo.

update organizations set profile = $j$ {
  "address": "48 Shoreditch High St, London E1 6JJ, UK",
  "phone": "+44 20 7946 0321",
  "email": "hello@gearo.example",
  "mapQuery": "48 Shoreditch High St, London E1 6JJ",
  "hours": [
    {"day":"Monday","open":"09:00","close":"18:00","closed":false},
    {"day":"Tuesday","open":"09:00","close":"18:00","closed":false},
    {"day":"Wednesday","open":"09:00","close":"18:00","closed":false},
    {"day":"Thursday","open":"09:00","close":"19:00","closed":false},
    {"day":"Friday","open":"09:00","close":"19:00","closed":false},
    {"day":"Saturday","open":"10:00","close":"17:00","closed":false},
    {"day":"Sunday","open":"","close":"","closed":true}
  ]
} $j$::jsonb
where slug = 'gearo-demo';

do $$
declare v_org uuid;
begin
  select id into v_org from organizations where slug = 'gearo-demo';
  if v_org is not null and not exists (select 1 from reviews where organization_id = v_org) then
    insert into reviews (organization_id, subject_type, author_name, rating, title, body, status) values
      (v_org, 'business', 'Hannah W.', 5, 'Built to last', 'The desk arrived early and the build quality is superb. Cable management is a nice touch.', 'published'),
      (v_org, 'business', 'Oliver P.', 5, 'Transformed my home office', 'Comfortable for long days and looks great on video calls. Highly recommend.', 'published'),
      (v_org, 'business', 'Sara K.', 4, 'Great value', 'Assembly took 20 minutes and the finish is premium. Knocked a star only on delivery slot options.', 'published');
  end if;
end $$;
