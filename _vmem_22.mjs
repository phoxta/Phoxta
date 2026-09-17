import { boot, go } from "./_vmem_lib.mjs";
const { browser, page, errors } = await boot({});
await go(page, "/create/memories/timeline", 4000);
await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
await new Promise(r=>setTimeout(r,1500));
const links = await page.evaluate(()=>Array.from(document.querySelectorAll("main a")).map(a=>a.getAttribute("href")));
const uniq=[...new Set(links)];
console.log("UNIQUE HREFS (", uniq.length, "):"); console.log(uniq.join("\n"));
await browser.close();
