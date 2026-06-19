// Seed / repair the marketplace `blueprints` catalog (idempotent upsert by slug).
//
// Catalog writes are blocked for the public anon key by design (RLS), so this
// uses the SERVICE-ROLE key — a SERVER SECRET. Never commit it, never paste it
// in chat, never put it in a VITE_ var. Pass it at runtime via env:
//
//   PowerShell:  $env:SUPABASE_SERVICE_ROLE_KEY="..."; node scripts/seed-marketplace.mjs
//   bash:        SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-marketplace.mjs
//
// URL is read from VITE_SUPABASE_URL (.env.local) or SUPABASE_URL.

import { readFileSync } from "node:fs";

function readEnvLocal() {
  try {
    const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const out = {};
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2];
    }
    return out;
  } catch {
    return {};
  }
}

const envFile = readEnvLocal();
const url = process.env.SUPABASE_URL || envFile.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  console.error("Missing Supabase URL (VITE_SUPABASE_URL in .env.local or SUPABASE_URL).");
  process.exit(1);
}
if (!serviceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY env var (the service-role secret).");
  console.error('Run:  $env:SUPABASE_SERVICE_ROLE_KEY="..."; node scripts/seed-marketplace.mjs');
  process.exit(1);
}

const blueprints = [
  ["coffee-subscription", "Coffee Subscription", "A recurring coffee brand with an AI support assistant and automatic cart recovery.", "E-commerce", "standard", 120000, true],
  ["niche-apparel", "Niche Apparel", "An audience-ready apparel storefront with AI product copy and built-in SEO.", "E-commerce", "standard", 150000, true],
  ["hair-salon-booking", "Salon & Booking", "A local services business with an AI receptionist and automated SMS rebooking.", "Local services", "starter", 90000, true],
  ["dental-clinic-portal", "Dental Clinic Portal", "A patient portal with online booking, reminders and an AI front desk.", "Local services", "standard", 140000, false],
  ["newsletter-creator", "Newsletter / Creator", "A content business with subscriptions, an AI editor and audience tools.", "Content", "starter", 70000, true],
  ["marketing-agency", "Marketing Agency", "A service business with CRM, scheduling, invoicing and AI content.", "Service / agency", "standard", 180000, false],
  ["local-marketplace", "Local Marketplace", "A multi-vendor marketplace with split payouts, ratings and verified numbers.", "Marketplace", "premium", 310000, true],
  ["online-course-studio", "Online Course Studio", "A course platform with payments, community and an AI teaching assistant.", "Education", "premium", 220000, false],
  ["restaurant-orders", "Restaurant + Orders", "Online ordering, reservations and an AI assistant for a restaurant.", "Restaurant", "standard", 150000, false],
  ["niche-saas-starter", "Niche SaaS Starter", "A SaaS starter with subscriptions, accounts and an AI support layer.", "SaaS", "premium", 240000, false],
  ["carento", "Carento Car Marketplace", "A full car buying and selling marketplace with listings, financing tools and an AI assistant.", "Automotive", "premium", 390000, true],
  ["travel", "Wanderly Travel & Tours", "A travel booking site for trips, tours and stays, with an AI trip planner.", "Travel", "premium", 360000, true],
];

const rows = blueprints.map(([slug, name, tagline, vertical, tier, price_cents, verified]) => ({
  slug, name, tagline, vertical, tier, price_cents, verified, ai_included: true, status: "live",
  metrics: slug === "carento" ? { built: true, app: "businesses/carento" } : slug === "travel" ? { built: true, app: "businesses/travel" } : {},
}));

const res = await fetch(`${url}/rest/v1/blueprints?on_conflict=slug`, {
  method: "POST",
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
  },
  body: JSON.stringify(rows),
});

if (!res.ok) {
  console.error("Seed failed:", res.status, await res.text());
  process.exit(1);
}
const data = await res.json();
console.log(`✓ Upserted ${data.length} blueprints. Live catalog now includes carento + travel.`);
