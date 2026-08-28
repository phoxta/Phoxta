/*
 * Bundle the browser half.
 *
 * It imports out of the app's own src via the @ alias, so the service can only
 * be built FROM the repo — which is the point. A copy of the renderer vendored
 * into this folder would drift from the editor the first time a layer type was
 * added, and nobody would notice until a published post looked wrong.
 *
 * esbuild through its JS API rather than the CLI: this repo lives under a path
 * with a space in it, and shelling out on Windows mangles the nested quotes in
 * --define.
 */
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const out = path.join(here, "dist");

fs.mkdirSync(out, { recursive: true });

await build({
  entryPoints: [path.join(here, "entry.tsx")],
  bundle: true,
  outfile: path.join(out, "render.js"),
  alias: { "@": path.join(root, "src") },
  define: { "process.env.NODE_ENV": '"production"' },
  minify: true,
  logLevel: "error",
});

// The page the headless browser loads. Inline, so the service serves one file
// and there is no second request to get wrong.
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html>
<meta charset="utf-8">
<title>design-render</title>
<style>html,body{margin:0;background:#fff}</style>
<div id="r"></div>
<script src="/render.js"></script>
`);

console.log("built", path.relative(root, out));
