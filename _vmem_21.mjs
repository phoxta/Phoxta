import { boot, go, shot } from "./_vmem_lib.mjs";
const { browser, page, errors } = await boot({});
await go(page, "/create/memories/timeline", 4000);
console.log("URL", page.url());
console.log("has main:", await page.evaluate(()=>!!document.querySelector("main")));
console.log("body:", (await page.evaluate(()=>document.body.innerText)).slice(0,1200));
console.log("errors:", errors.slice(0,10).join(" ~ ")||"none");
await shot(page,"11-timeline");
await browser.close();
