import { launch, boot, text, sleep, hscroll } from "./h.mjs";

const who = process.argv[2] || "mem-tobi";
const path = process.argv[3] || "/grow/curricula";
const { browser, page, errors } = await launch({ width: 390, height: 844 });
await boot(page, who, path);
console.log("URL:", page.url());
const t = await text(page);
console.log(t.slice(0, 6000));
console.log("=== hscroll@390 ===", await hscroll(page));
console.log("=== text inputs ===", await page.evaluate(() => [...document.querySelectorAll("input,textarea")].map((e) => e.tagName + ":" + (e.getAttribute("type") || "text") + ":" + (e.getAttribute("aria-label") || e.getAttribute("placeholder") || ""))));
console.log("=== nav module links ===", await page.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")).filter((h) => h && h.startsWith("/grow"))));
console.log("ERRORS:", errors);
await browser.close();
