import puppeteer from "puppeteer";
const br = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const pg = await br.newPage();
await pg.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await pg.goto("http://localhost:5173/startup-school", { waitUntil: "networkidle0", timeout: 90000 });
await pg.evaluate(() => document.fonts.ready);
await new Promise(r => setTimeout(r, 2500));
console.log(await pg.evaluate(() => {
  const wrap = document.querySelector(".sec-1-home-7__img-wrap");
  const img = document.querySelector(".sec-1-home-7__img");
  const sec = document.querySelector(".sec-1-home-7");
  const box = (el) => el ? `${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)} @${Math.round(el.getBoundingClientRect().x)},${Math.round(el.getBoundingClientRect().y)}` : "missing";
  return [
    `viewport      390 wide`,
    `section       ${box(sec)}`,
    `img-wrap      ${box(wrap)}   max-width: ${wrap && getComputedStyle(wrap).maxWidth}  position: ${wrap && getComputedStyle(wrap).position}`,
    `img           ${box(img)}`,
    `body scrollW  ${document.body.scrollWidth} (overflow: ${document.body.scrollWidth > 390})`,
  ].join("\n");
}));
await pg.screenshot({ path: ".rig/hero-after.png" });
await br.close();
