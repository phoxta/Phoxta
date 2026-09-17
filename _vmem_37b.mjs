import { boot, go } from "./_vmem_lib.mjs";
const { browser, page } = await boot({});
await go(page, "/create/memories", 2000);
console.log(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem("wafe:demo:memories:v1")))));
console.log(JSON.stringify(await page.evaluate(()=>JSON.parse(localStorage.getItem("wafe:demo:memories:v1")).shares)));
await browser.close();
