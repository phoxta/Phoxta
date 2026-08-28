/**
 * The canvas tests.
 *
 * Two halves. `snap.test.mjs` exercises the snapping arithmetic as plain
 * functions. `gestures.test.mjs` drives the real renderer in a real browser
 * with a real pointer, because the interesting failures in a canvas are not
 * arithmetic — they are a handle that swallows a press, a guide that is never
 * cleared, a commit frame that disagrees with the frame before it. None of
 * those show up in a unit test of the maths, and all three have happened here.
 *
 * Run with `npm run test:canvas`.
 *
 * esbuild is driven through its JS API rather than its CLI: this repo lives
 * under a path with a space in it, and shelling out on Windows turns the
 * --define flag's nested quotes into something cmd mangles.
 */
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "phoxta-canvas-"));
const node = (args) => execFileSync(process.execPath, args, { cwd: root, stdio: "inherit" });

const alias = { "@": path.join(root, "src") };

console.log("\n── snapping ─────────────────────────────────────────────────");
await build({
  entryPoints: [path.join(root, "src/lib/designs/snap.ts")],
  bundle: true, format: "esm", outfile: path.join(tmp, "snap.bundle.mjs"),
  alias, logLevel: "error",
});
fs.copyFileSync(path.join(here, "snap.test.mjs"), path.join(tmp, "snap.test.mjs"));
node([path.join(tmp, "snap.test.mjs")]);

console.log("\n── shapes ───────────────────────────────────────────────────");
await build({
  entryPoints: [path.join(root, "src/lib/designs/shapes.ts")],
  bundle: true, format: "esm", outfile: path.join(tmp, "shapes.bundle.mjs"),
  alias, logLevel: "error",
});
fs.copyFileSync(path.join(here, "shapes.test.mjs"), path.join(tmp, "shapes.test.mjs"));
node([path.join(tmp, "shapes.test.mjs")]);

console.log("\n── reordering ───────────────────────────────────────────────");
await build({
  entryPoints: [path.join(root, "src/lib/designs/edit.ts")],
  bundle: true, format: "esm", outfile: path.join(tmp, "edit.bundle.mjs"),
  alias, logLevel: "error",
});
fs.copyFileSync(path.join(here, "reorder.test.mjs"), path.join(tmp, "reorder.test.mjs"));
node([path.join(tmp, "reorder.test.mjs")]);

await build({
  entryPoints: [path.join(root, "src/lib/designs/types.ts")],
  bundle: true, format: "esm", outfile: path.join(tmp, "types.bundle.mjs"),
  alias, logLevel: "error",
});
fs.copyFileSync(path.join(here, "deck.test.mjs"), path.join(tmp, "deck.test.mjs"));
node([path.join(tmp, "deck.test.mjs")]);

console.log("\n── duplicating ──────────────────────────────────────────────");
await build({
  entryPoints: [path.join(root, "src/lib/designs/templates.ts")],
  bundle: true, format: "esm", outfile: path.join(tmp, "templates.bundle.mjs"),
  alias, logLevel: "error",
});
fs.copyFileSync(path.join(here, "duplicate.test.mjs"), path.join(tmp, "duplicate.test.mjs"));
node([path.join(tmp, "duplicate.test.mjs")]);

console.log("\n── partial formatting ───────────────────────────────────");
// Runs in a real browser: execCommand and DOM ranges have no meaning in node,
// and the bridge this exercises is the one the editor actually uses.
node([path.join(here, "format-runner.mjs")]);

console.log("\n── gestures ─────────────────────────────────────────────────");
await build({
  entryPoints: [path.join(here, "rig.tsx")],
  bundle: true, outfile: path.join(tmp, "rig.js"),
  alias, logLevel: "error",
  define: { "process.env.NODE_ENV": '"development"' },
});
node([path.join(here, "gestures.test.mjs"), root, tmp]);

console.log("\n── preview parity ───────────────────────────────────────────");
await build({
  entryPoints: [path.join(here, "parity-rig.tsx")],
  bundle: true, outfile: path.join(tmp, "parity-rig.js"),
  alias, logLevel: "error",
  define: { "process.env.NODE_ENV": '"development"' },
});
node([path.join(here, "parity.test.mjs"), root, tmp]);

console.log("\n── editing ─────────────────────────────────────────────────");
await build({
  entryPoints: [path.join(here, "editor-rig.tsx")],
  bundle: true, outfile: path.join(tmp, "editor-rig.js"),
  alias, logLevel: "error",
  define: { "process.env.NODE_ENV": '"development"' },
});
node([path.join(here, "editor.test.mjs"), root, tmp]);

console.log("\n── typing habits ──────────────────────────────────────");
node([path.join(here, "typing.test.mjs"), root, tmp]);

fs.rmSync(tmp, { recursive: true, force: true });
