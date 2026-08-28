/**
 * Does the schedule dialog fit the window?
 *
 * It did not. .dsn-modal centres its box and nothing capped its height, so
 * once the Instagram panel opened the dialog grew past the top AND bottom of
 * the viewport at the same time — which is the worst way for a dialog to
 * overflow, because the buttons at its foot become unreachable and there is
 * nothing on screen to suggest they exist. On a laptop it was simply unusable.
 *
 * So the checks below are about reachability, not about looks: the box inside
 * the window, the Schedule button on screen, and the content that no longer
 * fits reachable by scrolling rather than gone.
 *
 * A SHORT VIEWPORT IS THE POINT. At 1280x900 the old dialog fitted and the
 * bug was invisible; 620 is a laptop with a browser chrome and a dock, which
 * is what people actually have.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const ROOT = process.argv[2];
const SP = process.argv[3];
const SHOTS = process.argv[4] ?? SP;
const MIME = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
               ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2" };
const FONTS = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap";

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  if (url === "/") {
    res.writeHead(200, { "content-type": "text/html" });
    return res.end(`<!doctype html><meta charset=utf-8>
<link href="${FONTS}" rel=stylesheet><link href="/designs.css" rel=stylesheet>
<style>
  /* The dashboard's own tokens, which live outside designs.css. Only the
     colours come from here; every measurement under test is in designs.css. */
  :root{--hrx-card:#fff;--hrx-bg:#F7F7F8;--hrx-ink:#1D1D1D;--hrx-muted:#585959;--hrx-border:#DFDFDF}
  *{margin:0;box-sizing:border-box}
  body{font-family:"DM Sans",system-ui,sans-serif}
</style>
<div id=r></div><script src="/rig.js"></script>`);
  }
  const file = url === "/rig.js" ? path.join(SP, "dialog-rig.js")
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
const settle = (ms = 150) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log("  PASS " + name); return; }
  fail++;
  console.log("  FAIL " + name + (detail ? "  —  " + detail : ""));
};

/** Click a button by the text on it. */
const clickText = (sel, text) => page.evaluate((sel, text) => {
  const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.includes(text));
  if (el) el.click();
  return Boolean(el);
}, sel, text);

const geometry = () => page.evaluate(() => {
  const box = document.querySelector(".dsn-modal__box");
  const body = document.querySelector(".dsn-brief-dlg__body");
  const acts = document.querySelector(".dsn-brief-dlg__acts");
  const r = box.getBoundingClientRect();
  const a = acts.getBoundingClientRect();
  return {
    box: { top: r.top, bottom: r.bottom, left: r.left, right: r.right },
    acts: { top: a.top, bottom: a.bottom },
    scrolls: body ? body.scrollHeight > body.clientHeight + 1 : false,
    win: { w: innerWidth, h: innerHeight },
    pageScrollsSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
});

for (const [w, h] of [[1280, 620], [1440, 900], [420, 780]]) {
  console.log(`\n  ── ${w}x${h} ──`);
  await page.setViewport({ width: w, height: h });
  await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForSelector(".dsn-modal__box");
  await settle(200);

  // Every connected account starts ticked, so the post goes everywhere unless
  // somebody says otherwise — and the Instagram panel is therefore already up.
  const ticks = await page.$$eval(".sow__c input", (n) => n.map((x) => x.checked));
  check("every connected account is ticked to start with",
        ticks.length === 2 && ticks.every(Boolean), JSON.stringify(ticks));
  check("the Instagram panel is up because Instagram is ticked",
        (await page.$(".igo")) !== null);

  // Unticking it must take the panel with it: options for a channel that is
  // not receiving the post would be stored and never used.
  await page.click(".sow__c input");
  await settle(200);
  check("unticking Instagram closes its panel", (await page.$(".igo")) === null);
  await page.click(".sow__c input");
  await settle(250);
  check("ticking it again brings the panel back", (await page.$(".igo")) !== null);

  for (const name of ["one", "two", "three"]) {
    await page.type(".igo__add input", name);
    await clickText(".igo__add button", "Add");
    await settle(60);
  }
  // Scroll it into view FIRST. A click at a coordinate under the fold lands on
  // nothing, and the first version of this test placed no pins at all while
  // still reporting that the panel was at its tallest.
  await page.evaluate(() => document.querySelector(".igo__pic")
    ?.scrollIntoView({ block: "center" }));
  await settle(150);
  const pic = await page.$(".igo__pic");
  if (pic) {
    const b = await pic.boundingBox();
    for (const [dx, dy] of [[0.3, 0.3], [0.6, 0.5], [0.5, 0.8]]) {
      await page.mouse.click(b.x + b.width * dx, b.y + b.height * dy);
      await settle(60);
    }
  }
  await settle(200);

  const pins = await page.$$eval(".igo__pin", (n) => n.length).catch(() => 0);
  check("three people got tagged on the picture", pins === 3, `${pins} pins`);

  const g = await geometry();
  await page.screenshot({ path: path.join(SHOTS, `dialog-${w}x${h}.png`) });

  check("the dialog fits inside the window",
        g.box.top >= -1 && g.box.bottom <= g.win.h + 1,
        `box ${Math.round(g.box.top)}..${Math.round(g.box.bottom)} in a ${g.win.h}px window`);
  check("the Schedule button is on screen",
        g.acts.bottom <= g.win.h + 1 && g.acts.top >= 0,
        `buttons at ${Math.round(g.acts.top)}..${Math.round(g.acts.bottom)}`);
  check("nothing hangs off the side",
        g.box.left >= -1 && g.box.right <= g.win.w + 1 && !g.pageScrollsSideways,
        `box ${Math.round(g.box.left)}..${Math.round(g.box.right)} in a ${g.win.w}px window`);
  // On a tall window everything fits and there is nothing to scroll; on a
  // short one the overflow has to be reachable rather than clipped.
  const tallEnough = g.box.bottom - g.box.top < h - 60;
  check(tallEnough ? "it all fits, so there is nothing to scroll" : "the overflow scrolls rather than being cut off",
        tallEnough || g.scrolls,
        "the body does not scroll and the content does not fit");
}

console.log(`\ndialog: ${pass} passed, ${fail} failed`);
console.log(`screenshots in ${SHOTS}`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
