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
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: "networkidle0" });
await page.waitForFunction(() => window.rig?.layers?.length);
await page.evaluate(() => document.fonts.ready);

const rig = () => page.evaluate(() => window.rig);
const settle = (ms = 140) => new Promise((r) => setTimeout(r, ms));
/** Two clicks in quick succession. Puppeteer's clickCount:2 sends one
 *  down/up pair with detail=2, which Chrome does not always promote to a
 *  dblclick; two real clicks always do. */
async function doubleClick(x, y) {
  await page.mouse.click(x, y);
  await page.mouse.click(x, y, { delay: 10 });
  await settle(260);
}

const toClient = (x, y) => page.evaluate((x, y) => {
  const svg = document.querySelector("svg");
  const p = svg.createSVGPoint(); p.x = x; p.y = y;
  const q = p.matrixTransform(svg.getScreenCTM());
  return { x: q.x, y: q.y };
}, x, y);

const results = [];
const check = (name, ok, detail) => results.push([ok, name, detail]);

const scene = await rig();
const text = scene.layers.find((l) => l.type === "text" && !l.locked && l.w > 200);
const centre = await toClient(text.x + text.w / 2, text.y + text.h / 2);
console.log(`text layer ${text.id} slot=${text.slot} ${Math.round(text.w)}x${Math.round(text.h)} size=${text.size}`);

// ── 1. Selecting shows the properties bar, above the layer ───────────────
await page.mouse.click(centre.x, centre.y);
await settle();
{
  const bar = await page.evaluate(() => {
    const el = document.querySelector(".dsn-fb");
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
  const box = await toClient(text.x, text.y);
  check("selecting a layer shows the properties bar", Boolean(bar), bar ? `${Math.round(bar.w)}px wide` : "no bar");
  check("the bar sits above the layer, not in the sidebar",
        Boolean(bar) && bar.y + bar.h <= box.y + 2,
        bar ? `bar bottom ${Math.round(bar.y + bar.h)} vs layer top ${Math.round(box.y)}` : "-");
}

// ── 2. The rail carries the text controls, and does not cover the layer ──
// These used to live on the floating bar, which meant the controls sat on top
// of the words being styled. They are in the docked rail now, so this asserts
// two things: that every control survived the move, and that the rail is beside
// the artwork rather than over it — the reason the move happened at all.
{
  const labels = await page.evaluate(() =>
    [...document.querySelectorAll(".dsni [title], .dsni [aria-label]")]
      .map((b) => b.getAttribute("title") ?? b.getAttribute("aria-label")));
  const want = ["Bold", "Italic", "Underline", "Strikethrough", "Text colour", "Typeface"];
  const missing = want.filter((w) => !labels.some((t) => t?.startsWith(w)));
  check("rich text controls are in the properties rail", missing.length === 0,
        missing.length ? `missing ${missing.join(", ")}` : labels.length + " controls");

  const rail = await page.evaluate(() => {
    const el = document.querySelector(".dsni");
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
  const tl = await toClient(text.x, text.y);
  const br = await toClient(text.x + text.w, text.y + text.h);
  // Horizontal separation is the whole claim: the rail is docked to one side,
  // so it clears the layer when it starts after the layer ends or ends before
  // it starts. A pixel of slack absorbs sub-pixel transform rounding.
  const clear = Boolean(rail) && (rail.x >= br.x - 1 || rail.x + rail.w <= tl.x + 1);
  check("the properties rail does not cover the selected layer", clear,
        rail ? `rail x ${Math.round(rail.x)}–${Math.round(rail.x + rail.w)} vs layer ${Math.round(tl.x)}–${Math.round(br.x)}` : "no rail");
}

// ── 3. Double-click opens the editor in place, with the copy in it ───────
await doubleClick(centre.x, centre.y);
{
  const state = await rig();
  const box = await page.evaluate(() => {
    const el = document.querySelector(".dsn-textedit [contenteditable]");
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { text: el.textContent, x: b.x, y: b.y, w: b.width };
  });
  check("double-click opens the editor on the canvas", state.editing === text.id && Boolean(box),
        `editing=${state.editing}`);
  const want = state.content[text.slot];
  check("the editor opens holding the layer's own copy",
        Boolean(box) && box.text.trim() === String(want).trim(),
        box ? JSON.stringify(box.text).slice(0, 46) : "-");

  // It must sit where the words already were, or editing moves the target.
  const at = await toClient(text.x, text.y);
  check("the editor is positioned over the layer",
        Boolean(box) && Math.abs(box.x - at.x) < 12 && Math.abs(box.y - at.y) < 12,
        box ? `off by ${Math.round(box.x - at.x)},${Math.round(box.y - at.y)}` : "-");
}

// ── 4. Typing replaces the copy (it opens with everything selected) ──────
await page.keyboard.type("Hello canvas");
await settle();
{
  const state = await rig();
  check("typing writes into the document", state.content[text.slot] === "Hello canvas",
        JSON.stringify(state.content[text.slot]));
}

// ── 5. Marks survive the trip through HTML and back into runs ────────────
await page.keyboard.down("Shift");
for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowLeft");
await page.keyboard.up("Shift");
await page.evaluate(() => document.execCommand("bold"));
await settle();
{
  const state = await rig();
  const runs = state.raw[text.slot];
  const bold = Array.isArray(runs) ? runs.filter((r) => r.bold) : [];
  check("bold on a selection becomes a styled run",
        bold.length === 1 && bold[0].text === "canvas",
        Array.isArray(runs) ? JSON.stringify(runs) : `not runs: ${JSON.stringify(runs)}`);
}

// ── 6. Escape closes the editor and the SVG paints the result ────────────
await page.keyboard.press("Escape");
await settle(200);
{
  const state = await rig();
  const open = await page.evaluate(() => Boolean(document.querySelector(".dsn-textedit")));
  const svgText = await page.evaluate(() =>
    [...document.querySelectorAll("svg text")].map((t) => t.textContent).join("|"));
  check("escape closes the editor", state.editing === null && !open, `editing=${state.editing}`);
  check("the canvas repaints the edited copy", svgText.includes("Hello canvas"),
        svgText.slice(0, 70));
  const bolded = await page.evaluate(() =>
    [...document.querySelectorAll("svg tspan[font-weight]")].map((t) => t.textContent).join("|"));
  check("the bold run is painted as its own span", bolded.includes("canvas"), bolded.slice(0, 50) || "(none)");
}

// ── 7. A photo slot opens the library rather than a caret ────────────────
{
  const img = scene.layers.find((l) => l.type === "image");
  if (img) {
    const c = await toClient(img.x + img.w / 2, img.y + img.h / 2);
    const before = (await rig()).picked;
    await doubleClick(c.x, c.y);
    check("double-clicking a photo slot opens the image library",
          (await rig()).picked === before + 1, `picked ${before} -> ${(await rig()).picked}`);
  }
}

// ── 8. Dragging a row in the layers panel reorders the document ──────────
// Reordering is driven by pointer events rather than HTML5 drag-and-drop, so
// this is an ordinary drag: press on a row, move, release.
{
  // The panel lives inside the properties rail, which scrolls. A row below the
  // fold still reports a bounding rect, so measuring it looks fine while the
  // synthetic mouse lands on whatever is actually at that point on screen —
  // bring the list into view first and measure after it has settled.
  await page.evaluate(() => document.querySelector(".dsn-layers")?.scrollIntoView({ block: "center" }));
  await settle(160);

  const rows = () => page.evaluate(() =>
    [...document.querySelectorAll(".dsn-layers li")].map((li) => li.dataset.id));
  const before = await rows();
  const box = (n) => page.evaluate((n) => {
    const li = document.querySelectorAll(".dsn-layers li")[n];
    const b = li.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, top: b.top };
  }, n);

  const from = await box(2);
  const to = await box(0);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x, (from.y + to.y) / 2, { steps: 4 });
  await page.mouse.move(to.x, to.top + 2, { steps: 4 });
  await settle();
  const indicator = await page.evaluate(() =>
    Boolean(document.querySelector(".dsn-layers li.drop-above, .dsn-layers li.drop-below")));
  await page.mouse.up();
  await settle(200);

  const after = await rows();
  const moved = before[2];
  check("an insertion line shows where the row would land", indicator, indicator ? "shown" : "none");
  check("dragging a row to the top of the list reorders it",
        after[0] === moved && after.length === before.length,
        `${moved}: position 2 -> ${after.indexOf(moved)}`);

  // The list is only a view; the document's paint order is what exports.
  const paint = (await rig()).layers.map((l) => l.id);
  const trail = (await rig()).trail.filter((t) => t.startsWith("reorder"));
  check("the reorder reaches the document's paint order",
        trail.length === 1 && paint[paint.length - 1] === moved,
        `${trail.join(" | ") || "nothing recorded"}; front is now ${paint[paint.length - 1]}`);
}

// ── 9. A plain click still selects, rather than nudging the order ──────
{
  const before = await page.evaluate(() =>
    [...document.querySelectorAll(".dsn-layers li")].map((li) => li.dataset.id));
  const b = await page.evaluate(() => {
    const li = document.querySelectorAll(".dsn-layers li")[3];
    const r = li.querySelector(".dsn-layer").getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, id: li.dataset.id };
  });
  await page.mouse.click(b.x, b.y);
  await settle();
  const after = await page.evaluate(() =>
    [...document.querySelectorAll(".dsn-layers li")].map((li) => li.dataset.id));
  const state = await rig();
  check("a click on a row selects it and does not reorder",
        state.sel[0] === b.id && after.join() === before.join(),
        `clicked ${b.id}, selected ${state.sel[0]}, order ${after.join() === before.join() ? "unchanged" : "CHANGED"}`);
}

console.log("");
for (const [ok, name, detail] of results) console.log(`${ok ? "PASS" : "FAIL"} ${name}  —  ${detail}`);
if (errs.length) console.log("\nPAGE ERRORS:\n" + errs.slice(0, 5).join("\n"));
console.log(`\n${results.filter(([o]) => o).length}/${results.length} passing`);
await browser.close();
server.close();
if (results.some(([o]) => !o)) process.exitCode = 1;

