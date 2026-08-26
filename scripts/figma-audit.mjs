/**
 * What the extractor is losing.
 *
 *   node scripts/figma-audit.mjs
 *
 * Before regenerating the pack it is worth knowing what the four
 * classification rules in figma-templates.mjs do NOT model, because every one
 * of those is a silent difference between the Figma frame and what Phoxta
 * renders — and a template that is missing a drop shadow or a fourth photo
 * slot still renders perfectly happily, which is exactly why nobody notices.
 *
 * Reads the file once and reports, per frame: node counts by type, rotated
 * nodes, effects, blend modes, masks, image slots past the third, and text
 * that carries anything the text layer cannot express.
 */
import fs from "node:fs";

const FILE_KEY = "U9BOOEbXYF9Ngk4NMB3mZD";

const m = fs.readFileSync(".env.local", "utf8").match(/^FIGMA_TOKEN=(.+)$/m);
if (!m) { console.error("No FIGMA_TOKEN in .env.local."); process.exit(1); }
const TOK = m[1].trim().replace(/^["']|["']$/g, "");

const r = await fetch(`https://api.figma.com/v1/files/${FILE_KEY}`, { headers: { "X-Figma-Token": TOK } });
if (!r.ok) { console.error(`${r.status} ${r.statusText}`); process.exit(1); }
const file = await r.json();

const page = file.document.children[0];
const frames = page.children.filter((c) => c.type === "FRAME");
console.log(`file "${file.name}"  version ${file.version}  —  ${frames.length} frames\n`);

const hasText = (n) => n.type === "TEXT" || (n.children ?? []).some(hasText);
const isImageSlot = (n) => /change image here/i.test(n.name ?? "");

/** The rotation Figma stores in the node's transform, in degrees. */
function rotationOf(n) {
  const t = n.relativeTransform;
  if (!t) return 0;
  const deg = (Math.atan2(t[1][0], t[0][0]) * 180) / Math.PI;
  return Math.round(deg * 100) / 100;
}

const totals = {
  rotated: [], effects: [], blend: [], masks: [], extraImages: [], truncated: [],
  strokeAlign: [], textOpacity: [], multiFillText: [], imageFills: [], types: {},
};

for (const f of frames) {
  let nodes = 0;
  const kinds = {};
  let imageN = 0;

  const walk = (n, depth) => {
    if (n.visible === false) return;
    nodes++;
    kinds[n.type] = (kinds[n.type] ?? 0) + 1;
    totals.types[n.type] = (totals.types[n.type] ?? 0) + 1;

    const where = `${f.name}/${n.name}`;
    const rot = rotationOf(n);
    if (Math.abs(rot) > 0.01) totals.rotated.push(`${where} ${rot}deg`);
    if ((n.effects ?? []).some((e) => e.visible !== false)) {
      totals.effects.push(`${where} ${n.effects.filter((e) => e.visible !== false).map((e) => e.type).join("+")}`);
    }
    if (n.blendMode && n.blendMode !== "PASS_THROUGH" && n.blendMode !== "NORMAL") totals.blend.push(`${where} ${n.blendMode}`);
    if (n.isMask) totals.masks.push(where);
    if (n.strokes?.length && n.strokeAlign && n.strokeAlign !== "CENTER") totals.strokeAlign.push(`${where} ${n.strokeAlign}`);
    if ((n.fills ?? []).some((p) => p.visible !== false && p.type === "IMAGE") && !isImageSlot(n)) {
      totals.imageFills.push(`${where}`);
    }

    if (isImageSlot(n)) {
      imageN++;
      // The extractor keeps only the first three; a fourth vanishes silently.
      if (imageN > 3) totals.extraImages.push(`${where} (#${imageN})`);
      return;
    }
    if (n.type === "TEXT") {
      if ((n.opacity ?? 1) < 1) totals.textOpacity.push(`${where} ${n.opacity}`);
      const fills = (n.fills ?? []).filter((p) => p.visible !== false);
      if (fills.length > 1) totals.multiFillText.push(`${where} ${fills.length} fills`);
      // Per-character overrides: the one thing a single-style text layer
      // genuinely cannot represent.
      if (n.characterStyleOverrides?.some((v) => v !== 0)) totals.truncated.push(`${where} mixed styles`);
      if (n.style?.textTruncation === "ENDING") totals.truncated.push(`${where} truncated`);
      return;
    }
    if (depth > 0 && !hasText(n)) return; // exported whole as SVG
    for (const c of n.children ?? []) walk(c, depth + 1);
  };
  walk(f, 0);

  const b = f.absoluteBoundingBox;
  console.log(`${f.name.padEnd(4)} ${Math.round(b.width)}x${Math.round(b.height)}  ${String(nodes).padStart(3)} nodes visited  ${JSON.stringify(kinds)}`);
}

const report = (label, list) => {
  if (!list.length) return console.log(`  ok    ${label}: none`);
  console.log(`  LOSS  ${label}: ${list.length}`);
  for (const s of list.slice(0, 12)) console.log(`          ${s}`);
  if (list.length > 12) console.log(`          … and ${list.length - 12} more`);
};

console.log(`\nnode types seen: ${JSON.stringify(totals.types)}\n`);
console.log("What the extractor cannot currently represent:");
report("rotated nodes", totals.rotated);
report("drop shadows / blurs", totals.effects);
report("blend modes", totals.blend);
report("masks", totals.masks);
report("image slots past the third", totals.extraImages);
report("non-centre stroke alignment", totals.strokeAlign);
report("text with layer opacity", totals.textOpacity);
report("text with several fills", totals.multiFillText);
report("mixed / truncated text", totals.truncated);
report("image fills outside a photo slot", totals.imageFills);
