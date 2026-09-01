/**
 * Runs format.test.mjs in a real browser.
 *
 * execCommand and DOM ranges have no meaning in node, and the thing worth
 * testing is the bridge the editor actually uses — runsToHtml out, a selection
 * styled the way the toolbar styles it, htmlToRuns back.
 */
import { build } from "esbuild";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";
const root = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fmt-"));
await build({
  entryPoints: [path.join(root, "src/lib/designs/html.ts")],
  bundle: true, format: "esm", outfile: path.join(tmp, "html.bundle.mjs"),
  alias: { "@": path.join(root, "src") }, logLevel: "error",
});
// The toolbar's swatch roles and the shipped palette, bundled from the REAL
// modules rather than restated in the test. This is the net for the drift
// where the toolbar's list carried "muted" and "bg" — roles the Palette does
// not have — and two swatches painted every word black: the test asserts each
// exported role resolves through the real paint().
await build({
  stdin: {
    contents:
      'export { SWATCH_ROLES } from "@/pages/dashboard/ops/designs/TextFormatBar";\n' +
      'export { paint, DEFAULT_PALETTE } from "@/lib/designs/types";\n',
    resolveDir: root,
    loader: "ts",
  },
  bundle: true, format: "esm", outfile: path.join(tmp, "roles.bundle.mjs"),
  alias: { "@": path.join(root, "src") },
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "error",
});
fs.copyFileSync(new URL("./format.test.mjs", import.meta.url), path.join(tmp, "t.mjs"));
fs.writeFileSync(path.join(tmp, "i.html"),
  `<!doctype html><body><script type="module" src="./t.mjs"></script></body>`);
const br = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--allow-file-access-from-files"] });
const pg = await br.newPage();
pg.on("console", (m) => console.log("  " + m.text()));
pg.on("pageerror", (e) => console.log("  PAGE ERROR: " + e.message));
await pg.goto(pathToFileURL(path.join(tmp, "i.html")).href, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 900));
const res = await pg.evaluate(() => window.__result ?? null);
await br.close(); fs.rmSync(tmp, { recursive: true, force: true });
process.exit(res && res.fail === 0 ? 0 : 1);
