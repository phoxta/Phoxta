import { boot, go } from "./_vmem_lib.mjs";
const { browser, page, errors } = await boot({});
await go(page, "/create/memories/timeline", 4500);
await page.waitForSelector("main a", {timeout: 15000});
const links = await page.evaluate(()=>Array.from(document.querySelectorAll("main li a")).map(a=>a.getAttribute("href")+"  <- "+a.innerText.trim().slice(0,45)));
const uniq=[...new Set(links)];
console.log("ROWS:", uniq.length); console.log(uniq.slice(0,40).join("\n"));
await browser.close();
