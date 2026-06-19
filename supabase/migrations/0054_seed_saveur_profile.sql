-- Phoxta platform — 0054 demo: Saveur business profile (hours/address/contact/map)
-- so the storefront shows it end-to-end. Scoped to saveur-demo.

update organizations set profile = $j$ {
  "address": "12 Rue de Rivoli, 75004 Paris, France",
  "phone": "+33 1 42 60 30 30",
  "email": "reservations@saveur.example",
  "mapQuery": "12 Rue de Rivoli, 75004 Paris",
  "hours": [
    {"day":"Monday","open":"","close":"","closed":true},
    {"day":"Tuesday","open":"12:00","close":"22:30","closed":false},
    {"day":"Wednesday","open":"12:00","close":"22:30","closed":false},
    {"day":"Thursday","open":"12:00","close":"22:30","closed":false},
    {"day":"Friday","open":"12:00","close":"23:00","closed":false},
    {"day":"Saturday","open":"18:00","close":"23:00","closed":false},
    {"day":"Sunday","open":"12:00","close":"21:00","closed":false}
  ]
} $j$::jsonb
where slug = 'saveur-demo';
