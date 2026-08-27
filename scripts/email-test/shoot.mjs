import { build } from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

/**
 * A picture of the composer, because "it compiles" and "it is usable" are
 * different claims and only one of them can be checked by a type system.
 *
 * The two modules that would open a socket are aliased away; everything else —
 * the component, the block specs, the renderer inside the preview iframe — is
 * the real thing.
 */
const ROOT = process.cwd();
const OUT = path.join(ROOT, ".rig", "out");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "email-rig-"));
fs.mkdirSync(OUT, { recursive: true });

fs.writeFileSync(path.join(TMP, "db-stub.ts"), `
export const saveEmail = async () => ({ data: { id: "rig" }, error: null });
export const sendEmail = async () => ({ data: { ok: true }, error: null });
export const sendTest = async () => ({ data: { ok: true }, error: null });
export const listEmails = async () => ({ data: { templates: [] }, error: null });
export const getEmail = async () => ({ data: null, error: null });
export const deleteEmail = async () => ({ data: null, error: null });
export const emailFromPost = async () => ({ data: null, error: null });
`);
fs.writeFileSync(path.join(TMP, "picker-stub.tsx"), `
export function DesignPicker() { return null; }
`);

await build({
  entryPoints: [path.join(ROOT, "scripts/email-test/composer-rig.tsx")],
  bundle: true, format: "esm", outfile: path.join(TMP, "rig.js"),
  jsx: "automatic", logLevel: "error",
  // Something in the console shell reaches for the Supabase client at import
  // time; without these the whole tree fails to mount and the rig photographs
  // an empty page while reporting success.
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
    "import.meta.env": JSON.stringify({ VITE_SUPABASE_URL: "http://rig.invalid", VITE_SUPABASE_ANON_KEY: "rig", DEV: true, MODE: "development" }),
  },
  alias: {
    "@": path.join(ROOT, "src"),
    "@email": path.join(ROOT, "packages/email/src/render.ts"),
    "@/lib/db/emailStudio": path.join(TMP, "db-stub.ts"),
    "@/pages/dashboard/ops/designs/DesignPicker": path.join(TMP, "picker-stub.tsx"),
  },
});

// The console's own variables, so the rig is not a grey box of unset tokens.
const theme = fs.readFileSync(path.join(ROOT, "src/styles/dashboard-theme.css"), "utf8");
fs.writeFileSync(path.join(TMP, "index.html"), `<!doctype html><html><head><meta charset="utf-8">
<style>${theme}
  body{margin:0;font-family:'DM Sans',system-ui,sans-serif;background:var(--hrx-bg)}
  .hrx-seeall{padding:7px 12px;border:1px solid var(--hrx-border);border-radius:8px;background:var(--hrx-card);font-size:13px;cursor:pointer;color:var(--hrx-ink)}
  .opx-solid{background:var(--hrx-ink);color:#fff;border-color:var(--hrx-ink)}
  .dsn-note{font-size:12.5px;color:var(--hrx-muted);margin:6px 0 0}
  .opx-note{font-size:13px;color:var(--hrx-muted)}
</style></head><body><div id="root" class="hrx"></div><script type="module" src="./rig.js"></script></body></html>`);

const br = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--allow-file-access-from-files"] });
const pg = await br.newPage();
await pg.setViewport({ width: 1500, height: 980, deviceScaleFactor: 1 });
pg.on("pageerror", (e) => console.log("  PAGE ERROR: " + e.message));
pg.on("console", (m) => { if (m.type() === "error") console.log("  CONSOLE: " + m.text().slice(0, 160)); });
await pg.goto(pathToFileURL(path.join(TMP, "index.html")).href, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 1200));

const seen = await pg.evaluate(() => ({
  rows: document.querySelectorAll(".emc__row").length,
  hasPreview: !!document.querySelector(".emc__stage iframe"),
  firstRow: document.querySelector(".emc__rowType")?.textContent ?? "",
}));
console.log(`  ${seen.rows} block rows · preview ${seen.hasPreview ? "mounted" : "MISSING"} · first is “${seen.firstRow}”`);

await pg.screenshot({ path: path.join(OUT, "composer.png") });
// And with the add menu open, since that is the other half of the surface.
await pg.evaluate(() => {
  const btns = [...document.querySelectorAll("button")];
  btns.find((b) => b.textContent?.trim() === "Add")?.click();
});
await new Promise((r) => setTimeout(r, 400));
await pg.screenshot({ path: path.join(OUT, "composer-add.png") });
await pg.close();

// ── the graphics tab's two start buttons, and the Create New dialog ────────
await build({
  entryPoints: [path.join(ROOT, "scripts/email-test/start-rig.tsx")],
  bundle: true, format: "esm", outfile: path.join(TMP, "start.js"),
  jsx: "automatic", logLevel: "error",
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
    "import.meta.env": JSON.stringify({ VITE_SUPABASE_URL: "http://rig.invalid", VITE_SUPABASE_ANON_KEY: "rig", DEV: true, MODE: "development" }),
  },
  alias: { "@": path.join(ROOT, "src"), "@email": path.join(ROOT, "packages/email/src/render.ts") },
});
const designsCss = fs.readFileSync(path.join(ROOT, "src/pages/dashboard/ops/designs.css"), "utf8");
fs.writeFileSync(path.join(TMP, "start.html"), `<!doctype html><html><head><meta charset="utf-8">
<style>${theme}${designsCss}
  body{margin:0;font-family:'DM Sans',system-ui,sans-serif;background:var(--hrx-bg)}
</style></head><body><div id="root"></div><script type="module" src="./start.js"></script></body></html>`);

const pg2 = await br.newPage();
await pg2.setViewport({ width: 1100, height: 620 });
pg2.on("pageerror", (e) => console.log("  PAGE ERROR: " + e.message));
await pg2.goto(pathToFileURL(path.join(TMP, "start.html")).href, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 700));
const labels = await pg2.evaluate(() => [...document.querySelectorAll(".dsn-start button")].map((b) => b.textContent?.trim()));
console.log("  start buttons: " + labels.join(" | "));
await pg2.screenshot({ path: path.join(OUT, "start.png") });
await pg2.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.textContent?.includes("Create New"));
  b?.click();
});
await new Promise((r) => setTimeout(r, 400));
await pg2.screenshot({ path: path.join(OUT, "start-dialog.png") });

await br.close();
fs.rmSync(TMP, { recursive: true, force: true });
console.log("  wrote .rig/out/composer.png and composer-add.png");
