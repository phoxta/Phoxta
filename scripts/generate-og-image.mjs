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
import { mkdirSync, readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/assets/imgs/template/og-image.jpg");

const FONT = readFileSync(resolve(__dirname, "../public/assets/fonts/dm-sans/DMSans.ttf")).toString("base64");
const LOGO = readFileSync(resolve(__dirname, "../public/assets/imgs/template/logo/favicon.svg")).toString("base64");
const HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />

    <style>
      @font-face {font-family:"DM Sans";src:url(data:font/ttf;base64,${FONT}) format("truetype");font-weight:100 1000;}
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1200px; height: 630px; }
      body {
        font-family: "DM Sans", sans-serif;
        background: #f7f7f4;
        color: #1d1d1d;
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
        font-weight: 550;
        font-size: 78px;
        line-height: 1.04;
        letter-spacing: -2.5px;
        max-width: 980px;
      }
      h1 .accent { color: #1d1d1d; }
      h1::after {content:"";display:block;width:74px;height:5px;background:#f0460e;margin-top:22px;}
      .foot { display: flex; align-items: center; justify-content: space-between; }
      .tagline { font-size: 27px; color: #595c58; font-weight: 500; max-width: 760px; }
      .url { font-size: 24px; color: #6a6c68; font-weight: 600; letter-spacing: .5px; }
    </style>
  </head>
  <body>

    <div class="frame">
      <div class="brand">
        <img src="data:image/svg+xml;base64,${LOGO}" width="52" height="52" alt="" />
        <div class="wordmark">Phoxta</div>
      </div>
      <h1>Discover Business<br /><span class="accent">Opportunities</span></h1>
      <div class="foot">
        <div class="tagline">Discover what’s worth building.</div>
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
