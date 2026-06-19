// Generate public/sitemap.xml for the Phoxta marketing site.
//
//   node scripts/generate-sitemap.mjs
//
// Base URL comes from SITE_URL / VITE_SITE_URL (env or .env.local), default
// https://www.phoxta.com. Keep ROUTES in sync with SITEMAP_ROUTES in
// src/seo/seo.config.ts (the app's source of truth).

import { readFileSync, writeFileSync } from "node:fs";

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

const env = readEnvLocal();
const SITE_URL = (
    process.env.SITE_URL ||
    process.env.VITE_SITE_URL ||
    env.VITE_SITE_URL ||
    "https://www.phoxta.com"
).replace(/\/$/, "");

const ROUTES = [
    { path: "/", priority: 1.0, changefreq: "weekly" },
    { path: "/about-2", priority: 0.8, changefreq: "monthly" },
    { path: "/product-archive", priority: 0.9, changefreq: "weekly" },
    { path: "/pricing", priority: 0.8, changefreq: "monthly" },
    { path: "/services-1", priority: 0.7, changefreq: "monthly" },
    { path: "/services-2", priority: 0.6, changefreq: "monthly" },
    { path: "/services-3", priority: 0.6, changefreq: "monthly" },
    { path: "/team", priority: 0.6, changefreq: "monthly" },
    { path: "/careers", priority: 0.6, changefreq: "monthly" },
    { path: "/faqs", priority: 0.6, changefreq: "monthly" },
    { path: "/contact-1", priority: 0.7, changefreq: "yearly" },
    { path: "/blog-details", priority: 0.5, changefreq: "weekly" },
    { path: "/archive-1", priority: 0.5, changefreq: "weekly" },
    { path: "/privacy", priority: 0.3, changefreq: "yearly" },
    { path: "/terms", priority: 0.3, changefreq: "yearly" },
];

const lastmod = new Date().toISOString().slice(0, 10);

const urls = ROUTES.map(
    (r) => `  <url>
    <loc>${SITE_URL}${r.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority.toFixed(1)}</priority>
  </url>`
).join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

const out = new URL("../public/sitemap.xml", import.meta.url);
writeFileSync(out, xml, "utf8");
console.log(`✓ Wrote ${ROUTES.length} URLs to public/sitemap.xml (base ${SITE_URL}).`);
