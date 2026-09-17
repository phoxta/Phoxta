// Fetch a licensed photo from Pexels into public/images and record the credit.
//
//   node scripts/pexels.mjs "<search query>" <name> [w] [h] [--index n] [--orientation portrait|landscape|square]
//
// Writes public/images/<name>.jpg (cropped to w×h, default 960×640) and appends a
// line to public/images/CREDITS.md. Reads PEXELS_API_KEY from the repo root's
// .env.local. Deterministic: the same query + index gives the same photo.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, "..");
const env = fs.readFileSync(path.resolve(app, "../../.env.local"), "utf8");
const KEY = (env.match(/^PEXELS_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!KEY) throw new Error("PEXELS_API_KEY missing in .env.local");

const argv = process.argv.slice(2);
const flags = {};
const pos = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) flags[argv[i].slice(2)] = argv[++i];
  else pos.push(argv[i]);
}
const [query, name, wArg, hArg] = pos;
if (!query || !name) {
  console.error('usage: node scripts/pexels.mjs "<query>" <name> [w] [h] [--index n] [--orientation portrait|landscape|square]');
  process.exit(2);
}
const w = Number(wArg || 960), h = Number(hArg || 640), index = Number(flags.index || 0);
const orientation = flags.orientation || (w === h ? "square" : w > h ? "landscape" : "portrait");

const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${Math.max(5, index + 3)}&orientation=${orientation}`, { headers: { Authorization: KEY } });
if (!res.ok) throw new Error(`pexels ${res.status}`);
const data = await res.json();
const photo = data.photos?.[index] ?? data.photos?.[0];
if (!photo) throw new Error(`no photo for "${query}"`);
const base = photo.src.original.split("?")[0];
const url = `${base}?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;
const img = await fetch(url);
if (!img.ok) throw new Error(`download ${img.status}`);
const dir = path.resolve(app, "public/images");
fs.mkdirSync(dir, { recursive: true });
const dest = path.join(dir, `${name}.jpg`);
fs.writeFileSync(dest, Buffer.from(await img.arrayBuffer()));
const credits = path.join(dir, "CREDITS.md");
if (!fs.existsSync(credits)) fs.writeFileSync(credits, "# Photo credits\n\nAll photography from [Pexels](https://www.pexels.com), under the Pexels licence. Cropped for the app.\n\n");
const line = `- \`${name}.jpg\` - [${photo.photographer}](${photo.photographer_url}) - [photo ${photo.id}](${photo.url})\n`;
if (!fs.readFileSync(credits, "utf8").includes(`\`${name}.jpg\``)) fs.appendFileSync(credits, line);
console.log(`${name}.jpg <- ${photo.id} ${photo.photographer} (${fs.statSync(dest).size >> 10} KB) ${(photo.alt || "").slice(0, 60)}`);
