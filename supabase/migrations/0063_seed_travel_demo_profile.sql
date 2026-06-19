-- Phoxta platform — 0063 demo: Travel (experiences) business profile so the
-- storefront Contact page shows live hours/address/map end-to-end. travel-demo
-- is an experiences operator. Scoped to travel-demo.
update organizations set profile = $j$ {
  "address": "14 Sukhumvit Soi 71, Phra Khanong, Bangkok 10110, Thailand",
  "phone": "+66 2 712 4455",
  "email": "hello@wander.example",
  "mapQuery": "Phra Khanong, Bangkok",
  "hours": [
    {"day":"Monday","open":"09:00","close":"18:00","closed":false},
    {"day":"Tuesday","open":"09:00","close":"18:00","closed":false},
    {"day":"Wednesday","open":"09:00","close":"18:00","closed":false},
    {"day":"Thursday","open":"09:00","close":"18:00","closed":false},
    {"day":"Friday","open":"09:00","close":"18:00","closed":false},
    {"day":"Saturday","open":"10:00","close":"16:00","closed":false},
    {"day":"Sunday","open":"10:00","close":"16:00","closed":false}
  ]
} $j$::jsonb
where slug = 'travel-demo';
