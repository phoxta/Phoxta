#!/usr/bin/env node
/**
 * Push packages/shared-chat into every storefront, or verify none has drifted.
 *
 *   node scripts/sync-shared.mjs          # write the copies
 *   node scripts/sync-shared.mjs --check  # exit 1 if any copy differs
 *
 * Why copy instead of import: each storefront is a separate Vercel project
 * deployed from its own folder, so only that folder is uploaded and the repo
 * root does not exist at build time. A workspace dependency would resolve on a
 * developer's machine and fail in the build. Vendoring is therefore a build
 * requirement, and this script is what stops five copies drifting apart — which
 * is exactly how the storefront chat ended up broken on four of five stores.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

/** canonical source → the path it is vendored to inside each storefront */
const FILES = [{ from: "packages/shared-chat/src/chatRich.tsx", to: "src/lib/chatRich.tsx" }];

const APPS = ["carento", "gearo", "travel", "niche-apparel", "restaurant-orders"];

/** The platform SPA lives at the repo root, not under businesses/, so it needs
 *  its own target. It is a consumer like any other: phoxta.com now has the same
 *  chat rendering its tenants do. */
const ROOT_TARGETS = [{ from: "packages/shared-chat/src/chatRich.tsx", to: "src/lib/chatRich.tsx" }];

const BANNER = (src) =>
  `// GENERATED FILE — do not edit.\n` +
  `// Source: ${src}\n` +
  `// Update that file, then run: npm run shared:sync\n`;

let drifted = 0;
let written = 0;

for (const { from, to } of FILES) {
  const srcPath = join(root, from);
  if (!existsSync(srcPath)) {
    console.error(`missing canonical source: ${from}`);
    process.exit(1);
  }
  const body = BANNER(from) + readFileSync(srcPath, "utf8");

  const targets = APPS.map((app) => join(root, "businesses", app, to));
  for (const rt of ROOT_TARGETS) if (rt.from === from) targets.push(join(root, rt.to));

  for (const dest of targets) {
    const label = dest.slice(root.length + 1).split("\\").join("/");
    const current = existsSync(dest) ? readFileSync(dest, "utf8") : null;
    if (current === body) continue;

    if (check) {
      drifted++;
      console.error(`DRIFT  ${label}`);
      continue;
    }
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, body, "utf8");
    written++;
    console.log(`  wrote ${label}`);
  }
}

if (check) {
  if (drifted) {
    console.error(`\n${drifted} vendored file(s) differ from packages/. Run: npm run shared:sync`);
    process.exit(1);
  }
  console.log("shared files are in sync");
} else {
  console.log(written ? `\nsynced ${written} file(s)` : "already in sync");
}
