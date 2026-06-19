-- Phoxta platform — 0062 demo: Aurelia (niche-apparel) business profile +
-- product-level reviews so the storefront's Contact (hours/map) and Product
-- Detail (per-product reviews) show live data end-to-end. Scoped to aurelia-demo.

update organizations set profile = $j$ {
  "address": "24 Atelier Lane, Marylebone, London W1U 4QR, UK",
  "phone": "+44 20 7935 1142",
  "email": "hello@aurelia.example",
  "mapQuery": "24 Marylebone Lane, London W1U",
  "hours": [
    {"day":"Monday","open":"10:00","close":"19:00","closed":false},
    {"day":"Tuesday","open":"10:00","close":"19:00","closed":false},
    {"day":"Wednesday","open":"10:00","close":"19:00","closed":false},
    {"day":"Thursday","open":"10:00","close":"20:00","closed":false},
    {"day":"Friday","open":"10:00","close":"20:00","closed":false},
    {"day":"Saturday","open":"10:00","close":"18:00","closed":false},
    {"day":"Sunday","open":"12:00","close":"17:00","closed":false}
  ]
} $j$::jsonb
where slug = 'aurelia-demo';

-- Seed a few product reviews tied to the org's real products (UUID subject_ref),
-- so the product detail pages show live reviews. Idempotent: only when none exist.
do $$
declare v_org uuid; r record; i int := 0;
  bodies text[] := array['Beautiful fabric and the fit is spot on. Will buy again.',
                         'Elevated everyday piece — looks far more expensive than it is.',
                         'Arrived quickly, impeccably packaged. Exactly as pictured.'];
  names  text[] := array['Eloise R.','Marcus T.','Priya N.'];
  titles text[] := array['Worth every penny','New wardrobe staple','Effortless quality'];
begin
  select id into v_org from organizations where slug = 'aurelia-demo';
  if v_org is not null and not exists (select 1 from reviews where organization_id = v_org and subject_type = 'product') then
    for r in select id from products where organization_id = v_org and status = 'active' order by created_at limit 3 loop
      i := i + 1;
      insert into reviews (organization_id, subject_type, subject_ref, author_name, rating, title, body, status)
      values (v_org, 'product', r.id::text, names[i], 5, titles[i], bodies[i], 'published');
    end loop;
  end if;
end $$;
