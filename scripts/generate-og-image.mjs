// Generate the default social share card (1200×630) for Phoxta.
//
//   node scripts/generate-og-image.mjs
//
// Renders a branded HTML card in headless Chromium and screenshots it to
// public/assets/imgs/template/og-image.jpg. Re-run to regenerate after brand
// or copy changes.

import puppeteer from "puppeteer";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/assets/imgs/template/og-image.jpg");

const HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400..800&display=swap" rel="stylesheet" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1200px; height: 630px; }
      body {
        font-family: "DM Sans", sans-serif;
        background: #0a0a0c;
        color: #fff;
        position: relative;
        overflow: hidden;
      }
      .glow {
        position: absolute;
        width: 760px; height: 760px;
        right: -200px; top: -260px;
        background: radial-gradient(closest-side, rgba(99,102,241,.45), rgba(99,102,241,0));
        filter: blur(8px);
      }
      .glow2 {
        position: absolute;
        width: 620px; height: 620px;
        left: -220px; bottom: -300px;
        background: radial-gradient(closest-side, rgba(16,185,129,.28), rgba(16,185,129,0));
      }
      .frame {
        position: relative;
        height: 100%;
        padding: 80px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .brand { display: flex; align-items: center; gap: 18px; }
      .mark {
        width: 60px; height: 60px; border-radius: 16px;
        background: #fff; color: #0a0a0c;
        display: grid; place-items: center;
        font-weight: 800; font-size: 34px; letter-spacing: -1px;
      }
      .wordmark { font-weight: 800; font-size: 40px; letter-spacing: -1.5px; }
      h1 {
        font-weight: 800;
        font-size: 78px;
        line-height: 1.04;
        letter-spacing: -2.5px;
        max-width: 980px;
      }
      h1 .accent { color: #a5b4fc; }
      .foot { display: flex; align-items: center; justify-content: space-between; }
      .tagline { font-size: 27px; color: rgba(255,255,255,.7); font-weight: 500; max-width: 760px; }
      .url { font-size: 24px; color: rgba(255,255,255,.55); font-weight: 600; letter-spacing: .5px; }
    </style>
  </head>
  <body>
    <div class="glow"></div>
    <div class="glow2"></div>
    <div class="frame">
      <div class="brand">
        <div class="mark">P</div>
        <div class="wordmark">Phoxta</div>
      </div>
      <h1>Own a validated, <span class="accent">AI&#8209;powered</span> business.</h1>
      <div class="foot">
        <div class="tagline">Pick a business, make it yours, and go from launch to revenue in days.</div>
        <div class="url">phoxta.com</div>
      </div>
    </div>
  </body>
</html>`;

async function run() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    await page.setContent(HTML, { waitUntil: "networkidle0" });
    await page.evaluate(async () => {
        await document.fonts.ready;
    });
    mkdirSync(dirname(OUT), { recursive: true });
    await page.screenshot({ path: OUT, type: "jpeg", quality: 92 });
    await browser.close();
    console.log(`✓ Wrote ${OUT.replace(resolve(__dirname, ".."), ".")} (1200×630)`);
}

run().catch((err) => {
    console.error("OG image generation failed:", err);
    process.exit(1);
});
