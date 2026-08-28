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
fs.writeFileSync(path.join(TMP, "social-stub.ts"), `
export const PLATFORM_NAMES = { instagram: "Instagram", linkedin: "LinkedIn", tiktok: "TikTok", x: "X" };
export const listSocialAccounts = async () => ({ data: { accounts: [
  { id: "1", platform: "instagram", handle: "@p.r.o_of_africa", display_name: "", avatar_url: "", status: "connected", last_error: "", updated_at: "" },
  { id: "2", platform: "linkedin", handle: "Femi Adeyemi", display_name: "", avatar_url: "", status: "connected", last_error: "", updated_at: "" },
], limits: {} }, error: null });
export const connectSocial = async () => ({ data: null, error: "not in the rig", needs: [], redirectUri: "" });
export const disconnectSocialAccount = async () => ({ data: null, error: null });
export const listSocialPosts = async () => ({ data: { posts: [] }, error: null });
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
    "@/lib/db/ops/social": path.join(TMP, "social-stub.ts"),
    "@/pages/dashboard/ops/designs/DesignPicker": path.join(TMP, "picker-stub.tsx"),
  },
});

// The console's own variables, so the rig is not a grey box of unset tokens.
const theme = fs.readFileSync(path.join(ROOT, "src/styles/dashboard-theme.css"), "utf8");
fs.writeFileSync(path.join(TMP, "index.html"), `<!doctype html><html><head><meta charset="utf-8">
<style>${theme}${fs.readFileSync(path.join(ROOT, "src/pages/dashboard/ops/designs.css"), "utf8")}
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

// ── editing on the canvas ─────────────────────────────────────────────────
// Click a paragraph in the PREVIEW (not the sidebar), type into it, click away,
// and the block behind it must have changed. That is the whole feature; if the
// caret lands in a wrapper or the frame is rewritten mid-keystroke, this fails.
{
  const f = await pg.$("iframe");
  const doc = await f.contentFrame();
  // The standfirst: a plain paragraph, deep in the article.
  const target = await doc.$('[data-px="3"]');
  if (!target) {
    console.log("  CANVAS: no block marker found — editing on the canvas is not wired");
  } else {
    await target.click();
    await new Promise((r) => setTimeout(r, 350));
    const outlined = await doc.$eval('[data-px="3"]', (el) => el.style.outline);
    const editable = await doc.$$eval('[contenteditable="true"]', (n) => n.length);
    const before = await pg.evaluate(() => document.querySelector('.emc__row.is-on .emc__rowText')?.textContent ?? "");
    // Type into it the way a person does.
    const caret = await doc.$('[contenteditable="true"]');
    if (caret) {
      // Select the paragraph the way a person does — triple-click — rather
      // than Ctrl+A, which in an iframe can select the whole document.
      await caret.click({ clickCount: 3 });
      const focus = await doc.evaluate(() => ({
        active: document.activeElement?.tagName ?? "none",
        editable: document.activeElement?.getAttribute?.("contenteditable") ?? "no",
        sel: (document.getSelection?.()?.toString() ?? "").slice(0, 24),
        design: document.designMode,
      }));
      console.log(`  canvas: focus=${focus.active} editable=${focus.editable} selection="${focus.sel}"`);
      // Put the caret in explicitly. A triple-click reported an empty
      // selection, which is what led here: the click focuses the element but
      // leaves no range, so keystrokes have nowhere to land.
      await doc.evaluate(() => {
        const el = document.querySelector('[contenteditable="true"]');
        const r = document.createRange();
        r.selectNodeContents(el);
        const s = document.getSelection();
        s.removeAllRanges();
        s.addRange(r);
      });
      await pg.keyboard.type("Edited straight on the canvas.");
      const typed = await doc.$eval('[contenteditable="true"]', (el) => el.innerText);
      console.log(`  canvas: after typing the element reads "${typed.slice(0, 40)}"`);
      // Blur by clicking the paper margin inside the frame: outside the card,
      // so it is not another block.
      const fbox = await f.boundingBox();
      await pg.mouse.click(fbox.x + 8, fbox.y + 8);
      await new Promise((r) => setTimeout(r, 400));
    }
    const toolbar = await pg.evaluate(() => {
      const b = document.querySelector(".emq");
      return b ? (b.querySelector(".emq__t")?.textContent ?? "?") : null;
    });
    console.log(`  canvas: toolbar ${toolbar ? 'over the block, reading "' + toolbar + '"' : "MISSING"}`);
    const after = await pg.evaluate(() => document.querySelector('.emc__row.is-on .emc__rowText')?.textContent ?? "");
    console.log(`  canvas: outline ${outlined ? "on" : "MISSING"} · ${editable} caret field(s)`);
    console.log(`  canvas: sidebar said "${before.slice(0, 28)}…" then "${after.slice(0, 34)}…"`);
    if (!after.startsWith("Edited straight on the canvas")) console.log("  CANVAS: the edit did NOT reach the block");
  }
}

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
await pg2.evaluate(() => {
  [...document.querySelectorAll(".dsn-start button")].find((b) => /accounts/i.test(b.textContent ?? ""))?.click();
});
await new Promise((r) => setTimeout(r, 700));
const rows = await pg2.evaluate(() => [...document.querySelectorAll(".soa__row .soa__name")].map((n) => n.textContent));
console.log("  accounts dialog: " + (rows.length ? rows.join(", ") : "DID NOT OPEN"));
await pg2.screenshot({ path: path.join(OUT, "accounts-dialog.png") });
await pg2.keyboard.press("Escape");
await new Promise((r) => setTimeout(r, 300));
await pg2.screenshot({ path: path.join(OUT, "start.png") });
await pg2.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.textContent?.includes("Create New"));
  b?.click();
});
await new Promise((r) => setTimeout(r, 400));
await pg2.screenshot({ path: path.join(OUT, "start-dialog.png") });

await pg2.close();

// ── the email tab: the same two buttons, and the Templates dialog ──────────
fs.writeFileSync(path.join(TMP, "posts-stub.ts"), `
export const listPlatformPosts = async () => ({ posts: [
  { id: "1", slug: "buy-dont-build", title: "Buy, don't build", excerpt: "Why assembling the software first is the slowest way to start.", status: "published" },
  { id: "2", slug: "what-an-ai-agent-does-at-3am", title: "What an AI agent does at 3am", excerpt: "The enquiries that arrive after everyone has gone home.", status: "published" },
], error: null });
`);
await build({
  entryPoints: [path.join(ROOT, "scripts/email-test/index-rig.tsx")],
  bundle: true, format: "esm", outfile: path.join(TMP, "index-rig.js"),
  jsx: "automatic", logLevel: "error",
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
    "import.meta.env": JSON.stringify({ VITE_SUPABASE_URL: "http://rig.invalid", VITE_SUPABASE_ANON_KEY: "rig", DEV: true, MODE: "development" }),
  },
  alias: {
    "@": path.join(ROOT, "src"),
    "@email": path.join(ROOT, "packages/email/src/render.ts"),
    "@email/brochure": path.join(ROOT, "packages/email/src/brochure.ts"),
    "@/lib/db/emailStudio": path.join(TMP, "db-stub.ts"),
    "@/lib/db/platformPosts": path.join(TMP, "posts-stub.ts"),
  },
});
fs.writeFileSync(path.join(TMP, "idx.html"), `<!doctype html><html><head><meta charset="utf-8">
<style>${theme}${designsCss}
  body{margin:0;font-family:'DM Sans',system-ui,sans-serif;background:var(--hrx-bg)}
</style></head><body><div id="root"></div><script type="module" src="./index-rig.js"></script></body></html>`);

const pg3 = await br.newPage();
await pg3.setViewport({ width: 1200, height: 760 });
pg3.on("pageerror", (e) => console.log("  PAGE ERROR: " + e.message));
await pg3.goto(pathToFileURL(path.join(TMP, "idx.html")).href, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 800));
const emailBtns = await pg3.evaluate(() => [...document.querySelectorAll(".dsn-start button")].map((b) => b.textContent?.trim()));
console.log("  email buttons: " + emailBtns.join(" | "));
await pg3.screenshot({ path: path.join(OUT, "email-index.png") });
await pg3.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Templates"))?.click();
});
await new Promise((r) => setTimeout(r, 500));
const groups = await pg3.evaluate(() => [...document.querySelectorAll(".emt-group")].map((g) => g.textContent));
console.log("  template groups: " + groups.join(" | "));
await pg3.screenshot({ path: path.join(OUT, "email-templates.png") });

await pg3.close();

// ── cutting an imported design into linkable parts ────────────────────────
await build({
  entryPoints: [path.join(ROOT, "scripts/email-test/links-rig.tsx")],
  bundle: true, format: "esm", outfile: path.join(TMP, "links-rig.js"),
  jsx: "automatic", logLevel: "error",
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
    "import.meta.env": JSON.stringify({ VITE_SUPABASE_URL: "http://rig.invalid", VITE_SUPABASE_ANON_KEY: "rig", DEV: true, MODE: "development" }),
  },
  alias: { "@": path.join(ROOT, "src"), "@email": path.join(ROOT, "packages/email/src/render.ts") },
});
fs.writeFileSync(path.join(TMP, "links.html"), `<!doctype html><html><head><meta charset="utf-8">
<style>${theme}${designsCss}
  body{margin:0;font-family:'DM Sans',system-ui,sans-serif;background:var(--hrx-bg)}
</style></head><body><div id="root"></div><script type="module" src="./links-rig.js"></script></body></html>`);

const pg4 = await br.newPage();
await pg4.setViewport({ width: 520, height: 900 });
pg4.on("pageerror", (e) => console.log("  PAGE ERROR: " + e.message));
await pg4.goto(pathToFileURL(path.join(TMP, "links.html")).href, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 500));

// Click a third and two thirds down: the boundaries between the three bands.
const box = await (await pg4.$(".dlk__img")).boundingBox();
await pg4.mouse.click(box.x + box.width / 2, box.y + box.height / 3);
await new Promise((r) => setTimeout(r, 200));
await pg4.mouse.click(box.x + box.width / 2, box.y + (box.height * 2) / 3);
await new Promise((r) => setTimeout(r, 300));
const cut = await pg4.evaluate(() => ({
  cuts: window.block.cuts ?? [],
  parts: document.querySelectorAll(".dlk .emc__f--tight").length,
  lines: document.querySelectorAll(".dlk__cut").length,
}));
console.log(`  cuts at ${cut.cuts.join("% and ")}% · ${cut.parts} link fields · ${cut.lines} cut lines`);
await pg4.screenshot({ path: path.join(OUT, "design-links.png"), fullPage: true });

await br.close();
fs.rmSync(TMP, { recursive: true, force: true });
console.log("  wrote .rig/out/composer.png and composer-add.png");
