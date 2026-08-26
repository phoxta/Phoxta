import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const ROOT = process.argv[2];
const SP = process.argv[3];
const MIME = { ".js": "text/javascript", ".svg": "image/svg+xml", ".css": "text/css",
               ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2" };

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  if (url === "/") {
    res.writeHead(200, { "content-type": "text/html" });
    return res.end('<!doctype html><meta charset=utf-8><style>*{margin:0}</style><div id=r></div><script src="/rig.js"></script>');
  }
  const file = url === "/rig.js" ? path.join(SP, "rig.js") : path.join(ROOT, "public", decodeURIComponent(url));
  fs.readFile(file, (e, b) => {
    if (e) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
    res.end(b);
  });
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 700 });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
await page.goto(`http://localhost:${port}/`, { waitUntil: "networkidle0" });
await page.waitForFunction(() => window.rig?.view);

const rig = () => page.evaluate(() => window.rig);
const settle = () => new Promise((r) => setTimeout(r, 120));
const toClient = (x, y) => page.evaluate((x, y) => {
  const svg = document.querySelector("svg");
  const p = svg.createSVGPoint(); p.x = x; p.y = y;
  const q = p.matrixTransform(svg.getScreenCTM());
  return { x: q.x, y: q.y };
}, x, y);

/** Drag in canvas coordinates. `keys` are held for the whole gesture. */
async function drag(from, to, keys = []) {
  const a = await toClient(from[0], from[1]);
  const b = await toClient(to[0], to[1]);
  for (const k of keys) await page.keyboard.down(k);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 3 });
  await page.mouse.move(b.x, b.y, { steps: 3 });
  await page.mouse.up();
  for (const k of keys) await page.keyboard.up(k);
  await settle();
}

const results = [];
const check = (name, ok, detail) => results.push([ok, name, detail]);
const L = (s, id) => s.layers.find((l) => l.id === id);

const scene = await rig();
console.log(`zoom=${scene.view.zoom.toFixed(3)}  layers=${scene.layers.length}`);

// A point genuinely clear of every unlocked layer, computed rather than eyeballed.
const free = (() => {
  for (let y = 1340; y > 0; y -= 5) for (let x = 1070; x > 0; x -= 5) {
    if (!scene.layers.some((l) => !l.locked && x >= l.x && x <= l.x + l.w && y >= l.y && y <= l.y + l.h)) return [x, y];
  }
  return null;
})();
console.log(`free point: ${free ? free.join(",") : "NONE — the artboard is fully covered"}`);

const unlocked = scene.layers.filter((l) => !l.locked).length;

// ── 1. Marquee from clear canvas ─────────────────────────────────────────
if (free) {
  await drag(free, [40, 40]);
  const a = await rig();
  check("marquee from clear canvas selects what it covers", a.sel.length === unlocked,
        `${a.sel.length} of ${unlocked}`);
  await page.mouse.click(10, 10);
}

// ── 2. Ctrl + drag marquees even on top of artwork ───────────────────────
// (40,40) sits on art7, so an unmodified drag here moves that layer instead.
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" })));
await drag([40, 40], [1040, 1310], ["Control"]);
{
  const a = await rig();
  check("Ctrl + drag marquees over covered artwork", a.sel.length === unlocked,
        `${a.sel.length} of ${unlocked}`);
}

// ── 3. Group scale is proportional and carries type ──────────────────────
{
  const before = await rig();
  const b = before.sel.map((id) => L(before, id));
  const bx0 = Math.min(...b.map((l) => l.x)), by0 = Math.min(...b.map((l) => l.y));
  const bx1 = Math.max(...b.map((l) => l.x + l.w)), by1 = Math.max(...b.map((l) => l.y + l.h));
  const text = b.find((l) => l.type === "text");
  // Pull the SE corner inward by half.
  await drag([bx1, by1], [bx0 + (bx1 - bx0) / 2, by0 + (by1 - by0) / 2]);
  const after = await rig();
  const a = after.layers.filter((l) => before.sel.includes(l.id));
  const ax1 = Math.max(...a.map((l) => l.x + l.w)), ay1 = Math.max(...a.map((l) => l.y + l.h));
  const sx = (ax1 - bx0) / (bx1 - bx0), sy = (ay1 - by0) / (by1 - by0);
  check("group scale keeps the aspect ratio", Math.abs(sx - sy) < 0.02, `sx=${sx.toFixed(3)} sy=${sy.toFixed(3)}`);
  const t2 = L(after, text.id);
  const want = text.size * sx;
  check("group scale carries font size", Math.abs(t2.size - want) / want < 0.05,
        `${text.size.toFixed(1)} -> ${t2.size.toFixed(1)} (expected ~${want.toFixed(1)})`);
}

// ── 4. Rotation ───────────────────────────────────────────────────────────
await page.mouse.click(10, 10);
{
  const s0 = await rig();
  const t = s0.layers.find((l) => l.type === "text" && !l.locked && l.w > 100);
  const cx = t.x + t.w / 2, cy = t.y + t.h / 2;
  await page.mouse.click(...Object.values(await toClient(cx, cy)));
  await settle();
  const grip = async () => page.evaluate(() => {
    const c = document.querySelector('[data-editor-only="selection"] circle');
    const b = c.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  });

  /** Turn the layer by dragging its grip to a target angle about the centre. */
  const turn = async (deg, keys = []) => {
    const g = await grip();
    const c = await toClient(cx, cy);
    const r = Math.hypot(g.x - c.x, g.y - c.y);
    const to = { x: c.x + r * Math.cos((deg - 90) * Math.PI / 180), y: c.y + r * Math.sin((deg - 90) * Math.PI / 180) };
    for (const k of keys) await page.keyboard.down(k);
    await page.mouse.move(g.x, g.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 6 });
    await page.mouse.up();
    for (const k of keys) await page.keyboard.up(k);
    await settle();
  };

  await turn(90);
  const r = L(await rig(), t.id).rotation;
  check("rotation grip turns the layer", Math.abs(r - 90) <= 2, `${r}deg (expected ~90)`);

  // 52 degrees is deliberately not a multiple of 15; shift must round it to 45.
  await turn(52, ["Shift"]);
  const r2 = L(await rig(), t.id).rotation;
  check("shift steps rotation by 15 degrees", r2 % 15 === 0, `${r2}deg (asked for 52)`);
}

// ── 5. Keep-ratio on a corner ────────────────────────────────────────────
await page.mouse.click(10, 10);
{
  const s0 = await rig();
  const r0 = s0.layers.find((l) => l.type === "rect" && !l.locked);
  await page.mouse.click(...Object.values(await toClient(r0.x + r0.w / 2, r0.y + r0.h / 2)));
  await settle();
  const aspect = r0.w / r0.h;
  await drag([r0.x + r0.w, r0.y + r0.h], [r0.x + r0.w + 240, r0.y + r0.h + 12], ["Shift"]);
  const r1 = L(await rig(), r0.id);
  check("shift keeps a corner proportional", Math.abs(r1.w / r1.h - aspect) < 0.02,
        `${aspect.toFixed(3)} -> ${(r1.w / r1.h).toFixed(3)}`);
  await page.keyboard.up("Shift").catch(() => {});
}

// ── 6. Alt resizes about the centre ──────────────────────────────────────
await page.mouse.click(10, 10);
{
  const s0 = await rig();
  const r0 = s0.layers.find((l) => l.type === "rect" && !l.locked);
  await page.mouse.click(...Object.values(await toClient(r0.x + r0.w / 2, r0.y + r0.h / 2)));
  await settle();
  const cx = r0.x + r0.w / 2, cy = r0.y + r0.h / 2;
  await drag([r0.x + r0.w, r0.y + r0.h], [r0.x + r0.w + 60, r0.y + r0.h + 40], ["Alt"]);
  const r1 = L(await rig(), r0.id);
  const c1x = r1.x + r1.w / 2, c1y = r1.y + r1.h / 2;
  check("alt resizes about the centre", Math.hypot(c1x - cx, c1y - cy) < 2,
        `centre moved ${Math.hypot(c1x - cx, c1y - cy).toFixed(1)}px`);
}

// ── 7. Gap badges appear mid-drag ────────────────────────────────────────
await page.mouse.click(10, 10);
{
  const s0 = await rig();
  const t = s0.layers.find((l) => l.type === "text" && !l.locked);
  const a = await toClient(t.x + t.w / 2, t.y + t.h / 2);
  const b = await toClient(t.x + t.w / 2 + 30, t.y + t.h / 2 + 140);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await settle();
  const n = await page.evaluate(() => document.querySelectorAll('[data-editor-only="gap"]').length);
  await page.mouse.up();
  await settle();
  const gone = await page.evaluate(() => document.querySelectorAll('[data-editor-only="gap"]').length);
  check("gap badges show while dragging and clear on release", n >= 1 && gone === 0,
        `${n} during, ${gone} after`);
}

console.log("");
for (const [ok, name, detail] of results) console.log(`${ok ? "PASS" : "FAIL"} ${name}  —  ${detail}`);
if (errs.length) console.log("\nPAGE ERRORS:\n" + errs.slice(0, 4).join("\n"));
console.log(`\n${results.filter(([o]) => o).length}/${results.length} passing`);
await browser.close();
server.close();
