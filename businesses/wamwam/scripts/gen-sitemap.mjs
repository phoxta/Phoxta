// Emits public/sitemap.xml from the route manifest before `vite build`.
// Reads the manifest as text so the build tooling has no TS dependency.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = readFileSync(join(root, "src/routes/route-manifest.ts"), "utf8");
const brand = readFileSync(join(root, "src/config/brand.ts"), "utf8");

const host = /host:\s*"([^"]+)"/.exec(brand)?.[1];
if (!host) throw new Error("gen-sitemap: could not read BRAND.host");

const paths = [...manifest.matchAll(/path:\s*"([^"]+)"[^}]*sitemap:\s*true/g)].map((m) => m[1]);
if (!paths.length) throw new Error("gen-sitemap: no sitemap routes found in the manifest");

const today = new Date().toISOString().slice(0, 10);
const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    paths
        .map((p) => `  <url><loc>https://${host}${p === "/" ? "" : p}</loc><lastmod>${today}</lastmod></url>`)
        .join("\n") +
    `\n</urlset>\n`;

mkdirSync(join(root, "public"), { recursive: true });
writeFileSync(join(root, "public/sitemap.xml"), xml);
console.log(`gen-sitemap: ${paths.length} urls → public/sitemap.xml`);
