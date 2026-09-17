import { boot, go } from "./_vmem_lib.mjs";
import { clickExact, dialogText } from "./_vmem_lib2.mjs";
const { browser, page, errors } = await boot({});
await go(page, "/create/memories/reels/reel-seven-years", 1800);
await clickExact(page, "Share"); await new Promise(r=>setTimeout(r,800));
// find the select that has option "1 day"
const handles = await page.$$("select");
let target=null;
for (const h of handles){ const has = await page.evaluate(s=>Array.from(s.options).some(o=>o.textContent==="1 day") && s.offsetParent!==null, h); if(has){target=h;break;} }
console.log("found expiry select:", !!target);
await target.select("1");
await new Promise(r=>setTimeout(r,500));
console.log("select value now:", await page.evaluate(s=>s.value, target));
await clickExact(page, "Make a link"); await new Promise(r=>setTimeout(r,1500));
const links = await page.evaluate(()=>{ const v=JSON.parse(localStorage.getItem("wafe:demo:memories:v1")); const l=v.links[v.links.length-1]; return {token:l.token,created:l.createdAt,exp:l.expiresAt}; });
console.log("NEW LINK:", JSON.stringify(links));
const dd = await dialogText(page);
const i = dd.indexOf("…/");
console.log("UI says:", dd.slice(i, i+120));
await browser.close();
