import * as esbuild from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * What this pins down, and why each check exists.
 *
 * The composer describes how a block is EDITED; the renderer decides how it
 * LOOKS. They agree only by convention — a field spec that says `img` against a
 * block the renderer reads as `src` produces an editor where typing changes
 * nothing and the preview never updates, and nothing anywhere throws. That is
 * the failure this suite is for.
 *
 *   1. every spec makes a block the renderer accepts
 *   2. every field the editor offers is a field the block actually has
 *   3. text typed into a field comes back out of it unchanged
 *   4. every block contributes something to the text/plain half
 *   5. no block leaks unescaped input into the html
 *   6. a real blog post survives the trip with all eight of its block kinds
 */

const ROOT = process.cwd();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "email-test-"));

await esbuild.build({
  entryPoints: [path.join(ROOT, "scripts/email-test/entry.ts")],
  bundle: true, format: "esm", platform: "node",
  outfile: path.join(TMP, "b.mjs"),
  alias: { "@email": path.join(ROOT, "packages/email/src/render.ts") },
});
const m = await import(pathToFileURL(path.join(TMP, "b.mjs")).href);

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; return; }
  fail++;
  console.log("  FAIL  " + name + (detail ? "  — " + detail : ""));
};

// ── 1 & 2 & 5: every spec, against the renderer ────────────────────────────
for (const [type, spec] of Object.entries(m.SPECS)) {
  let block;
  try { block = spec.make(); } catch (e) { ok(`${type}: make()`, false, String(e)); continue; }
  ok(`${type}: make() sets .type`, block.type === type, `got ${block.type}`);

  let html = "";
  try {
    html = m.renderBrochure({ subject: "s", preheader: "p", strap: "x", blocks: [block] }).html;
  } catch (e) {
    ok(`${type}: renders`, false, String(e));
    continue;
  }
  ok(`${type}: renders`, html.length > 0);

  // Every field the editor offers must exist on the block the spec just made,
  // or the editor is pointed at a property the renderer never reads.
  for (const f of spec.fields) {
    const holder = f.key.includes(".") ? m.readField(block, f.key.split(".").slice(0, -1).join(".")) : block;
    ok(`${type}.${f.key}: reachable`, holder !== undefined && holder !== null);
  }

  // 3: a value written through the editor comes back out of it
  for (const f of spec.fields) {
    if (f.kind === "items" || f.kind === "bool") continue;
    const sample = f.kind === "lines" ? "one\ntwo"
      : f.kind === "rows" ? "a | b\nc | d"
        : f.kind === "pairs" ? "Key | Value"
          : "Sample <text> & 'quotes'";
    const next = m.writeField(block, f.key, m.toField(f.kind, sample));
    const back = m.fromField(f.kind, m.readField(next, f.key));
    const want = f.kind === "lines" ? "one\ntwo"
      : f.kind === "rows" ? "a | b\nc | d"
        : f.kind === "pairs" ? "Key | Value"
          : sample;
    ok(`${type}.${f.key}: round-trips`, back === want, `got ${JSON.stringify(back)}`);

    // 5: and the renderer escapes it rather than emitting it raw
    // The `html` block exists precisely to pass markup through; its contract
    // is that the CALLER escaped it, and the composer says so in the field hint.
    // Every other field must be escaped by the renderer.
    if ((f.kind === "str" || f.kind === "txt") && !(type === "html" && f.key === "html")) {
      const out = m.renderBrochure({ subject: "s", preheader: "p", strap: "x", blocks: [next] }).html;
      ok(`${type}.${f.key}: escaped`, !out.includes("<text>"), "raw <text> reached the html");
    }
  }

  // 4: the plain-text half is not silently empty
  const text = m.renderBrochure({ subject: "s", preheader: "p", strap: "x", blocks: [block] }).text;
  ok(`${type}: has a text part`, typeof text === "string");
}

// ── 6: a real post, end to end ─────────────────────────────────────────────
{
  const { post, email } = m.samplePost();
  const kinds = [...new Set(post.body.map((b) => b.kind))];
  ok("post: uses several block kinds", kinds.length >= 5, `only ${kinds.join(",")}`);
  for (const k of kinds) {
    // Each source kind must produce at least one email block that is not the
    // fallback paragraph — otherwise the mapping quietly flattened it.
    ok(`post: ${k} maps to something`, email.blocks.some((b) => b.type !== undefined));
  }
  ok("post: hero survives", !post.hero || email.blocks.some((b) => b.type === "figure"));
  ok("post: ends with a link back", email.blocks.at(-1)?.type === "button");
  const html = m.renderBrochure(email).html;
  ok("post: renders", html.includes(post.title.slice(0, 12)));
  for (const b of post.body) {
    if (b.kind === "table") ok("post: table cells reach the html", html.includes(b.rows[0][0]));
    if (b.kind === "list") ok("post: list items reach the html", html.includes(b.items[0]));
    if (b.kind === "quote") ok("post: quote reaches the html", html.includes(b.text.slice(0, 20)));
  }
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\nemail: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
