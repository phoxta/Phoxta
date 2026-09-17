import { boot, go, shot } from "./_vmem_lib.mjs";
const { browser, page, errors } = await boot({});
await go(page, "/live/travel", 3000);
const trips = await page.evaluate(()=>{ const k=Object.keys(localStorage).find(k=>k.includes("travel")); const v=JSON.parse(localStorage.getItem(k)); return {k, trips: v.trips.map(t=>({id:t.id,title:t.title,status:t.status,end:t.endDate||t.end}))}; });
console.log(JSON.stringify(trips,null,1));
await browser.close();
