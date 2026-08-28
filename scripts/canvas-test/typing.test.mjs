/**
 * An audit of the text editor against what a Word or Docs user expects.
 *
 * Not "does it work" — it plainly does — but "does it behave the way every
 * other editor behaves". Every check below is a habit people arrive with, and
 * a habit that fails is experienced as the editor being broken even when each
 * individual feature is present.
 *
 * It found two real faults on its first run, both since fixed: the editor
 * select-alled on every open, so the first keystroke deleted a finished
 * headline; and the format bar offered no typeface or weight, because
 * runsToHtml never wrote either and a control for them would have appeared to
 * work while silently losing the setting.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const ROOT = process.argv[2];
const SP = process.argv[3];
const MIME = { ".js": "text/javascript", ".svg": "image/svg+xml", ".css": "text/css",
               ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2" };
const FONTS = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=DM+Sans:wght@400;500;700&display=swap";

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  if (url === "/") {
    res.writeHead(200, { "content-type": "text/html" });
    return res.end(`<!doctype html><meta charset=utf-8><link href="${FONTS}" rel=stylesheet><link href="/designs.css" rel=stylesheet><style>*{margin:0}</style><div id=r></div><script src="/rig.js"></script>`);
  }
  const file = url === "/rig.js" ? path.join(SP, "editor-rig.js")
    : url === "/designs.css" ? path.join(ROOT, "src/pages/dashboard/ops/designs.css")
    : path.join(ROOT, "public", decodeURIComponent(url));
  fs.readFile(file, (e, b) => {
    if (e) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
    res.end(b);
  });
});
await new Promise((r) => server.listen(0, r));

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1320, height: 760 });
await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: "networkidle0" });
await page.waitForFunction(() => window.rig?.layers?.length);
await page.evaluate(() => document.fonts.ready);

const settle = (ms = 160) => new Promise((r) => setTimeout(r, ms));
const rig = () => page.evaluate(() => window.rig);

let pass = 0, fail = 0;
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log("  PASS " + name); return; }
  fail++;
  console.log("  FAIL " + name + (detail ? "  —  " + detail : ""));
};

/** Canvas units to screen pixels, via the SVG's own matrix. */
const toClient = (x, y) => page.evaluate((x, y) => {
  const svg = document.querySelector("svg");
  const p = svg.createSVGPoint(); p.x = x; p.y = y;
  const q = p.matrixTransform(svg.getScreenCTM());
  return { x: q.x, y: q.y };
}, x, y);

/** Open the first roomy text layer, the way a person does: two real clicks.
 *  The canvas recognises a timed double-press, not a dblclick event. */
async function open() {
  const scene = await rig();
  const text = scene.layers.find((l) => l.type === "text" && !l.locked && l.w > 200);
  const c = await toClient(text.x + text.w / 2, text.y + text.h / 2);
  await page.mouse.click(c.x, c.y);
  await settle(70);
  await page.mouse.click(c.x, c.y);
  await settle(260);
  return text;
}

const editor = () => page.$(".dsn-textedit [contenteditable]");
const readText = async () => page.evaluate(() =>
  document.querySelector(".dsn-textedit [contenteditable]")?.innerText ?? "");
const readRuns = async (slot) => page.evaluate((s) => {
  const v = window.rig.raw?.[s];
  return Array.isArray(v) ? v : [{ text: String(v ?? "") }];
}, slot);

const layer = await open();
const el = await editor();
check("the editor opens on the canvas", Boolean(el));

if (el) {
  // ── 1. placeholder replaces; your own words do not ──────────────────────
  //
  // Opening "Your headline here" and typing should replace the lot. Opening
  // copy you already wrote and typing should NOT — having the first keystroke
  // delete a finished headline is the single thing that made this editor feel
  // unlike every other one.
  {
    const placeholder = await readText();
    await page.keyboard.type("Mine now");
    await settle();
    const replaced = await readText();
    check("placeholder copy is replaced wholesale",
          replaced === "Mine now",
          `"${placeholder}" became "${replaced}"`);

    // Close, then reopen the same layer — its words are now the person's own.
    await page.keyboard.press("Escape");
    await settle(200);
    await open();
    await settle(160);
    const mine = await readText();
    await page.keyboard.type("!");
    await settle();
    const after = await readText();
    check("copy you wrote yourself survives the next keystroke",
          after.length > mine.length && after.includes("Mine now"),
          `"${mine}" became "${after}"`);
  }

  // ── 2. the shortcuts every editor has ───────────────────────────────────
  for (const [key, mark, label] of [["KeyB", "bold", "Ctrl+B"], ["KeyI", "italic", "Ctrl+I"], ["KeyU", "underline", "Ctrl+U"]]) {
    await page.evaluate(() => {
      const host = document.querySelector(".dsn-textedit [contenteditable]");
      const r = document.createRange();
      r.selectNodeContents(host);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    });
    await page.keyboard.down("Control"); await page.keyboard.press(key); await page.keyboard.up("Control");
    await settle();
    const runs = await readRuns(layer.slot);
    check(`${label} applies ${mark}`, runs.some((r) => r[mark]),
          JSON.stringify(runs).slice(0, 90));
    await page.keyboard.down("Control"); await page.keyboard.press(key); await page.keyboard.up("Control");
    await settle(80);
  }

  // ── 3. undo, which people press without thinking ────────────────────────
  await page.evaluate(() => {
    const host = document.querySelector(".dsn-textedit [contenteditable]");
    const r = document.createRange();
    r.selectNodeContents(host); r.collapse(false);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  });
  const pre = await readText();
  await page.keyboard.type(" undo me");
  await settle();
  await page.keyboard.down("Control"); await page.keyboard.press("KeyZ"); await page.keyboard.up("Control");
  await settle(200);
  const post = await readText();
  check("Ctrl+Z undoes typing", post === pre, `"${pre}" -> typed -> "${post}"`);

  // ── 4. the selection toolbar people now expect ──────────────────────────
  await page.evaluate(() => {
    const host = document.querySelector(".dsn-textedit [contenteditable]");
    const r = document.createRange();
    r.selectNodeContents(host);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  });
  await settle(220);
  const barVisible = await page.evaluate(() => Boolean(document.querySelector(".txb")));
  check("a format bar appears over a selection", barVisible);

  const barHas = await page.evaluate(() => ({
    marks: document.querySelectorAll(".txb button:not(.txb__swatch)").length,
    swatches: document.querySelectorAll(".txb__swatch").length,
    font: Boolean(document.querySelector(".txb select")),
  }));
  check("the bar offers a font for the selection", barHas.font,
        `only ${barHas.marks} buttons and ${barHas.swatches} colours — no typeface or weight`);
}

console.log(`\ntyping: ${pass} passed, ${fail} failed`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
